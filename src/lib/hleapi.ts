'use client';

import { useSyncExternalStore } from 'react';

/**
 * api.hle.today (PocketBase) 클라이언트. iOS 앱과 같은 서버·같은 계정을 쓴다.
 *
 * - 로그인은 카카오(인가 코드)·구글(id_token)을 서버의 /api/native-auth 로 넘겨 검증받는다.
 *   같은 카카오·구글 계정이면 앱에서 만든 계정에 그대로 붙는다.
 * - 로그인 토큰은 이 브라우저(localStorage)에만 둔다.
 * - 권한은 서버 규칙이 막는다. 여기서 넣는 user/author 값도 서버가 '본인이어야 한다'로 다시 확인한다.
 */

export const API_ORIGIN = process.env.NEXT_PUBLIC_HLE_API || 'https://api.hle.today';
export const KAKAO_REST_KEY = '06e8f3490107d9afd7813f23866c09f0';
export const GOOGLE_WEB_CLIENT_ID = '164808323292-mm6rs6uhnat6fnocm9bitcrjqq219vea.apps.googleusercontent.com';

export interface Account {
  id: string;
  nickname: string;
  favorite_player: string;
}

interface AuthState {
  token: string | null;
  user: Account | null;
}

const KEY = 'hle-api-auth-v1';
const EMPTY: AuthState = { token: null, user: null };
let state: AuthState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw) as AuthState;
  } catch {
    // 저장소가 막힌 브라우저(사생활 보호 모드 등)는 로그인 없이 쓴다
  }
}

function set(next: AuthState) {
  state = next;
  try {
    if (next.token) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
}

export function useAccount(): AuthState {
  return useSyncExternalStore(
    (cb) => {
      load();
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => (load(), state),
    () => EMPTY,
  );
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  load();
  const res = await fetch(API_ORIGIN + path, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(state.token ? { Authorization: state.token } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const msg = await res
      .json()
      .then((d: { message?: string }) => d.message ?? '')
      .catch(() => '');
    if (res.status === 401 && state.token) set(EMPTY); // 만료된 토큰
    throw new ApiError(res.status, msg || `HTTP ${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** PocketBase 필터 문자열 안에 넣을 값 (따옴표·역슬래시를 막아 필터 주입을 피한다) */
const lit = (v: string) => `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const me = () => {
  load();
  if (!state.user) throw new ApiError(401, '로그인이 필요합니다');
  return state.user.id;
};

// ---------------------------------------------------------------- 로그인

type AuthResponse = { token: string; record: Account };

async function exchange(provider: 'google' | 'kakao-web', token: string, nonce?: string) {
  const res = await call<AuthResponse>('POST', `/api/native-auth/${provider}`, { token, nonce });
  set({ token: res.token, user: res.record });
  return res.record;
}

export const loginWithGoogle = (idToken: string) => exchange('google', idToken);
export const loginWithKakaoCode = (code: string, redirectUri: string) => exchange('kakao-web', code, redirectUri);

export function kakaoAuthorizeUrl(redirectUri: string, state: string) {
  const q = new URLSearchParams({ client_id: KAKAO_REST_KEY, redirect_uri: redirectUri, response_type: 'code', state });
  return `https://kauth.kakao.com/oauth/authorize?${q}`;
}

export function logout() {
  set(EMPTY);
}

/** 저장된 토큰을 연장하고 최신 프로필을 받는다. 페이지를 열 때 한 번 */
export async function refreshAccount() {
  load();
  if (!state.token) return;
  try {
    const res = await call<AuthResponse>('POST', '/api/collections/users/auth-refresh');
    set({ token: res.token, user: res.record });
  } catch {
    // 네트워크 오류면 토큰을 두고, 401 은 call() 이 비운다
  }
}

export async function updateProfile(nickname: string, favorite: string | null) {
  const user = await call<Account>('PATCH', `/api/collections/users/records/${me()}`, {
    nickname,
    favorite_player: favorite ?? '',
  });
  set({ token: state.token, user });
}

export async function deleteAccount() {
  await call('DELETE', `/api/collections/users/records/${me()}`);
  set(EMPTY);
}

// ---------------------------------------------------------------- 승부예측

export interface ServerPick {
  id: string;
  match_id: string;
  pick: string;
  us_sets: number;
  them_sets: number;
}

type Page<T> = { items: T[] };

export async function myPredictions(): Promise<ServerPick[]> {
  const page = await call<Page<ServerPick>>('GET', '/api/collections/predictions/records?perPage=200');
  return page.items;
}

/** 서버가 마감(킥오프 10분 전)과 '스코어·승패가 맞는지'를 다시 확인한다 */
export async function savePrediction(matchId: string, opponentCode: string, us: number, them: number) {
  const pick = us > them ? 'HLE' : opponentCode;
  const found = await call<Page<ServerPick>>(
    'GET',
    `/api/collections/predictions/records?perPage=1&filter=${encodeURIComponent(`match_id = ${lit(matchId)}`)}`,
  );
  const existing = found.items[0];
  if (existing) {
    await call('PATCH', `/api/collections/predictions/records/${existing.id}`, { pick, us_sets: us, them_sets: them });
  } else {
    await call('POST', '/api/collections/predictions/records', {
      user: me(),
      match_id: matchId,
      pick,
      us_sets: us,
      them_sets: them,
    });
  }
}

export interface Tally {
  pick: string;
  us_sets: number;
  them_sets: number;
  count: number;
}

export const predictionTally = (matchId: string) => call<Tally[]>('GET', `/api/predictions/tally/${matchId}`);

// ---------------------------------------------------------------- 응원 채팅

export interface ChatMessage {
  id: string;
  match_id: string;
  author: string;
  body: string;
  created: string;
  expand?: { author?: { nickname?: string } };
}

export async function recentChat(matchId: string): Promise<ChatMessage[]> {
  const q = new URLSearchParams({
    filter: `match_id = ${lit(matchId)}`,
    sort: '-created',
    perPage: '100',
    expand: 'author',
    skipTotal: '1',
  });
  const page = await call<Page<ChatMessage>>('GET', `/api/collections/chat_messages/records?${q}`);
  return page.items.reverse();
}

export async function sendChat(matchId: string, body: string) {
  await call('POST', '/api/collections/chat_messages/records', { match_id: matchId, author: me(), body });
}

export async function reportChat(messageId: string) {
  await call('POST', '/api/collections/reports/records', { reporter: me(), chat: messageId, reason: '채팅 신고' });
}

export async function blockUser(userId: string) {
  await call('POST', '/api/collections/blocks/records', { blocker: me(), blocked: userId });
}

export async function blockedIds(): Promise<Set<string>> {
  const page = await call<Page<{ blocked: string }>>('GET', '/api/collections/blocks/records?perPage=500&fields=blocked');
  return new Set(page.items.map((b) => b.blocked));
}

/**
 * 경기 채팅 실시간 구독. 서버가 match_id 로 걸러서 그 경기 메시지만 보낸다.
 * 끊기면 EventSource 가 알아서 다시 붙고, 그때마다 구독을 다시 건다.
 */
export function subscribeChat(
  matchId: string,
  onEvent: (action: 'create' | 'delete', msg: ChatMessage) => void,
  onStatus: (connected: boolean) => void,
): () => void {
  const options = JSON.stringify({ query: { filter: `match_id = ${lit(matchId)}`, expand: 'author' } });
  const topic = `chat_messages/*?options=${encodeURIComponent(options)}`;
  const es = new EventSource(`${API_ORIGIN}/api/realtime`);

  es.addEventListener('PB_CONNECT', (e) => {
    const { clientId } = JSON.parse((e as MessageEvent).data) as { clientId: string };
    call('POST', '/api/realtime', { clientId, subscriptions: [topic] })
      .then(() => onStatus(true))
      .catch(() => onStatus(false));
  });
  es.addEventListener(topic, (e) => {
    const data = JSON.parse((e as MessageEvent).data) as { action: string; record: ChatMessage };
    if (data.action === 'create' || data.action === 'delete') onEvent(data.action, data.record);
  });
  es.onerror = () => onStatus(false);
  return () => es.close();
}

// ---------------------------------------------------------------- 게시판 (앱과 같은 posts·comments)

export const POST_CATEGORIES = [
  { k: 'match', t: '경기' },
  { k: 'chat', t: '잡담' },
  { k: 'visit', t: '직관 인증' },
  { k: 'meme', t: '짤' },
] as const;
export type PostCategory = (typeof POST_CATEGORIES)[number]['k'];
export const categoryLabel = (k: string) => POST_CATEGORIES.find((c) => c.k === k)?.t ?? k;

export interface Post {
  id: string;
  author: string;
  category: PostCategory;
  title: string;
  body: string;
  created: string;
  comment_count?: number;
  expand?: { author?: { nickname?: string } };
}

export interface Comment {
  id: string;
  post: string;
  author: string;
  body: string;
  created: string;
  expand?: { author?: { nickname?: string } };
}

export async function listPosts(category: PostCategory | null, search: string): Promise<Post[]> {
  const filters: string[] = [];
  if (category) filters.push(`category = ${lit(category)}`);
  if (search.trim()) filters.push(`title ~ ${lit(search.trim())}`);
  const q = new URLSearchParams({ sort: '-created', perPage: '50', expand: 'author', skipTotal: '1' });
  if (filters.length) q.set('filter', filters.join(' && '));
  return (await call<Page<Post>>('GET', `/api/collections/posts/records?${q}`)).items;
}

export const getPost = (id: string) => call<Post>('GET', `/api/collections/posts/records/${encodeURIComponent(id)}?expand=author`);

export async function listComments(postId: string): Promise<Comment[]> {
  const q = new URLSearchParams({ filter: `post = ${lit(postId)}`, sort: 'created', perPage: '200', expand: 'author' });
  return (await call<Page<Comment>>('GET', `/api/collections/comments/records?${q}`)).items;
}

export const createPost = (category: PostCategory, title: string, body: string) =>
  call<Post>('POST', '/api/collections/posts/records', { author: me(), category, title, body });

export const createComment = (postId: string, body: string) =>
  call<Comment>('POST', '/api/collections/comments/records', { post: postId, author: me(), body });

export const deletePost = (id: string) => call('DELETE', `/api/collections/posts/records/${encodeURIComponent(id)}`);

export async function reportContent(target: { post?: string; comment?: string }, reason: string) {
  await call('POST', '/api/collections/reports/records', { reporter: me(), post: target.post ?? '', comment: target.comment ?? '', reason });
}
