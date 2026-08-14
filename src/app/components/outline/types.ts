export type DragState = { sourceId: string; isRootSource: boolean; overId: string } | null;

export type OutlineMenuHandlers = {
  menuState: { id: string; rect: { x: number; y: number } } | null;
  onMore: (id: string, rect: { x: number; y: number }) => void;
  onMenuClose: () => void;
  onAddChild: (id: string) => void;
  onRename: (id: string) => void;
  onCopyLink: (id: string) => void;
  onTogglePreview: (id: string) => void;
  onExportHtml: (id: string) => void;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
  getIncludeInPreview: (id: string) => boolean;
};
