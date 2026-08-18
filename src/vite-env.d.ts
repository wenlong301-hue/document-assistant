/// <reference types="vite/client" />

declare module "html-to-docx" {
  const htmlToDocx: (
    htmlString: string,
    headerHTMLString?: string | null,
    documentOptions?: Record<string, unknown>,
    footerHTMLString?: string | null
  ) => Promise<ArrayBuffer | Blob | Buffer>;
  export default htmlToDocx;
}

declare module "turndown" {
  export default class TurndownService {
    constructor(options?: Record<string, unknown>);
    keep(tags: string[]): this;
    addRule(key: string, rule: { filter: unknown; replacement: (...args: any[]) => string }): this;
    turndown(html: string): string;
  }
}

declare module "mammoth" {
  const mammoth: {
    convertToHtml: (
      input: { arrayBuffer: ArrayBuffer },
      options?: Record<string, unknown>
    ) => Promise<{ value: string; messages?: unknown[] }>;
  };
  export default mammoth;
}
