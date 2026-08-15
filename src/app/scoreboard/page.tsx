import type { Metadata } from 'next';
import Scoreboard from '@/components/Scoreboard';

export const metadata: Metadata = {
  title: '실시간 스코어보드',
  description:
    'LCK 경기의 레벨·KDA·CS·골드·아이템·오브젝트를 중계 옵저버 화면 그대로 봅니다. 끝난 경기는 시점을 되돌려 볼 수 있습니다.',
};

export default async function ScoreboardPage({
  searchParams,
}: {
  searchParams: Promise<{ match?: string }>;
}) {
  const { match } = await searchParams;
  return (
    <div className="hudwrap sec">
      <h2 className="ko ptitle">실시간 스코어보드</h2>
      <p className="lede" style={{ margin: '10px 0 var(--s5)' }}>
        중계 옵저버가 보는 데이터를 그대로 가져옵니다. 진행 중인 경기가 없으면 한화생명의 마지막
        경기를 보여주고, 끝난 경기는 아래 타임라인으로 원하는 시점을 되돌려 볼 수 있습니다.
      </p>
      <Scoreboard matchId={match} />
    </div>
  );
}
