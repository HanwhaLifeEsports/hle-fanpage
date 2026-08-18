import Image from 'next/image';
import { fmtDate } from '@/lib/format';
import { SEASON } from '@/lib/lck2026';
import { type BracketMatch, type BracketStage, type BracketTeam, seedNote } from '@/lib/bracket';

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

function Match({ m, ourTag, label }: { m: BracketMatch; ourTag: string; label: string }) {
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
      {stages.map((st) => {
        const hasLower = st.cells.some((c) => c.band === 'lower');
        // 띠가 있으면 1행 승자조띠 · 2행 승자조 · 3행 패자조띠 · 4행 패자조
        const rowOf = (band: string) => (!hasLower ? 1 : band === 'upper' ? 2 : 4);
        return (
          <section key={st.slug} className="bstage">
            <div className="bhead">
              <b>{st.name}</b>
              <span>{SEASON.year} LCK 대진표</span>
            </div>

            <div className="bscroll">
              <div className="bgrid" style={{ gridTemplateColumns: `repeat(${st.cols}, 190px)` }}>
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
                  const note = seedNote(st.slug, cell.slug);
                  return (
                    <div
                      className={`bcell ${cell.band}`}
                      key={`${cell.band}-${cell.slug}`}
                      style={{ gridColumn: cell.col + 1, gridRow: rowOf(cell.band) }}
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
                이기면 가는 곳
              </span>
              <span>
                <i className="ll" aria-hidden />
                지면 가는 곳
              </span>
              <span>
                <i className="lm" aria-hidden />
                {ourTag}
              </span>
            </div>
          </section>
        );
      })}
    </>
  );
}
