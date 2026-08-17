import Image from 'next/image';
import { fmtDate } from '@/lib/format';
import { seedNote, type BracketMatch, type BracketStage, type BracketTeam } from '@/lib/bracket';

/**
 * 포스트시즌 대진표.
 *
 * 열을 가로로 늘어놓고 라운드가 오른쪽으로 진행한다. 좁은 화면에서는 가로로
 * 넘긴다 — 세로로 접으면 어느 경기 승자가 어디로 가는지가 사라져서, 대진표라는
 * 형식이 주는 정보가 통째로 없어진다.
 *
 * 선을 그어 잇지는 않는다. 더블 엘리미네이션은 상위권·하위권이 서로 넘나들어
 * 선을 정확히 그리려면 좌표 계산이 필요한데, 열과 라운드 이름만으로도 흐름은
 * 충분히 읽힌다. 잘못 그은 선은 없는 선보다 나쁘다.
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
      {/* 미정 자리에는 무엇이 들어오는지를 적는다. 그냥 '미정' 만 늘어놓으면
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
    </div>
  );
}

export default function Bracket({ stages, ourTag }: { stages: BracketStage[]; ourTag: string }) {
  return (
    <>
      {stages.map((st) => (
        <section key={st.slug} className="bstage">
          <h3 className="grouphead">{st.name}</h3>
          <div className="bscroll">
            <div className="bcols">
              {st.columns.map((col, i) => (
                <div className="bcol" key={i}>
                  {col.cells.map((cell) => (
                    <div className="bcell" key={cell.slug}>
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
              ))}
            </div>
          </div>
        </section>
      ))}
    </>
  );
}
