// dovemayo.com worker. Everything is static (dist/) except the suggestion board API:
//   GET  /api/board/list            new (pending) and approved posts, all public
//   GET|POST /api/board/show/list|submit|edit|delete   showcase posts {code, text}; edit/delete by the writer (same IP) or admin
//   POST /api/board/show/like       {id}  toggles this visitor's 추천 (one per salted IP hash); list sends likes + liked
//   POST /api/board/show/comment    {id, text}  댓글 (anyone); list sends comments [{id, text, at, mine, writer}]
//   POST /api/board/show/uncomment  {id, cid}   delete a 댓글: its writer (same IP hash) or admin
//   (show/edit: admin may also send {code} to fix a post's combination code, e.g. after a part was redrawn under a new id)
//   POST /api/board/show/nick       {roll?: true, color?}  this visitor's nickname (per salted IP hash, unique). Names come only
//                                   from the dice (random Spore-style); the first call assigns one. The admin is always "둘기마요".
//   list sends me: {name, color, owner}, and nick: {...} on each post and comment (null when the writer never had one)
//   POST /api/board/submit          {text, image?: dataURL}  -> pending post
//   POST /api/board/approve         {id}                      admin only
//   POST /api/board/delete          {id}                      admin, or the writer (same IP)
//   POST /api/board/edit            {id, text}                the writer (same IP), while the post is still pending
//   POST /api/board/reply           {id, text}                admin only; the owner's answer under a post (empty text removes it)
//   GET  /api/board/img/<id>        image of a post
// Storage: one Durable Object (class Board, SQLite-backed). "index" = array of posts (newest first),
// "img:<id>" = image bytes. Each post keeps `by`, a salted hash of the writer's IP (never the IP itself),
// so the writer can edit or delete it from the same IP; lists send only `mine: true/false`. A Durable Object needs no extra Cloudflare permission beyond deploying the script.
// Rate limits are keyed by the same salted hash ("rateh:..."); raw IPs are never stored. Old "rate:<ip>" keys are removed once (cleanupRawIpKeys).
import { DurableObject } from 'cloudflare:workers';
import { ADJ, NOUN } from './spore-names.mjs';
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
const viewOf = (p, me) => ({ id: p.id, text: p.text, at: p.at, status: p.status, img: !!p.img, reply: p.reply || '', mine: !!me && p.by === me });
// who is asking: salted hash of the connecting IP (the admin key is the salt, so the hash cannot be matched to an IP from outside)
async function writer(request, env) {
  const ip = request.headers.get('cf-connecting-ip');
  if (!ip) return '';
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode((env.BOARD_ADMIN_KEY || '') + '|' + ip));
  return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function submit(request, env) {
  const rateKey = 'rateh:' + ((await writer(request, env)) || 'unknown'), hour = Math.floor(Date.now() / 3600000);
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
  list.unshift({ id, text, at: new Date().toISOString(), status: 'pending', img: bytes ? type : '', by: await writer(request, env) });
  await writeIndex(env, list);
  await env.BOARD.put(rateKey, { hour, n: used + 1 });
  return json({ ok: true, id });
}

// Showcase ("자랑 게시판"): a post is a combination code and a short text; the page draws the face from the code.
const MAX_SHOW = 2000, MAX_SHOW_TEXT = 300, MAX_COMMENT = 200, MAX_COMMENTS = 300, COMMENTS_PER_HOUR = 30;
const commentView = (c, p, me) => ({ id: c.id, text: c.text, at: c.at, mine: !!me && c.by === me, writer: !!c.by && c.by === p.by });
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
// ---------- 닉네임: IP 해시마다 하나, 다른 사람과 겹치지 않는다. 관리자는 늘 "둘기마요" ----------
const OWNER_NICK = '둘기마요', OWNER_COLOR = '#5d4e48';
// 부드러운 색 24개 (흰 바탕에서 읽히는 밝기)
const NICK_COLORS = ['#d47a8a', '#d986a8', '#c97fb5', '#b98ccc', '#a487cf', '#8f8ad6', '#7b93d6', '#6f8fb0', '#6aa3d0', '#5aa3a8', '#5fae99', '#7fa37a', '#84996a', '#9aa55a', '#c4a24a', '#d4a05a', '#d9956b', '#e08a74', '#c98266', '#b58a96', '#a08c80', '#8c7166', '#9a8f8a', '#7f8fa3'];
const RESERVED = /둘기마요|dovemayo|관리자|운영자|admin/i;
const nickKey = (h) => 'nick:' + h;
const nameKey = (n) => 'nickname:' + n.replace(/\s+/g, '').toLowerCase();
const nickView = (n) => (n ? { name: n.name, color: n.color, owner: !!n.owner } : null);
async function getNicks(env, hashes) {
  const keys = [...new Set(hashes.filter(Boolean))].map(nickKey), out = new Map();
  for (let i = 0; i < keys.length; i += 128) for (const [k, v] of await env.BOARD.get(keys.slice(i, i + 128))) out.set(k.slice(5), v);
  return out;
}
async function randomNick(env) {
  for (let i = 0; i < 60; i++) {
    const name = ADJ[Math.floor(Math.random() * ADJ.length)] + ' ' + NOUN[Math.floor(Math.random() * NOUN.length)];
    if (!RESERVED.test(name) && !(await env.BOARD.get(nameKey(name)))) return name;
  }
  return null;
}
// name 을 me 의 닉네임으로. 다른 사람이 쓰는 이름이면 false
async function claimNick(env, me, name, color, owner) {
  const old = await env.BOARD.get(nickKey(me));
  if (!owner) {
    const holder = await env.BOARD.get(nameKey(name));
    if (holder && holder !== me) return false;
    await env.BOARD.put(nameKey(name), me);
  }
  if (old && !old.owner && nameKey(old.name) !== nameKey(name) && (await env.BOARD.get(nameKey(old.name))) === me) await env.BOARD.delete(nameKey(old.name));
  const n = { name, color: color || (old && old.color) || NICK_COLORS[Math.floor(Math.random() * NICK_COLORS.length)] };
  if (owner) n.owner = true;
  await env.BOARD.put(nickKey(me), n);
  return n;
}
// 관리자 키로 들어온 IP 의 닉네임은 "둘기마요" (그 IP 로 올린 예전 글·댓글도 둘기마요로 보인다)
async function ownerNick(env, me) {
  const n = me && (await env.BOARD.get(nickKey(me)));
  if (!me || (n && n.owner)) return n;
  return claimNick(env, me, OWNER_NICK, (n && n.color) || OWNER_COLOR, true);
}

// 한 시간에 limit 번까지. key 는 소금 친 IP 해시로 만든다
async function rateOk(env, key, limit) {
  const hour = Math.floor(Date.now() / 3600000), rate = await env.BOARD.get(key);
  const used = rate && rate.hour === hour ? rate.n : 0;
  if (used >= limit) return false;
  await env.BOARD.put(key, { hour, n: used + 1 });
  return true;
}
async function show(request, env, path, admin) {
  const list = (await env.BOARD.get('show')) || [], me = await writer(request, env);
  if (path === 'list' && request.method === 'GET') {
    if (admin) await ownerNick(env, me);
    const shown = list.slice(0, 600), who = [me];
    for (const p of shown) { who.push(p.by); for (const c of p.comments || []) who.push(c.by); }
    const nicks = await getNicks(env, who), nick = (h) => nickView(h && nicks.get(h));
    // 닉네임이 없는 글쓴이·댓글쓴이(닉네임 기능 전에 올린 사람 등)에게 무작위 닉네임을 붙인다 (주인 지시 2026-11-18). 한 번 붙으면 그대로
    for (const h of new Set(who)) {
      if (!h || nicks.has(h)) continue;
      const name = await randomNick(env), got = name && (await claimNick(env, h, name, null, false));
      if (got) nicks.set(h, got);
    }
    // 글쓴이 기록(by)이 생기기 전의 첫 글들: 누가 썼는지 알 수 없으니 글마다 무작위 닉네임을 하나 붙여 글에 저장한다
    let changed = false;
    for (const p of shown) {
      if (p.by || p.nick) continue;
      const name = await randomNick(env);
      if (!name) continue;
      await env.BOARD.put(nameKey(name), 'post:' + p.id);
      p.nick = { name, color: NICK_COLORS[Math.floor(Math.random() * NICK_COLORS.length)] };
      changed = true;
    }
    if (changed) await env.BOARD.put('show', list);
    return json({ admin, me: nick(me), posts: shown.map((p) => ({ id: p.id, code: p.code, text: p.text, at: p.at, mine: !!me && p.by === me,
      likes: (p.likes || []).length, liked: !!me && (p.likes || []).includes(me), nick: nick(p.by) || nickView(p.nick),
      comments: (p.comments || []).map((c) => Object.assign(commentView(c, p, me), { nick: nick(c.by) })) })) });
  }
  if (request.method !== 'POST') return fail('지원하지 않는 요청입니다.', 405);
  let body;
  try { body = await request.json(); } catch (e) { return fail('잘못된 요청입니다.'); }
  if (path === 'submit') {
    const code = String(body.code || '').trim();
    if (!/^[^<>"'&]{6,900}$/.test(code) || code.indexOf(':') < 0) return fail('조합 코드가 올바르지 않습니다.');
    const text = String(body.text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_SHOW_TEXT);
    if (!(await rateOk(env, 'rateh-show:' + (me || 'unknown'), 12))) return fail('잠시 뒤에 다시 올려 주세요.', 429);
    const id = newId();
    list.unshift({ id, code, text, at: new Date().toISOString(), by: me });
    if (list.length > MAX_SHOW) list.length = MAX_SHOW;
    await env.BOARD.put('show', list);
    return json({ ok: true, id });
  }
  if (path === 'nick') {
    if (!me) return fail('닉네임을 정할 수 없습니다.', 403);
    let n = admin ? await ownerNick(env, me) : await env.BOARD.get(nickKey(me));
    const color = body.color != null ? String(body.color) : null;
    if (color != null && NICK_COLORS.indexOf(color) < 0) return fail('고를 수 있는 색이 아닙니다.');
    let name = null;
    if (body.name != null) return fail('닉네임은 주사위로만 바꿀 수 있습니다.');
    if (body.roll) {
      if (n && n.owner) return fail('둘기마요의 닉네임은 바꿀 수 없습니다.', 403);
      if (!(await rateOk(env, 'rateh-nick:' + me, 60))) return fail('잠시 뒤에 다시 뽑아 주세요.', 429);
      name = await randomNick(env);
    } else if (!n) name = await randomNick(env);
    if (name) {
      const got = await claimNick(env, me, name, color, false);
      if (!got) return fail('다른 사람이 쓰는 닉네임입니다.', 409);
      n = got;
    } else if (color != null && n) { n.color = color; await env.BOARD.put(nickKey(me), n); }
    if (!n) return fail('닉네임을 뽑지 못했습니다. 다시 눌러 주세요.', 503);
    return json({ ok: true, me: nickView(n), colors: NICK_COLORS });
  }
  if (path === 'comment' || path === 'uncomment') {
    const p = list.find((x) => x.id === body.id);
    if (!p) return fail('없는 글입니다.', 404);
    const comments = p.comments || (p.comments = []);
    if (path === 'comment') {
      if (!me) return fail('댓글을 달 수 없습니다.', 403);
      const text = String(body.text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_COMMENT);
      if (!text) return fail('댓글을 적어 주세요.');
      if (comments.length >= MAX_COMMENTS) return fail('댓글이 가득 찼습니다.', 503);
      if (!(await rateOk(env, 'rateh-comment:' + me, COMMENTS_PER_HOUR))) return fail('잠시 뒤에 다시 달아 주세요.', 429);
      const c = { id: newId(), text, at: new Date().toISOString(), by: me };
      comments.push(c);
      await env.BOARD.put('show', list);
      const nicks = await getNicks(env, comments.map((x) => x.by));
      return json({ ok: true, comments: comments.map((x) => Object.assign(commentView(x, p, me), { nick: nickView(nicks.get(x.by)) })) });
    }
    const i = comments.findIndex((c) => c.id === body.cid);
    if (i < 0) return fail('없는 댓글입니다.', 404);
    if (!admin && !(me && comments[i].by === me)) return fail('단 곳(같은 IP)에서만 지울 수 있습니다.', 403);
    comments.splice(i, 1);
    await env.BOARD.put('show', list);
    const nicks = await getNicks(env, comments.map((x) => x.by));
    return json({ ok: true, comments: comments.map((x) => Object.assign(commentView(x, p, me), { nick: nickView(nicks.get(x.by)) })) });
  }
  if (path === 'like') {
    // 추천: 같은 IP(소금 친 해시)당 한 번. 다시 누르면 취소된다
    if (!me) return fail('추천할 수 없습니다.', 403);
    const p = list.find((x) => x.id === body.id);
    if (!p) return fail('없는 글입니다.', 404);
    const likes = p.likes || [], i = likes.indexOf(me);
    if (i < 0) likes.push(me); else likes.splice(i, 1);
    p.likes = likes;
    await env.BOARD.put('show', list);
    return json({ ok: true, likes: likes.length, liked: i < 0 });
  }
  if (path === 'delete' || path === 'edit') {
    const i = list.findIndex((p) => p.id === body.id);
    if (i < 0) return fail('없는 글입니다.', 404);
    const mine = !!me && list[i].by === me;
    if (!mine && !admin) return fail('올린 곳(같은 IP)에서만 고치거나 지울 수 있습니다.', 403);
    if (path === 'edit') {
      if (body.text != null) list[i].text = String(body.text || '').replace(/\s+/g, ' ').trim().slice(0, MAX_SHOW_TEXT);
      if (body.code != null) {
        if (!admin) return fail('조합 코드는 관리자만 고칠 수 있습니다.', 403);
        const code = String(body.code).trim();
        if (!/^[^<>"'&]{6,900}$/.test(code) || code.indexOf(':') < 0) return fail('조합 코드가 올바르지 않습니다.');
        list[i].code = code;
      }
    }
    else list.splice(i, 1);
    await env.BOARD.put('show', list);
    return json({ ok: true });
  }
  return fail('없는 요청입니다.', 404);
}

async function board(request, env, path) {
  const admin = isAdmin(request, env);
  if (path.startsWith('show/')) return show(request, env, path.slice(5), admin);
  if (path === 'list' && request.method === 'GET') {
    const list = await readIndex(env), me = await writer(request, env), view = (p) => viewOf(p, me);
    return json({
      admin,
      // approved posts: most recently approved first (older ones without approvedAt fall back to the post time)
      approved: list.filter((p) => p.status === 'approved').sort((a, b) => (b.approvedAt || b.at).localeCompare(a.approvedAt || a.at)).map(view),
      pending: list.filter((p) => p.status === 'pending').map(view)
    });
  }
  if (path.startsWith('img/') && request.method === 'GET') {
    const id = path.slice(4);
    const post = (await readIndex(env)).find((p) => p.id === id);
    if (!post || !post.img) return fail('없음', 404);
    const data = await env.BOARD.get('img:' + id);
    if (!data) return fail('없음', 404);
    return new Response(data, { headers: { 'content-type': post.img, 'cache-control': 'public, max-age=86400', 'x-content-type-options': 'nosniff' } });
  }
  if (request.method !== 'POST') return fail('지원하지 않는 요청입니다.', 405);
  if (path === 'submit') return submit(request, env);
  if (path === 'approve' || path === 'delete' || path === 'reply' || path === 'edit') {
    let body;
    try { body = await request.json(); } catch (e) { return fail('잘못된 요청입니다.'); }
    const list = await readIndex(env), i = list.findIndex((p) => p.id === body.id);
    if (i < 0) return fail('없는 글입니다.', 404);
    const me = await writer(request, env), mine = !!me && list[i].by === me;
    // the writer may delete their post, and edit it until it is reviewed; everything else is admin only
    if (!admin && !(mine && (path === 'delete' || (path === 'edit' && list[i].status === 'pending')))) {
      return fail(path === 'edit' && mine ? '검토가 끝난 제안은 고칠 수 없습니다.' : '권한이 없습니다.', 403);
    }
    if (path === 'edit') {
      const text = String(body.text || '').trim().slice(0, MAX_TEXT);
      if (!text && !list[i].img) return fail('내용을 적어 주세요.');
      list[i].text = text;
    }
    else if (path === 'approve') { list[i].status = 'approved'; list[i].approvedAt = new Date().toISOString(); }
    else if (path === 'reply') {
      const text = String(body.text || '').trim().slice(0, MAX_TEXT);
      if (text) list[i].reply = text; else delete list[i].reply;
    }
    else { if (list[i].img) await env.BOARD.delete('img:' + list[i].id); list.splice(i, 1); }
    await writeIndex(env, list);
    return json({ ok: true });
  }
  return fail('없는 요청입니다.', 404);
}

// The board lives in one object so reads and writes of the index never race.
// Earlier versions keyed rate limits by the raw IP ("rate:<ip>", "rate-show:<ip>"). Remove those once.
async function cleanupRawIpKeys(storage) {
  if (await storage.get('cleanup:raw-ip-rate')) return;
  for (const prefix of ['rate:', 'rate-show:']) {
    const keys = [...(await storage.list({ prefix })).keys()];
    for (let i = 0; i < keys.length; i += 128) await storage.delete(keys.slice(i, i + 128));
  }
  await storage.put('cleanup:raw-ip-rate', new Date().toISOString());
}

export class Board extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);
    const env = { BOARD: this.ctx.storage, BOARD_ADMIN_KEY: this.env.BOARD_ADMIN_KEY };
    try { await cleanupRawIpKeys(this.ctx.storage); } catch (e) { /* 다음 요청에서 다시 */ }
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
