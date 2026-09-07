import React from "react";
import { createPortal } from "react-dom";
import { fitImageSize, imageRatioLockedRef, syncContainerToImage } from "../utils/image";

export function EditorImageToolbar({
  selectedImgRect,
  editorVisibleRect,
  toolbarRef,
  imageCustomPct,
  setImageCustomPct,
  imageRatioLocked,
  setImageRatioLocked,
  imgBarSlider,
  applySelectedImageWidth,
  editorInstanceRef,
  selectedImagePosRef,
  setImgBarSlider,
  setSelectedImgRect,
  updateImageToolbar,
  onPreview,
}: {
  selectedImgRect: DOMRect;
  editorVisibleRect: DOMRect;
  toolbarRef: React.RefObject<HTMLDivElement | null>;
  imageCustomPct: string;
  setImageCustomPct: (value: string) => void;
  imageRatioLocked: boolean;
  setImageRatioLocked: React.Dispatch<React.SetStateAction<boolean>>;
  imgBarSlider: boolean;
  applySelectedImageWidth: (pct: number | "auto") => void;
  editorInstanceRef: React.MutableRefObject<any>;
  selectedImagePosRef: React.MutableRefObject<number | null>;
  setImgBarSlider: (value: boolean) => void;
  setSelectedImgRect: (rect: DOMRect) => void;
  updateImageToolbar: (activeEditor?: any) => void;
  onPreview?: () => void;
}) {
  const r = selectedImgRect;
  const editorR = editorVisibleRect;
  const barLeft = r.left + r.width / 2;
  const barTop = r.bottom + 8;
  if (barTop < editorR.top || barTop + 48 > editorR.bottom) return null;
  if (r.bottom < editorR.top || r.top > editorR.bottom) return null;
  const pctBtns = ["25", "50", "70", "100"] as const;
  const applyCustomPct = () => {
    const v = parseInt(imageCustomPct, 10);
    if (v && v >= 5 && v <= 100) applySelectedImageWidth(v);
    setImageCustomPct("");
  };
  return createPortal(
    <div
      className="img-resize-bar fixed z-[280] bg-white border border-[#ebecf0] rounded-[12px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] px-[10px] py-[6px] flex items-center gap-[6px]"
      style={{ left: barLeft, top: Math.max(barTop, (toolbarRef.current?.getBoundingClientRect().bottom ?? 0) + 8), transform: "translateX(-50%)" }}
      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <span className="px-[4px] text-[13px] text-[#8d8e99] whitespace-nowrap select-none" style={{ fontFamily: "PingFang SC, sans-serif" }}>宽度</span>
      {pctBtns.map((pct) => (
        <button
          key={pct}
          type="button"
          className="h-[32px] min-w-[40px] px-[8px] rounded-[6px] border border-[#ebecf0] text-[13px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors whitespace-nowrap bg-white"
          style={{ fontFamily: "PingFang SC, sans-serif" }}
          onClick={(e) => { e.stopPropagation(); applySelectedImageWidth(Number(pct)); }}
        >{pct}%</button>
      ))}
      <button
        type="button"
        className="h-[32px] min-w-[32px] px-[8px] rounded-[6px] border border-[#ebecf0] text-[13px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] whitespace-nowrap bg-white"
        style={{ fontFamily: "PingFang SC, sans-serif" }}
        title="恢复原图大小"
        onClick={(e) => { e.stopPropagation(); applySelectedImageWidth("auto"); }}
      >原</button>
      <button
        type="button"
        className={`size-[32px] rounded-[6px] border border-[#ebecf0] flex items-center justify-center cursor-pointer transition-colors bg-white ${imageRatioLocked ? "bg-[#f0f3ff] border-[#c9d5ff]" : "hover:bg-[#f5f6f8]"}`}
        title={imageRatioLocked ? "锁定缩放比例（已开）" : "锁定缩放比例（已关）"}
        onClick={(e) => { e.stopPropagation(); setImageRatioLocked((v) => !v); }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13.3334 6.52874V2.66667H9.47109M13.3334 2.66667L8.82737 7.17242M2.66675 9.47127V13.3333H6.52907M2.66675 13.3333L7.17279 8.82759" stroke={imageRatioLocked ? "#134CFF" : "#131212"} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="w-[1px] h-[20px] bg-[#ebecf0] mx-[2px]" />
      <div className="flex items-center gap-[4px]">
        <input
          className="w-[40px] h-[32px] rounded-[6px] border border-solid border-[#ebecf0] text-[13px] text-[#131212] text-center outline-none focus:border-[#131212] bg-white"
          style={{ fontFamily: "PingFang SC, sans-serif" }}
          placeholder="%"
          value={imageCustomPct}
          onChange={(e) => setImageCustomPct(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyCustomPct();
            }
          }}
          onBlur={() => { if (imageCustomPct) applyCustomPct(); }}
          onMouseDown={(e) => e.stopPropagation()}
          title="自定义缩放比例"
        />
        <span className="text-[13px] text-[#8d8e99] select-none" style={{ fontFamily: "PingFang SC, sans-serif" }}>%</span>
      </div>
      <div className="w-[1px] h-[20px] bg-[#ebecf0] mx-[2px]" />
      <button
        type="button"
        className="h-[32px] min-w-[40px] px-[8px] rounded-[6px] border border-[#ebecf0] text-[13px] text-[#131212] cursor-pointer hover:bg-[#f5f6f8] transition-colors whitespace-nowrap bg-white"
        style={{ fontFamily: "PingFang SC, sans-serif" }}
        title="预览图片"
        onClick={(e) => { e.stopPropagation(); onPreview?.(); }}
      >预览</button>
      <div className="w-[1px] h-[20px] bg-[#ebecf0] mx-[2px]" />
      <div
        className={`size-[32px] rounded-[6px] border border-[#ebecf0] flex items-center justify-center cursor-ew-resize bg-white hover:bg-[#f5f6f8] ${imgBarSlider ? "bg-[#f5f6f8]" : ""}`}
        title="等比缩放（拖拽调整宽度）"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const activeEditor = editorInstanceRef.current;
          const pos = selectedImagePosRef.current;
          if (!activeEditor || pos == null) return;
          const node = activeEditor.state.doc.nodeAt(pos);
          if (!node || node.type.name !== "image") return;
          const dom = activeEditor.view.nodeDOM(pos) as HTMLElement | null;
          const img = (dom?.tagName === "IMG" ? dom : dom?.querySelector("img")) as HTMLImageElement | null;
          if (!img) return;
          setImgBarSlider(true);
          const startX = e.clientX;
          const startW = img.offsetWidth || Number(node.attrs.width) || 100;
          const parentW = activeEditor.view.dom.clientWidth || 1;
          const naturalW = img.naturalWidth || startW;
          const naturalH = img.naturalHeight || startW;
          const onMove = (ev: MouseEvent) => {
            const dx = ev.clientX - startX;
            const nextW = Math.max(48, Math.min(parentW, Math.round(startW + dx)));
            const locked = imageRatioLockedRef.current;
            const sized = fitImageSize(nextW, nextW * (naturalH / Math.max(1, naturalW)), naturalW, naturalH, locked);
            img.style.width = `${sized.width}px`;
            img.style.height = locked ? "auto" : `${sized.height}px`;
            img.style.maxWidth = "none";
            syncContainerToImage(dom);
            setSelectedImgRect(img.getBoundingClientRect());
          };
          const onUp = () => {
            setImgBarSlider(false);
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
            const finalW = Math.max(48, Math.round(img.offsetWidth));
            const locked = imageRatioLockedRef.current;
            const sized = fitImageSize(finalW, img.offsetHeight, naturalW, naturalH, locked);
            syncContainerToImage(dom);
            activeEditor.chain().setNodeSelection(pos).updateAttributes("image", {
              width: sized.width,
              height: locked ? null : sized.height,
            }).run();
            window.requestAnimationFrame(() => {
              syncContainerToImage(activeEditor.view.nodeDOM(pos) as HTMLElement | null);
              updateImageToolbar(activeEditor);
            });
          };
          document.addEventListener("mousemove", onMove);
          document.addEventListener("mouseup", onUp);
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3.57541 1.60001C2.48447 1.60001 1.6001 2.48438 1.6001 3.57531M9.42232 1.60001H6.57787M14.4001 3.57532C14.4001 2.48438 13.5157 1.60001 12.4248 1.60001M1.6001 6.57778V9.42223M14.4001 9.42223V6.57778M1.6001 12.4247C1.6001 13.5156 2.48447 14.4 3.57541 14.4M12.4248 14.4C13.5157 14.4 14.4001 13.5156 14.4001 12.4247M6.57787 14.4H9.42232M1.6001 8.00001H6.57787C7.36335 8.00001 8.0001 8.63676 8.0001 9.42223V14.4H3.73343C2.55522 14.4 1.6001 13.4449 1.6001 12.2667V8.00001Z" stroke="#131212" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>
    </div>,
    document.body,
  );
}
