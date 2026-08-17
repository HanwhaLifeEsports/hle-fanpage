'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase 연결.
 *
 * 환경변수가 없으면 null 을 돌려준다. 그러면 팬 사진은 브라우저 저장소로 떨어지고
 * 화면은 그대로 뜬다. 저장소가 없다고 사이트가 못 뜰 이유가 없고, 로컬에서
 * 열쇠 없이 화면만 손볼 때도 이 편이 편하다.
 *
 * publishable 키(sb_publishable_...)는 공개된 값이다. 숨겨야 하는 열쇠가 아니라
 * "여기부터는 RLS 가 판단한다" 는 표시에 가깝다. 실제 권한은 전부
 * supabase/schema.sql 에 있다. 짝이 되는 secret 키(sb_secret_...)는 RLS 를
 * 통째로 우회하므로 이 저장소 어디에도 두지 않는다.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

/** 레거시 anon 키(2026년 말 폐기)도 값만 넣으면 그대로 동작하므로 함께 받는다 */
const KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(URL && KEY);

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient | null {
  if (!hasSupabase) return null;
  client ??= createClient(URL!, KEY!, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}

let signingIn: Promise<string | null> | null = null;

/**
 * 익명 로그인.
 *
 * 계정을 만들지 않고도 사람마다 고정된 id 를 갖기 위한 것이다. 하트 중복을
 * 막는 기준이 이 id 이고, 표의 기본키가 (사진, 이 id) 라 데이터베이스가 구조로
 * 한 번만 허용한다.
 *
 * create 를 켤 때만 새로 만든다. 익명 사용자도 auth.users 에 행으로 쌓이므로,
 * 사진을 건드리지도 않은 방문자마다 계정을 만들면 남의 데이터베이스를 우리가
 * 불려 놓는 셈이 된다. 읽기는 로그인 없이도 되니 볼 때는 만들지 않고,
 * 하트·업로드·신고처럼 실제로 쓰는 순간에만 만든다.
 *
 * 완벽하지는 않다. 시크릿 창을 열면 새 id 가 된다. 로그인이 붙기 전까지는
 * 하트가 조작 가능하다는 뜻이고, 그 위험은 감수하고 시작하는 것이다.
 */
export async function anonId(create = false): Promise<string | null> {
  const sb = supabase();
  if (!sb) return null;

  const { data } = await sb.auth.getSession();
  if (data.session) return data.session.user.id;
  if (!create) return null;

  // 동시에 여러 번 불려도 로그인은 한 번만
  signingIn ??= sb.auth
    .signInAnonymously()
    .then(({ data: d, error }) => (error ? null : (d.user?.id ?? null)))
    .finally(() => {
      signingIn = null;
    });

  return signingIn;
}
