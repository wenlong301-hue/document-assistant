export const getDropdownPosition = (anchor: DOMRect, width = 158, height = 120) => {
  const margin = 8;
  const preferredLeft = anchor.right - width;
  const preferredTop = anchor.bottom + 4;
  return {
    left: Math.max(margin, Math.min(preferredLeft, window.innerWidth - width - margin)),
    top: Math.max(margin, Math.min(preferredTop, window.innerHeight - height - margin)),
  };
};
