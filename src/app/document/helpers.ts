/** 兼容入口：具体实现已拆到 lib/*，此处统一 re-export，避免改动调用方。 */
export {
  textToHtml,
  textToPlainTextHtml,
  markdownToSimpleHtml,
  sanitizeFileName,
} from "../editor/utils/html";

export {
  WEB_STORAGE_KEY,
  WEB_STORAGE_DB,
  WEB_STORAGE_STORE,
  WEB_STORAGE_STATE_ID,
  openWebStoreDb,
  readWebState,
  writeWebState,
} from "./lib/webStorage";

export {
  normalizeOutlineNode,
  normalizeContentMap,
  normalizeMdocDocuments,
  createOutlineNode,
  isHtmlContentEmpty,
  isNodePreviewable,
  getFirstPreviewableNode,
  resolvePreviewNodeId,
  buildEmptyOutlineTree,
  buildOutlineTree,
  createStoredDoc,
  normalizeStoredDoc,
  importMarkdownAsStoredDoc,
  importHtmlAsStoredDoc,
  flattenOutlineNodes,
  outlineExpandedIconPath,
  outlineCollapsedIconPath,
  countDescendants,
  buildDeleteMessage,
  findNode,
  findNodeDepth,
  findDisplayNodeForFile,
} from "./lib/docModel";

export {
  buildPreviewSections,
  hydratePreviewSections,
  buildPreviewHtmlAsync,
  buildPreviewHtml,
} from "./lib/previewHtml";

export {
  cleanExportHtml,
  headingsToWordParagraphs,
  wordHtmlDocument,
  pdfPrintHtmlDocument,
} from "./lib/exportHtml";

export {
  buildFolderWritePayload,
} from "./lib/folderWritePayload";
export type {
  OpenFileInfo,
  FolderWriteMode,
  FolderWritePayloadResult,
} from "./lib/folderWritePayload";

export { messageForSaveMode } from "./lib/saveFeedback";
export {
  storedDocFromMarkdown,
  storedDocFromHtml,
  storedDocFromPlainText,
  storedDocFromDocx,
} from "./lib/importFile";
