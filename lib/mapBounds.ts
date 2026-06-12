/** Right inset (CSS length) for map overlays when the chat sidebar is open. */
export function getMapRightInset(
  showSidebarChat: boolean,
  chatMinimized: boolean,
): string {
  if (!showSidebarChat) return "0";
  if (chatMinimized) return "3rem";
  return "min(100vw, 32rem)";
}

/** Megaphone only shifts when the sidebar is open and expanded (not minimized). */
export function getMegaphoneRightInset(
  showSidebarChat: boolean,
  chatMinimized: boolean,
): string {
  if (showSidebarChat && !chatMinimized) return "min(100vw, 32rem)";
  return "0";
}

/** Outer positioning for the privacy note — on mobile, centers in the map column beside chat. */
export function getPrivacyNoteOuterClass(
  showSidebarChat: boolean,
  chatMinimized: boolean,
): string {
  const desktop =
    "sm:left-1/2 sm:-translate-x-1/2 sm:w-[min(100vw-1.5rem,22rem)]";

  if (!showSidebarChat) {
    return "left-1/2 -translate-x-1/2";
  }

  if (chatMinimized) {
    return `${desktop} max-sm:left-[calc((100vw-3rem)/2)] max-sm:w-[min(calc(100vw-3rem-1.5rem),22rem)] max-sm:-translate-x-1/2 max-sm:transition-[left,width] max-sm:duration-300 max-sm:ease-in-out`;
  }

  return `${desktop} max-sm:left-1/2 max-sm:w-[min(100vw-1.5rem,22rem)] max-sm:-translate-x-1/2`;
}
