import { Ticket as TicketIcon } from 'lucide-react';
import { fmtDate } from '@/lib/format';
import { TICKET_URL, cancelLabel, ddayLabel, ticketInfo } from '@/lib/ticket';

/**
 * 경기 카드에 붙는 예매 한 줄.
 *
 * 우리가 계산한 값이라는 사실을 감추지 않는다. 그래서 늘 예매처로 가는 링크를
 * 겸한다 — 놓치면 되돌릴 수 없는 정보라 우리 화면만 보고 판단하게 만들면 안 된다.
 *
 * 앱으로 바로 열지는 않는다. nol.yanolja.com 에 assetlinks.json 도
 * apple-app-site-association 도 없어 https 링크가 앱을 자동으로 열지 못하고,
 * 페이지 어디에도 앱 스킴이 없다. 확인되지 않은 스킴을 넣으면 앱이 없는 사람에게
 * 깨진 링크가 된다. 안드로이드는 앱이 해당 호스트를 선언해 두었으면 시스템이
 * "앱으로 열기" 를 물어보므로, 일반 링크가 지금으로선 가장 잘 동작한다.
 *
 * 이미 시작한 경기에는 아무것도 붙이지 않는다. 지난 예매일은 알 필요가 없다.
 *
 * 클릭 핸들러를 두지 않는다. 이 컴포넌트는 서버에서도 그려지는데(대진표) 서버
 * 컴포넌트는 이벤트 핸들러를 넘길 수 없다. 예매 줄이 붙는 카드에는 클릭 동작이
 * 없으므로 전파를 막을 이유도 없다.
 */
export default function TicketLine({ startTime }: { startTime: string }) {
  const t = ticketInfo(startTime);
  if (t.phase === 'past') return null;

  return (
    <a
      className={`tkt${t.phase === 'open' ? ' on' : ''}`}
      href={TICKET_URL}
      target="_blank"
      rel="noopener noreferrer"
    >
      <TicketIcon size={13} aria-hidden />
      {t.phase === 'before' ? (
        <>
          <span>예매 {fmtDate(t.openAt.toISOString())}</span>
          <b>{ddayLabel(t.dday!)}</b>
        </>
      ) : (
        <>
          <span>예매 중</span>
          {/* 경기 당일은 취소표가 15:00 보다 일찍 풀리기도 한다. 시각을 적어 두면
              그보다 먼저 나온 표를 놓치므로 '수시' 로만 알린다 */}
          <b>{t.matchDay ? '취소표 수시' : t.cancelAt ? `취소표 ${cancelLabel(t.cancelAt)}` : ''}</b>
        </>
      )}
    </a>
  );
}
