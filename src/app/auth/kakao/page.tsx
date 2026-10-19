"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RETURN_KEY, kakaoRedirectUri } from "@/components/Account";
import { loginWithKakaoCode } from "@/lib/hleapi";

/**
 * 카카오 로그인에서 돌아오는 곳. 인가 코드를 서버(api.hle.today)에 넘기면
 * 서버가 카카오 토큰으로 바꾸고 검증한 뒤 로그인 토큰을 준다.
 */
export default function KakaoCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("카카오 계정으로 로그인하는 중…");

  useEffect(() => {
    const finish = async () => {
      const q = new URLSearchParams(location.search);
      const code = q.get("code");
      const state = q.get("state");
      let expected: string | null = null;
      let back = "/me";
      try {
        expected = sessionStorage.getItem("hle-kakao-state");
        back = sessionStorage.getItem(RETURN_KEY) || "/me";
        sessionStorage.removeItem("hle-kakao-state");
      } catch {}

      if (!code) {
        setMsg(
          q.get("error") === "access_denied"
            ? "로그인을 취소했습니다"
            : "카카오에서 로그인 정보를 받지 못했습니다",
        );
        return;
      }
      // 다른 곳에서 시작된 로그인 응답이 섞여 들어오는 것을 막는다
      if (!expected || expected !== state) {
        setMsg("로그인 요청이 만료됐습니다. 다시 시도해 주세요");
        return;
      }
      try {
        await loginWithKakaoCode(code, kakaoRedirectUri());
        router.replace(back);
      } catch {
        setMsg("로그인에 실패했습니다. 잠시 뒤 다시 시도해 주세요");
      }
    };
    void finish();
  }, [router]);

  return (
    <div className="wrap sec">
      <h1 className="ko ptitle">{msg}</h1>
      <a
        className="btn btn-ghost btn-sm"
        href="/me"
        style={{ marginTop: "var(--s5)" }}
      >
        MY로 돌아가기
      </a>
    </div>
  );
}
