export const PICKER_EDGE = 8;
export const PICKER_GAP = 8;
export const PICKER_MAX_WIDTH = 320;

export type PickerSize = { width: number; height: number };

export type ViewportBounds = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export function getViewportBounds(): ViewportBounds {
  if (typeof window === "undefined") {
    return { top: 0, left: 0, width: 390, height: 844 };
  }
  const vp = window.visualViewport;
  if (!vp) {
    return {
      top: 0,
      left: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }
  return {
    top: vp.offsetTop,
    left: vp.offsetLeft,
    width: vp.width,
    height: vp.height,
  };
}

export function getEmojiPickerSize(): PickerSize {
  const { width: vw, height: vh } = getViewportBounds();
  const width = Math.min(
    PICKER_MAX_WIDTH,
    Math.max(240, Math.floor(vw - PICKER_EDGE * 2)),
  );
  const mobile = vw < 640;
  const height = Math.max(
    220,
    Math.min(
      mobile ? 300 : 360,
      Math.floor(vh * (mobile ? 0.44 : 0.5)),
    ),
  );
  return { width, height };
}

export function clampPickerLeft(left: number, pickerWidth: number): number {
  const { left: vpLeft, width: vpWidth } = getViewportBounds();
  const min = vpLeft + PICKER_EDGE;
  const max = vpLeft + vpWidth - PICKER_EDGE - pickerWidth;
  return Math.min(max, Math.max(min, left));
}

export function centerPickerLeft(
  anchorCenterX: number,
  pickerWidth: number,
): number {
  return clampPickerLeft(anchorCenterX - pickerWidth / 2, pickerWidth);
}

function spaceBelow(rect: DOMRect, pickerHeight: number): number {
  const { top, height } = getViewportBounds();
  const bottom = top + height - PICKER_EDGE;
  return bottom - (rect.bottom + PICKER_GAP + pickerHeight);
}

function spaceAbove(rect: DOMRect, pickerHeight: number): number {
  const { top } = getViewportBounds();
  return rect.top - PICKER_GAP - pickerHeight - Math.max(top, PICKER_EDGE);
}

export function shouldOpenPickerBelow(
  rect: DOMRect,
  pickerHeight: number,
  preferBelow: boolean,
): boolean {
  const below = spaceBelow(rect, pickerHeight);
  const above = spaceAbove(rect, pickerHeight);
  if (preferBelow) {
    if (below >= 0) return true;
    if (above >= 0) return false;
    return below >= above;
  }
  if (above >= 0) return false;
  if (below >= 0) return true;
  return below > above;
}

export function getPickerPortalStyle(
  anchor: DOMRect,
  size: PickerSize,
  options: { preferBelow: boolean; align?: "start" | "center" },
): { left: number; top: number; width: number; transform?: string } {
  const openBelow = shouldOpenPickerBelow(anchor, size.height, options.preferBelow);
  const left =
    options.align === "center"
      ? centerPickerLeft(anchor.left + anchor.width / 2, size.width)
      : clampPickerLeft(anchor.left, size.width);

  if (openBelow) {
    return { left, top: anchor.bottom + PICKER_GAP, width: size.width };
  }
  return {
    left,
    top: anchor.top - PICKER_GAP,
    width: size.width,
    transform: "translateY(-100%)",
  };
}

export function shouldShowEmojiPreview(width: number): boolean {
  return width >= 640;
}
