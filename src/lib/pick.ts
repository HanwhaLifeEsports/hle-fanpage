import { OUR_TAG } from './lck2026';
import type { MatchRow } from './lolesports';

/** 우리 팀 관점으로 정렬 — 서버/클라 양쪽에서 쓴다 */
export function sidesOf(m: MatchRow, code = OUR_TAG) {
  return m.a.code === code
    ? { us: m.a, them: m.b, mine: true }
    : { us: m.b, them: m.a, mine: m.b.code === code };
}
