export const imageRatioLockedRef = { current: true };

export const fitImageSize = (width: number, height: number, naturalW: number, naturalH: number, locked: boolean) => {
  if (!locked || naturalW <= 0 || naturalH <= 0) return { width: Math.round(width), height: Math.round(height) };
  const ratio = naturalW / naturalH;
  const nextW = Math.max(48, Math.round(width));
  return { width: nextW, height: Math.max(48, Math.round(nextW / ratio)) };
};

/** Keep resize container/wrapper shrink-wrapped to the img so selection outline tracks image size. */
export const syncContainerToImage = (container: HTMLElement | null | undefined) => {
  if (!container) return;
  container.style.width = "fit-content";
  container.style.maxWidth = "100%";
  container.style.display = "inline-flex";
  const wrapper = container.querySelector("[data-resize-wrapper]") as HTMLElement | null;
  if (wrapper) {
    wrapper.style.width = "fit-content";
    wrapper.style.maxWidth = "100%";
    wrapper.style.height = "auto";
  }
};
