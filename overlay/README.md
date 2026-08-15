# 솔랭 관전 오버레이

선수 솔로랭크를 롤 클라이언트로 **관전**하면서, 그 위에 중계 HUD 를 얹어 OBS 로 송출하기 위한
로컬 도구입니다. 팬페이지(`src/`)와는 별개로 돌아가며, 배포에 포함되지 않습니다.

```
관전 중인 롤 클라이언트
   └─ https://127.0.0.1:2999   (Live Client Data API)
        └─ proxy.mjs           (자체서명 인증서 우회 + CORS)
             └─ overlay.html   (OBS 브라우저 소스)
                  └─ OBS → 유튜브 → 팬페이지 /soloq 에 임베드
```

## 1. 오버레이 띄우기

```bash
node overlay/proxy.mjs
```

OBS → **소스 추가 → 브라우저**

| 항목 | 값 |
|---|---|
| URL | `http://127.0.0.1:3200/overlay.html` |
| 너비 / 높이 | `1920` / `1080` |
| 사용자 지정 CSS | 비우기 (OBS 기본값이 배경을 칠합니다) |

레이아웃은 1920×1080 기준으로 짜여 있고, 다른 크기를 넣으면 `--k` 배율로 통째로 늘어납니다.

게임 없이 화면만 보려면 `?mock=1` 을 붙이세요 — 가짜 데이터로 배치·아이콘·킬 피드를 확인할 수 있습니다.

```
http://127.0.0.1:3200/overlay.html?mock=1
```

## 2. 강조할 선수 지정

`config.js` 의 `TRACKED` 에 라이엇 ID 를 넣으면 그 선수 칸이 주황색으로 뜹니다.

```js
export const TRACKED = ['Zeka#KR1', 'Gumayusi#KR1'];
```

> ⚠️ **추측으로 넣지 마세요.** 계정이 틀리면 방송에 엉뚱한 일반인의 플레이가 "선수" 로 표시됩니다.
> 반드시 확인된 계정만 넣으세요.

## 3. 관전 시작하기

```bash
node overlay/spectate.mjs --list          # 지금 진행 중인 게임 목록
node overlay/spectate.mjs                 # 목록의 첫 게임을 관전
node overlay/spectate.mjs --index 3       # n 번째 게임
node overlay/spectate.mjs --riot-id 이름#KR1
node overlay/spectate.mjs --print         # 실행 안 하고 명령만 출력
```

키 없이 시작하려면 op.gg · deeplol 에서 소환사를 검색해 **관전하기** 를 눌러도 됩니다.
다만 그 버튼은 보통 윈도우용 `.bat` 을 내려줍니다.

### 이 PC 에서 실측한 것

- **관전 서버는 `kr.spectator.proxy.op.gg:80`** 입니다. op.gg 가 돌리는 관전 프록시이고,
  op.gg·deeplol 의 "관전하기" 버튼이 쓰는 것도 이것입니다.
  - `spectator(-consumer).kr.lol.riotgames.com` — **DNS 조차 안 잡힘**
  - `spectator.kr.lol.pvp.net:80` — DNS 는 잡히고 게임이 붙기까지 하지만,
    `ReplayDownloader: Fetch MetaData Phase` 에서 **오류도 없이 영원히 멈춤**.
    직접 HTTP 를 던지면 Cloudflare `error 1010` 이 돌아옴.
  - 제3자 서비스 의존이라는 점은 알고 쓸 것. `SPECTATOR_HOST` 환경변수로 바꿀 수 있습니다.
- 라이엇 클라이언트 설정(`clientconfig.rpg.riotgames.com`)을 보면
  `lol.kr.operational.spectator` 만 `enabled: true` 이고 **나머지 지역은 전부 false** 입니다.
  관전은 사실상 한국 서버 기능입니다.
- 게임 실행 파일: `/Applications/League of Legends.app/Contents/LoL/Game/LeagueofLegends.app/Contents/MacOS/LeagueofLegends`

### 왜 챌린저 사다리를 훑는가

"지금 게임 중인 아무나" 는 원래 `spectator-v5/featured-games` 한 방이면 되는데,
**이 키로는 403** 이 떨어집니다. 키가 죽은 게 아닙니다 — 같은 키로 다른 건 다 됩니다:

| 엔드포인트 | 결과 |
|---|---|
| `account-v1/by-riot-id` | 200 |
| `league-v4/challengerleagues` | 200 (puuid 포함) |
| `spectator-v5/active-games/by-summoner` | 200 / 404 (**권한 있음**) |
| `spectator-v5/featured-games` | **403** |
| `spectator-v4/featured-games` | 403 (v4 는 은퇴) |

그래서 `league-v4` 챌린저 300명에서 puuid 를 받아 무작위로 섞은 뒤 `active-games` 를
하나씩 물어봅니다. 시간대에 따라 30명을 훑어도 안 걸릴 때가 있어 `--scan` 으로 조절합니다.

> `gameLength` 가 **음수면 아직 로딩·챔피언 선택 단계**입니다. 관전 지연(약 3분)까지 감안해
> `gameLength >= 200` 인 게임을 우선 고릅니다.

`spectate.mjs` 는 롤 클라이언트(LCU)가 떠 있으면 클라이언트에 관전을 맡기고 — 서버 주소와 인자를
클라이언트가 알아서 조립하므로 이쪽이 안전합니다 — 안 떠 있으면 게임을 직접 실행합니다.
**롤 클라이언트를 켜둔 상태로 쓰는 것을 권합니다.**

## Riot API 키 받기

**오버레이 자체에는 키가 필요 없습니다.** 2999 는 내 PC 안의 클라이언트라 인증이 없습니다.
키는 `spectate.mjs` 가 게임을 **찾을 때만** 필요합니다.

[developer.riotgames.com](https://developer.riotgames.com) 에 라이엇 계정으로 로그인하면:

| 종류 | 받는 법 | 만료 | 용도 |
|---|---|---|---|
| **Development** | 로그인하면 대시보드에 바로 보임 (`RGAPI-…`) | **24시간** | 잠깐 테스트 |
| **Personal** | `REGISTER PRODUCT` → Personal API Key 신청 | 없음 | 개인·비상업 프로젝트 |
| **Production** | 앱 심사 (설명·URL 제출) | 없음 | 실서비스 |

- Development 키의 호출 한도는 **20회/1초, 100회/2분** 입니다.
- 선수 5명을 1분에 한 번 확인하는 정도라면 어떤 키든 한도에 한참 못 미칩니다.
- 다만 Development 키는 매일 갱신해야 해서, 상시로 돌릴 거면 **Personal 키**가 맞습니다.

받은 키는 `.env.local` 에 넣고(`RIOT_API_KEY=RGAPI-…`) 절대 커밋하지 마세요.

## 화면 구성 — LCK 중계 배치

```
        ┌──────── 상단 띠: 블루 [킬] ◆ [킬] 레드 / 게임 시계 / 오브젝트 ────────┐
 이름 KDA                                                          KDA 이름
 [룬·스펠][초상 Lv][아이템 3×2]        (관전 화면)        [아이템][Lv 초상][룬·스펠]
 챔피언 · CS                                                         CS · 챔피언
        └──────────── 하단 스코어보드: 양 팀 5명 나란히 ────────────┘
```

- 좌우 레일 **404px**. LCK(약 200px)보다 넓게 잡아 아이템·룬·스펠을 한 줄에 담았습니다.
- 가운데는 비워둡니다 — 관전 화면이 거기 깔립니다.
- 하단 스코어보드는 레벨 · 아이템 · KDA · CS 를 양 팀 나란히, 가운데 챔피언 아이콘.

> **관전 클라이언트의 기본 UI 를 끄세요.** 안 그러면 인게임 스코어보드와 이 오버레이가 겹칩니다.
> 관전 창에서 UI 숨김 단축키를 쓰면 됩니다.

### 바론 · 장로 버프

선수 카드에 색 테를 두릅니다 — **바론은 보라, 장로는 흰색.** 상단에 남은 시간 배너도 뜹니다.

관전 API 는 버프를 안 주므로 이벤트에서 유도합니다:

| | |
|---|---|
| `BaronKill` | 그 팀 · 3분 (`BARON_MS`) |
| `DragonKill` + `DragonType: "Elder"` | 그 팀 · 2분 30초 (`ELDER_MS`) |

버프가 걸린 순간의 데스 수를 기억해 두고, **그 뒤에 죽은 선수는 버프를 잃은 것으로 처리**합니다.
지속시간이 패치로 바뀌면 `config.js` 의 두 상수만 고치면 됩니다.

> 관전을 시작하기 **전에** 먹은 바론·장로는 이벤트가 없어 잡히지 않습니다.

## 이 오버레이가 보여주는 것 / 못 보여주는 것

관전 API 가 주는 것만 그립니다. 없는 값을 추정해서 채우지 않습니다.

| | |
|---|---|
| ✅ 챔피언 · 레벨 · KDA · CS | ✅ 아이템 6칸 · 소환사 주문 · 룬 2개 |
| ✅ 생사 · 부활 카운트 | ✅ 킬 · 용 · 바론 · 전령 · 포탑 · 억제기 |
| ✅ 바론 · 장로 버프 (유도) | ❌ **골드** |
| ❌ **체력 · 마나 바** | ❌ 미니맵 좌표 · 시야 |

**골드·체력·마나가 없는 이유**: `allPlayers` 에 그 필드가 아예 없습니다. 실제 관전 응답의
전체 필드는 다음이 전부입니다 —
`championName, isBot, isDead, items, level, position, rawChampionName, rawSkinName,
respawnTimer, riotId(+GameName/TagLine), runes, scores, screenPosition*, skinID, skinName,
summonerName, summonerSpells, team`.

`activePlayer.currentGold` 로 골드를 볼 수 있지만 관전 모드에서는 그 자체가 error 입니다.
그래서 **LCK 화면의 초록/파랑 체력·마나 바는 만들 수 없습니다.** 그 자리는 챔피언명·CS 로 채웠습니다.
(경기가 끝난 뒤라면 `match-v5` 타임라인에 분 단위 골드가 있습니다.)

## 실제 관전으로 검증 완료 (2026-08-14)

챌린저 솔랭 한 판에 실제로 붙어서 확인했습니다. 필드 이름은 `mock.js` 의 가정과 **전부 일치**했습니다 —
`items[].itemID`/`.slot`, `summonerSpells.*.rawDisplayName`, `runes.keystone.id`,
`rawChampionName`(`game_character_displayname_DrMundo`), `team`(ORDER/CHAOS), `scores.*`.
이미지 40여 개 전부 로드, 아이템 42칸, 사망자 부활 카운트까지 정상.

### 골드 없음 — 확정

```json
"activePlayer": { "error": "Spectator mode doesn't currently support this feature" }
```

`allPlayers` 에 골드 관련 필드는 하나도 없습니다.

### 이벤트는 "관전 시작 이후" 만 온다 — 주의

6분에 붙었더니 `GameStart` 의 `EventTime` 이 0 이 아니라 **360** 이었습니다.
붙기 전에 깨진 포탑·먹힌 용은 영영 안 옵니다.

- **선수 KDA·CS 는 누적이라 정확합니다** (팀 킬수도 `scores` 합산이라 정확).
- **포탑·억제기·용·바론만 부분 집계**입니다. 0 으로 보여주면 "안 깨졌다" 로 읽히므로,
  늦게 붙은 경우 오버레이가 그 줄을 흐리게 하고 **`관전 후`** 꼬리표를 답니다.

### 창모드

`LoL/Game/Config/game.cfg` 의 `WindowMode` — 이 PC 에서 하나씩 확인한 값입니다.

| 값 | 동작 |
|---|---|
| `0` | 전체화면 (**모니터 해상도가 바뀝니다**) |
| `1` | **창모드** |
| `2` | 테두리없음 |

```ini
[General]
WindowMode=1
Width=1600
Height=900
```

이 파일은 관전 인스턴스 전용이라 평소 게임 설정(`LoL/Config/game.cfg`)과 분리돼 있습니다.
**실행 중인 창은 이미 설정을 읽었으므로, 바꾼 뒤에는 새로 띄워야 적용됩니다.**

### 남은 것

- 고를 게임은 경과 **200초~15분** 짜리로 제한합니다. 20분 넘은 게임을 고르면 관전 창이 뜨는
  2분 사이에 경기가 끝나 `download disabled due to errors fetching data chunks` 로 떨어집니다.

처음 관전할 때 이것부터 확인하세요:

```bash
curl -s http://127.0.0.1:3200/game/liveclientdata/allgamedata | python3 -m json.tool | head -60
```

특히 `allPlayers[].runes` 와 `summonerSpells` 는 관전 모드에서만 전원 값이 채워지는 필드라,
실제 응답에서 한 번 눈으로 봐야 합니다.
