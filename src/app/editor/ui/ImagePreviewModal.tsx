import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Toast } from "./Toast";

const MIN_SCALE = 0.25;
const MAX_SCALE = 5;
const SCALE_STEP = 0.25;

async function srcToBlob(src: string): Promise<Blob> {
  if (src.startsWith("data:")) {
    const res = await fetch(src);
    return res.blob();
  }
  const res = await fetch(src);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return res.blob();
}

async function blobToPng(src: string, blob: Blob): Promise<Blob> {
  const type = blob.type && blob.type.startsWith("image/") ? blob.type : "image/png";
  if (type === "image/png") return blob;
  return new Promise<Blob>((resolve, reject) => {
    const url = src.startsWith("data:") || src.startsWith("blob:") ? src : URL.createObjectURL(blob);
    const revoke = url !== src;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d");
      if (revoke) URL.revokeObjectURL(url);
      if (!ctx) {
        reject(new Error("canvas unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
    };
    img.onerror = () => {
      if (revoke) URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    img.src = url;
  });
}

async function copyImageToClipboard(src: string): Promise<void> {
  const blob = await srcToBlob(src);
  const png = await blobToPng(src, blob);
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("clipboard write unsupported");
  }
  await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
}

export function ImagePreviewModal({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [copying, setCopying] = useState(false);
  const draggingRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const clampScale = (v: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(v / SCALE_STEP) * SCALE_STEP));

  const zoomBy = useCallback((delta: number) => {
    setScale((s) => {
      const next = clampScale(s + delta);
      if (next <= 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const handleCopy = useCallback(async () => {
    if (copying) return;
    setCopying(true);
    try {
      await copyImageToClipboard(src);
      setToast({ message: "图片已复制到剪贴板", type: "success" });
    } catch (error) {
      console.error("copy image failed:", error);
      setToast({ message: "复制失败，请检查剪贴板权限", type: "error" });
    } finally {
      setCopying(false);
    }
  }, [copying, src]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomBy(SCALE_STEP);
      } else if (e.key === "-") {
        e.preventDefault();
        zoomBy(-SCALE_STEP);
      } else if (e.key === "0") {
        e.preventDefault();
        resetView();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();
        void handleCopy();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleCopy, onClose, resetView, zoomBy]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomBy(e.deltaY < 0 ? SCALE_STEP : -SCALE_STEP);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  const pct = Math.round(scale * 100);

  return createPortal(
    <div className="fixed inset-0 z-[450] flex flex-col" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative z-[1] flex items-center justify-between px-[24px] h-[56px] shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-white text-[16px] font-medium leading-[24px]">图片预览</p>
        <div className="flex items-center gap-[8px]">
          <button
            type="button"
            className="h-[32px] px-[12px] rounded-[6px] border border-solid border-white/30 bg-white/10 text-white text-[14px] font-normal leading-none cursor-pointer hover:bg-white/20 active:bg-white/30 transition-colors outline-none appearance-none inline-flex items-center justify-center"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            title="缩小"
            onClick={() => zoomBy(-SCALE_STEP)}
          >−</button>
          <button
            type="button"
            className="h-[32px] min-w-[56px] px-[8px] rounded-[6px] border border-solid border-white/30 bg-white/10 text-white text-[13px] font-normal leading-none cursor-pointer hover:bg-white/20 transition-colors outline-none appearance-none inline-flex items-center justify-center"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            title="重置缩放"
            onClick={resetView}
          >{pct}%</button>
          <button
            type="button"
            className="h-[32px] px-[12px] rounded-[6px] border border-solid border-white/30 bg-white/10 text-white text-[14px] font-normal leading-none cursor-pointer hover:bg-white/20 active:bg-white/30 transition-colors outline-none appearance-none inline-flex items-center justify-center"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            title="放大"
            onClick={() => zoomBy(SCALE_STEP)}
          >+</button>
          <div className="w-[1px] h-[20px] bg-white/20 mx-[4px]" />
          <button
            type="button"
            className="h-[32px] px-[16px] rounded-[6px] border-0 bg-white text-[#131212] text-[14px] font-normal leading-none cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity outline-none appearance-none inline-flex items-center justify-center disabled:opacity-50"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            disabled={copying}
            onClick={() => { void handleCopy(); }}
          >复制图片</button>
          <button
            type="button"
            className="size-[28px] flex items-center justify-center rounded-[6px] border-0 p-0 bg-transparent text-white hover:bg-white/15 active:bg-white/25 transition-colors cursor-pointer outline-none appearance-none"
            onClick={onClose}
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
      </div>
      <div
        ref={stageRef}
        className="relative z-[1] flex-1 min-h-0 flex items-center justify-center overflow-hidden cursor-default"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => {
          if (scale <= 1 || e.button !== 0) return;
          e.preventDefault();
          draggingRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
          const onMove = (ev: MouseEvent) => {
            const d = draggingRef.current;
            if (!d) return;
            setOffset({ x: d.ox + (ev.clientX - d.x), y: d.oy + (ev.clientY - d.y) });
          };
          const onUp = () => {
            draggingRef.current = null;
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
          };
          document.addEventListener("mousemove", onMove);
          document.addEventListener("mouseup", onUp);
        }}
      >
        <img
          src={src}
          alt="预览"
          draggable={false}
          className="max-w-[min(92vw,1200px)] max-h-[calc(100vh-120px)] object-contain select-none rounded-[8px] shadow-[0_16px_32px_-8px_rgba(0,0,0,0.35)]"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center center",
            cursor: scale > 1 ? "grab" : "default",
            transition: draggingRef.current ? "none" : "transform 120ms ease-out",
          }}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (scale === 1) zoomBy(1);
            else resetView();
          }}
        />
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} className="!z-[460]" />}
    </div>,
    document.body,
  );
}
