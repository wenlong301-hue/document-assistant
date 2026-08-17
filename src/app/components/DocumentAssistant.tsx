import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { DocStore, FolderFileItem, OutlineNode, StoredDoc, Project, FolderTreeNode } from "@/app/document/types";
import { ProjectListView } from "@/app/components/project/ProjectListView";
import { FileTreeView } from "@/app/components/file-tree/FileTreeView";
import {
  buildDeleteMessage,
  buildEmptyOutlineTree,
  buildOutlineTree,
  buildPreviewHtml,
  buildPreviewSections,
  countDescendants,
  createStoredDoc,
  findNode,
  findNodeDepth,
  flattenOutlineNodes,
  importHtmlAsStoredDoc,
  importMarkdownAsStoredDoc,
  isHtmlContentEmpty,
  normalizeStoredDoc,
  readWebState,
  sanitizeFileName,
  textToHtml,
  textToPlainTextHtml,
  WEB_STORAGE_KEY,
  writeWebState,
} from "@/app/document/helpers";
import { emptyParagraph, escapeHtml, getPlainTextFromHtml, normalizeEditorHtml } from "@/app/editor/utils/html";
import { Toast } from "@/app/editor/ui/Toast";
import { EditorWorkspace } from "@/app/document/EditorWorkspace";
import { DeleteConfirmModal } from "@/app/document/DeleteConfirmModal";
import { HelpModal } from "@/app/document/HelpModal";
import { NewDocModal } from "@/app/document/NewDocModal";
import { UpdateModal, type UpdateInfo, type UpdateProgress } from "@/app/document/UpdateModal";
import { ShareModal } from "@/app/document/ShareModal";
import { ExportModal } from "@/app/document/ExportModal";
import { CloseConfirmModal } from "@/app/document/CloseConfirmModal";
import { SettingsModal } from "@/app/document/SettingsModal";
import { TopBar } from "@/app/components/layout/TopBar";
import { SidebarSearch } from "@/app/components/sidebar/SidebarSearch";
import { SidebarModeHeader } from "@/app/components/sidebar/SidebarModeHeader";
import { FolderPathBar } from "@/app/components/sidebar/FolderPathBar";
import { DocList } from "@/app/components/sidebar/DocList";
import { SidebarShareStatus } from "@/app/components/sidebar/SidebarShareStatus";
import { OutlineTree } from "@/app/components/outline/OutlineTree";
import { assetUrl } from "@/app/shared/utils/assetUrl";
import {
  applyLineEnding,
  arrayBufferToBase64,
  getDisplayFileName,
  getDominantLineEnding,
  normalizeLineEndings,
} from "@/app/shared/utils/text";
const mammothStyleMap = [
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='标题'] => h1:fresh",
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='标题 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='标题 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='标题 3'] => h3:fresh",
].join("\n");

export default function DocumentAssistant() {
  const [selectedDoc, setSelectedDoc] = useState("");
  const [docs, setDocs] = useState<string[]>([]);
  const [modal, setModal] = useState<{ type: "new" } | { type: "new-file" } | { type: "new-level" } | { type: "rename"; target: string } | null>(null);
  const [docDeleteConfirm, setDocDeleteConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [shared, setShared] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateDownloading, setUpdateDownloading] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress | null>(null);
  const [updateError, setUpdateError] = useState("");
  const [updateCheckBusy, setUpdateCheckBusy] = useState(false);
  const manualUpdateCheckRef = useRef(false);
  const startupUpdateCheckRef = useRef(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [outlineSearchEnter, setOutlineSearchEnter] = useState(0);
  const [mode, setMode] = useState<"document" | "outline">("document");
  const fontSize = "15px";
  const lineHeight = "1.8";
  const theme = "light";
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [outlineNodes, setOutlineNodes] = useState<OutlineNode[]>([]);
  // 按文档名持久化大纲树，避免切换模式时丢失编辑
  const [outlineTrees, setOutlineTrees] = useState<Record<string, OutlineNode[]>>({});
  const [selectedNodeId, setSelectedNodeId] = useState("root");
  const [docStore, setDocStore] = useState<DocStore>({});
  const [webStoreHydrated, setWebStoreHydrated] = useState(false);
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const webPersistTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const webPersistErrorShownRef = useRef(false);
  const anchorNavigationHandledRef = useRef(false);
  const editorContentRef = useRef({ html: "", text: "" });
  const importInputRef = useRef<HTMLInputElement>(null);
  const [shareUrl, setShareUrl] = useState("http://localhost:6535");
  const webShareUrlRef = useRef<string | null>(null);
  const webShareHtmlRef = useRef("");
  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [folderFiles, setFolderFiles] = useState<FolderFileItem[]>([]);
  const [folderGone, setFolderGone] = useState(false);
  const openFileInfoRef = useRef<{ docName: string; filePath: string; ext: string; originalText?: string; lineEnding?: string } | null>(null);

  // Project-level navigation state
  const [level, setLevel] = useState<"projects" | "project">("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectViewMode, setProjectViewMode] = useState<"grid" | "list">("grid");
  const [submode, setSubmode] = useState<"files" | "outline">("files");
  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([]);
  const [selectedFileNode, setSelectedFileNode] = useState<FolderTreeNode | null>(null);
  const [appSettings, setAppSettings] = useState<{ closeBehavior?: string }>({});
  const docStoreRef = useRef<DocStore>({});
  const selectedDocRef = useRef("");

  useEffect(() => { docStoreRef.current = docStore; }, [docStore]);
  useEffect(() => { selectedDocRef.current = selectedDoc; }, [selectedDoc]);

  /**
   * L2 项目原文件写回（产品 A 三层策略）：
   * - L1 .mdoc：完整 JSON（大纲 + 节点 HTML），无损
   * - L2 其它格式：未编辑 source.dirty===false 时原样写回；已编辑按扩展名最优策略
   */
  const writeFolderDocBack = useCallback(async (docName: string, doc: StoredDoc): Promise<{ ok: boolean; mode?: "preserved" | "patched" | "converted" | "mdoc"; error?: string }> => {
    const info = openFileInfoRef.current;
    if (!info || info.docName !== docName) return { ok: false, error: "未绑定原文件" };
    const api = (window as any).electronAPI;
    if (!api?.writeFolderFile) return { ok: false, error: "当前环境不支持写回" };
    const parts = flattenOutlineNodes(doc.children || []);
    const source = doc.source;
    const isDirty = source ? !!source.dirty : true;
    const markdownParts: Array<{ name: string; html: string; level: number }> = [];
    const collectMarkdownParts = (nodes: OutlineNode[], level: number) => {
      nodes.forEach((node) => {
        const html = doc.content?.[node.id] || "";
        if (info.ext !== "md" || !isHtmlContentEmpty(html)) {
          markdownParts.push({ name: node.name, html: html || emptyParagraph, level });
        }
        collectMarkdownParts(node.children || [], Math.min(6, level + 1));
      });
    };
    collectMarkdownParts(doc.children || [], 1);
    const markdownContentHtml = markdownParts.map((part) => {
      const level = Math.min(6, Math.max(1, part.level));
      return part.html.trim().startsWith("<h1") ? part.html : `<h${level}>${escapeHtml(part.name)}</h${level}>${part.html}`;
    }).join("\n");
    const contentHtml = parts.length > 0
      ? parts.map((n) => doc.content?.[n.id] || emptyParagraph).join("\n")
      : `<h1>${escapeHtml(doc.name || docName)}</h1>${emptyParagraph}`;
    let payload: Record<string, unknown>;
    let expectedMode: "preserved" | "patched" | "converted" | "mdoc" = "converted";
    if (info.ext === "mdoc") {
      const { source: _source, ...mdocBody } = doc;
      payload = {
        ext: "mdoc",
        content: JSON.stringify({ ...mdocBody, name: doc.name || docName, children: doc.children || [], updatedAt: new Date().toISOString() }),
      };
      expectedMode = "mdoc";
    } else if (info.ext === "md") {
      if (!isDirty && source?.originalText != null) {
        payload = { ext: "md", content: source.originalText, sourceDirty: false };
        expectedMode = "preserved";
      } else {
        if (!markdownContentHtml.trim()) return { ok: false, error: "内容为空，已阻止覆盖" };
        payload = { ext: "md", html: markdownContentHtml, title: getDisplayFileName(doc.name || docName), sourceDirty: true };
        expectedMode = "converted";
      }
    } else if (info.ext === "txt") {
      if (!isDirty && source?.originalText != null) {
        payload = { ext: "txt", content: source.originalText, sourceDirty: false };
        expectedMode = "preserved";
      } else {
        const text = parts.length > 0 ? parts.map((n) => getPlainTextFromHtml(doc.content?.[n.id] || "", { preserveWhitespace: true })).join("\n\n") : "";
        const content = info.originalText != null && normalizeLineEndings(text) === normalizeLineEndings(info.originalText)
          ? info.originalText
          : applyLineEnding(text, info.lineEnding || "\n");
        payload = { ext: "txt", content, sourceDirty: true };
        expectedMode = content === info.originalText || content === source?.originalText ? "preserved" : "converted";
      }
    } else if (info.ext === "docx") {
      const dirty = source?.ext === "docx" ? !!source.dirty : true;
      payload = {
        ext: "docx",
        html: contentHtml,
        title: getDisplayFileName(doc.name || docName),
        options: { skipTitle: true },
        sourceBase64: source?.ext === "docx" ? source.base64 : undefined,
        sourceDirty: dirty,
      };
      expectedMode = !dirty ? "preserved" : "patched";
    } else if (info.ext === "html" || info.ext === "htm") {
      if (!isDirty && source?.originalText != null) {
        payload = { ext: info.ext, content: source.originalText, sourceDirty: false };
        expectedMode = "preserved";
      } else {
        const sections = buildPreviewSections(doc.children || [], doc.content || {});
        const displayName = getDisplayFileName(doc.name || docName);
        const fallback = [{ id: "root", name: displayName, html: contentHtml }];
        payload = {
          ext: info.ext,
          content: buildPreviewHtml(displayName, sections.length > 0 ? sections : fallback, doc.children || [], sections[0]?.id, doc.content || {}),
          sourceDirty: true,
        };
        expectedMode = "converted";
      }
    } else {
      const sections = buildPreviewSections(doc.children || [], doc.content || {});
      const displayName = getDisplayFileName(doc.name || docName);
      const fallback = [{ id: "root", name: displayName, html: contentHtml }];
      payload = {
        ext: "html",
        content: buildPreviewHtml(displayName, sections.length > 0 ? sections : fallback, doc.children || [], sections[0]?.id, doc.content || {}),
        sourceDirty: true,
      };
      expectedMode = "converted";
    }
    try {
      const result = await api.writeFolderFile(info.filePath, payload);
      if (result && result.ok === false) {
        setToast({ message: `保存失败：${result.error || "写入错误"}`, type: "error" });
        return { ok: false, error: result.error || "写入错误" };
      }
      const mode = result?.preserved ? "preserved" : result?.patched ? "patched" : expectedMode;
      return { ok: true, mode };
    } catch (error) {
      console.error("write folder file failed:", error);
      setToast({ message: "保存失败", type: "error" });
      return { ok: false, error: "保存失败" };
    }
  }, []);

  const persistDoc = useCallback((docName: string, doc: StoredDoc, delay = 500) => {
    if (!isElectron || !docName) return;
    clearTimeout(saveTimersRef.current[docName]);
    if (openFileInfoRef.current?.docName === docName) {
      saveTimersRef.current[docName] = setTimeout(() => { void writeFolderDocBack(docName, doc); }, delay);
      return;
    }
    saveTimersRef.current[docName] = setTimeout(() => {
      (window as any).electronAPI.saveDoc(docName, { ...doc, updatedAt: new Date().toISOString() });
    }, delay);
  }, [isElectron, writeFolderDocBack]);

  const ensureDoc = useCallback((docName: string): StoredDoc => {
    return docStore[docName] ?? createStoredDoc(docName);
  }, [docStore]);

  const setAndPersistDoc = useCallback((docName: string, updater: (doc: StoredDoc) => StoredDoc, delay = 500) => {
    setDocStore((prev) => {
      const current = prev[docName] ?? createStoredDoc(docName);
      const nextDoc = { ...updater(current), name: docName, updatedAt: new Date().toISOString() };
      persistDoc(docName, nextDoc, delay);
      return { ...prev, [docName]: nextDoc };
    });
  }, [persistDoc]);

  const flushDoc = useCallback(async (docName: string) => {
    if (!isElectron || !docName) return false;
    clearTimeout(saveTimersRef.current[docName]);
    const doc = docStoreRef.current[docName];
    if (!doc) return false;
    if (openFileInfoRef.current?.docName === docName) {
      const result = await writeFolderDocBack(docName, doc);
      return result.ok;
    }
    try {
      await (window as any).electronAPI?.saveDoc?.(docName, { ...doc, updatedAt: new Date().toISOString() });
      return true;
    } catch (error) {
      console.error("auto save doc failed:", error);
      return false;
    }
  }, [isElectron, writeFolderDocBack]);

  const flushCurrentDoc = useCallback(async () => {
    return flushDoc(selectedDocRef.current);
  }, [flushDoc]);

  useEffect(() => {
    if (!isElectron) return;
    const timer = window.setInterval(() => {
      void flushCurrentDoc();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [isElectron, flushCurrentDoc]);

  useEffect(() => {
    const handler = () => setModal({ type: "new" });
    document.addEventListener("opencode-new-doc", handler);
    return () => document.removeEventListener("opencode-new-doc", handler);
  }, []);

  useEffect(() => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;
    if (!api?.onUpdateAvailable) return;

    const unsubAvailable = api.onUpdateAvailable?.(async (payload: UpdateInfo) => {
      setUpdateCheckBusy(false);
      setUpdateError("");
      setUpdateDownloaded(false);
      setUpdateProgress(null);
      const isManual = manualUpdateCheckRef.current;
      manualUpdateCheckRef.current = false;
      const skipped = api.getSkippedUpdateVersion ? await api.getSkippedUpdateVersion() : "";
      if (!isManual && skipped && payload?.version && skipped === payload.version) return;
      const nextUpdateInfo = {
        version: payload?.version || "",
        currentVersion: payload?.currentVersion,
        releaseDate: payload?.releaseDate,
        platform: payload?.platform,
      };
      setUpdateInfo(nextUpdateInfo);
      setShowUpdateModal(isManual);
    });
    const unsubNotAvailable = api.onUpdateNotAvailable?.((payload: { currentVersion?: string; reason?: string }) => {
      setUpdateCheckBusy(false);
      if (manualUpdateCheckRef.current) {
        setToast({
          message: payload?.reason === "dev" ? "开发模式不检查更新" : "当前已是最新版本",
          type: "info",
        });
        manualUpdateCheckRef.current = false;
      }
    });
    const unsubProgress = api.onUpdateProgress?.((payload: UpdateProgress) => {
      setUpdateDownloading(true);
      setUpdateProgress(payload);
    });
    const unsubDownloaded = api.onUpdateDownloaded?.((payload: { version?: string; platform?: string }) => {
      setUpdateDownloading(false);
      setUpdateDownloaded(true);
      setUpdateProgress({ percent: 100 });
      setUpdateInfo((prev) => prev ? { ...prev, version: payload?.version || prev.version, platform: payload?.platform || prev.platform } : prev);
      setToast({ message: "更新包已下载完成", type: "success" });
    });
    const unsubError = api.onUpdateError?.((payload: { message?: string }) => {
      setUpdateCheckBusy(false);
      setUpdateDownloading(false);
      const message = payload?.message || "检查或下载更新失败";
      setUpdateError(message);
      if (manualUpdateCheckRef.current) {
        setToast({ message, type: "error" });
      }
      manualUpdateCheckRef.current = false;
    });

    if (!startupUpdateCheckRef.current && api.checkForUpdates) {
      startupUpdateCheckRef.current = true;
      window.setTimeout(() => {
        api.checkForUpdates({ manual: false }).catch((error: unknown) => {
          console.error("startup update check failed:", error);
        });
      }, 1200);
    }

    return () => {
      unsubAvailable?.();
      unsubNotAvailable?.();
      unsubProgress?.();
      unsubDownloaded?.();
      unsubError?.();
    };
  }, [isElectron]);

  useEffect(() => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;
    if (!api?.onRequestCloseWindow) return;
    const unsub = api.onRequestCloseWindow(() => {
      // 立即 ACK，避免主进程误判白屏并强制退出
      void api.ackCloseWindow?.();
      setShowCloseConfirm(true);
    });
    return () => unsub?.();
  }, [isElectron]);

  const handleCheckForUpdates = useCallback(async () => {
    if (!isElectron) {
      setToast({ message: "请在桌面应用中检查更新", type: "info" });
      return;
    }
    const api = (window as any).electronAPI;
    if (!api?.checkForUpdates) {
      setToast({ message: "当前版本不支持检查更新", type: "error" });
      return;
    }
    manualUpdateCheckRef.current = true;
    setUpdateCheckBusy(true);
    setUpdateError("");
    try {
      await api.checkForUpdates({ manual: true });
    } catch (error) {
      setUpdateCheckBusy(false);
      manualUpdateCheckRef.current = false;
      setToast({ message: error instanceof Error ? error.message : "检查更新失败", type: "error" });
    }
  }, [isElectron]);

  const handleUpdateLater = useCallback(async () => {
    setShowUpdateModal(false);
    setUpdateDownloading(false);
    setUpdateDownloaded(false);
    setUpdateProgress(null);
    setUpdateError("");
  }, []);

  const handleOpenReleasePage = useCallback(async () => {
    try {
      if ((window as any).electronAPI?.openReleasePage) {
        await (window as any).electronAPI.openReleasePage();
      } else {
        window.open("https://github.com/wenlong301-hue/document-assistant/releases/latest", "_blank", "noopener,noreferrer");
      }
    } catch {
      window.open("https://github.com/wenlong301-hue/document-assistant/releases/latest", "_blank", "noopener,noreferrer");
    }
  }, []);

  const handleDownloadUpdate = useCallback(async () => {
    setUpdateError("");
    setUpdateDownloading(true);
    setUpdateProgress({ percent: 0 });
    try {
      const result = await (window as any).electronAPI?.downloadUpdate?.();
      if (result && result.ok === false) {
        setUpdateDownloading(false);
        setUpdateError(result.message || "下载更新失败");
      }
    } catch (error) {
      setUpdateDownloading(false);
      setUpdateError(error instanceof Error ? error.message : "下载更新失败");
    }
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    try {
      setShowCloseConfirm(false);
      await flushCurrentDoc();
      const result = await (window as any).electronAPI?.installUpdate?.();
      if (result?.mode === "replace-in-place") {
        setToast({ message: "正在安装新版本并重启…", type: "info" });
      } else if (result?.mode === "open-installer") {
        setToast({
          message: "已打开安装包：请将应用拖入「应用程序」并选择替换，勿保留旧版",
          type: "info",
        });
      }
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : "安装更新失败");
      setToast({ message: "安装失败，请打开下载页手动安装", type: "error" });
    }
  }, []);

  const handleCloseWindowChoice = useCallback(async (action: "tray" | "quit", remember: boolean) => {
    setShowCloseConfirm(false);
    await flushCurrentDoc();
    if (remember) setAppSettings((prev) => ({ ...prev, closeBehavior: action }));
    try {
      await (window as any).electronAPI?.respondCloseWindow?.({ action, remember });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "关闭应用失败", type: "error" });
    }
  }, []);

  const handleCancelCloseWindow = useCallback(() => {
    setShowCloseConfirm(false);
    // 通知主进程取消关闭确认，避免 2s 强制退出
    void (window as any).electronAPI?.respondCloseWindow?.({ action: "cancel" });
  }, []);

  useEffect(() => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;
    if (!api?.onFolderChanged) return;
    const unsub = api.onFolderChanged?.((payload: { path?: string; files?: FolderFileItem[]; gone?: boolean }) => {
      const files = Array.isArray(payload?.files) ? payload.files : [];
      setFolderFiles(files);
      if (payload?.gone) setFolderGone(true);
      const info = openFileInfoRef.current;
      if (info && files.length > 0 && !files.some((f) => f.path === info.filePath)) {
        const name = info.docName;
        openFileInfoRef.current = null;
        setDocStore((prev) => {
          const { [name]: _removed, ...rest } = prev;
          return rest;
        });
        setOutlineTrees((prev) => {
          const { [name]: _removed, ...rest } = prev;
          return rest;
        });
        setSelectedDoc("");
        setOutlineNodes([]);
        setSelectedNodeId("");
        setMode("document");
        setToast({ message: "当前文件已被移出文件夹，已关闭", type: "info" });
      }
    });
    return () => unsub?.();
  }, [isElectron]);

  useEffect(() => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;
    if (!api?.getFolderState) return;
    api.getFolderState().then((state: { path?: string | null; files?: FolderFileItem[]; gone?: boolean }) => {
      if (!state?.path) return;
      setActiveFolder(state.path);
      setFolderFiles(Array.isArray(state.files) ? state.files : []);
      if (state.gone) setFolderGone(true);
    }).catch((error: unknown) => console.error("get folder state failed:", error));
  }, [isElectron]);

  // Load projects on mount
  useEffect(() => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;
    if (!api?.getProjects) return;
    api.getProjects().then((projectList: Project[]) => {
      setProjects(projectList || []);
      if (projectList && projectList.length > 0) {
        const firstProject = projectList[0];
        setSelectedProject(firstProject);
        // Scan project folder if it has a folderPath
        if (firstProject.folderPath && api.scanFolderTree) {
          api.scanFolderTree(firstProject.folderPath).then((tree: FolderTreeNode[]) => {
            setFolderTree(tree || []);
          }).catch((error: unknown) => console.error("scan folder tree failed:", error));
        }
      }
    }).catch((error: unknown) => console.error("load projects failed:", error));
  }, [isElectron]);

  // Load app settings on mount
  useEffect(() => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;
    if (!api?.settingsRead) return;
    api.settingsRead().then((settings: { closeBehavior?: string }) => {
      setAppSettings(settings || {});
    }).catch((error: unknown) => console.error("load settings failed:", error));
  }, [isElectron]);

  useEffect(() => {
    if (isElectron) {
      (window as any).electronAPI.getDocs().then(async (list: any[]) => {
        if (list.length > 0) {
          const loadedEntries = await Promise.all(list.map(async (item: any) => {
            const id = item.id ?? item.name;
            const raw = await (window as any).electronAPI.getDoc(id);
            const doc = normalizeStoredDoc(item.name ?? id, raw);
            return [doc.name, doc] as const;
          }));
          const loadedStore = Object.fromEntries(loadedEntries) as DocStore;
          const names = loadedEntries.map(([name]) => name);
          setDocStore(loadedStore);
          setDocs(names);
          setSelectedDoc(names[0]);
          setOutlineNodes(loadedStore[names[0]]?.children ?? buildOutlineTree(names[0]));
        }
      });
    }
  }, []);

  useEffect(() => {
    if (isElectron) return;
    let cancelled = false;
    const load = async () => {
      let persisted: WebPersistedState | null = null;
      try {
        persisted = await readWebState();
      } catch (error) {
        console.error("Failed to load IndexedDB store:", error);
      }
      if (!persisted) {
        try {
          const raw = localStorage.getItem(WEB_STORAGE_KEY);
          persisted = raw ? JSON.parse(raw) as WebPersistedState : null;
        } catch (error) {
          console.error("Failed to load legacy web store:", error);
        }
      }
      if (cancelled) return;
      if (persisted) {
        const loadedStore = Object.fromEntries(
          Object.entries(persisted.docStore ?? {}).map(([name, doc]) => [name, normalizeStoredDoc(name, doc)])
        ) as DocStore;
        const names = Array.isArray(persisted.docs)
          ? persisted.docs.filter((name: unknown): name is string => typeof name === "string")
          : Object.keys(loadedStore);
        if (names.length > 0) {
          const nextSelected = persisted.selectedDoc && names.includes(persisted.selectedDoc) ? persisted.selectedDoc : names[0];
          const firstDoc = loadedStore[nextSelected] ?? loadedStore[names[0]];
          setDocStore(loadedStore);
          setDocs(names);
          setSelectedDoc(nextSelected);
          setOutlineNodes(firstDoc?.children ?? []);
          setSelectedNodeId(firstDoc?.children?.[0]?.id ?? "");
        }
      }
      setWebStoreHydrated(true);
    };
    void load();
    return () => { cancelled = true; };
  }, [isElectron]);

  useEffect(() => {
    if (isElectron || !webStoreHydrated) return;
    clearTimeout(webPersistTimerRef.current);
    const state: WebPersistedState = { docs, docStore, selectedDoc };
    webPersistTimerRef.current = setTimeout(async () => {
      try {
        await writeWebState(state);
        localStorage.removeItem(WEB_STORAGE_KEY);
        webPersistErrorShownRef.current = false;
      } catch (indexedDbError) {
        console.error("Failed to save IndexedDB store:", indexedDbError);
        try {
          localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(state));
          webPersistErrorShownRef.current = false;
        } catch (storageError) {
          console.error("Failed to save fallback web store:", storageError);
          if (!webPersistErrorShownRef.current) {
            webPersistErrorShownRef.current = true;
            setToast({ message: "文档内容过大，浏览器存储失败，请导出文档后减少媒体文件", type: "error" });
          }
        }
      }
    }, 500);
    return () => clearTimeout(webPersistTimerRef.current);
  }, [docs, docStore, selectedDoc, isElectron, webStoreHydrated]);

  const revokeWebShareUrl = useCallback(() => {
    if (webShareUrlRef.current) {
      URL.revokeObjectURL(webShareUrlRef.current);
      webShareUrlRef.current = null;
    }
    webShareHtmlRef.current = "";
  }, []);

  useEffect(() => () => revokeWebShareUrl(), [revokeWebShareUrl]);

  const buildCurrentShareHtml = useCallback(() => {
    if (!selectedDoc) throw new Error("请先新建或选择文档");
    const doc = docStore[selectedDoc] ?? createStoredDoc(selectedDoc, getOutlineTree(selectedDoc));
    const displayName = getDisplayFileName(doc.name || selectedDoc);
    const tree = doc.children?.length ? doc.children : getOutlineTree(selectedDoc);
    const sections = buildPreviewSections(tree, doc.content);
    const bodyHtml = sections.length > 0
      ? sections.map((section) => section.html).join('\n<hr style="border:none;border-top:1px solid #ebecf0;margin:24px 0"/>\n')
      : `<h1>${escapeHtml(displayName)}</h1>${emptyParagraph}`;
    return buildPreviewHtml(
      displayName,
      sections.length > 0 ? sections : [{ id: "root", name: displayName, html: bodyHtml }],
      tree,
      selectedNodeId || sections[0]?.id,
      doc.content,
    );
  }, [selectedDoc, selectedNodeId, docStore, outlineTrees]);

  const createWebShare = useCallback(() => {
    revokeWebShareUrl();
    const html = buildCurrentShareHtml();
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    webShareUrlRef.current = url;
    webShareHtmlRef.current = html;
    setShareUrl(url);
  }, [buildCurrentShareHtml, revokeWebShareUrl]);

  const handleToggleShare = async () => {
    if (shareBusy) return;
    setShareBusy(true);
    setShareError("");
    try {
      if (!isElectron) {
        if (shared) {
          revokeWebShareUrl();
          setShared(false);
          setToast({ message: "分享已关闭", type: "info" });
        } else {
          createWebShare();
          setShared(true);
          setToast({ message: "分享页已生成", type: "success" });
        }
        return;
      }
      if (!shared) {
        if (shareDisabled) {
          setShareError("请选择文件后再开启分享");
          setToast({ message: "请选择文件后再分享", type: "info" });
          return;
        }
        if (!selectedDoc) {
          setShareError("请先新建或选择文档后再开启分享");
          setToast({ message: "请先选择文档", type: "error" });
          return;
        }
        const html = buildCurrentShareHtml();
        const url = await (window as any).electronAPI.startShare(6535, selectedDoc, html);
        setShareUrl(url);
        setShared(true);
        setToast({ message: "分享已开启", type: "success" });
      } else {
        await (window as any).electronAPI.stopShare();
        setShared(false);
        setToast({ message: "分享已关闭", type: "info" });
      }
    } catch (error) {
      console.error("Failed to toggle share:", error);
      const message = error instanceof Error ? error.message : "分享操作失败";
      setShareError(message.includes("EADDRINUSE") ? "端口 6535 已被占用，请关闭占用程序后重试。" : message);
      setToast({ message: "分享开启失败", type: "error" });
    } finally {
      setShareBusy(false);
    }
  };

  const handleDownloadShareHtml = () => {
    try {
      const html = webShareHtmlRef.current || buildCurrentShareHtml();
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedDoc || "文档助手分享"}.html`;
      a.click();
      URL.revokeObjectURL(url);
      setToast({ message: "分享HTML已下载", type: "success" });
    } catch (error) {
      console.error("Failed to download share HTML:", error);
      setToast({ message: error instanceof Error ? error.message : "下载分享HTML失败", type: "error" });
    }
  };
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.replace(/\.[^/.]+$/, "");
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "docx") {
      try {
        const buffer = await file.arrayBuffer();
        const mammoth = (await import("mammoth")).default;
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer }, { styleMap: mammothStyleMap, includeDefaultStyleMap: true });
        const html = result.value;
        const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
        const title = titleMatch ? titleMatch[1].trim() : name;
        const tree = buildOutlineTree(title);
        const leaf = flattenOutlineNodes(tree).find((node) => node.children.length === 0) ?? tree[0];
        const parsedText = new DOMParser().parseFromString(html || "", "text/html").body.textContent || "";
        const doc = { ...createStoredDoc(title, tree, { [leaf.id]: html || emptyParagraph }), source: { ext: "docx" as const, base64: arrayBufferToBase64(buffer), originalText: parsedText, dirty: false } };
        setDocs((prev) => [...new Set([...prev, title])]);
        setSelectedDoc(title);
        setDocStore((prev) => ({ ...prev, [title]: doc }));
        setOutlineTrees((prev) => ({ ...prev, [title]: tree }));
        setOutlineNodes(tree);
        setSelectedNodeId(leaf.id);
        setMode("outline");
        editorContentRef.current = { html, text: parsedText };
        persistDoc(title, doc, 0);
      } catch { setToast({ message: "导入失败", type: "error" }); }
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        if (ext === "mdoc") {
          try {
            const raw = JSON.parse(text);
            const doc = normalizeStoredDoc(name, raw);
            const firstNode = findDisplayNodeForFile(doc) ?? flattenOutlineNodes(doc.children)[0];
            setDocs((prev) => [...new Set([...prev, doc.name])]);
            setSelectedDoc(doc.name);
            setDocStore((prev) => ({ ...prev, [doc.name]: doc }));
            setOutlineTrees((prev) => ({ ...prev, [doc.name]: doc.children }));
            setOutlineNodes(doc.children);
            setSelectedNodeId(firstNode?.id ?? "");
            persistDoc(doc.name, doc, 0);
          } catch {
            setToast({ message: "mdoc 文件格式错误", type: "error" });
            return;
          }
        } else if (ext === "html" || ext === "htm") {
          const doc = importHtmlAsStoredDoc(name, text);
          const firstNode = flattenOutlineNodes(doc.children).find((node) => doc.content[node.id]?.replace(/<[^>]*>/g, "").trim()) ?? flattenOutlineNodes(doc.children)[0];
          setDocs((prev) => [...new Set([...prev, doc.name])]);
          setSelectedDoc(doc.name);
          setDocStore((prev) => ({ ...prev, [doc.name]: doc }));
          setOutlineTrees((prev) => ({ ...prev, [doc.name]: doc.children }));
          setOutlineNodes(doc.children);
          setSelectedNodeId(firstNode?.id ?? "");
          setMode("outline");
          persistDoc(doc.name, doc, 0);
        } else if (ext === "md") {
          const doc = importMarkdownAsStoredDoc(name, text);
          const firstNode = flattenOutlineNodes(doc.children).find((node) => doc.content[node.id]?.replace(/<[^>]*>/g, "").trim()) ?? flattenOutlineNodes(doc.children)[0];
          setDocs((prev) => [...new Set([...prev, doc.name])]);
          setSelectedDoc(doc.name);
          setDocStore((prev) => ({ ...prev, [doc.name]: doc }));
          setOutlineTrees((prev) => ({ ...prev, [doc.name]: doc.children }));
          setOutlineNodes(doc.children);
          setSelectedNodeId(firstNode?.id ?? "");
          persistDoc(doc.name, doc, 0);
        } else {
          const html = ext === "txt" ? textToPlainTextHtml(text) : textToHtml(text);
          const tree = buildOutlineTree(name);
          const leaf = flattenOutlineNodes(tree).find((node) => node.children.length === 0) ?? tree[0];
          const doc = createStoredDoc(name, tree, { [leaf.id]: html });
          setDocs((prev) => [...new Set([...prev, name])]);
          setSelectedDoc(name);
          setDocStore((prev) => ({ ...prev, [name]: doc }));
          setOutlineTrees((prev) => ({ ...prev, [name]: tree }));
          setOutlineNodes(tree);
          setSelectedNodeId(leaf.id);
          persistDoc(name, doc, 0);
        }
        setMode("outline");
      };
      reader.readAsText(file);
    }
    e.target.value = "";
  };

  useEffect(() => {
    if (anchorNavigationHandledRef.current || (!isElectron && !webStoreHydrated) || docs.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const targetDoc = params.get("doc");
    const targetNode = params.get("node");
    if (!targetDoc || !targetNode || !docs.includes(targetDoc)) {
      anchorNavigationHandledRef.current = true;
      return;
    }
    const tree = docStore[targetDoc]?.children ?? [];
    if (!findNode(tree, targetNode)) {
      anchorNavigationHandledRef.current = true;
      setToast({ message: "锚点对应的文档内容不存在", type: "error" });
      return;
    }
    anchorNavigationHandledRef.current = true;
    setSelectedDoc(targetDoc);
    setOutlineNodes(tree);
    setSelectedNodeId(targetNode);
    setMode("outline");
  }, [docs, docStore, isElectron, webStoreHydrated]);

  const getOutlineTree = (docName: string) =>
    docName ? (docStore[docName]?.children ?? outlineTrees[docName] ?? buildEmptyOutlineTree(docName)) : [];

  const getNodeContent = (docName: string, nodeId: string) =>
    normalizeEditorHtml(docStore[docName]?.content?.[nodeId] ?? emptyParagraph);

  const markSourceDirty = (doc: StoredDoc): StoredDoc =>
    doc.source ? { ...doc, source: { ...doc.source, dirty: true } } : doc;

  const findDisplayNodeForFile = (doc: StoredDoc) => {
    const hasContent = (node: OutlineNode) => !isHtmlContentEmpty(doc.content?.[node.id]);
    const findInSubtree = (nodes: OutlineNode[]): OutlineNode | undefined => {
      for (const node of nodes) {
        if (hasContent(node)) return node;
        const child = findInSubtree(node.children || []);
        if (child) return child;
      }
      return undefined;
    };
    const firstLevel = doc.children?.[0];
    if (!firstLevel) return undefined;
    return hasContent(firstLevel) ? firstLevel : findInSubtree(firstLevel.children || []) ?? firstLevel;
  };

  useEffect(() => {
    if (isElectron || !shared) return;
    revokeWebShareUrl();
    setShared(false);
  }, [selectedDoc, isElectron]);

  const updateOutlineTree = (docName: string, nodes: OutlineNode[]) => {
    setOutlineNodes(nodes);
    setOutlineTrees((prev) => ({ ...prev, [docName]: nodes }));
    setAndPersistDoc(docName, (doc) => markSourceDirty({ ...doc, children: nodes }));
  };

  const getDocChildCount = (docName: string) => {
    const tree = getOutlineTree(docName);
    return tree.reduce((acc, n) => acc + countDescendants(n), 0);
  };

  const handleSelectDoc = (name: string) => {
    setSelectedDoc(name);
    const tree = getOutlineTree(name);
    setOutlineNodes(tree);
    setSelectedNodeId(tree[0]?.id ?? "");
    if (mode === "outline") setMode("outline");
  };

  const openFolderFile = async (file: FolderFileItem) => {
    if (!isElectron) return;
    const info = openFileInfoRef.current;
    const alreadyOpen = info?.docName === file.relPath && !!docStore[file.relPath];
    if (alreadyOpen) {
      setSelectedDoc(file.relPath);
      setOutlineNodes(getOutlineTree(file.relPath));
      setSelectedNodeId(getOutlineTree(file.relPath)[0]?.id ?? "");
      setMode("outline");
      return;
    }
    const api = (window as any).electronAPI;
    let raw: { ext: string; text?: string; base64?: string } | null = null;
    try {
      raw = await api.readFolderFile(file.path);
    } catch (error) {
      console.error("read folder file failed:", error);
    }
    if (!raw) {
      setToast({ message: "无法读取文件", type: "error" });
      return;
    }
    const docName = file.relPath;
    const fileExt = file.ext.replace(/^\./, "").toLowerCase();
    const apply = (doc: StoredDoc, tree: OutlineNode[], nodeId: string, enterOutline = true, writeInfo?: { filePath: string; ext: string; originalText?: string; lineEnding?: string }) => {
      openFileInfoRef.current = { docName, filePath: writeInfo?.filePath || file.path, ext: writeInfo?.ext || fileExt, originalText: writeInfo?.originalText, lineEnding: writeInfo?.lineEnding };
      setSelectedDoc(docName);
      setDocStore((prev) => ({ ...prev, [docName]: doc }));
      setOutlineTrees((prev) => ({ ...prev, [docName]: tree }));
      setOutlineNodes(tree);
      setSelectedNodeId(nodeId);
      setMode(enterOutline ? "outline" : "document");
    };
    try {
      if (fileExt === "docx") {
        const binary = atob(raw.base64 || "");
        const arrayBuffer = Uint8Array.from(binary, (c) => c.charCodeAt(0)).buffer;
        const mammoth = (await import("mammoth")).default;
        const result = await mammoth.convertToHtml({ arrayBuffer }, { styleMap: mammothStyleMap, includeDefaultStyleMap: true });
        const html = result.value;
        const tree = buildOutlineTree(docName);
        const leaf = flattenOutlineNodes(tree).find((node) => node.children.length === 0) ?? tree[0];
        const text = new DOMParser().parseFromString(html || "", "text/html").body.textContent || "";
        apply({ ...createStoredDoc(docName, tree, { [leaf.id]: html || emptyParagraph }), source: { ext: "docx", base64: raw.base64 || "", originalText: text, dirty: false } }, tree, leaf.id);
      } else if (fileExt === "mdoc") {
        const doc = { ...normalizeStoredDoc(docName, JSON.parse(raw.text || "{}")), name: docName };
        const firstNode = findDisplayNodeForFile(doc) ?? flattenOutlineNodes(doc.children)[0];
        apply(doc, doc.children, firstNode?.id ?? "");
      } else if (fileExt === "md") {
        const originalText = raw.text || "";
        const doc = {
          ...importMarkdownAsStoredDoc(docName, originalText),
          name: docName,
          source: { ext: "md" as const, originalText, dirty: false },
        };
        const firstNode = flattenOutlineNodes(doc.children).find((node) => doc.content[node.id]?.replace(/<[^>]*>/g, "").trim()) ?? flattenOutlineNodes(doc.children)[0];
        apply(doc, doc.children, firstNode?.id ?? "", true, { filePath: file.path, ext: fileExt, originalText });
      } else if (fileExt === "html" || fileExt === "htm") {
        if (!raw.text?.trim()) throw new Error("HTML 文件内容为空");
        const originalText = raw.text;
        const doc = {
          ...importHtmlAsStoredDoc(docName, originalText),
          name: docName,
          source: { ext: fileExt as "html" | "htm", originalText, dirty: false },
        };
        const firstNode = flattenOutlineNodes(doc.children).find((node) => doc.content[node.id]?.replace(/<[^>]*>/g, "").trim()) ?? flattenOutlineNodes(doc.children)[0];
        apply(doc, doc.children, firstNode?.id ?? "", true, { filePath: file.path, ext: fileExt, originalText });
      } else {
        const originalText = raw.text || "";
        const html = fileExt === "txt" ? textToPlainTextHtml(originalText) : textToHtml(originalText);
        const tree = buildOutlineTree(docName);
        const leaf = flattenOutlineNodes(tree).find((node) => node.children.length === 0) ?? tree[0];
        const doc = {
          ...createStoredDoc(docName, tree, { [leaf.id]: html }),
          source: fileExt === "txt" ? { ext: "txt" as const, originalText, dirty: false } : undefined,
        };
        apply(doc, tree, leaf.id, true, fileExt === "txt" ? { filePath: file.path, ext: fileExt, originalText, lineEnding: getDominantLineEnding(originalText) } : undefined);
      }
    } catch (error) {
      console.error("open folder file failed:", error);
      const detail = error instanceof Error ? error.message : "未知错误";
      setToast({ message: fileExt === "mdoc" ? "mdoc 文件格式错误" : `打开文件失败：${detail}`, type: "error" });
    }
  };

  const handleOpenFolder = async () => {
    if (!isElectron) {
      setToast({ message: "请在桌面应用中使用文件夹功能", type: "info" });
      return;
    }
    const api = (window as any).electronAPI;
    try {
      const result = await api.openFolder();
      if (result?.canceled) return;
      openFileInfoRef.current = null;
      setActiveFolder(result.path);
      setFolderFiles(Array.isArray(result.files) ? result.files : []);
      setFolderGone(false);
      setMode("document");
      setToast({ message: `已打开文件夹：${String(result.path).split(/[\\/]/).pop() || ""}`, type: "success" });
    } catch (error) {
      console.error("open folder failed:", error);
      setToast({ message: "打开文件夹失败", type: "error" });
    }
  };

  const handleCloseFolder = async () => {
    if (!isElectron) return;
    try {
      await (window as any).electronAPI.closeFolder?.();
    } catch {}
    openFileInfoRef.current = null;
    setActiveFolder(null);
    setFolderFiles([]);
    setFolderGone(false);
    if (docs.length > 0) {
      const first = docs[0];
      setSelectedDoc(first);
      setOutlineNodes(getOutlineTree(first));
      setSelectedNodeId(getOutlineTree(first)[0]?.id ?? "");
    } else {
      setSelectedDoc("");
      setOutlineNodes([]);
      setSelectedNodeId("");
    }
    setMode("document");
    setToast({ message: "已返回默认文件夹", type: "info" });
  };

  const saveResultToast = (mode?: string) => {
    if (mode === "preserved") setToast({ message: "已原样保存（未改动格式）", type: "success" });
    else if (mode === "patched") setToast({ message: "已保存（尽量保留 Word 样式）", type: "success" });
    else if (mode === "mdoc") setToast({ message: "已保存 .mdoc", type: "success" });
    else if (mode === "converted") setToast({ message: "已保存（格式已转换，可能有损）", type: "success" });
    else setToast({ message: "已保存到原文件", type: "success" });
  };

  const handleSave = async () => {
    const info = openFileInfoRef.current;
    if (info && info.docName === selectedDoc) {
      clearTimeout(saveTimersRef.current[selectedDoc]);
      const doc = docStore[selectedDoc] ?? createStoredDoc(selectedDoc, getOutlineTree(selectedDoc));
      const result = await writeFolderDocBack(selectedDoc, doc);
      if (result.ok) saveResultToast(result.mode);
      return;
    }
    await handleSaveToFolder();
  };

  const doDeleteFolderFile = async (info: { docName: string; filePath: string; ext: string }) => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;
    let result: { ok: boolean; error?: string } | null = null;
    try {
      result = await api.trashFolderFile(info.filePath);
    } catch (error) {
      console.error("trash folder file failed:", error);
    }
    if (result && result.ok === false) {
      setToast({ message: `删除失败：${result.error || "未知错误"}`, type: "error" });
      return;
    }
    const name = info.docName;
    if (openFileInfoRef.current?.docName === name) {
      openFileInfoRef.current = null;
    }
    setDocStore((prev) => {
      const { [name]: _removed, ...rest } = prev;
      return rest;
    });
    setOutlineTrees((prev) => {
      const { [name]: _removed, ...rest } = prev;
      return rest;
    });
    const remaining = folderFiles.filter((f) => f.path !== info.filePath);
    setFolderFiles(remaining);
    if (selectedDoc === name) {
      setSelectedDoc("");
      setOutlineNodes([]);
      setSelectedNodeId("");
      setMode("document");
    }
    setToast({ message: "已移入废纸篓", type: "success" });
  };

  const requestDelete = (name: string) => {
    const info = openFileInfoRef.current?.docName === name ? openFileInfoRef.current : null;
    setDocDeleteConfirm({
      message: info
        ? `确定将文件【${info.docName}】移入废纸篓？\n该文件将从文件夹中删除，不可撤销。`
        : buildDeleteMessage("doc", name, getDocChildCount(name)),
      onConfirm: () => { if (info) void doDeleteFolderFile(info); else doDeleteDoc(name); },
    });
  };

  const handleRename = async (oldName: string, newName: string) => {
    const fileItem = activeFolder ? folderFiles.find((f) => f.relPath === oldName) : undefined;
    if (fileItem && isElectron) {
      const api = (window as any).electronAPI;
      const curExt = fileItem.ext || "";
      let safe = sanitizeFileName(newName);
      if (!safe.toLowerCase().endsWith(curExt.toLowerCase())) safe += curExt;
      if (safe === fileItem.name) {
        setToast({ message: "名称未变化", type: "info" });
        return;
      }
      let result: { ok: boolean; path: string; error?: string; unchanged?: boolean } | null = null;
      try {
        result = await api.renameFolderFile(fileItem.path, safe);
      } catch (error) {
        console.error("rename folder file failed:", error);
      }
      if (result?.ok === false) {
        setToast({ message: `重命名失败：${result.error || "未知错误"}`, type: "error" });
        return;
      }
      if (result?.unchanged) {
        setToast({ message: "名称未变化", type: "info" });
        return;
      }
      const slash = fileItem.relPath.lastIndexOf("/");
      const dir = slash >= 0 ? fileItem.relPath.slice(0, slash) : "";
      const newRel = dir ? `${dir}/${safe}` : safe;
      const info = openFileInfoRef.current;
      if (info?.docName === oldName) {
        const newInfo = { ...info, docName: newRel, filePath: result?.path || fileItem.path, ext: fileItem.ext.replace(/^\./, "") };
        openFileInfoRef.current = newInfo;
        setSelectedDoc(newRel);
      }
      setFolderFiles((prev) => prev.map((f) =>
        f.path === fileItem.path ? { ...f, path: result?.path || f.path, relPath: newRel, name: safe } : f
      ));
      setDocStore((prev) => {
        if (!prev[oldName]) return prev;
        const { [oldName]: doc, ...rest } = prev;
        return { ...rest, [newRel]: { ...doc, name: newRel } };
      });
      setOutlineTrees((prev) => {
        if (!prev[oldName]) return prev;
        const { [oldName]: tree, ...rest } = prev;
        return { ...rest, [newRel]: tree };
      });
      setToast({ message: "已重命名", type: "success" });
      return;
    }
    setDocs((prev) => prev.map((d) => (d === oldName ? newName : d)));
    if (selectedDoc === oldName) setSelectedDoc(newName);
    const renamedDoc = { ...(docStore[oldName] ?? createStoredDoc(oldName)), name: newName, updatedAt: new Date().toISOString() };
    setOutlineTrees((prev) => {
      const tree = prev[oldName] ?? renamedDoc.children;
      const { [oldName]: _oldTree, ...rest } = prev;
      return { ...rest, [newName]: tree };
    });
    setDocStore((prev) => {
      const { [oldName]: _oldDoc, ...rest } = prev;
      return { ...rest, [newName]: renamedDoc };
    });
    if (isElectron) {
      (window as any).electronAPI.deleteDoc(oldName);
      persistDoc(newName, renamedDoc, 0);
    }
  };

  const handleNewDoc = (name: string) => {
    const tree = buildOutlineTree(name);
    const doc = createStoredDoc(name, tree);
    setDocs((prev) => [...prev, name]);
    setSelectedDoc(name);
    setDocStore((prev) => ({ ...prev, [name]: doc }));
    setOutlineTrees((prev) => ({ ...prev, [name]: doc.children }));
    setOutlineNodes(doc.children);
    setSelectedNodeId(tree[0]?.id ?? "");
    setMode("outline");
    persistDoc(name, doc, 0);
  };

  const handleNewRootFile = (name: string) => {
    if (!selectedDoc || mode !== "outline") return;
    const newNode: OutlineNode = { id: `file-${Date.now()}`, name, children: [] };
    const nextNodes = [...outlineNodes, newNode];
    updateOutlineTree(selectedDoc, nextNodes);
    setSelectedNodeId(newNode.id);
  };

  const doDeleteDoc = (name: string) => {
    setDocs((prev) => {
      const next = prev.filter((d) => d !== name);
      if (selectedDoc === name && next.length > 0) setSelectedDoc(next[0]);
      return next;
    });
    setOutlineTrees((prev) => { const { [name]: _, ...rest } = prev; return rest; });
    setDocStore((prev) => { const { [name]: _, ...rest } = prev; return rest; });
    if (mode === "outline" && selectedDoc === name) setMode("document");
    if (isElectron) (window as any).electronAPI.deleteDoc(name);
  };

  const handleDelete = (name: string) => {
    requestDelete(name);
  };

  const handleDocListExport = async (name: string) => {
    const doc = docStore[name] ?? createStoredDoc(name, getOutlineTree(name));
    const exportBase = getDisplayFileName(openFileInfoRef.current?.docName === name ? name : (doc.name || name));
    const parts = flattenOutlineNodes(doc.children).map((node) => ({
      name: node.name,
      html: doc.content?.[node.id] || emptyParagraph,
    }));
    const bodyHtml = parts.length > 0
      ? parts.map((part) => `<h1>${escapeHtml(part.name)}</h1>${part.html}`).join('\n<hr style="border:none;border-top:1px solid #ebecf0;margin:24px 0"/>\n')
      : `<h1>${escapeHtml(exportBase)}</h1>${emptyParagraph}`;
    const sections = buildPreviewSections(doc.children, doc.content);
    const fullHtml = buildPreviewHtml(exportBase, sections.length > 0 ? sections : [{ id: "root", name: exportBase, html: bodyHtml }], doc.children, sections[0]?.id, doc.content);
    if (isElectron) {
      await (window as any).electronAPI.exportHtml(fullHtml, `${exportBase}.html`);
      return;
    }
    const blob = new Blob([fullHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportBase}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** L1：另存为 .mdoc 后自动切换到新文件继续精编 */
  const handleSaveAsMdoc = async () => {
    if (!selectedDoc) {
      setToast({ message: "请先新建或选择文档", type: "info" });
      return;
    }
    const prevDocName = selectedDoc;
    const doc = docStore[selectedDoc] ?? createStoredDoc(selectedDoc, getOutlineTree(selectedDoc));
    const tree = getOutlineTree(selectedDoc);
    const { source: _source, ...rest } = doc;
    const baseName = getDisplayFileName(doc.name || selectedDoc);
    const payload = { ...rest, name: baseName, children: tree, updatedAt: new Date().toISOString() };

    if (isElectron && (window as any).electronAPI.saveDocToFolder) {
      const api = (window as any).electronAPI;
      const defaultDir = openFileInfoRef.current?.filePath
        ? openFileInfoRef.current.filePath.replace(/[\\/][^\\/]+$/, "")
        : selectedProject?.folderPath || activeFolder || undefined;
      const result = await api.saveDocToFolder(baseName, payload, defaultDir ? { defaultDir } : undefined);
      if (result?.canceled || !result?.filePath) return;

      const fileName = result.name || `${baseName}.mdoc`;
      const projectRoot = selectedProject?.folderPath || activeFolder || "";
      const absPath = String(result.filePath);
      const relPath = projectRoot && absPath.startsWith(projectRoot)
        ? absPath.slice(projectRoot.length).replace(/^[\\/]/, "")
        : fileName;
      const fileItem: FolderFileItem = {
        path: absPath,
        relPath,
        name: fileName,
        ext: ".mdoc",
        size: result.size || 0,
        mtimeMs: result.mtimeMs || Date.now(),
      };
      const mdocDoc: StoredDoc = {
        ...payload,
        name: relPath,
        children: tree,
        content: doc.content || {},
        updatedAt: new Date().toISOString(),
      };
      const firstNode = findDisplayNodeForFile(mdocDoc) ?? flattenOutlineNodes(tree)[0];

      openFileInfoRef.current = { docName: relPath, filePath: absPath, ext: "mdoc" };
      setDocStore((prev) => {
        const next = { ...prev, [relPath]: mdocDoc };
        if (prevDocName !== relPath) {
          const { [prevDocName]: _drop, ...restStore } = next;
          return restStore[relPath] ? { ...restStore, [relPath]: mdocDoc } : next;
        }
        return next;
      });
      setOutlineTrees((prev) => ({ ...prev, [relPath]: tree }));
      setOutlineNodes(tree);
      setSelectedDoc(relPath);
      setSelectedNodeId(firstNode?.id ?? "");
      setMode("outline");
      setSelectedFileNode({ name: fileName, path: absPath, isDirectory: false });
      setFolderFiles((prev) => [...prev.filter((item) => item.path !== absPath), fileItem]);

      if (projectRoot && api.scanFolderTree) {
        try {
          const nextTree = await api.scanFolderTree(projectRoot);
          setFolderTree(nextTree || []);
        } catch { /* ignore refresh errors */ }
      }

      setToast({ message: `已另存并打开 ${fileName}`, type: "success" });
      return;
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sanitizeFileName(baseName)}.mdoc`;
    a.click();
    URL.revokeObjectURL(url);
    // Web：无真实路径可切换，转为内存中的 mdoc 精编态
    const webName = `${baseName}.mdoc`;
    const webDoc: StoredDoc = { ...payload, name: webName, children: tree, content: doc.content || {} };
    openFileInfoRef.current = null;
    setDocs((prev) => [...new Set([...prev.filter((n) => n !== prevDocName), webName])]);
    setDocStore((prev) => {
      const { [prevDocName]: _drop, ...restStore } = prev;
      return { ...restStore, [webName]: webDoc };
    });
    setOutlineTrees((prev) => {
      const { [prevDocName]: _drop, ...restTree } = prev;
      return { ...restTree, [webName]: tree };
    });
    setSelectedDoc(webName);
    setOutlineNodes(tree);
    setSelectedNodeId(flattenOutlineNodes(tree)[0]?.id ?? "");
    setMode("outline");
    setToast({ message: "已下载并切换为 .mdoc 精编", type: "success" });
  };

  const handleSaveToFolder = async () => {
    await handleSaveAsMdoc();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      if (e.shiftKey) void handleSaveAsMdoc();
      else void handleSave();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedDoc, docStore, isElectron, selectedProject, activeFolder]);

  const handleTopBarDelete = () => {
    if (!selectedDoc) return;
    requestDelete(selectedDoc);
  };

  const handleEnterOutline = () => {
    if (!selectedDoc) return;
    const tree = getOutlineTree(selectedDoc);
    setOutlineNodes(tree);
    setSelectedNodeId(tree[0]?.id ?? "");
    setMode("outline");
  };

  const handleSwitchMode = () => {
    if (mode === "document") {
      handleEnterOutline();
    } else {
      setMode("document");
    }
  };

  // Project management handlers
  const handleSelectProject = useCallback(async (project: Project) => {
    setSelectedProject(project);
    setLevel("project");
    setSubmode("files");
    setSelectedFileNode(null);
    if (project.filePath) {
      const name = project.filePath.split(/[\\/]/).pop() || project.name;
      const fileNode: FolderTreeNode = { name, path: project.filePath, isDirectory: false };
      setFolderTree([fileNode]);
      setActiveFolder(null);
      setFolderFiles([{ path: project.filePath, relPath: name, name, ext: name.includes(".") ? `.${name.split(".").pop()?.toLowerCase()}` : "", size: 0, mtimeMs: 0 }]);
      setSelectedFileNode(fileNode);
      await openFolderFile({ path: project.filePath, relPath: name, name, ext: name.includes(".") ? `.${name.split(".").pop()?.toLowerCase()}` : "", size: 0, mtimeMs: 0 });
      setSubmode("outline");
      return;
    }
    // Scan project folder
    const api = (window as any).electronAPI;
    if (project.folderPath && api?.scanFolderTree) {
      try {
        const tree = await api.scanFolderTree(project.folderPath);
        setFolderTree(tree || []);
        // Set active folder and scan for supported files
        setActiveFolder(project.folderPath);
        if (api.scanFolder) {
          const files = await api.scanFolder(project.folderPath);
          setFolderFiles(Array.isArray(files) ? files : []);
        }
      } catch (error) {
        console.error("scan folder tree failed:", error);
        setFolderTree([]);
        setActiveFolder(null);
        setFolderFiles([]);
      }
    } else {
      setFolderTree([]);
      setActiveFolder(null);
      setFolderFiles([]);
    }
  }, [openFolderFile]);

  const handleCreateProject = useCallback(async (name: string, folderPath?: string) => {
    const api = (window as any).electronAPI;
    try {
      let result;
      if (folderPath && api?.createProjectAt) {
        result = await api.createProjectAt(name, folderPath);
      } else if (api?.createProject) {
        result = await api.createProject(name);
      } else {
        return;
      }
      if (result?.ok && result.project) {
        setProjects((prev) => [...prev, result.project]);
        handleSelectProject(result.project);
      } else if (result?.error) {
        setToast({ message: result.error, type: "error" });
      }
    } catch (error) {
      setToast({ message: "创建项目失败", type: "error" });
    }
  }, [handleSelectProject]);

  const handleImportFolder = useCallback(async (kind?: "file" | "folder") => {
    const api = (window as any).electronAPI;
    if (!api?.importFolder) return;
    try {
      const result = await api.importFolder(kind);
      if (result?.canceled) return;
      if (result?.error) {
        setToast({ message: result.error, type: "error" });
        return;
      }
      if (!result?.name || !result?.path) return;
      if (projects.some((project) => project.filePath === result.path || project.folderPath === result.path)) {
        setToast({ message: "项目已存在", type: "info" });
        return;
      }
      const now = new Date().toISOString();
      const project: Project = {
        id: `project-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: result.name,
        ...(result.isFile ? { filePath: result.path } : { folderPath: result.path }),
        createdAt: now,
        updatedAt: now,
      };
      const nextProjects = [...projects, project];
      const saveResult = await api.saveProjects(nextProjects);
      if (saveResult) {
        setProjects(nextProjects);
        handleSelectProject(project);
      }
    } catch (error) {
      setToast({ message: "导入项目失败", type: "error" });
    }
  }, [projects, handleSelectProject]);

  const handleImportFolderDrop = useCallback(async (folderPath: string) => {
    const api = (window as any).electronAPI;
    try {
      const projectName = folderPath.split(/[\\/]/).pop() || "导入的项目";
      if (projects.some((project) => project.filePath === folderPath || project.folderPath === folderPath)) {
        setToast({ message: "项目已存在", type: "info" });
        return;
      }
      const ext = projectName.includes(".") ? `.${projectName.split(".").pop()?.toLowerCase()}` : "";
      const isFile = [".mdoc", ".md", ".txt", ".docx", ".html", ".htm"].includes(ext);
      const now = new Date().toISOString();
      const project: Project = {
        id: `project-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: projectName,
        ...(isFile ? { filePath: folderPath } : { folderPath }),
        createdAt: now,
        updatedAt: now,
      };
      const nextProjects = [...projects, project];
      const saveResult = await api.saveProjects(nextProjects);
      if (saveResult) {
        setProjects(nextProjects);
        handleSelectProject(project);
      }
    } catch (error) {
      setToast({ message: "导入项目失败", type: "error" });
    }
  }, [projects, handleSelectProject]);

  const handleFileSelect = useCallback(async (node: FolderTreeNode) => {
    setSelectedFileNode(node);
    if (node.isDirectory) {
      setSubmode("files");
    } else {
      const file = folderFiles.find((item) => item.path === node.path) || {
        path: node.path,
        relPath: node.name,
        name: node.name,
        ext: node.name.includes(".") ? `.${node.name.split(".").pop()?.toLowerCase()}` : "",
        size: 0,
        mtimeMs: 0,
      };
      await openFolderFile(file);
      setSubmode("files");
    }
  }, [folderFiles, openFolderFile]);

  const handleSwitchSubmode = useCallback(() => {
    setSubmode((prev) => (prev === "files" ? "outline" : "files"));
  }, []);

  const handleNewFileInFolder = useCallback(async (folderPath: string, fileName = "新建文件") => {
    const api = (window as any).electronAPI;
    if (!api?.createFileInFolder) return;
    try {
      const result = await api.createFileInFolder(folderPath, fileName);
      if (result?.ok) {
        const fileName = result.name || result.path.split(/[\\/]/).pop() || "新建文件.mdoc";
        const fileItem = {
          path: result.path,
          relPath: selectedProject?.folderPath && result.path.startsWith(selectedProject.folderPath)
            ? result.path.slice(selectedProject.folderPath.length).replace(/^[\\/]/, "")
            : fileName,
          name: fileName,
          ext: result.ext || ".mdoc",
          size: result.size || 0,
          mtimeMs: result.mtimeMs || Date.now(),
        };
        // Refresh folder tree
        if (selectedProject?.folderPath) {
          const tree = await api.scanFolderTree(selectedProject.folderPath);
          setFolderTree(tree || []);
        }
        setFolderFiles((prev) => [...prev.filter((item) => item.path !== fileItem.path), fileItem]);
        setSelectedFileNode({ name: fileItem.name, path: fileItem.path, isDirectory: false });
        await openFolderFile(fileItem);
        setToast({ message: "文件已创建", type: "success" });
      } else if (result?.error) {
        setToast({ message: result.error, type: "error" });
      }
    } catch (error) {
      setToast({ message: "创建文件失败", type: "error" });
    }
  }, [selectedProject, openFolderFile]);

  const handleBackToProjects = useCallback(() => {
    setLevel("projects");
    setSelectedProject(null);
    setFolderTree([]);
    setSelectedFileNode(null);
    setSubmode("files");
    setActiveFolder(null);
    setFolderFiles([]);
    setSelectedDoc("");
    setOutlineNodes([]);
    setSelectedNodeId("");
    setMode("document");
  }, []);

  const handleSearchEnter = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    if (mode === "document") {
      if (activeFolder) {
        const matches = folderFiles.filter(f => f.relPath.toLowerCase().includes(q));
        if (matches.length === 1) void openFolderFile(matches[0]);
      } else {
        const matches = docs.filter(d => d.toLowerCase().includes(q));
        if (matches.length === 1) handleSelectDoc(matches[0]);
      }
    } else {
      setOutlineSearchEnter(t => t + 1);
    }
  };

  const selectedNode = mode === "outline" ? findNode(outlineNodes, selectedNodeId) : null;
  const selectedNodeDepth = mode === "outline" ? findNodeDepth(outlineNodes, selectedNodeId) : 0;
  const workspaceDocName = mode === "document" && selectedFileNode?.name ? selectedFileNode.name : selectedDoc;
  const filePreviewHtml = mode === "document" && selectedDoc && selectedNodeId && !isHtmlContentEmpty(getNodeContent(selectedDoc, selectedNodeId))
    ? getNodeContent(selectedDoc, selectedNodeId)
    : "";
  const shareDisabled = level === "project" && (!selectedFileNode || selectedFileNode.isDirectory);

  const handleTitleChange = (name: string) => {
    if (mode === "outline" && selectedNode) {
      const renameInTree = (arr: OutlineNode[]): OutlineNode[] =>
        arr.map((node) => node.id === selectedNode.id ? { ...node, name } : { ...node, children: renameInTree(node.children) });
      updateOutlineTree(selectedDoc, renameInTree(outlineNodes));
      return;
    }
    if (selectedDoc && name !== selectedDoc) handleRename(selectedDoc, name);
  };

  const handleNodeContentChange = (html: string, text: string) => {
    if (!selectedNode) return;
    editorContentRef.current = { html, text };
    setAndPersistDoc(selectedDoc, (doc) => markSourceDirty({
      ...doc,
      children: getOutlineTree(selectedDoc),
      content: { ...doc.content, [selectedNode.id]: html },
    }));
  };

  const searchQueryLower = searchQuery.trim().toLowerCase();
  const sidebarItems: SidebarItem[] = activeFolder
    ? folderFiles
        .filter((f) => !searchQueryLower || f.relPath.toLowerCase().includes(searchQueryLower))
        .map((f) => ({ key: f.relPath, label: f.relPath, isFolderFile: true }))
    : (searchQueryLower ? docs.filter((d) => d.toLowerCase().includes(searchQueryLower)) : docs)
        .map((name) => ({ key: name, label: name }));

  return (
    <div className="bg-[#f7f8fa] relative size-full" data-name="首页-文档模式">
      {level === "projects" ? (
        <>
          <ProjectListView
            projects={projects}
            viewMode={projectViewMode}
            searchQuery={searchQuery}
            isElectron={!!isElectron}
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateProject}
            onImportFolder={handleImportFolder}
            onImportFolderDrop={handleImportFolderDrop}
            onNewFileInFolder={handleNewFileInFolder}
            onOpenHelp={() => setShowHelpModal(true)}
            onOpenUpdate={updateInfo ? () => setShowUpdateModal(true) : undefined}
            updateVersion={updateInfo?.version}
            onDeleteProject={async (project) => {
              const newProjects = projects.filter((p) => p.id !== project.id);
              setProjects(newProjects);
              const api = (window as any).electronAPI;
              if (api?.saveProjects) {
                await api.saveProjects(newProjects);
              }
            }}
            onRenameProject={(project, newName) => {
              setProjects((prev) => prev.map((p) => p.id === project.id ? { ...p, name: newName } : p));
            }}
            onViewModeChange={setProjectViewMode}
            onSearchChange={setSearchQuery}
          />
          {showHelpModal && (
            <HelpModal
              onClose={() => setShowHelpModal(false)}
              onCheckUpdate={isElectron ? handleCheckForUpdates : undefined}
              updateCheckBusy={updateCheckBusy}
            />
          )}
          {updateInfo && showUpdateModal && (
            <UpdateModal
              info={updateInfo}
              downloading={updateDownloading}
              downloaded={updateDownloaded}
              progress={updateProgress}
              errorMessage={updateError}
              onLater={handleUpdateLater}
              onOpenRelease={handleOpenReleasePage}
              onDownload={handleDownloadUpdate}
              onInstall={handleInstallUpdate}
            />
          )}
          {showCloseConfirm && (
            <CloseConfirmModal
              onClose={handleCancelCloseWindow}
              onConfirm={handleCloseWindowChoice}
            />
          )}
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
      ) : (
        <>
          <EditorWorkspace docName={workspaceDocName} mode={mode} selectedNode={selectedNode} nodeDepth={selectedNodeDepth} nodeContent={selectedNode ? getNodeContent(selectedDoc, selectedNode.id) : emptyParagraph} previewHtml={filePreviewHtml} onTitleChange={handleTitleChange} theme={theme} fontSize={fontSize} lineHeight={lineHeight} sidebarWidth={276}
            onContentChange={handleNodeContentChange} />
          <TopBar
            onOpenShare={() => {
              if (shareDisabled) {
                setToast({ message: "请选择文件后再分享", type: "info" });
                return;
              }
              setShowShareModal(true);
            }}
            onOpenExport={() => setShowExportModal(true)}
            onDelete={handleTopBarDelete}
            onImport={() => importInputRef.current?.click()}
            onSave={handleSave}
            onSaveAsMdoc={handleSaveAsMdoc}
            onOpenHelp={() => setShowHelpModal(true)}
            level={level}
            projectName={selectedProject?.name || ""}
            onBack={handleBackToProjects}
            shareDisabled={shareDisabled}
            saveDisabled={!selectedDoc}
            saveAsDisabled={!selectedDoc}
          />
          <input ref={importInputRef} type="file" accept=".mdoc,.md,.txt,.html,.htm,.docx" className="hidden" onChange={handleImport} />
          <SidebarSearch value={searchQuery} onChange={setSearchQuery} mode={mode} onEnter={handleSearchEnter} />
          {mode === "outline" && selectedDoc && (
            <div className="absolute left-[20px] top-[170px] w-[274px] flex items-center gap-[8px] px-[8px] py-[9.5px]">
              <svg className="size-[16px] shrink-0" viewBox="0 0 16 16" fill="none">
                <path d="M10.0001 1.6001V4.0001C10.0001 4.44193 10.3583 4.8001 10.8001 4.8001H13.2001M12.0001 2.8001C11.6441 2.48153 11.2746 2.10368 11.0414 1.85828C10.8862 1.69499 10.6717 1.6001 10.4464 1.6001H4.39994C3.51629 1.6001 2.79995 2.31644 2.79994 3.20009L2.79988 12.8001C2.79988 13.6837 3.51622 14.4001 4.39987 14.4001L11.5999 14.4001C12.4835 14.4001 13.1999 13.6838 13.1999 12.8001L13.2001 4.31865C13.2001 4.11409 13.1221 3.91745 12.9801 3.77019C12.7176 3.49786 12.2792 3.04978 12.0001 2.8001Z" stroke="#8D8E99" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
              </svg>
              <span className="text-[12px] text-[#8D8E99] font-medium truncate">{getDisplayFileName(selectedDoc)}</span>
            </div>
          )}
          {mode === "document" ? (
            <FileTreeView
              nodes={folderTree}
              selectedPath={selectedFileNode?.path || null}
              onSelect={handleFileSelect}
              searchQuery={searchQuery}
              onNewFile={handleNewFileInFolder}
              onOpenLocation={(path) => (window as any).electronAPI?.openFolderLocation(path)}
            />
          ) : (
            <OutlineTree nodes={outlineNodes} selectedId={selectedNodeId} docName={selectedDoc} contentMap={docStore[selectedDoc]?.content ?? {}} onSelect={setSelectedNodeId} onUpdateNodes={(nodes) => updateOutlineTree(selectedDoc, nodes)} onToast={(message, type) => setToast({ message, type })} filter={searchQuery} enterTick={outlineSearchEnter} />
          )}
          <SidebarModeHeader onNewDoc={() => setModal({ type: "new-file" })} onNewFile={() => setModal({ type: "new-level" })} mode={mode} onSwitchMode={handleSwitchMode} />
          <SidebarShareStatus shared={shared} onClick={() => setShowShareModal(true)} />
      {docDeleteConfirm && (
        <DeleteConfirmModal
          message={docDeleteConfirm.message}
          onConfirm={docDeleteConfirm.onConfirm}
          onClose={() => setDocDeleteConfirm(null)}
        />
      )}
      {showExportModal && (
        <ExportModal docName={selectedDoc} content={selectedNode ? getNodeContent(selectedDoc, selectedNode.id) : editorContentRef.current.html} contentMap={docStore[selectedDoc]?.content ?? {}} outlineNodes={outlineNodes} selectedNodeId={selectedNodeId} isElectron={!!isElectron} onClose={() => setShowExportModal(false)} onToast={(message, type) => setToast({ message, type })} />
      )}
      {showShareModal && (
        <ShareModal
          shared={shared}
          mode={isElectron ? "electron" : "web"}
          loading={shareBusy}
          errorMessage={shareError}
          shareUrl={shareUrl}
          onToggle={handleToggleShare}
          onDownload={isElectron ? undefined : handleDownloadShareHtml}
          onClose={() => setShowShareModal(false)}
        />
      )}
      {showHelpModal && (
        <HelpModal
          onClose={() => setShowHelpModal(false)}
          onCheckUpdate={isElectron ? handleCheckForUpdates : undefined}
          updateCheckBusy={updateCheckBusy}
        />
      )}
      {updateInfo && showUpdateModal && (
        <UpdateModal
          info={updateInfo}
          downloading={updateDownloading}
          downloaded={updateDownloaded}
          progress={updateProgress}
          errorMessage={updateError}
          onLater={handleUpdateLater}
          onOpenRelease={handleOpenReleasePage}
          onDownload={handleDownloadUpdate}
          onInstall={handleInstallUpdate}
        />
      )}
      {showCloseConfirm && (
        <CloseConfirmModal
          onClose={handleCancelCloseWindow}
          onConfirm={handleCloseWindowChoice}
        />
      )}
      {modal?.type === "new" && (
        <NewDocModal
          title="新建文档"
          onClose={() => setModal(null)}
          onConfirm={(name) => { handleNewDoc(name); setModal(null); }}
        />
      )}
      {modal?.type === "new-file" && (
        <NewDocModal
          title="新建文件"
          onClose={() => setModal(null)}
          onConfirm={(name) => {
            if (selectedProject?.folderPath) handleNewFileInFolder(selectedProject.folderPath, name);
            else handleNewDoc(name);
            setModal(null);
          }}
        />
      )}
      {modal?.type === "new-level" && (
        <NewDocModal
          title="新建层级"
          onClose={() => setModal(null)}
          onConfirm={(name) => { handleNewRootFile(name); setModal(null); }}
        />
      )}
      {modal?.type === "rename" && (
        <NewDocModal
          title="重命名"
          initialValue={modal.target}
          onClose={() => setModal(null)}
          onConfirm={(name) => { handleRename(modal.target, name); setModal(null); }}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
      )}
    </div>
  );
}

