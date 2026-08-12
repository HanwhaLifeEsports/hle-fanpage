import type { Metadata } from 'next';
import PredictView, { type PredictMatch } from '@/components/PredictView';
import { getSeason, ourMatches } from '@/lib/season';
import { sidesOf } from '@/lib/pick';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '승부예측',
  description: '한화생명e스포츠 경기 세트 스코어를 예측하고 실제 결과로 자동 채점받으세요.',
};

export default async function PredictPage() {
  let matches: PredictMatch[] = [];
  try {
    const { season } = await getSeason();
    matches = ourMatches(season.matches)
      .filter((m) => m.stage === 'regular')
      .map((m) => {
        const { us, them } = sidesOf(m);
        return {
          id: m.id,
          startTime: m.startTime,
          opponent: them.name,
          opponentCode: them.code,
          bo: m.bo,
          result:
            m.state === 'completed' && us.games != null && them.games != null
              ? ([us.games, them.games] as [number, number])
              : null,
          // 킥오프가 지났으면 예측을 잠근다
          locked: m.state !== 'unstarted' || +new Date(m.startTime) <= Date.now(),
        };
      });
  } catch {
    // 일정을 못 가져와도 화면 자체는 뜬다
  }
  return <PredictView matches={matches} />;
}
