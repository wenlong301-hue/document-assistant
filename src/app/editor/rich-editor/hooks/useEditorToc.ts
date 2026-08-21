// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { TocHeading } from "../types";

type Opts = {
  editor: any;
  nodeId: string;
  initialHtml: string;
  editorInstanceRef: MutableRefObject<any>;
};

export function useEditorToc({ editor, nodeId, initialHtml, editorInstanceRef }: Opts) {
  const [tocHeadings, setTocHeadings] = useState<TocHeading[]>([]);
  const [tocActiveId, setTocActiveId] = useState<string | null>(null);
  const tocListRef = useRef<HTMLDivElement>(null);
  const tocButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const tocScrollRafRef = useRef<number | null>(null);

  const ensureHeadingAnchors = useCallback((activeEditor: any) => {
  if (!activeEditor || activeEditor.isDestroyed) return false;
  const seenIds = new Set<string>();
  const safeNodeId = (nodeId || "document").replace(/[^a-zA-Z0-9_-]/g, "-");
  let transaction = activeEditor.state.tr;
  activeEditor.state.doc.descendants((node: any, pos: number) => {
    if (node.type.name !== "heading") return;
    const currentId = typeof node.attrs.id === "string" ? node.attrs.id.trim() : "";
    if (currentId && !seenIds.has(currentId)) {
      seenIds.add(currentId);
      return;
    }
    const randomPart = typeof crypto?.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const nextId = `heading-${safeNodeId}-${randomPart}`.replace(/[^a-zA-Z0-9_-]/g, "-");
    seenIds.add(nextId);
    transaction = transaction.setNodeMarkup(pos, undefined, { ...node.attrs, id: nextId }, node.marks);
  });
  if (!transaction.docChanged) return false;
  activeEditor.view.dispatch(transaction);
  return true;
  }, [nodeId]);

  const refreshToc = useCallback((activeEditor: any) => {
  if (!activeEditor || activeEditor.isDestroyed) return;
  const headings: TocHeading[] = [];
  activeEditor.state.doc.descendants((node: any) => {
    if (node.type.name !== "heading") return;
    const text = String(node.textContent || "").trim().slice(0, 50);
    const id = typeof node.attrs.id === "string" ? node.attrs.id : "";
    if (text && id) headings.push({ tag: `h${node.attrs.level || 1}`, text, id });
  });
  setTocHeadings(headings);
  setTocActiveId((current) => current && headings.some((heading) => heading.id === current) ? current : headings[0]?.id ?? null);
  }, []);

  const scrollToHeading = useCallback((headingId: string, behavior: ScrollBehavior = "smooth") => {
  const activeEditor = editorInstanceRef.current;
  if (!activeEditor || activeEditor.isDestroyed) return false;
  const scrollElement = activeEditor.view.dom as HTMLElement;
  const target = scrollElement.querySelector<HTMLElement>(`#${CSS.escape(headingId)}`);
  if (!target) return false;
  const containerRect = scrollElement.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const targetTop = Math.max(0, scrollElement.scrollTop + targetRect.top - containerRect.top - 20);
  scrollElement.scrollTo({ top: targetTop, behavior });
  setTocActiveId(headingId);
  return true;
  }, []);

  useEffect(() => {
  if (!editor || new URLSearchParams(window.location.search).get("node") !== nodeId || !window.location.hash) return;
  const anchorId = decodeURIComponent(window.location.hash.slice(1));
  const timer = window.setTimeout(() => { scrollToHeading(anchorId, "smooth"); }, 120);
  return () => window.clearTimeout(timer);
  }, [editor, nodeId, initialHtml, scrollToHeading, tocHeadings]);

  useEffect(() => {
  if (!editor) return;
  const scrollElement = editor.view.dom as HTMLElement;
  const updateActiveHeading = () => {
    tocScrollRafRef.current = null;
    const headings = Array.from(scrollElement.querySelectorAll<HTMLElement>("h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]"));
    if (headings.length === 0) {
      setTocActiveId(null);
      return;
    }
    const containerRect = scrollElement.getBoundingClientRect();
    const activationLine = containerRect.top + 36;
    let activeHeading = headings[0];
    headings.forEach((heading) => {
      if (heading.getBoundingClientRect().top <= activationLine) activeHeading = heading;
    });
    if (scrollElement.scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight - 4) {
      activeHeading = headings[headings.length - 1];
    }
    setTocActiveId(activeHeading.id);
  };
  const handleScroll = () => {
    if (tocScrollRafRef.current != null) return;
    tocScrollRafRef.current = window.requestAnimationFrame(updateActiveHeading);
  };
  scrollElement.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();
  return () => {
    scrollElement.removeEventListener("scroll", handleScroll);
    if (tocScrollRafRef.current != null) window.cancelAnimationFrame(tocScrollRafRef.current);
    tocScrollRafRef.current = null;
  };
  }, [editor, nodeId, tocHeadings]);

  useEffect(() => {
  if (!tocActiveId) return;
  const list = tocListRef.current;
  const button = tocButtonRefs.current.get(tocActiveId);
  if (!list || !button) return;
  const listRect = list.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  if (buttonRect.top < listRect.top) list.scrollTop -= listRect.top - buttonRect.top + 4;
  else if (buttonRect.bottom > listRect.bottom) list.scrollTop += buttonRect.bottom - listRect.bottom + 4;
  }, [tocActiveId]);

  return {
    tocHeadings, tocActiveId, tocListRef, tocButtonRefs, tocScrollRafRef,
    ensureHeadingAnchors, refreshToc, scrollToHeading,
  };
}
