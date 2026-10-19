'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Eye, RotateCcw, Shield } from 'lucide-react';
import { AccountActions, ProfileCard } from '@/components/Account';
import InstallButton from '@/components/InstallButton';
import { LEAD_CHOICES, PREFS, leadLabel, resetState, notify, useApp, useNotify } from '@/lib/useAppState';

export default function MePage() {
  const { prefs, leads, setPref, setLead } = useApp();
  const { permission, ask } = useNotify();
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIosHint(isIOS && !standalone);
  }, []);

  const permText: Record<string, string> = {
    granted: '허용됨 — 푸시를 받을 수 있습니다',
    denied: '차단됨 — 브라우저 설정에서 해제해야 합니다',
    default: '아직 요청하지 않음',
    unsupported: '이 브라우저는 웹 알림을 지원하지 않습니다',
  };

  // 실제 기기 알림을 한 번 보내 본다 (화면 안 미리보기는 없다)
  const previewPush = () => {
    notify('곧 경기 시작', prefs.spoiler ? '알림은 이렇게 옵니다 · 결과는 가려서 보내요' : '알림은 이렇게 옵니다 · 결과도 함께 보내요');
  };

  /* lead 가 있는 항목은 몇 분 전에 받을지 고를 수 있다.
     켜져 있을 때만 보여줬더니 기본이 꺼짐이라 설정이 있다는 것 자체를 알 수 없었다.
     늘 보여주되 꺼져 있으면 흐리게 두고, 시간을 고르면 알림도 함께 켠다 —
     시간을 고르는 행동은 그 알림을 받겠다는 뜻이다. */
  const Row = ({ k, t, d, lead }: { k: string; t: string; d: string; lead?: number }) => (
    /* 구분선은 이 덩어리가 갖는다. .nrow 에 두면 시간 선택지가 선 아래로 나와
       다음 항목에 붙어 보인다 */
    <div className="nitem">
      <div className="nrow">
        <div className="l">
          <b>{t}</b>
          <span>{d}</span>
        </div>
        <button
          className={`tg${prefs[k] ? ' on' : ''}`}
          aria-label={t}
          onClick={() => {
            setPref(k, !prefs[k]);
          }}
        />
      </div>
      {lead !== undefined && (
        <div className={`leadrow${prefs[k] ? '' : ' off'}`} role="group" aria-label={`${t} 미리 알림`}>
          {LEAD_CHOICES.map((m) => (
            <button
              key={m}
              className={`chip${prefs[k] && (leads[k] ?? lead) === m ? ' on' : ''}`}
              aria-pressed={prefs[k] && (leads[k] ?? lead) === m}
              onClick={() => {
                setLead(k, m);
                if (!prefs[k]) setPref(k, true);
              }}
            >
              {leadLabel(m)}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="ui-page">
      <h1 className="ui-title">MY</h1>
      <ProfileCard />
      <InstallButton />

      {iosHint && (
        <div className="ui-paper ui-hint">
          <b>알림을 받으려면 홈 화면에 추가</b>
          <span>공유 ↑ → 홈 화면에 추가</span>
        </div>
      )}

      <div className="ui-section-label">경기 알림</div>
      <div className="ui-paper ui-settings">
        <div className="nitem">
          <div className="nrow">
            <div className="l">
              <b>브라우저 알림 권한</b>
              <span>{permText[permission] ?? permission}</span>
            </div>
            {permission === 'granted' ? (
              <button className="ui-pill glass" onClick={previewPush}>
                <Eye size={14} /> 미리보기
              </button>
            ) : (
              <button className="ui-pill ui-pill-on" onClick={ask}>
                <Bell size={14} /> 허용
              </button>
            )}
          </div>
        </div>
        {PREFS.filter((p) => p.g === 'match').map((p) => (
          <Row key={p.k} k={p.k} t={p.t} d={p.d} lead={'lead' in p ? p.lead : undefined} />
        ))}
      </div>

      <div className="ui-section-label">보기 설정</div>
      <div className="ui-paper ui-settings">
        {PREFS.filter((p) => p.g === 'etc').map((p) => (
          <Row key={p.k} k={p.k} t={p.t} d={p.d} />
        ))}
      </div>

      <div className="ui-paper ui-settings ui-rows">
        <Link className="ui-row" href="/privacy">
          <Shield size={16} /> 개인정보처리방침
        </Link>
        <button
          className="ui-row"
          onClick={() => {
            if (!confirm('이 브라우저에 저장된 알림 설정·예측 기록을 지울까요?')) return;
            resetState();
          }}
        >
          <RotateCcw size={16} /> 이 브라우저 설정 초기화
        </button>
        <AccountActions />
      </div>
    </div>
  );
}
