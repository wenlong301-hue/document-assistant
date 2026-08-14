import menuSvg from "@/imports/Group10/svg-fl6vqvp3w7";

export function DocContextMenu({ position, onRename, onExport, onDelete }: {
  position: { x: number; y: number };
  onRename: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const menuItems = [
    {
      label: "重命名",
      icon: <path d={menuSvg.pb1c0600} stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />,
      action: onRename,
      danger: false,
    },
    {
      label: "导出HTML",
      icon: <path d={menuSvg.p3809f980} stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />,
      action: onExport,
      danger: false,
    },
    {
      label: "删除",
      icon: <path d={menuSvg.p1db5f00} stroke="#131212" strokeLinecap="round" strokeWidth="1.2" />,
      action: onDelete,
      danger: true,
    },
  ];
  return (
    <div className="doc-context-menu fixed z-50 w-[134px] bg-white border border-[#ebecf0] rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] p-[4px] flex flex-col gap-[4px]" style={{ left: position.x, top: position.y }}>
      {menuItems.map(({ label, icon, action, danger }) => (
        <div
          key={label}
          className={`flex items-center gap-[8px] px-[12px] py-[6px] rounded-[4px] cursor-pointer transition-colors ${danger ? "hover:bg-red-50 text-[#131212] hover:text-red-600" : "hover:bg-[#f5f6f8] text-[#131212]"}`}
          onClick={(e) => { e.stopPropagation(); action(); }}
        >
          <div className="relative shrink-0 size-[16px]">
            <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 16 16">{icon}</svg>
          </div>
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[14px] leading-[normal] whitespace-nowrap" style={{ color: "inherit" }}>{label}</p>
        </div>
      ))}
    </div>
  );
}
