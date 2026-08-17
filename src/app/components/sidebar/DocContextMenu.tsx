import menuSvg from "@/imports/Group10/svg-fl6vqvp3w7";
import { ContextMenuItem, ContextMenuPanel } from "@/app/components/shared/ContextMenu";

export function DocContextMenu({ position, onRename, onExport, onDelete }: {
  position: { x: number; y: number };
  onRename: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const menuItems = [
    {
      label: "重命名",
      icon: <path d={menuSvg.pb1c0600} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />,
      action: onRename,
      danger: false,
    },
    {
      label: "导出HTML",
      icon: <path d={menuSvg.p3809f980} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />,
      action: onExport,
      danger: false,
    },
    {
      label: "删除",
      icon: <path d={menuSvg.p1db5f00} stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />,
      action: onDelete,
      danger: true,
    },
  ];
  return (
    <ContextMenuPanel className="doc-context-menu" width={134} style={{ left: position.x, top: position.y }}>
      {menuItems.map(({ label, icon, action, danger }) => (
        <ContextMenuItem
          key={label}
          danger={danger}
          label={label}
          icon={<svg className="block size-full" fill="none" viewBox="0 0 16 16">{icon}</svg>}
          onClick={(e) => {
            e.stopPropagation();
            action();
          }}
        />
      ))}
    </ContextMenuPanel>
  );
}
