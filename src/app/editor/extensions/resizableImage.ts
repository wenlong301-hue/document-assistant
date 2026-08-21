// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import { mergeAttributes, ResizableNodeView } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { fitImageSize, imageRatioLockedRef, syncContainerToImage } from "../utils/image";

export const ResizableImage = Image.extend({
  addNodeView() {
    if (!this.options.resize || !this.options.resize.enabled || typeof document === "undefined") {
      return null;
    }
    const { directions, minWidth, minHeight } = this.options.resize;
    return ({ node, getPos, HTMLAttributes, editor }) => {
      const el = document.createElement("img");
      el.draggable = false;
      const mergedAttributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
      Object.entries(mergedAttributes).forEach(([key, value]) => {
        if (value != null && key !== "width" && key !== "height") {
          el.setAttribute(key, String(value));
        }
      });
      if (mergedAttributes.src != null) el.src = mergedAttributes.src;
      const attrW = Number(node.attrs.width);
      const attrH = Number(node.attrs.height);
      if (Number.isFinite(attrW) && attrW > 0) el.style.width = `${attrW}px`;
      if (Number.isFinite(attrH) && attrH > 0) el.style.height = `${attrH}px`;
      else if (Number.isFinite(attrW) && attrW > 0) el.style.height = "auto";

      const nodeView = new ResizableNodeView({
        element: el,
        editor,
        node,
        getPos,
        onResize: (width, height) => {
          const sized = fitImageSize(width, height, el.naturalWidth, el.naturalHeight, imageRatioLockedRef.current);
          el.style.width = `${sized.width}px`;
          el.style.height = imageRatioLockedRef.current ? "auto" : `${sized.height}px`;
          syncContainerToImage(nodeView.dom);
        },
        onCommit: (width, height) => {
          const pos = getPos();
          if (pos === undefined) return;
          const sized = fitImageSize(width, height, el.naturalWidth, el.naturalHeight, imageRatioLockedRef.current);
          const attrs = imageRatioLockedRef.current
            ? { width: sized.width, height: null as number | null }
            : { width: sized.width, height: sized.height };
          el.style.width = `${sized.width}px`;
          el.style.height = imageRatioLockedRef.current ? "auto" : `${sized.height}px`;
          syncContainerToImage(nodeView.dom);
          this.editor.chain().setNodeSelection(pos).updateAttributes(this.name, attrs).run();
        },
        onUpdate: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          const w = Number(updatedNode.attrs.width);
          const h = Number(updatedNode.attrs.height);
          if (Number.isFinite(w) && w > 0) {
            el.style.width = `${w}px`;
            el.style.height = Number.isFinite(h) && h > 0 ? `${h}px` : "auto";
          } else {
            el.style.width = "";
            el.style.height = "";
          }
          syncContainerToImage(nodeView.dom);
          return true;
        },
        options: {
          directions,
          min: { width: minWidth, height: minHeight },
          // Aspect lock is applied in onResize/onCommit via imageRatioLockedRef (dynamic).
          preserveAspectRatio: false,
        },
      });

      syncContainerToImage(nodeView.dom);

      const reveal = () => {
        nodeView.dom.style.visibility = "";
        nodeView.dom.style.pointerEvents = "";
        syncContainerToImage(nodeView.dom);
      };
      nodeView.dom.style.visibility = "hidden";
      nodeView.dom.style.pointerEvents = "none";
      if (el.complete && el.naturalWidth > 0) {
        reveal();
      } else {
        el.addEventListener("load", reveal, { once: true });
        el.addEventListener("error", reveal, { once: true });
      }
      return nodeView;
    };
  },
});
