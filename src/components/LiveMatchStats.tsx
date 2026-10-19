'use client';

// Riot Data Dragon images use a versioned CDN. Images are decorative; player names are text.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, RefreshCw, ShieldAlert } from 'lucide-react';
import { useApp } from '@/lib/useAppState';
import type { LivePlayer, LiveTeam, MatchSnapshot } from '@/lib/lolesports-live';

const REFRESH_MS = 10_000;

function champUrl(version: string | null, championId: string) {
  return 'https://ddragon.leagueoflegends.com/cdn/' +
    encodeURIComponent(version || '16.19.1') + '/img/champion/' +
    encodeURIComponent(championId) + '.png';
}

function itemUrl(version: string | null, itemId: number) {
  return 'https://ddragon.leagueoflegends.com/cdn/' +
    encodeURIComponent(version || '16.19.1') + '/img/item/' + itemId + '.png';
}

function Champion({ version, id, small = false }: { version: string | null; id: string; small?: boolean }) {
  if (!id) return <span className={'live-champ' + (small ? ' small' : '')} aria-hidden="true">—</span>;
  return (
    <span className={'live-champ' + (small ? ' small' : '')} title={id}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={champUrl(version, id)} alt={id} loading="lazy" onError={(e) => { e.currentTarget.style.opacity = '0'; }} />
    </span>
  );
}

function fmtNum(n: number | null | undefined) {
  return n == null ? '—' : n.toLocaleString('ko-KR');
}

function fmtGold(n: number | null | undefined) {
  return n == null ? '—' : (n / 1000).toFixed(1) + 'K';
}

function PlayerTable({ team, version }: { team: LiveTeam; version: string | null }) {
  return (
    <div className="live-team-players">
      <div className="live-team-caption">
        <strong>{team.code}</strong>
        <span className="cap">{team.side === 'blue' ? 'BLUE' : 'RED'}</span>
      </div>
      <div className="live-player-table-wrap">
        <table className="live-player-table">
          <thead>
            <tr>
              <th>선수 · 챔피언</th>
              <th>K / D / A</th>
              <th>CS</th>
              <th>GOLD</th>
              <th>아이템</th>
            </tr>
          </thead>
          <tbody>
            {team.players.map((p: LivePlayer) => (
              <tr key={p.id}>
                <td>
                  <span className="live-player-label">
                    <Champion version={version} id={p.championId} />
                    <span>
                      <b>{p.name.replace(/^\S+\s+/, '')}</b>
                      <small>{p.championId || p.role}</small>
                    </span>
                  </span>
                </td>
                <td className="live-tabular">{fmtNum(p.kills)} / {fmtNum(p.deaths)} / {fmtNum(p.assists)}</td>
                <td className="live-tabular">{fmtNum(p.cs)}</td>
                <td className="live-tabular">{fmtGold(p.gold)}</td>
                <td>
                  <span className="live-items">
                    {p.items.map((itemId, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={itemUrl(version, itemId)} alt={'아이템 ' + itemId} title={'아이템 ' + itemId} loading="lazy" />
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatPair({ label, blue, red }: { label: string; blue: string; red: string }) {
  return (
    <div className="live-stat-pair">
      <b className="live-tabular">{blue}</b>
      <span>{label}</span>
      <b className="live-tabular">{red}</b>
    </div>
  );
}

function Draft({ snapshot }: { snapshot: MatchSnapshot }) {
  const blue = snapshot.blue;
  const red = snapshot.red;
  if (!blue || !red) return null;
  const fearless = blue.fearless;
  return (
    <section className="live-draft">
      <h3 className="grouphead">픽 · 밴</h3>
      <div className="live-draft-sides">
        {[blue, red].map((team) => (
          <div key={team.side} className="live-draft-side">
            <div className="live-team-caption"><b>{team.code}</b><span className="cap">{team.side.toUpperCase()}</span></div>
            <div className="cap-xs">PICKS</div>
            <div className="live-champ-list">
              {team.players.map((p) => <Champion key={p.id} version={snapshot.assetVersion} id={p.championId} />)}
            </div>
            <div className="cap-xs" style={{ marginTop: 12 }}>BANS</div>
            {team.bans?.length ? (
              <div className="live-champ-list">
                {team.bans.map((champ, i) => <Champion key={champ + i} version={snapshot.assetVersion} id={champ} small />)}
              </div>
            ) : (
              <div className="cap">밴 기록 미확인</div>
            )}
          </div>
        ))}
      </div>
      {fearless.length > 0 && (
        <div className="live-fearless">
          <span className="cap-xs">이전 세트 픽 · 피어리스 제한</span>
          <div className="live-champ-list">
            {fearless.map((champ, i) => <Champion key={champ + i} id={champ} version={snapshot.assetVersion} small />)}
          </div>
        </div>
      )}
    </section>
  );
}

export default function LiveMatchStats({
  matchId,
  compact = false,
}: {
  matchId?: string;
  compact?: boolean;
}) {
  const { prefs } = useApp();
  const [data, setData] = useState<MatchSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chosenGame, setChosenGame] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const q = new URLSearchParams();
      if (matchId) q.set('matchId', matchId);
      if (chosenGame) q.set('game', String(chosenGame));
      try {
        const r = await fetch('/api/match/live-stats' + (q.size ? '?' + q : ''), { cache: 'no-store' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const j: { match: MatchSnapshot | null } = await r.json();
        if (alive) {
          setData(j.match);
          setError(null);
        }
      } catch {
        if (alive) setError('경기 정보를 확인하지 못했습니다');
      }
    };
    void load();
    const id = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(id); };
  }, [matchId, chosenGame]);

  if (!matchId && !data) return null;
  if (!data) {
    return (
      <div className="live-stats card">
        {error || '경기 정보를 확인 중입니다.'}
      </div>
    );
  }
  const { blue, red } = data;
  const hidden = !!prefs.spoiler && !revealed;
  const hasScore = blue && red && blue.players.length > 0 && red.players.length > 0;
  const isLive = data.state === 'inGame';

  return (
    <section className={'live-stats' + (compact ? ' compact' : '')} aria-label="경기 실시간 통계">
      <div className="live-stats-top">
        <div className="live-stats-heading">
          {isLive && <span className="badge b-live"><i className="dot" /> LIVE</span>}
          <b>{data.competition}</b>
          <span className="cap">GAME {data.gameNumber || '—'}</span>
        </div>
        <div className="live-stats-meta">
          {data.stale && <span className="cap"><ShieldAlert size={13} /> 갱신 지연</span>}
          {error && <span className="cap"><RefreshCw size={13} /> 연결 재시도 중</span>}
          {data.sourceUpdatedAt && <time className="cap" dateTime={data.sourceUpdatedAt}>
            {new Date(data.sourceUpdatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준
          </time>}
          {compact && <Link className="btn btn-ghost btn-sm" href={'/match/' + data.matchId}>상세 <ChevronRight size={14} /></Link>}
        </div>
      </div>

      {data.games.length > 1 && !compact && (
        <div className="live-game-tabs">
          {data.games.map((g) => (
            <button key={g.id} className={'chip' + ((chosenGame ?? data.gameNumber) === g.number ? ' on' : '')}
              aria-pressed={(chosenGame ?? data.gameNumber) === g.number} onClick={() => setChosenGame(g.number)}>
              GAME {g.number}
            </button>
          ))}
          {chosenGame && <button className="chip" onClick={() => setChosenGame(null)}>현재 세트</button>}
        </div>
      )}

      {hidden ? (
        <button className="live-spoiler" onClick={() => setRevealed(true)}>
          <ShieldAlert size={17} />
          스포일러 차단 · 기록 보기
        </button>
      ) : (
        <>
          {blue && red && (
            <div className="live-score">
              <div className="live-side"><b>{blue.code}</b><span className="cap">BLUE</span></div>
              <div className="live-series">
                <b>{fmtNum(blue.gamesWon)} : {fmtNum(red.gamesWon)}</b>
                <span className="cap">SET SCORE</span>
              </div>
              <div className="live-side right"><b>{red.code}</b><span className="cap">RED</span></div>
            </div>
          )}
          {hasScore ? (
            <>
              <div className="live-team-summary">
                <StatPair label="킬" blue={fmtNum(blue.kills)} red={fmtNum(red.kills)} />
                <StatPair label="골드" blue={fmtGold(blue.gold)} red={fmtGold(red.gold)} />
                <StatPair label="타워" blue={fmtNum(blue.towers)} red={fmtNum(red.towers)} />
                <StatPair label="드래곤" blue={fmtNum(blue.dragons.length)} red={fmtNum(red.dragons.length)} />
                <StatPair label="바론" blue={fmtNum(blue.barons)} red={fmtNum(red.barons)} />
              </div>
              {!compact && (
                <>
                  <PlayerTable team={blue} version={data.assetVersion} />
                  <PlayerTable team={red} version={data.assetVersion} />
                  <Draft snapshot={data} />
                </>
              )}
            </>
          ) : (
            <p className="cap" style={{ paddingTop: 12 }}>{data.state === 'scheduled' ? '경기 시작 전' : '세트 데이터 반영 대기 중'}</p>
          )}
        </>
      )}
    </section>
  );
}
