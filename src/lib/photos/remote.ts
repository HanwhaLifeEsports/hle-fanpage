'use client';

import { anonId, supabase } from '../supabase';
import { FAN_OUT_H, FAN_OUT_W, type FanPhoto, type PhotoBackend } from './types';

/**
 * Supabase 백엔드.
 *
 * 권한은 여기 없다. 전부 supabase/schema.sql 의 RLS 에 있다. 이 파일은
 * "무엇을 요청하는가" 만 적고, "해도 되는가" 는 데이터베이스가 판단한다.
 * anon 키가 공개된 값이라, 여기서 막는 방식은 애초에 성립하지 않는다.
 */

const BUCKET = 'fan-photos';

interface Row {
  id: string;
  player_id: string;
  path: string;
  width: number;
  height: number;
  hearts: number;
  owner: string;
  created_at: string;
}

function publicUrl(path: string): string {
  return supabase()!.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export const remoteBackend: PhotoBackend = {
  shared: true,

  async load() {
    const sb = supabase()!;
    const uid = await anonId();

    // 하트 순은 인덱스가 잡혀 있다. hidden 은 RLS 가 이미 걸러 준다
    const { data: rows, error } = await sb
      .from('fan_photos')
      .select('id,player_id,path,width,height,hearts,owner,created_at')
      .order('hearts', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;

    // 내가 누른 하트만 따로 읽는다. 남이 누구를 눌렀는지는 RLS 가 안 준다
    const { data: mine } = await sb.from('fan_hearts').select('photo_id');
    const mineSet = new Set((mine ?? []).map((m) => m.photo_id as string));

    return (rows as Row[]).map((r) => ({
      id: r.id,
      playerId: r.player_id,
      url: publicUrl(r.path),
      width: r.width,
      height: r.height,
      hearts: r.hearts,
      mine: mineSet.has(r.id),
      owned: r.owner === uid,
      createdAt: r.created_at,
    }));
  },

  async add(playerId, blob) {
    const sb = supabase()!;
    const uid = await anonId();
    if (!uid) throw new Error('익명 로그인에 실패했습니다');

    const path = `${playerId}/${crypto.randomUUID()}.jpg`;
    const up = await sb.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' });
    if (up.error) throw up.error;

    const { data, error } = await sb
      .from('fan_photos')
      .insert({ player_id: playerId, path, width: FAN_OUT_W, height: FAN_OUT_H, attested: true })
      .select('id,created_at')
      .single();

    if (error) {
      // 표에 못 넣으면(도배 제한 등) 올린 파일도 지운다. 남겨두면 주인 없는 파일이 쌓인다
      await sb.storage.from(BUCKET).remove([path]);
      throw error;
    }

    return {
      id: data.id as string,
      playerId,
      url: publicUrl(path),
      width: FAN_OUT_W,
      height: FAN_OUT_H,
      hearts: 0,
      mine: false,
      owned: true,
      createdAt: data.created_at as string,
    };
  },

  async setHeart(id, on) {
    const sb = supabase()!;
    const uid = await anonId();
    if (!uid) throw new Error('익명 로그인에 실패했습니다');

    // hearts 집계는 트리거가 맞춘다. 여기서는 내 한 표만 넣고 뺀다
    const res = on
      ? await sb.from('fan_hearts').insert({ photo_id: id })
      : await sb.from('fan_hearts').delete().eq('photo_id', id).eq('voter', uid);
    if (res.error) throw res.error;
  },

  async report(id) {
    const sb = supabase()!;
    if (!(await anonId())) throw new Error('익명 로그인에 실패했습니다');
    const { error } = await sb.from('fan_reports').insert({ photo_id: id });
    // 같은 사람이 두 번 신고하면 기본키에 걸린다. 이미 내려간 상태라 문제가 아니다
    if (error && error.code !== '23505') throw error;
  },

  async remove(id) {
    const sb = supabase()!;
    const { data } = await sb.from('fan_photos').select('path').eq('id', id).single();
    const { error } = await sb.from('fan_photos').delete().eq('id', id);
    if (error) throw error;
    if (data?.path) await sb.storage.from(BUCKET).remove([data.path as string]);
  },
};
