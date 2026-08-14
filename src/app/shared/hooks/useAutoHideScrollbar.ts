import { useEffect } from "react";
import type React from "react";

export function useAutoHideScrollbar(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add("scroll-auto-hide");
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      el.classList.add("sb-scrolling");
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove("sb-scrolling"), 700);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (timer) clearTimeout(timer);
      el.removeEventListener("scroll", onScroll);
    };
  }, [ref]);
}
