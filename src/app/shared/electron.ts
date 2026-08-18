import type { FolderFileItem, FolderTreeNode, Project, StoredDoc } from "@/app/document/types";
import type { UpdateInfo, UpdateProgress } from "@/app/document/UpdateModal";

export type AppSettings = {
  closeBehavior?: string;
  fontSize?: string;
  lineHeight?: string;
  theme?: string;
};

/** 与 preload 对齐的 Electron 桥接 API；复杂返回值用宽松类型，避免拖垮历史调用点 */
export type ElectronAPI = {
  getDocs: () => Promise<Array<{ id?: string; name?: string }>>;
  getDoc: (id: string) => Promise<unknown>;
  saveDoc: (id: string, data: StoredDoc) => Promise<unknown>;
  saveDocToFolder: (id: string, data: StoredDoc, options?: Record<string, unknown>) => Promise<any>;
  deleteDoc: (id: string) => Promise<unknown>;
  startShare: (port: number, docId: string, html: string) => Promise<any>;
  updateShareHtml: (docId: string, html: string) => Promise<unknown>;
  stopShare: () => Promise<unknown>;
  getPlatform: () => Promise<string>;
  getVersion: () => Promise<string>;
  checkForUpdates: (options?: { manual?: boolean }) => Promise<unknown>;
  downloadUpdate: () => Promise<any>;
  installUpdate: () => Promise<any>;
  openReleasePage: () => Promise<unknown>;
  skipUpdateVersion: (version: string) => Promise<unknown>;
  getSkippedUpdateVersion: () => Promise<string>;
  onUpdateChecking: (callback: (payload?: unknown) => void) => () => void;
  onUpdateAvailable: (callback: (payload: UpdateInfo) => void) => () => void;
  onUpdateNotAvailable: (callback: (payload: { currentVersion?: string; reason?: string }) => void) => () => void;
  onUpdateProgress: (callback: (payload: UpdateProgress) => void) => () => void;
  onUpdateDownloaded: (callback: (payload: { version?: string; platform?: string }) => void) => () => void;
  onUpdateError: (callback: (payload: { message?: string }) => void) => () => void;
  exportHtml: (content: string, name: string) => Promise<any>;
  exportMarkdown: (payload: unknown) => Promise<any>;
  exportDocx: (payloadOrContent: unknown, name?: string) => Promise<any>;
  exportPdf: (payloadOrContent: unknown, name?: string) => Promise<any>;
  getDocHtml: (docName: string) => Promise<string>;
  settingsRead: () => Promise<AppSettings>;
  settingsWrite: (settings: AppSettings) => Promise<unknown>;
  onNewDoc: (callback: () => void) => void;
  onViewportChange: (callback: (payload: unknown) => void) => () => void;
  onRequestCloseWindow: (callback: () => void) => () => void;
  ackCloseWindow: () => Promise<unknown>;
  respondCloseWindow: (payload: { action?: "tray" | "quit" | "cancel"; remember?: boolean }) => Promise<unknown>;
  openFolder: () => Promise<any>;
  scanFolder: (dir: string) => Promise<FolderFileItem[]>;
  getFolderState: () => Promise<{ path?: string | null; files?: FolderFileItem[]; gone?: boolean }>;
  closeFolder: () => Promise<unknown>;
  readFolderFile: (filePath: string) => Promise<any>;
  writeFolderFile: (filePath: string, payload: Record<string, unknown>) => Promise<any>;
  getMarkdownSidecarPath: (filePath: string) => Promise<string>;
  renameFolderFile: (filePath: string, newName: string) => Promise<any>;
  trashFolderFile: (filePath: string) => Promise<any>;
  onFolderChanged: (callback: (payload: { path?: string | null; files?: FolderFileItem[]; gone?: boolean }) => void) => () => void;
  getProjects: () => Promise<Project[]>;
  saveProjects: (projects: Project[]) => Promise<unknown>;
  createProject: (name: string) => Promise<any>;
  importFolder: (kind?: string) => Promise<any>;
  getPathForFile: (file: File) => string;
  selectFolder: () => Promise<any>;
  createProjectAt: (name: string, folderPath: string) => Promise<any>;
  scanFolderTree: (dir: string) => Promise<FolderTreeNode[]>;
  createFileInFolder: (folderPath: string, fileName: string) => Promise<any>;
  openFolderLocation: (folderPath: string) => Promise<unknown>;
};

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export function getElectronAPI(): ElectronAPI | undefined {
  if (typeof window === "undefined") return undefined;
  return window.electronAPI;
}

export function isElectronRuntime(): boolean {
  return !!getElectronAPI();
}
