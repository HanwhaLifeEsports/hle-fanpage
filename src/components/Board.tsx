'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Ki } from './IconSprite';
import { toast } from '@/lib/useDemoState';
import { matchInLiveWindow, nextMatch } from '@/lib/lck2026';

/* ---------------- 글 저장소 (데모: 메모리) ---------------- */

export interface Post {
  id: number;
  bd: string;
  ti: string;
  by: string;
  ago: string;
  likes: number;
  cmts: number;
  body: string;
}

export const BOARDS = ['경기후기', '자유', '짤', '직관모임'] as const;

let posts: Post[] = [
  { id: 1, bd: '경기후기', ti: 'Kanavi 합류하고 정글 동선이 확 달라졌다', by: '분석충', ago: '12분 전', likes: 342, cmts: 88, body: '초반 갱 루트가 작년이랑 완전히 다름. 탑 개입 빈도가 눈에 띄게 늘었다.' },
  { id: 2, bd: '자유', ti: '구마유시 유니폼 받았는데 사이즈 실화냐', by: '상암주민', ago: '38분 전', likes: 121, cmts: 47, body: '정사이즈로 시켰는데 한 치수 큰 느낌. 다음엔 줄여서 주문해야겠다.' },
  { id: 3, bd: '짤', ti: '제우스 궁 각 잡는 순간 벤치 리액션.gif', by: '짤장인', ago: '1시간 전', likes: 508, cmts: 63, body: '코치님 표정 보세요 ㅋㅋㅋㅋ' },
  { id: 4, bd: '직관모임', ti: '8/14 T1전 같이 보실 분 (롤파크 앞)', by: '같이가요', ago: '2시간 전', likes: 76, cmts: 29, body: '4시쯤 롤파크 앞에서 모여서 같이 들어가요. 현재 3명입니다.' },
  { id: 5, bd: '경기후기', ti: '제카 아지르 딜량 미쳤다 진짜', by: '불꽃징크스', ago: '3시간 전', likes: 203, cmts: 55, body: '한타 한 번에 딜 지분 40% 넘김. 체급 차이가 확실히 났다.' },
];

const psubs = new Set<() => void>();
const psub = (f: () => void) => {
  psubs.add(f);
  return () => void psubs.delete(f);
};
const usePosts = () => useSyncExternalStore(psub, () => posts, () => posts);

function addPost(p: Omit<Post, 'id'>) {
  posts = [{ ...p, id: Date.now() }, ...posts];
  psubs.forEach((f) => f());
}
function like(id: number) {
  posts = posts.map((p) => (p.id === id ? { ...p, likes: p.likes + 1 } : p));
  psubs.forEach((f) => f());
}

/* ---------------- 목록 행 ---------------- */

function Row({ p, onOpen }: { p: Post; onOpen: () => void }) {
  return (
    <button className="prow" onClick={onOpen}>
      <span className="bd">{p.bd}</span>
      <span className="ti">{p.ti}</span>
      <span className="st">
        <span>
          <Ki n="heart" />
          {p.likes}
        </span>
        <span>
          <Ki n="comment" />
          {p.cmts}
        </span>
      </span>
    </button>
  );
}

export function HotPosts() {
  const all = usePosts();
  const [open, setOpen] = useState<Post | null>(null);
  const hot = [...all].sort((a, b) => b.likes - a.likes).slice(0, 4);
  return (
    <>
      <div className="plist">
        {hot.map((p) => (
          <Row key={p.id} p={p} onOpen={() => setOpen(p)} />
        ))}
      </div>
      {open && <PostModal p={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function PostModal({ p, onClose }: { p: Post; onClose: () => void }) {
  const all = usePosts();
  const cur = all.find((x) => x.id === p.id) ?? p;
  return (
    <div className="ov" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-h">
          <b style={{ fontSize: 17, lineHeight: 1.35 }}>{cur.ti}</b>
          <button className="x" onClick={onClose} aria-label="닫기">
            <Ki n="close" size={15} />
          </button>
        </div>
        <div className="modal-b">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div className="avatar">{cur.by[0]}</div>
            <div>
              <b style={{ fontSize: 14 }}>{cur.by}</b>
              <div className="cap">
                {cur.bd} · {cur.ago}
              </div>
            </div>
          </div>
          <p className="bodytx" style={{ marginBottom: 20, whiteSpace: 'pre-wrap' }}>
            {cur.body}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => like(cur.id)}>
              <Ki n="heart" size={14} />
              추천 {cur.likes}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => toast('신고 접수', '관리자 검토 큐에 등록되었습니다.')}
            >
              신고
            </button>
          </div>
          <div className="note">댓글 {cur.cmts}개 — 데모에서는 생략했습니다.</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 라이브 채팅 ---------------- */

const NAMES = ['불꽃징크스', '상암주민', '짤장인', '분석충', '이글아이', '오렌지맛', '응원단장'];
const LINES = ['가자 한화!!', '오늘 밴픽 좋다', '카나비 갱각 나온다', '와 이거 각인데?', '드래곤 스택 챙기자',
  '구마 라인전 이겼다', '한타 각 보인다', '제카 궁 아껴라', '오늘 승률 좋다', '응원합니다 🔥'];

function LiveChat() {
  const [msgs, setMsgs] = useState<{ n: string; t: string; mine?: boolean }[]>([]);
  const [v, setV] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);
  const open = !!matchInLiveWindow();
  const next = nextMatch();

  useEffect(() => {
    if (!open) return;
    setMsgs(NAMES.slice(0, 6).map((n, i) => ({ n, t: LINES[i % LINES.length] })));
    const t = setInterval(() => {
      setMsgs((m) => [
        ...m.slice(-60),
        { n: NAMES[Math.floor(Math.random() * NAMES.length)], t: LINES[Math.floor(Math.random() * LINES.length)] },
      ]);
    }, 4200);
    return () => clearInterval(t);
  }, [open]);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [msgs]);

  if (!open) {
    return (
      <div className="note" style={{ marginTop: 0, marginBottom: 'var(--s6)' }}>
        <b>실시간 응원 채팅은 경기 시간에만 열립니다.</b> 다음 개방은{' '}
        {next ? new Date(next.kickoff).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }) : '미정'}{' '}
        기준 30분 전입니다. 상시 개방하면 대부분의 시간에 빈 방이 되어 &quot;죽은 사이트&quot; 인상을 줍니다.
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 'var(--s6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span className="badge b-live">
          <i className="dot" />
          LIVE
        </span>
        <b style={{ fontSize: 15 }}>실시간 응원 채팅</b>
      </div>
      <div className="chat" ref={boxRef}>
        <div className="msg sys">— 경기 30분 전, 응원 채팅방이 열렸습니다 —</div>
        {msgs.map((m, i) => (
          <div className={`msg${m.mine ? ' mine' : ''}`} key={i}>
            <b>{m.n}</b>
            {m.t}
          </div>
        ))}
      </div>
      <form
        className="chatbar"
        onSubmit={(e) => {
          e.preventDefault();
          if (!v.trim()) return;
          setMsgs((m) => [...m, { n: '데모유저', t: v.trim(), mine: true }]);
          setV('');
        }}
      >
        <input value={v} onChange={(e) => setV(e.target.value)} placeholder="응원 메시지를 남겨보세요" maxLength={80} />
        <button className="btn btn-primary btn-sm" type="submit">
          전송
        </button>
      </form>
    </div>
  );
}

/* ---------------- 커뮤니티 화면 ---------------- */

export default function BoardView() {
  const all = usePosts();
  const [f, setF] = useState<string>('all');
  const [open, setOpen] = useState<Post | null>(null);
  const [writing, setWriting] = useState(false);
  const [form, setForm] = useState({ bd: BOARDS[0] as string, ti: '', body: '' });

  const list = all.filter((p) => f === 'all' || p.bd === f);

  return (
    <div className="wrap sec">
      <div className="shead">
        <h2 className="ko ptitle">커뮤니티</h2>
        <button className="btn btn-primary btn-sm" onClick={() => setWriting(true)}>
          글쓰기
        </button>
      </div>

      <LiveChat />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--s4)' }}>
        {['all', ...BOARDS].map((b) => (
          <button key={b} className={`chip${f === b ? ' on' : ''}`} onClick={() => setF(b)}>
            {b === 'all' ? '전체' : b}
          </button>
        ))}
      </div>

      <div className="plist">
        {list.length ? (
          list.map((p) => <Row key={p.id} p={p} onOpen={() => setOpen(p)} />)
        ) : (
          <div className="note" style={{ margin: 0 }}>
            이 게시판에 글이 아직 없습니다.
          </div>
        )}
      </div>

      {open && <PostModal p={open} onClose={() => setOpen(null)} />}

      {writing && (
        <div className="ov" onClick={(e) => e.target === e.currentTarget && setWriting(false)}>
          <div className="modal">
            <div className="modal-h">
              <b style={{ fontSize: 17 }}>글쓰기</b>
              <button className="x" onClick={() => setWriting(false)} aria-label="닫기">
                <Ki n="close" size={15} />
              </button>
            </div>
            <div className="modal-b">
              <label className="fl">게시판</label>
              <select
                value={form.bd}
                onChange={(e) => setForm({ ...form, bd: e.target.value })}
                style={{ marginBottom: 14 }}
              >
                {BOARDS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
              <label className="fl">제목</label>
              <input
                type="text"
                value={form.ti}
                onChange={(e) => setForm({ ...form, ti: e.target.value })}
                placeholder="제목을 입력하세요"
                style={{ marginBottom: 14 }}
              />
              <label className="fl">내용</label>
              <textarea
                rows={5}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="내용을 입력하세요"
                style={{ marginBottom: 16 }}
              />
              <button
                className="btn btn-primary btn-block"
                onClick={() => {
                  if (!form.ti.trim()) return toast('제목을 입력해 주세요', '');
                  addPost({
                    bd: form.bd,
                    ti: form.ti.trim(),
                    by: '데모유저',
                    ago: '방금',
                    likes: 0,
                    cmts: 0,
                    body: form.body.trim() || '(내용 없음)',
                  });
                  setForm({ bd: BOARDS[0], ti: '', body: '' });
                  setWriting(false);
                  setF('all');
                  toast('글이 등록되었습니다', form.ti.trim());
                }}
              >
                등록
              </button>
              <div className="note">
                데모라 브라우저 메모리에만 저장됩니다. 실제로는 신고·금칙어 필터·신규계정 레이트리밋이 함께
                붙습니다.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
