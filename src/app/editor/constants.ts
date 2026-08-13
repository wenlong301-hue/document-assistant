export const FONT_FAMILIES = ["系统默认", "PingFang SC", "Microsoft YaHei", "SimSun", "KaiTi"];
export const FONT_SIZES = ["12px","13px","14px","15px","16px","17px","18px","20px","22px","24px","26px","28px","30px","32px"];
export const HEADING_OPTIONS = ["正文","一级标题","二级标题","三级标题","四级标题","五级标题"];
export const COLOR_PRESETS = [
  "#000000","#434343","#666666","#999999","#b7b7b7","#cccccc","#d9d9d9","#efefef","#f3f3f3","#ffffff",
  "#980000","#ff0000","#ff9900","#ffff00","#00ff00","#00ffff","#4a86e8","#0000ff","#9900ff","#ff00ff",
  "#e6b8af","#f4cccc","#fce5cd","#fff2cc","#d9ead3","#d0e0e3","#c9daf8","#cfe2f3","#d9d2e9","#ead1dc",
  "#dd7e6b","#ea9999","#f9cb9c","#ffe599","#b6d7a8","#a2c4c9","#a4c2f4","#9fc5e8","#b4a7d6","#d5a6bd",
  "#cc4125","#e06666","#f6b26b","#ffd966","#93c47d","#76a5af","#6d9eeb","#6fa8dc","#8e7cc3","#c27ba0",
  "#a61c00","#cc0000","#e69138","#f1c232","#6aa84f","#45818e","#3c78d8","#3d85c6","#674ea7","#a64d79",
  "#85200c","#990000","#b45f06","#bf9000","#38761d","#134f5c","#1155cc","#0b5394","#351c75","#741b47"
];

export const normalizeHexColor = (value: unknown, fallback = "#000000"): string => {
  if (typeof value !== "string") return fallback;
  const raw = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const [, r, g, b] = raw;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  const rgb = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) {
    const toHex = (n: string) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, "0");
    return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`;
  }
  return fallback;
};

export const getEditorTextCount = (text: string) => text.replace(/\s/g, "").length;
export const getEditorWordCount = (text: string) => text.replace(/\s/g, "").length > 0
  ? text.match(/[\u4e00-\u9fff\u3400-\u4dbf]|[a-zA-Z0-9]+/g)?.length ?? 0
  : 0;

export const getSlashMenuPlacement = (
  anchor: { left: number; top: number; bottom: number },
  options?: { itemCount?: number; menuWidth?: number },
) => {
  const menuWidth = options?.menuWidth ?? 190;
  const itemCount = Math.max(1, options?.itemCount ?? 14);
  const estimatedHeight = Math.min(8 + itemCount * 36, Math.max(200, window.innerHeight - 24));
  const gap = 6;
  const margin = 12;
  const spaceBelow = window.innerHeight - anchor.bottom - margin;
  const spaceAbove = anchor.top - margin;
  const placeBelow = spaceBelow >= Math.min(estimatedHeight, 240) || spaceBelow >= spaceAbove;
  const available = Math.max(120, placeBelow ? spaceBelow - gap : spaceAbove - gap);
  const maxHeight = Math.min(estimatedHeight, available);
  let top = placeBelow ? anchor.bottom + gap : anchor.top - gap - maxHeight;
  top = Math.max(margin, Math.min(top, window.innerHeight - maxHeight - margin));
  const left = Math.max(margin, Math.min(anchor.left, window.innerWidth - menuWidth - margin));
  return { left, top, maxHeight };
};

export const formatSavedAt = () => {
  const now = new Date();
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
};
