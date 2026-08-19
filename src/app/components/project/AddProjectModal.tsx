import React, { useEffect, useRef, useState } from "react";
import { getElectronAPI } from "@/app/shared/electron";

export function AddProjectModal({
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
  onImportFolder: (kind?: "file" | "folder") => void;
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

  const handleImport = (kind?: "file" | "folder") => {
    onImportFolder(kind);
    onClose();
  };

  const handleSelectLocation = async () => {
    if (!isElectron) return;
    const api = getElectronAPI();
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

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      const api = getElectronAPI();
      const path = api?.getPathForFile?.(files[0]) || (files[0] as File & { path?: string }).path;
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
                  className="w-full h-[36px] px-[12px] border border-solid border-[#EBECF0] rounded-[8px] bg-white text-[14px] text-[#131212] outline-none focus:border-[#131212] placeholder:text-[#C0C4CC] transition-colors"
                />
              </div>
              <div>
                <p className="text-[14px] text-[#606266] mb-[8px]">项目存放位置</p>
                <div className="flex gap-[8px]">
                  <div className="flex-1 h-[36px] px-[12px] border border-[#EBECF0] rounded-[8px] text-[14px] text-[#131212] flex items-center truncate bg-white">
                    {selectedLocation ? (
                      <span className="truncate">{selectedLocation}</span>
                    ) : (
                      <span className="text-[#C0C4CC]">默认位置</span>
                    )}
                  </div>
                  <button
                    className={`h-[36px] px-[12px] border border-[#EBECF0] rounded-[8px] bg-white text-[14px] transition-colors shrink-0 ${
                      isElectron
                        ? "text-[#131212] hover:bg-[#F7F8FA]"
                        : "text-[#C0C4CC] cursor-not-allowed"
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
              onClick={() => isElectron && handleImport("file")}
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
              <p className="text-[12px] text-[#8d8e99]">支持 .mdoc / .md / .txt / .html / .htm / .docx / .sql 或文件夹</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-[8px] px-[24px] pb-[20px]">
          <button
            className="h-[32px] px-[16px] rounded-[8px] border border-[#EBECF0] bg-white text-[14px] text-[#131212] hover:bg-[#F7F8FA] transition-colors"
            onClick={onClose}
          >
            取消
          </button>
          {tab === "create" ? (
            <button
              className="h-[32px] px-[16px] rounded-[8px] bg-[#131212] text-white text-[14px] hover:opacity-90 transition-opacity disabled:opacity-50"
              onClick={handleCreate}
              disabled={!projectName.trim()}
            >
              确定
            </button>
          ) : (
            <>
              <button
                className="h-[32px] px-[16px] rounded-[8px] border border-[#EBECF0] bg-white text-[#131212] text-[14px] hover:bg-[#F7F8FA] transition-colors disabled:opacity-50"
                onClick={() => handleImport("file")}
                disabled={!isElectron}
              >
                选择文件
              </button>
              <button
                className="h-[32px] px-[16px] rounded-[8px] bg-[#131212] text-white text-[14px] hover:opacity-90 transition-opacity disabled:opacity-50"
                onClick={() => handleImport("folder")}
                disabled={!isElectron}
              >
                选择文件夹
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

