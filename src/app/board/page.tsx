import type { Metadata } from 'next';
import BoardView, { type ThreadMatch } from '@/components/Board';
import { getSeason } from '@/lib/season';
import { sidesOf } from '@/lib/pick';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '게시판',
  description: '한화생명e스포츠 팬 게시판 — 앱과 같은 글·댓글.',
};

export default async function BoardPage() {
  let thread: ThreadMatch | null = null;
  try {
    const next = (await getSeason()).next;
    if (next) {
      const { us, them } = sidesOf(next);
      thread = { start: next.startTime, usImage: us.image ?? null, them: { code: them.code, image: them.image ?? null, name: them.name } };
    }
  } catch {
    /* 일정이 없어도 게시판은 보여준다 */
  }
  return <BoardView thread={thread} />;
}
