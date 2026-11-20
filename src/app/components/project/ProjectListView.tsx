import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { Project } from "@/app/document/types";
import { assetUrl } from "@/app/shared/utils/assetUrl";
import { ProjectGridCard } from "./ProjectGridCard";
import { ProjectListRow } from "./ProjectListRow";
import { AddProjectModal } from "./AddProjectModal";
import { EmptyStateIllustration } from "./icons/EmptyStateIllustration";
import { LogoIcon } from "./icons/LogoIcon";
import { FolderPlusIcon } from "./icons/FolderPlusIcon";
import { SearchIcon } from "./icons/SearchIcon";
import { getElectronAPI } from "@/app/shared/electron";
import type { CloudUser } from "@/app/shared/electron";
import type { CloudProject } from "@/app/cloud/api";
import { ProjectAddTile } from "./ProjectAddTile";
import { AccountMenu } from "./AccountMenu";
import { CloudProjectCard } from "./cloud/CloudProjectCard";
import { CloudProjectRow } from "./cloud/CloudProjectRow";

const FALLBACK_VERSION = "0.1.7";
type ProjectFilter = "all" | "local" | "cloud";

export function ProjectListView({
  projects,
  viewMode,
  searchQuery,
  isElectron,
  onSelectProject,
  onCreateProject,
  onImportFolder,
  onImportFolderDrop,
  onNewFileInFolder,
  onOpenCollab,
  collabActive,
  onOpenHelp,
  onOpenUpdate,
  updateVersion,
  onDeleteProject,
  onViewModeChange,
  onSearchChange,
  cloud,
}: {
  projects: Project[];
  viewMode: "grid" | "list";
  searchQuery: string;
  isElectron: boolean;
  onSelectProject: (project: Project) => void;
  onCreateProject: (name: string, folderPath?: string) => void;
  onImportFolder: (kind?: "file" | "folder") => void;
  onImportFolderDrop: (folderPath: string) => void;
  onNewFileInFolder: (folderPath: string) => void;
  onOpenCollab?: () => void;
  collabActive?: boolean;
  onOpenHelp: () => void;
  onOpenUpdate?: () => void;
  updateVersion?: string;
  onDeleteProject: (project: Project) => void;
  onRenameProject: (project: Project, newName: string) => void;
  onViewModeChange: (mode: "grid" | "list") => void;
  onSearchChange: (query: string) => void;
  cloud?: {
    available: boolean;
    ready?: boolean;
    user: CloudUser | null;
    projects: CloudProject[];
    busy?: boolean;
    activeProjectId?: string | null;
    onOpenAuth: () => void;
    onLogout: () => void;
    onCreate: () => void;
    onUploadCurrent: () => void;
    onOpen: (project: CloudProject) => void;
    onMembers: (project: CloudProject) => void;
    onDelete: (project: CloudProject) => void;
  };
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState(FALLBACK_VERSION);
  const [filter, setFilter] = useState<ProjectFilter>("all");

  useEffect(() => {
    const api = getElectronAPI();
    if (api?.getVersion) {
      api.getVersion().then((v: string) => v && setAppVersion(v)).catch(() => {});
    }
  }, []);

  const query = searchQuery.trim().toLowerCase();
  const cloudAvailable = !!cloud?.available;
  const cloudUser = cloud?.user ?? null;

  const localProjects = useMemo(
    () => projects.filter((p) => !query || p.name.toLowerCase().includes(query)),
    [projects, query]
  );
  const cloudProjects = useMemo(
    () => (cloud?.projects ?? []).filter((p) => !query || p.name.toLowerCase().includes(query)),
    [cloud?.projects, query]
  );

  const showLocal = filter !== "cloud";
  const showCloud = filter !== "local" && cloudAvailable;
  const itemCount = (showLocal ? localProjects.length : 0) + (showCloud ? cloudProjects.length : 0);

  const tabs: { key: ProjectFilter; label: string; count: number }[] = [
    { key: "all", label: "全部", count: projects.length + (cloud?.projects.length ?? 0) },
    { key: "local", label: "本机", count: projects.length },
    { key: "cloud", label: "云端", count: cloud?.projects.length ?? 0 },
  ];

  const handleNewFile = useCallback((project: Project) => {
    if (!project.filePath && project.folderPath && isElectron) {
      onNewFileInFolder(project.folderPath);
    }
  }, [isElectron, onNewFileInFolder]);

  const handleOpenLocation = useCallback((project: Project) => {
    const location = project.filePath || project.folderPath;
    if (location && isElectron) {
      getElectronAPI()?.openFolderLocation(location);
    }
  }, [isElectron]);

  const viewToggle = (
    <div className="flex items-center gap-[4px] p-[3px] h-[32px] border border-solid border-[#EBECF0] rounded-[8px] bg-white box-border shrink-0">
      <button
        type="button"
        className={`size-[24px] p-0 border-0 outline-none flex items-center justify-center rounded-[6px] transition-colors ${
          viewMode === "list" ? "bg-[#131212]" : "bg-transparent hover:bg-[#F7F8FA]"
        }`}
        onClick={() => onViewModeChange("list")}
        aria-label="列表视图"
      >
        <img
          src={assetUrl("icons/menu-icon.svg")}
          alt=""
          className={`size-[16px] block ${viewMode === "list" ? "brightness-0 invert" : ""}`}
        />
      </button>
      <button
        type="button"
        className={`size-[24px] p-0 border-0 outline-none flex items-center justify-center rounded-[6px] transition-colors ${
          viewMode === "grid" ? "bg-[#131212]" : "bg-transparent hover:bg-[#F7F8FA]"
        }`}
        onClick={() => onViewModeChange("grid")}
        aria-label="卡片视图"
      >
        <img
          src={assetUrl("icons/grid-icon.svg")}
          alt=""
          className={`size-[16px] block ${viewMode === "grid" ? "brightness-0 invert" : ""}`}
        />
      </button>
    </div>
  );

  const addTiles = (
    <div className="flex flex-wrap gap-[16px]">
      {showLocal && <ProjectAddTile label="添加项目" onClick={() => setShowAddModal(true)} />}
      {showCloud && cloudUser && <ProjectAddTile label="新建云端项目" onClick={() => cloud?.onCreate()} />}
    </div>
  );

  const loginPrompt = (
    <div className="flex flex-col items-center justify-center gap-[8px] py-[44px]">
      <p className="m-0 text-[14px] leading-[20px] text-[#131212] font-['PingFang_SC:Medium',sans-serif]">登录后使用云端协同</p>
      <p className="m-0 text-[13px] leading-[18px] text-[#8D8E99] font-['PingFang_SC:Regular',sans-serif]">
        文档保存在你的服务器上，多人可同时编辑，不需要同一 Wi-Fi
      </p>
      <button
        type="button"
        data-cloud-login
        className="mt-[8px] h-[32px] px-[16px] rounded-[6px] border-0 bg-[#131212] text-white text-[14px] leading-none
          font-['PingFang_SC:Regular',sans-serif] cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity"
        onClick={cloud?.onOpenAuth}
      >
        登录 / 注册
      </button>
    </div>
  );

  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <div className="h-[66px] flex items-center justify-between gap-[16px] px-[20px] py-[16px] shrink-0 bg-[#F7F8FA] border-b border-solid border-[#EBECF0]">
        <div className="flex items-center gap-[6px] shrink-0">
          <LogoIcon />
          <span
            className="text-[18px] font-semibold leading-normal text-[#131212] whitespace-nowrap"
            style={{ fontFamily: "'Alimama FangYuanTi VF', 'Alimama_FangYuanTi_VF', sans-serif" }}
          >
            文档助手
          </span>
          <span className="text-[10px] font-normal leading-normal text-[#8D8E99] whitespace-nowrap font-['PingFang_SC:Regular',sans-serif]">
            V{appVersion}
          </span>
          {updateVersion && onOpenUpdate && (
            <button
              type="button"
              className="h-[20px] px-[5px] rounded-[8px] bg-[#15803D] text-white text-[10px] font-normal leading-none hover:bg-[#166534] transition-colors"
              onClick={onOpenUpdate}
              title={`发现新版本 v${updateVersion}`}
            >
              发现新版本
            </button>
          )}
        </div>

        <div className="flex items-center justify-end gap-[12px] min-w-0">
          <div className="relative w-[240px] h-[32px] shrink-0">
            <div className="absolute left-[8px] top-[8px] size-[16px] pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索项目"
              className="w-full h-full pl-[32px] pr-[12px] bg-white border border-solid border-[#EBECF0] rounded-[8px] text-[14px] leading-[20px] text-[#131212] outline-none focus:border-[#131212] transition-colors placeholder:text-[#C0C4CC]"
            />
          </div>
          <button
            type="button"
            aria-label="协同编辑"
            title={collabActive ? "协同进行中" : "协同编辑"}
            className="relative size-[32px] shrink-0 rounded-[8px] border-0 bg-transparent flex items-center justify-center
              text-[#131212] hover:bg-[#EBECF0] active:bg-[#DDDEE3] transition-colors cursor-pointer outline-none"
            onClick={onOpenCollab}
          >
            <svg className="size-[16px]" viewBox="0 0 16 16" fill="none">
              <circle cx="6" cy="5.4" r="2.2" stroke="currentColor" strokeWidth="1.2" />
              <path d="M2.2 12.8c.3-1.9 1.8-3 3.8-3s3.5 1.1 3.8 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M10.7 3.6a2 2 0 0 1 0 3.8M11.4 9.8c1.3.3 2.2 1.3 2.5 2.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {collabActive && (
              <span className="absolute right-[6px] bottom-[6px] size-[6px] rounded-full bg-[#15803D] border border-white" />
            )}
          </button>
          <button
            type="button"
            aria-label="帮助"
            title="帮助"
            className="size-[32px] shrink-0 rounded-[8px] border-0 bg-transparent flex items-center justify-center
              text-[#131212] hover:bg-[#EBECF0] active:bg-[#DDDEE3] transition-colors cursor-pointer outline-none"
            onClick={onOpenHelp}
          >
            <svg className="size-[16px]" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
              <path d="M6.35 6.25a1.75 1.75 0 1 1 2.5 1.7c-.55.28-.85.65-.85 1.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <circle cx="8" cy="11.3" r="0.7" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            className="h-[32px] px-[12px] bg-[#131212] text-white rounded-[8px] flex items-center justify-center gap-[8px] text-[14px] leading-none hover:opacity-90 transition-opacity whitespace-nowrap"
            onClick={() => setShowAddModal(true)}
          >
            <FolderPlusIcon />
            <span>添加项目</span>
          </button>
          {cloudAvailable && (
            <AccountMenu user={cloudUser} onLogin={cloud?.onOpenAuth ?? (() => {})} onLogout={cloud?.onLogout ?? (() => {})} />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-[#F7F8FA]">
        <div className="mx-auto w-full max-w-[1040px] px-[20px] pt-[28px] pb-[32px]">
          <div className="mb-[20px]">
            <h1 className="m-0 text-[20px] font-medium leading-[28px] text-[#131212] font-['PingFang_SC:Medium',sans-serif]">项目</h1>
            <p className="m-0 mt-[4px] text-[13px] leading-[18px] text-[#8D8E99] font-['PingFang_SC:Regular',sans-serif]">
              {cloudAvailable ? "本地与云端文档统一管理" : "本地文档"}
            </p>
          </div>

          <section className="rounded-[12px] border border-solid border-[#EBECF0] bg-white overflow-hidden">
            <div className="flex items-center justify-between gap-[16px] h-[52px] px-[16px] border-b border-solid border-[#EBECF0]">
              {cloudAvailable ? (
                <div className="flex items-stretch h-full gap-[20px]">
                  {tabs.map((tab) => {
                    const active = filter === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        className={`relative h-full flex items-center gap-[6px] border-0 bg-transparent px-0 cursor-pointer text-[14px] leading-none
                          font-['PingFang_SC:Regular',sans-serif] transition-colors ${active ? "text-[#131212]" : "text-[#8D8E99] hover:text-[#131212]"}`}
                        onClick={() => setFilter(tab.key)}
                      >
                        <span className={active ? "font-medium" : ""}>{tab.label}</span>
                        <span className={`text-[12px] ${active ? "text-[#8D8E99]" : "text-[#C0C4CC]"}`}>{tab.count}</span>
                        {active && <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded-full bg-[#131212]" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-baseline gap-[8px]">
                  <h2 className="m-0 text-[14px] font-medium leading-[20px] text-[#131212] font-['PingFang_SC:Medium',sans-serif]">本地项目</h2>
                  <span className="text-[12px] leading-[18px] text-[#8D8E99] font-['PingFang_SC:Regular',sans-serif]">{localProjects.length} 个</span>
                </div>
              )}

              <div className="flex items-center gap-[12px] shrink-0">
                {cloudAvailable && cloudUser && filter !== "local" && (
                  <button
                    type="button"
                    className="h-[32px] px-0 border-0 bg-transparent cursor-pointer text-[13px] leading-none text-[#8D8E99]
                      font-['PingFang_SC,Regular',sans-serif] whitespace-nowrap hover:text-[#131212] transition-colors
                      disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={cloud?.busy}
                    onClick={() => cloud?.onUploadCurrent()}
                    title="把当前打开的本地项目上传为云端项目"
                  >
                    上传当前项目
                  </button>
                )}
                {viewToggle}
              </div>
            </div>

            <div className="p-[16px]">
              {itemCount === 0 ? (
                query ? (
                  <p className="m-0 py-[8px] text-[13px] leading-[18px] text-[#8D8E99] font-['PingFang_SC:Regular',sans-serif]">
                    没有匹配的项目
                  </p>
                ) : filter === "cloud" && !cloudUser ? (
                  loginPrompt
                ) : filter === "cloud" && !cloud?.ready ? (
                  <p className="m-0 py-[8px] text-[13px] leading-[18px] text-[#8D8E99] font-['PingFang_SC:Regular',sans-serif]">加载中…</p>
                ) : cloudAvailable ? (
                  addTiles
                ) : (
                  <div className="flex flex-col items-center justify-center py-[32px]">
                    <EmptyStateIllustration />
                    <p className="text-[14px] text-[#8d8e99] mb-[16px]">
                      当前没有内容，点击上方 <span className="font-semibold text-[#131212]">添加项目</span>{" "}
                      去选择本地文件、文件夹或新增一个项目吧
                    </p>
                  </div>
                )
              ) : viewMode === "grid" ? (
                <div className="flex flex-wrap content-start gap-[16px]">
                  {showLocal && localProjects.map((project) => (
                    <ProjectGridCard
                      key={`local-${project.id}`}
                      project={project}
                      isSelected={selectedId === `local-${project.id}`}
                      onClick={() => {
                        setSelectedId(`local-${project.id}`);
                        onSelectProject(project);
                      }}
                      onNewFile={() => handleNewFile(project)}
                      onOpenLocation={() => handleOpenLocation(project)}
                      onRemove={() => onDeleteProject(project)}
                    />
                  ))}
                  {showCloud && cloudProjects.map((project) => (
                    <CloudProjectCard
                      key={`cloud-${project.id}`}
                      project={project}
                      isSelected={selectedId === `cloud-${project.id}`}
                      onClick={() => {
                        setSelectedId(`cloud-${project.id}`);
                        cloud?.onOpen(project);
                      }}
                      onMembers={() => cloud?.onMembers(project)}
                      onDelete={() => cloud?.onDelete(project)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="flex items-center px-[12px] py-[11.5px] border-b border-[#EBECF0]">
                    <div className="flex-[3] text-[12px] font-medium text-[#8D8E99] whitespace-nowrap pl-[36px]">名称</div>
                    <div className="flex-[2] text-[12px] font-medium text-[#8D8E99] whitespace-nowrap">位置</div>
                    <div className="w-[16px] shrink-0" />
                  </div>
                  {showLocal && localProjects.map((project) => (
                    <ProjectListRow
                      key={`local-${project.id}`}
                      project={project}
                      isSelected={selectedId === `local-${project.id}`}
                      onClick={() => { setSelectedId(`local-${project.id}`); onSelectProject(project); }}
                      onNewFile={() => handleNewFile(project)}
                      onOpenLocation={() => handleOpenLocation(project)}
                      onRemove={() => onDeleteProject(project)}
                    />
                  ))}
                  {showCloud && cloudProjects.map((project) => (
                    <CloudProjectRow
                      key={`cloud-${project.id}`}
                      project={project}
                      isSelected={selectedId === `cloud-${project.id}`}
                      onClick={() => { setSelectedId(`cloud-${project.id}`); cloud?.onOpen(project); }}
                      onMembers={() => cloud?.onMembers(project)}
                      onDelete={() => cloud?.onDelete(project)}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <AddProjectModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreateProject={onCreateProject}
        onImportFolder={onImportFolder}
        onImportFolderDrop={onImportFolderDrop}
        isElectron={isElectron}
      />
    </div>
  );
}
