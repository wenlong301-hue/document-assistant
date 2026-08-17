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
