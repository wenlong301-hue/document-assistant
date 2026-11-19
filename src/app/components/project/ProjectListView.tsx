import React, { useCallback, useEffect, useState } from "react";
import type { Project } from "@/app/document/types";
import { assetUrl } from "@/app/shared/utils/assetUrl";
import { ProjectGridCard } from "./ProjectGridCard";
import { ProjectListRow } from "./ProjectListRow";
import { AddProjectModal } from "./AddProjectModal";
import { EmptyStateIllustration } from "./icons/EmptyStateIllustration";
import { LogoIcon } from "./icons/LogoIcon";
import { FolderPlusIcon } from "./icons/FolderPlusIcon";
import { HelpIcon } from "./icons/HelpIcon";
import { SearchIcon } from "./icons/SearchIcon";
import { getElectronAPI } from "@/app/shared/electron";
import type { CloudUser } from "@/app/shared/electron";
import type { CloudProject } from "@/app/cloud/api";
import { CloudProjectSection } from "./CloudProjectSection";
import { ProjectAddTile } from "./ProjectAddTile";
import { AccountMenu } from "./AccountMenu";

const FALLBACK_VERSION = "0.1.7";

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
  onRenameProject,
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

  useEffect(() => {
    const api = getElectronAPI();
    if (api?.getVersion) {
      api.getVersion().then((v: string) => v && setAppVersion(v)).catch(() => {});
    }
  }, []);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <div className="h-[66px] flex items-center justify-between gap-[16px] px-[20px] py-[16px] shrink-0 bg-[#F7F8FA]">
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
            className={`h-[32px] px-0 border-0 bg-transparent flex items-center justify-center text-[14px] leading-none hover:opacity-70 transition-opacity cursor-pointer outline-none appearance-none whitespace-nowrap ${collabActive ? "text-[#15803D]" : "text-[#131212]"}`}
            onClick={onOpenCollab}
          >
            协同
          </button>
          <button
            type="button"
            className="h-[32px] px-0 border-0 bg-transparent text-[#131212] flex items-center justify-center gap-[8px] text-[14px] leading-none hover:opacity-70 transition-opacity cursor-pointer outline-none appearance-none whitespace-nowrap"
            onClick={onOpenHelp}
          >
            <HelpIcon />
            <span>帮助</span>
          </button>
          <button
            type="button"
            className="h-[32px] px-[12px] bg-[#131212] text-white rounded-[8px] flex items-center justify-center gap-[8px] text-[14px] leading-none hover:opacity-90 transition-opacity whitespace-nowrap"
            onClick={() => setShowAddModal(true)}
          >
            <FolderPlusIcon />
            <span>添加项目</span>
          </button>
          {cloud?.available && (
            <AccountMenu
              user={cloud.user}
              onLogin={cloud.onOpenAuth}
              onLogout={cloud.onLogout}
            />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-[1200px] px-[20px] pt-[24px] pb-[24px]">
          <div className="flex items-center justify-between gap-[16px] mb-[12px]">
            <div className="flex items-baseline gap-[8px] min-w-0">
              <h2 className="m-0 text-[14px] font-medium leading-[20px] text-[#131212] font-['PingFang_SC:Medium',sans-serif] shrink-0">
                本地项目
              </h2>
              <span className="text-[12px] leading-[18px] text-[#8D8E99] font-['PingFang_SC:Regular',sans-serif]">
                {filteredProjects.length} 个
              </span>
            </div>
            {viewToggle}
          </div>

          {filteredProjects.length === 0 ? (
            cloud?.available ? (
              searchQuery.trim() ? (
                <p className="m-0 py-[8px] text-[13px] leading-[18px] text-[#8D8E99] font-['PingFang_SC:Regular',sans-serif]">
                  没有匹配的本地项目
                </p>
              ) : (
                <ProjectAddTile label="添加项目" onClick={() => setShowAddModal(true)} />
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <EmptyStateIllustration />
                <p className="text-[14px] text-[#8d8e99] mb-[16px]">
                  当前没有内容，点击上方 <span className="font-semibold text-[#131212]">添加项目</span>{" "}
                  去选择本地文件、文件夹或新增一个项目吧
                </p>
              </div>
            )
          ) : viewMode === "grid" ? (
            <div className="flex flex-wrap content-start gap-[16px]">
              {filteredProjects.map((project) => (
                <ProjectGridCard
                  key={project.id}
                  project={project}
                  isSelected={selectedId === project.id}
                  onClick={() => {
                    setSelectedId(project.id);
                    onSelectProject(project);
                  }}
                  onNewFile={() => handleNewFile(project)}
                  onOpenLocation={() => handleOpenLocation(project)}
                  onRemove={() => onDeleteProject(project)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col bg-white">
              {/* Table Header */}
              <div className="flex items-center px-[12px] py-[11.5px] border-b border-[#EBECF0]">
                <div className="flex-[3] text-[12px] font-medium text-[#8D8E99] whitespace-nowrap">文件/文件夹名称</div>
                <div className="flex-[2] text-[12px] font-medium text-[#8D8E99] whitespace-nowrap">文件位置</div>
                <div className="w-[16px] shrink-0" />
              </div>
              {/* List Rows */}
              {filteredProjects.map((project) => (
                <ProjectListRow
                  key={project.id}
                  project={project}
                  isSelected={selectedId === project.id}
                  onClick={() => { setSelectedId(project.id); onSelectProject(project); }}
                  onNewFile={() => handleNewFile(project)}
                  onOpenLocation={() => handleOpenLocation(project)}
                  onRemove={() => onDeleteProject(project)}
                />
              ))}
            </div>
          )}

          {cloud?.available && (
            <div className="mt-[32px]">
              <CloudProjectSection
                available={cloud.available}
                ready={cloud.ready}
                isLoggedIn={!!cloud.user}
                projects={cloud.projects}
                busy={cloud.busy}
                activeProjectId={cloud.activeProjectId}
                searchQuery={searchQuery}
                onUploadCurrent={cloud.onUploadCurrent}
                onCreate={cloud.onCreate}
                onOpen={cloud.onOpen}
                onMembers={cloud.onMembers}
                onDelete={cloud.onDelete}
              />
            </div>
          )}
        </div>
      </div>

      {/* Add Project Modal */}
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
