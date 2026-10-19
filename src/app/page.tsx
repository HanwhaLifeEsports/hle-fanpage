import Link from "next/link";
import { sidesOf } from "@/lib/pick";
import LiveMatchStats from "@/components/LiveMatchStats";
import TeamLogo from "@/components/TeamLogo";
import { HeroCountdown, PickLogo, RecentTiles } from "@/components/AppHome";
import { getSeason } from "@/lib/season";
import { getWorldsAll } from "@/lib/lolesports-live";
import { ResultRow } from "@/components/MatchFilter";
import { OUR_TAG, PLAYERS } from "@/lib/lck2026";

export const dynamic = "force-dynamic";

const koreaDay = (d: Date) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);

// 공식 사진을 끄는 스위치 (선수단 페이지와 같은 값)
const PHOTOS_ON = process.env.NEXT_PUBLIC_PLAYER_PHOTOS !== "off";

export default async function Home() {
  const worldsPromise = getWorldsAll().catch(() => []);
  let bundle;
  try {
    bundle = await getSeason();
  } catch {
    return (
      <div className="wrap sec">
        <h2 className="ko ptitle rv">경기 정보를 불러오지 못했습니다</h2>
        <p className="lede rv" style={{ marginTop: 10 }}>
          새로고침해 주세요.
        </p>
      </div>
    );
  }

  const worlds = await worldsPromise;
  const { season, us } = bundle;
  const allMatches = [...season.matches, ...worlds].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );
  const ourMatches = allMatches.filter(
    (m) => m.a.code === OUR_TAG || m.b.code === OUR_TAG,
  );
  const now = Date.parse(bundle.fetchedAt);
  const next =
    ourMatches
      .filter(
        (m) =>
          m.state !== "completed" &&
          (m.state === "inProgress" ||
            Date.parse(m.startTime) > now - 4 * 60 * 60_000),
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0] || null;
  const recent = ourMatches
    .filter((m) => m.state === "completed")
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .slice(0, 3);
  const upcoming = ourMatches
    .filter((m) => m.state === "unstarted" && Date.parse(m.startTime) > now)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, 3);
  // 월즈 기간에는 다른 팀 경기도 홈에서 몇 개 보여준다: 진행 중·다가오는 것 먼저, 모자라면 최근 결과
  const worldsOthers = worlds.filter(
    (m) => m.a.code !== OUR_TAG && m.b.code !== OUR_TAG,
  );
  const othersAhead = worldsOthers
    .filter(
      (m) =>
        m.state !== "completed" &&
        Date.parse(m.startTime) > now - 4 * 60 * 60_000,
    )
    .slice(0, 4);
  const othersDone = worldsOthers
    .filter((m) => m.state === "completed")
    .sort((a, b) => b.startTime.localeCompare(a.startTime))
    .slice(0, Math.max(0, 4 - othersAhead.length));
  const othersShown = [...othersAhead, ...othersDone];
  const today = next
    ? koreaDay(new Date(next.startTime)) === koreaDay(new Date(now))
    : false;
  const opp = next ? sidesOf(next).them : null;

  const findTeam = (code: string) => {
    for (const g of ["legend", "rise"] as const) {
      const row = season[g].find((t) => t.code === code);
      if (row) return { row, g };
    }
    return null;
  };
  const oppTeam = opp ? findTeam(opp.code) : null;

  const fmtMd = (iso: string) =>
    new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "numeric",
      day: "numeric",
    })
      .format(new Date(iso))
      .replace(/\.\s?/g, ".")
      .replace(/\.$/, "");
  const fmtFull = (iso: string) =>
    new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  const untilText = (iso: string) => {
    const s = (Date.parse(iso) - now) / 1000;
    if (s <= 0) return "곧";
    if (s >= 86400) return `${Math.floor(s / 86400)}일 뒤`;
    if (s >= 3600) return `${Math.floor(s / 3600)}시간 뒤`;
    return `${Math.floor(s / 60)}분 뒤`;
  };
  const usSide = next ? sidesOf(next).us : null;
  const recentItems = recent.map((m) => {
    const { us: u, them } = sidesOf(m);
    return {
      id: m.id,
      date: fmtMd(m.startTime),
      opponentImage: them.image || null,
      opponentCode: them.code,
      us: u.games ?? 0,
      them: them.games ?? 0,
    };
  });

  return (
    <div className="ui-page wide ui-home">
      {next && opp ? (
        <section className="ui-hero">
          <div className="ui-kicker">
            {next.blockName ? `${next.blockName}` : "NEXT MATCH"}
            {today && " · 오늘"}
          </div>
          <h1>
            {next.state === "inProgress"
              ? `지금 ${opp.code}와\n경기 중이에요`
              : `${untilText(next.startTime)},\n${opp.code}를 만나요`}
          </h1>
          <div className="ui-match glass-ink">
            <div className="ui-vs">
              <div className="t">
                <TeamLogo
                  image={usSide?.image}
                  size={72}
                  label="한화생명e스포츠"
                />
                <b>{OUR_TAG}</b>
                {us && (
                  <span>
                    {us.w}승 {us.l}패
                  </span>
                )}
              </div>
              <div className="m">
                <span>BO{next.bo}</span>
                <b>VS</b>
              </div>
              <div className="t">
                <TeamLogo image={opp.image} size={72} label={opp.name} />
                <b>{opp.code}</b>
                <span>
                  {oppTeam ? `${oppTeam.row.w}승 ${oppTeam.row.l}패` : opp.name}
                </span>
              </div>
            </div>
            {next.state === "unstarted" && (
              <HeroCountdown target={next.startTime} />
            )}
            <div className="ui-when">{fmtFull(next.startTime)}</div>
            <div className="ui-row">
              <Link className="ui-pill white" href="/me">
                경기 알림 받기
              </Link>
              <Link className="ui-pill glass" href="/live">
                중계 보기
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <section className="ui-hero">
          <h1>{"예정된 경기가\n없어요"}</h1>
          <p>일정이 나오면 여기에 바로 보여요</p>
        </section>
      )}

      <div className="ui-stack">
        <LiveMatchStats compact />

        {recentItems.length > 0 && (
          <section className="ui-paper">
            <div className="ui-head">
              <h2>지난 경기</h2>
              <Link href="/schedule">전체</Link>
            </div>
            <RecentTiles items={recentItems} />
          </section>
        )}

        {next && opp && next.state === "unstarted" && (
          <Link href="/predict" className="ui-predict">
            <div className="ui-head">
              <h2>승부예측</h2>
              <span className="cap">세트 스코어까지 맞히면 3점</span>
            </div>
            <div className="ui-row">
              <span className="ui-chipbtn glass">
                <PickLogo image={usSide?.image ?? null} />
                {OUR_TAG} 승
              </span>
              <span className="ui-chipbtn glass">
                <PickLogo image={opp.image || null} />
                {opp.code} 승
              </span>
            </div>
          </Link>
        )}

        <section className="ui-paper">
          <div className="ui-head">
            <h2>선수단</h2>
            <Link href="/roster">프로필</Link>
          </div>
          <div className="ui-roster">
            {PLAYERS.map((p) => (
              <Link key={p.id} href={`/roster#${p.id}`}>
                <i className="ui-face">
                  {PHOTOS_ON && p.photo ? (
                    <img
                      src={p.photo.src}
                      alt=""
                      loading="lazy"
                      style={
                        p.photo.face
                          ? ({
                              "--fx": p.photo.face.x,
                              "--fy": p.photo.face.y,
                            } as React.CSSProperties)
                          : undefined
                      }
                    />
                  ) : (
                    p.no
                  )}
                </i>
                <b>{p.nm}</b>
                <span>{p.pos}</span>
              </Link>
            ))}
          </div>
        </section>

        {upcoming.length > 1 && (
          <section className="ui-paper">
            <div className="ui-head">
              <h2>다가오는 일정</h2>
              <Link href="/schedule">전체</Link>
            </div>
            {upcoming.slice(1).map((m) => {
              const { them } = sidesOf(m);
              return (
                <Link key={m.id} href={`/match/${m.id}`} className="ui-line">
                  <TeamLogo image={them.image} size={44} label={them.name} />
                  <div>
                    <b>vs {them.name}</b>
                    <span className="cap">
                      {fmtFull(m.startTime)} · BO{m.bo}
                    </span>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
        {othersShown.length > 0 && (
          <section className="ui-paper">
            <div className="ui-head">
              <h2>월즈 다른 경기</h2>
              <Link href="/schedule?f=intl">전체</Link>
            </div>
            <div className="ui-list">
              {othersShown.map((m) => (
                <ResultRow key={m.id} m={m} ourTag={OUR_TAG} />
              ))}
            </div>
          </section>
        )}
      </div>

      <p className="ui-notice">
        비공식 팬 사이트 · 팀·리그 로고의 권리는 각 소유자에게 있습니다
      </p>
    </div>
  );
}
