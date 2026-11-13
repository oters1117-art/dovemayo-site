/* 화면: 미리보기, 랜덤, 고정, 수동 선택, 저장 */
(function () {
  'use strict';

  var HISTORY_MAX = 100;

  var state = CG.defaultState();
  // 얼굴형(둥근형)과 피부색(기본)은 고정한 채 시작한다 (고정 버튼을 풀면 랜덤에 포함된다)
  // 악세사리(안경 제외)도 '없음'으로 고정한 채 시작한다
  var locks = { face: true, skinColor: true, acc: true, earring: true, facewear: true };
  var history = [];
  var cursor = -1;
  var controls = {}; // key -> 화면 갱신 함수

  var $ = function (id) { return document.getElementById(id); };
  // start.bat 로 띄운 로컬 서버에서 열었는지 (파일 열기·빌드·항목 편집은 서버가 있어야 된다).
  // 홈페이지에 올린 것도 http 로 열리므로 주소가 이 컴퓨터일 때만 켠다
  var SERVER = location.protocol.indexOf('http') === 0 && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
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
    flip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18" stroke-dasharray="2.5 3"/><path d="M8.5 7 3.5 17h5z"/><path d="M15.5 7l5 10h-5z" fill="currentColor"/></svg>'
  };
  function iconButton(cls, icon, label, title) {
    var b = el('button', { type: 'button', class: cls + ' tool', 'aria-label': label, title: title || label });
    b.innerHTML = ICON[icon];
    return b;
  }
  // 좌우 반전: 좌우가 다른 그림(가르마, 한쪽 머리, 점 등)을 뒤집는다. 좌우가 같은 파츠에서는 꺼져 있다
  function flipButton(cat) {
    var b = iconButton('flip', 'flip', cat.name + ' 좌우 반전', '좌우 반전');
    b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', function () {
      var next = JSON.parse(JSON.stringify(state));
      next.flip = next.flip || {};
      if (next.flip[cat.key]) delete next.flip[cat.key]; else next.flip[cat.key] = true;
      commit(next);
    });
    return b;
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
    b.addEventListener('click', function () { commit(CG.randomOne(state, key)); });
    return b;
  }

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

  function buildPartRow(cat) {
    var list = CG.parts[cat.key];
    var row = el('div', { class: 'row' });
    var select = el('select', { 'aria-label': cat.name });
    // _parts.json 의 group 이 있으면 그 이름으로 묶어 보여 준다 (순서는 목록 그대로)
    var box = select, boxName = null;
    list.forEach(function (p) {
      if ((p.group || null) !== boxName) {
        boxName = p.group || null;
        box = boxName ? select.appendChild(el('optgroup', { label: boxName })) : select;
      }
      box.appendChild(el('option', { value: p.id }, p.name));
    });
    select.addEventListener('change', function () { set(cat.key, select.value); });

    function step(d) {
      var i = 0;
      for (var n = 0; n < list.length; n++) if (list[n].id === state[cat.key]) i = n;
      set(cat.key, list[(i + d + list.length) % list.length].id);
    }
    var prev = el('button', { type: 'button', class: 'step', 'aria-label': cat.name + ' 이전' }, '‹');
    var next = el('button', { type: 'button', class: 'step', 'aria-label': cat.name + ' 다음' }, '›');
    prev.addEventListener('click', function () { step(-1); });
    next.addEventListener('click', function () { step(1); });

    row.appendChild(el('span', { class: 'name' }, cat.name));
    row.appendChild(prev);
    row.appendChild(select);
    row.appendChild(next);
    var tools = el('span', { class: 'tools' });
    var flip = CG.FLIP_KEYS.indexOf(cat.key) >= 0 ? flipButton(cat) : null;
    tools.appendChild(flip || el('span', { class: 'tool-gap' }));
    tools.appendChild(diceButton(cat.key));
    tools.appendChild(lockButton(cat.key));
    if (SERVER) tools.appendChild(fileButton(cat));
    row.appendChild(tools);

    controls[cat.key] = function () {
      select.value = state[cat.key];
      if (flip) {
        var can = CG.canFlip(state, cat.key);
        // 좌우가 같은 파츠에서는 흐리게만 보이고, 켠 상태는 그대로 남는다
        flip.className = 'flip tool' + (can ? '' : ' idle');
        flip.setAttribute('aria-pressed', state.flip && state.flip[cat.key] ? 'true' : 'false');
      }
    };
    return row;
  }

  // ---------- 색 줄 ----------
  function buildColorRow(slot) {
    var list = CG.palettes[slot.palette];
    var wrap = el('div', { class: 'color-row' });
    var head = el('div', { class: 'color-head' });
    var picked = el('span', { class: 'picked' });
    head.appendChild(el('span', { class: 'name' }, slot.name));
    head.appendChild(picked);
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

    wrap.appendChild(head);
    wrap.appendChild(box);

    controls[slot.key] = function () {
      list.forEach(function (c, i) {
        var on = c.id === state[slot.key];
        buttons[i].setAttribute('aria-pressed', on ? 'true' : 'false');
        if (on) picked.textContent = c.name;
      });
    };
    return wrap;
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

  function saveSvg() {
    var svg = CG.compose(state, { size: CG.SIZE });
    download('character-' + stamp() + '.svg', new Blob([svg], { type: 'image/svg+xml' }));
    say('SVG로 저장했습니다.');
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

  function applyCode() {
    var text = $code.value.trim().replace(/^#/, '');
    if (text.indexOf(':') < 0) { say('조합 코드 형식이 아닙니다.'); return; }
    commit(CG.decode(text));
    say('조합 코드를 적용했습니다.');
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
      sec = el('section', { class: 'group' });
      sec.appendChild(el('h2', null, block.group.name));
      $groups.appendChild(sec);
      lastGroup = block.group;
    }
    if (block.sub) sec.appendChild(el('h3', null, block.sub.name));
    sec.appendChild(rows);
  });

  $('btn-random').addEventListener('click', function () { commit(CG.randomState(state, locks)); });
  $('btn-prev').addEventListener('click', function () { travel(-1); });
  $('btn-next').addEventListener('click', function () { travel(1); });
  $('btn-copy-image').addEventListener('click', copyImage);
  $('ico-random').addEventListener('click', function () { commit(CG.randomState(state, locks)); });
  $('ico-prev').addEventListener('click', function () { travel(-1); });
  $('ico-copy').addEventListener('click', copyImage);
  // 자랑하기: 자랑 게시판으로 가서 한 줄 적고 올린다 (조합 코드를 주소로 넘긴다)
  function showOff() { location.href = 'https://dovemayo.com/character/show/#new=' + encodeURIComponent(CG.encode(state)); }
  $('btn-show').addEventListener('click', showOff);
  $('ico-show').addEventListener('click', showOff);
  $('btn-png').addEventListener('click', savePng);
  $('btn-svg').addEventListener('click', saveSvg);
  $('btn-copy').addEventListener('click', copyCode);
  $('btn-apply').addEventListener('click', applyCode);
  $code.addEventListener('keydown', function (e) { if (e.key === 'Enter') applyCode(); });

  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if (e.key === ' ' && tag !== 'button') { e.preventDefault(); commit(CG.randomState(state, locks)); }
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
    // 4×4 샘플: 고정한 항목은 그대로 두고 16명을 뽑아 한 장으로 보여 준다. 저장하면 samples 폴더에 PNG 로 남는다
    var sheetStates = [], $sdlg = $('sheet-dialog'), $sgrid = $('sheet-grid'), $sstat = $('sheet-status');
    var drawSheet = function () {
      sheetStates = [];
      $sgrid.textContent = '';
      $sstat.textContent = '';
      for (var i = 0; i < 16; i++) sheetCell(i);
    };
    // 한 칸: 얼굴을 누르면 불러오고, 왼쪽 위 버튼은 그 칸만 다시 뽑는다
    var sheetCell = function (i) {
      var cell = el('div', { class: 'sheet-cell' });
      var face = el('button', { type: 'button', class: 'sheet-face', 'aria-label': '샘플 ' + (i + 1) + ' 불러오기' });
      var again = iconButton('sheet-re', 'random', '샘플 ' + (i + 1) + ' 다시 뽑기', '이 칸만 다시 뽑기');
      var roll = function () { sheetStates[i] = CG.randomState(state, locks); face.innerHTML = CG.compose(sheetStates[i]); };
      roll();
      face.onclick = function () { commit(sheetStates[i]); $sdlg.close(); };
      again.onclick = roll;
      cell.appendChild(face); cell.appendChild(again);
      $sgrid.appendChild(cell);
    };
    var sheetPng = function () {
      // 둥근 카드 16장: 칸 480, 사이 20, 바깥 여백 38, 모서리 35 (전체 2056px)
      var cell = 480, gap = 20, pad = 38, rad = 35, full = cell * 4 + gap * 3 + pad * 2;
      var canvas = el('canvas', { width: full, height: full }), ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f5f1ee'; ctx.fillRect(0, 0, full, full);
      return Promise.all(sheetStates.map(function (st, i) {
        return new Promise(function (resolve, reject) {
          var url = URL.createObjectURL(new Blob([CG.compose(st, { size: cell })], { type: 'image/svg+xml' })), img = new Image();
          img.onload = function () {
            var x = pad + (i % 4) * (cell + gap), y = pad + Math.floor(i / 4) * (cell + gap);
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
        return fetch('/api/sample?name=random-4x4-' + stamp() + '.png', { method: 'POST', body: blob }).then(function (r) { return r.json(); });
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
  commit(initial.indexOf(':') > 0 ? CG.decode(initial) : CG.defaultState());
})();
