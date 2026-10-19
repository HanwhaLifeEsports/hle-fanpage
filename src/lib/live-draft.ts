import { dataDragonVersionForPatch } from './ddragon';

type DraftSide = { code: string; players: { championId: string }[] };
type WikiRow = {
  Team1: string;
  Team2: string;
  Team1Bans: string;
  Team2Bans: string;
  Team1Picks: string;
  Team2Picks: string;
  N_GameInMatch: string;
  DateTime_UTC: string;
};
type DraftResult = { blue: string[]; red: string[] };
const API = 'https://lol.fandom.com/api.php';
const UA = 'hle-fanpage/1.0 (noncommercial fan project)';
const cache = new Map<string, { until: number; result: DraftResult | null }>();

const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
const parseList = (v: string | string[] | null | undefined): string[] =>
  Array.isArray(v) ? v.filter(Boolean) :
    typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : [];

function overlap(current: string[], wiki: string[]): number {
  const names = new Set(wiki.map(normalize));
  return current.map(normalize).filter((champ) => names.has(champ)).length;
}

async function keyMapForPatch(patch: string | null): Promise<Map<string, string>> {
  const v = await dataDragonVersionForPatch(patch);
  const u = 'https://ddragon.leagueoflegends.com/cdn/' + v + '/data/en_US/champion.json';
  const res = await fetch(u, { signal: AbortSignal.timeout(5_000) });
  if (!res.ok) throw new Error('ddragon ' + res.status);
  const body = await res.json() as { data?: Record<string, { name: string }> };
  const map = new Map<string, string>();
  for (const [key, item] of Object.entries(body.data || {})) {
    map.set(normalize(key), key);
    map.set(normalize(item.name), key);
  }
  return map;
}

/**
 * Leaguepedia updates bans after a game has started/finished, often later.
 * Only accept an entry when both teams' combined champion picks match at least 8/10.
 * Unmatched/rate-limited pages are never treated as factual bans.
 */
export async function getVerifiedBans(
  sourceTime: string | null,
  gameNumber: number,
  blue: DraftSide,
  red: DraftSide,
  patch: string | null,
): Promise<DraftResult | null> {
  if (!sourceTime || blue.players.length < 5 || red.players.length < 5) return null;
  const source = Date.parse(sourceTime);
  if (!Number.isFinite(source)) return null;
  const date = new Date(source).toISOString().slice(0, 10);
  const cacheKey = date + ':' + gameNumber + ':' + blue.code + ':' + red.code;
  const c = cache.get(cacheKey);
  if (c && Date.now() < c.until) return c.result;
  // Mark the query as checked up front, preventing simultaneous fan traffic bursts.
  cache.set(cacheKey, { until: Date.now() + 10 * 60_000, result: null });
  if (cache.size > 100) cache.delete(cache.keys().next().value!);
  try {
    const start = new Date(source - 24 * 60 * 60_000).toISOString().slice(0, 10);
    const end = new Date(source + 24 * 60 * 60_000).toISOString().slice(0, 10);
    const where = "SG.DateTime_UTC >= '" + start + " 00:00:00' AND SG.DateTime_UTC <= '" + end +
      " 23:59:59' AND (SG.Team1='Hanwha Life Esports' OR SG.Team2='Hanwha Life Esports')";
    const query = new URLSearchParams({
      action: 'cargoquery', format: 'json', limit: '100', tables: 'ScoreboardGames=SG',
      fields: 'SG.Team1,SG.Team2,SG.Team1Bans,SG.Team2Bans,SG.Team1Picks,SG.Team2Picks,SG.N_GameInMatch,SG.DateTime_UTC',
      where,
    });
    const res = await fetch(API + '?' + query, {
      headers: { 'User-Agent': UA }, cache: 'no-store', signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const payload = await res.json() as { error?: unknown; cargoquery?: { title: WikiRow }[] };
    if (payload.error) return null;
    const b = blue.players.map((p) => p.championId);
    const r = red.players.map((p) => p.championId);
    let selected: { row: WikiRow; reversed: boolean } | null = null;
    for (const result of payload.cargoquery || []) {
      const row = result.title;
      if (Number(row.N_GameInMatch) !== gameNumber) continue;
      const t1 = parseList(row.Team1Picks);
      const t2 = parseList(row.Team2Picks);
      const direct = overlap(b, t1) + overlap(r, t2);
      const reversed = overlap(b, t2) + overlap(r, t1);
      if (Math.max(direct, reversed) < 8) continue;
      selected = { row, reversed: reversed > direct };
      break;
    }
    if (!selected) return null;
    const map = await keyMapForPatch(patch);
    const convert = (list: string[]) => list.map((champ) => map.get(normalize(champ)) || '').filter(Boolean);
    const one = convert(parseList(selected.row.Team1Bans));
    const two = convert(parseList(selected.row.Team2Bans));
    if (!one.length || !two.length) return null;
    const value = selected.reversed ? { blue: two, red: one } : { blue: one, red: two };
    cache.set(cacheKey, { until: Date.now() + 45 * 60_000, result: value });
    return value;
  } catch {
    return null;
  }
}
