/* 화면: 미리보기, 랜덤, 고정, 수동 선택, 저장 */
(function () {
  'use strict';

  var HISTORY_MAX = 100;

  var state = CG.defaultState();
  // 피부색(기본)은 고정한 채 시작한다 (고정 버튼을 풀면 랜덤에 포함된다). 얼굴형 고정은 주인 지시로 뺐다(2026-11-17)
  // 악세사리(안경 제외)도 '없음'으로 고정한 채 시작한다
  // 오드아이도 '없음'으로 고정한 채 시작한다
  var locks = { skinColor: true, earring: true, facewear: true, oddColor: true };
  var history = [];
  var cursor = -1;
  // 현실 모드: { key: true } 인 항목은 랜덤에서 판타지 선택지(동물 귀 등)를 뽑지 않는다. 이 브라우저에 기억한다
  // 현실 모드(판타지 빼기) 버튼은 주인 지시로 없앴다(2026-11-16). 랜덤은 판타지 선택지도 비중대로 뽑는다
  var real = {};
  var controls = {}; // key -> 화면 갱신 함수

  var $ = function (id) { return document.getElementById(id); };
  // start.bat 로 띄운 로컬 서버에서 열었는지 (파일 열기·빌드·항목 편집은 서버가 있어야 된다).
  // 홈페이지에 올린 것도 http 로 열리므로 주소가 이 컴퓨터일 때만 켠다
  var SERVER = location.protocol.indexOf('http') === 0 && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  // 랜덤 성별 비율 (2026-11-16 공개): 0 = 여자(여캐 비중 그대로), 1 = 남자(_parts.json 의 wm). 랜덤에만 쓴다.
  // 열 때마다 여자 끝에서 시작한다. PC(랜덤 줄 아래)와 휴대폰(랜덤 버튼 아래 세로) 슬라이더는 같은 값
  var masc = 0;
  [['masc', 'masc-m'], ['masc-m', 'masc']].forEach(function (pair) {
    var inp = document.getElementById(pair[0]), other = document.getElementById(pair[1]);
    if (!inp) return;
    inp.addEventListener('input', function () { masc = parseFloat(inp.value) || 0; if (other) other.value = inp.value; });
  });
  var $preview = $('preview'), $code = $('code'), $status = $('status');
  var statusTimer = null;

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'class') node.className = attrs[k];
      else node.setAttribute(k, attrs[k]);
    }
    if (text != null) node.textContent = text;
    return node;
  }

  function say(text) {
    $status.textContent = text;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { $status.textContent = ''; }, 2500);
  }

  // ---------- 상태 ----------
  function render() {
    $preview.innerHTML = CG.compose(state);
    $code.value = CG.encode(state);
    for (var k in controls) controls[k]();
    $('btn-prev').disabled = $('ico-prev').disabled = cursor <= 0;
    $('btn-next').disabled = cursor >= history.length - 1;
    try { window.history.replaceState(null, '', '#' + $code.value); } catch (e) { /* file:// 에서 막히면 무시 */ }
    // 자랑·제안 게시판의 "생성기로" 링크가 이 캐릭터로 돌아오게 남겨 둔다
    try { localStorage.setItem('cg-last', $code.value); } catch (e) { /* 무시 */ }
  }

  function commit(next) {
    state = CG.normalize(next);
    history = history.slice(0, cursor + 1);
    history.push(JSON.stringify(state));
    if (history.length > HISTORY_MAX) history.shift();
    cursor = history.length - 1;
    render();
  }

  function travel(step) {
    var i = cursor + step;
    if (i < 0 || i >= history.length) return;
    cursor = i;
    state = CG.normalize(JSON.parse(history[i]));
    render();
  }

  function set(key, id) {
    if (state[key] === id) return;
    var next = JSON.parse(JSON.stringify(state));
    next[key] = id;
    commit(next);
  }

  // ---------- 파츠 줄 ----------
  var ICON = {
    random: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.5 4.5v5.5H16"/><path d="M2.5 19.5V14H8"/><path d="M4.4 9.5A8 8 0 0 1 17.6 6.3L21.5 10M2.5 14l3.9 3.7a8 8 0 0 0 13.2-3.2"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(35 12 12)"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></g></svg>',
    // 좌우 반전: 가운데 축(점선)을 향한 삼각형 두 개
    flip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18" stroke-dasharray="2.5 3"/><path d="M3 6.5 9 12l-6 5.5z"/><path d="M21 6.5 15 12l6 5.5z"/></svg>',
    // 대칭 / 왼쪽만 / 오른쪽만: 그려지는 쪽은 채우고, 안 그려지는 쪽은 흐린 테두리만
    // 대칭 아이콘의 삼각형은 서로 안쪽(가운데)을 본다
    sideBoth: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5 9.5 12 3 17.5z" fill="currentColor"/><path d="M21 6.5 14.5 12 21 17.5z" fill="currentColor"/></svg>',
    sideL: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5 9.5 12 3 17.5z" fill="currentColor"/><path d="M21 6.5 14.5 12 21 17.5z" opacity=".35" stroke-dasharray="2 2.6"/></svg>',
    sideR: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6.5 9.5 12 3 17.5z" opacity=".35" stroke-dasharray="2 2.6"/><path d="M21 6.5 14.5 12 21 17.5z" fill="currentColor"/></svg>'
  };
  function iconButton(cls, icon, label, title) {
    var b = el('button', { type: 'button', class: cls + ' tool', 'aria-label': label, title: title || label });
    b.innerHTML = ICON[icon];
    return b;
  }
  // 반전 버튼 하나가 지금 고른 파츠에 따라 두 가지 일을 한다 (CG.flipKind)
  //   full 조각이 있는 파츠(가르마, 한쪽 머리, 점 등): 좌우 반전
  //   half 조각만 있는 파츠(좌우가 같은 그림): 대칭 -> 왼쪽만 -> 오른쪽만 순서로 바뀐다 (화면 기준)
  var SIDE_TEXT = { both: '대칭 (누르면 왼쪽만)', l: '왼쪽만 (누르면 오른쪽만)', r: '오른쪽만 (누르면 대칭)' };
  function flipButton(cat) {
    var b = iconButton('flip', 'flip', cat.name + ' 좌우 반전', '좌우 반전');
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () {
      var next = JSON.parse(JSON.stringify(state)), key = cat.key;
      next.flip = next.flip || {}; next.only = next.only || {};
      if (CG.flipKind(state, key) === 'side') {
        if (!next.only[key]) next.only[key] = 'l'; else if (next.only[key] === 'l') next.only[key] = 'r'; else delete next.only[key];
      } else if (next.flip[key]) delete next.flip[key]; else next.flip[key] = true;
      commit(next);
    });
    return b;
  }
  // 지금 상태에 맞게 아이콘·눌림·설명을 바꾼다
  function paintFlip(b, cat) {
    var kind = CG.flipKind(state, cat.key), mode = (state.only && state.only[cat.key]) || 'both';
    var icon = kind === 'side' ? (mode === 'l' ? 'sideL' : mode === 'r' ? 'sideR' : 'sideBoth') : 'flip';
    if (b.getAttribute('data-icon') !== icon) { b.innerHTML = ICON[icon]; b.setAttribute('data-icon', icon); }
    // 반전할 것이 없는 파츠에서는 흐리게만 보이고, 켠 상태는 그대로 남는다
    b.className = 'flip tool' + (kind ? '' : ' idle');
    var on = kind === 'side' ? mode !== 'both' : !!(state.flip && state.flip[cat.key]);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    var text = kind === 'side' ? SIDE_TEXT[mode] : (cat.key === 'oddColor' ? '반대쪽 눈으로' : '좌우 반전');
    b.title = text; b.setAttribute('aria-label', cat.name + ' ' + text);
  }
  function lockButton(key) {
    var b = iconButton('lock', 'pin', '고정', '고정: 랜덤에서 이 항목을 바꾸지 않음');
    b.setAttribute('data-key', key);
    b.setAttribute('aria-pressed', locks[key] ? 'true' : 'false');
    b.addEventListener('click', function () {
      locks[key] = !locks[key];
      b.setAttribute('aria-pressed', locks[key] ? 'true' : 'false');
    });
    return b;
  }

  function diceButton(key) {
    var b = iconButton('dice', 'random', '랜덤', '이 항목만 랜덤');
    b.setAttribute('data-key', key);
    b.addEventListener('click', function () { commit(CG.randomOne(state, key, null, real, masc)); });
    return b;
  }

  // 현실 모드 버튼 (건물): 켜면 이 항목의 랜덤에서 판타지 선택지가 빠진다. 직접 고르는 것은 막지 않는다
  // 지금 고른 파츠의 SVG 를 연결된 편집기로 연다. 수치만 있는 항목은 그 폴더의 _parts.json 을 연다
  function fileButton(cat) {
    var b = el('button', { type: 'button', class: 'file', title: '지금 고른 파츠 파일을 편집기로 열기' }, '파일');
    b.addEventListener('click', function () {
      fetch('/api/open?cat=' + encodeURIComponent(cat.key) + '&id=' + encodeURIComponent(state[cat.key]) + '&fallback=1', { method: 'POST' })
        .then(function (r) { return r.json(); })
        .then(function (j) { say(j.error ? j.error : (j.opened || '파일') + ' 을(를) 열었습니다.'); },
          function () { say('서버에 연결하지 못했습니다. start.bat 창이 켜져 있는지 확인하세요.'); });
    });
    return b;
  }

  // ---------- 썸네일로 고르기 ----------
  // 크기·간격·높이·각도 같은 수치 항목은 드롭다운 그대로 (위 = 크게/멀게/위로, 가운데 = 기본, 아래 = 작게/가깝게/아래로)
  var PLAIN = { iris: 1, eyeGap: 1, eyeY: 1, eyeSize: 1, mouthY: 1, eyeTilt: 1, browGap: 1, browY: 1, browTilt: 1 };
  // 썸네일 밑그림: 이 캐릭터를 반투명하게 깔고, 고르는 항목만 진하게 겹친다
  var THUMB_BASE = 'hf:allback,hx:none,hs:none,hb:none,e:almond,d:none,u:none,xg:normal,xy:normal,xs:normal,l:none,w:none,i:normal,p:basic,h:none,f:round,er:normal,s:none,k:none,ey:none,kl:none,b:flat,m:line,xm:normal,a:none,g:none,ae:none,af:none,ch:milkbrown,ce:hazel,co:none,cs:base,ca:gold,cb:cream';
  var THUMB_BOX = { hair: '40 20 622 622', eye: '196 236 310 310', face: '130 160 442 442', cloth: '176 352 350 350' };
  var THUMB_OF = { front: 'hair', extra: 'hair', side: 'hair', back: 'hair', acc: 'hair',
    eye: 'eye', fold: 'eye', lowline: 'eye', lash: 'eye', lowlash: 'eye', pupil: 'eye', hl: 'eye', around: 'eye', brow: 'eye', glasses: 'eye', cloth: 'cloth', neck: 'cloth', outer: 'cloth' };
  function thumbSvg(key, id) {
    var s = CG.decode(THUMB_BASE);
    s[key] = id;
    if (key === 'neck') s.cloth = 'shirt';   // 목 장식은 셔츠 위에서 보여 준다
    if (key === 'outer') s.cloth = 'tee';    // 외투는 흰 티 위에서 보여 준다
    if (key === 'cloth' || key === 'neck') { s.clothColor = 'sky'; s.clothColor2 = 'navy'; }   // 흰 옷은 썸네일에서 안 보여서
    if (key === 'outer') { s.outerColor = 'camel'; s.clothColor2 = 'navy'; }
    var box = THUMB_BOX[THUMB_OF[key] || 'face'];
    if (key === 'pupil' || key === 'hl') {
      var e = CG.parts.eye.filter(function (p) { return p.id === s.eye; })[0], c = (e && e.iris) || [294, 362];
      box = (c[0] - 33) + ' ' + (c[1] - 33) + ' 66 66';
    }
    var vb = 'viewBox="' + box + '"';
    var fix = function (m) { return m.replace(/viewBox="[^"]*"/, vb); };
    return '<span class="th-img">' + fix(CG.compose(s, { focus: key })) + '</span>';
  }
  var openPick = null;   // 열린 썸네일 카드 { close, step }. 한 번에 하나만 연다
  function closePick() { if (openPick) { openPick.close(); openPick = null; } }
  // 위에 열린 카드가 접히면 아래 내용이 올라간다. 누른 버튼이 화면에서 같은 자리에 있도록 스크롤을 그만큼 옮긴다
  function keepInPlace(node, before) {
    var dy = node.getBoundingClientRect().top - before;
    if (Math.abs(dy) < 1) return;
    for (var p = node.parentElement; p && p !== document.body; p = p.parentElement) {
      var oy = getComputedStyle(p).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) { p.scrollTop += dy; return; }
    }
    window.scrollBy(0, dy);
  }

  function buildPartRow(cat) {
    var list = CG.parts[cat.key];
    var item = el('div', { class: 'part-item' });
    var row = el('div', { class: 'row' });
    var select = null, pick = null, label = null, card = null, thumbs = [];
    if (PLAIN[cat.key]) {
      select = el('select', { 'aria-label': cat.name });
      list.forEach(function (p) { select.appendChild(el('option', { value: p.id }, p.name)); });
      select.addEventListener('change', function () { set(cat.key, select.value); });
    } else {
      // 드롭다운 모양 버튼. 누르면 아래에 썸네일 카드가 열린다 (묶음 이름별로, 고른 것은 테두리)
      pick = el('button', { type: 'button', class: 'pick', 'aria-expanded': 'false', 'aria-label': cat.name + ' 고르기' });
      label = el('span', { class: 'pick-name' });
      pick.appendChild(label);
      pick.appendChild(el('span', { class: 'pick-arrow', 'aria-hidden': 'true' }, '▾'));
      card = el('div', { class: 'thumb-card', hidden: '' });
      var close = function () { card.hidden = true; pick.setAttribute('aria-expanded', 'false'); };
      pick.addEventListener('click', function () {
        if (!card.hidden) { closePick(); return; }
        var before = pick.getBoundingClientRect().top;
        closePick();
        keepInPlace(pick, before);
        if (!card.children.length) fillCard();
        card.hidden = false;
        pick.setAttribute('aria-expanded', 'true');
        openPick = { close: close, step: step, cols: cols };
        paintThumbs();
        var on = card.querySelector('[aria-pressed="true"]');
        if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' });
      });
    }
    function fillCard() {
      var boxName, grid = null;
      list.forEach(function (p, i) {
        if (!grid || (p.group || null) !== boxName) {
          boxName = p.group || null;
          if (boxName) card.appendChild(el('div', { class: 'thumb-group' }, boxName));
          grid = card.appendChild(el('div', { class: 'thumb-grid' }));
        }
        var b = el('button', { type: 'button', class: 'thumb', title: p.name, 'aria-label': p.name, 'aria-pressed': 'false' });
        b.innerHTML = thumbSvg(cat.key, p.id) + '<span class="th-name"></span>';
        b.lastChild.textContent = p.name;
        b.addEventListener('click', function () { set(cat.key, p.id); });
        grid.appendChild(b);
        thumbs[i] = b;
      });
    }
    // 키보드: ←→ 이전·다음, ↑↓ 한 줄 위·아래
    function step(d) {
      var i = 0;
      for (var n = 0; n < list.length; n++) if (list[n].id === state[cat.key]) i = n;
      i = Math.max(0, Math.min(list.length - 1, i + d));
      set(cat.key, list[i].id);
      if (thumbs[i] && thumbs[i].scrollIntoView) thumbs[i].scrollIntoView({ block: 'nearest' });
    }
    function cols() {
      var t = thumbs.filter(Boolean), k = 1;
      while (k < t.length && t[k].offsetTop === t[0].offsetTop) k++;
      return k;
    }
    function paintThumbs() {
      list.forEach(function (p, i) { if (thumbs[i]) thumbs[i].setAttribute('aria-pressed', p.id === state[cat.key] ? 'true' : 'false'); });
    }

    row.appendChild(el('span', { class: 'name' }, cat.name));
    row.appendChild(select || pick);
    var tools = el('span', { class: 'tools' });
    var flip = CG.FLIP_KEYS.indexOf(cat.key) >= 0 ? flipButton(cat) : null;
    tools.appendChild(flip || el('span', { class: 'tool-gap' }));
    tools.appendChild(diceButton(cat.key));
    tools.appendChild(lockButton(cat.key));
    if (SERVER) tools.appendChild(fileButton(cat));
    row.appendChild(tools);

    item.appendChild(row);
    if (card) item.appendChild(card);
    controls[cat.key] = function () {
      if (select) select.value = state[cat.key];
      else {
        var cur = null;
        list.forEach(function (p) { if (p.id === state[cat.key]) cur = p; });
        label.textContent = cur ? cur.name : '';
        if (!card.hidden) paintThumbs();
      }
      if (flip) paintFlip(flip, cat);
    };
    return item;
  }

  // ---------- 색 줄 ----------
  function buildColorRow(slot) {
    var list = CG.palettes[slot.palette];
    var wrap = el('div', { class: 'color-row' });
    var head = el('div', { class: 'color-head' });
    var picked = el('span', { class: 'picked' });
    head.appendChild(el('span', { class: 'name' }, slot.name));
    head.appendChild(picked);
    // 오드아이는 어느 쪽 눈인지 바꾸는 반전 버튼이 붙는다
    var flip = CG.FLIP_KEYS.indexOf(slot.key) >= 0 ? flipButton(slot) : null;
    if (flip) head.appendChild(flip);
    head.appendChild(diceButton(slot.key));
    head.appendChild(lockButton(slot.key));

    var box = el('div', { class: 'swatches' });
    var buttons = list.map(function (c) {
      var b = el('button', {
        type: 'button', class: 'swatch' + (c.hex ? '' : ' none'),
        title: c.name, 'aria-label': slot.name + ' ' + c.name, 'aria-pressed': 'false'
      });
      if (c.hex) b.style.background = c.hex;
      b.addEventListener('click', function () { set(slot.key, c.id); });
      box.appendChild(b);
      return b;
    });

    // 커스텀 색: 무지개 칸을 누르면 아래에 색 창 + 슬라이더 셋(색상·채도·밝기) + 색상 코드가 열린다
    var cbtn = el('button', { type: 'button', class: 'swatch custom', title: '커스텀 색', 'aria-label': slot.name + ' 커스텀 색', 'aria-pressed': 'false', 'aria-expanded': 'false' });
    box.appendChild(cbtn);
    var cp = customPicker(slot);
    cbtn.addEventListener('click', function () {
      var open = cp.el.hidden;
      cp.el.hidden = !open;
      cbtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) cp.sync(true);
    });

    wrap.appendChild(head);
    wrap.appendChild(box);
    wrap.appendChild(cp.el);

    controls[slot.key] = function () {
      var id = state[slot.key], custom = CG.isCustom(id);
      list.forEach(function (c, i) {
        var on = c.id === id;
        buttons[i].setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) picked.textContent = c.name;
      });
      cbtn.setAttribute('aria-pressed', custom ? 'true' : 'false');
      cbtn.style.setProperty('--c', custom ? '#' + id.slice(1) : 'transparent');
      if (custom) picked.textContent = '커스텀 #' + id.slice(1);
      if (!cp.el.hidden) cp.sync(false);
      if (flip) paintFlip(flip, slot);
    };
    return wrap;
  }

  // 커스텀 색 고르기. 슬라이더를 끄는 동안은 기록 없이 바로 그리고, 손을 떼면 한 번 기록한다(이전 버튼으로 돌아갈 수 있게)
  function customPicker(slot) {
    var root = el('div', { class: 'custom-pick', hidden: '' });
    var preview = el('div', { class: 'cp-preview', 'aria-hidden': 'true' });
    var side = el('div', { class: 'cp-side' });
    var hsl = [0, 0, 0.5], sliders = [];
    [['색상', 360], ['채도', 100], ['밝기', 100]].forEach(function (d, i) {
      var line = el('label', { class: 'cp-line' });
      var name = el('span', { class: 'cp-name' }, d[0]);
      var r = el('input', { type: 'range', min: '0', max: String(d[1]), step: '1', 'aria-label': slot.name + ' ' + d[0] });
      var num = el('span', { class: 'cp-num' });
      r.addEventListener('input', function () {
        hsl[i] = i === 0 ? +r.value : r.value / 100;
        apply(CG.fromHsl(hsl[0], hsl[1], hsl[2]), false);
      });
      r.addEventListener('change', function () { apply(CG.fromHsl(hsl[0], hsl[1], hsl[2]), true); });
      line.appendChild(name); line.appendChild(r); line.appendChild(num);
      side.appendChild(line);
      sliders.push({ r: r, num: num });
    });
    var codeLine = el('label', { class: 'cp-line' });
    var hex = el('input', { type: 'text', class: 'cp-hex', maxlength: '7', spellcheck: 'false', 'aria-label': slot.name + ' 색상 코드' });
    codeLine.appendChild(el('span', { class: 'cp-name' }, '코드'));
    codeLine.appendChild(hex);
    side.appendChild(codeLine);
    hex.addEventListener('input', function () {
      var m = /^#?([0-9a-fA-F]{6})$/.exec(hex.value.trim());
      if (!m) return;
      var h = '#' + m[1].toLowerCase(), t = CG.toHsl(h);
      hsl = [Math.round(t[0]), t[1], t[2]];
      apply(h, true, true);
    });
    root.appendChild(preview);
    root.appendChild(side);

    function paint(h) {
      preview.style.background = h;
      sliders[0].r.value = Math.round(hsl[0]); sliders[1].r.value = Math.round(hsl[1] * 100); sliders[2].r.value = Math.round(hsl[2] * 100);
      sliders[0].num.textContent = Math.round(hsl[0]) + '°';
      sliders[1].num.textContent = Math.round(hsl[1] * 100);
      sliders[2].num.textContent = Math.round(hsl[2] * 100);
      // 슬라이더 바탕에 그 슬라이더로 갈 수 있는 색을 깐다
      var hs = [], k;
      for (k = 0; k <= 6; k++) hs.push(CG.fromHsl(k * 60, hsl[1], hsl[2]));
      sliders[0].r.style.background = 'linear-gradient(90deg,' + hs.join(',') + ')';
      sliders[1].r.style.background = 'linear-gradient(90deg,' + CG.fromHsl(hsl[0], 0, hsl[2]) + ',' + CG.fromHsl(hsl[0], 1, hsl[2]) + ')';
      sliders[2].r.style.background = 'linear-gradient(90deg,#000,' + CG.fromHsl(hsl[0], hsl[1], 0.5) + ',#fff)';
    }
    function apply(h, record, fromHex) {
      paint(h);
      if (!fromHex) hex.value = h;
      var id = 'x' + h.slice(1);
      if (record) { if (state[slot.key] !== id) set(slot.key, id); else commit(state); return; }
      state[slot.key] = id;
      render();
    }
    // 지금 색으로 슬라이더를 맞춘다. 끄는 중에 다시 맞추면 색상 값이 흔들려서, 열 때와 바깥에서 바뀌었을 때만 맞춘다
    function sync(force) {
      var c = CG.colorIn(slot.palette, state[slot.key]);
      if (!c || !c.hex) c = CG.colorIn('eye', state.eyeColor);
      var cur = CG.fromHsl(hsl[0], hsl[1], hsl[2]);
      if (!force && c.hex === cur) return;
      var t = CG.toHsl(c.hex);
      hsl = [Math.round(t[0]), t[1], t[2]];
      paint(c.hex);
      if (document.activeElement !== hex) hex.value = c.hex;
    }
    return { el: root, sync: sync };
  }

  // ---------- 저장 ----------
  function stamp() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }

  function download(name, blob) {
    var a = el('a', { href: URL.createObjectURL(blob), download: name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  // 지금 캐릭터를 PNG 로 만든다. mark 가 참이면 왼쪽 위에 dovemayo.com 을 작고 흐리게 적는다
  function renderPng(size, mark) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(new Blob([CG.compose(state, { size: size })], { type: 'image/svg+xml' }));
      var img = new Image();
      img.onload = function () {
        var canvas = el('canvas', { width: size, height: size });
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(url);
        if (mark) watermark(ctx, size);
        canvas.toBlob(function (blob) { if (blob) resolve(blob); else reject(new Error('png')); }, 'image/png');
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('svg')); };
      img.src = url;
    });
  }

  // 배경이 어두우면 흰 글자, 밝거나 투명하면 어두운 글자
  function watermark(ctx, size) {
    var bg = null;
    CG.palettes.bg.forEach(function (c) { if (c.id === state.bgColor) bg = c.hex; });
    var dark = false;
    if (bg) {
      var n = parseInt(bg.slice(1), 16);
      dark = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 110;
    }
    ctx.font = Math.round(size * 0.03) + 'px "Dovemayo Gothic", Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillStyle = dark ? 'rgba(255,255,255,.42)' : 'rgba(43,37,35,.30)';
    ctx.fillText('DOVEMAYO.COM', size * 0.022, size * 0.02);
  }

  function markFont() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return document.fonts.load('32px "Dovemayo Gothic"', 'DOVEMAYO.COM').catch(function () { /* 기본 글꼴로 적는다 */ });
  }

  function savePng() {
    renderPng(1024, false).then(function (blob) {
      download('character-' + stamp() + '.png', blob);
      say('PNG로 저장했습니다.');
    }, function () { say('PNG 저장에 실패했습니다.'); });
  }

  // 이미지를 클립보드에 복사한다. 복사가 막힌 브라우저에서는 같은 이미지를 파일로 저장한다
  function copyImage() {
    var blob = markFont().then(function () { return renderPng(1024, true); });
    function asFile() {
      blob.then(function (b) {
        download('character-' + stamp() + '.png', b);
        say('복사가 안 돼서 파일로 저장했습니다.');
      }, function () { say('이미지를 만들지 못했습니다.'); });
    }
    if (!(navigator.clipboard && navigator.clipboard.write && window.ClipboardItem)) { asFile(); return; }
    try {
      // 누른 순간 바로 write 를 불러야 한다 (사파리). 이미지는 만들어지는 대로 넘어간다
      navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        .then(function () { say('이미지를 복사했습니다.'); }, asFile);
    } catch (e) { asFile(); }
  }

  function copyCode() {
    function fallback() {
      $code.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      say(ok ? '조합 코드를 복사했습니다.' : '복사하지 못했습니다. 직접 선택해 복사해 주세요.');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText($code.value).then(function () { say('조합 코드를 복사했습니다.'); }, fallback);
    } else fallback();
  }

  function applyCode(text) {
    text = (typeof text === 'string' ? text : $code.value).trim().replace(/^.*#/, '');
    if (text.indexOf(':') < 0) { say('조합 코드 형식이 아닙니다.'); return false; }
    commit(CG.decode(text));
    say('조합 코드를 적용했습니다.');
    return true;
  }

  // ---------- 시작 ----------
  // 묶음(헤어 / 눈 / 얼굴 / 악세사리 / 배경) 순서와 그 안의 줄 순서는 core.js 의 panel() 이 정한다
  var $groups = $('groups'), lastGroup = null, sec = null;
  CG.panel().forEach(function (block) {
    var rows = el('div', { class: 'rows' });
    block.items.forEach(function (it) {
      if (it.kind === 'color') rows.appendChild(buildColorRow(it.def));
      else if (CG.parts[it.def.key].length) rows.appendChild(buildPartRow(it.def));
    });
    if (!rows.children.length) return;
    if (block.group !== lastGroup) {
      sec = el('section', { class: 'group', 'data-group': block.group.key });
      sec.appendChild(el('h2', null, block.group.name));
      $groups.appendChild(sec);
      lastGroup = block.group;
    }
    if (block.sub) sec.appendChild(el('h3', null, block.sub.name));
    sec.appendChild(rows);
  });

  $('btn-random').addEventListener('click', function () { commit(CG.randomState(state, locks, null, real, masc)); });
  $('btn-prev').addEventListener('click', function () { travel(-1); });
  $('btn-next').addEventListener('click', function () { travel(1); });
  $('btn-copy-image').addEventListener('click', copyImage);
  $('ico-random').addEventListener('click', function () { commit(CG.randomState(state, locks, null, real, masc)); });
  $('ico-prev').addEventListener('click', function () { travel(-1); });
  $('ico-copy').addEventListener('click', copyImage);
  // 자랑게시판으로: 자랑 게시판으로 가서 한 줄 적고 올린다 (조합 코드를 주소로 넘긴다)
  function showOff() { location.href = 'https://dovemayo.com/character/show/#new=' + encodeURIComponent(CG.encode(state)); }
  $('btn-show').addEventListener('click', showOff);
  $('ico-show').addEventListener('click', showOff);
  $('btn-png').addEventListener('click', savePng);
  // 프롬프트: 조합 코드를 이미지 AI용 글로 바꾼다 (js/prompt.js 는 처음 누를 때 불러온다). NovelAI 태그 칸은 로컬에서만 보인다
  var $pdlg = $('prompt-dialog'), $pstat = $('prompt-status');
  var showPrompt = function (st) {
    var r = CG.prompt(st);
    $('prompt-en').value = r.en; $('prompt-ko').value = r.ko; $('prompt-nai').value = SERVER ? r.nai : ''; $pstat.textContent = '';
  };
  var withPrompt = function (fn) {
    if (CG.prompt) { fn(); return; }
    var sc = document.createElement('script'); sc.src = 'js/prompt.js?' + Date.now(); sc.onload = fn;
    sc.onerror = function () { alert('js/prompt.js 를 불러오지 못했습니다.'); };
    document.head.appendChild(sc);
  };
  $('btn-prompt').onclick = function () {
    withPrompt(function () { $('prompt-code').value = CG.encode(state); showPrompt(state); $pdlg.showModal(); });
  };
  $('prompt-code').addEventListener('input', function () {
    var v = $('prompt-code').value.trim().replace(/^#/, '');
    if (v.indexOf(':') < 0) { $pstat.textContent = '조합 코드가 아닙니다.'; return; }
    showPrompt(CG.decode(v));
  });
  if (SERVER) $('prompt-nai-col').hidden = false;
  ['en', 'nai', 'ko'].forEach(function (lang) {
    $('prompt-copy-' + lang).onclick = function () {
      var t = $('prompt-' + lang).value;
      var done = function () { $pstat.textContent = ({ en: '영어', nai: 'NovelAI', ko: '한국어' })[lang] + ' 프롬프트를 복사했습니다.'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { $('prompt-' + lang).select(); document.execCommand('copy'); done(); });
      else { $('prompt-' + lang).select(); document.execCommand('copy'); done(); }
    };
  });
  $('btn-copy').addEventListener('click', copyCode);
  $code.addEventListener('keydown', function (e) { if (e.key === 'Enter') applyCode(); });
  // 붙여 넣으면 바로 적용한다. 조합 코드 칸 말고 화면 아무 데서나 붙여 넣어도 (다른 입력칸이 아니면) 조합 코드면 적용
  document.addEventListener('paste', function (e) {
    var t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (typing && t !== $code) return;
    var text = ((e.clipboardData || window.clipboardData) || { getData: function () { return ''; } }).getData('text') || '';
    if (text.indexOf(':') < 0) return;
    e.preventDefault();
    if (applyCode(text)) $code.blur();
  });

  document.addEventListener('keydown', function (e) {
    if (openPick) {
      var mv = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: openPick.cols(), ArrowUp: -openPick.cols() }[e.key];
      if (mv) { e.preventDefault(); openPick.step(mv); return; }
      if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); closePick(); return; }
    }
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if (e.key === ' ' && tag !== 'button') { e.preventDefault(); commit(CG.randomState(state, locks, null, real, masc)); }
    else if (e.key === 'ArrowLeft') travel(-1);
    else if (e.key === 'ArrowRight') travel(1);
  });

  // ---------- 항목 편집 (로컬 서버에서만) ----------
  function setupItemEditor() {
    var dlg = $('items-dialog'), $cat = $('items-cat'), $body = $('items-body'), $st = $('items-status');
    var cur = null, rows = [];

    CG.groups.forEach(function (grp) {
      var og = el('optgroup', { label: grp.name });
      CG.categories.forEach(function (c) { if (c.group === grp.key) og.appendChild(el('option', { value: c.key }, c.name)); });
      if (og.children.length) $cat.appendChild(og);
    });

    function api(url, opts) {
      return fetch(url, opts).then(function (r) {
        return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || '실패'); return j; });
      });
    }
    function status(t) { $st.textContent = t; }

    function draw() {
      $body.innerHTML = '';
      rows.forEach(function (e, i) {
        var tr = el('tr');
        var order = el('td', { class: 'order' });
        var up = el('button', { type: 'button', 'aria-label': '위로' }, '↑');
        var dn = el('button', { type: 'button', 'aria-label': '아래로' }, '↓');
        up.disabled = i === 0; dn.disabled = i === rows.length - 1;
        up.onclick = function () { rows.splice(i - 1, 0, rows.splice(i, 1)[0]); draw(); };
        dn.onclick = function () { rows.splice(i + 1, 0, rows.splice(i, 1)[0]); draw(); };
        order.appendChild(up); order.appendChild(dn);

        var name = el('input', { type: 'text', value: e.name || e.id, 'aria-label': '이름' });
        name.oninput = function () { e.name = name.value; };
        var w = el('input', { type: 'number', min: '0', step: '0.1', value: e.w == null ? 1 : e.w, 'aria-label': '랜덤 비중' });
        w.oninput = function () { e.w = w.value === '' ? undefined : Number(w.value); };
        var def = el('input', { type: 'radio', name: 'items-default', 'aria-label': '기본값' });
        def.checked = !!e.default;
        def.onchange = function () { rows.forEach(function (x) { delete x.default; }); e.default = true; };

        var acts = el('td', { class: 'acts' });
        var hasFile = cur.files.indexOf(e.id) >= 0;
        if (hasFile) {
          var open = el('button', { type: 'button' }, '열기');
          open.onclick = function () { api('/api/open?cat=' + cur.cat + '&id=' + e.id, { method: 'POST' }).catch(function (x) { status(x.message); }); };
          var copy = el('button', { type: 'button' }, '복제');
          copy.onclick = function () {
            status('복제하는 중…');
            sessionStorage.setItem('cg-items', cur.cat);
            api('/api/copy?cat=' + cur.cat + '&id=' + e.id, { method: 'POST' }).then(function (r) { status(r.id + '.svg 를 만들었습니다'); }, function (x) { status(x.message); });
          };
          acts.appendChild(open); acts.appendChild(copy);
        }
        if (!cur.dataOnly || !e.none) {
          var del = el('button', { type: 'button', class: 'danger' }, '삭제');
          del.onclick = function () {
            if (!confirm('"' + (e.name || e.id) + '" 을(를) 삭제할까요?' + (hasFile ? '\n파일은 parts/_trash 폴더로 옮겨집니다.' : ''))) return;
            sessionStorage.setItem('cg-items', cur.cat);
            if (hasFile) api('/api/remove?cat=' + cur.cat + '&id=' + e.id, { method: 'POST' }).catch(function (x) { status(x.message); });
            else { rows.splice(i, 1); draw(); status('저장을 눌러야 반영됩니다'); }
          };
          acts.appendChild(del);
        }

        var tdName = el('td'); tdName.appendChild(name);
        var tdW = el('td'); tdW.appendChild(w);
        var tdD = el('td'); tdD.appendChild(def);
        tr.appendChild(order); tr.appendChild(tdName);
        tr.appendChild(el('td', { class: 'file' }, hasFile ? e.id + '.svg' : (e.none ? '(없음)' : '(수치만)')));
        tr.appendChild(tdW); tr.appendChild(tdD); tr.appendChild(acts);
        $body.appendChild(tr);
      });
    }

    function load(cat) {
      status('불러오는 중…');
      api('/api/list?cat=' + cat).then(function (r) {
        cur = { cat: cat, files: r.files, dataOnly: r.dataOnly };
        rows = r.entries.map(function (e) { return JSON.parse(JSON.stringify(e)); });
        draw();
        status(rows.length + '개');
      }, function (x) { status(x.message); });
    }

    $cat.onchange = function () { load($cat.value); };
    $('btn-items').onclick = function () { dlg.showModal(); load($cat.value); };
    $('items-folder').onclick = function () { api('/api/open?cat=' + $cat.value, { method: 'POST' }).catch(function (x) { status(x.message); }); };
    $('items-save').onclick = function () {
      status('저장하는 중…');
      sessionStorage.setItem('cg-items', cur.cat);
      api('/api/list?cat=' + cur.cat, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rows) })
        .then(function () { status('저장했습니다. 빌드 후 화면이 새로 고쳐집니다.'); }, function (x) { status(x.message); });
    };
    dlg.addEventListener('close', function () { sessionStorage.removeItem('cg-items'); });

    // 저장·복제·삭제 뒤 화면이 새로 고쳐지면 편집 창을 다시 연다
    var reopen = sessionStorage.getItem('cg-items');
    if (reopen) { $cat.value = reopen; dlg.showModal(); load(reopen); }
  }

  // ---------- 빌드 (start.bat 로 띄운 로컬 서버에서만 보인다) ----------
  if (SERVER) {
    var $bstat = $('build-status');
    $('build-bar').hidden = false;
    var showBuild = function (r) {
      var warn = /확인할 것 (\d+)건/.exec(r.output || '');
      $bstat.textContent = (r.ok ? '빌드 완료' : '빌드 실패') + (warn ? ' · 확인할 것 ' + warn[1] + '건' : '') + (r.at ? ' (' + r.at + ')' : '');
      $bstat.title = r.output || '';
    };
    $('btn-build').addEventListener('click', function () {
      $bstat.textContent = '빌드 중…';
      fetch('/api/build', { method: 'POST' }).then(function (x) { return x.json(); }).then(showBuild, function () {
        $bstat.textContent = '서버에 연결하지 못했습니다. start.bat 창이 켜져 있는지 확인하세요.';
      });
    });
    // 3×3 샘플: 고정한 항목은 그대로 두고 9명을 뽑아 한 장으로 보여 준다. 저장하면 samples 폴더에 PNG 로 남는다
    var SHEET_N = 3;
    var sheetStates = [], $sdlg = $('sheet-dialog'), $sgrid = $('sheet-grid'), $sstat = $('sheet-status');
    var drawSheet = function () {
      sheetStates = [];
      $sgrid.textContent = '';
      $sstat.textContent = '';
      for (var i = 0; i < SHEET_N * SHEET_N; i++) sheetCell(i);
    };
    // 한 칸: 얼굴을 누르면 불러오고, 왼쪽 위 버튼은 그 칸만 다시 뽑는다
    var sheetCell = function (i) {
      var cell = el('div', { class: 'sheet-cell' });
      var face = el('button', { type: 'button', class: 'sheet-face', 'aria-label': '샘플 ' + (i + 1) + ' 불러오기' });
      var again = iconButton('sheet-re', 'random', '샘플 ' + (i + 1) + ' 다시 뽑기', '이 칸만 다시 뽑기');
      var roll = function () { sheetStates[i] = CG.randomState(state, locks, null, real, masc); face.innerHTML = CG.compose(sheetStates[i]); };
      roll();
      face.onclick = function () { commit(sheetStates[i]); $sdlg.close(); };
      again.onclick = roll;
      cell.appendChild(face); cell.appendChild(again);
      $sgrid.appendChild(cell);
    };
    var sheetPng = function () {
      // 둥근 카드 9장: 칸 640, 사이 20, 바깥 여백 38, 모서리 40 (전체 2036px)
      var N = SHEET_N, cell = 640, gap = 20, pad = 38, rad = 40, full = cell * N + gap * (N - 1) + pad * 2;
      var canvas = el('canvas', { width: full, height: full }), ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f5f1ee'; ctx.fillRect(0, 0, full, full);
      return Promise.all(sheetStates.map(function (st, i) {
        return new Promise(function (resolve, reject) {
          var url = URL.createObjectURL(new Blob([CG.compose(st, { size: cell })], { type: 'image/svg+xml' })), img = new Image();
          img.onload = function () {
            var x = pad + (i % N) * (cell + gap), y = pad + Math.floor(i / N) * (cell + gap);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(x + rad, y); ctx.arcTo(x + cell, y, x + cell, y + cell, rad); ctx.arcTo(x + cell, y + cell, x, y + cell, rad);
            ctx.arcTo(x, y + cell, x, y, rad); ctx.arcTo(x, y, x + cell, y, rad); ctx.closePath(); ctx.clip();
            ctx.drawImage(img, x, y, cell, cell);
            ctx.restore();
            URL.revokeObjectURL(url); resolve();
          };
          img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('svg')); };
          img.src = url;
        });
      })).then(function () {
        return new Promise(function (resolve, reject) { canvas.toBlob(function (bl) { if (bl) resolve(bl); else reject(new Error('png')); }, 'image/png'); });
      });
    };
    $('btn-sheet').onclick = function () { drawSheet(); $sdlg.showModal(); };
    $('sheet-again').onclick = drawSheet;
    $('sheet-save').onclick = function () {
      $sstat.textContent = '저장 중…';
      sheetPng().then(function (blob) {
        return fetch('/api/sample?name=random-3x3-' + stamp() + '.png', { method: 'POST', body: blob }).then(function (r) { return r.json(); });
      }).then(function (j) { $sstat.textContent = j.error ? j.error : j.saved + ' 에 저장했습니다.'; },
        function () { $sstat.textContent = '저장하지 못했습니다.'; });
    };

    // 빌드가 끝나면 새 파츠 데이터로 다시 연다 (지금 캐릭터는 주소의 조합 코드로 유지된다)
    try {
      var es = new EventSource('/api/events');
      es.onmessage = function (m) {
        var msg = JSON.parse(m.data);
        if (msg.type !== 'built') return;
        if (msg.ok) { try { sessionStorage.setItem('cg-built', JSON.stringify(msg)); } catch (e) { /* 무시 */ } location.reload(); }
        else showBuild(msg);
      };
    } catch (e) { /* 자동 새로고침 없이 버튼만 쓴다 */ }
    setupItemEditor();
    try {
      var prev = sessionStorage.getItem('cg-built');
      if (prev) { showBuild(JSON.parse(prev)); sessionStorage.removeItem('cg-built'); }
    } catch (e) { /* 무시 */ }
  }

  var initial = decodeURIComponent(window.location.hash.replace(/^#/, ''));
  // 주소에 조합 코드가 없으면 처음부터 랜덤 캐릭터로 시작한다
  commit(initial.indexOf(':') > 0 ? CG.decode(initial) : CG.randomState(CG.defaultState(), locks, null, real, masc));
})();
