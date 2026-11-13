// dovemayo.com worker. Everything is static (dist/) except the suggestion board API:
//   GET  /api/board/list            approved posts (+ pending ones with a valid x-admin-key)
//   POST /api/board/submit          {text, image?: dataURL}  -> pending post
//   POST /api/board/approve|delete  {id}                      admin only
//   GET  /api/board/img/<id>        image of a post (pending images: admin only)
// Storage: one Durable Object (class Board, SQLite-backed). "index" = array of posts (newest first),
// "img:<id>" = image bytes. A Durable Object needs no extra Cloudflare permission beyond deploying the script.
import { DurableObject } from 'cloudflare:workers';
const MAX_TEXT = 500, MAX_IMAGE = 600 * 1024, MAX_POSTS = 400, PER_HOUR = 6;
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const fail = (message, status = 400) => json({ error: message }, status);

function isAdmin(request, env) {
  const key = request.headers.get('x-admin-key') || '';
  const want = env.BOARD_ADMIN_KEY || '';
  if (!want || key.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= key.charCodeAt(i) ^ want.charCodeAt(i);
  return diff === 0;
}
const readIndex = async (env) => (await env.BOARD.get('index')) || [];
const writeIndex = (env, list) => env.BOARD.put('index', list);
const view = (p) => ({ id: p.id, text: p.text, at: p.at, status: p.status, img: !!p.img });

async function submit(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const rateKey = 'rate:' + ip, hour = Math.floor(Date.now() / 3600000);
  const rate = await env.BOARD.get(rateKey);
  const used = rate && rate.hour === hour ? rate.n : 0;
  if (used >= PER_HOUR) return fail('잠시 뒤에 다시 보내 주세요. (한 시간에 ' + PER_HOUR + '개까지)', 429);

  let body;
  try { body = await request.json(); } catch (e) { return fail('잘못된 요청입니다.'); }
  const text = String(body.text || '').trim().slice(0, MAX_TEXT);
  let bytes = null, type = '';
  if (body.image) {
    const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(body.image));
    if (!m) return fail('이미지는 PNG, JPG, WebP만 됩니다.');
    type = m[1];
    bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    if (bytes.length > MAX_IMAGE) return fail('이미지가 너무 큽니다.');
  }
  if (!text && !bytes) return fail('내용을 적어 주세요.');

  const list = await readIndex(env);
  if (list.length >= MAX_POSTS) return fail('지금은 제안이 가득 찼습니다. 나중에 다시 보내 주세요.', 503);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  if (bytes) await env.BOARD.put('img:' + id, bytes);
  list.unshift({ id, text, at: new Date().toISOString(), status: 'pending', img: bytes ? type : '' });
  await writeIndex(env, list);
  await env.BOARD.put(rateKey, { hour, n: used + 1 });
  return json({ ok: true, id });
}

async function board(request, env, path) {
  const admin = isAdmin(request, env);
  if (path === 'list' && request.method === 'GET') {
    const list = await readIndex(env);
    return json({
      admin,
      approved: list.filter((p) => p.status === 'approved').map(view),
      pending: admin ? list.filter((p) => p.status === 'pending').map(view) : [],
      waiting: list.filter((p) => p.status === 'pending').length
    });
  }
  if (path.startsWith('img/') && request.method === 'GET') {
    const id = path.slice(4);
    const post = (await readIndex(env)).find((p) => p.id === id);
    if (!post || !post.img) return fail('없음', 404);
    // pending images are for the owner only; the page loads them with the key as a query
    if (post.status !== 'approved') {
      const key = new URL(request.url).searchParams.get('k') || '';
      if (!env.BOARD_ADMIN_KEY || key !== env.BOARD_ADMIN_KEY) return fail('없음', 404);
    }
    const data = await env.BOARD.get('img:' + id);
    if (!data) return fail('없음', 404);
    return new Response(data, { headers: { 'content-type': post.img, 'cache-control': post.status === 'approved' ? 'public, max-age=86400' : 'no-store', 'x-content-type-options': 'nosniff' } });
  }
  if (request.method !== 'POST') return fail('지원하지 않는 요청입니다.', 405);
  if (path === 'submit') return submit(request, env);
  if (path === 'approve' || path === 'delete') {
    if (!admin) return fail('권한이 없습니다.', 403);
    let body;
    try { body = await request.json(); } catch (e) { return fail('잘못된 요청입니다.'); }
    const list = await readIndex(env), i = list.findIndex((p) => p.id === body.id);
    if (i < 0) return fail('없는 글입니다.', 404);
    if (path === 'approve') list[i].status = 'approved';
    else { if (list[i].img) await env.BOARD.delete('img:' + list[i].id); list.splice(i, 1); }
    await writeIndex(env, list);
    return json({ ok: true });
  }
  return fail('없는 요청입니다.', 404);
}

// The board lives in one object so reads and writes of the index never race.
export class Board extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);
    const env = { BOARD: this.ctx.storage, BOARD_ADMIN_KEY: this.env.BOARD_ADMIN_KEY };
    try { return await board(request, env, url.pathname.slice('/api/board/'.length)); }
    catch (e) { return fail('서버 오류', 500); }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/board/')) return env.BOARD.get(env.BOARD.idFromName('main')).fetch(request);
    return env.ASSETS.fetch(request);
  }
};
