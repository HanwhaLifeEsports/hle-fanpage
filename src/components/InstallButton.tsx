'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

/**
 * 안드로이드(크롬)·데스크톱 크롬의 '앱 설치' 버튼.
 * 브라우저가 설치할 수 있다고 알려줄 때(beforeinstallprompt)만 보인다.
 * iOS 는 이 이벤트가 없어서 MY 화면의 '홈 화면에 추가' 안내가 대신한다.
 */
export default function InstallButton() {
  const [evt, setEvt] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // 브라우저 기본 미니 배너 대신 우리 버튼으로
      setEvt(e as InstallEvent);
    };
    const onInstalled = () => setEvt(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!evt) return null;

  return (
    <div className="card rv acct" style={{ marginTop: 'var(--s4)' }}>
      <div className="acct-head">
        <Download size={20} />
        <b>앱으로 설치</b>
      </div>
      <p className="cap" style={{ margin: '6px 0 14px' }}>
        홈 화면에 앱처럼 설치하면 주소창 없이 바로 열리고, 경기 알림을 받을 수 있습니다.
      </p>
      <button
        className="btn btn-primary btn-sm"
        onClick={async () => {
          await evt.prompt();
          await evt.userChoice;
          setEvt(null);
        }}
      >
        설치하기
      </button>
    </div>
  );
}
