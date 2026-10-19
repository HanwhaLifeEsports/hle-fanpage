import Link from 'next/link';
import type { Metadata } from 'next';
import LiveMatchStats from '@/components/LiveMatchStats';
import MatchScore from '@/components/MatchScore';
import TeamLogo from '@/components/TeamLogo';
import { OUR_TAG } from '@/lib/lck2026';
import { getSeason } from '@/lib/season';
import { getWorldsAll } from '@/lib/lolesports-live';
import { fmtDate } from '@/lib/format';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '경기 상세', description: '세트별 경기 기록, 선수 통계와 챔피언 픽을 확인합니다.' };

export default async function MatchDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{10,22}$/.test(id)) {
    return <div className="wrap sec"><h1 className="ko ptitle">경기를 찾을 수 없습니다</h1><Link href="/schedule">전체 일정</Link></div>;
  }
  const [lck, worlds] = await Promise.all([
    getSeason().then((b) => b.season.matches).catch(() => []),
    getWorldsAll().catch(() => []),
  ]);
  const match = [...lck, ...worlds].find((m) => m.id === id);
  const vods = match && match.state !== 'unstarted' ? await fetchVods(id).catch(() => []) : [];
  const started = !!match && match.state !== 'unstarted';
  const ours = match ? match.a.code === OUR_TAG || match.b.code === OUR_TAG : false;
  const left = match && ours && match.b.code === OUR_TAG ? match.b : match?.a;
  const right = match && left === match.b ? match.a : match?.b;

  return (
    <div className="ui-page">
      {match && left && right ? (
        <section className="ui-scoreboard glass-ink">
          <p>
            {fmtDate(match.startTime)} · {match.blockName || 'LCK'} · BO{match.bo}
          </p>
          <div className="ui-sb-row">
            <div className="ui-sb-team">
              <TeamLogo image={left.image} size={64} label={left.name} />
              <b>{left.code}</b>
            </div>
            <MatchScore id={match.id} a={left.games} b={right.games} started={started} />
            <div className="ui-sb-team">
              <TeamLogo image={right.image} size={64} label={right.name} />
              <b>{right.code}</b>
            </div>
          </div>
          {match.state === 'inProgress' && (
            <Link className="ui-pill white" href="/live">
              앱처럼 실시간으로 보기
            </Link>
          )}
          {match.state === 'unstarted' && ours && (
            <Link className="ui-pill white" href="/predict">
              승부예측 하러 가기
            </Link>
          )}
        </section>
      ) : (
        <h1 className="ui-title">경기 상세</h1>
      )}

      {vods.length > 0 && (
        <section className="ui-paper">
          <div className="ui-head">
            <h2>다시보기</h2>
          </div>
          {vods.map((g) => (
            <div className="ui-vodrow" key={g.number}>
              <b>{g.number}세트</b>
              {g.soop && (
                <a className="ui-vod" href={g.soop} target="_blank" rel="noopener noreferrer">
                  <span className="pmark pmark-soop" aria-hidden />
                  SOOP
                </a>
              )}
              {g.youtube && (
                <a className="ui-vod" href={g.youtube} target="_blank" rel="noopener noreferrer">
                  <span className="pmark pmark-youtube" aria-hidden />
                  YouTube
                </a>
              )}
            </div>
          ))}
        </section>
      )}

      <div className="ui-section-label">세트 기록</div>
      <LiveMatchStats matchId={id} />
    </div>
  );
}

/**
 * 세트별 다시보기. 치르지 않은 세트(unneeded)는 빼고, 한국어 중계는 SOOP VOD,
 * 유튜브는 그 세트가 시작하는 지점부터 연다.
 */
async function fetchVods(id: string) {
  const res = await fetch(`https://esports-api.lolesports.com/persisted/gw/getEventDetails?hl=ko-KR&id=${id}`, {
    headers: { 'x-api-key': process.env.LOLESPORTS_API_KEY || '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z' },
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];
  type Vod = { parameter: string; locale?: string; provider: string; startMillis?: number };
  type Game = { number: number; state: string; vods?: Vod[] };
  const data = (await res.json()) as { data?: { event?: { match?: { games?: Game[] } } } };
  return (data.data?.event?.match?.games ?? [])
    .filter((g) => g.state === 'completed')
    .map((g) => {
      const ko = g.vods?.find((v) => v.provider === 'afreecatv' && v.locale === 'ko-KR');
      const yt = g.vods?.find((v) => v.provider === 'youtube');
      return {
        number: g.number,
        soop: ko ? `https://vod.sooplive.com/player/${ko.parameter}` : null,
        youtube: yt ? `https://www.youtube.com/watch?v=${yt.parameter}&t=${Math.floor((yt.startMillis ?? 0) / 1000)}s` : null,
      };
    })
    .filter((g) => g.soop || g.youtube)
    .sort((a, b) => a.number - b.number);
}
