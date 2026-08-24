import Image from 'next/image';
import { fmtDate } from '@/lib/format';
import { SEASON } from '@/lib/lck2026';
import { ChevronDown, MapPin } from 'lucide-react';
import TicketLine from './Ticket';
import {
  seedNote,
  type BracketMatch,
  type BracketStage,
  type BracketTeam,
} from '@/lib/bracket';

/** 이 스테이지 대진에 우리 팀이 올라와 있는가 */
const hasOurTeam = (st: BracketStage, code: string) =>
  st.cells.some((c) => c.matches.some((m) => m.teams.some((t) => t.code === code)));

/**
 * 포스트시즌 대진표.
 *
 * 승자조를 위, 패자조를 아래 줄에 놓고 라운드가 오른쪽으로 진행한다. 원본 응답은
 * 두 조의 칸이 같은 columns[] 안에 섞여 있어 그대로 그리면 세로로 겹친다 —
 * 더블 엘리미네이션에서 "이기면 계속 위, 지면 아래로 떨어져 다시 올라온다" 는
 * 흐름이 보이지 않게 된다. 그 흐름이 이 형식의 전부다.
 *
 * 연결선 대신 경기마다 도착지를 글로 적는다. 상위권·하위권이 서로 넘나드는
 * 대진에서 선을 정확히 그리려면 좌표 계산이 필요하고, 잘못 그은 선은 없는 선보다
 * 나쁘다. 글은 어느 배치에서도 정확하다.
 */

function Side({ t, ourTag }: { t: BracketTeam; ourTag: string }) {
  const ours = t.code === ourTag;
  return (
    <div className={`bteam${t.tbd ? ' tbd' : ''}${ours ? ' me' : ''}${t.win ? ' won' : ''}`}>
      {t.tbd ? (
        <span className="bemblem" aria-hidden />
      ) : (
        <Image className="bemblem" src={t.image} alt="" width={26} height={26} unoptimized />
      )}
      {/* 미정 자리에는 무엇이 들어오는지를 적는다. '미정' 만 늘어놓으면
          대진표를 봐도 흐름을 알 수 없다 */}
      <span className="bcode">{t.tbd ? (t.from ?? '미정') : t.code}</span>
      <span className="bscore">{t.games ?? '-'}</span>
    </div>
  );
}

function Match({
  m,
  ourTag,
  label,
  cellSlug,
}: {
  m: BracketMatch;
  ourTag: string;
  label: string;
  /** 공지된 예매 일정이 있는 칸인지 예매 줄이 판단하는 데 쓴다 */
  cellSlug: string;
}) {
  return (
    <div
      className={`bmatch${m.state === 'inProgress' ? ' live' : ''}${
        m.state === 'completed' ? ' done' : ''
      }`}
    >
      <div className="bmhead">
        <span className="bml">{label}</span>
        <span className="bmwhen">
          {m.state === 'inProgress' ? 'LIVE' : m.startTime ? fmtDate(m.startTime) : '일정 미정'}
        </span>
      </div>
      <div className="bmbody">
        <Side t={m.teams[0]} ourTag={ourTag} />
        <Side t={m.teams[1]} ourTag={ourTag} />
      </div>
      {/* 공지된 경기장. 아는 경기에만 붙는다 — 짐작으로 채우면 적혀 있다는
          사실 자체가 확인된 정보처럼 읽힌다 */}
      {m.venue && (
        <div className="bvenue">
          <MapPin size={12} aria-hidden />
          {m.venue}
        </div>
      )}
      {m.startTime && (
        <div className="btkt">
          <TicketLine startTime={m.startTime} cellSlug={cellSlug} />
        </div>
      )}
      {(m.winTo || m.lossTo) && (
        <div className="bgoes">
          {m.winTo && (
            <span className="gw">
              <b aria-hidden>→</b> {m.winTo}
            </span>
          )}
          {m.lossTo && (
            <span className={`gl${m.lossTo === '탈락' ? ' out' : ''}`}>
              <b aria-hidden>↘</b> {m.lossTo}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function Bracket({ stages, ourTag }: { stages: BracketStage[]; ourTag: string }) {
  return (
    <>
      {stages.map((st, si) => {
        const ours = hasOurTeam(st, ourTag);
        /* 우리 팀이 없는 앞 스테이지는 접어 둔다. 플레이인은 우리가 갈 자리가 아닌데
           본선보다 위에 펼쳐져 있으면 정작 볼 것이 아래로 밀린다.
           마지막 스테이지(본선)는 항상 펼친다. */
        const open = ours || si === stages.length - 1;
        const hasLower = st.cells.some((c) => c.band === 'lower');
        // 띠가 있으면 1행 승자조띠 · 2행 승자조 · 3행 패자조띠 · 4행 패자조
        const rowOf = (band: string) => (!hasLower ? 1 : band === 'upper' ? 2 : 4);

        /* 열을 반 칸 단위로 쪼갠다.
           패자조를 승자조보다 반 칸 왼쪽에 놓으면 "여기서 떨어진 팀이 아래로 간다" 는
           관계가 가로 위치로 드러난다. 같은 열에 딱 맞추면 두 조가 무관해 보이고,
           한 칸을 통째로 밀면 대진표가 그만큼 길어진다. */
        const half = (c: { col: number; band: string }) =>
          c.band === 'upper' ? c.col * 2 + 1 : c.col * 2;
        const halfCols = st.cells.reduce((n, c) => Math.max(n, half(c) + 1), 2);
        /* 반 칸 폭. 12 반칸 x 83px = 996px 으로 본문 폭(1080 - 좌우 여백 48 -
           스크롤 영역 여백 32 - 테두리 2 = 998px) 안에 딱 들어간다. 더 좁은 화면에서는
           가로로 넘어가지만 넓은 화면에서는 스크롤이 아예 생기지 않는다. */
        return (
          <details key={st.slug} className="bstage rv" open={open}>
            <summary className="bhead">
              <b>{st.name}</b>
              <span className="bhx">
                {SEASON.year} LCK 대진표
                <ChevronDown size={15} aria-hidden />
              </span>
            </summary>

            <div className="bscroll">
              <div className="bgrid" style={{ gridTemplateColumns: `repeat(${halfCols}, 83px)` }}>
                {hasLower && (
                  <>
                    <div className="bband up" style={{ gridColumn: '1 / -1', gridRow: 1 }}>
                      승자조
                    </div>
                    <div className="bband low" style={{ gridColumn: '1 / -1', gridRow: 3 }}>
                      패자조
                    </div>
                  </>
                )}
                {st.cells.map((cell) => {
                  const name = cell.name; // bracket.ts 의 cellLabel 이 이미 다듬어 뒀다
                  const note = seedNote();
                  return (
                    <div
                      className={`bcell ${cell.band}`}
                      key={`${cell.band}-${cell.slug}`}
                      style={{ gridColumn: `${half(cell)} / span 2`, gridRow: rowOf(cell.band) }}
                    >
                      <div className="bcellname">
                        {name}
                        {note && <span className="bseed">{note}</span>}
                      </div>
                      {cell.matches.map((m, i) => (
                        <Match
                          key={m.id}
                          m={m}
                          ourTag={ourTag}
                          label={cell.matches.length > 1 ? `${name} ${i + 1}경기` : name}
                          cellSlug={cell.slug}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="blegend">
              <span>
                <i className="lw" aria-hidden />
                승자
              </span>
              <span>
                <i className="ll" aria-hidden />
                패자
              </span>
              {/* 우리 팀이 이 대진에 없으면 주황을 쓸 일이 없다. 쓰이지 않는 색을
                  범례에 두면 어디 있는지 찾게 된다 */}
              {ours && (
                <span>
                  <i className="lm" aria-hidden />
                  {ourTag}
                </span>
              )}
            </div>
          </details>
        );
      })}
    </>
  );
}
