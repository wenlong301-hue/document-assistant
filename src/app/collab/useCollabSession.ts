import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import type { DocStore, OutlineNode, StoredDoc } from "@/app/document/types";
import { createStoredDoc } from "@/app/document/helpers";
import { getElectronAPI } from "@/app/shared/electron";
import { collabColorFor } from "./colors";
import { parseCollabLink } from "./parseLink";
import type { CollabPeer, CollabRole, CollabSessionState } from "./types";
import {
  readCollabContent,
  readCollabMeta,
  seedCollabDoc,
  writeCollabNodeHtml,
  writeCollabOutline,
} from "./ydocBind";

type ToastSetter = (toast: { message: string; type: "success" | "error" | "info" } | null) => void;

const idleState = (name: string, color: string): CollabSessionState => ({
  active: false,
  role: null,
  status: "idle",
  url: "",
  wsUrl: "",
  room: "doc-assistant",
  token: "",
  error: "",
  peers: [],
  localName: name,
  localColor: color,
  synced: false,
});

function peersFromAwareness(provider: HocuspocusProvider, localClientId: number): CollabPeer[] {
  const states = provider.awareness?.getStates();
  if (!states) return [];
  const next: CollabPeer[] = [];
  states.forEach((value, clientId) => {
    if (clientId === localClientId) return;
    const user = (value?.user && typeof value.user === "object" ? value.user : value) as Record<string, unknown>;
    next.push({
      clientId,
      name: String(user?.name || "同事"),
      color: String(user?.color || "#134CFF"),
      nodeId: user?.nodeId ? String(user.nodeId) : undefined,
    });
  });
  return next.sort((a, b) => a.clientId - b.clientId);
}

export function useCollabSession(params: {
  isElectron: boolean;
  setToast: ToastSetter;
  selectedDoc: string;
  selectedNodeId: string;
  selectedDocRef: React.MutableRefObject<string>;
  selectedNodeIdRef: React.MutableRefObject<string>;
  docStoreRef: React.MutableRefObject<DocStore>;
  getOutlineTree: (docName: string) => OutlineNode[];
  setSelectedDoc: React.Dispatch<React.SetStateAction<string>>;
  setOutlineNodes: React.Dispatch<React.SetStateAction<OutlineNode[]>>;
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string>>;
  setMode: (mode: "document" | "outline") => void;
  setLevel: React.Dispatch<React.SetStateAction<"projects" | "project">>;
  setDocs: React.Dispatch<React.SetStateAction<string[]>>;
  setAndPersistDoc: (docName: string, updater: (doc: StoredDoc) => StoredDoc, delay?: number, options?: { forcePersist?: boolean }) => void;
  markSourceDirty: (doc: StoredDoc) => StoredDoc;
  dirtyOpenDocsRef: React.MutableRefObject<Set<string>>;
  displayName: string;
}) {
  const {
    isElectron,
    setToast,
    selectedDoc,
    selectedNodeId,
    selectedDocRef,
    selectedNodeIdRef,
    docStoreRef,
    getOutlineTree,
    setSelectedDoc,
    setOutlineNodes,
    setSelectedNodeId,
    setMode,
    setLevel,
    setDocs,
    setAndPersistDoc,
    markSourceDirty,
    dirtyOpenDocsRef,
    displayName,
  } = params;

  const localName = displayName.trim() || "我";
  const localColor = collabColorFor(localName);
  const [session, setSession] = useState<CollabSessionState>(() => idleState(localName, localColor));
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);
  const [busy, setBusy] = useState(false);

  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const unbindRef = useRef<(() => void) | null>(null);
  const roleRef = useRef<CollabRole>(null);
  const applyingRemoteRef = useRef(false);

  useEffect(() => {
    setSession((prev) => {
      if (prev.localName === localName && prev.localColor === localColor) return prev;
      return { ...prev, localName, localColor };
    });
    const current = providerRef.current;
    if (!current?.awareness) return;
    const prev = current.awareness.getLocalState()?.user || {};
    current.setAwarenessField("user", { ...prev, name: localName, color: localColor });
  }, [localName, localColor]);

  const applyRemoteToStore = useCallback((doc: Y.Doc) => {
    const meta = readCollabMeta(doc);
    const content = readCollabContent(doc);
    const name = meta.name || selectedDocRef.current || "协同文档";
    applyingRemoteRef.current = true;
    setSelectedDoc(name);
    setDocs((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setOutlineNodes(meta.children);
    setAndPersistDoc(name, (current) => markSourceDirty({
      ...current,
      name,
      children: meta.children,
      content: { ...current.content, ...content },
    }), roleRef.current === "host" ? 800 : undefined, roleRef.current === "host" ? { forcePersist: true } : undefined);
    const currentSelected = selectedNodeIdRef.current;
    const exists = (nodes: OutlineNode[]): boolean => nodes.some((n) => n.id === currentSelected || exists(n.children || []));
    if (!currentSelected || !exists(meta.children)) {
      setSelectedNodeId(meta.selectedNodeId || meta.children[0]?.id || "");
    }
    dirtyOpenDocsRef.current.add(name);
    window.setTimeout(() => { applyingRemoteRef.current = false; }, 0);
  }, [dirtyOpenDocsRef, markSourceDirty, selectedDocRef, selectedNodeIdRef, setAndPersistDoc, setDocs, setOutlineNodes, setSelectedDoc, setSelectedNodeId]);

  const teardown = useCallback(async (opts?: { stopServer?: boolean }) => {
    unbindRef.current?.();
    unbindRef.current = null;
    const currentProvider = providerRef.current;
    const currentDoc = ydocRef.current;
    providerRef.current = null;
    ydocRef.current = null;
    roleRef.current = null;
    setProvider(null);
    setYdoc(null);
    try { currentProvider?.destroy(); } catch {}
    try { currentDoc?.destroy(); } catch {}
    if (opts?.stopServer !== false && isElectron) {
      try { await getElectronAPI()?.stopCollab?.(); } catch {}
    }
    setSession((prev) => idleState(prev.localName, prev.localColor));
  }, [isElectron]);

  const attachProvider = useCallback((opts: {
    wsUrl: string;
    url: string;
    token: string;
    room: string;
    role: Exclude<CollabRole, null>;
    seed?: StoredDoc;
  }) => {
    const doc = new Y.Doc();
    if (opts.role === "host" && opts.seed) {
      seedCollabDoc(doc, opts.seed, selectedNodeIdRef.current, "outline");
    }
    const nextProvider = new HocuspocusProvider({
      url: opts.wsUrl,
      name: opts.room,
      document: doc,
      token: opts.token,
    });
    ydocRef.current = doc;
    providerRef.current = nextProvider;
    roleRef.current = opts.role;
    setYdoc(doc);
    setProvider(nextProvider);

    const meta = doc.getMap("meta");
    const content = doc.getMap("content");
    const onMeta = (_event: Y.YMapEvent<unknown>, txn: Y.Transaction) => {
      if (txn.origin === "local-outline" || txn.origin === "local-seed" || txn.origin === "local-select" || txn.origin === "local-mode") return;
      applyRemoteToStore(doc);
    };
    const onContent = (_event: Y.YMapEvent<unknown>, txn: Y.Transaction) => {
      if (txn.origin === "local-content" || txn.origin === "local-seed") return;
      applyRemoteToStore(doc);
    };
    meta.observe(onMeta);
    content.observe(onContent);
    unbindRef.current = () => {
      meta.unobserve(onMeta);
      content.unobserve(onContent);
    };

    const syncAwareness = () => {
      setSession((prev) => ({ ...prev, peers: peersFromAwareness(nextProvider, doc.clientID) }));
    };

    nextProvider.on("connect", () => {
      setSession((prev) => ({ ...prev, status: "connected", error: "" }));
    });
    nextProvider.on("disconnect", () => {
      setSession((prev) => (prev.active ? { ...prev, status: "connecting" } : prev));
    });
    nextProvider.on("awarenessUpdate", syncAwareness);
    nextProvider.on("awarenessChange", syncAwareness);
    nextProvider.on("synced", () => {
      nextProvider.setAwarenessField("user", {
        name: localName,
        color: localColor,
        nodeId: selectedNodeIdRef.current,
        role: opts.role,
      });
      applyRemoteToStore(doc);
      if (opts.role === "guest") {
        setLevel("project");
        setMode("outline");
      }
      syncAwareness();
      setSession((prev) => ({ ...prev, synced: true, status: "connected", error: "" }));
    });
    nextProvider.on("authenticationFailed", ({ reason }: { reason?: string }) => {
      setSession((prev) => ({ ...prev, status: "error", error: reason || "协同口令不正确" }));
      setToast({ message: "协同口令不正确", type: "error" });
    });
    nextProvider.on("close", () => {
      setSession((prev) => (prev.active && prev.status !== "error" ? { ...prev, status: "connecting" } : prev));
    });

    setSession((prev) => ({
      ...prev,
      active: true,
      role: opts.role,
      status: "connecting",
      url: opts.url,
      wsUrl: opts.wsUrl,
      room: opts.room,
      token: opts.token,
      error: "",
      synced: false,
      peers: [],
    }));
  }, [applyRemoteToStore, localColor, localName, selectedNodeIdRef, setLevel, setMode, setToast]);

  const handleStartCollab = useCallback(async () => {
    if (busy || session.active) return;
    if (!isElectron) {
      setToast({ message: "网页端不能发起协同，请在桌面应用中开启", type: "info" });
      return;
    }
    const docName = selectedDocRef.current || selectedDoc;
    if (!docName) {
      setToast({ message: "请先选择文档", type: "error" });
      return;
    }
    setBusy(true);
    try {
      const result = await getElectronAPI()?.startCollab?.(6536);
      if (!result?.wsUrl || !result?.token) throw new Error(result?.error || "协同开启失败");
      const stored = docStoreRef.current[docName] ?? createStoredDoc(docName, getOutlineTree(docName));
      attachProvider({
        wsUrl: result.wsUrl,
        url: result.url,
        token: result.token,
        room: result.room || "doc-assistant",
        role: "host",
        seed: stored,
      });
      setMode("outline");
      setToast({ message: result.port && result.port !== 6536 ? `协同已开启（端口 ${result.port}）` : "协同已开启", type: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "协同开启失败";
      setSession((prev) => ({ ...prev, status: "error", error: message.includes("EADDRINUSE") ? "可用端口都被占用，请关闭占用程序后重试。" : message }));
      setToast({ message: "协同开启失败", type: "error" });
      try { await getElectronAPI()?.stopCollab?.(); } catch {}
    } finally {
      setBusy(false);
    }
  }, [attachProvider, busy, docStoreRef, getOutlineTree, isElectron, selectedDoc, selectedDocRef, session.active, setMode, setToast]);

  const handleJoinCollab = useCallback(async (link: string) => {
    if (busy) return;
    const parsed = parseCollabLink(link);
    if (!parsed) {
      setToast({ message: "请粘贴完整的协同链接", type: "error" });
      return;
    }
    if (session.active) await teardown({ stopServer: session.role === "host" });
    setBusy(true);
    try {
      attachProvider({
        wsUrl: parsed.wsUrl,
        url: link.trim(),
        token: parsed.token,
        room: parsed.room,
        role: "guest",
      });
      setToast({ message: "正在加入协同…", type: "info" });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "加入协同失败", type: "error" });
    } finally {
      setBusy(false);
    }
  }, [attachProvider, busy, session.active, session.role, setToast, teardown]);

  const handleStopCollab = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const role = session.role;
      await teardown({ stopServer: role === "host" });
      setToast({ message: role === "guest" ? "已离开协同" : "协同已关闭", type: "info" });
    } finally {
      setBusy(false);
    }
  }, [busy, session.role, setToast, teardown]);

  useEffect(() => {
    providerRef.current?.setAwarenessField("user", {
      name: localName,
      color: localColor,
      nodeId: selectedNodeId,
      role: session.role,
    });
  }, [localColor, localName, selectedNodeId, session.role]);

  useEffect(() => () => { void teardown({ stopServer: true }); }, [teardown]);

  const writeNodeHtml = useCallback((nodeId: string, html: string) => {
    const doc = ydocRef.current;
    if (!doc || !session.active) return;
    writeCollabNodeHtml(doc, nodeId, html);
  }, [session.active]);

  const syncOutlineToCollab = useCallback((nodes: OutlineNode[]) => {
    const doc = ydocRef.current;
    if (!doc || !session.active) return;
    writeCollabOutline(doc, nodes);
  }, [session.active]);

  return {
    collab: session,
    collabBusy: busy,
    collabYdoc: ydoc,
    collabProvider: provider,
    applyingRemoteRef,
    handleStartCollab,
    handleJoinCollab,
    handleStopCollab,
    writeCollabNodeHtml: writeNodeHtml,
    syncOutlineToCollab,
  };
}
