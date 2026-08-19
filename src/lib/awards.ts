/**
 * 선수·코칭스태프 수상 실적.
 *
 * 이 파일만 손으로 적는다. 사이트의 다른 기록은 전부 API 에서 가져오는데
 * 여기만 예외인 이유가 있다.
 *
 * Leaguepedia 의 TournamentResults 로 뽑아 봤고, 나무위키와 대조해 버렸다.
 * 세 가지가 걸렸다.
 *
 *  1. Place=1 이 우승과 정규시즌 1위를 구분하지 않는다. 구마유시의
 *     'LCK 2023 Spring' 이 1위로 들어 있는데 그건 정규 1위고 결승은 젠지에게
 *     졌다 — 그대로 쓰면 없던 우승이 화면에 뜬다
 *  2. Tournaments 표와 조인하면 월즈 행이 말없이 사라진다. 2023·2024 월즈가
 *     통째로 빠졌다. 없는 것을 만드는 것보다 있는 것을 지우는 쪽이 더 무섭다
 *  3. 리그 이름을 목록으로 거르면 표기 차이에 걸린다. LPL 의 정식 값이
 *     'Tencent LoL Pro League' 라 카나비의 LPL 우승 9회가 한 번에 날아갔다
 *
 * 게다가 팬이 가장 보고 싶어 하는 개인 수상(파이널 MVP, 올해의 선수)은
 * Leaguepedia 에 표 자체가 없다.
 *
 * 그래서 손으로 적되 두 출처를 맞춰 봤다. 우승 이력은 해마다 몇 줄 늘 뿐이라
 * 갱신 비용이 낮고, 틀렸을 때의 값이 훨씬 크다.
 *
 * 담는 기준은 주요 대회다. 아카데미·챌린저스(LCK AS, LCK CL, NLB)와 이벤트전은
 * 넣지 않는다. 트로피 개수가 실제 커리어를 부풀리면 안 된다.
 *
 * 마지막 확인: 2026-08-18 (나무위키, Leaguepedia)
 */

export interface Award {
  /** 정렬용. 열린 연도를 쓴다 — 대회 이름의 연도와 다를 수 있다(아시안게임) */
  year: number;
  name: string;
  /** 당시 소속. 지금 팀과 다를 때만 뜻이 있다 */
  team?: string;
}

export interface Awards {
  /** 팀 우승 */
  titles: Award[];
  /** 개인 수상 */
  honors: Award[];
}

export const AWARDS: Record<string, Awards> = {
  zeus: {
    titles: [
      { year: 2026, name: 'MSI' },
      { year: 2025, name: '퍼스트 스탠드' },
      { year: 2025, name: 'LCK 컵' },
      { year: 2024, name: '월드 챔피언십', team: 'T1' },
      { year: 2024, name: 'EWC', team: 'T1' },
      { year: 2023, name: '월드 챔피언십', team: 'T1' },
      { year: 2023, name: '항저우 아시안게임 금메달', team: '대한민국' },
      { year: 2022, name: 'LCK 스프링', team: 'T1' },
    ],
    honors: [
      { year: 2026, name: 'MSI 파이널 MVP' },
      { year: 2025, name: 'LCK 컵 파이널 MVP' },
      { year: 2025, name: 'LCK 어워드 모스트 솔로킬' },
      { year: 2024, name: 'LCK 어워드 올해의 탑' },
      { year: 2023, name: '월드 챔피언십 결승 MVP' },
      { year: 2023, name: 'LCK 어워드 올해의 탑' },
      { year: 2022, name: 'LCK 어워드 올해의 탑' },
    ],
  },

  kanavi: {
    titles: [
      { year: 2026, name: 'MSI' },
      { year: 2025, name: 'LPL 스플릿 1', team: 'Top Esports' },
      { year: 2023, name: '항저우 아시안게임 금메달', team: '대한민국' },
      { year: 2023, name: 'MSI', team: 'JD Gaming' },
      { year: 2023, name: 'LPL 서머', team: 'JD Gaming' },
      { year: 2023, name: 'LPL 스프링', team: 'JD Gaming' },
      { year: 2022, name: 'LPL 서머', team: 'JD Gaming' },
      { year: 2020, name: 'LPL 스프링', team: 'JD Gaming' },
    ],
    honors: [
      { year: 2025, name: 'LPL 스플릿 2 정규시즌 MVP' },
      { year: 2023, name: 'LPL 베스트 정글러' },
      { year: 2022, name: 'LPL 베스트 정글러' },
      { year: 2022, name: 'LPL 베스트 외국인 선수' },
      { year: 2020, name: 'LPL 스프링 정규시즌 MVP' },
    ],
  },

  zeka: {
    titles: [
      { year: 2026, name: 'MSI' },
      { year: 2025, name: '퍼스트 스탠드' },
      { year: 2025, name: 'LCK 컵' },
      { year: 2024, name: 'LCK 서머' },
      { year: 2022, name: '월드 챔피언십', team: 'DRX' },
    ],
    honors: [
      { year: 2025, name: '퍼스트 스탠드 결승 MVP' },
      { year: 2024, name: 'LCK 서머 파이널 MVP' },
      { year: 2023, name: 'LCK 서머 Player of the Split' },
      { year: 2022, name: 'LCK 어워드 올해의 선수' },
      { year: 2022, name: 'LCK 어워드 올해의 미드' },
    ],
  },

  gumayusi: {
    titles: [
      { year: 2026, name: 'MSI' },
      { year: 2025, name: '월드 챔피언십', team: 'T1' },
      { year: 2024, name: '월드 챔피언십', team: 'T1' },
      { year: 2024, name: 'EWC', team: 'T1' },
      { year: 2023, name: '월드 챔피언십', team: 'T1' },
      { year: 2022, name: 'LCK 스프링', team: 'T1' },
      { year: 2020, name: 'LCK 스프링', team: 'T1' },
    ],
    honors: [
      { year: 2025, name: '월드 챔피언십 결승 MVP' },
      { year: 2025, name: 'LCK 어워드 올해의 원딜' },
      { year: 2024, name: 'LCK 어워드 올해의 원딜' },
      { year: 2023, name: 'LCK 어워드 올해의 원딜' },
    ],
  },

  delight: {
    titles: [
      { year: 2026, name: 'MSI' },
      { year: 2025, name: '퍼스트 스탠드' },
      { year: 2025, name: 'LCK 컵' },
      { year: 2024, name: 'LCK 서머' },
      { year: 2023, name: 'LCK 서머', team: 'Gen.G' },
      { year: 2023, name: 'LCK 스프링', team: 'Gen.G' },
    ],
    honors: [
      { year: 2023, name: 'LCK 어워드 어시스트 킹' },
      { year: 2022, name: 'LCK 어워드 밝은 협곡에 눈뜨다' },
    ],
  },

  /* 코칭스태프. 감독·코치로 든 트로피다 */
  homme: {
    titles: [
      { year: 2026, name: 'MSI' },
      { year: 2025, name: 'LPL 스플릿 1', team: 'Top Esports' },
      { year: 2023, name: 'MSI', team: 'JD Gaming' },
      { year: 2023, name: 'LPL 서머', team: 'JD Gaming' },
      { year: 2023, name: 'LPL 스프링', team: 'JD Gaming' },
      { year: 2022, name: 'LPL 서머', team: 'JD Gaming' },
      { year: 2020, name: 'LPL 스프링', team: 'JD Gaming' },
      { year: 2017, name: 'LPL 스프링', team: 'Team WE' },
      { year: 2014, name: '월드 챔피언십', team: '삼성 갤럭시 화이트' },
    ],
    honors: [
      { year: 2023, name: 'LPL 베스트 코치' },
      { year: 2022, name: 'LPL 베스트 코치' },
    ],
  },

  mowgli: {
    titles: [
      { year: 2026, name: 'MSI' },
      { year: 2025, name: '퍼스트 스탠드' },
      { year: 2025, name: 'LCK 컵' },
      { year: 2024, name: 'LCK 서머' },
      { year: 2022, name: '월드 챔피언십', team: 'DRX' },
    ],
    honors: [],
  },

  sin: {
    titles: [
      { year: 2026, name: 'MSI' },
      { year: 2018, name: 'LCK 스프링', team: '킹존 드래곤X' },
    ],
    honors: [],
  },
};
