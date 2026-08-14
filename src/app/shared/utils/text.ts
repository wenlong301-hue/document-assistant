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
