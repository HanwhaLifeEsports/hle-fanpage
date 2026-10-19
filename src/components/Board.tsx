'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SquarePen, Search, X } from 'lucide-react';
import {
  POST_CATEGORIES,
  categoryLabel,
  listPosts,
  createPost,
  blockedIds,
  useAccount,
  type Post,
  type PostCategory,
} from '@/lib/hleapi';
import AccountPanel from './Account';
import TeamLogo from './TeamLogo';
import Sheet from './Sheet';

export interface ThreadMatch {
  start: string;
  usImage: string | null;
  them: { code: string; image: string | null; name: string };
}

const KST = 'Asia/Seoul';
const shortWhen = (iso: string) =>
  new Intl.DateTimeFormat('ko-KR', { timeZone: KST, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));

/** 앱과 같은 상대 시간 (방금 · n분 전 · n시간 전 · n일 전 · 날짜) */
export function relative(iso: string) {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return '방금';
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}일 전`;
  return new Intl.DateTimeFormat('ko-KR', { timeZone: KST, month: 'numeric', day: 'numeric' }).format(new Date(iso));
}

export const CategoryTag = ({ k }: { k: string }) => <span className={`ui-cat${k === 'match' ? ' hot' : ''}`}>{categoryLabel(k)}</span>;

/** PocketBase 시각("2026-10-19 12:00:00.000Z")을 Date 가 읽을 수 있게 */
export const iso = (pb: string) => pb.replace(' ', 'T');

/** 앱 게시판과 같은 구성: 분류 칩 · 검색 · 경기 스레드 · 글 목록 · 글쓰기 버튼 */
export default function BoardView({ thread }: { thread: ThreadMatch | null }) {
  const { user } = useAccount();
  const [cat, setCat] = useState<PostCategory | null>(null);
  const [search, setSearch] = useState('');
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [composing, setComposing] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    // 검색어를 칠 때마다 요청하지 않도록 잠깐 기다린다
    const t = setTimeout(async () => {
      try {
        const list = await listPosts(cat, search);
        if (!alive) return;
        setPosts(list);
        setFailed(false);
      } catch {
        if (alive) setFailed(true);
      }
      const b = user ? await blockedIds().catch(() => new Set<string>()) : new Set<string>();
      if (alive) setBlocked(b);
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [cat, search, user, reload]);

  const visible = (posts ?? []).filter((p) => !blocked.has(p.author));

  return (
    <div className="ui-page">
      <h1 className="ui-title">게시판</h1>

      <label className="ui-search glass-bar">
        <Search size={16} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="글 제목 검색" enterKeyHint="search" />
        {search && (
          <button onClick={() => setSearch('')} aria-label="검색어 지우기">
            <X size={14} />
          </button>
        )}
      </label>

      <div className="ui-chips" role="tablist" aria-label="분류">
        {[{ k: null, t: '전체' }, ...POST_CATEGORIES].map((c) => (
          <button key={c.k ?? 'all'} role="tab" aria-selected={cat === c.k} className={cat === c.k ? 'on' : undefined} onClick={() => setCat(c.k)}>
            {c.t}
          </button>
        ))}
      </div>

      {thread && (
        <Link href="/live" className="ui-thread">
          <div className="ui-head">
            <span className="ui-badge glass">경기 스레드</span>
            <span>{shortWhen(thread.start)}</span>
          </div>
          <div className="ui-thread-mid">
            <TeamLogo image={thread.usImage} size={44} label="한화생명e스포츠" />
            <i>vs</i>
            <TeamLogo image={thread.them.image} size={44} label={thread.them.name} />
            <b>HLE vs {thread.them.code} 같이 봐요</b>
          </div>
          <span className="ui-thread-cap">중계 탭에서 영상 보면서 실시간으로 채팅해요</span>
        </Link>
      )}

      {posts === null && !failed ? (
        <div className="ui-paper ui-empty">불러오는 중…</div>
      ) : visible.length === 0 ? (
        <div className="ui-paper ui-empty">
          <b>{failed ? '글을 불러오지 못했어요' : '아직 글이 없어요'}</b>
          <span>{failed ? '잠시 뒤 다시 시도해 주세요' : '첫 글을 남겨 보세요'}</span>
        </div>
      ) : (
        <div className="ui-paper ui-list ui-posts">
          {visible.map((p) => (
            <Link key={p.id} href={`/board/${p.id}`} className="ui-post">
              <CategoryTag k={p.category} />
              <b>{p.title}</b>
              <span className="cap">
                {p.expand?.author?.nickname || '탈퇴한 팬'} · {relative(iso(p.created))} · 댓글 {p.comment_count ?? 0}
              </span>
            </Link>
          ))}
        </div>
      )}

      <button className="ui-fab" onClick={() => setComposing(true)} aria-label="글쓰기">
        <SquarePen size={22} />
      </button>

      {composing && (
        <Sheet title={user ? '글쓰기' : '로그인이 필요해요'} onClose={() => setComposing(false)}>
          {user ? (
            <Compose
              initial={cat ?? 'chat'}
              onDone={() => {
                setComposing(false);
                setReload((n) => n + 1);
              }}
            />
          ) : (
            <AccountPanel />
          )}
        </Sheet>
      )}
    </div>
  );
}

function Compose({ initial, onDone }: { initial: PostCategory; onDone: () => void }) {
  const [cat, setCat] = useState<PostCategory>(initial);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ok = title.trim().length > 0 && body.trim().length > 0 && !busy;

  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      await createPost(cat, title.trim(), body.trim());
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : '올리지 못했어요');
      setBusy(false);
    }
  };

  return (
    <div className="ui-compose">
      <div className="ui-chips">
        {POST_CATEGORIES.map((c) => (
          <button key={c.k} className={cat === c.k ? 'on' : undefined} onClick={() => setCat(c.k)}>
            {c.t}
          </button>
        ))}
      </div>
      <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="제목" />
      <textarea value={body} maxLength={5000} rows={8} onChange={(e) => setBody(e.target.value)} placeholder="내용 — 욕설·비방·도배는 신고되면 가려져요" />
      {err && <span className="ui-err">{err}</span>}
      <button className="ui-cta" disabled={!ok} onClick={submit}>
        {busy ? '올리는 중…' : '올리기'}
      </button>
    </div>
  );
}
