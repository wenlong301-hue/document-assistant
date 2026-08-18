export const normalizeLineEndings = (text: string) => String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

export const getDominantLineEnding = (text: string) => {
  const crlf = (String(text || "").match(/\r\n/g) || []).length;
  const lf = (String(text || "").replace(/\r\n/g, "").match(/\n/g) || []).length;
  return crlf > lf ? "\r\n" : "\n";
};

export const applyLineEnding = (text: string, lineEnding = "\n") => normalizeLineEndings(text).replace(/\n/g, lineEnding);

export const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

export const getDisplayFileName = (value: string) => {
  const name = String(value || "文档").split(/[\\/]/).pop() || "文档";
  return name.replace(/\.(mdoc|md|txt|html|htm|docx)$/i, "") || name;
};

/** 折叠空白后比较，用于判断编辑是否只是导入/渲染造成的空格差异 */
export const normalizeComparableText = (value: string) => String(value || "")
  .replace(/\u00a0/g, " ")
  .replace(/[\t\r\n]+/g, " ")
  .replace(/ +/g, " ")
  .trim();

export const textsSemanticallyEqual = (a: string, b: string) =>
  normalizeComparableText(a) === normalizeComparableText(b);

/**
 * edited 相对 original 是否只是空白被折叠/规范化（导入渲染损耗），而非用户改了文案或故意加空格。
 * - 文案语义不同 → false
 * - 完全一致 → true
 * - 语义相同且 edited 空白数 ≤ original → 视为折叠，应写回原文
 * - 语义相同但 edited 空白更多 → 用户可能故意加空格，应写回 edited
 */
export const isWhitespaceCollapsedFrom = (edited: string, original: string) => {
  const e = normalizeLineEndings(edited);
  const o = normalizeLineEndings(original);
  if (e === o) return true;
  if (!textsSemanticallyEqual(e, o)) return false;
  const countWs = (value: string) => (String(value).match(/[ \t\u00a0]/g) || []).length;
  return countWs(e) <= countWs(o);
};

