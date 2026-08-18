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
  onOpenHelp,
  onOpenUpdate,
  updateVersion,
  onDeleteProject,
  onRenameProject,
  onViewModeChange,
  onSearchChange,
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
  onOpenHelp: () => void;
  onOpenUpdate?: () => void;
  updateVersion?: string;
  onDeleteProject: (project: Project) => void;
  onRenameProject: (project: Project, newName: string) => void;
  onViewModeChange: (mode: "grid" | "list") => void;
  onSearchChange: (query: string) => void;
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

  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      <div className="h-[66px] flex items-center justify-between px-[20px] py-[16px] shrink-0 bg-[#F7F8FA]">
        <div className="flex items-center gap-[6px]">
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
        <div className="flex items-center justify-end gap-[12px]">
          <button
            type="button"
            className="h-[32px] px-0 border-0 bg-transparent text-[#131212] flex items-center justify-center gap-[8px] text-[14px] leading-none hover:opacity-70 transition-opacity cursor-pointer outline-none appearance-none"
            onClick={onOpenHelp}
          >
            <HelpIcon />
            <span>帮助</span>
          </button>
          <button
            type="button"
            className="h-[32px] px-[12px] bg-[#131212] text-white rounded-[8px] flex items-center justify-center gap-[8px] text-[14px] leading-none hover:opacity-90 transition-opacity"
            onClick={() => setShowAddModal(true)}
          >
            <FolderPlusIcon />
            <span>添加项目</span>
          </button>
          <div className="relative w-[276px] h-[32px]">
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
          <div className="flex items-center gap-[4px] p-[3px] h-[32px] border border-solid border-[#EBECF0] rounded-[8px] bg-white box-border">
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
        </div>
      </div>

      <div className="flex-1 overflow-auto px-[20px] pt-[20px] pb-[20px]">
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <EmptyStateIllustration />
            <p className="text-[14px] text-[#8d8e99] mb-[16px]">
              当前没有内容，点击上方 <span className="font-semibold text-[#131212]">添加项目</span>{" "}
              去选择本地文件、文件夹或新增一个项目吧
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="flex flex-col gap-[16px]">
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

