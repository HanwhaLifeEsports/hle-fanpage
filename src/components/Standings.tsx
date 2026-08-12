import type { GroupId, TeamRow } from '@/lib/lolesports';
import { OUR_TAG, SEASON } from '@/lib/lck2026';

export default function Standings({ rows, group }: { rows: TeamRow[]; group: GroupId }) {
  const meta = SEASON[group];
  return (
    <>
      <div className="grouplabel">
        <b>{meta.label}</b>
        {meta.note}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th>팀</th>
              <th style={{ width: 74 }}>승-패</th>
              <th style={{ width: 88 }}>세트</th>
              <th style={{ width: 62 }}>득실</th>
              <th style={{ width: 108 }}>스플릿2 / 3</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.code} className={t.code === OUR_TAG ? 'me' : undefined}>
                <td>{t.rank}</td>
                <td>{t.name}</td>
                <td>
                  {t.w}-{t.l}
                </td>
                <td>
                  {t.setW}-{t.setL}
                </td>
                <td style={{ color: t.diff > 0 ? 'var(--win)' : t.diff < 0 ? 'var(--loss)' : undefined }}>
                  {t.diff > 0 ? '+' : ''}
                  {t.diff}
                </td>
                <td className="cap-xs">
                  {t.split2.w}-{t.split2.l} / {t.split3.w}-{t.split3.l}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
