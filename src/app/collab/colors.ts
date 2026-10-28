export const COLLAB_COLORS = [
  "#134CFF",
  "#E53E3E",
  "#15803D",
  "#D97706",
  "#7C3AED",
  "#0F766E",
  "#DB2777",
  "#1D4ED8",
] as const;

export function collabColorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return COLLAB_COLORS[hash % COLLAB_COLORS.length];
}
