'use client';

import { useState } from 'react';
import Image from 'next/image';
import { PLAYERS, type Player } from '@/lib/lck2026';
import { Star, X } from 'lucide-react';
import { patchState, toast, useApp } from '@/lib/useAppState';
import type { PlayerStat, StatMap } from '@/lib/naver';
import PhotoGallery from './PhotoGallery';
import { cardFanPhoto, useFanPhotos, type FanPhoto } from '@/lib/photos';
import type { ChampionMap } from '@/lib/champions';
import type { ContractMap } from '@/lib/leaguepedia';
import { fmtContract } from '@/lib/format';

/**
 * 선수 사진 표시 스위치.
 *
 * 사진은 이 사이트에서 가장 되돌릴 가능성이 높은 기능이다. 저작권이 우리에게 있어도
 * 초상권은 선수 쪽에 남아 있어서, 요청이 오면 즉시 내려야 한다. 그때 코드를 고치고
 * 리뷰를 거치는 대신 환경변수 하나로 끌 수 있게 둔다.
 * 치지직 자체 플레이어(NEXT_PUBLIC_CHZZK_PLAYER)와 같은 방식이다.
 */
const PHOTOS_ON = process.env.NEXT_PUBLIC_PLAYER_PHOTOS !== 'off';

function Card({
  p,
  st,
  fan,
  onOpen,
  fav,
}: {
  p: Player;
  st?: PlayerStat;
  /** 카드에 걸릴 팬 사진. 없으면 공식 사진으로 떨어진다 (cardFanPhoto) */
  fan: FanPhoto | null;
  onOpen: () => void;
  fav: boolean;
}) {
  // 판단은 cardFanPhoto 가 이미 끝냈다. 여기서는 무엇을 그릴지만 정한다
  const shot = !PHOTOS_ON ? null : fan ? { fan } : p.photo ? { official: p.photo } : null;
  return (
    <button className="pcard" onClick={onOpen}>
      <div className="ph">
        {/* 팬 사진은 저장소가 준 주소라 next/image 최적화 경로를 못 탄다.
            이미 4:5 900px 으로 잘려 들어온 값이라 최적화할 것도 없다. */}
        {shot?.fan && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="pimg" src={shot.fan.url} alt="" />
        )}
        {shot?.official && (
          <Image
            className="pimg"
            src={shot.official.src}
            alt=""
            width={shot.official.width}
            height={shot.official.height}
            sizes="(max-width:560px) 50vw, (max-width:900px) 33vw, 220px"
          />
        )}
        <span className="pos">{p.pos}</span>
        <div className="tags">
          {fav && <span className="badge b-flame">최애</span>}
          {p.joined2026 && <span className="badge b-new">NEW</span>}
        </div>
        <span className="no">{p.no}</span>
        <span className="nm">{p.nm}</span>
      </div>
      <div className="mt">
        <span className="cap">{p.ko}</span>
        {/* 기록을 못 가져오면 등번호로 되돌아간다. 0 으로 채우면 'POM 을 한 번도
            못 받았다'는 사실과 구분되지 않는다 */}
        <span className="fig">{st ? `POM ${st.pom}` : `#${p.no}`}</span>
      </div>
    </button>
  );
}

export default function RosterRail({
  stats,
  champions,
  contracts,
}: {
  stats?: StatMap | null;
  champions?: ChampionMap | null;
  contracts?: ContractMap | null;
}) {
  const { fav } = useApp();
  const [open, setOpen] = useState<Player | null>(null);
  const openStat = open ? stats?.[open.naverId] : undefined;
  const openChamps = open ? champions?.[open.id] : undefined;
  const openContract = open ? contracts?.[open.id] : undefined;
  // 구독은 여기서 한 번만. 카드마다 걸면 선수 수만큼 리렌더가 붙는다
  const fanPhotos = useFanPhotos();

  const toggleFav = (id: string) => {
    const next = fav === id ? null : id;
    patchState({ fav: next });
    setOpen(null);
    const p = PLAYERS.find((x) => x.id === id)!;
    toast(
      next ? '최애 선수 지정' : '최애 선수 해제',
      next ? `${p.nm} 관련 알림을 받습니다.` : '선수 알림을 끕니다.',
    );
  };

  return (
    <>
      <div className="rail">
        {PLAYERS.map((p) => (
          <Card
            key={p.id}
            p={p}
            st={stats?.[p.naverId]}
            fan={cardFanPhoto(fanPhotos, p.id, !!p.photo)}
            fav={fav === p.id}
            onOpen={() => setOpen(p)}
          />
        ))}
      </div>

      {open && (
        <div className="ov" onClick={(e) => e.target === e.currentTarget && setOpen(null)}>
          <div className="modal">
            <div className="modal-h">
              <b style={{ fontSize: 18 }}>
                {open.nm}{' '}
                <span style={{ color: 'var(--mute)', fontWeight: 400, fontSize: 14 }}>{open.ko}</span>
              </b>
              <button className="x" onClick={() => setOpen(null)} aria-label="닫기">
                <X size={15} />
              </button>
            </div>
            <div className="modal-b">
              {/* 사진 자리는 하나다. 운영자 사진을 따로 크게 띄우고 그 아래 갤러리를
                  또 두면, 같은 선수인데 카드와 모달의 얼굴이 달라 보인다.
                  운영자 사진은 갤러리의 첫 칸으로 들어간다. */}
              {PHOTOS_ON && (
                <PhotoGallery playerId={open.id} playerName={open.nm} official={open.photo} />
              )}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <span className="badge b-flame">{open.pos}</span>
                <span className="badge b-soon">#{open.no}</span>
                {open.joined2026 && <span className="badge b-new">2026 합류</span>}
              </div>
              {/* 계약 종료일만 적는다. Leaguepedia 는 시작일을 관리하지 않아,
                  기간으로 적으려면 없는 값을 지어내야 한다 */}
              {openContract && (
                <p className="contract">
                  계약 만료 <b>{fmtContract(openContract)}</b>
                </p>
              )}
              {openStat && (
                <>
                  <h3 className="grouphead">2026 정규시즌 기록</h3>
                  <div className="statgrid s2" style={{ marginBottom: 10 }}>
                    <div className="card stat">
                      <b>{openStat.pom}</b>
                      <span className="cap">
                        POM 포인트 · {openStat.pomCount}회
                      </span>
                      <span className="cap sub">리그 {openStat.pomRank}위</span>
                    </div>
                    <div className="card stat">
                      <b>{openStat.kda.toFixed(2)}</b>
                      <span className="cap">KDA</span>
                      <span className="cap sub">
                        {openStat.kills} / {openStat.deaths} / {openStat.assists}
                      </span>
                    </div>
                    <div className="card stat">
                      <b>{Math.round(openStat.killShare * 100)}%</b>
                      <span className="cap">킬 관여</span>
                    </div>
                    <div className="card stat">
                      <b>{openStat.sets}</b>
                      <span className="cap">출전 세트</span>
                      <span className="cap sub">
                        {openStat.wins}승 {openStat.losses}패
                      </span>
                    </div>
                  </div>
                  {/* 남의 데이터를 쓰면 어디서 왔는지 화면에 남긴다 */}
                  <p className="note" style={{ marginBottom: 20 }}>
                    기록 출처: 네이버 e스포츠
                  </p>
                </>
              )}

              {openChamps && openChamps.length > 0 && (
                <>
                  <h3 className="grouphead">2026 LCK 정규시즌 챔피언 픽</h3>
                  {/* 손으로 적어 두지 않는다. 시즌 중에 계속 바뀌는 값이라
                      한 번 적어 두면 반드시 실제와 어긋난다 */}
                  <ul className="champs">
                    {openChamps.slice(0, 6).map((c) => (
                      <li key={c.key}>
                        <span className="cn">{c.name}</span>
                        <span className="cw">
                          {c.wins}승 {c.losses}패
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="note" style={{ marginBottom: 20 }}>
                    1~4라운드 · 기록 출처: Leaguepedia
                  </p>
                </>
              )}
              <button
                className={`btn ${fav === open.id ? 'btn-ghost' : 'btn-primary'} btn-block`}
                onClick={() => toggleFav(open.id)}
              >
                <Star size={16} fill={fav === open.id ? 'currentColor' : 'none'} />
                {fav === open.id ? '최애 선수 해제' : '최애 선수로 지정'}
              </button>
              <div className="note">최애로 지정하면 이 선수 소식만 따로 알림을 받습니다.</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
