import type { Metadata } from 'next';
import { Radio } from 'lucide-react';

export const metadata: Metadata = {
  title: '솔랭 관전',
  description: '한화생명e스포츠 선수들의 솔로랭크를 관전 오버레이를 얹어 중계로 내보냅니다.',
};

/**
 * 솔랭 관전 방송.
 *
 * 방송 자체는 내 PC 에서 만든다 — 롤 클라이언트로 관전하고, overlay/ 의 HUD 를
 * OBS 브라우저 소스로 얹어 유튜브로 송출한다. 이 페이지는 그 방송을 팬페이지로
 * 끌어오는 창구일 뿐이라, 서버가 할 일이 없다.
 *
 * 라이브 여부는 판정하지 않는다. 유튜브 Data API 키가 있어야 하는데,
 * live_stream 임베드가 알아서 현재 방송을 찾아가므로 판정 없이 붙인다
 * (lck2026.ts 의 youtube.detectable:false 와 같은 이유).
 */
const CHANNEL = process.env.NEXT_PUBLIC_SOLOQ_YT_CHANNEL ?? '';

export default function SoloqPage() {
  return (
    <div className="wrap sec">
      <h2 className="ko ptitle">솔랭 관전</h2>
      <p className="lede" style={{ margin: '10px 0 var(--s5)' }}>
        선수들의 솔로랭크를 관전해 중계 화면으로 내보냅니다. 관전에는 라이엇이 걸어둔 약 3분 지연이
        있어, 상대 팀이 이 방송을 보고 대응할 수는 없습니다.
      </p>

      {CHANNEL ? (
        <div className="pframe">
          <span className="lbl" style={{ color: '#FF0033' }}>
            <i className="dot" style={{ background: '#FF0033' }} />
            YouTube
          </span>
          <iframe
            src={`https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(CHANNEL)}`}
            title="솔랭 관전 라이브"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : (
        <div className="empty">
          <b>송출 채널이 아직 설정되지 않았습니다</b>
          <span>
            <code>NEXT_PUBLIC_SOLOQ_YT_CHANNEL</code> 에 유튜브 채널 ID(<code>UC</code> 로 시작하는
            값)를 넣으면 이 자리에 라이브가 붙습니다.
          </span>
        </div>
      )}

      <div className="shead">
        <h2 className="ko">방송이 없을 때</h2>
      </div>
      <p className="lede">
        선수가 솔랭을 돌리고 관전자가 방송을 켠 시간에만 나옵니다. 꺼져 있으면 유튜브 플레이어가
        &ldquo;라이브 스트림 없음&rdquo;으로 표시됩니다.
      </p>

      <div className="note">
        <b>공식 중계가 아닙니다.</b> 팬이 공개된 관전 기능으로 만든 비공식 방송이며, 선수 본인이나
        구단·라이엇의 요청이 있으면 즉시 중단합니다. 공식 경기 기록은{' '}
        <span className="livestat">
          <Radio size={13} />
          스코어보드
        </span>{' '}
        에서 봅니다.
      </div>
    </div>
  );
}
