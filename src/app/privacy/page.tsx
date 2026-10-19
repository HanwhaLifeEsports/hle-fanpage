import type { Metadata } from 'next';
import { ABUSE_CONTACT, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: '개인정보 처리방침',
  description: `${SITE_NAME} 웹·앱이 처리하는 개인정보와 보관 기간, 위탁·국외 이전, 삭제 방법.`,
};

/*
 * 사실과 다르면 문서가 거짓말이 된다. 아래 값은 코드·서버 설정과 맞춰 둔다.
 *  - 계정: hle-ios/server/auth.go — 소셜 계정 고유번호만 저장, 이메일 없음
 *  - 연쇄 삭제: hle-ios/server/migrations — 모든 관계가 CascadeDelete
 *  - 접속 기록: PocketBase 로그 설정 maxDays 5, logIP true
 *  - 서버: 도쿄 GreenCloud VPS, 앞단 Cloudflare 터널
 */
const UPDATED = '2026년 10월 19일';

export default function Privacy() {
  return (
    <div className="ui-page">
      <h1 className="ui-title">개인정보 처리방침</h1>
      <p className="ui-sub-cap">시행일 {UPDATED}</p>

      <article className="ui-paper ui-prose">
        <h2>1. 처리하는 개인정보</h2>
        <table>
          <tbody>
            <tr>
              <th>계정</th>
              <td>
                카카오·구글·애플 계정의 고유 식별번호, 닉네임, 최애 선수, 가입·수정 시각. 이메일·이름·전화번호·프로필
                사진은 받지 않습니다.
              </td>
            </tr>
            <tr>
              <th>이용 기록</th>
              <td>승부예측, 게시글·댓글, 경기 응원 채팅, 신고·차단 기록</td>
            </tr>
            <tr>
              <th>접속 기록</th>
              <td>IP 주소, 요청 주소, 브라우저·기기 정보 (서버 로그)</td>
            </tr>
            <tr>
              <th>앱 알림</th>
              <td>iOS 앱의 푸시 토큰과 알림 항목 설정</td>
            </tr>
            <tr>
              <th>팬 사진</th>
              <td>직접 올린 사진, 브라우저별 임의 식별자, 하트·신고 기록</td>
            </tr>
          </tbody>
        </table>
        <p>
          알림 설정·테마·스포일러 가리기·로그인 상태는 이용자의 브라우저(로컬 저장소)에만 저장되며 서버로 보내지
          않습니다.
        </p>

        <h2>2. 이용 목적</h2>
        <ul>
          <li>로그인과 본인 확인, 웹·앱 간 승부예측 동기화</li>
          <li>게시판·응원 채팅 운영, 신고 처리와 이용 제한</li>
          <li>경기 알림 발송</li>
          <li>장애 대응과 부정 이용 방지 (접속 기록)</li>
        </ul>

        <h2>3. 보관 기간과 파기</h2>
        <ul>
          <li>계정과 이용 기록: 계정 삭제 시 즉시 함께 삭제</li>
          <li>접속 기록: 5일 뒤 자동 삭제</li>
          <li>팬 사진: 올린 사람이 삭제하거나 신고로 내려질 때 삭제</li>
        </ul>
        <p>삭제된 정보는 복구할 수 없는 방법으로 지웁니다.</p>

        <h2>4. 계정 삭제</h2>
        <p>
          웹과 앱 모두 <b>MY → 계정 삭제</b>에서 바로 삭제할 수 있습니다. 게시글·댓글·채팅·예측·신고·차단 기록과 푸시
          토큰이 함께 지워집니다.
        </p>

        <h2>5. 처리 위탁과 국외 이전</h2>
        <table>
          <thead>
            <tr>
              <th>받는 곳 (국가)</th>
              <th>항목 · 목적</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Greencloud LLC (일본, 도쿄 데이터센터)</td>
              <td>1항의 계정·이용·접속 기록 · 서버 운영과 저장</td>
            </tr>
            <tr>
              <td>Cloudflare, Inc. (미국)</td>
              <td>접속 기록 · 보안 연결과 전송</td>
            </tr>
            <tr>
              <td>Supabase, Inc. (미국, 저장 위치 대한민국 서울)</td>
              <td>팬 사진과 관련 기록 · 저장</td>
            </tr>
          </tbody>
        </table>
        <p>
          서비스를 이용할 때 네트워크로 전송되며, 보관 기간은 3항과 같습니다. 이전을 원하지 않으면 계정을 삭제하거나
          로그인하지 않고 이용할 수 있습니다.
        </p>

        <h2>6. 소셜 로그인</h2>
        <p>
          카카오·구글·애플 로그인은 각 회사가 본인을 확인하고, 이 서비스는 확인 결과로 받은 계정 고유 식별번호만
          저장합니다. 각 회사의 정보 처리는 해당 회사의 방침을 따릅니다.
        </p>

        <h2>7. 외부 서비스</h2>
        <ul>
          <li>LoL Esports·네이버 e스포츠: 일정·기록을 서버에서 가져오며 이용자 정보는 보내지 않습니다.</li>
          <li>치지직·SOOP·YouTube: 중계나 다시보기를 열면 해당 플랫폼이 자체 방침에 따라 정보를 수집할 수 있습니다.</li>
        </ul>
        <p>
          광고·방문 분석·추적 스크립트를 쓰지 않으며, 이 서비스가 직접 만드는 쿠키는 없습니다. 구글 로그인 버튼은 구글
          방침에 따라 쿠키를 쓸 수 있습니다.
        </p>

        <h2>8. 이용자의 권리</h2>
        <p>
          닉네임·최애 선수는 MY에서 직접 고칠 수 있습니다. 그 밖의 열람·정정·삭제·처리 정지 요청은 아래 연락처로
          받으며, 지체 없이 처리합니다.
        </p>

        <h2>9. 권리 침해 신고 · 삭제 요청</h2>
        <p>
          {/* 저작권법 제103조 제4항 — 수령인을 지정하고 이용자가 쉽게 알 수 있도록 공지해야 한다 */}
          저작권법 제103조에 따른 복제·전송 중단 요구, 정보통신망법 제44조의2에 따른 삭제 요청, 초상권에 따른 사진
          삭제 요청을 받습니다. 접수되면 해당 내용을 먼저 내린 뒤 확인합니다.
        </p>

        <h2>10. 개인정보 보호책임자 · 연락처</h2>
        <p>
          운영자 (개인, 비영리 팬 사이트) ·{' '}
          <a href={ABUSE_CONTACT.href} target="_blank" rel="noopener noreferrer">
            {ABUSE_CONTACT.label}
          </a>
        </p>
        <p>
          개인정보침해 신고센터 (privacy.kisa.or.kr, 국번 없이 118), 개인정보 분쟁조정위원회 (kopico.go.kr,
          1833-6972)에도 신고·상담할 수 있습니다.
        </p>

        <h2>11. 변경</h2>
        <p>내용이 바뀌면 시행 7일 전부터 이 페이지에 알립니다.</p>
      </article>
    </div>
  );
}
