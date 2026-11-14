/* 색 팔레트. w 는 랜덤에서 뽑힐 비중(기본 1). */
(function () {
  'use strict';

  // 헤어: 실제 염색 색상 기준 32색
  CG.addPalette('hair', [
    // 내추럴
    { id: 'black', name: '흑발', hex: '#2b2627', group: '내추럴', w: 3 },
    { id: 'blueblack', name: '블루블랙', hex: '#232836', group: '내추럴', w: 3 },
    { id: 'darkbrown', name: '다크브라운', hex: '#3e2f2a', group: '내추럴', w: 3 },
    { id: 'choco', name: '초코브라운', hex: '#54392e', group: '내추럴', w: 3 },
    { id: 'softbrown', name: '내추럴브라운', hex: '#5d4e48', group: '내추럴', w: 3, isDefault: true },
    { id: 'milkbrown', name: '밀크브라운', hex: '#9a7a62', group: '내추럴', w: 3 },
    // 브라운 염색
    { id: 'ashbrown', name: '애쉬브라운', hex: '#7a6a62', group: '브라운 염색', w: 2 },
    { id: 'khakibrown', name: '카키브라운', hex: '#6e6248', group: '브라운 염색', w: 2 },
    { id: 'orangebrown', name: '오렌지브라운', hex: '#a05a32', group: '브라운 염색', w: 2 },
    { id: 'redbrown', name: '레드브라운', hex: '#7c3a30', group: '브라운 염색', w: 2 },
    { id: 'pinkbrown', name: '핑크브라운', hex: '#a8736f', group: '브라운 염색', w: 2 },
    { id: 'burgundy', name: '버건디', hex: '#5e2030', group: '브라운 염색', w: 2 },
    // 블론드·탈색
    { id: 'honey', name: '허니블론드', hex: '#d9a956', group: '블론드·탈색', w: 1.5 },
    { id: 'beige', name: '베이지블론드', hex: '#dcc39a', group: '블론드·탈색', w: 1.5 },
    { id: 'ashblonde', name: '애쉬블론드', hex: '#c9bca6', group: '블론드·탈색', w: 1.5 },
    { id: 'platinum', name: '플래티넘', hex: '#ece3cf', group: '블론드·탈색', w: 1.5 },
    { id: 'silverash', name: '실버애쉬', hex: '#c3c6cc', group: '블론드·탈색', w: 1.5 },
    { id: 'ashgray', name: '애쉬그레이', hex: '#8e9299', group: '블론드·탈색', w: 1.5 },
    { id: 'white', name: '화이트', hex: '#f3f1ee', group: '블론드·탈색', w: 1.5 },
    // 레드·핑크
    { id: 'cherry', name: '체리레드', hex: '#b3202e', group: '레드·핑크' },
    { id: 'coral', name: '코랄오렌지', hex: '#ef7d4f', group: '레드·핑크' },
    { id: 'rosegold', name: '로즈골드', hex: '#e0a391', group: '레드·핑크' },
    { id: 'babypink', name: '베이비핑크', hex: '#f6b9c9', group: '레드·핑크' },
    { id: 'hotpink', name: '핫핑크', hex: '#e8457e', group: '레드·핑크' },
    // 퍼플·블루
    { id: 'lavender', name: '라벤더애쉬', hex: '#b3a6cf', group: '퍼플·블루' },
    { id: 'ashpurple', name: '애쉬퍼플', hex: '#7c6790', group: '퍼플·블루' },
    { id: 'violet', name: '바이올렛', hex: '#6a3fa0', group: '퍼플·블루' },
    { id: 'navy', name: '네이비', hex: '#26365e', group: '퍼플·블루' },
    { id: 'ashblue', name: '애쉬블루', hex: '#6f87a6', group: '퍼플·블루' },
    { id: 'skyblue', name: '스카이블루', hex: '#8fc4ea', group: '퍼플·블루' },
    // 그린
    { id: 'mint', name: '민트', hex: '#9adcc8', group: '그린' },
    { id: 'khakigreen', name: '카키그린', hex: '#5d6b47', group: '그린' }
  ]);

  CG.addPalette('eye', [
    { id: 'black', name: '검정', hex: '#2a2422', w: 2 },
    { id: 'darkbrown', name: '다크브라운', hex: '#4a3128', w: 2 },
    { id: 'brown', name: '브라운', hex: '#7e5647', w: 2, isDefault: true },
    { id: 'hazel', name: '헤이즐', hex: '#9a7a45' },
    { id: 'amber', name: '호박색', hex: '#c98a2b' },
    { id: 'gold', name: '금색', hex: '#d9b23c' },
    { id: 'red', name: '빨강', hex: '#b8323a' },
    { id: 'pink', name: '핑크', hex: '#d9668f' },
    { id: 'purple', name: '보라', hex: '#7a52b3' },
    { id: 'blue', name: '블루', hex: '#3d6fc4' },
    { id: 'sky', name: '하늘색', hex: '#5fa8dc' },
    { id: 'teal', name: '청록', hex: '#2f9c99' },
    { id: 'green', name: '녹색', hex: '#4c9a55' },
    { id: 'gray', name: '회색', hex: '#7d858f' }
  ]);

  // 오드아이: 한쪽 눈의 색. '없음'이 기본이고, 고정을 풀고 랜덤을 돌리면 절반쯤은 '없음'이 나온다
  (function () {
    var total = 0, list = CG.palettes.eye.map(function (c) { total += c.w == null ? 1 : c.w; return { id: c.id, name: c.name, hex: c.hex, w: c.w }; });
    CG.addPalette('odd', [{ id: 'none', name: '없음', hex: '', w: total, isDefault: true }].concat(list));
  })();


  // 피부: 지금 쓰던 색이 기본이고 비중이 가장 높다. 밝은 계열일수록 자주 나온다.
  // line 은 얼굴·몸 윤곽선 색. blush·lip·lid·nose 를 안 적으면 hex 와 line 에서 계산한다 (core.js 의 skinOf)
  CG.addPalette('skin', [
    { id: 'base', name: '기본', hex: '#fdeeea', line: '#b46352', blush: '#f3bfb8', lip: '#dc6450', lid: '#8b8284', nose: '#b98a88', group: '밝은', w: 8, isDefault: true },
    { id: 'porcelain', name: '포슬린', hex: '#fbf3f1', line: '#ad6158', group: '밝은', w: 3 },
    { id: 'peach', name: '피치', hex: '#fff0e6', line: '#b8674f', group: '밝은', w: 3 },
    { id: 'ivory', name: '아이보리', hex: '#fbf0e0', line: '#b0704f', group: '밝은', w: 3 },
    { id: 'rosy', name: '로지', hex: '#fde3e0', line: '#bd5f5a', group: '밝은', w: 2.5 },
    { id: 'lightbeige', name: '라이트 베이지', hex: '#f7e2d0', line: '#ad6449', group: '밝은', w: 2.5 },
    { id: 'beige', name: '내추럴 베이지', hex: '#efd2ba', line: '#a35c40', group: '중간', w: 1.2 },
    { id: 'honey', name: '허니', hex: '#e4bc98', line: '#97553a', group: '중간', w: 0.7 },
    { id: 'tan', name: '탠', hex: '#cf9b76', line: '#804630', group: '어두운', w: 0.5 },
    { id: 'brown', name: '브라운', hex: '#a7724f', line: '#5f3322', group: '어두운', w: 0.35 },
    { id: 'deep', name: '딥 브라운', hex: '#77503a', line: '#3b2116', group: '어두운', w: 0.25 }
  ]);

  // 악세사리 색: 채도를 낮춘 색 위주. pink·yellow 는 예전 조합 코드가 깨지지 않게 id 를 그대로 두고 색만 바꿨다
  CG.addPalette('acc', [
    { id: 'red', name: '빨강', hex: '#d8433b', isDefault: true, w: 2 },
    { id: 'burgundy', name: '버건디', hex: '#8e2f3a' },
    { id: 'pink', name: '더스티 핑크', hex: '#e4a9ae' },
    { id: 'babypink', name: '베이비 핑크', hex: '#f6d3d8' },
    { id: 'yellow', name: '버터', hex: '#f3dc9a' },
    { id: 'mustard', name: '머스터드', hex: '#d3a53f' },
    { id: 'beige', name: '베이지', hex: '#e2d2bd' },
    { id: 'brown', name: '브라운', hex: '#7a5a44' },
    { id: 'sage', name: '세이지', hex: '#a8b89a' },
    { id: 'khaki', name: '카키', hex: '#7d8259' },
    { id: 'skyblue', name: '스카이 블루', hex: '#a9c6e3' },
    { id: 'navy', name: '네이비', hex: '#2f3f6e' },
    { id: 'lavender', name: '라벤더', hex: '#b9a9d6' },
    { id: 'gold', name: '골드', hex: '#d4b06a' },
    { id: 'silver', name: '실버', hex: '#c9ccd2' },
    { id: 'white', name: '흰색', hex: '#f7f3ee', w: 1.5 },
    { id: 'gray', name: '그레이', hex: '#a7a4a6' },
    { id: 'black', name: '검정', hex: '#2b2627', w: 2 }
  ]);

  // hex 가 null 이면 배경 없이 투명
  CG.addPalette('bg', [
    { id: 'greige', name: '그레이지', hex: '#ada19f', isDefault: true },
    { id: 'cream', name: '크림', hex: '#efe6d8' },
    { id: 'dustypink', name: '더스티핑크', hex: '#e3c4c0' },
    { id: 'sage', name: '세이지', hex: '#b9c7b5' },
    { id: 'dustyblue', name: '더스티블루', hex: '#b3c2d1' },
    { id: 'lavender', name: '라벤더', hex: '#c9c0db' },
    { id: 'charcoal', name: '차콜', hex: '#4a4648' },
    { id: 'none', name: '없음 (투명)', hex: null, w: 0 }
  ]);
})();
