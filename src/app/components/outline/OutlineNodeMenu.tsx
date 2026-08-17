import React, { useEffect, useRef, useState } from "react";
import outlineMenuSvg from "@/imports/Group10-1/svg-kvilwhz9cx";
import { ContextMenuItem, ContextMenuPanel } from "@/app/components/shared/ContextMenu";

export function OutlineNodeMenu({ nodeId, includeInPreview, position, onClose, onAddChild, onRename, onCopyLink, onTogglePreview, onExportHtml, onClone, onDelete }: {
  nodeId: string; includeInPreview: boolean; position: { x: number; y: number }; onClose: () => void;
  onAddChild: (id: string) => void; onRename: (id: string) => void; onCopyLink: (id: string) => void; onTogglePreview: (id: string) => void;
  onExportHtml: (id: string) => void; onClone: (id: string) => void; onDelete: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState(position);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      setMenuPosition(position);
      return;
    }
    const margin = 8;
    const rect = el.getBoundingClientRect();
    setMenuPosition({
      x: Math.max(margin, Math.min(position.x, window.innerWidth - rect.width - margin)),
      y: Math.max(margin, Math.min(position.y, window.innerHeight - rect.height - margin)),
    });
  }, [position]);

  const items = [
    {
      label: "添加子文档",
      icon: <path d="M8 3.2L8 12.8M12.8 8L3.2 8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />,
      action: () => { onAddChild(nodeId); onClose(); },
    },
    {
      label: "重命名",
      icon: <path d={outlineMenuSvg.pb1c0600} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />,
      action: () => { onRename(nodeId); onClose(); },
    },
    {
      label: "复制层级链接",
      icon: <path d="M6.00004 8.66659C6.28635 9.04936 6.65166 9.36598 7.07158 9.5953C7.4915 9.82462 7.95636 9.96137 8.43333 9.996C8.9103 10.0306 9.38839 9.96232 9.83386 9.79598C10.2793 9.62964 10.682 9.36912 11.0126 9.03279L12.9692 7.07618C13.5634 6.46098 13.8922 5.63681 13.8848 4.78141C13.8773 3.92602 13.5342 3.10796 12.9294 2.5032C12.3247 1.89843 11.5066 1.5553 10.6512 1.54785C9.79581 1.54041 8.97164 1.86925 8.35644 2.46338L7.23332 3.57997M10 7.33325C9.71373 6.95049 9.34842 6.63386 8.9285 6.40454C8.50858 6.17522 8.04372 6.03847 7.56675 6.00384C7.08978 5.96921 6.61169 6.03752 6.16622 6.20386C5.72075 6.3702 5.31809 6.63072 4.98746 6.96705L3.03085 8.92366C2.43672 9.53886 2.10788 10.363 2.11532 11.2184C2.12277 12.0738 2.4659 12.8919 3.07067 13.4966C3.67543 14.1014 4.49349 14.4445 5.34888 14.452C6.20428 14.4594 7.02845 14.1306 7.64365 13.5365L8.76024 12.4199" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />,
      action: () => { onCopyLink(nodeId); onClose(); },
    },
    {
      label: includeInPreview ? "预览时隐藏本层" : "预览时显示本层",
      icon: <path d="M10.8334 10.8333H5.16671C3.6019 10.8333 2.33337 9.5648 2.33337 8C2.33337 6.43519 3.6019 5.16666 5.16671 5.16666H10.8334M10.8334 10.8333C12.3982 10.8333 13.6667 9.5648 13.6667 8C13.6667 6.43519 12.3982 5.16666 10.8334 5.16666M10.8334 10.8333C9.26857 10.8333 8.00004 9.5648 8.00004 8C8.00004 6.43519 9.26857 5.16666 10.8334 5.16666" stroke="currentColor" strokeWidth="1.2" />,
      action: () => { onTogglePreview(nodeId); onClose(); },
    },
    {
      label: "导出HTML（含子文档）",
      icon: <path d={outlineMenuSvg.p3809f980} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />,
      action: () => { onExportHtml(nodeId); onClose(); },
    },
    {
      label: "克隆",
      icon: <path d="M13.3334 8.74999L13.3334 4.99995C13.3334 3.34309 11.9902 1.99994 10.3333 1.99995L6.58337 2M9.33338 14L4.83338 14C4.00495 14 3.33338 13.3284 3.33338 12.5L3.33337 6C3.33337 5.17157 4.00495 4.5 4.83337 4.5L9.33337 4.5C10.1618 4.5 10.8334 5.17157 10.8334 6L10.8334 12.5C10.8334 13.3284 10.1618 14 9.33338 14Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />,
      action: () => { onClone(nodeId); onClose(); },
    },
    {
      label: "删除", danger: true,
      icon: <path d={outlineMenuSvg.p1db5f00} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />,
      action: () => { onDelete(nodeId); onClose(); },
    },
  ];

  return (
    <ContextMenuPanel
      menuRef={ref}
      width={212}
      style={{ left: menuPosition.x, top: menuPosition.y }}
    >
      {items.map(({ label, danger, icon, action }) => (
        <ContextMenuItem
          key={label}
          danger={!!danger}
          label={label}
          icon={<svg className="block size-full" fill="none" viewBox="0 0 16 16">{icon}</svg>}
          onClick={action}
        />
      ))}
    </ContextMenuPanel>
  );
}
