import React, { useEffect, useState } from "react";
import { ROLE_LABEL, type CloudMember, type CloudRole } from "@/app/cloud/api";

export function CloudMembersModal({
  open,
  members,
  loading,
  canManage,
  user,
  projectName,
  errorMessage,
  onInvite,
  onRemove,
  onClose,
}: {
  open: boolean;
  members: CloudMember[];
  loading?: boolean;
  canManage?: boolean;
  user?: { name?: string; email?: string; id?: string } | null;
  projectName?: string;
  errorMessage?: string;
  onInvite: (email: string, role: CloudRole) => Promise<boolean> | void;
  onRemove: (userId: string) => void;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CloudRole>("editor");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (open) {
      setEmail("");
      setRole("editor");
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    const next = email.trim();
    if (!next || inviting) return;
    setInviting(true);
    try {
      const ok = await onInvite(next, role);
      if (ok !== false) setEmail("");
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[16px] w-[520px] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#E0E0E0] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-[24px] pt-[18px]">
          <div className="flex flex-col">
            <p className="m-0 text-[16px] font-medium text-[#131212] leading-[24px] font-['PingFang_SC:Medium',sans-serif]">项目成员</p>
            {projectName && <p className="m-0 mt-[2px] text-[12px] text-[#8D8E99] leading-[18px]">{projectName}</p>}
          </div>
          <button
            type="button"
            className="size-[28px] flex items-center justify-center rounded-[6px] border-0 p-0 bg-transparent text-[#131212] hover:bg-[#EBECF0] transition-colors cursor-pointer outline-none"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.3333 2.66667L2.66667 13.3333M13.3333 13.3333L2.66667 2.66667" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        <div className="px-[24px] pt-[16px] pb-[24px] flex flex-col gap-[12px]">
          <div className="flex flex-col gap-[4px] max-h-[300px] overflow-auto">
            {loading && members.length === 0 && <p className="m-0 py-[12px] text-[13px] text-[#8D8E99]">加载中…</p>}
            {!loading && members.length === 0 && <p className="m-0 py-[12px] text-[13px] text-[#8D8E99]">暂无成员</p>}
            {members.map((member) => {
              const isSelf = !!user && (member.id === user.id || member.email === user.email);
              return (
                <div key={member.id} className="flex items-center gap-[10px] px-[8px] py-[8px] rounded-[8px] hover:bg-[#F7F8FA]">
                  <span
                    className="size-[28px] shrink-0 rounded-full flex items-center justify-center text-white text-[12px] font-medium"
                    style={{ background: member.color || "#134CFF" }}
                  >
                    {(member.name || "?").slice(0, 1)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="m-0 text-[13px] text-[#131212] truncate">
                      {member.name}{isSelf ? "（我）" : ""}
                    </p>
                    <p className="m-0 text-[11px] text-[#8D8E99] truncate">{member.email}</p>
                  </div>
                  <span className="shrink-0 h-[22px] px-[8px] rounded-full bg-[#F2F3F5] text-[11px] text-[#5F6368] flex items-center">
                    {ROLE_LABEL[member.role] || member.role}
                  </span>
                  {canManage && member.role !== "owner" && (
                    <button
                      type="button"
                      className="shrink-0 h-[24px] px-[8px] rounded-[6px] border-0 bg-transparent text-[12px] text-[#E53E3E] cursor-pointer hover:bg-[#FEEDED]"
                      onClick={() => onRemove(member.id)}
                    >
                      移除
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {errorMessage && <p className="m-0 text-[12px] text-[#E53E3E]">{errorMessage}</p>}

          {canManage ? (
            <div className="flex items-center gap-[8px] pt-[4px]">
              <input
                className="flex-1 h-[36px] box-border px-[12px] rounded-[6px] border border-[#EBECF0] bg-white text-[13px] text-[#131212] outline-none focus:border-[#131212] placeholder:text-[#C0C4CC]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
                placeholder="输入对方注册邮箱"
              />
              <select
                className="h-[36px] px-[8px] rounded-[6px] border border-[#EBECF0] bg-white text-[12px] text-[#5F6368] outline-none"
                value={role}
                onChange={(e) => setRole(e.target.value as CloudRole)}
              >
                <option value="editor">可编辑</option>
                <option value="viewer">只读</option>
              </select>
              <button
                type="button"
                className="h-[36px] px-[14px] rounded-[6px] bg-[#131212] text-white text-[13px] border-0 cursor-pointer hover:opacity-90 disabled:opacity-60"
                disabled={!email.trim() || inviting}
                onClick={() => { void submit(); }}
              >
                邀请
              </button>
            </div>
          ) : (
            <p className="m-0 text-[11px] text-[#8D8E99] leading-[18px]">只有项目所有者可以邀请或移除成员。</p>
          )}
        </div>
      </div>
    </div>
  );
}
