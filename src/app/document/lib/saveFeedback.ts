/** Save-mode → toast message (caller still calls setToast). */
export function messageForSaveMode(mode?: string): string {
  if (mode === "preserved") return "已原样保存（未改动格式）";
  if (mode === "patched") return "已保存（尽量保留 Word 样式）";
  if (mode === "mdoc") return "已保存 .mdoc";
  if (mode === "converted") return "已保存（格式已转换，可能有损）";
  return "已保存到原文件";
}
