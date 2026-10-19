import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '출처 안내',
  description: 'HLE FAN에서 사용하는 공식 사진과 경기·선수 데이터의 출처입니다.',
};

const SOURCES = [
  { title: '선수 프로필 사진', name: '한화생명e스포츠 공식 홈페이지', url: 'https://hle.kr/', description: 'Zeus · Kanavi · Zeka · Gumayusi · Delight의 공식 프로필 사진. 2026년 10월 1일 확인했습니다.' },
  { title: '경기 일정 · 결과 · 순위', name: 'LoL Esports', url: 'https://lolesports.com/', description: '공식 경기 데이터를 바탕으로 일정과 결과, 정규시즌 통합 순위를 제공합니다.' },
  { title: '선수 기록 · POM', name: '네이버 e스포츠', url: 'https://game.naver.com/esports', description: '선수별 정규시즌 기록과 POM 포인트를 제공합니다.' },
  { title: '챔피언별 기록 · 계약 정보', name: 'Leaguepedia', url: 'https://lol.fandom.com/', description: '선수별 챔피언 전적과 계약 정보를 참고합니다.' },
  { title: '챔피언 정보 · 이미지', name: 'Riot Games Data Dragon', url: 'https://developer.riotgames.com/docs/lol#data-dragon', description: '리그 오브 레전드 챔피언 이름과 이미지에 사용합니다.' },
];

export default function SourcesPage() {
  return (
    <div className="wrap sec">
      <h1 className="ko ptitle rv">출처 안내</h1>

      <div style={{ display: 'grid', gap: 'var(--s4)' }}>
        {SOURCES.map((source) => (
          <section className="card rv" key={source.title}>
            <h2 className="ko" style={{ fontSize: 20 }}>{source.title}</h2>
            <p style={{ marginTop: 12 }}>
              <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>{source.name}</a>
            </p>
            <p className="cap" style={{ marginTop: 8 }}>{source.description}</p>
          </section>
        ))}
      </div>
      <p className="cap" style={{ marginTop: 'var(--s5)' }}>사진·데이터 권리는 각 권리자에게 있습니다.</p>
    </div>
  );
}
