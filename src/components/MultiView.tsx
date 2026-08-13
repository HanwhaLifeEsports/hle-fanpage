'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Plus, Search } from 'lucide-react';
import StreamTile from './StreamTile';
import { parseChannelId, type ChzzkChannel } from '@/lib/chzzk';
import { CHANNELS } from '@/lib/lck2026';

const KEY = 'hle-multi-v1';

/* 채널 목록은 모듈 스토어로 둔다.
   저장값 복원을 이펙트 안의 setState 로 하면 렌더가 연쇄로 도는 패턴이 되어,
   프로젝트의 다른 저장소(useAppState)와 같은 외부 스토어 방식으로 맞췄다. */
const DEFAULT_IDS: string[] = Object.freeze([CHANNELS.chzzk]) as string[];
let channelIds: string[] = DEFAULT_IDS;
let hydrated = false;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const subscribeIds = (f: () => void) => {
  subs.add(f);
  return () => void subs.delete(f);
};
const snapshotIds = () => channelIds;

function writeIds(next: string[]) {
  channelIds = next;
  emit();
}
function hydrateIds() {
  if (hydrated) return;
  hydrated = true;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { ids?: string[] } | null;
    if (saved?.ids?.length) {
      channelIds = saved.ids;
      emit();
    }
  } catch {
    /* 깨진 저장값은 무시 */
  }
}

const NARROW = '(max-width: 860px)';
const isNarrow = () => window.matchMedia(NARROW).matches;
const subscribeNarrow = (cb: () => void) => {
  const mq = window.matchMedia(NARROW);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const MAX_DESKTOP = 4;
const MAX_MOBILE = 3;

export default function MultiView() {
  const ids = useSyncExternalStore(subscribeIds, snapshotIds, () => DEFAULT_IDS);
  // 소리 대상은 처음엔 없음. 음소거 상태여야 브라우저가 자동재생을 허용하고,
  // 소리를 켜는 클릭이 곧 자동재생 정책이 요구하는 사용자 제스처가 된다.
  const [audio, setAudio] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<ChzzkChannel[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // 모바일은 세로로 3개까지. 미디어쿼리는 외부 스토어라 구독으로 읽는다.
  const narrow = useSyncExternalStore(subscribeNarrow, isNarrow, () => false);

  // 소리 대상은 복원하지 않는다 — 사용자 제스처 없이 켜면 자동재생이 막힌다
  useEffect(hydrateIds, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ids }));
    } catch {
      /* 저장 실패는 조용히 */
    }
  }, [ids]);

  const cap = narrow ? MAX_MOBILE : MAX_DESKTOP;
  const shown = ids.slice(0, cap);
  const hidden = ids.length - shown.length;

  const add = useCallback(
    (id: string) => {
      setMsg(null);
      if (channelIds.includes(id)) setMsg('이미 추가된 채널입니다.');
      else if (channelIds.length >= MAX_DESKTOP) setMsg(`화면은 최대 ${MAX_DESKTOP}개까지입니다.`);
      else writeIds([...channelIds, id]);
      setQ('');
      setHits(null);
    },
    [],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    const id = parseChannelId(v);
    if (id) {
      add(id);
      return;
    }
    // URL 이 아니면 이름으로 검색한다
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/chzzk/search?q=${encodeURIComponent(v)}`, { cache: 'no-store' });
      const d = (await r.json()) as { channels: ChzzkChannel[] };
      setHits(d.channels);
      if (!d.channels.length) setMsg('검색 결과가 없습니다.');
    } catch {
      setMsg('검색에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const remove = (id: string) => {
    if (audio === id) setAudio(null);
    writeIds(channelIds.filter((x) => x !== id));
  };

  return (
    <div className="wrap sec">
      <h2 className="ko ptitle">멀티뷰</h2>
      <p className="lede" style={{ margin: '10px 0 var(--s5)' }}>
        치지직 채널을 최대 {MAX_DESKTOP}개까지 동시에 봅니다. 소리는 고른 화면 하나에서만 나오고,
        화면이 하나일 때는 PiP 와 전체화면을 쓸 수 있습니다.
      </p>

      <form className="addbar" onSubmit={submit}>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="치지직 주소를 붙여넣거나 채널 이름을 검색하세요"
          aria-label="채널 주소 또는 이름"
        />
        <button className="btn btn-primary btn-sm" type="submit" disabled={busy || !q.trim()}>
          {parseChannelId(q) ? <Plus size={15} /> : <Search size={15} />}
          {parseChannelId(q) ? '추가' : '검색'}
        </button>
      </form>

      {msg && <p className="cap" style={{ marginTop: 8 }}>{msg}</p>}

      {hits && hits.length > 0 && (
        <div className="hits">
          {hits.map((c) => (
            <button key={c.channelId} className="hit" onClick={() => add(c.channelId)}>
              <b>{c.channelName}</b>
              <span>
                {c.openLive ? '방송 중' : '오프라인'}
                {c.followerCount != null ? ` · 팔로워 ${c.followerCount.toLocaleString()}` : ''}
              </span>
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <div className="empty" style={{ marginTop: 'var(--s5)' }}>
          <b>화면이 없습니다</b>
          <span>위에 치지직 주소를 붙여넣거나 채널 이름을 검색해 추가하세요.</span>
        </div>
      ) : (
        <div className="grid-multi" data-n={shown.length} style={{ marginTop: 'var(--s5)' }}>
          {shown.map((id) => (
            <StreamTile
              key={id}
              channelId={id}
              audioOn={audio === id}
              onAudio={() => setAudio(id)}
              onRemove={() => remove(id)}
            />
          ))}
        </div>
      )}

      {hidden > 0 && (
        <p className="cap" style={{ marginTop: 12 }}>
          좁은 화면에서는 {MAX_MOBILE}개까지만 보여줍니다. {hidden}개는 가로가 넓은 화면에서 보입니다.
        </p>
      )}

      <div className="note">
        소리는 한 화면에서만 납니다. 화면 왼쪽 위의 채널 이름을 누르면 그쪽 소리로 바뀝니다. 브라우저가
        음소거 상태에서만 자동재생을 허용하기 때문에, 처음에는 모두 음소거로 시작합니다.
      </div>
    </div>
  );
}
