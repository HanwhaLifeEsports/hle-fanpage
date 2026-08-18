'use client';

import { useEffect } from 'react';

/**
 * 스크롤 등장 효과.
 *
 * `.rv` 가 붙은 요소가 화면에 들어오면 `.show` 를 붙인다. 숨기는 것은 CSS 가
 * 하고 여기서는 시점만 정한다 — 서버가 그린 HTML 에 이미 `.rv` 가 있어야
 * 첫 페인트부터 숨겨진 상태로 시작한다. 자바스크립트가 붙은 뒤에 숨기면
 * 요소가 한 번 보였다가 사라졌다 다시 나타난다.
 *
 * 한 번 붙은 `.show` 는 떼지 않는다. 위로 다시 올라갈 때마다 다시 재생되면
 * 읽던 화면이 계속 움직여 성가시다.
 *
 * 화면 아래쪽 40px 은 발동 범위에서 뺀다(rootMargin). 바닥에 걸치자마자
 * 터지면 아직 눈이 닿지 않은 곳에서 애니메이션이 끝나 버린다.
 */
export default function Reveal() {
  useEffect(() => {
    // 동작을 줄여 달라고 한 사람에게는 아무것도 하지 않는다. CSS 도 같은 조건으로
    // 전환을 끄므로, 여기서 show 만 붙여 두면 그냥 보이는 상태가 된다
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const show = (el: Element) => el.classList.add('show');

    if (reduced) {
      document.querySelectorAll('.rv').forEach(show);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          show(e.target);
          io.unobserve(e.target); // 1회성이라 계속 지켜볼 이유가 없다
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );

    const watch = (el: Element) => {
      if (el.classList.contains('show')) return;
      // 이미 화면 안에 있는 것은 기다리지 않고 바로 보여준다. 첫 화면이 비어
      // 보이는 일이 없어야 한다
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) show(el);
      else io.observe(el);
    };

    document.querySelectorAll('.rv').forEach(watch);

    /* 나중에 그려지는 것도 챙긴다 — 일정 필터를 바꾸면 목록이 통째로 다시
       그려지고, 선수 모달은 누른 뒤에야 생긴다. 그때 관찰을 안 걸면 그 요소들은
       숨겨진 채로 남는다 */
    const mo = new MutationObserver((records) => {
      for (const rec of records) {
        for (const node of rec.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.classList.contains('rv')) watch(node);
          node.querySelectorAll?.('.rv').forEach(watch);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return null;
}
