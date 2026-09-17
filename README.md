# dovemayo

둘기마요의 링크 홈페이지와 이모지 스네이크 게임. https://dovemayo.com/

## 로컬 실행

`python -m http.server 4173 --directory dist`

http://localhost:4173 에서 확인합니다. 별도 설치나 서버 데이터베이스가 필요 없는 정적 사이트입니다.

- 홈페이지: `dist/index.html`
- 스타일: `dist/style.css` (수정 후 `node scripts/sync-style.mjs` 실행)
- 게임 화면/입력: `dist/snake.mjs`
- 게임 규칙: `dist/snake-engine.mjs`
- 음악 발판: `dist/music-pads.mjs`
- 효과음: `dist/foley.mjs`

CSS와 작은 제목 폰트는 첫 화면 지연을 줄이도록 HTML에 포함합니다. 게임 모듈은 modulepreload로 미리 요청합니다. 원본 PNG와 무손실 WebP를 함께 보관합니다. 음악은 재생할 때 불러옵니다.

## 검증

`node --test tests/snake.test.mjs tests/music-pads.test.mjs tests/touch-steering.test.mjs`

## 배포 및 권리

현재 사이트는 Sites에서 호스팅합니다. 이 GitHub 저장소에 올리는 것만으로 자동 배포되지는 않습니다.

공개 저장소는 열람을 위한 것으로, 작품·폰트·음악 등의 재사용 허가를 의미하지 않습니다. 외부 이모지와 효과음의 출처 및 라이선스는 `dist/emoji/LICENSE.txt`, `dist/audio/CREDITS.txt`를 확인하세요.
