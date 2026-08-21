import type React from "react";

export type ToolbarPanel = null | "heading" | "font" | "size" | "align" | "fore" | "back" | "link" | "table";
export type SavedSelection = { from: number; to: number; anchorCell?: number; headCell?: number };
export type TableRowHandle = { top: number; left: number; width: number; index: number; row: HTMLTableRowElement };
export type TocHeading = { tag: string; text: string; id: string };
export type SlashMenuState = { top: number; left: number; maxHeight?: number };
export type SlashItem = { label: string; icon: React.ReactNode; action: () => void; kind?: "file" };
export type ToastState = { message: string; type: "success" | "error" | "info" };

export type RichEditorTiptapProps = {
  docName: string;
  nodeId: string;
  initialHtml?: string;
  onContentChange?: (html: string, text: string) => void;
  autoSaveEnabled?: boolean;
  lastSavedAt?: string | null;
  onAutoSaveChange?: (enabled: boolean) => void;
  fontSize?: string;
  lineHeight?: string;
  theme?: string;
};
