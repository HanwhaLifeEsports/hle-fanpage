import Image from 'next/image';
import { fmtDate } from '@/lib/format';
import { seedNote, type BracketMatch, type BracketStage, type BracketTeam } from '@/lib/bracket';

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
        <Image className="bemblem" src={t.image} alt="" width={22} height={22} unoptimized />
      )}
      {/* 미정 자리에는 무엇이 들어오는지를 적는다. '미정' 만 늘어놓으면
          대진표를 봐도 흐름을 알 수 없다 */}
      <span className="bcode">{t.tbd ? (t.from ?? '미정') : t.code}</span>
      <span className="bscore">{t.games ?? '-'}</span>
    </div>
  );
}

function Match({ m, ourTag }: { m: BracketMatch; ourTag: string }) {
  return (
    <div className={`bmatch${m.state === 'inProgress' ? ' live' : ''}`}>
      <Side t={m.teams[0]} ourTag={ourTag} />
      <Side t={m.teams[1]} ourTag={ourTag} />
      <div className="bwhen">
        {m.startTime ? fmtDate(m.startTime) : '일정 미정'}
        {m.state === 'inProgress' && <b> 진행 중</b>}
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
        return (
          <section key={st.slug} className="bstage">
            <h3 className="grouphead">{st.name}</h3>
            <div className="bscroll">
              <div
                className="bgrid"
                style={{ gridTemplateColumns: `repeat(${st.cols}, 178px)` }}
              >
                {hasLower && (
                  <>
                    <div className="bband up" style={{ gridColumn: `1 / -1`, gridRow: 1 }}>
                      승자조
                    </div>
                    <div className="bband low" style={{ gridColumn: `1 / -1`, gridRow: 3 }}>
                      패자조
                    </div>
                  </>
                )}
                {st.cells.map((cell) => (
                  <div
                    className="bcell"
                    key={`${cell.band}-${cell.slug}`}
                    style={{ gridColumn: cell.col + 1, gridRow: cell.band === 'upper' ? 2 : 4 }}
                  >
                    <div className="bcellname">
                      {cell.name}
                      {seedNote(st.slug, cell.slug) && (
                        <span className="bseed">{seedNote(st.slug, cell.slug)}</span>
                      )}
                    </div>
                    {cell.matches.map((m) => (
                      <Match key={m.id} m={m} ourTag={ourTag} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </>
  );
}
