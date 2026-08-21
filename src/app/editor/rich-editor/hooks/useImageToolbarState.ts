// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { useCallback, useRef, useState, type MutableRefObject } from "react";
import { fitImageSize, imageRatioLockedRef, syncContainerToImage } from "../../utils/image";

type Opts = {
  editorInstanceRef: MutableRefObject<any>;
  toolbarRef: MutableRefObject<HTMLDivElement | null>;
};

export function useImageToolbarState({ editorInstanceRef, toolbarRef }: Opts) {
  const [selectedImgRect, setSelectedImgRect] = useState<DOMRect | null>(null);
  const [editorVisibleRect, setEditorVisibleRect] = useState<DOMRect | null>(null);
  const [imageRatioLocked, setImageRatioLocked] = useState(true);
  const [imageCustomPct, setImageCustomPct] = useState("");
  const [imgBarSlider, setImgBarSlider] = useState(false);
  const selectedImagePosRef = useRef<number | null>(null);
  imageRatioLockedRef.current = imageRatioLocked;

  const clearImageToolbar = useCallback(() => {
  selectedImagePosRef.current = null;
  setSelectedImgRect(null);
  setEditorVisibleRect(null);
  }, []);

  const updateImageToolbar = useCallback((activeEditor = editorInstanceRef.current) => {
  if (!activeEditor || activeEditor.isDestroyed || !activeEditor.isActive("image")) {
    clearImageToolbar();
    return;
  }
  const { from } = activeEditor.state.selection;
  let pos: number | null = null;
  const nodeAt = activeEditor.state.doc.nodeAt(from);
  if (nodeAt?.type?.name === "image") pos = from;
  else {
    const $from = activeEditor.state.selection.$from;
    for (let d = $from.depth; d >= 0; d--) {
      const n = $from.node(d);
      if (n.type.name === "image") {
        pos = $from.before(d);
        break;
      }
    }
    if (pos == null) {
      const maybe = activeEditor.state.selection as { node?: { type?: { name?: string } }; from: number };
      if (maybe.node?.type?.name === "image") pos = maybe.from;
    }
  }
  if (pos == null) {
    clearImageToolbar();
    return;
  }
  const dom = activeEditor.view.nodeDOM(pos) as HTMLElement | null;
  if (!dom) {
    clearImageToolbar();
    return;
  }
  const img = (dom.tagName === "IMG" ? dom : dom.querySelector("img")) as HTMLImageElement | null;
  const target = img ?? dom;
  const rect = target.getBoundingClientRect();
  const toolbarBottom = toolbarRef.current?.getBoundingClientRect().bottom ?? 120;
  if (rect.bottom + 56 < toolbarBottom || rect.top > window.innerHeight) {
    clearImageToolbar();
    return;
  }
  selectedImagePosRef.current = pos;
  setSelectedImgRect(rect);
  setEditorVisibleRect(activeEditor.view.dom.getBoundingClientRect());
  }, [clearImageToolbar]);

  const applySelectedImageWidth = useCallback((pct: number | "auto") => {
  const activeEditor = editorInstanceRef.current;
  const pos = selectedImagePosRef.current;
  if (!activeEditor || pos == null) return;
  const node = activeEditor.state.doc.nodeAt(pos);
  if (!node || node.type.name !== "image") return;
  const dom = activeEditor.view.nodeDOM(pos) as HTMLElement | null;
  const img = (dom?.tagName === "IMG" ? dom : dom?.querySelector("img")) as HTMLImageElement | null;
  if (pct === "auto") {
    if (img) {
      img.style.width = "";
      img.style.height = "";
      img.style.maxWidth = "";
    }
    syncContainerToImage(dom);
    activeEditor.chain().setNodeSelection(pos).updateAttributes("image", { width: null, height: null }).run();
  } else {
    const parentW = activeEditor.view.dom.clientWidth || 1;
    const width = Math.max(48, Math.round(parentW * Math.min(100, Math.max(5, pct)) / 100));
    const naturalW = img?.naturalWidth || Number(node.attrs.width) || width;
    const naturalH = img?.naturalHeight || Number(node.attrs.height) || width;
    const locked = imageRatioLockedRef.current;
    const sized = fitImageSize(width, width / (naturalW / Math.max(1, naturalH)), naturalW, naturalH, locked);
    if (img) {
      img.style.width = `${sized.width}px`;
      img.style.height = locked ? "auto" : `${sized.height}px`;
      img.style.maxWidth = "none";
    }
    syncContainerToImage(dom);
    activeEditor.chain().setNodeSelection(pos).updateAttributes("image", {
      width: sized.width,
      height: locked ? null : sized.height,
    }).run();
  }
  window.requestAnimationFrame(() => {
    syncContainerToImage(activeEditor.view.nodeDOM(pos) as HTMLElement | null);
    updateImageToolbar(activeEditor);
  });
  }, [updateImageToolbar]);

  return {
    selectedImgRect, setSelectedImgRect, editorVisibleRect,
    imageRatioLocked, setImageRatioLocked, imageCustomPct, setImageCustomPct,
    imgBarSlider, setImgBarSlider, selectedImagePosRef,
    clearImageToolbar, updateImageToolbar, applySelectedImageWidth,
  };
}
