/*
 * 캐릭터 생성기 조합 엔진
 *
 * 그림은 전부 parts/ 폴더의 SVG 파일에 있다. tools/build.js 가 그 파일들을 읽어
 * js/parts-data.js 로 묶고, 이 엔진은 CG.load() 로 받은 조각을 레이어 순서대로 쌓기만 한다.
 *
 * 규격
 * - 캔버스: 702 x 702, 좌우 대칭축 x = 351
 * - 조각의 half 는 왼쪽 절반만 그린 것으로, 엔진이 좌우 반전해서 한 번 더 그린다.
 *   full 은 그린 그대로 한 번만 그린다.
 * - 색은 전부 CSS 변수(--hair, --skin, --eye ...)로 받는다 (빌드할 때 기준 색이 변수로 바뀐다).
 * - 조각 안의 "@@" 는 그림마다 다른 번호로 바뀐다 (id 충돌 방지).
 *
 * 머리카락 구조
 * - 기본머리(parts/base/hair.svg): 머리 윤곽 안을 채우고 귀 뒤로 넘어간다. 항상 깔린다.
 * - 얼굴 피부는 헤어라인 아래에만 칠해져 있다 (parts/face).
 * - 앞머리 / 옆머리는 기본머리 위에 얹는 덩어리, 뒷머리는 기본머리 뒤에 놓이는 덩어리다.
 */
(function (g) {
  'use strict';

  var SIZE = 702;
  var MIRROR = 'translate(702 0) scale(-1 1)';
  var IRIS_R = 26;                 // 눈동자 기본 반지름 (눈동자 크기 항목이 여기에 배율을 곱한다)
  var IRIS_CENTER = [294, 362];    // 눈 파일에 iris 표시가 없을 때 쓰는 중심

  // 아래 -> 위 순서
  var LAYERS = ['hairBack', 'body', 'hairMid', 'hairBase', 'ear', 'face', 'skin', 'makeup', 'skinTop', 'mouth', 'eye',
    'hairLine', 'brow', 'glasses', 'hairFront', 'hairSide', 'hairTop', 'acc'];

  // 화면의 묶음. 위에서부터 이 순서로 놓인다
  var GROUPS = [
    { key: 'hair', name: '헤어' },
    { key: 'eyes', name: '눈' },
    { key: 'face', name: '얼굴' },
    { key: 'acc', name: '악세사리' },
    { key: 'bg', name: '배경' }
  ];

  // type: 'eye' 인 항목은 eye 레이어에서 한꺼번에 조립한다
  // 같은 레이어에 그리는 항목(front/extra, makeup/lip)은 이 순서대로 쌓인다
  var CATEGORIES = [
    { key: 'front', code: 'hf', name: '앞머리', group: 'hair' },
    { key: 'extra', code: 'hx', name: '추가머리', group: 'hair', noneWeight: 0.7 },
    { key: 'side', code: 'hs', name: '옆머리', group: 'hair' },
    { key: 'back', code: 'hb', name: '뒷머리', group: 'hair' },
    { key: 'eye', code: 'e', name: '눈 모양', group: 'eyes', sub: 'eye', type: 'eye' },
    { key: 'fold', code: 'd', name: '쌍꺼풀', group: 'eyes', sub: 'eye', type: 'eye' },
    { key: 'lowline', code: 'u', name: '아래 아이라인', group: 'eyes', sub: 'eye', type: 'eye' },
    // 위치·크기 조절 (그림 없이 수치만)
    { key: 'eyeGap', code: 'xg', name: '눈 간격', group: 'eyes', sub: 'eye', type: 'eye' },
    { key: 'eyeY', code: 'xy', name: '눈 높이', group: 'eyes', sub: 'eye', type: 'eye' },
    { key: 'eyeSize', code: 'xs', name: '눈 크기', group: 'eyes', sub: 'eye', type: 'eye' },
    { key: 'lash', code: 'l', name: '속눈썹', group: 'eyes', sub: 'lash', type: 'eye' },
    { key: 'lowlash', code: 'w', name: '아래 속눈썹', group: 'eyes', sub: 'lash', type: 'eye' },
    { key: 'iris', code: 'i', name: '눈동자 크기', group: 'eyes', sub: 'iris', type: 'eye' },
    { key: 'pupil', code: 'p', name: '눈동자 무늬', group: 'eyes', sub: 'iris', type: 'eye' },
    { key: 'hl', code: 'h', name: '하이라이트', group: 'eyes', sub: 'iris', type: 'eye' },
    { key: 'face', code: 'f', name: '얼굴형', group: 'face' },
    { key: 'ear', code: 'er', name: '귀 모양', group: 'face' },
    { key: 'skinfx', code: 's', name: '피부특징', group: 'face', noneWeight: 0.6 },
    { key: 'makeup', code: 'k', name: '볼터치', group: 'face', noneWeight: 0.25 },
    // 눈가: 눈 밑 섀도(그림) / 애교살 / 다크서클(엔진이 아래 라인을 따라 그림) 중 하나만
    { key: 'around', code: 'ey', name: '눈가', group: 'face' },
    { key: 'lip', code: 'kl', name: '립', group: 'face', noneWeight: 0.5 },
    { key: 'brow', code: 'b', name: '눈썹', group: 'face' },
    { key: 'mouth', code: 'm', name: '입', group: 'face' },
    { key: 'mouthY', code: 'xm', name: '입 높이', group: 'face', type: 'eye' },
    { key: 'acc', code: 'a', name: '헤어 악세사리', group: 'acc', noneWeight: 0.65 },
    { key: 'glasses', code: 'g', name: '안경', group: 'acc', noneWeight: 0.75 },
    { key: 'earring', code: 'ae', name: '귀걸이', group: 'acc', noneWeight: 0.6 },
    { key: 'facewear', code: 'af', name: '마스크', group: 'acc', noneWeight: 0.9 }
  ];

  // after: 그 항목 바로 뒤에 놓는다 (없으면 묶음·소분류의 맨 뒤)
  var COLOR_SLOTS = [
    { key: 'hairColor', code: 'ch', name: '헤어 색', palette: 'hair', group: 'hair' },
    { key: 'eyeColor', code: 'ce', name: '눈 색', palette: 'eye', group: 'eyes', sub: 'iris' },
    { key: 'skinColor', code: 'cs', name: '피부색', palette: 'skin', group: 'face', after: 'face' },
    { key: 'accColor', code: 'ca', name: '악세사리 색', palette: 'acc', group: 'acc' },
    { key: 'bgColor', code: 'cb', name: '배경 색', palette: 'bg', group: 'bg' }
  ];

  // 묶음 안의 소분류 (눈 묶음만 쓴다)
  var SUBS = [
    { key: 'eye', group: 'eyes', name: '눈 모양' },
    { key: 'lash', group: 'eyes', name: '속눈썹' },
    { key: 'iris', group: 'eyes', name: '눈동자' }
  ];

  // 화면 순서: [{ group, sub, items: [항목 또는 색 슬롯] }]
  function panel() {
    var out = [];
    GROUPS.forEach(function (g) {
      var subs = SUBS.filter(function (s) { return s.group === g.key; });
      (subs.length ? subs : [null]).forEach(function (sub) {
        var items = [];
        CATEGORIES.forEach(function (c) {
          if (c.group === g.key && (c.sub || null) === (sub && sub.key)) items.push({ kind: 'part', def: c });
        });
        COLOR_SLOTS.forEach(function (c) {
          if (c.group !== g.key || (c.sub || null) !== (sub && sub.key)) return;
          var at = -1;
          if (c.after) items.forEach(function (it, i) { if (it.def.key === c.after) at = i + 1; });
          if (at < 0) items.push({ kind: 'color', def: c }); else items.splice(at, 0, { kind: 'color', def: c });
        });
        out.push({ group: g, sub: sub, items: items });
      });
    });
    return out;
  }

  var parts = {};
  var palettes = {};
  var base = {};
  var counter = 0;

  CATEGORIES.forEach(function (c) { parts[c.key] = []; });

  // tools/build.js 가 만든 js/parts-data.js 가 호출한다
  function load(data) {
    base = data.base || {};
    CATEGORIES.forEach(function (c) { parts[c.key] = (data.parts && data.parts[c.key]) || []; });
  }

  function addPalette(name, list) { palettes[name] = list; }

  function findIn(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  // ---------- 색 ----------
  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function mix(a, b, t) {
    var x = hexToRgb(a), y = hexToRgb(b), out = '#';
    for (var i = 0; i < 3; i++) {
      var v = Math.round(x[i] + (y[i] - x[i]) * t);
      out += (v < 16 ? '0' : '') + v.toString(16);
    }
    return out;
  }

  // ---------- 상태 ----------
  function defaultOf(list) {
    if (!list.length) return null;
    for (var i = 0; i < list.length; i++) if (list[i].isDefault) return list[i].id;
    return list[0].id;
  }

  function defaultState() {
    var s = {};
    CATEGORIES.forEach(function (c) { s[c.key] = defaultOf(parts[c.key]); });
    COLOR_SLOTS.forEach(function (c) { s[c.key] = defaultOf(palettes[c.palette]); });
    return s;
  }

  // 좌우 반전할 수 있는 항목 (그대로 한 번만 그리는 full 조각이 뒤집힌다). 조합 코드에는 fl:hf.hs 처럼 적힌다
  var FLIP_KEYS = ['front', 'extra', 'side', 'back', 'skinfx', 'acc', 'glasses', 'facewear'];
  // 지금 고른 파츠가 좌우가 다른 그림인지 (half 만 있으면 뒤집어도 같다)
  function canFlip(state, key) {
    if (FLIP_KEYS.indexOf(key) < 0) return false;
    var p = findIn(parts[key] || [], state[key]);
    if (!p || !p.pieces) return false;
    for (var l in p.pieces) if (p.pieces[l].full) return true;
    return false;
  }

  function normalize(state) {
    var s = defaultState();
    s.flip = {};
    if (!state) return s;
    FLIP_KEYS.forEach(function (k) { if (state.flip && state.flip[k]) s.flip[k] = true; });
    CATEGORIES.forEach(function (c) {
      if (findIn(parts[c.key], state[c.key])) s[c.key] = state[c.key];
    });
    COLOR_SLOTS.forEach(function (c) {
      if (findIn(palettes[c.palette], state[c.key])) s[c.key] = state[c.key];
    });
    return s;
  }

  function pickWeighted(list, rnd) {
    var total = 0, i;
    for (i = 0; i < list.length; i++) total += (list[i].w == null ? 1 : list[i].w);
    var r = rnd() * total;
    for (i = 0; i < list.length; i++) {
      r -= (list[i].w == null ? 1 : list[i].w);
      if (r < 0) return list[i];
    }
    return list[list.length - 1];
  }

  function randomPart(cat, rnd) {
    var list = parts[cat.key];
    if (!list.length) return null;
    if (cat.noneWeight != null) {
      var none = findIn(list, 'none');
      var rest = list.filter(function (p) { return !p.none; });
      if (none && (rnd() < cat.noneWeight || !rest.length)) return none.id;
      return pickWeighted(rest, rnd).id;
    }
    return pickWeighted(list, rnd).id;
  }

  // locks: { key: true } 인 항목은 prev 값을 유지한다
  function randomState(prev, locks, rnd) {
    rnd = rnd || Math.random;
    locks = locks || {};
    var b = normalize(prev), s = {};
    CATEGORIES.forEach(function (c) {
      s[c.key] = locks[c.key] ? b[c.key] : randomPart(c, rnd);
    });
    s.flip = {};
    // 좌우 반전은 켜 둔 대로 유지한다 (랜덤이 바꾸지 않는다)
    FLIP_KEYS.forEach(function (k) { if (b.flip[k]) s.flip[k] = true; });
    COLOR_SLOTS.forEach(function (c) {
      s[c.key] = locks[c.key] ? b[c.key] : pickWeighted(palettes[c.palette], rnd).id;
    });
    return s;
  }

  function randomOne(prev, key, rnd) {
    rnd = rnd || Math.random;
    var s = normalize(prev), i, cur = s[key], tries = 0;
    for (i = 0; i < CATEGORIES.length; i++) {
      if (CATEGORIES[i].key !== key) continue;
      if (parts[key].length < 2) return s;
      do { s[key] = pickWeighted(parts[key], rnd).id; } while (s[key] === cur && ++tries < 20);
      return s;
    }
    for (i = 0; i < COLOR_SLOTS.length; i++) {
      if (COLOR_SLOTS[i].key !== key) continue;
      var pal = palettes[COLOR_SLOTS[i].palette];
      do { s[key] = pickWeighted(pal, rnd).id; } while (s[key] === cur && ++tries < 20);
      return s;
    }
    return s;
  }

  // ---------- 조합 코드 ----------
  function encode(state) {
    var s = normalize(state), out = [];
    CATEGORIES.concat(COLOR_SLOTS).forEach(function (c) { out.push(c.code + ':' + s[c.key]); });
    var fl = CATEGORIES.filter(function (c) { return s.flip[c.key]; }).map(function (c) { return c.code; });
    if (fl.length) out.push('fl:' + fl.join('.'));
    return out.join(',');
  }

  function decode(text) {
    var map = {}, s = {};
    CATEGORIES.concat(COLOR_SLOTS).forEach(function (c) { map[c.code] = c.key; });
    String(text || '').split(',').forEach(function (pair) {
      var i = pair.indexOf(':');
      if (i < 1) return;
      var key = map[pair.slice(0, i).trim()];
      if (key) s[key] = pair.slice(i + 1).trim();
      else if (pair.slice(0, i).trim() === 'fl') {
        s.flip = {};
        pair.slice(i + 1).trim().split('.').forEach(function (code) { if (map[code]) s.flip[map[code]] = true; });
      }
    });
    return normalize(s);
  }

  // ---------- 그리기 ----------
  // 피부색: 팔레트(palettes.js 의 skin)의 hex 와 line 에서 볼터치·입술·코 색을 정한다.
  // 팔레트 항목에 blush, lip, lid, nose 를 직접 적으면 그 색을 쓴다 (기본 피부색이 그렇다).
  function skinOf(s) {
    var c = findIn(palettes.skin || [], s.skinColor) || { hex: '#fdeeea', line: '#b46352' };
    return {
      hex: c.hex,
      line: c.line,
      blush: c.blush || mix(c.hex, '#d04a50', 0.3),
      lip: c.lip || mix('#dc6450', c.line, 0.25),
      lid: c.lid || mix(c.hex, c.line, 0.75),
      nose: c.nose || mix(c.hex, c.line, 0.6)
    };
  }

  function colorVars(s) {
    var hair = findIn(palettes.hair, s.hairColor).hex;
    var eye = findIn(palettes.eye, s.eyeColor).hex;
    var acc = findIn(palettes.acc, s.accColor).hex;
    var SKIN = skinOf(s);
    return {
      '--hair': hair,
      '--hair-line': mix(hair, '#1c1412', 0.62),
      '--skin': SKIN.hex,
      '--skin-line': SKIN.line,
      '--blush': SKIN.blush,
      '--blush-line': mix(SKIN.blush, SKIN.line, 0.45),
      '--lip': SKIN.lip,
      '--lid-low': SKIN.lid,
      '--mole': mix(SKIN.line, '#1c1412', 0.5),
      '--nose': SKIN.nose,
      '--aegyo': '#e9a6a0',
      '--dark': '#7d5a6e',
      '--eye': eye,
      '--eye-ring': mix(eye, '#140c0a', 0.6),
      '--pupil': mix(eye, '#0c0706', 0.84),
      '--lash': '#2b201d',
      '--glass': '#3a3336',
      '--cloth': '#f9f2f1',
      '--acc': acc,
      '--acc-line': mix(acc, '#1c1412', 0.55)
    };
  }

  // ---------- 경로 따라가기 (속눈썹·쌍꺼풀·애교살을 아이라인에서 만든다) ----------
  // SVG 경로 d 를 점 목록으로 펼친다. M L H V C S Q T Z (절대·상대) 를 읽는다. A 는 직선으로 본다.
  function flatten(d) {
    var tok = String(d).match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) || [];
    var i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0, pts = [];
    function num() { return parseFloat(tok[i++]); }
    function push(px, py) { pts.push([px, py]); }
    function cubic(x1, y1, x2, y2, x3, y3) {
      for (var k = 1; k <= 16; k++) {
        var t = k / 16, u = 1 - t;
        push(u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
          u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3);
      }
      cx = x2; cy = y2; x = x3; y = y3;
    }
    while (i < tok.length) {
      if (/[a-zA-Z]/.test(tok[i])) cmd = tok[i++];
      var rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), ox = rel ? x : 0, oy = rel ? y : 0;
      if (C === 'Z') { x = sx; y = sy; push(x, y); continue; }
      if (C === 'M') { x = ox + num(); y = oy + num(); sx = x; sy = y; push(x, y); cmd = rel ? 'l' : 'L'; }
      else if (C === 'L' || C === 'T') { x = ox + num(); y = oy + num(); push(x, y); }
      else if (C === 'H') { x = ox + num(); push(x, y); }
      else if (C === 'V') { y = oy + num(); push(x, y); }
      else if (C === 'C') { var a = ox + num(), b = oy + num(), e = ox + num(), f = oy + num(); cubic(a, b, e, f, ox + num(), oy + num()); }
      else if (C === 'S') { var e2 = ox + num(), f2 = oy + num(); cubic(2 * x - cx, 2 * y - cy, e2, f2, ox + num(), oy + num()); }
      else if (C === 'Q') {
        var qx = ox + num(), qy = oy + num(), ex = ox + num(), ey = oy + num();
        cubic(x + 2 / 3 * (qx - x), y + 2 / 3 * (qy - y), ex + 2 / 3 * (qx - ex), ey + 2 / 3 * (qy - ey), ex, ey);
      } else if (C === 'A') { i += 5; x = ox + num(); y = oy + num(); push(x, y); }
      else i++;
    }
    return pts;
  }

  // 점 목록을 같은 간격 n 개로 다시 나누고, 바깥 눈꼬리(왼쪽 눈이라 x 가 작은 쪽)부터 시작하게 한다
  function resample(d, n) {
    var p = typeof d === 'string' ? flatten(d) : d.slice();
    if (p.length < 2) return [];
    if (p[0][0] > p[p.length - 1][0]) p.reverse();
    var len = [0];
    for (var i = 1; i < p.length; i++) len.push(len[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
    var total = len[len.length - 1], out = [], j = 1;
    for (var k = 0; k < n; k++) {
      var s = total * k / (n - 1);
      while (j < p.length - 1 && len[j] < s) j++;
      var t = (s - len[j - 1]) / ((len[j] - len[j - 1]) || 1);
      out.push([p[j - 1][0] + (p[j][0] - p[j - 1][0]) * t, p[j - 1][1] + (p[j][1] - p[j - 1][1]) * t]);
    }
    out.total = total;
    return out;
  }

  // i 번째 점에서 눈 중심 c 의 반대쪽(바깥)으로 향하는 법선
  function normalAt(p, i, c) {
    var a = p[Math.max(0, i - 1)], b = p[Math.min(p.length - 1, i + 1)];
    var tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    var nx = -ty / l, ny = tx / l;
    if (nx * (p[i][0] - c[0]) + ny * (p[i][1] - c[1]) < 0) { nx = -nx; ny = -ny; }
    return [nx, ny];
  }

  var RR = ' fill="none" stroke-linecap="round" stroke-linejoin="round"';
  var LINE = {
    'cg-lash': 'stroke="var(--lash)" stroke-width="7"' + RR,
    'cg-lid': 'stroke="var(--lid-low)" stroke-width="5"' + RR,
    'cg-sl': 'stroke="var(--skin-line)" stroke-width="6"' + RR
  };
  var r1 = function (v) { return Math.round(v * 10) / 10; };
  function polyD(pts) { return 'M' + pts.map(function (q) { return r1(q[0]) + ' ' + r1(q[1]); }).join(' L'); }

  // 선을 법선 방향으로 dist 만큼 띄운 평행선 (from~to 구간, 0~1)
  function offsetLine(p, c, from, to, dist) {
    var out = [];
    for (var i = Math.round(from * (p.length - 1)); i <= Math.round(to * (p.length - 1)); i++) {
      var nn = normalAt(p, i, c);
      out.push([p[i][0] + nn[0] * dist, p[i][1] + nn[1] * dist]);
    }
    return out;
  }

  // at 위치(0~1)들에 법선 방향 짧은 선. lean 은 바깥 눈꼬리 쪽으로 기울이는 정도
  function ticks(p, c, at, len, lean) {
    var o = [p[0][0] - p[3][0], p[0][1] - p[3][1]], ol = Math.hypot(o[0], o[1]) || 1;
    return at.map(function (f, k) {
      var i = Math.round(f * (p.length - 1)), nn = normalAt(p, i, c);
      var dx = nn[0] + o[0] / ol * lean, dy = nn[1] + o[1] / ol * lean, dl = Math.hypot(dx, dy);
      var L = len[k] != null ? len[k] : len[len.length - 1];
      return 'M' + r1(p[i][0]) + ' ' + r1(p[i][1]) + ' L' + r1(p[i][0] + dx / dl * L) + ' ' + r1(p[i][1] + dy / dl * L);
    }).join(' ');
  }

  /*
   * 아이라인처럼 뿌리는 두껍고 끝은 뾰족한 속눈썹 (면으로 칠한다)
   * at: 선 위 위치(0=바깥 눈꼬리), len: 길이, base: 뿌리 폭, lean: 바깥쪽으로 눕히는 정도
   */
  function spikes(p, c, at, len, base, lean) {
    var o = [p[0][0] - p[4][0], p[0][1] - p[4][1]], ol = Math.hypot(o[0], o[1]) || 1;
    o = [o[0] / ol, o[1] / ol];
    return at.map(function (f, k) {
      var i = Math.round(f * (p.length - 1)), nn = normalAt(p, i, c), q = p[i];
      var L = len[k] != null ? len[k] : len[len.length - 1];
      var b = (base[k] != null ? base[k] : base[base.length - 1]) / 2;
      var dx = nn[0] + o[0] * lean, dy = nn[1] + o[1] * lean, dl = Math.hypot(dx, dy);
      dx /= dl; dy /= dl;
      var tx = -nn[1], ty = nn[0];                       // 선 방향
      var tip = [q[0] + dx * L + o[0] * L * 0.25, q[1] + dy * L + o[1] * L * 0.25];
      var mid = [q[0] + dx * L * 0.55, q[1] + dy * L * 0.55];
      var a1 = [q[0] + tx * b - nn[0] * 2, q[1] + ty * b - nn[1] * 2], a2 = [q[0] - tx * b - nn[0] * 2, q[1] - ty * b - nn[1] * 2];
      var P = function (v) { return r1(v[0]) + ' ' + r1(v[1]); };
      return 'M' + P(a1) + ' Q' + P([mid[0] + tx * b * 0.5, mid[1] + ty * b * 0.5]) + ' ' + P(tip) +
        ' Q' + P([mid[0] - tx * b * 0.5, mid[1] - ty * b * 0.5]) + ' ' + P(a2) + ' Z';
    }).join(' ');
  }

  /*
   * 살짝 휜 속눈썹 여러 가닥. 선 위 center 를 가운데로 count 개를 step 간격으로 놓는다 (0 = 바깥 눈꼬리, 1 = 눈머리).
   * dir 'up'  : 위로 솟으면서 끝이 바깥쪽으로 휜다
   * dir 'down': 바깥쪽으로 뻗으면서 끝이 아래로 처진다
   */
// 선 위의 위치 f(0~1)를 점 사이를 보간해서 정확히 구한다 (점 번호로 반올림하면 간격이 들쭉날쭉해진다)
  function along(p, f) {
    var x = Math.min(1, Math.max(0, f)) * (p.length - 1), i = Math.min(p.length - 2, Math.floor(x)), t = x - i;
    var a = p[i], b = p[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return { q: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], out: [(a[0] - b[0]) / l, (a[1] - b[1]) / l] };
  }

  // count 개의 위치를 px 간격(gap)으로 놓는다. 눈마다 선 길이가 달라도 간격은 같다. 선 밖으로 나가면 묶음째 안으로 민다.
  function spread(p, o, defGap, defCenter) {
    var n = o.count || 3, step = (o.gap || defGap) / (p.total || 100), mid = o.center != null ? o.center : defCenter;
    var first = mid - (n - 1) / 2 * step, last = mid + (n - 1) / 2 * step;
    if (first < 0.02) { last += 0.02 - first; first = 0.02; }
    if (last > 0.98) { first -= last - 0.98; }
    var at = [];
    for (var k = 0; k < n; k++) at.push(first + k * step);
    return at;
  }

  function lashes(p, c, o, dir) {
    var L = o.len || 16;
    return spread(p, o, 14, 0.33).map(function (f) {
      var s = along(p, f), q = s.q, ox = s.out[0], oy = s.out[1];
      var nx = -oy, ny = ox;
      if (nx * (q[0] - c[0]) + ny * (q[1] - c[1]) < 0) { nx = -nx; ny = -ny; }
      var dx, dy, bx, by;
      if (dir === 'down') { dx = ox * 0.3; dy = 1; bx = 0; by = 0; }
      else { dx = nx * 0.6 + ox * 1.6; dy = ny * 0.6 + oy * 1.6 - 1; bx = -ox; by = -oy; }
      var dl = Math.hypot(dx, dy) || 1;
      dx /= dl; dy /= dl;
      // 눈 중심에서 바깥으로 퍼지는 방향을 조금 섞어서 가닥마다 각도가 살짝 달라지게 한다
      var rx = q[0] - c[0], ry = q[1] - c[1], rl = Math.hypot(rx, ry) || 1, R = o.radial != null ? o.radial : (dir === 'down' ? 0.1 : 0.35);
      dx += rx / rl * R; dy += ry / rl * R; dl = Math.hypot(dx, dy) || 1;
      dx /= dl; dy /= dl;
      return 'M' + r1(q[0]) + ' ' + r1(q[1]) +
        ' Q' + r1(q[0] + dx * L * 0.6) + ' ' + r1(q[1] + dy * L * 0.6) +
        ' ' + r1(q[0] + dx * L + bx * L * 0.3) + ' ' + r1(q[1] + dy * L + by * L * 0.3);
    }).join(' ');
  }

  // 아래 속눈썹: 전부 같은 방향(아래 + 살짝 바깥)으로 그어서 끝이 모이거나 벌어지지 않게 한다
  function lowLashes(p, o, c) {
    var L = o.len || 4, end = along(p, 0), bx = end.out[0] * 0.45, by = 1, bl = Math.hypot(bx, by), R = o.radial != null ? o.radial : 0.35;
    bx /= bl; by /= bl;
    return spread(p, o, 13, 0.28).map(function (f) {
      var q = along(p, f).q, rx = q[0] - c[0], ry = q[1] - c[1], rl = Math.hypot(rx, ry) || 1;
      var dx = bx + rx / rl * R, dy = by + ry / rl * R, dl = Math.hypot(dx, dy) || 1;
      // 흰자 윤곽에서 조금 띄워서 시작한다 (아래 아이라인 밑에서 시작하도록)
      var G = o.offset != null ? o.offset : 5, ux = dx / dl, uy = dy / dl;
      return 'M' + r1(q[0] + ux * G) + ' ' + r1(q[1] + uy * G) + ' L' + r1(q[0] + ux * (G + L)) + ' ' + r1(q[1] + uy * (G + L));
    }).join(' ');
  }

  // 흰자 모양의 아래쪽 윤곽 (가장 왼쪽 점과 가장 오른쪽 점 사이의 아랫줄). 아래 속눈썹이 붙는 선으로 쓴다.
  function whiteBottom(eye) {
    var m = / d="([^"]+)"/.exec(eye.white || '');
    if (!m) return null;
    var p = flatten(m[1]);
    if (p.length > 2 && Math.hypot(p[0][0] - p[p.length - 1][0], p[0][1] - p[p.length - 1][1]) < 0.01) p.pop();
    if (p.length < 4) return null;
    var lo = 0, hi = 0, i;
    for (i = 0; i < p.length; i++) { if (p[i][0] < p[lo][0]) lo = i; if (p[i][0] > p[hi][0]) hi = i; }
    function chain(step) { var out = [p[lo]], k = lo; while (k !== hi) { k = (k + step + p.length) % p.length; out.push(p[k]); } return out; }
    function meanY(a) { var s = 0; a.forEach(function (q) { s += q[1]; }); return s / a.length; }
    var a = chain(1), b = chain(-1), low = meanY(a) > meanY(b) ? a : b;
    // 양 끝에서 위로 말려 올라가는 부분은 빼고 바닥 쪽만 남긴다
    var ys = low.map(function (q) { return q[1]; }), top = Math.min.apply(null, ys), bot = Math.max.apply(null, ys);
    var cut = top + (bot - top) * 0.5, flat = low.filter(function (q) { return q[1] >= cut; });
    return flat.length >= 4 ? flat : low;
  }

  function eyeCenter(eye) {
    if (eye.iris) return eye.iris;
    var p = flatten(eye.upper || '').concat(flatten(eye.lower || ''));
    if (!p.length) return IRIS_CENTER;
    var xs = p.map(function (q) { return q[0]; }), ys = p.map(function (q) { return q[1]; });
    return [(Math.min.apply(null, xs) + Math.max.apply(null, xs)) / 2, (Math.min.apply(null, ys) + Math.max.apply(null, ys)) / 2 + 20];
  }

  /*
   * 아이라인에서 만드는 것들
   *   eye.upper : 윗 아이라인 경로 (항상 그린다) -> 속눈썹, 쌍꺼풀
   *   eye.lower : 아래 라인 경로 (기본은 안 그린다) -> 아래 아이라인, 아래 속눈썹, 애교살
   */
  /*
   * 눈 파일에 직접 그린 그룹이 있으면 그것을 쓴다.
   *   <항목>-<선택지 id> (예: lash-long, fold-inner) 가 먼저, 없으면 <항목> (예: lash, fold)
   */
  function custom(eye, key, o) {
    var cu = eye.custom || {};
    return cu[key + '-' + o.id] || cu[key] || null;
  }
  function on(o) { return o && !o.none; }
  var W = function (o, d) { return ' style="stroke-width:' + (o.width || d) + '"'; };

  // 선을 따라 가운데가 두껍고 양 끝이 얇아지는 띠 (애교살)
  function band(p, c, from, to, gap, thick) {
    var a = [], b = [], i0 = Math.round(from * (p.length - 1)), i1 = Math.round(to * (p.length - 1));
    for (var i = i0; i <= i1; i++) {
      var nn = normalAt(p, i, c), f = (i - i0) / ((i1 - i0) || 1), t = Math.sin(Math.PI * f) * thick;
      a.push([p[i][0] + nn[0] * gap, p[i][1] + nn[1] * gap]);
      b.push([p[i][0] + nn[0] * (gap + t), p[i][1] + nn[1] * (gap + t)]);
    }
    return polyD(a.concat(b.reverse())) + ' Z';
  }

  function eyeDetails(eye, opt) {
    var c = eyeCenter(eye), out = '', m;
    var stroke = function (d, cls, extra) { return '<path d="' + d + '" ' + LINE[cls] + (extra || '') + '/>'; };
    var up = eye.upper ? resample(eye.upper, 40) : [];
    var lo = eye.lower ? resample(eye.lower, 40) : [];

    if (on(opt.dark) && lo.length) {
      out += '<path d="' + band(lo, c, 0.05, 0.95, opt.dark.gap || 2, opt.dark.thick || 18) + '" fill="var(--dark)" opacity="' + (opt.dark.opacity || 0.35) + '" filter="url(#cg-dark@@)"/>';
    }
    if (on(opt.aegyo)) {
      if ((m = custom(eye, 'aegyo', opt.aegyo))) out += m;
      else if (lo.length) out += '<path d="' + band(lo, c, 0.12, 0.88, opt.aegyo.gap || 4, opt.aegyo.thick || 11) + '" fill="var(--aegyo)" opacity="' + (opt.aegyo.opacity || 0.45) + '"/>';
    }
    if (on(opt.fold) && eye.white) {
      if ((m = custom(eye, 'fold', opt.fold))) out += m;
      // 윗 아이라인을 따라 눈 앞(안쪽 눈머리)부터 2/3 까지, 피부 선 색. 선 위치 0 = 바깥 눈꼬리, 1 = 눈머리
      else if (up.length) out += stroke(polyD(offsetLine(up, c, opt.fold.from || 0.3, opt.fold.to || 0.9, opt.fold.gap || 11)), 'cg-sl', ' style="stroke-width:' + (opt.fold.width || 5) + ';opacity:' + (opt.fold.opacity || 0.5) + '"');
    }
    if (on(opt.lash)) {
      if ((m = custom(eye, 'lash', opt.lash))) out += m;
      else if (up.length) out += stroke(lashes(up, c, opt.lash, opt.lash.dir || 'up'), 'cg-lash', W(opt.lash, 5));
    }
    if (on(opt.lowline) && eye.lower) {
      // 아래 라인을 면으로 그렸으면 그 모양을 아래 아이라인 색으로 칠한다
      out += eye.lowerShape ? '<g fill="var(--lash)">' + eye.lowerShape.replace(/fill="[^"]*"/g, '').replace(/fill:[^;"]*;?/g, '') + '</g>' : stroke(eye.lower, 'cg-lash', ' style="stroke-width:5"');
    }
    if (on(opt.lowlash)) {
      if ((m = custom(eye, 'lowlash', opt.lowlash))) out += m;
      else {
        // 흰자 아래 윤곽 전체를 기준선으로 쓴다 (노란 아래 라인은 짧아서 속눈썹을 다 못 놓는다)
        var wb = whiteBottom(eye), base = wb ? resample(wb, 60) : lo;
        if (base.length) out += stroke(lowLashes(base, opt.lowlash, c), 'cg-lash', W(opt.lowlash, 4));
      }
    }
    return out;
  }

  /*
   * 눈 한쪽을 조립한다. 눈동자와 하이라이트는 흰자 모양으로 잘라낸다(마스킹).
   *   eye   : { white, upper, lower, lines, iris:[cx,cy] }  white 가 없으면 감은 눈
   *   iris  : { scale, dx, dy }  눈동자 크기와 위치
   *   pupil : { body }  반지름 100 기준 무늬
   *   opt   : { lash, fold, lowline, lowlash, aegyo }
   */
  function eyeSide(eye, iris, pupil, hl, opt, clipId, flipBack) {
    var out = '';
    if (eye.white && pupil) {
      var c = eye.iris || IRIS_CENTER;
      var sc = IRIS_R * ((iris && iris.scale) || 1) / 100;
      var t = 'translate(' + (c[0] + ((iris && iris.dx) || 0)) + ' ' + (c[1] + ((iris && iris.dy) || 0)) + ') scale(';
      var body = pupil.body;
      // "흰 동공" 하이라이트: 동공(눈동자 무늬의 진한 부분)을 흰색으로 칠한다. 홍채 색이 없는 무늬(점 눈)는 그대로 둔다
      if (hl && hl.pupilWhite && body.indexOf('var(--eye)') >= 0) {
        body = body.replace(/var\(--pupil\)/g, '#ffffff').replace(/(fill|stroke)="#000000"/gi, '$1="#ffffff"');
      }
      out += eye.white + '<g clip-path="url(#' + clipId + ')">' +
        '<g transform="' + t + sc + ')">' + body + '</g>';
      // 홍채 테두리: 눈동자 크기와 상관없이 굵기 7 로 그린다
      if (!pupil.noRing) {
        out += '<circle cx="' + (c[0] + ((iris && iris.dx) || 0)) + '" cy="' + (c[1] + ((iris && iris.dy) || 0)) + '" r="' + r1(IRIS_R * ((iris && iris.scale) || 1) - 2.5) +
          '" fill="none" stroke="var(--eye-ring)" stroke-width="5"/>';
      }
      // 하이라이트는 좌우 반전하지 않는다 (빛 방향이 같아야 하므로 한 번 더 뒤집어 되돌린다)
      if (hl && hl.mark) out += '<g transform="' + t + (flipBack ? -sc : sc) + ' ' + sc + ')">' + hl.mark + '</g>';
      out += '</g>';
    }
    out += eye.lines || '';
    // 윗 아이라인: 면으로 그린 모양이 있으면 그것을, 아니면 선을 그린다
    if (eye.upperShape) out += eye.upperShape;
    else if (eye.upper) out += '<path d="' + eye.upper + '" ' + LINE['cg-lash'] + '/>';
    out += eyeDetails(eye, opt);
    return out;
  }

  /*
   * opts.size   : width/height 속성을 붙인다 (파일로 저장할 때)
   * opts.guide  : 헤어라인·흐름 가이드를 겹쳐 그린다
   * opts.omit   : { 항목키: true } 그 항목을 그리지 않는다 (편집용 가이드 그림을 만들 때)
   * opts.literal: 색 변수를 실제 색으로 바꿔 넣는다 (CSS 변수를 못 읽는 편집기용)
   * opts.layers : [시작, 끝) 레이어 번호. 그 구간의 레이어만 그린다 (편집용 가이드를 위아래로 나눌 때)
   */
  function compose(state, opts) {
    opts = opts || {};
    var omit = opts.omit || {};
    var s = normalize(state);
    var uid = ++counter;
    var buf = {}, defs = '';
    LAYERS.forEach(function (l) { buf[l] = { half: '', full: '' }; });

    function put(layer, piece) {
      if (!piece || !buf[layer]) return;
      if (piece.half) buf[layer].half += piece.half;
      if (piece.full) buf[layer].full += piece.full;
    }
    function part(key) { return omit[key] ? null : findIn(parts[key], s[key]); }

    // 고정 베이스
    var backPart = part('back'), hair = base.hair || {};
    // noCap: 뒷머리가 머리 윤곽보다 크게 감싸면(곱슬 숏 등) 윤곽선이 안쪽 선으로 남는다.
    // 그래서 기본머리(칠 + 윤곽선)를 뒷머리 밑에 깐다. 뒷머리가 덮은 곳의 윤곽선은 가려지고,
    // 뒷머리가 덮지 않은 곳(곱슬 숏의 정수리 등)은 윤곽선이 그대로 보인다.
    var noCap = backPart && backPart.noCap, noTuck = noCap || (backPart && backPart.down);
    put('body', base.body);
    put('hairBase', { half: (hair.fill || '') + (noCap ? '' : hair.cap || '') + (noTuck ? '' : hair.tuck || '') });
    if (noCap && hair.cap) {
      // 칠은 제자리에 두고 윤곽선만, 뒷머리 모양이 겹치는 곳을 지워서 긋는다 (마스크: 뒷머리 = 검정)
      var bm = '';
      for (var bl in backPart.pieces || {}) {
        var bp = backPart.pieces[bl];
        if (bp.half) bm += bp.half + '<g transform="' + MIRROR + '">' + bp.half + '</g>';
        bm += bp.full ? (s.flip.back ? '<g transform="' + MIRROR + '">' + bp.full + '</g>' : bp.full) : '';
      }
      defs += '<filter id="cg-blk@@"><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"/></filter>' +
        '<mask id="cg-cap@@" maskUnits="userSpaceOnUse" x="0" y="0" width="' + SIZE + '" height="' + SIZE + '">' +
        '<rect width="' + SIZE + '" height="' + SIZE + '" fill="#fff"/><g filter="url(#cg-blk@@)">' + bm + '</g></mask>';
      put('hairBase', { full: '<g mask="url(#cg-cap@@)">' + hair.cap + '<g transform="' + MIRROR + '">' + hair.cap + '</g></g>' });
    }
    put('hairLine', { half: hair.edge || '' });
    if (!parts.ear || !parts.ear.length) put('ear', base.ear);   // 귀 모양 항목이 있으면 거기서 그린다
    put('mouth', base.nose);

    var num = function (key, field) { var o = findIn(parts[key] || [], s[key]); return (o && o[field]) || 0; };
    var adj = { gap: num('eyeGap', 'dx'), eyeY: num('eyeY', 'dy'), mouthY: num('mouthY', 'dy'), size: num('eyeSize', 'scale') || 1 };

    CATEGORIES.forEach(function (c) {
      if (c.type === 'eye') return;
      var p = part(c.key);
      if (!p || p.none || !p.pieces) return;
      // 눈 높이·간격은 눈썹과 안경에도, 입 높이는 입과 립에도 같이 적용한다
      var tf = (c.key === 'brow' || c.key === 'around') ? [-adj.gap, adj.eyeY] : c.key === 'glasses' ? [0, adj.eyeY] : (c.key === 'mouth' || c.key === 'lip') ? [0, adj.mouthY] : null;
      for (var l in p.pieces) {
        var pc = p.pieces[l];
        if (s.flip[c.key] && pc.full) pc = { half: pc.half, full: '<g transform="' + MIRROR + '">' + pc.full + '</g>' };
        if (tf && (tf[0] || tf[1])) {
          pc = {
            half: pc.half ? '<g transform="translate(' + tf[0] + ' ' + tf[1] + ')">' + pc.half + '</g>' : '',
            full: pc.full ? '<g transform="translate(0 ' + tf[1] + ')">' + pc.full + '</g>' : ''
          };
        }
        put(l, pc);
      }
      if (p.defs) defs += p.defs;
    });

    var eye = part('eye'), eyeMarkup = '';
    if (eye) {
      var iris = findIn(parts.iris, s.iris), pupil = findIn(parts.pupil, s.pupil);
      var hl = findIn(parts.hl, s.hl);
      var opt = {};
      ['lash', 'fold', 'lowline', 'lowlash'].forEach(function (k) { opt[k] = findIn(parts[k], s[k]); });
      // 애교살·다크서클은 "눈가" 항목에서 하나만 고른다 (kind 로 구분)
      var around = omit.around ? null : findIn(parts.around, s.around);
      opt.aegyo = around && around.kind === 'aegyo' ? around : null;
      opt.dark = around && around.kind === 'dark' ? around : null;
      var right = (eye.alt && findIn(parts.eye, eye.alt)) || eye;
      if (eye.white) defs += '<clipPath id="cg-eye@@">' + eye.white + '</clipPath>';
      if (right !== eye && right.white) defs += '<clipPath id="cg-eye2@@">' + right.white + '</clipPath>';
      if (pupil && pupil.defs) defs += pupil.defs;
      if (on(opt.dark)) defs += '<filter id="cg-dark@@" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="3"/></filter>';
      // 눈 간격·높이·크기: 눈 중심을 기준으로 줄이고, 바깥쪽과 위아래로 옮긴다 (반전 그룹 안에서도 같은 변형이라 좌우가 대칭으로 움직인다)
      var ec = eye.iris || IRIS_CENTER;
      var etf = 'translate(' + (ec[0] - adj.gap) + ' ' + (ec[1] + adj.eyeY) + ') scale(' + adj.size + ') translate(' + (-ec[0]) + ' ' + (-ec[1]) + ')';
      eyeMarkup = '<g transform="' + etf + '">' + eyeSide(eye, iris, pupil, hl, opt, 'cg-eye@@', false) + '</g>' +
        '<g transform="' + MIRROR + '"><g transform="' + etf + '">' +
        eyeSide(right, iris, pupil, hl, opt, right !== eye ? 'cg-eye2@@' : 'cg-eye@@', true) + '</g></g>';
    }

    var vars = colorVars(s), styleAttr = '';
    for (var k in vars) styleAttr += k + ':' + vars[k] + ';';
    var bg = findIn(palettes.bg, s.bgColor).hex;
    var sizeAttr = opts.size ? ' width="' + opts.size + '" height="' + opts.size + '"' : '';

    var out = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + SIZE + ' ' + SIZE + '"' + sizeAttr +
      (opts.literal ? '' : ' style="' + styleAttr + '"') + '>' +
      (defs ? '<defs>' + defs + '</defs>' : '');

    var range = opts.layers || [0, LAYERS.length];
    if (bg && range[0] === 0) out += '<rect width="' + SIZE + '" height="' + SIZE + '" fill="' + bg + '"/>';

    LAYERS.forEach(function (l, i) {
      if (i < range[0] || i >= range[1]) return;
      if (l === 'eye') { if (eyeMarkup) out += '<g data-layer="eye">' + eyeMarkup + '</g>'; return; }
      var b = buf[l];
      if (!b.half && !b.full) return;
      out += '<g data-layer="' + l + '">';
      if (b.half) out += '<g>' + b.half + '</g><g transform="' + MIRROR + '">' + b.half + '</g>';
      out += b.full + '</g>';
    });

    if (opts.guide && base.guide && range[1] === LAYERS.length) out += '<g data-layer="guide">' + (base.guide.full || '') + '</g>';

    out = (out + '</svg>').replace(/@@/g, String(uid));
    if (opts.literal) out = out.replace(/var\((--[a-z-]+)\)/g, function (m, n) { return vars[n] || m; });
    return out;
  }

  g.CG = {
    SIZE: SIZE,
    groups: GROUPS,
    categories: CATEGORIES,
    colorSlots: COLOR_SLOTS,
    subs: SUBS,
    panel: panel,
    parts: parts,
    palettes: palettes,
    load: load,
    addPalette: addPalette,
    mix: mix,
    defaultState: defaultState,
    normalize: normalize,
    randomState: randomState,
    randomOne: randomOne,
    encode: encode,
    FLIP_KEYS: FLIP_KEYS,
    canFlip: canFlip,
    decode: decode,
    compose: compose,
    eyeDetails: eyeDetails,
    flatten: flatten
  };
})(typeof window !== 'undefined' ? window : globalThis);
