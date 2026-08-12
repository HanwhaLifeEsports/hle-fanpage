import PredictView from '@/components/PredictView';
import { getSeason } from '@/lib/season';
import { sidesOf } from '@/lib/pick';

export const dynamic = 'force-dynamic';

export default async function PredictPage() {
  let opponent: string | null = null;
  let kickoff: string | null = null;
  try {
    const { next } = await getSeason();
    if (next) {
      opponent = sidesOf(next).them.name;
      kickoff = next.startTime;
    }
  } catch {
    // 예측 UI 자체는 상대 없이도 보여준다
  }
  return <PredictView opponent={opponent} kickoff={kickoff} />;
}
