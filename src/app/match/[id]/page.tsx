import Link from 'next/link';
import type { Metadata } from 'next';
import { ChevronLeft } from 'lucide-react';
import LiveMatchStats from '@/components/LiveMatchStats';
import { getSeason } from '@/lib/season';
import { getWorldsMatches } from '@/lib/lolesports-live';
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
    getWorldsMatches().catch(() => []),
  ]);
  const match = [...lck, ...worlds].find((m) => m.id === id);
  return (
    <div className="wrap sec">
      <Link href="/schedule" className="btn btn-ghost btn-sm" style={{ marginBottom: 22 }}>
        <ChevronLeft size={14} /> 전체 일정
      </Link>
      <h1 className="ko ptitle rv">{match ? match.a.code + ' vs ' + match.b.code : '경기 상세'}</h1>
      {match && <p className="cap" style={{ margin: '10px 0 var(--s5)' }}>
        {fmtDate(match.startTime)} · BO{match.bo}{match.blockName ? ' · ' + match.blockName : ''}
      </p>}
      <div style={{ marginTop: 24 }}><LiveMatchStats matchId={id} /></div>
    </div>
  );
}
