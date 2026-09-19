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


## 보스 확장 로컬 테스트 (실사이트 미배포)

`python scripts/preview-server.py --port 4174`

- 테스트: http://127.0.0.1:4174/
- 방향키 또는 컨트롤러 카드로 시작. 게임 중 `0`: 다음 보스, `9`: 특수 음식, `8`: 적.
- 테스트 키는 localhost / 127.0.0.1에서만 동작합니다.
- 보스 순서는 매 판 무작위이며 120 / 210 / 300 / 390초에 등장합니다.
- 뇌는 첫 강한 공격에 알이 되고, 9초 안에 다시 공격하지 않으면 돌아옵니다.
- 왕과 성을 포함해 네 보스를 마무리하면 케이크가 등장합니다.
- 다이너마이트는 몸으로 운반할 수 있으며 적/카드 근처에서 부착됩니다. 폭발 전 벗어나세요.
- `node --test tests/*.test.mjs`, `node tests/boss-long-run.mjs`, `python tests/analytics_test.py`

### 개인 통계

http://127.0.0.1:4174/admin 에서 로그인합니다. 비밀번호는 `.sites-runtime/admin-password.txt`에 자동 생성됩니다. 방문·플레이 기록은 `.sites-runtime/analytics.sqlite3`에 저장됩니다. 두 파일은 Git에 포함되지 않습니다.

관리 API는 로그인 쿠키를 검사하고 로컬 서버는 127.0.0.1에서만 받습니다. 링크를 숨기는 것만으로 보호하지 않습니다. 홈페이지에는 관리 링크를 표시하지 않습니다.

**현재는 로컬 테스트 기록만 집계합니다.** 기존 정적 Sites 배포에는 Python 서버가 포함되지 않습니다. 실제 사이트 통계 적용 때는 인증된 관리 API와 영속 데이터베이스를 배포 환경에 연결해야 합니다. 게임 파일만 공개 배포해서는 통계가 수집되지 않습니다.

방문자는 브라우저 쿠키 단위로 중복 제거되며, 시크릿 창이나 쿠키 삭제는 새 방문자입니다. 게임 중 15초 간격으로 생존 시간과 화면 활성 시간을 따로 기록합니다. 클라이언트 통계는 공인 랭킹이나 부정행위 검증용이 아닙니다.
