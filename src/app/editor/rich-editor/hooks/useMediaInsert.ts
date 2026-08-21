// @ts-nocheck — TipTap 多版本类型冲突（starter-kit 嵌套 @tiptap/core），运行时无问题
import React, { useRef, type MutableRefObject } from "react";
import {
  compressImageForEmbed,
  fileToDataUrl,
  MAX_ATTACHMENT_BYTES,
  MAX_VIDEO_BYTES,
} from "../../utils/html";
import type { ToastState } from "../types";

type Opts = {
  editorInstanceRef: MutableRefObject<any>;
  mountedRef: MutableRefObject<boolean>;
  applySavedSelection: (activeEditor?: any) => boolean;
  saveEditorSelection: () => unknown;
  cleanupPendingSlashRef: MutableRefObject<() => boolean>;
  setToast: (v: ToastState | null) => void;
};

export function useMediaInsert({
  editorInstanceRef, mountedRef, applySavedSelection, saveEditorSelection,
  cleanupPendingSlashRef, setToast,
}: Opts) {
  const imgInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
  const restoreEditorSelection = (activeEditor = editorInstanceRef.current) => applySavedSelection(activeEditor);
  const cleanupPendingSlash = () => cleanupPendingSlashRef.current();

  const insertImageFromFile = async (file?: File | null) => {
  const activeEditor = editorInstanceRef.current;
  if (!file || !activeEditor) return;
  try {
    const src = await compressImageForEmbed(file);
    if (!mountedRef.current || activeEditor.isDestroyed || editorInstanceRef.current !== activeEditor) return;
    cleanupPendingSlash();
    restoreEditorSelection(activeEditor);
    if (!activeEditor.chain().focus().setImage({ src, alt: file.name }).run()) throw new Error("图片插入失败");
    setToast({ message: "图片已插入", type: "success" });
  } catch (error) {
    console.error("Failed to insert image:", error);
    if (mountedRef.current) setToast({ message: error instanceof Error ? error.message : "图片插入失败", type: "error" });
  }
  };

  const insertVideoFromFile = async (file?: File | null) => {
  const activeEditor = editorInstanceRef.current;
  if (!file || !activeEditor) return;
  try {
    if (!file.type.startsWith("video/")) throw new Error("请选择视频文件");
    if (file.size > MAX_VIDEO_BYTES) throw new Error("视频不能超过 20MB");
    const src = await fileToDataUrl(file);
    if (!mountedRef.current || activeEditor.isDestroyed || editorInstanceRef.current !== activeEditor) return;
    cleanupPendingSlash();
    restoreEditorSelection(activeEditor);
    if (!activeEditor.chain().focus().insertContent({ type: "video", attrs: { src, controls: true } }).run()) throw new Error("视频插入失败");
    setToast({ message: "视频已插入", type: "success" });
  } catch (error) {
    console.error("Failed to insert video:", error);
    if (mountedRef.current) setToast({ message: error instanceof Error ? error.message : "视频插入失败", type: "error" });
  }
  };

  const insertAttachmentFromFile = async (file?: File | null) => {
  const activeEditor = editorInstanceRef.current;
  if (!file || !activeEditor) return;
  try {
    if (file.size > MAX_ATTACHMENT_BYTES) throw new Error("附件不能超过 10MB");
    const src = await fileToDataUrl(file);
    if (!mountedRef.current || activeEditor.isDestroyed || editorInstanceRef.current !== activeEditor) return;
    cleanupPendingSlash();
    restoreEditorSelection(activeEditor);
    if (!activeEditor.chain().focus().insertContent({
      type: "attachment",
      attrs: { src, fileName: file.name, fileSize: file.size, fileType: file.type || "application/octet-stream" },
    }).run()) throw new Error("附件插入失败");
    setToast({ message: "附件已插入", type: "success" });
  } catch (error) {
    console.error("Failed to insert attachment:", error);
    if (mountedRef.current) setToast({ message: error instanceof Error ? error.message : "附件插入失败", type: "error" });
  }
  };

  const openImagePicker = () => {
  saveEditorSelection();
  imgInputRef.current?.click();
  };

  const openVideoPicker = () => {
  saveEditorSelection();
  videoInputRef.current?.click();
  };

  const openAttachmentPicker = () => {
  saveEditorSelection();
  attachInputRef.current?.click();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  void insertImageFromFile(e.target.files?.[0]);
  e.target.value = "";
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  void insertVideoFromFile(e.target.files?.[0]);
  e.target.value = "";
  };

  return {
    imgInputRef, videoInputRef, attachInputRef,
    insertImageFromFile, insertVideoFromFile, insertAttachmentFromFile,
    openImagePicker, openVideoPicker, openAttachmentPicker,
    handleImageUpload, handleVideoUpload,
  };
}
