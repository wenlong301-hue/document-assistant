import TurndownService from "turndown";

export const turndownService = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
turndownService.keep(["table", "thead", "tbody", "tr", "th", "td", "video"]);
turndownService.addRule("mermaidDiagram", {
  filter: (node) => node.nodeName === "DIV" && (node as HTMLElement).classList.contains("mermaid-diagram"),
  replacement: (_content, node) => {
    const source = (node as HTMLElement).getAttribute("data-mermaid-source") || "";
    if (!source.trim()) return "\n\n";
    return `\n\n\`\`\`mermaid\n${source.trimEnd()}\n\`\`\`\n\n`;
  },
});
turndownService.addRule("docDiagram", {
  filter: (node) => node.nodeName === "DIV" && (node as HTMLElement).classList.contains("doc-diagram"),
  replacement: (_content, node) => {
    const el = node as HTMLElement;
    const kind = (el.getAttribute("data-diagram-kind") || "mermaid").toLowerCase();
    const source = el.getAttribute("data-diagram-source") || "";
    if (!source.trim()) return "\n\n";
    return `\n\n\`\`\`${kind}\n${source.trimEnd()}\n\`\`\`\n\n`;
  },
});
turndownService.addRule("mermaidCodeBlock", {
  filter: (node) => {
    if (node.nodeName !== "PRE") return false;
    const code = (node as HTMLElement).querySelector("code");
    const cls = `${(node as HTMLElement).className || ""} ${code?.className || ""}`;
    const data = (node as HTMLElement).getAttribute("data-language") || code?.getAttribute("data-language") || "";
    return /language-(mermaid|sequence|flow)|\b(mermaid|sequence|flow)\b/i.test(`${cls} ${data}`);
  },
  replacement: (_content, node) => {
    const code = (node as HTMLElement).querySelector("code");
    const data = (node as HTMLElement).getAttribute("data-language") || code?.getAttribute("data-language") || "";
    const cls = `${(node as HTMLElement).className || ""} ${code?.className || ""}`;
    const hit = data.match(/^(mermaid|sequence|flow)$/i)?.[1]
      || cls.match(/language-(mermaid|sequence|flow)/i)?.[1]
      || "mermaid";
    const source = (code?.textContent || (node as HTMLElement).textContent || "").trimEnd();
    if (!source) return "\n\n";
    return `\n\n\`\`\`${hit.toLowerCase()}\n${source}\n\`\`\`\n\n`;
  },
});
