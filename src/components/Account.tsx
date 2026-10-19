'use client';

import { useEffect, useRef, useState } from 'react';
import { LogOut, UserX } from 'lucide-react';
import Sheet from './Sheet';
import { PLAYERS } from '@/lib/lck2026';
import { warn } from '@/lib/useAppState';
import {
  GOOGLE_WEB_CLIENT_ID,
  deleteAccount,
  kakaoAuthorizeUrl,
  loginWithGoogle,
  logout,
  myPredictions,
  refreshAccount,
  updateProfile,
  useAccount,
  type Account,
} from '@/lib/hleapi';

/** 카카오 로그인 후 돌아올 주소. 서버(api.hle.today)와 카카오 콘솔에 같은 값이 등록돼 있어야 한다 */
export const kakaoRedirectUri = () => `${location.origin}/auth/kakao`;

/** 로그인 뒤 돌아갈 페이지를 기억해 둔다 (카카오는 페이지를 떠났다 돌아오므로) */
export const RETURN_KEY = 'hle-login-return';

export function startKakaoLogin() {
  const state = crypto.randomUUID();
  try {
    sessionStorage.setItem('hle-kakao-state', state);
    sessionStorage.setItem(RETURN_KEY, location.pathname + location.search);
  } catch {}
  location.href = kakaoAuthorizeUrl(kakaoRedirectUri(), state);
}

type GoogleId = {
  accounts: {
    id: {
      initialize: (o: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }) => void;
      renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
    };
  };
};

/**
 * 구글 로그인 버튼.
 * 구글 위젯(iframe)은 글꼴·크기를 바꿀 수 없어 카카오 버튼과 어긋난다. 그래서 보이는 버튼은
 * 직접 그리고, 실제로 눌리는 구글 위젯은 그 위에 투명하게 겹쳐 둔다 (ID 토큰 흐름은 그대로).
 */
function GoogleButton({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const render = () => {
      const g = (window as unknown as { google?: GoogleId }).google;
      if (!alive || !g || !ref.current) return;
      g.accounts.id.initialize({
        client_id: GOOGLE_WEB_CLIENT_ID,
        callback: async ({ credential }) => {
          try {
            await loginWithGoogle(credential);
            onDone();
          } catch {
            warn('구글 로그인에 실패했습니다', '잠시 뒤 다시 시도해 주세요');
          }
        },
      });
      g.accounts.id.renderButton(ref.current, {
        size: 'large',
        text: 'continue_with',
        locale: 'ko',
        width: Math.min(400, Math.round(ref.current.getBoundingClientRect().width) || 320),
      });
    };
    if ((window as unknown as { google?: GoogleId }).google) render();
    else {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = render;
      document.head.appendChild(s);
    }
    return () => {
      alive = false;
    };
  }, [onDone]);

  return (
    <div className="acct-btn acct-google">
      <GoogleSymbol />
      Google로 계속하기
      <div ref={ref} className="acct-google-hit" />
    </div>
  );
}

/** 구글 공식 G 로고 */
function GoogleSymbol() {
  return (
    <svg className="acct-sym" viewBox="0 0 48 48" width="20" height="20" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** 카카오 공식 말풍선 심볼 */
function KakaoSymbol() {
  return (
    <svg className="acct-sym" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="#000"
        d="M12 3.2C6.6 3.2 2.2 6.6 2.2 10.9c0 2.8 1.9 5.2 4.7 6.6l-1 3.6c-.1.3.3.6.6.4l4.3-2.8c.4 0 .8.1 1.2.1 5.4 0 9.8-3.4 9.8-7.8S17.4 3.2 12 3.2z"
      />
    </svg>
  );
}

/** 카카오 · 구글 로그인 버튼 (MY·게시판·채팅의 로그인 시트 안에 들어간다) */
export default function AccountPanel() {
  return (
    <div className="ui-login">
      {/* 카카오 로그인 디자인 가이드: 노란 바탕(#FEE500) + 검은 말풍선 심볼 + 85% 검정 글자 */}
      <button className="acct-btn acct-kakao" onClick={startKakaoLogin}>
        <KakaoSymbol />
        카카오로 계속하기
      </button>
      <GoogleButton onDone={() => {}} />
    </div>
  );
}

/** MY 화면 맨 위의 주황 유리 카드 (앱 profileCard 와 같은 구성) */
export function ProfileCard() {
  const { user } = useAccount();
  const [sheet, setSheet] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    void refreshAccount();
  }, []);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    myPredictions().then(
      (l) => alive && setCount(l.length),
      () => {}
    );
    return () => {
      alive = false;
    };
  }, [user]);

  const fav = user ? PLAYERS.find((p) => p.id === user.favorite_player) : null;

  return (
    <>
      <div className="ui-profile">
        {user ? (
          <>
            <div className="ui-profile-top">
              <span className="ui-avatar">{(user.nickname || '팬').slice(0, 1)}</span>
              <div>
                <b>{user.nickname || '닉네임 없음'}</b>
                {fav && <span className="ui-fav">최애 {fav.nm}</span>}
              </div>
              <button className="ui-pill glass" onClick={() => setSheet(true)}>
                편집
              </button>
            </div>
            <div className="ui-profile-stats">
              <div className="glass">
                <span>참여한 예측</span>
                <b>{count ?? '-'}</b>
              </div>
              <div className="glass">
                <span>최애 선수</span>
                <b>{fav ? fav.nm : '-'}</b>
              </div>
            </div>
          </>
        ) : (
          <>
            <b className="ui-profile-cta">게스트</b>
            <button className="ui-solid" onClick={() => setSheet(true)}>
              로그인
            </button>
          </>
        )}
      </div>
      {sheet && (
        <Sheet title={user ? '프로필 편집' : '로그인'} onClose={() => setSheet(false)}>
          {user ? <ProfileForm key={`${user.id}:${user.nickname}:${user.favorite_player}`} user={user} onDone={() => setSheet(false)} /> : <AccountPanel />}
        </Sheet>
      )}
    </>
  );
}

/** 로그아웃 · 계정 삭제 줄 (MY 맨 아래 계정 카드) */
export function AccountActions() {
  const { user } = useAccount();
  if (!user) return null;
  return (
    <>
      <button className="ui-row" onClick={logout}>
        <LogOut size={16} /> 로그아웃
      </button>
      <button
        className="ui-row danger"
        onClick={async () => {
          if (!confirm('계정을 삭제할까요? 예측 기록·글·댓글·채팅이 모두 지워지고 되돌릴 수 없습니다.')) return;
          try {
            await deleteAccount();
          } catch {
            warn('삭제하지 못했습니다', '잠시 뒤 다시 시도해 주세요');
          }
        }}
      >
        <UserX size={16} /> 계정 삭제
      </button>
    </>
  );
}

function ProfileForm({ user, onDone }: { user: Account; onDone: () => void }) {
  const [nick, setNick] = useState(user.nickname ?? '');
  const [fav, setFav] = useState<string | null>(user.favorite_player || null);
  const [saving, setSaving] = useState(false);
  const valid = nick.trim().length >= 2 && nick.trim().length <= 16;

  return (
    <div className="ui-compose">
      <label className="ui-field">
        <span>닉네임 · 2~16자, 게시판·채팅에 보여요</span>
        <input value={nick} maxLength={16} onChange={(e) => setNick(e.target.value)} placeholder="닉네임" />
      </label>
      <span className="ui-field">
        <span>최애 선수</span>
      </span>
      <div className="ui-chips">
        {PLAYERS.map((p) => (
          <button key={p.id} className={fav === p.id ? 'on' : undefined} aria-pressed={fav === p.id} onClick={() => setFav(fav === p.id ? null : p.id)}>
            {p.nm}
          </button>
        ))}
      </div>
      <button
        className="ui-cta"
        disabled={!valid || saving}
        onClick={async () => {
          setSaving(true);
          try {
            await updateProfile(nick.trim(), fav);
            onDone();
          } catch {
            warn('저장하지 못했습니다', '이미 쓰는 닉네임일 수 있습니다');
            setSaving(false);
          }
        }}
      >
        {saving ? '저장하는 중…' : '저장'}
      </button>
    </div>
  );
}
