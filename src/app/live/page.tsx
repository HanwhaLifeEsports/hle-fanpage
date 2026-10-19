import type { Metadata } from 'next';
import LiveScreen from '@/components/LiveScreen';
import LiveMatchStats from '@/components/LiveMatchStats';
import TeamLogo from '@/components/TeamLogo';
import { getSeason } from '@/lib/season';
import { getWorldsMatches } from '@/lib/lolesports-live';
import { sidesOf } from '@/lib/pick';
import { OUR_TAG } from '@/lib/lck2026';
import type { MatchRow } from '@/lib/lolesports';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '중계',
  description: '치지직 중계를 보면서 앱·웹 팬들과 실시간 응원 채팅.',
};

/** 진행 중이거나 곧 할(4시간 전 시작까지 포함) 우리 경기 */
function nextOurMatch(all: MatchRow[], now = Date.now()) {
  return (
    all
      .filter((m) => m.a.code === OUR_TAG || m.b.code === OUR_TAG)
      .filter((m) => m.state !== 'completed' && (m.state === 'inProgress' || Date.parse(m.startTime) > now - 4 * 60 * 60_000))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0] ?? null
  );
}

/**
 * 중계 탭 (앱과 같은 구성): 위에 영상, 바로 아래 그 경기 응원 채팅.
 * 화면은 항상 어두운 톤이다 (영상 주변이 밝으면 눈이 부시다).
 */
export default async function LivePage() {
  const [season, worlds] = await Promise.all([
    getSeason().then((b) => b.season.matches).catch(() => []),
    getWorldsMatches().catch(() => []),
  ]);
  const next = nextOurMatch([...season, ...worlds]);
  const sides = next ? sidesOf(next) : null;

  return (
    <div className="ui-page ui-night wide">
      {next && sides ? (
        <div className="ui-livehead">
          <TeamLogo image={sides.us.image} size={40} label={sides.us.name} />
          <div>
            <b>
              {OUR_TAG} vs {sides.them.code}
            </b>
            <span>{next.blockName || 'LCK'} · BO{next.bo}</span>
          </div>
          <TeamLogo image={sides.them.image} size={40} label={sides.them.name} />
        </div>
      ) : (
        <h1 className="ui-title">중계</h1>
      )}

      <LiveScreen match={next ? { id: next.id, startTime: next.startTime } : null} />
      <LiveMatchStats compact />
    </div>
  );
}
