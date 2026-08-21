import { useState, useEffect, useRef, useCallback } from "react";
import type { DocStore, FolderFileItem, OutlineNode, StoredDoc, Project, FolderTreeNode, WebPersistedState } from "@/app/document/types";
import {
  buildDeleteMessage,
  buildOutlineTree,
  buildPreviewHtmlAsync,
  buildPreviewSections,
  createStoredDoc,
  findDisplayNodeForFile,
  flattenOutlineNodes,
  importHtmlAsStoredDoc,
  importMarkdownAsStoredDoc,
  normalizeStoredDoc,
  sanitizeFileName,
  textToHtml,
  textToPlainTextHtml,
} from "@/app/document/helpers";
import { emptyParagraph, escapeHtml } from "@/app/editor/utils/html";
import { getElectronAPI } from "@/app/shared/electron";
import { formatSavedAt } from "@/app/editor/constants";
import { mammothStyleMap } from "@/app/document/mammothStyleMap";
import {
  arrayBufferToBase64,
  getDisplayFileName,
  getDominantLineEnding,
} from "@/app/shared/utils/text";
import { messageForSaveMode } from "@/app/document/lib/saveFeedback";

type ToastSetter = (toast: { message: string; type: "success" | "error" | "info" } | null) => void;

export function useFolderDocuments(params: {
  isElectron: boolean;
  setToast: ToastSetter;
  mode: "document" | "outline";
  setMode: (mode: "document" | "outline") => void;
  selectedDoc: string;
  setSelectedDoc: React.Dispatch<React.SetStateAction<string>>;
  docs: string[];
  setDocs: React.Dispatch<React.SetStateAction<string[]>>;
  outlineNodes: OutlineNode[];
  setOutlineNodes: React.Dispatch<React.SetStateAction<OutlineNode[]>>;
  outlineTrees: Record<string, OutlineNode[]>;
  setOutlineTrees: React.Dispatch<React.SetStateAction<Record<string, OutlineNode[]>>>;
  selectedNodeId: string;
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string>>;
  docStore: DocStore;
  setDocStore: React.Dispatch<React.SetStateAction<DocStore>>;
  docStoreRef: React.MutableRefObject<DocStore>;
  selectedDocRef: React.MutableRefObject<string>;
  selectedNodeIdRef: React.MutableRefObject<string>;
  editorContentRef: React.MutableRefObject<{ html: string; text: string; nodeId: string }>;
  openFileInfoRef: React.MutableRefObject<{ docName: string; filePath: string; ext: string; originalText?: string; lineEnding?: string } | null>;
  dirtyOpenDocsRef: React.MutableRefObject<Set<string>>;
  saveTimersRef: React.MutableRefObject<Record<string, ReturnType<typeof setTimeout>>>;
  persistDoc: (docName: string, doc: StoredDoc, delay?: number) => void;
  writeFolderDocBack: (docName: string, doc: StoredDoc) => Promise<{ ok: boolean; mode?: "preserved" | "patched" | "converted" | "mdoc"; error?: string }>;
  persistWebStateNow: (state: WebPersistedState) => Promise<boolean>;
  getOutlineTree: (docName: string) => OutlineNode[];
  getDocChildCount: (docName: string) => number;
  clearOpenDocDirty: (docName: string) => void;
  updateOutlineTree: (docName: string, nodes: OutlineNode[]) => void;
  setAndPersistDoc: (docName: string, updater: (doc: StoredDoc) => StoredDoc, delay?: number, options?: { forcePersist?: boolean }) => void;
  markSourceDirty: (doc: StoredDoc) => StoredDoc;
  setLastSavedAt: (v: string | null) => void;
  selectedProjectRef: React.MutableRefObject<Project | null>;
  setFolderTreeRef: React.MutableRefObject<React.Dispatch<React.SetStateAction<FolderTreeNode[]>>>;
  setSelectedFileNodeRef: React.MutableRefObject<React.Dispatch<React.SetStateAction<FolderTreeNode | null>>>;
  setDocDeleteConfirm: React.Dispatch<React.SetStateAction<{ message: string; onConfirm: () => void } | null>>;
}) {
  const {
    isElectron,
    setToast,
    mode,
    setMode,
    selectedDoc,
    setSelectedDoc,
    docs,
    setDocs,
    outlineNodes,
    setOutlineNodes,
    setOutlineTrees,
    setSelectedNodeId,
    docStore,
    setDocStore,
    docStoreRef,
    selectedDocRef,
    selectedNodeIdRef,
    editorContentRef,
    openFileInfoRef,
    dirtyOpenDocsRef,
    saveTimersRef,
    persistDoc,
    writeFolderDocBack,
    persistWebStateNow,
    getOutlineTree,
    getDocChildCount,
    clearOpenDocDirty,
    updateOutlineTree,
    setAndPersistDoc,
    markSourceDirty,
    setLastSavedAt,
    selectedProjectRef,
    setFolderTreeRef,
    setSelectedFileNodeRef,
    setDocDeleteConfirm,
  } = params;

  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [folderFiles, setFolderFiles] = useState<FolderFileItem[]>([]);
  const [folderGone, setFolderGone] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isElectron) return;
    const api = getElectronAPI();
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
  }, [isElectron, openFileInfoRef, setDocStore, setOutlineTrees, setSelectedDoc, setOutlineNodes, setSelectedNodeId, setMode, setToast]);

  useEffect(() => {
    if (!isElectron) return;
    const api = getElectronAPI();
    if (!api?.getFolderState) return;
    api.getFolderState().then((state: { path?: string | null; files?: FolderFileItem[]; gone?: boolean }) => {
      if (!state?.path) return;
      setActiveFolder(state.path);
      setFolderFiles(Array.isArray(state.files) ? state.files : []);
      if (state.gone) setFolderGone(true);
    }).catch((error: unknown) => console.error("get folder state failed:", error));
  }, [isElectron]);

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
        editorContentRef.current = { html, text: parsedText, nodeId: leaf.id };
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
          const html = ext === "txt" || ext === "sql"
            ? textToPlainTextHtml(text, ext === "sql" ? "sql" : undefined)
            : textToHtml(text);
          const tree = buildOutlineTree(name);
          const leaf = flattenOutlineNodes(tree).find((node) => node.children.length === 0) ?? tree[0];
          const doc = {
            ...createStoredDoc(name, tree, { [leaf.id]: html }),
            source: ext === "txt" || ext === "sql"
              ? { ext: ext as "txt" | "sql", originalText: text, dirty: false }
              : undefined,
          };
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

  const handleSelectDoc = (name: string) => {
    setSelectedDoc(name);
    const tree = getOutlineTree(name);
    setOutlineNodes(tree);
    setSelectedNodeId(tree[0]?.id ?? "");
    if (mode === "outline") setMode("outline");
  };

  const openFolderFile = useCallback(async (file: FolderFileItem) => {
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
    const api = getElectronAPI();
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
      dirtyOpenDocsRef.current.delete(docName);
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
        const html = fileExt === "txt" || fileExt === "sql"
          ? textToPlainTextHtml(originalText, fileExt === "sql" ? "sql" : undefined)
          : textToHtml(originalText);
        const tree = buildOutlineTree(docName);
        const leaf = flattenOutlineNodes(tree).find((node) => node.children.length === 0) ?? tree[0];
        const doc = {
          ...createStoredDoc(docName, tree, { [leaf.id]: html }),
          source: fileExt === "txt" || fileExt === "sql"
            ? { ext: fileExt as "txt" | "sql", originalText, dirty: false }
            : undefined,
        };
        apply(doc, tree, leaf.id, true, fileExt === "txt" || fileExt === "sql"
          ? { filePath: file.path, ext: fileExt, originalText, lineEnding: getDominantLineEnding(originalText) }
          : undefined);
      }
    } catch (error) {
      console.error("open folder file failed:", error);
      const detail = error instanceof Error ? error.message : "未知错误";
      setToast({ message: fileExt === "mdoc" ? "mdoc 文件格式错误" : `打开文件失败：${detail}`, type: "error" });
    }
  }, [isElectron, docStore, openFileInfoRef, dirtyOpenDocsRef, getOutlineTree, setSelectedDoc, setOutlineNodes, setSelectedNodeId, setMode, setDocStore, setOutlineTrees, setToast]);

  const handleOpenFolder = async () => {
    if (!isElectron) {
      setToast({ message: "请在桌面应用中使用文件夹功能", type: "info" });
      return;
    }
    const api = getElectronAPI();
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
      await getElectronAPI()?.closeFolder?.();
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

  const saveResultToast = (saveMode?: string) => {
    setToast({ message: messageForSaveMode(saveMode), type: "success" });
  };

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

    if (isElectron && getElectronAPI()?.saveDocToFolder) {
      const api = getElectronAPI();
      const selectedProject = selectedProjectRef.current;
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
        const next: DocStore = { ...prev, [relPath]: mdocDoc };
        if (prevDocName && prevDocName !== relPath) {
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
      setSelectedFileNodeRef.current({ name: fileName, path: absPath, isDirectory: false });
      setFolderFiles((prev) => [...prev.filter((item) => item.path !== absPath), fileItem]);

      if (projectRoot && api.scanFolderTree) {
        try {
          const nextTree = await api.scanFolderTree(projectRoot);
          setFolderTreeRef.current(nextTree || []);
        } catch { /* ignore refresh errors */ }
      }

      setLastSavedAt(formatSavedAt(false));
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

  const handleSave = async () => {
    const info = openFileInfoRef.current;
    if (info && info.docName === selectedDoc) {
      clearTimeout(saveTimersRef.current[selectedDoc]);
      const doc = docStoreRef.current[selectedDoc] ?? createStoredDoc(selectedDoc, getOutlineTree(selectedDoc));
      const result = await writeFolderDocBack(selectedDoc, doc);
      if (result.ok) {
        clearOpenDocDirty(selectedDoc);
        setLastSavedAt(formatSavedAt(false));
        saveResultToast(result.mode);
      }
      return;
    }
    if (!isElectron) {
      const state: WebPersistedState = { docs, docStore: docStoreRef.current, selectedDoc };
      const ok = await persistWebStateNow(state);
      if (ok) {
        setLastSavedAt(formatSavedAt(false));
        setToast({ message: "已保存", type: "success" });
      }
      return;
    }
    await handleSaveToFolder();
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
  }, [selectedDoc, docStore, isElectron, activeFolder]);

  const doDeleteFolderFile = async (info: { docName: string; filePath: string; ext: string }) => {
    if (!isElectron) return;
    const api = getElectronAPI();
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

  const doDeleteDoc = (name: string) => {
    setDocs((prev) => {
      const next = prev.filter((d) => d !== name);
      if (selectedDoc === name && next.length > 0) setSelectedDoc(next[0]);
      return next;
    });
    setOutlineTrees((prev) => { const { [name]: _, ...rest } = prev; return rest; });
    setDocStore((prev) => { const { [name]: _, ...rest } = prev; return rest; });
    if (mode === "outline" && selectedDoc === name) setMode("document");
    if (isElectron) getElectronAPI()?.deleteDoc(name);
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
      const api = getElectronAPI();
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
      getElectronAPI()?.deleteDoc(oldName);
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
    const fullHtml = await buildPreviewHtmlAsync(exportBase, sections.length > 0 ? sections : [{ id: "root", name: exportBase, html: bodyHtml }], doc.children, sections[0]?.id, doc.content);
    if (isElectron) {
      await getElectronAPI()?.exportHtml(fullHtml, `${exportBase}.html`);
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

  const handleNodeContentChange = (html: string, text: string) => {
    const docName = selectedDocRef.current;
    const nodeId = selectedNodeIdRef.current;
    if (!docName || !nodeId) return;
    editorContentRef.current = { html, text, nodeId };
    dirtyOpenDocsRef.current.add(docName);
    setAndPersistDoc(docName, (doc) => markSourceDirty({
      ...doc,
      name: docName,
      children: getOutlineTree(docName),
      content: { ...doc.content, [nodeId]: html },
    }));
  };

  return {
    activeFolder, setActiveFolder,
    folderFiles, setFolderFiles,
    folderGone, setFolderGone,
    importInputRef,
    handleImport,
    handleSelectDoc,
    openFolderFile,
    handleOpenFolder,
    handleCloseFolder,
    handleSave,
    handleSaveAsMdoc,
    handleSaveToFolder,
    requestDelete,
    handleRename,
    handleNewDoc,
    handleNewRootFile,
    handleDelete,
    handleDocListExport,
    handleTopBarDelete,
    handleEnterOutline,
    handleSwitchMode,
    handleNodeContentChange,
  };
}
