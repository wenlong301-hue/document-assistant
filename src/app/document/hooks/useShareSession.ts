import { useState, useEffect, useRef, useCallback } from "react";
import type { DocStore, OutlineNode } from "@/app/document/types";
import { buildPreviewHtmlAsync, buildPreviewSections, createStoredDoc } from "@/app/document/helpers";
import { emptyParagraph, escapeHtml } from "@/app/editor/utils/html";
import { getElectronAPI } from "@/app/shared/electron";
import { getDisplayFileName } from "@/app/shared/utils/text";

type ToastSetter = (toast: { message: string; type: "success" | "error" | "info" } | null) => void;

export function useShareSession(params: {
  isElectron: boolean;
  setToast: ToastSetter;
  selectedDoc: string;
  selectedNodeId: string;
  docStore: DocStore;
  outlineTrees: Record<string, OutlineNode[]>;
  selectedDocRef: React.MutableRefObject<string>;
  selectedNodeIdRef: React.MutableRefObject<string>;
  docStoreRef: React.MutableRefObject<DocStore>;
  editorContentRef: React.MutableRefObject<{ html: string; text: string; nodeId: string }>;
  getOutlineTree: (docName: string) => OutlineNode[];
  shareDisabled: boolean;
}) {
  const {
    isElectron,
    setToast,
    selectedDoc,
    selectedNodeId,
    docStore,
    outlineTrees,
    selectedDocRef,
    selectedNodeIdRef,
    docStoreRef,
    editorContentRef,
    getOutlineTree,
    shareDisabled,
  } = params;

  const [shared, setShared] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState("");
  const [shareUrl, setShareUrl] = useState("http://localhost:6535");
  const webShareUrlRef = useRef<string | null>(null);
  const webShareHtmlRef = useRef("");

  const revokeWebShareUrl = useCallback(() => {
    if (webShareUrlRef.current) {
      URL.revokeObjectURL(webShareUrlRef.current);
      webShareUrlRef.current = null;
    }
    webShareHtmlRef.current = "";
  }, []);

  useEffect(() => () => revokeWebShareUrl(), [revokeWebShareUrl]);

  const buildCurrentShareHtml = useCallback(async () => {
    const docName = selectedDocRef.current || selectedDoc;
    if (!docName) throw new Error("请先新建或选择文档");
    const doc = docStoreRef.current[docName] ?? createStoredDoc(docName, getOutlineTree(docName));
    const nodeId = selectedNodeIdRef.current || selectedNodeId;
    const live = editorContentRef.current;
    const content = nodeId && live.nodeId === nodeId && live.html
      ? { ...doc.content, [nodeId]: live.html }
      : { ...doc.content };
    const displayName = getDisplayFileName(doc.name || docName);
    const tree = doc.children?.length ? doc.children : getOutlineTree(docName);
    const sections = buildPreviewSections(tree, content);
    const bodyHtml = sections.length > 0
      ? sections.map((section) => section.html).join('\n<hr style="border:none;border-top:1px solid #ebecf0;margin:24px 0"/>\n')
      : `<h1>${escapeHtml(displayName)}</h1>${emptyParagraph}`;
    return buildPreviewHtmlAsync(
      displayName,
      sections.length > 0 ? sections : [{ id: "root", name: displayName, html: bodyHtml }],
      tree,
      nodeId || sections[0]?.id,
      content,
    );
  }, [selectedDoc, selectedNodeId, docStore, outlineTrees, selectedDocRef, selectedNodeIdRef, docStoreRef, editorContentRef, getOutlineTree]);

  const createWebShare = useCallback(async () => {
    revokeWebShareUrl();
    const html = await buildCurrentShareHtml();
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
          await createWebShare();
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
        const html = await buildCurrentShareHtml();
        const result = await getElectronAPI()?.startShare(6535, selectedDoc, html);
        const url = typeof result === "string" ? result : result?.url;
        if (!url) throw new Error(result?.error || "分享开启失败");
        setShareUrl(url);
        setShared(true);
        setToast({ message: result?.port && result.port !== 6535 ? `分享已开启（端口 ${result.port}）` : "分享已开启", type: "success" });
      } else {
        await getElectronAPI()?.stopShare();
        setShared(false);
        setToast({ message: "分享已关闭", type: "info" });
      }
    } catch (error) {
      console.error("Failed to toggle share:", error);
      const message = error instanceof Error ? error.message : "分享操作失败";
      setShareError(message.includes("EADDRINUSE") ? "可用端口都被占用，请关闭占用程序后重试。" : message);
      setToast({ message: "分享开启失败", type: "error" });
    } finally {
      setShareBusy(false);
    }
  };

  useEffect(() => {
    if (!shared || !selectedDoc || shareBusy) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const html = await buildCurrentShareHtml();
          if (cancelled) return;
          if (!isElectron) {
            revokeWebShareUrl();
            const blob = new Blob([html], { type: "text/html;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            webShareUrlRef.current = url;
            webShareHtmlRef.current = html;
            setShareUrl(url);
            return;
          }
          const api = getElectronAPI();
          if (api?.updateShareHtml) await api.updateShareHtml(selectedDoc, html);
          else if (api?.startShare) await api.startShare(0, selectedDoc, html);
        } catch (e) {
          console.warn("refresh share failed", e);
        }
      })();
    }, 800);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [shared, selectedDoc, selectedNodeId, docStore, shareBusy, buildCurrentShareHtml, isElectron, revokeWebShareUrl]);

  const handleDownloadShareHtml = async () => {
    try {
      const html = webShareHtmlRef.current || await buildCurrentShareHtml();
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

  useEffect(() => {
    if (isElectron || !shared) return;
    revokeWebShareUrl();
    setShared(false);
  }, [selectedDoc, isElectron]);

  return {
    shared,
    setShared,
    shareBusy,
    shareError,
    shareUrl,
    handleToggleShare,
    handleDownloadShareHtml,
  };
}
