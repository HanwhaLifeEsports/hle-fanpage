import BoardView from '@/components/Board';
import { getSeason, inLiveWindow } from '@/lib/season';

export const dynamic = 'force-dynamic';

export default async function BoardPage() {
  let chatOpen = false;
  let nextKickoff: string | null = null;
  try {
    const { season, next } = await getSeason();
    chatOpen = !!inLiveWindow(season.matches);
    nextKickoff = next?.startTime ?? null;
  } catch {
    // 시즌 데이터가 없어도 게시판은 열려 있어야 한다
  }
  return <BoardView chatOpen={chatOpen} nextKickoff={nextKickoff} />;
}
