export type OutlineNode = { id: string; name: string; children: OutlineNode[]; includeInPreview?: boolean };
export type DocContentMap = Record<string, string>;
export type StoredDoc = { name: string; children: OutlineNode[]; content: DocContentMap; updatedAt?: string; filePath?: string };
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
