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

declare module "flowchart.js" {
  const flowchart: {
    parse: (source: string) => {
      drawSVG: (container: HTMLElement, options?: Record<string, unknown>) => void;
      clean?: () => void;
    };
  };
  export default flowchart;
}

declare module "js-sequence-diagrams/dist/sequence-diagram-raphael.js";

declare module "raphael" {
  const Raphael: any;
  export default Raphael;
}
