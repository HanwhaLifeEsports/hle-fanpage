'use client';

import { useEffect, useState } from 'react';
import { Ticket as TicketIcon } from 'lucide-react';
import { fmtDate } from '@/lib/format';
import { TICKET_URL, TICKET_URL_MOBILE, cancelLabel, ddayLabel, ticketInfo } from '@/lib/ticket';

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
 * 클릭 핸들러는 두지 않는다. 예매 줄이 붙는 카드에는 클릭 동작이 없으므로
 * 전파를 막을 이유가 없다.
 */
export default function TicketLine({ startTime }: { startTime: string }) {
  /* 좁은 화면에서는 다른 예매처로 보낸다.
     서버가 그릴 때는 넓은 쪽으로 두고 붙은 뒤에 바꾼다. 폭은 서버가 알 수 없어
     추측하면 하이드레이션이 어긋난다. 주소는 눈에 보이는 값이 아니라 이 순서로
     바뀌어도 화면이 깜빡이지 않는다 */
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)');
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const t = ticketInfo(startTime);
  if (t.phase === 'past') return null;

  return (
    <a
      className={`tkt${t.phase === 'open' ? ' on' : ''}`}
      href={narrow ? TICKET_URL_MOBILE : TICKET_URL}
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
