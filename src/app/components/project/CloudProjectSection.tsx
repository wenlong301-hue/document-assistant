import React, { useEffect, useState } from "react";
import { ROLE_LABEL, type CloudProject, type CloudRole } from "@/app/cloud/api";
import type { CloudUser } from "@/app/shared/electron";
import { ProjectAddTile } from "./ProjectAddTile";

function formatTime(value?: number) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function CloudIcon() {
  return (
    <svg className="block size-[48px] text-[#8D8E99] group-hover:text-[#131212] transition-colors" viewBox="0 0 48 48" fill="none">
      <path
        d="M15.5 35.5h19a7 7 0 0 0 .9-13.94A10 10 0 0 0 16.4 20.1a7.8 7.8 0 0 0-.9 15.4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M20.5 24.5h9M20.5 28.5h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="block size-[14px]" viewBox="0 0 16 16" fill="none">
      <path
        d="M2.66663 4.11765H13.3333M5.99996 2H9.99996M10.3333 14H5.66663C4.93025 14 4.33329 13.3679 4.33329 12.5882L4.02889 4.85292C4.01311 4.45189 4.3159 4.11765 4.69498 4.11765H11.3049C11.684 4.11765 11.9868 4.45189 11.971 4.85292L11.6666 12.5882C11.6666 13.3679 11.0697 14 10.3333 14Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
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

  const sectionTitle =
    "m-0 text-[14px] font-medium leading-[20px] text-[#131212] font-['PingFang_SC:Medium',sans-serif]";
  const sectionMeta = "text-[12px] leading-[18px] text-[#8D8E99] font-['PingFang_SC:Regular',sans-serif]";
  const textBtn =
    "h-[32px] px-0 border-0 bg-transparent cursor-pointer text-[13px] leading-none text-[#8D8E99] " +
    "font-['PingFang_SC:Regular',sans-serif] whitespace-nowrap hover:text-[#131212] transition-colors " +
    "disabled:opacity-40 disabled:cursor-not-allowed";

  if (!user) {
    return (
      <section className="mb-[32px]">
        <div className="flex items-center justify-between gap-[16px] rounded-[12px] bg-[#F7F8FA] px-[16px] h-[56px]">
          <div className="flex items-baseline gap-[8px] min-w-0">
            <h2 className={`${sectionTitle} shrink-0`}>云端协同</h2>
            <span className={`${sectionMeta} truncate`}>登录后可与同事同时编辑，不需要同一 Wi-Fi</span>
          </div>
          <button
            type="button"
            data-cloud-login
            className="shrink-0 h-[32px] px-[16px] rounded-[6px] border border-solid border-[#EBECF0] bg-white
              text-[#131212] text-[14px] leading-none font-['PingFang_SC:Regular',sans-serif] whitespace-nowrap
              hover:bg-[#FFFFFF] hover:border-[#C0C4CC] active:bg-[#EBECF0] transition-colors cursor-pointer"
            onClick={onOpenAuth}
          >
            登录 / 注册
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-[32px]">
      <div className="flex flex-wrap items-center justify-between gap-x-[16px] gap-y-[4px] mb-[12px]">
        <div className="flex items-baseline gap-[8px] min-w-0">
          <h2 className={`${sectionTitle} shrink-0`}>云端协同</h2>
          <span
            data-cloud-user={user.name}
            className={`${sectionMeta} truncate`}
          >
            {user.name} · {projects.length} 个项目
          </span>
        </div>

        <div className="flex items-center gap-[16px] shrink-0">
          <button type="button" className={textBtn} disabled={!hasOpenDoc || busy} onClick={onUploadCurrent} title={hasOpenDoc ? "把当前打开的项目上传为云端项目" : "请先打开一个本地项目"}>
            上传当前项目
          </button>
          <button type="button" className={textBtn} onClick={onMembers}>
            成员
          </button>
          <button type="button" className={textBtn} onClick={onLogout}>
            退出登录
          </button>
        </div>
      </div>

      {!ready ? (
        <p className={`m-0 py-[8px] text-[13px] leading-[18px] text-[#8D8E99] font-['PingFang_SC:Regular',sans-serif]`}>加载中…</p>
      ) : query && filtered.length === 0 ? (
        <p className="m-0 py-[8px] text-[13px] leading-[18px] text-[#8D8E99] font-['PingFang_SC:Regular',sans-serif]">
          没有匹配的云端项目
        </p>
      ) : (
        <div className="flex flex-wrap content-start gap-[16px]">
          {filtered.map((project) => {
            const isActive = activeProjectId === project.id;
            const confirming = confirmId === project.id;
            return (
              <div
                key={project.id}
                data-cloud-project={project.id}
                title={project.name}
                className={`group relative shrink-0 w-[142px] h-[138px] box-border overflow-hidden rounded-[6px]
                  cursor-pointer transition-colors duration-150 ${isActive ? "bg-[#F7F8FA]" : "hover:bg-[#F7F8FA]"}`}
                onClick={() => onOpen(project)}
              >
                {project.role === "owner" && (
                  <button
                    type="button"
                    aria-label="删除云端项目"
                    className={`absolute top-[8px] right-[8px] size-[16px] z-10 flex items-center justify-center rounded-[4px]
                      border-0 p-0 bg-transparent cursor-pointer transition-colors
                      ${confirming ? "text-[#E53E3E] opacity-100" : "text-[#8D8E99] opacity-0 group-hover:opacity-100 hover:text-[#E53E3E]"}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirming) {
                        setConfirmId(null);
                        onDelete(project);
                      } else {
                        setConfirmId(project.id);
                      }
                    }}
                  >
                    <TrashIcon />
                  </button>
                )}

                <div className="absolute left-1/2 -translate-x-1/2 top-[22px] size-[48px] flex items-center justify-center">
                  <CloudIcon />
                </div>

                <p className="absolute left-[8px] top-[90px] w-[126px] h-[20px] m-0 text-center text-[14px] leading-[20px] font-normal text-[#131212] truncate">
                  {project.name}
                </p>
                <p
                  className={`absolute left-[8px] top-[112px] w-[126px] h-[14px] m-0 text-center text-[10px] leading-[14px] truncate ${
                    confirming ? "text-[#E53E3E]" : "text-[#8D8E99]"
                  }`}
                >
                  {confirming ? "再次点击删除" : `${ROLE_LABEL[project.role as CloudRole] || project.role} · ${formatTime(project.updatedAt)}`}
                </p>
              </div>
            );
          })}
          {!query && <ProjectAddTile label="新建云端项目" onClick={onCreate} />}
        </div>
      )}
    </section>
  );
}
