import React, { useEffect, useRef, useState } from "react";
import type { CloudUser } from "@/app/shared/electron";
import { ContextMenuDivider, ContextMenuItem, ContextMenuPanel } from "@/app/components/shared/ContextMenu";
import { UserAvatar } from "@/app/components/shared/UserAvatar";
import { getDropdownPosition } from "./getDropdownPosition";

function LogoutIcon() {
  return (
    <svg className="size-[16px]" viewBox="0 0 16 16" fill="none">
      <path d="M6.4 2.4H3.6A1.2 1.2 0 0 0 2.4 3.6v8.8a1.2 1.2 0 0 0 1.2 1.2h2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M10.4 4.8 13.2 8l-2.8 3.2M13.2 8H6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 顶栏右上角账号区：未登录显示登录按钮，已登录显示头像与账号菜单 */
export function AccountMenu({
  user,
  onLogin,
  onLogout,
}: {
  user: CloudUser | null;
  onLogin: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || btnRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <button
        type="button"
        data-cloud-login
        className="h-[32px] px-[16px] rounded-[6px] border border-solid border-[#EBECF0] bg-white
          text-[#131212] text-[14px] leading-none font-['PingFang_SC:Regular',sans-serif] whitespace-nowrap
          hover:border-[#C0C4CC] hover:bg-[#F7F8FA] active:bg-[#EBECF0] transition-colors cursor-pointer"
        onClick={onLogin}
      >
        登录 / 注册
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        data-cloud-user={user.name}
        aria-label={`账号：${user.name}`}
        title={user.name}
        className={`h-[32px] pl-[2px] pr-[6px] rounded-[16px] border-0 flex items-center gap-[6px] cursor-pointer
          transition-colors outline-none ${open ? "bg-[#EBECF0]" : "bg-transparent hover:bg-[#EBECF0]"}`}
        onClick={(e) => {
          e.stopPropagation();
          const rect = btnRef.current?.getBoundingClientRect();
          if (rect) setPos(getDropdownPosition(rect, 200, 96));
          setOpen((v) => !v);
        }}
      >
        <UserAvatar name={user.name} color={user.color} size={28} />
        <svg className="size-[12px] text-[#8D8E99]" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M4.4 6.2 8 9.8l3.6-3.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ContextMenuPanel menuRef={menuRef} style={pos} width={200}>
          <div className="px-[12px] py-[6px] flex items-center gap-[8px] min-w-0">
            <UserAvatar name={user.name} color={user.color} size={24} />
            <div className="min-w-0">
              <p className="m-0 text-[13px] leading-[18px] text-[#131212] truncate font-['PingFang_SC:Regular',sans-serif]">{user.name}</p>
              <p className="m-0 text-[11px] leading-[16px] text-[#8D8E99] truncate font-['PingFang_SC:Regular',sans-serif]">{user.email}</p>
            </div>
          </div>
          <ContextMenuDivider />
          <ContextMenuItem
            icon={<LogoutIcon />}
            label="退出登录"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onLogout();
            }}
          />
        </ContextMenuPanel>
      )}
    </div>
  );
}
