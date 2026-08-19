export type OutlineNode = { id: string; name: string; children: OutlineNode[]; includeInPreview?: boolean };
export type DocContentMap = Record<string, string>;
/** L2 项目原文件来源：打开什么格式就尽量保真写回什么格式 */
export type ProjectSourceExt = "docx" | "md" | "txt" | "html" | "htm" | "sql";

export type ProjectSource = {
  ext: ProjectSourceExt;
  /** docx 原始 Office 包（base64） */
  base64?: string;
  /** 文本类原文件内容（md/txt/html）或 docx 解析后的对照文本 */
  originalText?: string;
  /** 是否被用户编辑过；false 时写回应优先原样字节/原文 */
  dirty?: boolean;
};

export type StoredDoc = {
  name: string;
  children: OutlineNode[];
  content: DocContentMap;
  updatedAt?: string;
  filePath?: string;
  source?: ProjectSource;
};
export type DocStore = Record<string, StoredDoc>;
export type WebPersistedState = { docs: string[]; docStore: DocStore; selectedDoc: string };
export type PreviewSection = { id: string; name: string; html: string };
export type FolderFileItem = {
  path: string;
  relPath: string;
  name: string;
  ext: string;
  size: number;
  mtimeMs: number;
};

export type Project = {
  id: string;
  name: string;
  folderPath?: string;
  filePath?: string;
  createdAt: string;
  updatedAt: string;
};

export type FolderTreeNode = {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FolderTreeNode[];
};
