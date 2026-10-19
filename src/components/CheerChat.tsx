'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';
import { toast } from '@/lib/useAppState';
import {
  ApiError,
  blockUser,
  blockedIds,
  recentChat,
  reportChat,
  sendChat,
  subscribeChat,
  useAccount,
  type ChatMessage,
} from '@/lib/hleapi';

/** 서버(chat.go)와 같은 창: 킥오프 1시간 전 ~ 6시간 뒤 */
const OPEN_BEFORE = 60 * 60_000;
const CLOSE_AFTER = 6 * 60 * 60_000;

/**
 * 경기 응원 채팅. iOS 앱과 같은 방이라 앱·웹 사용자가 함께 이야기한다.
 * 메시지는 서버 실시간 구독(SSE)으로 받는다. 신고·차단은 메시지를 길게 누르거나 ⋯ 로.
 */
export default function CheerChat({ matchId, kickoff }: { matchId: string; kickoff: string }) {
  const { user } = useAccount();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const listRef = useRef<HTMLDivElement>(null);

  const start = Date.parse(kickoff);
  const open = now >= start - OPEN_BEFORE && now <= start + CLOSE_AFTER;

  // 열리는 순간을 놓치지 않게 1분마다 시각을 갱신한다
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    recentChat(matchId)
      .then((m) => alive && setMessages(m))
      .catch(() => {});
    const stop = subscribeChat(
      matchId,
      (action, msg) =>
        setMessages((cur) => {
          if (action === 'delete') return cur.filter((m) => m.id !== msg.id);
          if (cur.some((m) => m.id === msg.id)) return cur;
          return [...cur, msg].slice(-300);
        }),
      (ok) => alive && setConnected(ok),
    );
    return () => {
      alive = false;
      stop();
    };
  }, [matchId, open]);

  useEffect(() => {
    if (user) blockedIds().then(setBlocked).catch(() => {});
  }, [user]);

  // 로그아웃하면 차단 목록은 적용하지 않는다 (차단은 계정에 묶여 있다)
  const visible = useMemo(
    () => (user ? messages.filter((m) => !blocked.has(m.author)) : messages),
    [messages, blocked, user],
  )

  // 새 메시지가 오면 맨 아래로. 위로 스크롤해서 읽는 중이면 끌어내리지 않는다
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) el.scrollTop = el.scrollHeight;
  }, [visible.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await sendChat(matchId, body.slice(0, 200));
      setDraft('');
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      toast(status === 429 ? '조금 천천히 보내 주세요' : status === 400 ? '지금은 채팅이 열려 있지 않습니다' : '보내지 못했습니다', '', '응원 채팅');
    } finally {
      setSending(false);
    }
  };

  const menu = async (m: ChatMessage) => {
    if (!user || m.author === user.id) return;
    const choice = prompt(`${m.expand?.author?.nickname ?? '팬'}: "${m.body}"\n\n1 = 신고, 2 = 이 사람 차단`);
    try {
      if (choice === '1') {
        await reportChat(m.id);
        toast('신고를 접수했습니다', '24시간 안에 확인합니다', '응원 채팅');
      } else if (choice === '2') {
        await blockUser(m.author);
        setBlocked((b) => new Set(b).add(m.author));
      }
    } catch {
      toast('처리하지 못했습니다', '', '응원 채팅');
    }
  };

  if (!open) {
    return (
      <div className="cheer off">
        <b>응원 채팅</b>
        <span className="cap">
          {now < start ? '경기 1시간 전부터 앱·웹 팬들과 함께 채팅할 수 있습니다' : '이 경기의 채팅은 닫혔습니다'}
        </span>
      </div>
    );
  }

  return (
    <div className="cheer">
      <div className="cheer-head">
        <b>응원 채팅</b>
        <i className={`cheer-dot${connected ? ' on' : ''}`} aria-label={connected ? '연결됨' : '연결 중'} />
        <span className="cap" style={{ marginLeft: 'auto' }}>
          앱·웹 함께 · {visible.length}
        </span>
      </div>
      <div className="cheer-list" ref={listRef} aria-live="polite">
        {visible.length === 0 && <div className="cap cheer-empty">첫 응원을 남겨 보세요</div>}
        {visible.map((m) => (
          <div
            key={m.id}
            className={`cheer-msg${user && m.author === user.id ? ' mine' : ''}`}
            onContextMenu={(e) => {
              e.preventDefault();
              void menu(m);
            }}
          >
            <b>{m.expand?.author?.nickname || '팬'}</b>
            <span>{m.body}</span>
            {user && m.author !== user.id && (
              <button className="cheer-more" aria-label="신고 또는 차단" onClick={() => void menu(m)}>
                ⋯
              </button>
            )}
          </div>
        ))}
      </div>
      {user ? (
        <form
          className="cheer-form"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <input
            value={draft}
            maxLength={200}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={user.nickname ? '응원 한마디' : 'MY에서 닉네임을 먼저 정해 주세요'}
            disabled={!user.nickname}
            enterKeyHint="send"
          />
          <button className="btn btn-primary btn-sm" disabled={!draft.trim() || sending || !user.nickname} aria-label="보내기">
            <Send size={15} />
          </button>
        </form>
      ) : (
        <div className="cheer-form">
          <Link className="btn btn-ghost btn-sm" href="/me" style={{ width: '100%' }}>
            로그인하고 같이 응원하기
          </Link>
        </div>
      )}
    </div>
  );
}
