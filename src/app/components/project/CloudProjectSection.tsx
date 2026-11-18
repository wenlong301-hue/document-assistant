import React, { useEffect, useState } from "react";
import { ROLE_LABEL, type CloudProject, type CloudRole } from "@/app/cloud/api";
import type { CloudUser } from "@/app/shared/electron";

function formatTime(value?: number) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function CloudProjectSection({
  available,
  ready,
  user,
  projects,
  busy,
  activeProjectId,
  hasOpenDoc,
  searchQuery,
  onOpenAuth,
  onLogout,
  onCreate,
  onUploadCurrent,
  onOpen,
  onMembers,
  onDelete,
}: {
  available: boolean;
  ready?: boolean;
  user: CloudUser | null;
  projects: CloudProject[];
  busy?: boolean;
  activeProjectId?: string | null;
  hasOpenDoc: boolean;
  searchQuery: string;
  onOpenAuth: () => void;
  onLogout: () => void;
  onCreate: () => void;
  onUploadCurrent: () => void;
  onOpen: (project: CloudProject) => void;
  onMembers: () => void;
  onDelete: (project: CloudProject) => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmId) return;
    const timer = window.setTimeout(() => setConfirmId(null), 3000);
    return () => window.clearTimeout(timer);
  }, [confirmId]);

  if (!available) return null;

  const query = searchQuery.trim().toLowerCase();
  const filtered = projects.filter((p) => !query || p.name.toLowerCase().includes(query));

  return (
    <div className="mb-[20px]">
      <div className="flex items-center justify-between gap-[12px] mb-[10px]">
        <div className="flex items-center gap-[8px]">
          <span className="size-[6px] rounded-full bg-[#2AB673]" />
          <p className="m-0 text-[13px] font-medium text-[#131212] font-['PingFang_SC:Medium',sans-serif]">云端协同</p>
          {user ? (
            <span data-cloud-user={user.name} className="text-[11px] text-[#8D8E99] font-['PingFang_SC:Regular',sans-serif]">
              已登录 · {user.name}
            </span>
          ) : (
            <span className="text-[11px] text-[#8D8E99] font-['PingFang_SC:Regular',sans-serif]">
              登录后可与同事实时协作，不需要同一 Wi-Fi
            </span>
          )}
        </div>

        <div className="flex items-center gap-[8px]">
          {user ? (
            <>
              <button
                type="button"
                className="h-[28px] px-[10px] rounded-[6px] border border-[#EBECF0] bg-white text-[12px] text-[#5F6368] cursor-pointer hover:border-[#C0C4CC] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!hasOpenDoc || busy}
                onClick={onUploadCurrent}
                title={hasOpenDoc ? "把当前打开的项目上传为云端项目" : "请先打开一个本地项目"}
              >
                上传当前项目
              </button>
              <button
                type="button"
                className="h-[28px] px-[10px] rounded-[6px] border border-[#EBECF0] bg-white text-[12px] text-[#5F6368] cursor-pointer hover:border-[#C0C4CC] disabled:opacity-50"
                disabled={busy}
                onClick={onCreate}
              >
                新建云端项目
              </button>
              <button
                type="button"
                className="h-[28px] px-[10px] rounded-[6px] border border-[#EBECF0] bg-white text-[12px] text-[#5F6368] cursor-pointer hover:border-[#C0C4CC]"
                onClick={onMembers}
              >
                成员
              </button>
              <button
                type="button"
                className="h-[28px] px-[10px] rounded-[6px] border-0 bg-transparent text-[12px] text-[#8D8E99] cursor-pointer hover:text-[#131212]"
                onClick={onLogout}
              >
                退出登录
              </button>
            </>
          ) : (
            <button
              type="button"
              className="h-[28px] px-[12px] rounded-[6px] bg-[#131212] text-white text-[12px] border-0 cursor-pointer hover:opacity-90"
              data-cloud-login
              onClick={onOpenAuth}
            >
              登录 / 注册
            </button>
          )}
        </div>
      </div>

      {!user ? (
        <div className="rounded-[10px] border border-dashed border-[#E0E0E0] bg-[#FAFBFC] px-[14px] py-[12px] text-[12px] text-[#8D8E99] font-['PingFang_SC:Regular',sans-serif]">
          云端项目会保存在你的服务器上，登录后即可多人同时编辑、断线重连自动合并。
        </div>
      ) : !ready ? (
        <div className="text-[12px] text-[#8D8E99]">加载中…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-[#E0E0E0] bg-[#FAFBFC] px-[14px] py-[12px] text-[12px] text-[#8D8E99] font-['PingFang_SC:Regular',sans-serif]">
          {query ? "没有匹配的云端项目" : "还没有云端项目：新建一个，或把当前打开的项目上传到云端。"}
        </div>
      ) : (
        <div className="flex flex-wrap gap-[12px]">
          {filtered.map((project) => {
            const isActive = activeProjectId === project.id;
            return (
              <div
                key={project.id}
                data-cloud-project={project.id}
                className={`group relative w-[238px] shrink-0 rounded-[10px] border bg-white px-[14px] py-[12px] cursor-pointer transition-colors ${
                  isActive ? "border-[#2AB673]" : "border-[#EBECF0] hover:border-[#C0C4CC]"
                }`}
                onClick={() => onOpen(project)}
              >
                <div className="flex items-center gap-[8px] min-w-0">
                  <span className="size-[8px] shrink-0 rounded-full bg-[#2AB673]" />
                  <p className="m-0 flex-1 min-w-0 truncate text-[14px] text-[#131212] font-['PingFang_SC:Medium',sans-serif]">
                    {project.name}
                  </p>
                  <span className="shrink-0 h-[20px] px-[7px] rounded-full bg-[#F2F3F5] text-[10px] text-[#5F6368] flex items-center">
                    {ROLE_LABEL[project.role as CloudRole] || project.role}
                  </span>
                </div>
                <div className="mt-[8px] flex items-center justify-between gap-[8px]">
                  <span className="text-[11px] text-[#8D8E99] font-['PingFang_SC:Regular',sans-serif]">
                    {formatTime(project.updatedAt)}
                  </span>
                  <div className="flex items-center gap-[4px] opacity-0 group-hover:opacity-100 transition-opacity">
                    {project.role === "owner" && (
                      <button
                        type="button"
                        className={`h-[22px] px-[7px] rounded-[4px] border-0 bg-transparent text-[11px] cursor-pointer hover:bg-[#F2F3F5] ${
                          confirmId === project.id ? "text-[#E53E3E] font-medium" : "text-[#8D8E99] hover:text-[#E53E3E]"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirmId === project.id) {
                            setConfirmId(null);
                            onDelete(project);
                          } else {
                            setConfirmId(project.id);
                          }
                        }}
                      >
                        {confirmId === project.id ? "确认删除" : "删除"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
