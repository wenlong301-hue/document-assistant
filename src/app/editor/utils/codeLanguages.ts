/** Typora 式代码块语言：可渲染图表 + 常见高亮语言 */

export type CodeLangOption = {
  id: string;
  label: string;
  /** 是否有下方图表预览 */
  diagram?: boolean;
};

export const DIAGRAM_LANGS = new Set(["mermaid", "sequence", "flow"]);

export const isDiagramLanguage = (lang?: string | null) =>
  DIAGRAM_LANGS.has(String(lang || "").toLowerCase());

/** 语言选择器列表（空 = 纯代码块）；label 用于展示，默认与 id 一致 */
export const CODE_LANGUAGE_OPTIONS: CodeLangOption[] = [
  { id: "", label: "plaintext" },
  { id: "mermaid", label: "mermaid", diagram: true },
  { id: "sequence", label: "sequence", diagram: true },
  { id: "flow", label: "flow", diagram: true },
  { id: "javascript", label: "javascript" },
  { id: "typescript", label: "typescript" },
  { id: "jsx", label: "jsx" },
  { id: "tsx", label: "tsx" },
  { id: "python", label: "python" },
  { id: "java", label: "java" },
  { id: "go", label: "go" },
  { id: "rust", label: "rust" },
  { id: "c", label: "c" },
  { id: "cpp", label: "cpp" },
  { id: "csharp", label: "csharp" },
  { id: "php", label: "php" },
  { id: "ruby", label: "ruby" },
  { id: "swift", label: "swift" },
  { id: "kotlin", label: "kotlin" },
  { id: "shell", label: "shell" },
  { id: "bash", label: "bash" },
  { id: "sql", label: "sql" },
  { id: "json", label: "json" },
  { id: "yaml", label: "yaml" },
  { id: "xml", label: "xml" },
  { id: "html", label: "html" },
  { id: "css", label: "css" },
  { id: "scss", label: "scss" },
  { id: "less", label: "less" },
  { id: "markdown", label: "markdown" },
  { id: "diff", label: "diff" },
  { id: "dockerfile", label: "dockerfile" },
];

export const codeLanguageLabel = (lang?: string | null) => {
  const id = String(lang || "").toLowerCase();
  if (!id) return "plaintext";
  return CODE_LANGUAGE_OPTIONS.find((item) => item.id === id)?.label || id;
};

/** highlight.js 语言别名归一 */
export const normalizeHighlightLang = (lang?: string | null): string | null => {
  const raw = String(lang || "").trim().toLowerCase();
  if (!raw || isDiagramLanguage(raw)) return null;
  const alias: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    py: "python",
    sh: "bash",
    shell: "bash",
    yml: "yaml",
    "c++": "cpp",
    "c#": "csharp",
    cs: "csharp",
    html: "xml",
    htm: "xml",
    md: "markdown",
    dockerfile: "dockerfile",
    docker: "dockerfile",
  };
  return alias[raw] || raw;
};
