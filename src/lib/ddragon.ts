/**
 * Data Dragon — 챔피언 이름 현지화.
 *
 * 라이엇이 공개한 정적 파일이라 열쇠도 제한도 없다. 우리가 한글 이름을 직접
 * 적어 두지 않는 이유: 챔피언은 계속 추가되고 이름도 가끔 바뀐다. 목록을 손으로
 * 들고 있으면 새 챔피언이 나올 때마다 화면에 영문이 튀어나온다.
 *
 * Leaguepedia 는 표시명(Jarvan IV, Cho'Gath)을 주는데 Data Dragon 의 키는
 * JarvanIV, Chogath 처럼 형태가 다르다. 그래서 키가 아니라 영문 '이름'끼리
 * 맞추고, 대소문자와 기호를 지운 뒤 비교한다.
 */

const VERSIONS = 'https://ddragon.leagueoflegends.com/api/versions.json';
const champUrl = (v: string, locale: string) =>
  `https://ddragon.leagueoflegends.com/cdn/${v}/data/${locale}/champion.json`;

interface ChampionFile {
  data: Record<string, { name: string }>;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** 패치는 2주에 한 번쯤 올라간다. 하루에 한 번이면 충분하다 */
const TTL_MS = 12 * 60 * 60 * 1000;

let cache: { at: number; map: Record<string, string> } | null = null;
let inflight: Promise<Record<string, string>> | null = null;

async function build(): Promise<Record<string, string>> {
  const versions = (await (await fetch(VERSIONS, { signal: AbortSignal.timeout(8_000) })).json()) as string[];
  const v = versions[0];

  const [en, ko] = (await Promise.all(
    ['en_US', 'ko_KR'].map((l) =>
      fetch(champUrl(v, l), { signal: AbortSignal.timeout(8_000) }).then((r) => {
        if (!r.ok) throw new Error(`ddragon ${l} → HTTP ${r.status}`);
        return r.json();
      }),
    ),
  )) as [ChampionFile, ChampionFile];

  const map: Record<string, string> = {};
  for (const key of Object.keys(en.data)) {
    const kr = ko.data[key];
    if (kr) map[norm(en.data[key].name)] = kr.name;
  }
  return map;
}

/**
 * 영문 챔피언 이름을 한글로 바꾸는 함수를 돌려준다.
 * 실패하면 원래 이름을 그대로 돌려주는 함수를 준다 — 이름을 못 바꾼다고
 * 전적까지 못 보여줄 이유는 없다.
 */
export async function championLocalizer(): Promise<(name: string) => string> {
  if (!cache || Date.now() - cache.at >= TTL_MS) {
    inflight ??= build()
      .then((map) => {
        cache = { at: Date.now(), map };
        return map;
      })
      .finally(() => {
        inflight = null;
      });
    try {
      await inflight;
    } catch {
      /* 아래에서 기존 캐시나 항등 함수로 떨어진다 */
    }
  }
  const map = cache?.map;
  return (name: string) => map?.[norm(name)] ?? name;
}
