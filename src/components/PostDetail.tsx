'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Flag, Send, Trash2, UserX } from 'lucide-react';
import {
  getPost,
  listComments,
  createComment,
  deletePost,
  reportContent,
  blockUser,
  blockedIds,
  useAccount,
  type Comment,
  type Post,
} from '@/lib/hleapi';
import { CategoryTag, iso, relative } from './Board';

/** 앱 PostDetailView 와 같은 구성: 본문 카드 · 댓글 · 아래 고정 입력창 */
export default function PostDetail({ id }: { id: string }) {
  const router = useRouter();
  const { user } = useAccount();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [missing, setMissing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [p, c] = await Promise.all([getPost(id), listComments(id)]);
        if (!alive) return;
        setPost(p);
        setComments(c);
      } catch {
        if (alive) setMissing(true);
      }
      const b = user ? await blockedIds().catch(() => new Set<string>()) : new Set<string>();
      if (alive) setBlocked(b);
    })();
    return () => {
      alive = false;
    };
  }, [id, user, reload]);

  const need = () => {
    if (user) return true;
    if (confirm('로그인이 필요해요. MY 탭으로 갈까요?')) router.push('/me');
    return false;
  };

  const report = async (target: { post?: string; comment?: string }) => {
    if (!need()) return;
    const reason = prompt('신고 사유를 적어 주세요 (운영자가 확인 후 가립니다)');
    if (!reason?.trim()) return;
    await reportContent(target, reason.trim().slice(0, 200)).then(
      () => alert('신고했어요'),
      () => alert('신고하지 못했어요')
    );
  };

  const block = async (author: string, name: string) => {
    if (!need() || !confirm(`${name} 님의 글과 댓글을 더 이상 보지 않을까요?`)) return;
    await blockUser(author).catch(() => {});
    setReload((n) => n + 1);
  };

  const send = async () => {
    if (!need() || !draft.trim()) return;
    setBusy(true);
    try {
      await createComment(id, draft.trim());
      setDraft('');
      setReload((n) => n + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : '댓글을 남기지 못했어요');
    }
    setBusy(false);
  };

  if (missing)
    return (
      <div className="ui-page">
        <div className="ui-paper ui-empty">
          <b>글을 찾을 수 없어요</b>
          <Link href="/board">게시판으로</Link>
        </div>
      </div>
    );
  if (!post) return <div className="ui-page"><div className="ui-paper ui-empty">불러오는 중…</div></div>;

  const name = post.expand?.author?.nickname || '탈퇴한 팬';
  const mine = user?.id === post.author;
  const shown = comments.filter((c) => !blocked.has(c.author));

  return (
    <div className="ui-page ui-postpage">
      <Link href="/board" className="ui-back">
        <ChevronLeft size={18} /> 게시판
      </Link>

      <article className="ui-paper ui-article">
        <CategoryTag k={post.category} />
        <h1>{post.title}</h1>
        <span className="cap">
          {name} · {relative(iso(post.created))}
        </span>
        <p>{post.body}</p>
        <div className="ui-actions">
          {mine ? (
            <button
              onClick={async () => {
                if (!confirm('이 글을 지울까요?')) return;
                await deletePost(post.id).then(() => router.push('/board'), () => alert('지우지 못했어요'));
              }}
            >
              <Trash2 size={14} /> 삭제
            </button>
          ) : (
            <>
              <button onClick={() => report({ post: post.id })}>
                <Flag size={14} /> 신고
              </button>
              <button onClick={() => block(post.author, name)}>
                <UserX size={14} /> 차단
              </button>
            </>
          )}
        </div>
      </article>

      <div className="ui-section-label">댓글 {shown.length}</div>
      {shown.length > 0 && (
        <div className="ui-paper ui-list">
          {shown.map((c) => {
            const n = c.expand?.author?.nickname || '탈퇴한 팬';
            return (
              <div key={c.id} className="ui-comment">
                <div>
                  <b>{n}</b>
                  <span className="cap">{relative(iso(c.created))}</span>
                  {user?.id !== c.author && (
                    <button onClick={() => report({ comment: c.id })} aria-label="댓글 신고">
                      <Flag size={12} />
                    </button>
                  )}
                </div>
                <p>{c.body}</p>
              </div>
            );
          })}
        </div>
      )}

      <form
        className="ui-composer glass-bar"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input value={draft} maxLength={1000} onChange={(e) => setDraft(e.target.value)} placeholder={user ? '댓글 달기' : '로그인하고 댓글 달기'} onFocus={() => !user && need()} />
        <button disabled={busy || !draft.trim()} aria-label="보내기">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
