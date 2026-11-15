/* 조합 코드 → 그림 프롬프트 (로컬 테스트 전용).
 * app.js 가 localhost 에서만 이 파일을 불러온다. 공개판(dovemayo.com)에는 복사되지 않는다.
 * CG.prompt(state) → { en, ko }. 영어는 이미지 생성 AI용, 한국어는 사람이 읽거나 한국어를 받는 AI용.
 * 사전에 없는 파츠는 한국어 이름을 그대로 넣는다(새 파츠를 만들면 EN 에 한 줄 더하면 된다). */
(function (CG) {
  'use strict';
  var EN = {
    front: {
      gapshort: 'short full bangs with small gaps at the sides', gap: 'full bangs with small gaps at the sides', gaplong: 'long full bangs with small gaps at the sides',
      blunt: 'straight-cut blunt bangs', bluntlong: 'long straight-cut blunt bangs reaching the eyes',
      mushroomshort: 'short rounded mushroom bangs', mushroom: 'rounded mushroom bangs',
      choppyshort: 'short choppy bangs', choppy: 'choppy uneven bangs', zigzagshort: 'short zigzag (sawtooth) bangs', zigzag: 'zigzag (sawtooth) bangs',
      mbang: 'M-shaped bangs', mbanglong: 'long M-shaped bangs', tribang: 'triangle-pointed bangs',
      curly: 'curly bangs', curlylong: 'long curly bangs', eyecover2: 'long bangs covering both eyes', seethrough: 'thin see-through bangs',
      antenna: 'see-through bangs with two antenna strands', centerwisp: 'forehead showing with a few wisps in the middle', centerlock: 'forehead showing with one lock in the middle',
      parted: 'center-parted fringe', side73: '7:3 side part', curtain: 'curtain bangs', curtainlong: 'long curtain bangs',
      sidebang: 'side-swept bangs', sidebanglong: 'long side-swept bangs', diagonal: 'diagonally cut bangs', diagonallong: 'long diagonally cut bangs',
      sidecurveshort: 'short bangs curving to one side', sidecurve: 'bangs curving to one side', sidecurvelong: 'long bangs curving to one side',
      eyecover1: 'long bangs covering one eye', kkaennip: 'sleek side-swept bangs tucked to one side (Korean kkaennip style)', pinned: 'bangs pinned back to one side',
      braidbang: 'braided bangs', twostrand: 'two long strands framing the face', longcurlin: 'long face-framing bangs curling inward',
      himebang: 'hime-cut straight bangs', longwave: 'long wavy face-framing bangs', 'longwave-one': 'a long wavy face-framing strand on one side',
      allback: 'hair slicked back with no bangs, forehead fully showing', babyhair: 'hair slicked back with baby hairs on the forehead'
    },
    extra: {
      ahoge1: 'a small ahoge (stray hair strand) on top', ahoge2: 'a long ahoge (stray hair strand) on top', apple: 'an "apple" tuft tied up on top of the head',
      knot: 'a small half-up tie at the back', halfbun: 'a half-up bun', crownbraid: 'a crown braid around the head', buns: 'small buns on the sides of the head',
      sidetails: 'small side tails', sidetailslong: 'long side tails', pigtails: 'short pigtails',
      twinhighx: 'high twin tails', halftwin: 'half-up twin tails (two side-up)', ponyx: 'a high ponytail', flipends: 'flipped-out hair ends'
    },
    side: {
      sideburn: 'short sideburns', aegyo: 'thin wisps in front of the ears', jawshort: 'straight side locks to the jaw', jaw: 'straight side locks past the jaw',
      long: 'long straight side locks to the shoulders', chest: 'long straight side locks reaching the chest', xxlong: 'very long straight side locks reaching the waist',
      hime: 'hime-cut side locks', himelong: 'long hime-cut side locks', spike: 'spiky side locks', spikelong: 'long spiky side locks',
      curlin: 'side locks curling inward', curlinlong: 'long side locks curling inward', curl: 'side locks with curled ends', curllong: 'long side locks with curled ends',
      volumecurl: 'voluminous inward-curled side locks', volumecurllong: 'long voluminous inward-curled side locks', messyin: 'long messy inward-curled side locks',
      flipout: 'side locks flipping outward', flipoutlong: 'long side locks flipping outward',
      waveshort: 'short wavy side locks', wave: 'wavy side locks', wavelong: 'long wavy side locks', roll: 'vertical ringlet (drill) side curls',
      braid: 'braided side locks', braidlong: 'long braided side locks', braidtemple: 'a small braid at the temple', tied: 'side locks tied at the ends'
    },
    back: {
      none: 'short hair', pixie: 'a short pixie cut', pixielong: 'a pixie cut', spiky: 'short spiky hair', curlyshort: 'short curly hair', wolf: 'a wolf cut',
      earbob: 'an ear-length bob', chinbob: 'a chin-length bob', bob: 'a bob', longbob: 'a long bob to the shoulders', sharpbob: 'a sharp blunt-cut bob', tassel: 'a tassel cut',
      medium: 'straight shoulder-length hair', midlong: 'straight medium-long hair', long: 'long straight hair',
      chincurl: 'a short cut curling inward', curlin: 'medium hair curling inward', curlmid: 'long hair curling inward',
      flipshort: 'a short cut flipping outward', flipout: 'medium hair flipping outward',
      wavechin: 'short wavy hair', wavem: 'medium wavy hair', wavelongbob: 'long wavy hair', wavel: 'very long wavy hair',
      hippieshort: 'short hippie perm', hippie: 'hippie perm', waveperm: 'long water-wave perm', scurl: 'very long hair with big S-curls', curlyl: 'long voluminous curly hair',
      layered: 'layered medium hair', layeredlong: 'long layered hair', hush: 'a hush cut',
      ponyhighshort: 'a short high ponytail', ponyhigh: 'a long high ponytail', ponylow: 'a low ponytail', sidepony: 'a side ponytail', sideponylong: 'a long side ponytail',
      frontdrape: 'hair tied and draped over one shoulder', twinhigh: 'high twin tails', twinhighlong: 'long high twin tails',
      twinshort: 'short low twin tails', twin: 'low twin tails', twinlong: 'long low twin tails', pigtail: 'pigtails', drilltwin: 'drill (ringlet) twin tails',
      braid1: 'a single braid', 'braid-big-side': 'a thick side braid', braid2short: 'two short braids', braid2: 'two long braids', 'braid-ring': 'two braided loops',
      bun1: 'a bun on top of the head', bun_l: 'a big bun on top of the head', bun2: 'two buns', buntwin: 'buns with twin tails', lowbun: 'a low side bun', lowbuns: 'two low buns',
      clawup: 'hair twisted up with a claw clip'
    },
    eye: {
      round: 'round eyes', tsuri: 'upturned (tsurime) eyes', tare: 'droopy (tareme) eyes', jito: 'half-lidded unimpressed (jitome) eyes', almond: 'almond-shaped eyes',
      cat: 'cat-like eyes', sharp: 'long sharp eyes', deformed: 'big round chibi eyes', sleepy: 'sleepy eyes', slit: 'narrow slit eyes',
      smile: 'smiling crescent eyes', closed: 'closed eyes', fox: 'fox-like narrow eyes'
    },
    fold: { inner: 'inner double eyelids', outer: 'double eyelids' },
    lash: { up1: '1 upper lash', up3: '3 upper lashes', up5: '5 upper lashes', down1: '1 downward upper lash', down3: '3 downward upper lashes', down5: '5 downward upper lashes' },
    lowlash: { n3: '3 lower lashes', n5: '5 lower lashes', n7: '7 lower lashes' },
    iris: { big: 'large irises', small: 'small irises (sanpaku)' },
    pupil: {
      big: 'big pupils', small: 'small pupils', slit: 'vertical slit pupils', ring: 'ring-shaped irises', rinnegan: 'concentric ring irises', swirl: 'swirl irises',
      heart: 'heart-shaped pupils', star: 'star-shaped pupils', cross: 'cross-shaped pupils', blank: 'no pupils', dot: 'tiny dot eyes', octo: 'octopus-like pupils', goat: 'horizontal goat pupils'
    },
    hl: { one: 'one white highlight', two: 'two white highlights', pupil: 'white pupils' },
    face: { round: 'a round face', egg: 'an oval face', pointed: 'a pointed chin', chubby: 'chubby cheeks', heart: 'a heart-shaped face', baby: 'a baby face' },
    ear: { big: 'big ears', soft: 'slightly pointed ears', elf: 'pointed elf ears', cat: 'cat ears', fox: 'fox ears' },
    skinfx: { mole: 'a beauty mark under the eye', freckles: 'freckles' },
    makeup: { blush: 'pink blush on the cheeks', 'blush-nose': 'pink blush across the cheeks and nose' },
    around: { shadow: 'soft shadow under the eyes', aegyo: 'aegyo-sal (puffy under-eye)', darklight: 'light dark circles', darkdeep: 'deep dark circles' },
    lip: { light: 'a light lip tint' },
    brow: { flat: 'straight eyebrows', arch: 'arched eyebrows', down: 'drooping eyebrows', up: 'raised eyebrows', angled: 'angled eyebrows', thick: 'thick eyebrows',
      thin: 'thin eyebrows', short: 'short rounded eyebrows', frown: 'frowning eyebrows', danmuji: 'short thick oblong eyebrows' },
    mouth: { smile: 'a small smile', line: 'a straight-line mouth', frown: 'a sulky frown', cat: 'a cat-like ":3" mouth', pout: 'a pout', smirk: 'a one-sided smirk',
      wavy: 'a wavy flustered mouth', dot: 'a tiny dot mouth', o: 'a small open "o" mouth', open: 'an open-mouth smile', tri: 'a small triangle mouth',
      grin: 'a grin showing teeth', fang: 'a smile with one small fang', frontteeth: 'a smile showing front teeth', shark: 'a grin with sharp shark teeth', partedLips: 'slightly parted lips' },
    acc: { pin: 'a hair pin', snap2: 'two snap hair clips', clawclip: 'a claw clip', hairroll: 'a hair roller in the bangs', band: 'a headband', bow: 'a bow headband', bigbow: 'a big bow at the back of the head' },
    glasses: { round: 'round thin-frame glasses', 'round-horn': 'round horn-rimmed glasses', square: 'square thin-frame glasses', 'square-horn': 'square horn-rimmed glasses',
      boston: 'boston-style glasses', 'boston-horn': 'boston-style horn-rimmed glasses', eyepatch: 'an eyepatch' },
    earring: { 'stud-mini': 'tiny stud earrings', stud: 'stud earrings', 'stud-mini-2': 'two tiny stud earrings on each ear', 'stud-big1-mini2': 'a stud and two tiny studs on each ear',
      hoop: 'hoop earrings', drop: 'drop earrings', bar: 'long bar earrings', cuff: 'ear cuffs' },
    facewear: { mask: 'a white face mask', maskblack: 'a black face mask', bandage: 'an adhesive bandage on the cheek', bandagenose: 'an adhesive bandage across the nose' }
  };
  var EN_COLOR = {
    hair: { black: 'black', blueblack: 'blue-black', darkbrown: 'dark brown', choco: 'chocolate brown', softbrown: 'natural brown', milkbrown: 'milk-tea brown', ashbrown: 'ash brown',
      khakibrown: 'khaki brown', orangebrown: 'orange brown', redbrown: 'red-brown', pinkbrown: 'pink-brown', burgundy: 'burgundy', honey: 'honey blonde', beige: 'beige blonde',
      ashblonde: 'ash blonde', platinum: 'platinum blonde', silverash: 'silver ash', ashgray: 'ash gray', white: 'white', lavsilver: 'lavender-tinted silver', butter: 'butter blonde',
      cherry: 'cherry red', coral: 'coral orange', rosegold: 'rose gold', babypink: 'baby pink', hotpink: 'hot pink', ashpink: 'ash pink', peach: 'peach', lilacpink: 'lilac pink',
      lavender: 'lavender ash', ashpurple: 'ash purple', violet: 'violet', navy: 'navy', ashblue: 'ash blue', skyblue: 'sky blue', midnight: 'midnight purple', bluegray: 'blue-gray',
      aqua: 'aqua', mint: 'mint', pistachio: 'pistachio mint green', sagegreen: 'sage green', teal: 'teal', khakigreen: 'khaki green' },
    eye: { coral: 'coral', olive: 'olive green', wine: 'wine red', magenta: 'magenta', lavender: 'lavender', indigo: 'indigo', navy: 'navy', ice: 'ice blue', aqua: 'aqua', emerald: 'emerald green', mint: 'mint', silver: 'silver', black: 'black', darkbrown: 'dark brown', brown: 'brown', hazel: 'hazel', amber: 'amber', gold: 'gold', red: 'red', pink: 'pink', purple: 'purple', blue: 'blue', sky: 'sky blue', teal: 'teal', green: 'green', gray: 'gray' },
    skin: { base: 'fair', porcelain: 'porcelain', peach: 'peachy', ivory: 'ivory', rosy: 'rosy', lightbeige: 'light beige', beige: 'natural beige', honey: 'honey', tan: 'tan', brown: 'brown', deep: 'deep brown' },
    acc: { red: 'red', burgundy: 'burgundy', pink: 'dusty pink', babypink: 'baby pink', yellow: 'butter yellow', mustard: 'mustard', beige: 'beige', brown: 'brown', sage: 'sage',
      khaki: 'khaki', skyblue: 'sky blue', navy: 'navy', lavender: 'lavender', gold: 'gold', silver: 'silver', white: 'white', gray: 'gray', black: 'black' },
    bg: { greige: 'greige', cream: 'cream', dustypink: 'dusty pink', sage: 'sage green', dustyblue: 'dusty blue', lavender: 'lavender', charcoal: 'charcoal gray' }
  };
  EN_COLOR.odd = EN_COLOR.eye;

  // NovelAI (Anime V4/V4.5) 용 Danbooru 태그. 쉼표로 잇고 밑줄 대신 띄어쓰기. 빈 문자열은 태그 없음
  var NAI = {
    front: {
      gapshort: 'short bangs, blunt bangs', gap: 'blunt bangs', gaplong: 'blunt bangs, long bangs', blunt: 'blunt bangs', bluntlong: 'blunt bangs, long bangs',
      mushroomshort: 'short bangs, blunt bangs, rounded bangs', mushroom: 'blunt bangs, rounded bangs', choppyshort: 'short bangs, choppy bangs', choppy: 'choppy bangs',
      zigzagshort: 'short bangs, jagged bangs', zigzag: 'jagged bangs', mbang: 'bangs, hair intakes', mbanglong: 'long bangs, hair intakes', tribang: 'pointy bangs',
      curly: 'curly bangs', curlylong: 'long bangs, curly bangs', eyecover2: 'hair over eyes', seethrough: 'see-through bangs', antenna: 'see-through bangs, antenna hair',
      centerwisp: 'forehead, single hair strand', centerlock: 'forehead, single hair strand', parted: 'parted bangs, forehead', side73: 'side part, asymmetrical bangs',
      curtain: 'curtained hair', curtainlong: 'curtained hair, long bangs', sidebang: 'swept bangs', sidebanglong: 'swept bangs, long bangs',
      diagonal: 'asymmetrical bangs', diagonallong: 'asymmetrical bangs, long bangs', sidecurveshort: 'swept bangs, short bangs', sidecurve: 'swept bangs', sidecurvelong: 'swept bangs, long bangs',
      eyecover1: 'hair over one eye', kkaennip: 'swept bangs, hair over one eye', pinned: 'swept bangs, hairclip', braidbang: 'braided bangs', twostrand: 'long sidelocks, parted bangs',
      longcurlin: 'long bangs, parted bangs', himebang: 'blunt bangs, hime cut', longwave: 'long bangs, wavy hair', 'longwave-one': 'single sidelock, wavy hair',
      allback: 'hair slicked back, forehead, no bangs', babyhair: 'hair slicked back, forehead, no bangs'
    },
    extra: {
      ahoge1: 'ahoge', ahoge2: 'ahoge, huge ahoge', apple: 'topknot', knot: 'half updo', halfbun: 'half updo, single hair bun', crownbraid: 'crown braid', buns: 'double bun',
      sidetails: 'two side up', sidetailslong: 'two side up', pigtails: 'short twintails', twinhighx: 'twintails, high twintails', halftwin: 'two side up',
      ponyx: 'high ponytail', flipends: 'flipped hair'
    },
    side: {
      sideburn: 'sideburns', aegyo: 'sidelocks', jawshort: 'sidelocks', jaw: 'sidelocks', long: 'long sidelocks', chest: 'long sidelocks', xxlong: 'long sidelocks',
      hime: 'hime cut, sidelocks', himelong: 'hime cut, long sidelocks', spike: 'spiked hair, sidelocks', spikelong: 'spiked hair, long sidelocks',
      curlin: 'sidelocks', curlinlong: 'long sidelocks', curl: 'curled sidelocks', curllong: 'long sidelocks, curled sidelocks', volumecurl: 'sidelocks', volumecurllong: 'long sidelocks',
      messyin: 'messy hair, long sidelocks', flipout: 'flipped hair, sidelocks', flipoutlong: 'flipped hair, long sidelocks',
      waveshort: 'wavy hair, sidelocks', wave: 'wavy hair, sidelocks', wavelong: 'wavy hair, long sidelocks', roll: 'drill sidelocks, ringlets',
      braid: 'braided sidelock', braidlong: 'braided sidelock, long sidelocks', braidtemple: 'french braid', tied: 'tied sidelocks, sidelocks'
    },
    back: {
      none: 'short hair', pixie: 'very short hair, pixie cut', pixielong: 'short hair, pixie cut', spiky: 'short hair, spiked hair', curlyshort: 'short hair, curly hair', wolf: 'medium hair, wolf cut',
      earbob: 'short hair, bob cut', chinbob: 'short hair, bob cut', bob: 'bob cut', longbob: 'medium hair, bob cut', sharpbob: 'short hair, bob cut, straight hair', tassel: 'short hair, bob cut, straight hair',
      medium: 'medium hair, straight hair', midlong: 'long hair, straight hair', long: 'long hair, straight hair', chincurl: 'short hair', curlin: 'medium hair', curlmid: 'long hair',
      flipshort: 'short hair, flipped hair', flipout: 'medium hair, flipped hair', wavechin: 'short hair, wavy hair', wavem: 'medium hair, wavy hair', wavelongbob: 'long hair, wavy hair', wavel: 'very long hair, wavy hair',
      hippieshort: 'medium hair, curly hair', hippie: 'long hair, curly hair', waveperm: 'long hair, wavy hair', scurl: 'very long hair, wavy hair', curlyl: 'long hair, curly hair, big hair',
      layered: 'medium hair, layered hair', layeredlong: 'long hair, layered hair', hush: 'medium hair, layered hair',
      ponyhighshort: 'high ponytail, short ponytail', ponyhigh: 'high ponytail, long hair', ponylow: 'low ponytail', sidepony: 'side ponytail', sideponylong: 'side ponytail, long hair',
      frontdrape: 'hair over shoulder, low ponytail', twinhigh: 'twintails', twinhighlong: 'twintails, long hair', twinshort: 'low twintails, short twintails', twin: 'low twintails', twinlong: 'low twintails, long hair',
      pigtail: 'short twintails', drilltwin: 'twin drills', braid1: 'single braid', 'braid-big-side': 'side braid, hair over shoulder', braid2short: 'twin braids', braid2: 'twin braids, long hair', 'braid-ring': 'braided hair rings',
      bun1: 'single hair bun', bun_l: 'single hair bun, big hair bun', bun2: 'double bun', buntwin: 'double bun, twintails', lowbun: 'low side bun', lowbuns: 'double bun, low bun', clawup: 'hair up, hair clip'
    },
    eye: { round: 'round eyes', tsuri: 'tsurime', tare: 'tareme', jito: 'jitome', almond: '', cat: 'tsurime, slit pupils', sharp: 'sharp eyes, tsurime', deformed: 'large eyes',
      sleepy: 'half-closed eyes', slit: 'narrowed eyes', smile: '^ ^', closed: 'closed eyes', fox: 'narrowed eyes, tsurime' },
    fold: { inner: '', outer: '' },
    lash: { up1: '', up3: 'eyelashes', up5: 'long eyelashes', down1: '', down3: 'eyelashes', down5: 'long eyelashes' },
    lowlash: { n3: 'lower eyelashes', n5: 'lower eyelashes', n7: 'lower eyelashes' },
    iris: { big: '', small: 'sanpaku, small pupils' },
    pupil: { big: '', small: 'small pupils', slit: 'slit pupils', ring: 'ringed eyes', rinnegan: 'ringed eyes', swirl: 'spiral eyes', heart: 'heart-shaped pupils', star: 'star-shaped pupils',
      cross: '+ +', blank: 'empty eyes', dot: 'solid circle eyes', octo: 'symbol-shaped pupils', goat: 'horizontal pupils' },
    hl: { one: 'eye reflection', two: 'eye reflection', pupil: 'white pupils' },
    face: { round: 'round face', egg: '', pointed: 'pointy chin', chubby: 'chubby', heart: '', baby: 'round face, baby face' },
    ear: { big: 'big ears', soft: 'pointy ears', elf: 'pointy ears, elf', cat: 'cat ears, animal ears', fox: 'fox ears, animal ears' },
    skinfx: { mole: 'mole under eye', freckles: 'freckles' },
    makeup: { blush: 'blush', 'blush-nose': 'blush, nose blush' },
    around: { shadow: 'eyeshadow', aegyo: 'eyebags', darklight: 'bags under eyes', darkdeep: 'bags under eyes, dark circles' },
    lip: { light: 'lips' },
    brow: { flat: 'straight eyebrows', arch: '', down: 'raised inner eyebrows', up: 'v-shaped eyebrows', angled: '', thick: 'thick eyebrows', thin: 'thin eyebrows', short: 'short eyebrows', frown: 'furrowed brow', danmuji: 'thick eyebrows, short eyebrows' },
    mouth: { smile: 'smile, closed mouth', line: 'expressionless, closed mouth', frown: 'frown', cat: ':3', pout: 'pout', smirk: 'smirk', wavy: 'wavy mouth', dot: ':o', o: ':o', open: 'smile, open mouth',
      tri: 'triangle mouth', grin: 'grin', fang: 'smile, fang', frontteeth: 'buck teeth', shark: 'sharp teeth, grin', partedLips: 'parted lips' },
    acc: { pin: 'hairclip', snap2: 'hairclip, x hair ornament', clawclip: 'hair clip', hairroll: 'hair rollers', band: 'hairband', bow: 'hairband, hair bow', bigbow: 'hair bow, large bow' },
    glasses: { round: 'glasses, round eyewear', 'round-horn': 'glasses, round eyewear, black-framed eyewear', square: 'glasses, rectangular eyewear', 'square-horn': 'glasses, rectangular eyewear, black-framed eyewear',
      boston: 'glasses', 'boston-horn': 'glasses, black-framed eyewear', eyepatch: 'eyepatch' },
    earring: { 'stud-mini': 'stud earrings', stud: 'stud earrings', 'stud-mini-2': 'stud earrings, ear piercing', 'stud-big1-mini2': 'stud earrings, ear piercing', hoop: 'hoop earrings', drop: 'earrings', bar: 'earrings', cuff: 'earcuff' },
    facewear: { mask: 'mouth mask, white mask', maskblack: 'mouth mask, black mask', bandage: 'bandaid on cheek', bandagenose: 'bandaid on nose' }
  };
  // 색 → Danbooru 색 태그 (머리는 '... hair', 눈은 '... eyes' 를 붙인다)
  var NAI_COLOR = {
    hair: { black: 'black', blueblack: 'black', darkbrown: 'brown', choco: 'brown', softbrown: 'brown', milkbrown: 'light brown', ashbrown: 'brown', khakibrown: 'brown', orangebrown: 'orange',
      redbrown: 'brown, red', pinkbrown: 'light brown', burgundy: 'red', honey: 'blonde', beige: 'blonde', ashblonde: 'blonde', platinum: 'blonde', silverash: 'grey', ashgray: 'grey', white: 'white',
      lavsilver: 'grey, light purple', butter: 'blonde', cherry: 'red', coral: 'orange', rosegold: 'pink', babypink: 'pink', hotpink: 'pink', ashpink: 'pink', peach: 'orange', lilacpink: 'pink',
      lavender: 'light purple', ashpurple: 'purple', violet: 'purple', navy: 'dark blue', ashblue: 'blue', skyblue: 'light blue', midnight: 'purple', bluegray: 'grey, blue', aqua: 'aqua',
      mint: 'aqua', pistachio: 'light green', sagegreen: 'green', teal: 'aqua', khakigreen: 'green' },
    eye: { coral: 'orange', olive: 'green', wine: 'red', magenta: 'pink', lavender: 'purple', indigo: 'blue', navy: 'blue', ice: 'light blue', aqua: 'aqua', emerald: 'green', mint: 'aqua', silver: 'grey', black: 'black', darkbrown: 'brown', brown: 'brown', hazel: 'brown', amber: 'orange', gold: 'yellow', red: 'red', pink: 'pink', purple: 'purple', blue: 'blue', sky: 'light blue', teal: 'aqua', green: 'green', gray: 'grey' },
    skin: { base: '', porcelain: 'pale skin', peach: '', ivory: '', rosy: '', lightbeige: '', beige: '', honey: 'tan', tan: 'tan, dark-skinned female', brown: 'dark skin, dark-skinned female', deep: 'very dark skin, dark-skinned female' },
    acc: { red: 'red', burgundy: 'red', pink: 'pink', babypink: 'pink', yellow: 'yellow', mustard: 'yellow', beige: 'brown', brown: 'brown', sage: 'green', khaki: 'green', skyblue: 'blue', navy: 'blue',
      lavender: 'purple', gold: 'gold', silver: 'silver', white: 'white', gray: 'grey', black: 'black' }
  };
  // 2026-11-15 추가 파츠
  function add(dict, key, o) { dict[key] = dict[key] || {}; for (var k in o) dict[key][k] = o[k]; }
  add(EN, 'front', { 'center-blunt-s': 'short narrow blunt bangs only in the center', 'center-blunt': 'narrow blunt bangs only in the center', 'center-blunt-l': 'long narrow blunt bangs only in the center' });
  add(NAI, 'front', { 'center-blunt-s': 'blunt bangs, short bangs', 'center-blunt': 'blunt bangs', 'center-blunt-l': 'blunt bangs, long bangs' });
  add(EN, 'side', { 'curl-in-one': 'a single inward-curled side lock' });
  add(EN, 'extra', { stray: 'stray flyaway strands by the face', 'stray-line': 'stray flyaway strands on top of the head', 'sidetails-mini': 'tiny twin tails' });
  add(EN, 'back', { 'frontdrape-loose': 'hair loosely tied and draped over one shoulder', 'braid-loose-side': 'a loose side braid over one shoulder',
    'twin-big-s': 'short fluffy twin tails', 'twin-big': 'fluffy twin tails', 'twin-big-l': 'big fluffy twin tails', 'spiky-l': 'spiky hair' });
  add(EN, 'ear', { 'cat-anger': 'cat ears flattened back in anger', hamster: 'small round hamster ears', bear: 'round bear ears', rabbit: 'long rabbit ears' });
  add(NAI, 'ear', { 'cat-anger': 'cat ears, animal ears, ears down', hamster: 'hamster ears, animal ears', bear: 'bear ears, animal ears', rabbit: 'rabbit ears, animal ears' });
  add(EN, 'mouth', { 'smile-l': 'a big open-mouthed smile', tsk: 'a small displeased "tsk" mouth' });
  add(NAI, 'side', { 'curl-in-one': 'sidelocks, curled sidelocks' });
  add(NAI, 'extra', { stray: 'messy hair, hair strand', 'stray-line': 'messy hair, flyaway hair', 'sidetails-mini': 'short twintails, two side up' });
  add(NAI, 'back', { 'frontdrape-loose': 'hair over shoulder, low ponytail, loose hair', 'braid-loose-side': 'side braid, hair over shoulder, loose braid',
    'twin-big-s': 'short twintails, fluffy hair', 'twin-big': 'twintails, fluffy hair', 'twin-big-l': 'twintails, fluffy hair, big hair', 'spiky-l': 'medium hair, spiked hair' });
  add(NAI, 'mouth', { 'smile-l': 'laughing, open mouth, big smile', tsk: 'tsk, closed mouth, annoyed' });
  // 굵게 그린 눈썹: 원래 눈썹 + 굵게
  ['flat', 'arch', 'down', 'up', 'angled', 'thick', 'thin', 'short', 'frown', 'danmuji'].forEach(function (id) {
    EN.brow[id + '-bold'] = (EN.brow[id] || id + ' eyebrows') + ' (drawn bold)';
    NAI.brow[id + '-bold'] = /thick/.test(NAI.brow[id] || '') || id === 'thin' ? NAI.brow[id] : (NAI.brow[id] ? NAI.brow[id] + ', ' : '') + 'thick eyebrows';
  });

  var LOWLINE_EN = { on: 'lower eyeliner', tail: 'eyeliner that dips down from the outer corner', wing: 'a short eyeliner line extending out from the outer corner',
    inner: 'a short eyeliner line at the inner corner', winglow: 'outer-corner eyeliner plus a separate lower eyeliner', innerlow: 'inner-corner eyeliner joined to a lower eyeliner',
    full: 'eyes fully outlined with eyeliner' };
  EN.lash = EN.lash || {}; EN.lash.down1 = '1 upper lash at the outer corner pointing down';

  // 'brown, red' + ' hair' → 'brown hair, red hair'
  function suffix(tags, word) { return tags ? tags.split(', ').map(function (t) { return t + ' ' + word; }).join(', ') : ''; }
  function nai(key, state) {
    var p = part(key, state);
    if (!p) return '';
    var t = (NAI[key] || {})[p.id];
    return t == null ? '' : t;
  }

  function part(key, state) {
    var list = CG.parts[key] || [], id = state[key];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function color(slot, state) {
    var s = CG.colorSlots.filter(function (c) { return c.key === slot; })[0], list = CG.palettes[s.palette] || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === state[slot]) return { id: list[i].id, ko: list[i].name, en: (EN_COLOR[s.palette] || {})[list[i].id] || list[i].name, hex: list[i].hex };
    // 커스텀 색: 가장 가까운 팔레트 색의 이름(영어)과 태그(NovelAI)를 빌려 쓰고, 색상 코드는 그대로
    if (!CG.isCustom(state[slot])) return null;
    var hex = '#' + state[slot].slice(1), best = null, bd = 1e9, a = rgb(hex);
    list.forEach(function (c) { if (!c.hex) return; var b = rgb(c.hex), d = Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2); if (d < bd) { bd = d; best = c; } });
    return { id: best.id, ko: '커스텀', en: (EN_COLOR[s.palette] || {})[best.id] || best.name, hex: hex };
  }
  function rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  var NONE = { none: 1, normal: 1 };
  function has(key, state) { return state[key] && !NONE[state[key]]; }
  // 영어 / 한국어 한 조각. 한쪽만·반전 표시를 붙인다
  function piece(key, state, lang) {
    var p = part(key, state);
    if (!p) return '';
    var t = lang === 'en' ? ((EN[key] || {})[p.id] || p.name) : p.name;
    var only = state.only && state.only[key], flip = state.flip && state.flip[key];
    if (only) t += lang === 'en' ? (only === 'l' ? ' (only on the viewer\'s left side)' : ' (only on the viewer\'s right side)') : (only === 'l' ? ' (화면 왼쪽만)' : ' (화면 오른쪽만)');
    else if (flip) t += lang === 'en' ? ' (mirrored left-right)' : ' (좌우 반전)';
    return t;
  }
  function join(arr) { return arr.filter(Boolean).join(', '); }

  CG.prompt = function (state) {
    state = CG.normalize(state);
    var hair = color('hairColor', state), eye = color('eyeColor', state), odd = state.oddColor !== 'none' ? color('oddColor', state) : null;
    var skin = color('skinColor', state), accC = color('accColor', state), bg = color('bgColor', state);
    var c = function (x) { return x ? x.en + ' (' + x.hex + ')' : ''; };
    var ck = function (x) { return x ? x.ko + ' (' + x.hex + ')' : ''; };
    var hairKeys = ['back', 'front', 'side', 'extra'].filter(function (k) { return k === 'back' || has(k, state); });
    var accKeys = ['acc', 'glasses', 'earring', 'facewear'].filter(function (k) { return has(k, state); });
    var tweak = { eyeGap: { wide: 'set slightly wide apart', narrow: 'set slightly close together' }, eyeY: { up: 'set slightly higher', down: 'set slightly lower' }, eyeSize: { big: 'slightly larger', small: 'slightly smaller' },
      eyeTilt: { up: 'with slightly upturned outer corners', down: 'with slightly drooping outer corners' } };
    var tweakKo = { eyeGap: { wide: '눈 간격 조금 멀게', narrow: '눈 간격 조금 가깝게' }, eyeY: { up: '눈 조금 위로', down: '눈 조금 아래로' }, eyeSize: { big: '눈 조금 크게', small: '눈 조금 작게' },
      eyeTilt: { up: '눈꼬리 조금 올라감', down: '눈꼬리 조금 처짐' } };
    var oddSide = state.flip && state.flip.oddColor;

    // ---------- English ----------
    var en = [];
    en.push('Hair: ' + c(hair) + '. ' + join(hairKeys.map(function (k) { return piece(k, state, 'en'); })) + '.');
    var eyes = [piece('eye', state, 'en'), eye ? c(eye) + ' irises' : '', has('fold', state) && piece('fold', state, 'en'), has('iris', state) && piece('iris', state, 'en'),
      state.pupil !== 'basic' && piece('pupil', state, 'en'), has('hl', state) && piece('hl', state, 'en'), has('lash', state) && piece('lash', state, 'en'), has('lowlash', state) && piece('lowlash', state, 'en'),
      LOWLINE_EN[state.lowline]];
    ['eyeGap', 'eyeY', 'eyeSize', 'eyeTilt'].forEach(function (k) { if (tweak[k][state[k]]) eyes.push(tweak[k][state[k]]); });
    en.push('Eyes: ' + join(eyes) + '.' + (odd ? ' Heterochromia: the eye on the viewer\'s ' + (oddSide ? 'left' : 'right') + ' is ' + c(odd) + '.' : ''));
    var face = [piece('face', state, 'en'), skin ? c(skin) + ' skin' : '', has('ear', state) && piece('ear', state, 'en'), piece('brow', state, 'en'), piece('mouth', state, 'en'),
      ({ down:'mouth set slightly lower', up: 'mouth set slightly higher' })[state.mouthY],
      has('makeup', state) && piece('makeup', state, 'en'), has('lip', state) && piece('lip', state, 'en'), has('around', state) && piece('around', state, 'en'), has('skinfx', state) && piece('skinfx', state, 'en')];
    en.push('Face: ' + join(face) + '.');
    if (accKeys.length) en.push('Accessories: ' + join(accKeys.map(function (k) { return piece(k, state, 'en'); })) + (accC && (has('acc', state) || has('earring', state)) ? '; accessory color ' + c(accC) : '') + '.');

    // ---------- 한국어 ----------
    var ko = [];
    var catName = function (k) { return CG.categories.filter(function (x) { return x.key === k; })[0].name; };
    ko.push('머리: ' + ck(hair) + '. ' + join(hairKeys.map(function (k) { return catName(k) + ' ' + piece(k, state, 'ko'); })) + '.');
    var eyesKo = [piece('eye', state, 'ko'), eye ? '눈동자 ' + ck(eye) : '', has('fold', state) && piece('fold', state, 'ko'), has('iris', state) && piece('iris', state, 'ko'),
      state.pupil !== 'basic' && '동공 ' + piece('pupil', state, 'ko'), has('hl', state) && '하이라이트 ' + piece('hl', state, 'ko'), has('lash', state) && '속눈썹 ' + piece('lash', state, 'ko'),
      has('lowlash', state) && '아래 속눈썹 ' + piece('lowlash', state, 'ko'), has('lowline', state) && '아이라인 ' + piece('lowline', state, 'ko')];
    ['eyeGap', 'eyeY', 'eyeSize', 'eyeTilt'].forEach(function (k) { if (tweakKo[k][state[k]]) eyesKo.push(tweakKo[k][state[k]]); });
    ko.push('눈: ' + join(eyesKo) + '.' + (odd ? ' 오드아이: 화면 ' + (oddSide ? '왼쪽' : '오른쪽') + ' 눈은 ' + ck(odd) + '.' : ''));
    var faceKo = [piece('face', state, 'ko'), skin ? '피부 ' + ck(skin) : '', has('ear', state) && piece('ear', state, 'ko'), '눈썹 ' + piece('brow', state, 'ko'), '입 ' + piece('mouth', state, 'ko'),
      ({ down: '입 조금 아래로', up: '입 조금 위로' })[state.mouthY], has('makeup', state) && piece('makeup', state, 'ko'), has('lip', state) && '립 ' + piece('lip', state, 'ko'),
      has('around', state) && piece('around', state, 'ko'), has('skinfx', state) && piece('skinfx', state, 'ko')];
    ko.push('얼굴: ' + join(faceKo) + '.');
    if (accKeys.length) ko.push('악세사리: ' + join(accKeys.map(function (k) { return piece(k, state, 'ko'); })) + (accC && (has('acc', state) || has('earring', state)) ? ' / 악세사리 색 ' + ck(accC) : '') + '.');

    // ---------- NovelAI (Danbooru 태그) ----------
    // 순서: 머리색·길이·모양 → 눈 → 얼굴 → 악세사리. 앞쪽 태그가 더 세게 먹는다
    var nc = function (pal, x) { return x ? (NAI_COLOR[pal] || {})[x.id] || '' : ''; };
    var tags = [];
    tags.push(suffix(nc('hair', hair), 'hair'));
    ['back', 'front', 'side', 'extra'].forEach(function (k) { if (k === 'back' || has(k, state)) tags.push(nai(k, state)); });
    if (['front', 'side', 'extra', 'back'].some(function (k) { return state.only && state.only[k]; })) tags.push('asymmetrical hair');
    if (odd && odd.id !== state.eyeColor) tags.push('heterochromia', suffix(nc('eye', eye), 'eyes'), suffix(nc('eye', odd), 'eyes'));
    else tags.push(suffix(nc('eye', eye), 'eyes'));
    ['eye', 'iris', 'pupil', 'hl', 'lash', 'lowlash', 'fold'].forEach(function (k) { if (has(k, state)) tags.push(nai(k, state)); });
    if (has('lowline', state)) tags.push(state.lowline === 'full' || state.lowline === 'innerlow' ? 'eyeliner, thick eyeliner' : 'eyeliner');
    if (state.eyeSize === 'big') tags.push('large eyes');
    ['face', 'ear'].forEach(function (k) { if (has(k, state)) tags.push(nai(k, state)); });
    tags.push(nc('skin', skin));
    ['brow', 'mouth', 'makeup', 'lip', 'around', 'skinfx'].forEach(function (k) { if (has(k, state)) tags.push(nai(k, state)); });
    ['acc', 'glasses', 'earring', 'facewear'].forEach(function (k) { if (has(k, state)) tags.push(nai(k, state)); });
    // 색은 물건 이름에 붙인다 ('red hair ornament' 는 머리색으로 번지기 쉽다)
    var accNoun = { pin: 'hairclip', snap2: 'hairclip', clawclip: 'hair clip', hairroll: 'hair rollers', band: 'hairband', bow: 'bow', bigbow: 'bow' }[state.acc];
    if (accC && accNoun) tags.push(nc('acc', accC).split(', ')[0] + ' ' + accNoun);
    // 겹치는 태그는 한 번만
    var seen = {}, naiTags = [];
    tags.join(', ').split(', ').forEach(function (t) { t = t.trim(); if (t && !seen[t]) { seen[t] = 1; naiTags.push(t); } });

    return { en: en.join('\n'), ko: ko.join('\n'), nai: naiTags.join(', ') };
  };
})(window.CG);
