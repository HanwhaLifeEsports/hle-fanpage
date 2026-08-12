'use client';

import { useEffect, useState } from 'react';
import { PLAYERS } from '@/lib/lck2026';
import { PREFS, patchState, resetState, toast, useApp, useNotify } from '@/lib/useAppState';

export default function MePage() {
  const { prefs, fav, setPref } = useApp();
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

  const Row = ({ k, t, d }: { k: string; t: string; d: string }) => (
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
  );

  return (
    <div className="wrap sec">
      <h2 className="ko ptitle" style={{ marginBottom: 'var(--s5)' }}>
        알림 설정
      </h2>

      {iosHint && (
        <div className="banner" style={{ marginBottom: 'var(--s5)' }}>
          <div>
            <b>아이폰은 홈 화면에 추가해야 알림이 옵니다</b>
            <span>
              공유 ↑ → 홈 화면에 추가 → 앱 아이콘으로 실행. iOS는 PWA 설치 상태에서만 웹 푸시를 허용합니다.
            </span>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: 'var(--s5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <b style={{ fontSize: 15 }}>브라우저 알림 권한</b>
            <div className="cap">{permText[permission] ?? permission}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={ask}>
              권한 요청
            </button>
            <button className="btn btn-primary btn-sm" onClick={previewPush}>
              알림 미리보기
            </button>
          </div>
        </div>
        <div className="note">
          권한 요청은 사용자가 <b>버튼을 누른 뒤에만</b> 띄웁니다. 진입 즉시 요청하면 거절률이 크게 오르고, 한 번
          거절당하면 되돌리기 어렵습니다.
        </div>
      </div>

      <div className="card" style={{ marginBottom: 'var(--s5)' }}>
        <h3 className="grouphead">경기</h3>
        {PREFS.filter((p) => p.g === 'match').map((p) => (
          <Row key={p.k} k={p.k} t={p.t} d={p.d} />
        ))}
      </div>

      <div className="card" style={{ marginBottom: 'var(--s5)' }}>
        <h3 className="grouphead">기타</h3>
        {PREFS.filter((p) => p.g === 'etc').map((p) => (
          <Row key={p.k} k={p.k} t={p.t} d={p.d} />
        ))}
      </div>

      <div className="card">
        <h3 className="grouphead">내 정보</h3>
        <p className="cap" style={{ marginBottom: 'var(--s4)' }}>
          {favPlayer ? `최애 선수 · ${favPlayer.nm} (${favPlayer.ko})` : '최애 선수를 지정하지 않았습니다.'}
          <br />
          알림 설정 · 최애 선수 · 승부예측은 <b style={{ color: '#fff' }}>이 브라우저에만</b> 저장되며 서버로
          전송되지 않습니다.
        </p>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            resetState();
            toast('설정을 초기화했습니다', '알림 설정 · 최애 선수 · 예측 기록이 모두 지워졌습니다.');
          }}
        >
          저장된 설정 지우기
        </button>
      </div>
    </div>
  );
}
