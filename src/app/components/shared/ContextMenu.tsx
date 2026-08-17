import React from "react";

/** 设计稿 42:108 下拉菜单统一样式 */
export function ContextMenuPanel({
  children,
  style,
  className = "",
  width = 158,
  menuRef,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  width?: number;
  menuRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={menuRef}
      className={`fixed z-50 bg-white border border-[#EBECF0] rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] p-[8px] flex flex-col gap-[4px] box-border ${className}`}
      style={{ width, ...style }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function ContextMenuItem({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-[8px] h-[32px] px-[12px] box-border rounded-[4px] cursor-pointer transition-colors text-[#131212] bg-transparent overflow-hidden min-w-0 ${
        danger
          ? "hover:bg-[#FFF1F0] hover:text-[#FF4D4F] active:bg-[#FFE4E1] active:text-[#FF4D4F]"
          : "hover:bg-[#F7F8FA] active:bg-[#EBECF0]"
      }`}
      onClick={onClick}
    >
      <div className="relative shrink-0 size-[16px] flex items-center justify-center [&>svg]:size-full [&>img]:size-full">
        {icon}
      </div>
      <p
        className="min-w-0 flex-1 m-0 text-[14px] leading-none font-normal font-['PingFang_SC:Regular',sans-serif] truncate"
        style={{ color: "inherit", fontFamily: "PingFang SC, sans-serif", fontWeight: 400 }}
        title={label}
      >
        {label}
      </p>
    </div>
  );
}

export function ContextMenuDivider() {
  return <div className="h-px bg-[#EBECF0] mx-0 my-[4px] shrink-0" />;
}
