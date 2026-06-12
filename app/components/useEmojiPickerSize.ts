"use client";

import { useEffect, useState } from "react";
import { getEmojiPickerSize, type PickerSize } from "@/lib/emojiPickerLayout";

export function useEmojiPickerSize(active: boolean): PickerSize {
  const [size, setSize] = useState<PickerSize>(getEmojiPickerSize);

  useEffect(() => {
    if (!active) return;
    const sync = () => setSize(getEmojiPickerSize());
    sync();
    window.addEventListener("resize", sync);
    const vp = window.visualViewport;
    vp?.addEventListener("resize", sync);
    vp?.addEventListener("scroll", sync);
    return () => {
      window.removeEventListener("resize", sync);
      vp?.removeEventListener("resize", sync);
      vp?.removeEventListener("scroll", sync);
    };
  }, [active]);

  return size;
}
