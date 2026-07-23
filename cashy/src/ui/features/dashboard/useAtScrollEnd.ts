import { useEffect, useRef, useState } from "react";

/**
 * Track whether a scroll container is scrolled to its bottom.
 *
 * The dashboard's subscription peek-strip fades its foot half-row to hint at
 * more below; once you actually reach the end there is nothing left to hint at,
 * so the strip drops the fade (see `.cashy-subgrid--scroll.is-at-bottom`). This
 * watches for that. It re-checks on scroll AND on resize of the element itself
 * — card heights vary and the card count changes the scroll extent, so a bound
 * that was mid-list can become the end without any scrolling.
 *
 * Defaults to `true` (a not-yet-scrollable strip hides nothing below it, so it
 * needs no fade).
 */
export function useAtScrollEnd<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [atEnd, setAtEnd] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 2px slack absorbs sub-pixel rounding so the end reliably registers.
    const check = () => setAtEnd(el.scrollHeight - el.scrollTop - el.clientHeight <= 2);
    check();
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
      window.removeEventListener("resize", check);
    };
  }, []);

  return { ref, atEnd };
}
