import type { Metadata } from 'next';
import BoardView from '@/components/Board';
import { getSeason } from '@/lib/season';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '커뮤니티',
  description: '한화생명e스포츠 팬 커뮤니티 — 계정 기능 준비 중입니다.',
};

export default async function BoardPage() {
  let nextKickoff: string | null = null;
  try {
    nextKickoff = (await getSeason()).next?.startTime ?? null;
  } catch {
    /* 일정이 없어도 안내는 보여준다 */
  }
  return <BoardView nextKickoff={nextKickoff} />;
}
