/* 조합 코드 → 그림 프롬프트 (로컬 테스트 전용).
 * app.js 가 localhost 에서만 이 파일을 불러온다. 공개판(dovemayo.com)에는 복사되지 않는다.
 * CG.prompt(state) → { en, ko }. 영어는 이미지 생성 AI용, 한국어는 사람이 읽거나 한국어를 받는 AI용.
 * 사전에 없는 파츠는 한국어 이름을 그대로 넣는다(새 파츠를 만들면 EN 에 한 줄 더하면 된다). */
(function (CG) {
  'use strict';
  var EN = {
    front: {
      'full-gap-s': 'short full bangs with small gaps at the sides', 'full-gap-m': 'full bangs with small gaps at the sides', 'full-gap-l': 'long full bangs with small gaps at the sides',
      'blunt-m': 'straight-cut blunt bangs', 'blunt-l': 'long straight-cut blunt bangs reaching the eyes',
      'mushroom-s': 'short rounded mushroom bangs', 'mushroom-m': 'rounded mushroom bangs',
      'choppy-s': 'short choppy bangs', 'choppy-m': 'choppy uneven bangs', 'zigzag-s': 'short zigzag (sawtooth) bangs', 'zigzag-m': 'zigzag (sawtooth) bangs',
      'm-shape-m': 'M-shaped bangs', 'm-shape-l': 'long M-shaped bangs', triangle: 'triangle-pointed bangs',
      'curly-m': 'curly bangs', 'curly-l': 'long curly bangs', 'eyecover-both': 'long bangs covering both eyes', seethrough: 'thin see-through bangs',
      antenna: 'see-through bangs with two antenna strands', 'center-wisp': 'forehead showing with a few wisps in the middle', 'center-lock': 'forehead showing with one lock in the middle',
      'parted-center': 'center-parted fringe', 'parted-73': '7:3 side part', 'curtain-m': 'curtain bangs', 'curtain-l': 'long curtain bangs',
      'side-swept-m': 'side-swept bangs', 'side-swept-l': 'long side-swept bangs', 'diagonal-m': 'diagonally cut bangs', 'diagonal-l': 'long diagonally cut bangs',
      'side-curve-s': 'short bangs curving to one side', 'side-curve-m': 'bangs curving to one side', 'side-curve-l': 'long bangs curving to one side',
      'eyecover-one': 'long bangs covering one eye', kkaennip: 'sleek side-swept bangs tucked to one side (Korean kkaennip style)', pinned: 'bangs pinned back to one side',
      'braid-bang': 'braided bangs', 'long-twostrand': 'two long strands framing the face', 'long-curl-in': 'long face-framing bangs curling inward',
      'long-hime': 'hime-cut straight bangs', 'long-wave': 'long wavy face-framing bangs', 'long-wave-one': 'a long wavy face-framing strand on one side',
      allback: 'hair slicked back with no bangs, forehead fully showing', 'allback-babyhair': 'hair slicked back with baby hairs on the forehead'
    },
    extra: {
      'ahoge-s': 'a small ahoge (stray hair strand) on top', 'ahoge-l': 'a long ahoge (stray hair strand) on top', apple: 'an "apple" tuft tied up on top of the head',
      'halfup-knot': 'a small half-up tie at the back', 'halfup-bun': 'a half-up bun', 'braid-crown': 'a crown braid around the head', 'bun-two': 'small buns on the sides of the head',
      'tail-side-m': 'small side tails', 'tail-side-l': 'long side tails', pigtail: 'short pigtails',
      'twin-high-top': 'high twin tails', 'twin-half': 'half-up twin tails (two side-up)', 'pony-high-top': 'a high ponytail', 'flip-ends': 'flipped-out hair ends'
    },
    side: {
      sideburn: 'short sideburns', aegyo: 'thin wisps in front of the ears', 'straight-ss': 'straight side locks to the jaw', 'straight-s': 'straight side locks past the jaw',
      'straight-m': 'long straight side locks to the shoulders', 'straight-l': 'long straight side locks reaching the chest', 'straight-ll': 'very long straight side locks reaching the waist',
      'hime-m': 'hime-cut side locks', 'hime-l': 'long hime-cut side locks', 'spike-m': 'spiky side locks', 'spike-l': 'long spiky side locks',
      'curl-in-m': 'side locks curling inward', 'curl-in-l': 'long side locks curling inward', 'curl-end-m': 'side locks with curled ends', 'curl-end-l': 'long side locks with curled ends',
      'curl-in-volume-m': 'voluminous inward-curled side locks', 'curl-in-volume-l': 'long voluminous inward-curled side locks', 'curl-in-messy-l': 'long messy inward-curled side locks',
      'flip-out-m': 'side locks flipping outward', 'flip-out-l': 'long side locks flipping outward',
      'wave-s': 'short wavy side locks', 'wave-m': 'wavy side locks', 'wave-l': 'long wavy side locks', roll: 'vertical ringlet (drill) side curls',
      'braid-m': 'braided side locks', 'braid-l': 'long braided side locks', 'braid-temple': 'a small braid at the temple', tied: 'side locks tied at the ends'
    },
    back: {
      none: 'short hair', 'pixie-s': 'a short pixie cut', 'pixie-m': 'a pixie cut', 'spiky-m': 'short spiky hair', 'curly-s': 'short curly hair', wolf: 'a wolf cut',
      'bob-s': 'an ear-length bob', 'bob-m': 'a chin-length bob', 'bob-l': 'a bob', 'bob-ll': 'a long bob to the shoulders', 'bob-sharp': 'a sharp blunt-cut bob', tassel: 'a tassel cut',
      'straight-s': 'straight shoulder-length hair', 'straight-m': 'straight medium-long hair', 'straight-l': 'long straight hair',
      'curl-in-s': 'a short cut curling inward', 'curl-in-m': 'medium hair curling inward', 'curl-in-l': 'long hair curling inward',
      'flip-out-s': 'a short cut flipping outward', 'flip-out-m': 'medium hair flipping outward',
      'wave-s': 'short wavy hair', 'wave-m': 'medium wavy hair', 'wave-l': 'long wavy hair', 'wave-ll': 'very long wavy hair',
      'hippie-s': 'short hippie perm', 'hippie-m': 'hippie perm', 'wave-perm-l': 'long water-wave perm', 's-curl-ll': 'very long hair with big S-curls', 'curly-volume-l': 'long voluminous curly hair',
      'layered-m': 'layered medium hair', 'layered-l': 'long layered hair', hush: 'a hush cut',
      'pony-high-s': 'a short high ponytail', 'pony-high-l': 'a long high ponytail', 'pony-low': 'a low ponytail', 'pony-side-m': 'a side ponytail', 'pony-side-l': 'a long side ponytail',
      'drape-front': 'hair tied and draped over one shoulder', 'twin-high-s': 'short high twin tails', 'twin-high-m': 'high twin tails', 'twin-high-l': 'long high twin tails', 'twin-high-ll': 'very long high twin tails',
      'twin-low-s': 'short low twin tails', 'twin-low-m': 'low twin tails', 'twin-low-l': 'long low twin tails', pigtail: 'pigtails', 'twin-drill': 'drill (ringlet) twin tails',
      'braid-one': 'a single braid', 'braid-side-big': 'a thick side braid', 'braid-two-s': 'two short braids', 'braid-two-l': 'two long braids', 'braid-ring': 'two braided loops',
      'bun-top-m': 'a bun on top of the head', 'bun-top-l': 'a big bun on top of the head', 'bun-two': 'two buns', 'bun-twin': 'buns with twin tails', 'bun-low': 'a low side bun', 'bun-low-two': 'two low buns',
      'updo-claw': 'hair twisted up with a claw clip'
    },
    eye: {
      round: 'round eyes', tsuri: 'upturned (tsurime) eyes', tare: 'droopy (tareme) eyes', jito: 'half-lidded unimpressed (jitome) eyes', almond: 'almond-shaped eyes',
      cat: 'cat-like eyes', sharp: 'long sharp eyes', deformed: 'big round chibi eyes', sleepy: 'sleepy eyes', smooth: 'soft gentle eyes', calm: 'calm composed eyes', slit: 'narrow slit eyes',
      smile: 'smiling crescent eyes', closed: 'closed eyes', fox: 'fox-like narrow eyes'
    },
    fold: { inner: 'inner double eyelids', outer: 'double eyelids' },
    lash: { up1: '1 upper lash', up3: '3 upper lashes', up5: '5 upper lashes', down1: '1 downward upper lash', down1c: '1 downward upper lash', down3: '3 downward upper lashes', down5: '5 downward upper lashes' },
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
    lip: { light: 'a light lip tint', deep: 'a deep red lip tint' },
    brow: { flat: 'straight eyebrows', arch: 'arched eyebrows', down: 'drooping eyebrows', up: 'raised eyebrows', angled: 'angled eyebrows', thick: 'thick eyebrows',
      thin: 'thin eyebrows', short: 'short rounded eyebrows', frown: 'frowning eyebrows', danmuji: 'short thick oblong eyebrows' },
    mouth: { smile: 'a small smile', line: 'a straight-line mouth', frown: 'a sulky frown', cat: 'a cat-like ":3" mouth', pout: 'a pout', smirk: 'a one-sided smirk',
      wavy: 'a wavy flustered mouth', dot: 'a tiny dot mouth', o: 'a small open "o" mouth', open: 'an open-mouth smile', tri: 'a small triangle mouth',
      grin: 'a grin showing teeth', fang: 'a smile with one small fang', frontteeth: 'a smile showing front teeth', shark: 'a grin with sharp shark teeth', ick: 'a disgusted grimace showing clenched teeth', partedLips: 'slightly parted lips' },
    acc: { pin: 'a hair pin', snap2: 'two snap hair clips', clawclip: 'a claw clip', hairroll: 'a hair roller in the bangs', band: 'a headband', bow: 'a bow headband', bigbow: 'a big bow at the back of the head' },
    glasses: { round: 'round thin-frame glasses', 'round-horn': 'round horn-rimmed glasses', square: 'square thin-frame glasses', 'square-horn': 'square horn-rimmed glasses',
      boston: 'boston-style glasses', 'boston-horn': 'boston-style horn-rimmed glasses', eyepatch: 'an eyepatch' },
    earring: { 'stud-mini': 'tiny stud earrings', stud: 'stud earrings', 'stud-mini-2': 'two tiny stud earrings on each ear', 'stud-big1-mini2': 'a stud and two tiny studs on each ear',
      hoop: 'hoop earrings', drop: 'drop earrings', bar: 'long bar earrings', cuff: 'ear cuffs' },
    facewear: { mask: 'a white face mask', maskblack: 'a black face mask', bandage: 'an adhesive bandage on the cheek', bandagenose: 'an adhesive bandage across the nose' },
    cloth: { tee: 'a crew-neck T-shirt', vneck: 'a V-neck T-shirt', turtleneck: 'a turtleneck sweater', hoodie: 'a hoodie with drawstrings', shirt: 'a collared button-up shirt',
      sailor: 'a sailor school uniform', offshoulder: 'an off-shoulder top with a ruffle', cami: 'a camisole with thin straps',
      ringer: 'a ringer T-shirt with a contrasting neckband', squareneck: 'a square-neck top', highneck: 'a mock-neck top', polo: 'a polo shirt',
      tanktop: 'a tank top', sleeveless: 'a sleeveless top', halter: 'a halter top tied behind the neck', halterneck: 'a high-neck halter top',
      'offshoulder-half': 'a one-shoulder top', 'sailor-mono': 'a sailor uniform with a same-color collar and contrasting stripes', 'shirt-lock': 'a fully buttoned collared shirt',
      'tee-l': 'a scoop-neck T-shirt', 'tee-ll': 'a wide-neck T-shirt showing the collarbones' },
    outer: { jacket: 'an open tailored jacket', coat: 'an open coat with wide lapels', field: 'an open field jacket with a chest pocket', padding: 'an open puffer jacket',
      denim: 'an open denim jacket', zipup: 'an open zip-up hoodie', cardigan: 'an open cardigan', vest: 'a knit vest', apron: 'an apron' },
    neck: { tie: 'a necktie', ribbon: 'a ribbon bow tie' }
  };
  var EN_COLOR = {
    cloth: { white: 'white', ivory: 'ivory', gray: 'gray', charcoal: 'charcoal', black: 'black', navy: 'navy', brown: 'brown', khaki: 'khaki', olive: 'olive', denim: 'denim blue', camel: 'camel', burgundy: 'burgundy', red: 'red', beige: 'beige', sky: 'sky blue', mint: 'mint', yellow: 'butter yellow', pink: 'pink', lavender: 'lavender' },
    outer: { white: 'white', ivory: 'ivory', gray: 'gray', charcoal: 'charcoal', black: 'black', navy: 'navy', brown: 'brown', khaki: 'khaki', olive: 'olive', denim: 'denim blue', camel: 'camel', burgundy: 'burgundy', red: 'red', beige: 'beige', sky: 'sky blue', mint: 'mint', yellow: 'butter yellow', pink: 'pink', lavender: 'lavender' },
    cloth2: { white: 'white', ivory: 'ivory', gray: 'gray', charcoal: 'charcoal', black: 'black', navy: 'navy', brown: 'brown', khaki: 'khaki', olive: 'olive', denim: 'denim blue', camel: 'camel', burgundy: 'burgundy', red: 'red', beige: 'beige', sky: 'sky blue', mint: 'mint', yellow: 'butter yellow', pink: 'pink', lavender: 'lavender' },
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
      'full-gap-s': 'short bangs, blunt bangs', 'full-gap-m': 'blunt bangs', 'full-gap-l': 'blunt bangs, long bangs', 'blunt-m': 'blunt bangs', 'blunt-l': 'blunt bangs, long bangs',
      'mushroom-s': 'short bangs, blunt bangs, rounded bangs', 'mushroom-m': 'blunt bangs, rounded bangs', 'choppy-s': 'short bangs, choppy bangs', 'choppy-m': 'choppy bangs',
      'zigzag-s': 'short bangs, jagged bangs', 'zigzag-m': 'jagged bangs', 'm-shape-m': 'bangs, hair intakes', 'm-shape-l': 'long bangs, hair intakes', triangle: 'pointy bangs',
      'curly-m': 'curly bangs', 'curly-l': 'long bangs, curly bangs', 'eyecover-both': 'hair over eyes', seethrough: 'see-through bangs', antenna: 'see-through bangs, antenna hair',
      'center-wisp': 'forehead, single hair strand', 'center-lock': 'forehead, single hair strand', 'parted-center': 'parted bangs, forehead', 'parted-73': 'side part, asymmetrical bangs',
      'curtain-m': 'curtained hair', 'curtain-l': 'curtained hair, long bangs', 'side-swept-m': 'swept bangs', 'side-swept-l': 'swept bangs, long bangs',
      'diagonal-m': 'asymmetrical bangs', 'diagonal-l': 'asymmetrical bangs, long bangs', 'side-curve-s': 'swept bangs, short bangs', 'side-curve-m': 'swept bangs', 'side-curve-l': 'swept bangs, long bangs',
      'eyecover-one': 'hair over one eye', kkaennip: 'swept bangs, hair over one eye', pinned: 'swept bangs, hairclip', 'braid-bang': 'braided bangs', 'long-twostrand': 'long sidelocks, parted bangs',
      'long-curl-in': 'long bangs, parted bangs', 'long-hime': 'blunt bangs, hime cut', 'long-wave': 'long bangs, wavy hair', 'long-wave-one': 'single sidelock, wavy hair',
      allback: 'hair slicked back, forehead, no bangs', 'allback-babyhair': 'hair slicked back, forehead, no bangs'
    },
    extra: {
      'ahoge-s': 'ahoge', 'ahoge-l': 'ahoge, huge ahoge', apple: 'topknot', 'halfup-knot': 'half updo', 'halfup-bun': 'half updo, single hair bun', 'braid-crown': 'crown braid', 'bun-two': 'double bun',
      'tail-side-m': 'two side up', 'tail-side-l': 'two side up', pigtail: 'short twintails', 'twin-high-top': 'twintails, high twintails', 'twin-half': 'two side up',
      'pony-high-top': 'high ponytail', 'flip-ends': 'flipped hair'
    },
    side: {
      sideburn: 'sideburns', aegyo: 'sidelocks', 'straight-ss': 'sidelocks', 'straight-s': 'sidelocks', 'straight-m': 'long sidelocks', 'straight-l': 'long sidelocks', 'straight-ll': 'long sidelocks',
      'hime-m': 'hime cut, sidelocks', 'hime-l': 'hime cut, long sidelocks', 'spike-m': 'spiked hair, sidelocks', 'spike-l': 'spiked hair, long sidelocks',
      'curl-in-m': 'sidelocks', 'curl-in-l': 'long sidelocks', 'curl-end-m': 'curled sidelocks', 'curl-end-l': 'long sidelocks, curled sidelocks', 'curl-in-volume-m': 'sidelocks', 'curl-in-volume-l': 'long sidelocks',
      'curl-in-messy-l': 'messy hair, long sidelocks', 'flip-out-m': 'flipped hair, sidelocks', 'flip-out-l': 'flipped hair, long sidelocks',
      'wave-s': 'wavy hair, sidelocks', 'wave-m': 'wavy hair, sidelocks', 'wave-l': 'wavy hair, long sidelocks', roll: 'drill sidelocks, ringlets',
      'braid-m': 'braided sidelock', 'braid-l': 'braided sidelock, long sidelocks', 'braid-temple': 'french braid', tied: 'tied sidelocks, sidelocks'
    },
    back: {
      none: 'short hair', 'pixie-s': 'very short hair, pixie cut', 'pixie-m': 'short hair, pixie cut', 'spiky-m': 'short hair, spiked hair', 'curly-s': 'short hair, curly hair', wolf: 'medium hair, wolf cut',
      'bob-s': 'short hair, bob cut', 'bob-m': 'short hair, bob cut', 'bob-l': 'bob cut', 'bob-ll': 'medium hair, bob cut', 'bob-sharp': 'short hair, bob cut, straight hair', tassel: 'short hair, bob cut, straight hair',
      'straight-s': 'medium hair, straight hair', 'straight-m': 'long hair, straight hair', 'straight-l': 'long hair, straight hair', 'curl-in-s': 'short hair', 'curl-in-m': 'medium hair', 'curl-in-l': 'long hair',
      'flip-out-s': 'short hair, flipped hair', 'flip-out-m': 'medium hair, flipped hair', 'wave-s': 'short hair, wavy hair', 'wave-m': 'medium hair, wavy hair', 'wave-l': 'long hair, wavy hair', 'wave-ll': 'very long hair, wavy hair',
      'hippie-s': 'medium hair, curly hair', 'hippie-m': 'long hair, curly hair', 'wave-perm-l': 'long hair, wavy hair', 's-curl-ll': 'very long hair, wavy hair', 'curly-volume-l': 'long hair, curly hair, big hair',
      'layered-m': 'medium hair, layered hair', 'layered-l': 'long hair, layered hair', hush: 'medium hair, layered hair',
      'pony-high-s': 'high ponytail, short ponytail', 'pony-high-l': 'high ponytail, long hair', 'pony-low': 'low ponytail', 'pony-side-m': 'side ponytail', 'pony-side-l': 'side ponytail, long hair',
      'drape-front': 'hair over shoulder, low ponytail', 'twin-high-s': 'twintails, short twintails', 'twin-high-m': 'twintails', 'twin-high-l': 'twintails, long hair', 'twin-high-ll': 'twintails, very long hair', 'twin-low-s': 'low twintails, short twintails', 'twin-low-m': 'low twintails', 'twin-low-l': 'low twintails, long hair',
      pigtail: 'short twintails', 'twin-drill': 'twin drills', 'braid-one': 'single braid', 'braid-side-big': 'side braid, hair over shoulder', 'braid-two-s': 'twin braids', 'braid-two-l': 'twin braids, long hair', 'braid-ring': 'braided hair rings',
      'bun-top-m': 'single hair bun', 'bun-top-l': 'single hair bun, big hair bun', 'bun-two': 'double bun', 'bun-twin': 'double bun, twintails', 'bun-low': 'low side bun', 'bun-low-two': 'double bun, low bun', 'updo-claw': 'hair up, hair clip'
    },
    eye: { round: 'round eyes', tsuri: 'tsurime', tare: 'tareme', jito: 'jitome', almond: '', cat: 'tsurime, slit pupils', sharp: 'sharp eyes, tsurime', deformed: 'large eyes',
      sleepy: 'half-closed eyes', smooth: '', calm: '', slit: 'narrowed eyes', smile: '^ ^', closed: 'closed eyes', fox: 'narrowed eyes, tsurime' },
    fold: { inner: '', outer: '' },
    lash: { up1: '', up3: 'eyelashes', up5: 'long eyelashes', down1: '', down1c: '', down3: 'eyelashes', down5: 'long eyelashes' },
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
    lip: { light: 'lips', deep: 'red lips, lipstick' },
    brow: { flat: 'straight eyebrows', arch: '', down: 'raised inner eyebrows', up: 'v-shaped eyebrows', angled: '', thick: 'thick eyebrows', thin: 'thin eyebrows', short: 'short eyebrows', frown: 'furrowed brow', danmuji: 'thick eyebrows, short eyebrows' },
    mouth: { smile: 'smile, closed mouth', line: 'expressionless, closed mouth', frown: 'frown', cat: ':3', pout: 'pout', smirk: 'smirk', wavy: 'wavy mouth', dot: ':o', o: ':o', open: 'smile, open mouth',
      tri: 'triangle mouth', grin: 'grin', fang: 'smile, fang', frontteeth: 'buck teeth', shark: 'sharp teeth, grin', ick: 'clenched teeth, disgust', partedLips: 'parted lips' },
    acc: { pin: 'hairclip', snap2: 'hairclip, x hair ornament', clawclip: 'hair clip', hairroll: 'hair rollers', band: 'hairband', bow: 'hairband, hair bow', bigbow: 'hair bow, large bow' },
    glasses: { round: 'glasses, round eyewear', 'round-horn': 'glasses, round eyewear, black-framed eyewear', square: 'glasses, rectangular eyewear', 'square-horn': 'glasses, rectangular eyewear, black-framed eyewear',
      boston: 'glasses', 'boston-horn': 'glasses, black-framed eyewear', eyepatch: 'eyepatch' },
    earring: { 'stud-mini': 'stud earrings', stud: 'stud earrings', 'stud-mini-2': 'stud earrings, ear piercing', 'stud-big1-mini2': 'stud earrings, ear piercing', hoop: 'hoop earrings', drop: 'earrings', bar: 'earrings', cuff: 'earcuff' },
    facewear: { mask: 'mouth mask, white mask', maskblack: 'mouth mask, black mask', bandage: 'bandaid on cheek', bandagenose: 'bandaid on nose' },
    cloth: { tee: 't-shirt', vneck: 'v-neck, t-shirt', turtleneck: 'turtleneck, sweater', hoodie: 'hoodie, drawstring', shirt: 'collared shirt',
      sailor: 'serafuku, sailor collar', offshoulder: 'off-shoulder shirt, bare shoulders', cami: 'camisole, bare shoulders',
      ringer: 't-shirt, ringer t-shirt', squareneck: 'square neckline', highneck: 'high collar, sweater', polo: 'polo shirt',
      tanktop: 'tank top', sleeveless: 'sleeveless shirt', halter: 'halterneck, bare shoulders', halterneck: 'halterneck, high collar, bare shoulders',
      'offshoulder-half': 'single bare shoulder, asymmetrical clothes', 'sailor-mono': 'serafuku, sailor collar', 'shirt-lock': 'collared shirt, buttoned',
      'tee-l': 't-shirt, collarbone', 'tee-ll': 't-shirt, collarbone, wide neckline' },
    outer: { jacket: 'open jacket, blazer', coat: 'open coat', field: 'open jacket, military jacket', padding: 'open jacket, puffer jacket', denim: 'open jacket, denim jacket',
      zipup: 'open hoodie, zipper', cardigan: 'open cardigan', vest: 'sweater vest', apron: 'apron' },
    neck: { tie: 'necktie', ribbon: 'neck ribbon' }
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
  // 2026-11-19 추가 색 (눈·악세사리·옷)
  add(EN_COLOR, 'eye', { crimson: 'crimson', rose: 'rose', peach: 'peach', orange: 'orange', lime: 'lime green', jade: 'jade green', forest: 'forest green', cyan: 'cyan', cobalt: 'cobalt blue', steel: 'steel blue', lilac: 'lilac', violet: 'violet', plum: 'plum', pale: 'pale whitish' });
  add(NAI_COLOR, 'eye', { crimson: 'red', rose: 'pink', peach: 'orange', orange: 'orange', lime: 'green', jade: 'green', forest: 'green', cyan: 'aqua', cobalt: 'blue', steel: 'blue', lilac: 'purple', violet: 'purple', plum: 'purple', pale: 'white' });
  add(EN_COLOR, 'acc', { coral: 'coral', peach: 'peach', orange: 'orange', lemon: 'lemon yellow', mint: 'mint', green: 'green', teal: 'teal', cobalt: 'cobalt blue', denim: 'denim blue', purple: 'purple', plum: 'plum', hotpink: 'hot pink', rosegold: 'rose gold', ivory: 'ivory', charcoal: 'charcoal' });
  add(NAI_COLOR, 'acc', { coral: 'orange', peach: 'orange', orange: 'orange', lemon: 'yellow', mint: 'aqua', green: 'green', teal: 'aqua', cobalt: 'blue', denim: 'blue', purple: 'purple', plum: 'purple', hotpink: 'pink', rosegold: 'pink', ivory: 'white', charcoal: 'grey' });
  ['cloth', 'outer', 'cloth2'].forEach(function (k) { add(EN_COLOR, k, { lightgray: 'light gray', chocolate: 'chocolate brown', wine: 'wine red', terracotta: 'terracotta', orange: 'orange', mustard: 'mustard', forest: 'forest green', teal: 'teal', cobalt: 'cobalt blue', purple: 'purple', cream: 'cream', peach: 'peach', coral: 'coral', lemon: 'lemon yellow', sage: 'sage green', babyblue: 'baby blue', lilac: 'lilac', dustypink: 'dusty pink' }); });
  // 2026-11-15 추가 파츠
  function add(dict, key, o) { dict[key] = dict[key] || {}; for (var k in o) dict[key][k] = o[k]; }
  add(EN, 'front', { 'center-blunt-s': 'short narrow blunt bangs only in the center', 'center-blunt-m': 'narrow blunt bangs only in the center', 'center-blunt-l': 'long narrow blunt bangs only in the center' });
  add(NAI, 'front', { 'center-blunt-s': 'blunt bangs, short bangs', 'center-blunt-m': 'blunt bangs', 'center-blunt-l': 'blunt bangs, long bangs' });
  add(EN, 'side', { 'curl-in-one': 'a single inward-curled side lock' });
  add(EN, 'extra', { 'stray-side': 'stray flyaway strands by the face', 'stray-top': 'stray flyaway strands on top of the head', 'twin-mini': 'tiny twin tails' });
  add(EN, 'back', { 'drape-front-loose': 'hair loosely tied and draped over one shoulder', 'braid-side-loose': 'a loose side braid over one shoulder',
    'twin-big-s': 'short fluffy twin tails', 'twin-big-m': 'fluffy twin tails', 'twin-big-l': 'big fluffy twin tails', 'spiky-l': 'spiky hair' });
  add(EN, 'ear', { 'cat-anger': 'cat ears flattened back in anger', hamster: 'small round hamster ears', bear: 'round bear ears', rabbit: 'long rabbit ears' });
  add(NAI, 'ear', { 'cat-anger': 'cat ears, animal ears, ears down', hamster: 'hamster ears, animal ears', bear: 'bear ears, animal ears', rabbit: 'rabbit ears, animal ears' });
  add(EN, 'mouth', { 'smile-l': 'a big open-mouthed smile', tsk: 'a small displeased "tsk" mouth' });
  add(NAI, 'side', { 'curl-in-one': 'sidelocks, curled sidelocks' });
  add(NAI, 'extra', { 'stray-side': 'messy hair, hair strand', 'stray-top': 'messy hair, flyaway hair', 'twin-mini': 'short twintails, two side up' });
  add(NAI, 'back', { 'drape-front-loose': 'hair over shoulder, low ponytail, loose hair', 'braid-side-loose': 'side braid, hair over shoulder, loose braid',
    'twin-big-s': 'short twintails, fluffy hair', 'twin-big-m': 'twintails, fluffy hair', 'twin-big-l': 'twintails, fluffy hair, big hair', 'spiky-l': 'medium hair, spiked hair' });
  add(NAI, 'mouth', { 'smile-l': 'laughing, open mouth, big smile', tsk: 'tsk, closed mouth, annoyed' });
  // 굵게 그린 눈썹: 원래 눈썹 + 굵게
  ['flat', 'arch', 'down', 'up', 'angled', 'thick', 'thin', 'short', 'frown', 'danmuji'].forEach(function (id) {
    EN.brow[id + '-bold'] = (EN.brow[id] || id + ' eyebrows') + ' (drawn bold)';
    NAI.brow[id + '-bold'] = /thick/.test(NAI.brow[id] || '') || id === 'thin' ? NAI.brow[id] : (NAI.brow[id] ? NAI.brow[id] + ', ' : '') + 'thick eyebrows';
  });

  var LOWLINE_EN = { on: 'lower eyeliner', tail: 'eyeliner continuing down from the outer corner along the lower lid',
    inner: 'eyeliner continuing down from the inner corner along the lower lid', winglow: 'outer-corner eyeliner plus a separate lower eyeliner', innerlow: 'inner-corner eyeliner joined to a lower eyeliner',
    full: 'eyes fully outlined with eyeliner' };
  EN.lash = EN.lash || {}; EN.lash.down1 = '1 lash at the outer corner pointing down'; EN.lash.down1c = '1 lash on the outer half of the lid pointing down'; EN.lash.down3 = '3 lashes from two-thirds along the lid to the outer corner, pointing down'; EN.lash.down5 = '5 lashes from two-thirds along the lid to the outer corner, pointing down';

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
    var clothC = color('clothColor', state), clothP = color('clothColor2', state), hasNeck = has('neck', state) && (part('cloth', state) || {}).neckAt;
    var outerC = color('outerColor', state);
    var showCloth = true;   // 공개판도 상의는 보인다 (외투·목 장식은 공개판에서 늘 없음)
    if (showCloth && (has('cloth', state) || has('outer', state))) en.push('Clothes: ' + join([has('cloth', state) && c(clothC) + ' ' + piece('cloth', state, 'en'),
      has('outer', state) && c(outerC) + ' ' + piece('outer', state, 'en') + (has('cloth', state) ? ' over it' : ''), hasNeck && c(clothP) + ' ' + piece('neck', state, 'en')]) + '.');
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
    if (showCloth && (has('cloth', state) || has('outer', state))) ko.push('옷: ' + join([has('cloth', state) && piece('cloth', state, 'ko') + ' ' + ck(clothC),
      has('outer', state) && '위에 ' + piece('outer', state, 'ko') + ' ' + ck(outerC), hasNeck && piece('neck', state, 'ko') + ' ' + ck(clothP)]) + '.');
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
    if (showCloth && has('cloth', state)) tags.push(nai('cloth', state));
    if (showCloth && has('outer', state)) tags.push(nai('outer', state));
    if (showCloth && hasNeck) tags.push(nai('neck', state));
    // 색은 물건 이름에 붙인다 ('red hair ornament' 는 머리색으로 번지기 쉽다)
    var accNoun = { pin: 'hairclip', snap2: 'hairclip', clawclip: 'hair clip', hairroll: 'hair rollers', band: 'hairband', bow: 'bow', bigbow: 'bow' }[state.acc];
    if (accC && accNoun) tags.push(nc('acc', accC).split(', ')[0] + ' ' + accNoun);
    // 겹치는 태그는 한 번만
    var seen = {}, naiTags = [];
    tags.join(', ').split(', ').forEach(function (t) { t = t.trim(); if (t && !seen[t]) { seen[t] = 1; naiTags.push(t); } });

    return { en: en.join('\n'), ko: ko.join('\n'), nai: naiTags.join(', ') };
  };
})(window.CG);
