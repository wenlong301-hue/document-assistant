import { useState, useEffect, useRef, useCallback } from "react";
import type { DocStore, OutlineNode, StoredDoc, WebPersistedState } from "@/app/document/types";
import {
  buildEmptyOutlineTree,
  buildFolderWritePayload,
  buildOutlineTree,
  countDescendants,
  createStoredDoc,
  findNode,
  normalizeStoredDoc,
  readWebState,
  WEB_STORAGE_KEY,
  writeWebState,
} from "@/app/document/helpers";
import { emptyParagraph, normalizeEditorHtml } from "@/app/editor/utils/html";
import { getElectronAPI } from "@/app/shared/electron";
import { formatSavedAt } from "@/app/editor/constants";

type ToastSetter = (toast: { message: string; type: "success" | "error" | "info" } | null) => void;

export function useDocPersistence(params: {
  isElectron: boolean;
  setToast: ToastSetter;
  autoSaveEnabled: boolean;
  setMode: (mode: "document" | "outline") => void;
}) {
  const { isElectron, setToast, autoSaveEnabled, setMode } = params;

  const [selectedDoc, setSelectedDoc] = useState("");
  const [docs, setDocs] = useState<string[]>([]);
  const [outlineNodes, setOutlineNodes] = useState<OutlineNode[]>([]);
  const [outlineTrees, setOutlineTrees] = useState<Record<string, OutlineNode[]>>({});
  const [selectedNodeId, setSelectedNodeId] = useState("root");
  const [docStore, setDocStore] = useState<DocStore>({});
  const [webStoreHydrated, setWebStoreHydrated] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const webPersistErrorShownRef = useRef(false);
  const anchorNavigationHandledRef = useRef(false);
  const editorContentRef = useRef({ html: "", text: "", nodeId: "" });
  const openFileInfoRef = useRef<{ docName: string; filePath: string; ext: string; originalText?: string; lineEnding?: string } | null>(null);
  const dirtyOpenDocsRef = useRef<Set<string>>(new Set());
  const docStoreRef = useRef<DocStore>({});
  const selectedDocRef = useRef("");
  const selectedNodeIdRef = useRef("");

  useEffect(() => { docStoreRef.current = docStore; }, [docStore]);
  useEffect(() => { selectedDocRef.current = selectedDoc; }, [selectedDoc]);
  useEffect(() => { selectedNodeIdRef.current = selectedNodeId; }, [selectedNodeId]);

  /**
   * L2 项目原文件写回（产品 A 三层策略）：
   * - L1 .mdoc：完整 JSON（大纲 + 节点 HTML），无损
   * - L2 其它格式：未编辑 source.dirty===false 时原样写回；已编辑按扩展名最优策略
   */
  const writeFolderDocBack = useCallback(async (docName: string, doc: StoredDoc): Promise<{ ok: boolean; mode?: "preserved" | "patched" | "converted" | "mdoc"; error?: string }> => {
    const info = openFileInfoRef.current;
    if (!info || info.docName !== docName) return { ok: false, error: "未绑定原文件" };
    const api = getElectronAPI();
    if (!api?.writeFolderFile) return { ok: false, error: "当前环境不支持写回" };
    const built = await buildFolderWritePayload(docName, doc, info);
    if (built.ok === false) return { ok: false, error: built.error };
    const { payload, expectedMode } = built;
    try {
      const result = await api.writeFolderFile(info.filePath, payload);
      if (result && result.ok === false) {
        setToast({ message: `保存失败：${result.error || "写入错误"}`, type: "error" });
        return { ok: false, error: result.error || "写入错误" };
      }
      const mode = result?.preserved
        ? "preserved"
        : result?.patched
          ? "patched"
          : result?.converted
            ? "converted"
            : expectedMode;
      // docx 写回成功后刷新内存中的原包，避免下次 patch 仍基于打开时的旧 base64
      if (info.ext === "docx" && mode !== "preserved") {
        try {
          const fresh = await api.readFolderFile?.(info.filePath);
          if (fresh?.base64) {
            const writtenAt = doc.updatedAt;
            setDocStore((prev) => {
              const current = prev[docName];
              if (!current?.source || current.source.ext !== "docx") return prev;
              // 写回期间若又编辑过，只更新 base64，保留 dirty，避免冲掉新改动
              const nextDoc: StoredDoc = {
                ...current,
                source: {
                  ...current.source,
                  base64: fresh.base64,
                  dirty: current.updatedAt === writtenAt ? false : true,
                },
              };
              const nextStore = { ...prev, [docName]: nextDoc };
              docStoreRef.current = nextStore;
              return nextStore;
            });
          }
        } catch (error) {
          console.warn("refresh docx source after write failed:", error);
        }
      }
      return { ok: true, mode };
    } catch (error) {
      console.error("write folder file failed:", error);
      setToast({ message: "保存失败", type: "error" });
      return { ok: false, error: "保存失败" };
    }
  }, [setToast]);

  const persistDoc = useCallback((docName: string, doc: StoredDoc, delay = 500) => {
    if (!isElectron || !docName) return;
    clearTimeout(saveTimersRef.current[docName]);
    if (openFileInfoRef.current?.docName === docName) {
      saveTimersRef.current[docName] = setTimeout(() => { void writeFolderDocBack(docName, doc); }, delay);
      return;
    }
    saveTimersRef.current[docName] = setTimeout(() => {
      getElectronAPI()?.saveDoc(docName, { ...doc, updatedAt: new Date().toISOString() });
    }, delay);
  }, [isElectron, writeFolderDocBack]);

  const ensureDoc = useCallback((docName: string): StoredDoc => {
    return docStore[docName] ?? createStoredDoc(docName);
  }, [docStore]);

  const setAndPersistDoc = useCallback((docName: string, updater: (doc: StoredDoc) => StoredDoc, delay = 500, options?: { forcePersist?: boolean }) => {
    setDocStore((prev) => {
      const current = prev[docName] ?? createStoredDoc(docName);
      const nextDoc = { ...updater(current), name: docName, updatedAt: new Date().toISOString() };
      const nextStore = { ...prev, [docName]: nextDoc };
      // 同步写入 ref，避免「刚编辑完立刻保存」时 useEffect 尚未跑、handleSave 读到旧内容并取消防抖写回
      docStoreRef.current = nextStore;
      // 开启自动保存时也不在编辑时防抖落盘，仅由 30s 定时器 / 手动保存 / forcePersist 落盘
      const shouldPersist = options?.forcePersist || delay === 0;
      if (shouldPersist) persistDoc(docName, nextDoc, delay);
      return nextStore;
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
      await getElectronAPI()?.saveDoc?.(docName, { ...doc, updatedAt: new Date().toISOString() });
      return true;
    } catch (error) {
      console.error("auto save doc failed:", error);
      return false;
    }
  }, [isElectron, writeFolderDocBack]);

  const flushCurrentDoc = useCallback(async () => {
    return flushDoc(selectedDocRef.current);
  }, [flushDoc]);

  const persistWebStateNow = useCallback(async (state: WebPersistedState) => {
    try {
      await writeWebState(state);
      localStorage.removeItem(WEB_STORAGE_KEY);
      webPersistErrorShownRef.current = false;
      return true;
    } catch (indexedDbError) {
      console.error("Failed to save IndexedDB store:", indexedDbError);
      try {
        localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(state));
        webPersistErrorShownRef.current = false;
        return true;
      } catch (storageError) {
        console.error("Failed to save fallback web store:", storageError);
        if (!webPersistErrorShownRef.current) {
          webPersistErrorShownRef.current = true;
          setToast({ message: "文档内容过大，浏览器存储失败，请导出文档后减少媒体文件", type: "error" });
        }
        return false;
      }
    }
  }, [setToast]);

  useEffect(() => {
    if (!autoSaveEnabled) return;
    const timer = window.setInterval(() => {
      void (async () => {
        if (isElectron) {
          const ok = await flushCurrentDoc();
          if (ok) {
            const name = selectedDocRef.current;
            if (name) dirtyOpenDocsRef.current.delete(name);
            setDocStore((prev) => {
              const doc = prev[name];
              if (!name || !doc?.source?.dirty) return prev;
              const nextStore = { ...prev, [name]: { ...doc, source: { ...doc.source, dirty: false } } };
              docStoreRef.current = nextStore;
              return nextStore;
            });
            setLastSavedAt(formatSavedAt(false));
          }
          return;
        }
        if (!webStoreHydrated) return;
        const state: WebPersistedState = {
          docs,
          docStore: docStoreRef.current,
          selectedDoc: selectedDocRef.current,
        };
        const ok = await persistWebStateNow(state);
        if (ok) setLastSavedAt(formatSavedAt(false));
      })();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [autoSaveEnabled, isElectron, flushCurrentDoc, webStoreHydrated, docs, persistWebStateNow]);

  useEffect(() => {
    if (isElectron) {
      getElectronAPI()?.getDocs().then(async (list: any[]) => {
        if (list.length > 0) {
          const loadedEntries = await Promise.all(list.map(async (item: any) => {
            const id = item.id ?? item.name;
            const raw = await getElectronAPI()?.getDoc(id);
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
  }, [isElectron]);

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
  }, [docs, docStore, isElectron, webStoreHydrated, setToast, setMode]);

  const getOutlineTree = useCallback((docName: string) =>
    docName ? (docStore[docName]?.children ?? outlineTrees[docName] ?? buildEmptyOutlineTree(docName)) : [],
  [docStore, outlineTrees]);

  const getNodeContent = useCallback((docName: string, nodeId: string) =>
    normalizeEditorHtml(docStore[docName]?.content?.[nodeId] ?? emptyParagraph),
  [docStore]);

  const markSourceDirty = useCallback((doc: StoredDoc): StoredDoc => {
    if (doc.name) dirtyOpenDocsRef.current.add(doc.name);
    return doc.source ? { ...doc, source: { ...doc.source, dirty: true } } : doc;
  }, []);

  const isOpenDocDirty = useCallback((docName: string) => {
    if (!docName) return false;
    const doc = docStoreRef.current[docName];
    return dirtyOpenDocsRef.current.has(docName) || !!doc?.source?.dirty;
  }, []);

  const clearOpenDocDirty = useCallback((docName: string) => {
    if (!docName) return;
    dirtyOpenDocsRef.current.delete(docName);
    setDocStore((prev) => {
      const doc = prev[docName];
      if (!doc) return prev;
      if (!doc.source?.dirty) return prev;
      const nextStore = { ...prev, [docName]: { ...doc, source: { ...doc.source, dirty: false } } };
      docStoreRef.current = nextStore;
      return nextStore;
    });
  }, []);

  const updateOutlineTree = useCallback((docName: string, nodes: OutlineNode[]) => {
    setOutlineNodes(nodes);
    setOutlineTrees((prev) => ({ ...prev, [docName]: nodes }));
    dirtyOpenDocsRef.current.add(docName);
    setAndPersistDoc(docName, (doc) => markSourceDirty({ ...doc, name: docName, children: nodes }));
  }, [setAndPersistDoc, markSourceDirty]);

  const getDocChildCount = useCallback((docName: string) => {
    const tree = getOutlineTree(docName);
    return tree.reduce((acc, n) => acc + countDescendants(n), 0);
  }, [getOutlineTree]);

  return {
    selectedDoc, setSelectedDoc,
    docs, setDocs,
    outlineNodes, setOutlineNodes,
    outlineTrees, setOutlineTrees,
    selectedNodeId, setSelectedNodeId,
    docStore, setDocStore,
    webStoreHydrated,
    lastSavedAt, setLastSavedAt,
    saveTimersRef,
    webPersistErrorShownRef,
    anchorNavigationHandledRef,
    editorContentRef,
    openFileInfoRef,
    dirtyOpenDocsRef,
    docStoreRef,
    selectedDocRef,
    selectedNodeIdRef,
    writeFolderDocBack,
    persistDoc,
    ensureDoc,
    setAndPersistDoc,
    flushDoc,
    flushCurrentDoc,
    persistWebStateNow,
    getOutlineTree,
    getNodeContent,
    markSourceDirty,
    isOpenDocDirty,
    clearOpenDocDirty,
    updateOutlineTree,
    getDocChildCount,
  };
}
