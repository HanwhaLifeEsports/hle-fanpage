'use client';

import { useEffect, useState } from 'react';
import { Bell, Eye, RotateCcw } from 'lucide-react';
import { PLAYERS } from '@/lib/lck2026';
import { LEAD_CHOICES, PREFS, leadLabel, patchState, resetState, toast, useApp, useNotify } from '@/lib/useAppState';

export default function MePage() {
  const { prefs, leads, fav, setPref, setLead } = useApp();
  const { permission, ask } = useNotify();
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIosHint(isIOS && !standalone);
  }, []);

  const favPlayer = fav ? PLAYERS.find((p) => p.id === fav) : null;

  const permText: Record<string, string> = {
    granted: '허용됨 — 푸시를 받을 수 있습니다',
    denied: '차단됨 — 브라우저 설정에서 해제해야 합니다',
    default: '아직 요청하지 않음',
    unsupported: '이 브라우저는 웹 알림을 지원하지 않습니다',
  };

  const previewPush = () => {
    const seq: [string, string, string][] = [
      ['곧 경기 시작', '경기 시작 10분 전에 이렇게 알려드립니다', '미리보기'],
      prefs.spoiler
        ? ['경기 종료', '결과를 확인하려면 탭하세요', '스포일러 차단이 켜져 있을 때']
        : ['경기 종료', '세트 스코어가 제목에 그대로 표시됩니다', '스포일러 차단이 꺼져 있을 때'],
    ];
    if (favPlayer) seq.push([`${favPlayer.nm} 소식`, '지정한 선수 관련 소식만 따로 받습니다', '최애 선수 알림']);
    seq.forEach((s, i) => setTimeout(() => toast(...s), i * 900));
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
            if (k === 'spoiler')
              toast(
                !prefs[k] ? '스포일러 차단 켜짐' : '스포일러 차단 꺼짐',
                !prefs[k] ? '경기 결과가 가려집니다. 탭하면 볼 수 있어요.' : '경기 결과가 바로 표시됩니다.',
              );
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
    <div className="wrap sec">
      <h2 className="ko ptitle rv" style={{ marginBottom: 'var(--s5)' }}>
        알림 설정
      </h2>

      {iosHint && (
        <div className="banner rv" style={{ marginBottom: 'var(--s5)' }}>
          <div>
            <b>아이폰은 홈 화면에 추가해야 알림이 옵니다</b>
            <span>
              공유 ↑ → 홈 화면에 추가 → 앱 아이콘으로 실행. iOS는 PWA 설치 상태에서만 웹 푸시를 허용합니다.
            </span>
          </div>
        </div>
      )}

      <div className="card rv" style={{ marginBottom: 'var(--s5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <b style={{ fontSize: 15 }}>브라우저 알림 권한</b>
            <div className="cap">{permText[permission] ?? permission}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={ask}>
              <Bell size={14} />
              권한 요청
            </button>
            <button className="btn btn-primary btn-sm" onClick={previewPush}>
              <Eye size={14} />
              알림 미리보기
            </button>
          </div>
        </div>
      </div>

      <div className="card rv" style={{ marginBottom: 'var(--s5)' }}>
        <h3 className="grouphead">경기</h3>
        {PREFS.filter((p) => p.g === 'match').map((p) => (
          <Row key={p.k} k={p.k} t={p.t} d={p.d} lead={'lead' in p ? p.lead : undefined} />
        ))}
      </div>

      <div className="card rv" style={{ marginBottom: 'var(--s5)' }}>
        <h3 className="grouphead">기타</h3>
        {PREFS.filter((p) => p.g === 'etc').map((p) => (
          <Row key={p.k} k={p.k} t={p.t} d={p.d} />
        ))}
      </div>

      <div className="card rv">
        <h3 className="grouphead">내 정보</h3>
        <p className="cap" style={{ marginBottom: 'var(--s4)' }}>
          {favPlayer ? `최애 선수 · ${favPlayer.nm} (${favPlayer.ko})` : '최애 선수를 지정하지 않았습니다.'}
          <br />
          알림 설정 · 최애 선수 · 승부예측은 <b style={{ color: 'var(--ink)' }}>이 브라우저에만</b> 저장되며 서버로
          전송되지 않습니다.
        </p>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            resetState();
            toast('설정을 초기화했습니다', '알림 설정 · 최애 선수 · 예측 기록이 모두 지워졌습니다.');
          }}
        >
          <RotateCcw size={14} />
          저장된 설정 지우기
        </button>
      </div>
    </div>
  );
}
