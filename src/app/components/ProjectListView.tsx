import React, { useState, useRef, useEffect, useCallback } from "react";
import type { Project } from "../document/types";

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;

const getDropdownPosition = (anchor: DOMRect, width = 160, height = 132) => {
  const margin = 8;
  const preferredLeft = anchor.right - width;
  const preferredTop = anchor.bottom + 4;
  return {
    left: Math.max(margin, Math.min(preferredLeft, window.innerWidth - width - margin)),
    top: Math.max(margin, Math.min(preferredTop, window.innerHeight - height - margin)),
  };
};

// ===== SVG Icons (from Figma) =====
function EmptyStateIllustration() {
  return (
    <img src={assetUrl("empty-state.png")} alt="" className="w-[280px] h-[210px] object-contain" />
  );
}
function LogoIcon() {
  return <img src={assetUrl("icons/logo.svg")} alt="" className="size-[26px]" />;
}

function FolderIconActive() {
  return <img src={assetUrl("icons/folder-icon-active.svg")} alt="" className="w-[52px] h-[48px]" />;
}

function FolderIconDefault() {
  return <img src={assetUrl("icons/folder-icon.svg")} alt="" className="w-[52px] h-[48px]" />;
}

function FileProjectIcon({ className = "w-[52px] h-[52px]" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 18C14 13.5817 17.5817 10 22 10H38.1863C40.308 10 42.3429 10.8429 43.8431 12.3431L51.6569 20.1569C53.1571 21.6571 54 23.692 54 25.8137V50C54 54.4183 50.4183 58 46 58H22C17.5817 58 14 54.4183 14 50V18Z" fill="url(#fileProjectIconGradient)" />
      <path d="M22 27.5C22 26.6716 22.6716 26 23.5 26H36.5C37.3284 26 38 26.6716 38 27.5C38 28.3284 37.3284 29 36.5 29H23.5C22.6716 29 22 28.3284 22 27.5Z" fill="white" />
      <path d="M22 37.5C22 36.6716 22.6716 36 23.5 36H42.5C43.3284 36 44 36.6716 44 37.5C44 38.3284 43.3284 39 42.5 39H23.5C22.6716 39 22 38.3284 22 37.5Z" fill="white" />
      <defs>
        <linearGradient id="fileProjectIconGradient" x1="34" y1="58" x2="34" y2="10" gradientUnits="userSpaceOnUse">
          <stop stopColor="#131212" />
          <stop offset="1" stopColor="#535353" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function MoreIcon() {
  return <img src={assetUrl("icons/more-icon.svg")} alt="" className="size-[16px]" />;
}

function MoreIconActive() {
  return (
    <svg className="size-[16px]" viewBox="0 0 16 16" fill="none">
      <path d="M5.49991 8C5.49991 8.69036 4.94027 9.25 4.24991 9.25C3.55955 9.25 2.99991 8.69036 2.99991 8C2.99991 7.30964 3.55955 6.75 4.24991 6.75C4.94027 6.75 5.49991 7.30964 5.49991 8Z" fill="#131212"/>
      <path d="M9.24992 8C9.24992 8.69035 8.69027 9.25 7.99992 9.25C7.30956 9.25 6.74991 8.69035 6.74991 8C6.74991 7.30964 7.30956 6.75 7.99992 6.75C8.69027 6.75 9.24992 7.30964 9.24992 8Z" fill="#131212"/>
      <path d="M12.9999 8C12.9999 8.69035 12.4403 9.25 11.7499 9.25C11.0596 9.25 10.4999 8.69035 10.4999 8C10.4999 7.30964 11.0596 6.75 11.7499 6.75C12.4403 6.75 12.9999 7.30964 12.9999 8Z" fill="#131212"/>
    </svg>
  );
}

function FolderPlusIcon() {
  return <img src={assetUrl("icons/folder-plus.svg")} alt="" className="size-[16px]" />;
}

function SearchIcon() {
  return <img src={assetUrl("icons/search.svg")} alt="" className="size-[16px] shrink-0" />;
}

function MenuIcon() {
  return <img src={assetUrl("icons/menu-icon.svg")} alt="" className="size-[16px]" />;
}

function GridIcon() {
  return <img src={assetUrl("icons/grid-icon.svg")} alt="" className="size-[16px]" />;
}

function PlusIcon() {
  return <img src={assetUrl("icons/plus.svg")} alt="" className="size-[16px]" />;
}

function FolderOpenIcon() {
  return <img src={assetUrl("icons/folder-open.svg")} alt="" className="size-[16px]" />;
}

function SmallFolderIcon() {
  return <img src={assetUrl("icons/folder-icon.svg")} alt="" className="size-[16px] shrink-0" />;
}

// ===== Project Grid Card =====
function ProjectGridCard({
  project,
  isSelected,
  onClick,
  onNewFile,
  onOpenLocation,
  onRemove,
}: {
  project: Project;
  isSelected: boolean;
  onClick: () => void;
  onNewFile: () => void;
  onOpenLocation: () => void;
  onRemove: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isMoreHovered, setIsMoreHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const showMore = isHovered || isSelected;

  return (
    <div
      className={`relative flex flex-col items-center rounded-[8px] cursor-pointer transition-all duration-150 ${
        isSelected ? "bg-[#F7F8FA]" : "bg-white hover:bg-[#f5f6f8]"
      }`}
      style={{ width: 142, height: 138, paddingTop: 22, paddingBottom: 12 }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* More button - top right */}
      <button
        className={`absolute top-[8px] right-[8px] size-[16px] flex items-center justify-center rounded-[4px] transition-all z-10 ${
          showMore
            ? isMoreHovered
              ? "bg-[#d5d6da] opacity-100"
              : "bg-transparent opacity-100"
            : "opacity-0 pointer-events-none"
        }`}
        ref={moreButtonRef}
        onClick={(e) => {
          e.stopPropagation();
          const anchor = moreButtonRef.current?.getBoundingClientRect();
          if (anchor) setMenuPosition(getDropdownPosition(anchor));
          setShowMenu(!showMenu);
        }}
        onMouseEnter={() => setIsMoreHovered(true)}
        onMouseLeave={() => setIsMoreHovered(false)}
      >
        {isMoreHovered ? <MoreIcon /> : <MoreIconActive />}
      </button>

      {/* Folder icon */}
      <div
        className="flex items-center justify-center shrink-0"
        style={{ paddingBottom: 20, paddingLeft: 8, paddingRight: 8 }}
      >
        {project.filePath ? <FileProjectIcon /> : isSelected ? <FolderIconActive /> : <FolderIconDefault />}
      </div>

      {/* Text content - path text 12px from bottom */}
      <div
        className="w-full flex flex-col items-center shrink-0"
        style={{ paddingLeft: 8, paddingRight: 8, gap: 2 }}
      >
        <p className="w-full text-center text-[14px] font-normal text-[#131212] truncate" style={{ lineHeight: '20px' }}>
          {project.name}
        </p>
        <p className="w-full text-center text-[10px] text-[#8D8E99] truncate" style={{ fontWeight: 300, lineHeight: '14px' }}>
          {project.filePath || project.folderPath || "本地项目"}
        </p>
      </div>

      {/* Dropdown menu */}
      {showMenu && (
        <div ref={menuRef} className="fixed z-50 w-[160px] bg-white border border-[#ebecf0] rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] p-[4px] flex flex-col gap-[4px]" style={menuPosition}>
          <div
            className="flex items-center gap-[8px] px-[12px] py-[6px] rounded-[4px] cursor-pointer hover:bg-[#f5f6f8] text-[#131212]"
            onClick={(e) => { e.stopPropagation(); setShowMenu(false); onNewFile(); }}
          >
            <div className="relative shrink-0 size-[16px]">
              <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 16 16">
                <path d="M8 3V13M3 8H13" stroke="#131212" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-[14px] whitespace-nowrap" style={{ color: "inherit" }}>新建文件</p>
          </div>
          <div
            className="flex items-center gap-[8px] px-[12px] py-[6px] rounded-[4px] cursor-pointer hover:bg-[#f5f6f8] text-[#131212]"
            onClick={(e) => { e.stopPropagation(); setShowMenu(false); onOpenLocation(); }}
          >
            <FolderOpenIcon />
            <p className="text-[14px] whitespace-nowrap" style={{ color: "inherit" }}>打开项目位置</p>
          </div>
          <div className="h-[1px] bg-[#EBECF0] my-[4px]" />
          <div
            className="flex items-center gap-[8px] px-[12px] py-[6px] rounded-[4px] cursor-pointer hover:bg-[#fff1f0] text-[#ff4d4f]"
            onClick={(e) => { e.stopPropagation(); setShowMenu(false); onRemove(); }}
          >
            <svg className="size-[16px]" viewBox="0 0 16 16" fill="none">
              <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" transform="rotate(45 8 8)" />
            </svg>
            <p className="text-[14px] whitespace-nowrap" style={{ color: "inherit" }}>移除项目</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Project List Row (matches Figma design) =====
function ProjectListRow({
  project,
  isSelected,
  onClick,
  onNewFile,
  onOpenLocation,
  onRemove,
}: {
  project: Project;
  isSelected: boolean;
  onClick: () => void;
  onNewFile: () => void;
  onOpenLocation: () => void;
  onRemove: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isMoreHovered, setIsMoreHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const showMore = isHovered || isSelected;

  return (
    <div
      className={`flex items-center self-stretch px-[12px] py-[8px] cursor-pointer transition-colors duration-150 rounded-[8px] ${
        isSelected ? "bg-[#F7F8FA]" : "hover:bg-[#f5f6f8]"
      }`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-[12px] flex-[3] min-w-0">
        <div className="flex items-center justify-center w-[24px] h-[24px] shrink-0">
          {project.filePath ? <FileProjectIcon className="w-[24px] h-[24px] shrink-0" /> : <img src={assetUrl("icons/folder-icon.svg")} alt="" className="w-[24px] h-[24px] shrink-0" />}
        </div>
        <span className="text-[14px] text-[#131212] truncate">{project.name}</span>
      </div>
      <div className="flex items-center flex-[2] min-w-0">
        <span className="text-[14px] text-[#8D8E99] truncate" style={{ fontWeight: 300 }}>
          {project.filePath || project.folderPath || "-"}
        </span>
      </div>
      <div className="relative shrink-0" ref={menuRef}>
        <button
          className={`size-[16px] flex items-center justify-center rounded-[4px] transition-all ${
            showMore
              ? isMoreHovered
                ? "bg-[#d5d6da] opacity-100"
                : "bg-transparent opacity-100"
              : "opacity-0 pointer-events-none"
          }`}
          ref={moreButtonRef}
          onClick={(e) => {
            e.stopPropagation();
            const anchor = moreButtonRef.current?.getBoundingClientRect();
            if (anchor) setMenuPosition(getDropdownPosition(anchor));
            setShowMenu(!showMenu);
          }}
          onMouseEnter={() => setIsMoreHovered(true)}
          onMouseLeave={() => setIsMoreHovered(false)}
        >
        {isMoreHovered ? <MoreIcon /> : <MoreIconActive />}
        </button>
        {showMenu && (
          <div className="fixed z-50 w-[160px] bg-white border border-[#ebecf0] rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] p-[4px] flex flex-col gap-[4px]" style={menuPosition}>
            <div
              className="flex items-center gap-[8px] px-[12px] py-[6px] rounded-[4px] cursor-pointer hover:bg-[#f5f6f8] text-[#131212]"
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); onNewFile(); }}
            >
              <div className="relative shrink-0 size-[16px]">
                <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 16 16">
                  <path d="M8 3V13M3 8H13" stroke="#131212" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-[14px] whitespace-nowrap" style={{ color: "inherit" }}>新建文件</p>
            </div>
            <div
              className="flex items-center gap-[8px] px-[12px] py-[6px] rounded-[4px] cursor-pointer hover:bg-[#f5f6f8] text-[#131212]"
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); onOpenLocation(); }}
            >
              <FolderOpenIcon />
              <p className="text-[14px] whitespace-nowrap" style={{ color: "inherit" }}>打开项目位置</p>
            </div>
            <div className="h-[1px] bg-[#EBECF0] my-[4px]" />
            <div
              className="flex items-center gap-[8px] px-[12px] py-[6px] rounded-[4px] cursor-pointer hover:bg-[#fff1f0] text-[#ff4d4f]"
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); onRemove(); }}
            >
              <svg className="size-[16px]" viewBox="0 0 16 16" fill="none">
                <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" transform="rotate(45 8 8)" />
              </svg>
              <p className="text-[14px] whitespace-nowrap" style={{ color: "inherit" }}>移除项目</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Add Project Modal =====
function AddProjectModal({
  open,
  onClose,
  onCreateProject,
  onImportFolder,
  onImportFolderDrop,
  isElectron,
}: {
  open: boolean;
  onClose: () => void;
  onCreateProject: (name: string, folderPath?: string) => void;
  onImportFolder: () => void;
  onImportFolderDrop: (folderPath: string) => void;
  isElectron: boolean;
}) {
  const [tab, setTab] = useState<"create" | "import">("create");
  const [projectName, setProjectName] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    if (open) {
      setProjectName("");
      setSelectedLocation("");
      setTab("create");
      setIsDragOver(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  if (!open) return null;

  const handleCreate = () => {
    if (projectName.trim()) {
      onCreateProject(projectName.trim(), selectedLocation || undefined);
      onClose();
    }
  };

  const handleImport = () => {
    onImportFolder();
    onClose();
  };

  const handleSelectLocation = async () => {
    if (!isElectron) return;
    const api = (window as any).electronAPI;
    if (api?.selectFolder) {
      try {
        const result = await api.selectFolder();
        if (!result?.canceled && result?.path) {
          setSelectedLocation(result.path);
        }
      } catch (error) {
        console.error("select folder failed:", error);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tab === "create") handleCreate();
    if (e.key === "Escape") onClose();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const path = files[0].path;
      if (path) {
        onImportFolderDrop(path);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/36" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.16)] w-[400px] overflow-hidden">
        <div className="flex border-b border-[#EBECF0]">
          <button
            className={`flex-1 py-[12px] text-[14px] font-medium transition-colors ${
              tab === "create" ? "text-[#131212] border-b-2 border-[#131212]" : "text-[#8d8e99] hover:text-[#131212]"
            }`}
            onClick={() => setTab("create")}
          >
            新建
          </button>
          <button
            className={`flex-1 py-[12px] text-[14px] font-medium transition-colors ${
              tab === "import" ? "text-[#131212] border-b-2 border-[#131212]" : "text-[#8d8e99] hover:text-[#131212]"
            }`}
            onClick={() => setTab("import")}
          >
            导入
          </button>
        </div>
        <div className="p-[24px]">
          {tab === "create" ? (
            <div className="flex flex-col gap-[16px]">
              <div>
                <p className="text-[14px] text-[#606266] mb-[8px]">输入项目名称</p>
                <input
                  ref={inputRef}
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入名称"
                  className="w-full h-[36px] px-[12px] border border-[#ececec] rounded-[8px] text-[14px] text-[#131212] outline-none focus:border-[#134CFF] transition-colors"
                />
              </div>
              <div>
                <p className="text-[14px] text-[#606266] mb-[8px]">项目存放位置</p>
                <div className="flex gap-[8px]">
                  <div className="flex-1 h-[36px] px-[12px] border border-[#ececec] rounded-[8px] text-[14px] text-[#131212] flex items-center truncate bg-[#f9f9f9]">
                    {selectedLocation ? (
                      <span className="truncate">{selectedLocation}</span>
                    ) : (
                      <span className="text-[#c0c4cc]">默认位置</span>
                    )}
                  </div>
                  <button
                    className={`h-[36px] px-[12px] border border-[#ececec] rounded-[8px] text-[14px] transition-colors shrink-0 ${
                      isElectron
                        ? "text-[#606266] hover:bg-[#f5f6f8]"
                        : "text-[#c0c4cc] cursor-not-allowed"
                    }`}
                    onClick={handleSelectLocation}
                    disabled={!isElectron}
                    title={isElectron ? "选择文件夹" : "仅桌面端可用"}
                  >
                    选择
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div
              className={`flex flex-col items-center justify-center py-[32px] rounded-[12px] border-2 border-dashed transition-colors cursor-pointer ${
                isDragOver
                  ? "border-[#134CFF] bg-[#134CFF]/5"
                  : "border-[#d0d1d6] hover:border-[#a0a1ab]"
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => isElectron && onImportFolder()}
            >
              <div className="mb-[16px]">
                <svg className="size-[48px] mx-auto" viewBox="0 0 48 48" fill="none">
                  <path d="M6 12C6 10.8954 6.89543 10 8 10H18L22 14H40C41.1046 14 42 14.8954 42 16V36C42 37.1046 41.1046 38 40 38H8C6.89543 38 6 37.1046 6 36V12Z" stroke="#d0d1d6" strokeWidth="2" strokeDasharray="4 2"/>
                  <path d="M18 24L24 30L30 24" stroke="#d0d1d6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M24 18V30" stroke="#d0d1d6" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-[14px] text-[#606266] mb-[4px]">
                {isDragOver ? "松开以导入" : "拖拽文件或文件夹到此处，或点击选择"}
              </p>
              <p className="text-[12px] text-[#8d8e99]">支持 .mdoc / .md / .txt / .html / .htm / .docx 或文件夹</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-[8px] px-[24px] pb-[20px]">
          <button
            className="h-[32px] px-[16px] rounded-[6px] border border-[#ececec] text-[14px] text-[#606266] hover:bg-[#f5f6f8] transition-colors"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="h-[32px] px-[16px] rounded-[6px] bg-black text-white text-[14px] hover:bg-[#333] transition-colors disabled:opacity-50"
            onClick={tab === "create" ? handleCreate : handleImport}
            disabled={tab === "create" && !projectName.trim()}
          >
            {tab === "create" ? "确定" : "选择"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Project List View =====
export function ProjectListView({
  projects,
  viewMode,
  searchQuery,
  isElectron,
  onSelectProject,
  onCreateProject,
  onImportFolder,
  onImportFolderDrop,
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
  onImportFolder: () => void;
  onImportFolderDrop: (folderPath: string) => void;
  onDeleteProject: (project: Project) => void;
  onRenameProject: (project: Project, newName: string) => void;
  onViewModeChange: (mode: "grid" | "list") => void;
  onSearchChange: (query: string) => void;
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewFile = useCallback((project: Project) => {
    if (!project.filePath && project.folderPath && isElectron) {
      (window as any).electronAPI?.createFileInFolder(project.folderPath, "新建文件");
    }
  }, [isElectron]);

  const handleOpenLocation = useCallback((project: Project) => {
    const location = project.filePath || project.folderPath;
    if (location && isElectron) {
      (window as any).electronAPI?.openFolderLocation(location);
    }
  }, [isElectron]);

  return (
    <div className="absolute inset-0 bg-white flex flex-col">
      {/* Top Bar - matches Figma: 66px height, #F7F8FA bg */}
      <div className="h-[66px] flex items-center justify-between px-[20px] shrink-0 bg-[#F7F8FA]">
        <div className="flex items-center gap-[6px]">
          <LogoIcon />
          <span className="text-[18px] font-semibold text-[#131212]" style={{ fontFamily: "'Alimama_FangYuanTi_VF', sans-serif" }}>
            文档助手
          </span>
        </div>
        <div className="flex items-center gap-[12px]">
          {/* Add button - supports both folders/projects and standalone files. */}
          <button
            className="h-[32px] px-[12px] bg-[#131212] text-white rounded-[6px] flex items-center gap-[8px] text-[14px] hover:bg-[#333] transition-colors"
            onClick={() => setShowAddModal(true)}
          >
            <FolderPlusIcon />
            <span>添加</span>
          </button>
          {/* Search Input - 276x32, bordered */}
          <div className="relative w-[276px] h-[32px]">
            <div className="absolute left-[8px] top-1/2 -translate-y-1/2">
              <SearchIcon />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜索项目"
              className="w-full h-full pl-[32px] pr-[12px] bg-white border border-[#EBECF0] rounded-[8px] text-[14px] text-[#131212] outline-none focus:border-[#134CFF] transition-colors placeholder:text-[#C0C4CC]"
            />
          </div>
          {/* View Toggle - bordered container */}
          <div className="flex items-center p-[3px] border border-[#EBECF0] rounded-[8px] bg-white">
            <button
              className={`w-[24px] h-[24px] flex items-center justify-center rounded-[6px] transition-colors ${
                viewMode === "list" ? "bg-[#131212]" : "hover:bg-[#f5f6f8]"
              }`}
              onClick={() => onViewModeChange("list")}
            >
              <img src={assetUrl("icons/menu-icon.svg")} alt="" className={`size-[16px] ${viewMode === "list" ? "brightness-0 invert" : ""}`} />
            </button>
            <button
              className={`w-[24px] h-[24px] flex items-center justify-center rounded-[6px] transition-colors ${
                viewMode === "grid" ? "bg-[#131212]" : "hover:bg-[#f5f6f8]"
              }`}
              onClick={() => onViewModeChange("grid")}
            >
              <img src={assetUrl("icons/grid-icon.svg")} alt="" className={`size-[16px] ${viewMode === "grid" ? "" : "brightness-0"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto px-[20px] pt-[20px] pb-[20px]">
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <EmptyStateIllustration />
            <p className="text-[14px] text-[#8d8e99] mb-[16px]">当前没有内容，点击上方 <span className="font-semibold text-[#131212]">添加</span> 去选择本地文件、文件夹或新增一个项目吧</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="flex flex-wrap gap-[16px]">
            {filteredProjects.map((project) => (
              <ProjectGridCard
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
        ) : (
          <div className="flex flex-col bg-white">
            {/* Table Header */}
            <div className="flex items-center px-[12px] py-[11.5px] border-b border-[#EBECF0]">
              <div className="flex-[3] text-[12px] font-medium text-[#8D8E99] whitespace-nowrap">项目名称</div>
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
