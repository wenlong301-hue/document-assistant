import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from "react";
import type { DocStore, FolderFileItem, OutlineNode, Project, FolderTreeNode, WebPersistedState } from "@/app/document/types";
import { ProjectListView } from "@/app/components/project/ProjectListView";
import { FileTreeView } from "@/app/components/file-tree/FileTreeView";
import {
  findNode,
  findNodeDepth,
  isHtmlContentEmpty,
} from "@/app/document/helpers";
import { emptyParagraph } from "@/app/editor/utils/html";
import { Toast } from "@/app/editor/ui/Toast";
import { EditorWorkspace } from "@/app/document/EditorWorkspace";
import { DeleteConfirmModal } from "@/app/document/DeleteConfirmModal";
import { NewDocModal } from "@/app/document/NewDocModal";
import { CloseConfirmModal } from "@/app/document/CloseConfirmModal";
import { TopBar } from "@/app/components/layout/TopBar";
import { SidebarSearch } from "@/app/components/sidebar/SidebarSearch";
import { SidebarModeHeader } from "@/app/components/sidebar/SidebarModeHeader";
import { SidebarShareStatus } from "@/app/components/sidebar/SidebarShareStatus";
import { OutlineTree } from "@/app/components/outline/OutlineTree";
import { getElectronAPI, isElectronRuntime } from "@/app/shared/electron";
import { useAppUpdate } from "@/app/shared/hooks/useAppUpdate";
import { getDisplayFileName } from "@/app/shared/utils/text";
import { useDocPersistence } from "@/app/document/hooks/useDocPersistence";
import { useAppSettings } from "@/app/document/hooks/useAppSettings";
import { useShareSession } from "@/app/document/hooks/useShareSession";
import { useFolderDocuments } from "@/app/document/hooks/useFolderDocuments";
import { useProjectWorkspace } from "@/app/document/hooks/useProjectWorkspace";

const HelpModal = lazy(() => import("@/app/document/HelpModal").then((m) => ({ default: m.HelpModal })));
const SettingsModal = lazy(() => import("@/app/document/SettingsModal").then((m) => ({ default: m.SettingsModal })));
const UpdateModal = lazy(() => import("@/app/document/UpdateModal").then((m) => ({ default: m.UpdateModal })));
const ShareModal = lazy(() => import("@/app/document/ShareModal").then((m) => ({ default: m.ShareModal })));
const ExportModal = lazy(() => import("@/app/document/ExportModal").then((m) => ({ default: m.ExportModal })));
const UnsavedConfirmModal = lazy(() => import("@/app/document/UnsavedConfirmModal").then((m) => ({ default: m.UnsavedConfirmModal })));

export default function DocumentAssistant() {
  const [modal, setModal] = useState<{ type: "new" } | { type: "new-file" } | { type: "new-level" } | { type: "rename"; target: string } | null>(null);
  const [docDeleteConfirm, setDocDeleteConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showBackUnsavedConfirm, setShowBackUnsavedConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [outlineSearchEnter, setOutlineSearchEnter] = useState(0);
  const [mode, setMode] = useState<"document" | "outline">("document");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const isElectron = isElectronRuntime();

  const flushCurrentDocRef = useRef<() => Promise<boolean>>(async () => false);
  const persistWebStateNowRef = useRef<(state: WebPersistedState) => Promise<boolean>>(async () => false);
  const docsForSettingsRef = useRef<string[]>([]);
  const selectedDocForSettingsRef = useRef("");
  const docStoreForSettingsRef = useRef<DocStore>({});

  const {
    appSettings,
    setAppSettings,
    fontSize,
    lineHeight,
    theme,
    autoSaveEnabled,
    handleSaveSettings,
    handleAutoSaveChange,
  } = useAppSettings({
    isElectron,
    setToast,
    flushCurrentDocRef,
    persistWebStateNowRef,
    docsRef: docsForSettingsRef,
    selectedDocRef: selectedDocForSettingsRef,
    docStoreRef: docStoreForSettingsRef,
  });

  const {
    selectedDoc, setSelectedDoc,
    docs, setDocs,
    outlineNodes, setOutlineNodes,
    outlineTrees, setOutlineTrees,
    selectedNodeId, setSelectedNodeId,
    docStore, setDocStore,
    lastSavedAt, setLastSavedAt,
    saveTimersRef,
    editorContentRef,
    openFileInfoRef,
    dirtyOpenDocsRef,
    docStoreRef,
    selectedDocRef,
    selectedNodeIdRef,
    writeFolderDocBack,
    persistDoc,
    setAndPersistDoc,
    flushDoc,
    flushCurrentDoc,
    persistWebStateNow,
    getOutlineTree,
    getNodeContent,
    markSourceDirty,
    isOpenDocDirty,
    clearOpenDocDirty,
    updateOutlineTree,
    getDocChildCount,
  } = useDocPersistence({ isElectron, setToast, autoSaveEnabled, setMode });

  flushCurrentDocRef.current = flushCurrentDoc;
  persistWebStateNowRef.current = persistWebStateNow;
  docsForSettingsRef.current = docs;
  selectedDocForSettingsRef.current = selectedDoc;
  docStoreForSettingsRef.current = docStoreRef.current;

  const {
    updateInfo,
    showUpdateModal,
    setShowUpdateModal,
    updateDownloading,
    updateDownloaded,
    updateProgress,
    updateError,
    updateCheckBusy,
    handleCheckForUpdates,
    handleUpdateLater,
    handleOpenReleasePage,
    handleDownloadUpdate,
    handleInstallUpdate,
  } = useAppUpdate(isElectron, setToast, flushCurrentDoc);

  useEffect(() => {
    const handler = () => setModal({ type: "new" });
    document.addEventListener("opencode-new-doc", handler);
    return () => document.removeEventListener("opencode-new-doc", handler);
  }, []);

  useEffect(() => {
    if (!isElectron) return;
    const api = getElectronAPI();
    if (!api?.onRequestCloseWindow) return;
    const unsub = api.onRequestCloseWindow(() => {
      void api.ackCloseWindow?.();
      setShowCloseConfirm(true);
    });
    return () => unsub?.();
  }, [isElectron]);

  const handleCloseWindowChoice = useCallback(async (action: "tray" | "quit", remember: boolean) => {
    setShowCloseConfirm(false);
    await flushCurrentDoc();
    if (remember) setAppSettings((prev) => ({ ...prev, closeBehavior: action }));
    try {
      await getElectronAPI()?.respondCloseWindow?.({ action, remember });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "关闭应用失败", type: "error" });
    }
  }, [flushCurrentDoc, setAppSettings]);

  const handleCancelCloseWindow = useCallback(() => {
    setShowCloseConfirm(false);
    void getElectronAPI()?.respondCloseWindow?.({ action: "cancel" });
  }, []);

  const selectedProjectRef = useRef<Project | null>(null);
  const setFolderTreeRef = useRef<React.Dispatch<React.SetStateAction<FolderTreeNode[]>>>(() => {});
  const setSelectedFileNodeRef = useRef<React.Dispatch<React.SetStateAction<FolderTreeNode | null>>>(() => {});
  const openFolderFileRef = useRef<(file: FolderFileItem) => Promise<void>>(async () => {});
  const folderFilesRef = useRef<FolderFileItem[]>([]);

  const {
    activeFolder, setActiveFolder,
    folderFiles, setFolderFiles,
    importInputRef,
    handleImport,
    handleSelectDoc,
    openFolderFile,
    handleSave,
    handleSaveAsMdoc,
    handleRename,
    handleNewDoc,
    handleNewRootFile,
    handleTopBarDelete,
    handleSwitchMode,
    handleNodeContentChange,
  } = useFolderDocuments({
    isElectron,
    setToast,
    mode,
    setMode,
    selectedDoc,
    setSelectedDoc,
    docs,
    setDocs,
    outlineNodes,
    setOutlineNodes,
    outlineTrees,
    setOutlineTrees,
    selectedNodeId,
    setSelectedNodeId,
    docStore,
    setDocStore,
    docStoreRef,
    selectedDocRef,
    selectedNodeIdRef,
    editorContentRef,
    openFileInfoRef,
    dirtyOpenDocsRef,
    saveTimersRef,
    persistDoc,
    writeFolderDocBack,
    persistWebStateNow,
    getOutlineTree,
    getDocChildCount,
    clearOpenDocDirty,
    updateOutlineTree,
    setAndPersistDoc,
    markSourceDirty,
    setLastSavedAt,
    selectedProjectRef,
    setFolderTreeRef,
    setSelectedFileNodeRef,
    setDocDeleteConfirm,
  });

  openFolderFileRef.current = openFolderFile;
  folderFilesRef.current = folderFiles;

  const {
    level,
    projects,
    selectedProject,
    projectViewMode, setProjectViewMode,
    folderTree, setFolderTree,
    selectedFileNode, setSelectedFileNode,
    handleSelectProject,
    handleCreateProject,
    handleImportFolder,
    handleImportFolderDrop,
    handleFileSelect,
    handleNewFileInFolder,
    handleBackToProjects,
    handleBackSaveAndLeave,
    handleBackDiscardAndLeave,
    handleDeleteProject,
    handleRenameProject,
  } = useProjectWorkspace({
    isElectron,
    setToast,
    setMode,
    setSelectedDoc,
    setOutlineNodes,
    setSelectedNodeId,
    openFileInfoRef,
    dirtyOpenDocsRef,
    selectedDocRef,
    saveTimersRef,
    flushDoc,
    isOpenDocDirty,
    clearOpenDocDirty,
    setLastSavedAt,
    setShowBackUnsavedConfirm,
    setActiveFolder,
    setFolderFiles,
    folderFilesRef,
    openFolderFileRef,
  });

  selectedProjectRef.current = selectedProject;
  setFolderTreeRef.current = setFolderTree;
  setSelectedFileNodeRef.current = setSelectedFileNode;

  const shareDisabled = level === "project" && (!selectedFileNode || selectedFileNode.isDirectory);

  const {
    shared,
    shareBusy,
    shareError,
    shareUrl,
    handleToggleShare,
    handleDownloadShareHtml,
  } = useShareSession({
    isElectron,
    setToast,
    selectedDoc,
    selectedNodeId,
    docStore,
    outlineTrees,
    selectedDocRef,
    selectedNodeIdRef,
    docStoreRef,
    editorContentRef,
    getOutlineTree,
    shareDisabled,
  });

  const handleSearchEnter = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;
    if (mode === "document") {
      if (activeFolder) {
        const matches = folderFiles.filter(f => f.relPath.toLowerCase().includes(q));
        if (matches.length === 1) void openFolderFile(matches[0]);
      } else {
        const matches = docs.filter(d => d.toLowerCase().includes(q));
        if (matches.length === 1) handleSelectDoc(matches[0]);
      }
    } else {
      setOutlineSearchEnter(t => t + 1);
    }
  };

  const selectedNode = mode === "outline" ? findNode(outlineNodes, selectedNodeId) : null;
  const selectedNodeDepth = mode === "outline" ? findNodeDepth(outlineNodes, selectedNodeId) : 0;
  const workspaceDocName = mode === "document" && selectedFileNode?.name ? selectedFileNode.name : selectedDoc;
  const filePreviewHtml = mode === "document" && selectedDoc && selectedNodeId && !isHtmlContentEmpty(getNodeContent(selectedDoc, selectedNodeId))
    ? getNodeContent(selectedDoc, selectedNodeId)
    : "";

  const handleTitleChange = (name: string) => {
    if (mode === "outline" && selectedNode) {
      const renameInTree = (arr: OutlineNode[]): OutlineNode[] =>
        arr.map((node) => node.id === selectedNode.id ? { ...node, name } : { ...node, children: renameInTree(node.children) });
      updateOutlineTree(selectedDoc, renameInTree(outlineNodes));
      return;
    }
    if (selectedDoc && name !== selectedDoc) void handleRename(selectedDoc, name);
  };

  return (
    <div className="bg-[#f7f8fa] relative size-full overflow-hidden" data-name="首页-文档模式">
      {level === "projects" ? (
        <>
          <ProjectListView
            projects={projects}
            viewMode={projectViewMode}
            searchQuery={searchQuery}
            isElectron={!!isElectron}
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateProject}
            onImportFolder={handleImportFolder}
            onImportFolderDrop={handleImportFolderDrop}
            onNewFileInFolder={handleNewFileInFolder}
            onOpenHelp={() => setShowHelpModal(true)}
            onOpenUpdate={updateInfo ? () => setShowUpdateModal(true) : undefined}
            updateVersion={updateInfo?.version}
            onDeleteProject={handleDeleteProject}
            onRenameProject={handleRenameProject}
            onViewModeChange={setProjectViewMode}
            onSearchChange={setSearchQuery}
          />
          <Suspense fallback={null}>
            {showHelpModal && (
              <HelpModal
                onClose={() => setShowHelpModal(false)}
                onCheckUpdate={isElectron ? handleCheckForUpdates : undefined}
                updateCheckBusy={updateCheckBusy}
              />
            )}
            {showSettingsModal && (
              <SettingsModal
                open={showSettingsModal}
                onClose={() => setShowSettingsModal(false)}
                settings={appSettings}
                onSave={(s) => { void handleSaveSettings(s); }}
              />
            )}
            {updateInfo && showUpdateModal && (
              <UpdateModal
                info={updateInfo}
                downloading={updateDownloading}
                downloaded={updateDownloaded}
                progress={updateProgress}
                errorMessage={updateError}
                onLater={handleUpdateLater}
                onOpenRelease={handleOpenReleasePage}
                onDownload={handleDownloadUpdate}
                onInstall={() => { setShowCloseConfirm(false); void handleInstallUpdate(); }}
              />
            )}
          </Suspense>
          {showCloseConfirm && (
            <CloseConfirmModal
              onClose={handleCancelCloseWindow}
              onConfirm={handleCloseWindowChoice}
            />
          )}
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
      ) : (
        <>
          <EditorWorkspace docName={workspaceDocName} mode={mode} selectedNode={selectedNode} nodeDepth={selectedNodeDepth} nodeContent={selectedNode ? getNodeContent(selectedDoc, selectedNode.id) : emptyParagraph} previewHtml={filePreviewHtml} onTitleChange={handleTitleChange} theme={theme} fontSize={fontSize} lineHeight={lineHeight} sidebarWidth={276}
            onContentChange={handleNodeContentChange} autoSaveEnabled={autoSaveEnabled} lastSavedAt={lastSavedAt} onAutoSaveChange={(enabled) => handleAutoSaveChange(enabled, setLastSavedAt)} />
          <TopBar
            onOpenShare={() => {
              if (shareDisabled) {
                setToast({ message: "请选择文件后再分享", type: "info" });
                return;
              }
              setShowShareModal(true);
            }}
            onOpenExport={() => setShowExportModal(true)}
            onDelete={handleTopBarDelete}
            onImport={() => importInputRef.current?.click()}
            onSave={handleSave}
            onSaveAsMdoc={handleSaveAsMdoc}
            onOpenHelp={() => setShowHelpModal(true)}
            onOpenSettings={() => setShowSettingsModal(true)}
            level={level}
            projectName={selectedProject?.name || ""}
            onBack={handleBackToProjects}
            shareDisabled={shareDisabled}
            saveDisabled={!selectedDoc}
            saveAsDisabled={!selectedDoc}
          />
          <input ref={importInputRef} type="file" accept=".mdoc,.md,.txt,.html,.htm,.docx,.sql" className="hidden" onChange={handleImport} />
          <SidebarSearch value={searchQuery} onChange={setSearchQuery} mode={mode} onEnter={handleSearchEnter} />
          {mode === "outline" && selectedDoc && (
            <div className="absolute left-[20px] top-[170px] w-[274px] flex items-center gap-[8px] px-[8px] py-[9.5px]">
              <svg className="size-[16px] shrink-0" viewBox="0 0 16 16" fill="none">
                <path d="M10.0001 1.6001V4.0001C10.0001 4.44193 10.3583 4.8001 10.8001 4.8001H13.2001M12.0001 2.8001C11.6441 2.48153 11.2746 2.10368 11.0414 1.85828C10.8862 1.69499 10.6717 1.6001 10.4464 1.6001H4.39994C3.51629 1.6001 2.79995 2.31644 2.79994 3.20009L2.79988 12.8001C2.79988 13.6837 3.51622 14.4001 4.39987 14.4001L11.5999 14.4001C12.4835 14.4001 13.1999 13.6838 13.1999 12.8001L13.2001 4.31865C13.2001 4.11409 13.1221 3.91745 12.9801 3.77019C12.7176 3.49786 12.2792 3.04978 12.0001 2.8001Z" stroke="#8D8E99" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
              </svg>
              <span className="text-[12px] text-[#8D8E99] font-medium truncate">{getDisplayFileName(selectedDoc)}</span>
            </div>
          )}
          {mode === "document" ? (
            <FileTreeView
              nodes={folderTree}
              selectedPath={selectedFileNode?.path || null}
              onSelect={handleFileSelect}
              searchQuery={searchQuery}
              onNewFile={handleNewFileInFolder}
              onOpenLocation={(path) => getElectronAPI()?.openFolderLocation(path)}
            />
          ) : (
            <OutlineTree nodes={outlineNodes} selectedId={selectedNodeId} docName={selectedDoc} contentMap={docStore[selectedDoc]?.content ?? {}} onSelect={setSelectedNodeId} onUpdateNodes={(nodes) => updateOutlineTree(selectedDoc, nodes)} onToast={(message, type) => setToast({ message, type })} filter={searchQuery} enterTick={outlineSearchEnter} />
          )}
          <SidebarModeHeader onNewDoc={() => setModal({ type: "new-file" })} onNewFile={() => setModal({ type: "new-level" })} mode={mode} onSwitchMode={handleSwitchMode} />
          <SidebarShareStatus shared={shared} onClick={() => setShowShareModal(true)} />
      {docDeleteConfirm && (
        <DeleteConfirmModal
          message={docDeleteConfirm.message}
          onConfirm={docDeleteConfirm.onConfirm}
          onClose={() => setDocDeleteConfirm(null)}
        />
      )}
      <Suspense fallback={null}>
        {showExportModal && (
          <ExportModal docName={selectedDoc} content={selectedNode ? getNodeContent(selectedDoc, selectedNode.id) : editorContentRef.current.html} contentMap={docStore[selectedDoc]?.content ?? {}} outlineNodes={outlineNodes} selectedNodeId={selectedNodeId} isElectron={!!isElectron} onClose={() => setShowExportModal(false)} onToast={(message, type) => setToast({ message, type })} />
        )}
        {showShareModal && (
          <ShareModal
            shared={shared}
            mode={isElectron ? "electron" : "web"}
            loading={shareBusy}
            errorMessage={shareError}
            shareUrl={shareUrl}
            onToggle={handleToggleShare}
            onDownload={isElectron ? undefined : handleDownloadShareHtml}
            onClose={() => setShowShareModal(false)}
          />
        )}
        {showHelpModal && (
          <HelpModal
            onClose={() => setShowHelpModal(false)}
            onCheckUpdate={isElectron ? handleCheckForUpdates : undefined}
            updateCheckBusy={updateCheckBusy}
          />
        )}
        {showSettingsModal && (
          <SettingsModal
            open={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            settings={appSettings}
            onSave={(s) => { void handleSaveSettings(s); }}
          />
        )}
        {updateInfo && showUpdateModal && (
          <UpdateModal
            info={updateInfo}
            downloading={updateDownloading}
            downloaded={updateDownloaded}
            progress={updateProgress}
            errorMessage={updateError}
            onLater={handleUpdateLater}
            onOpenRelease={handleOpenReleasePage}
            onDownload={handleDownloadUpdate}
            onInstall={() => { setShowCloseConfirm(false); void handleInstallUpdate(); }}
          />
        )}
      </Suspense>
      {showCloseConfirm && (
        <CloseConfirmModal
          onClose={handleCancelCloseWindow}
          onConfirm={handleCloseWindowChoice}
        />
      )}
      {showBackUnsavedConfirm && (
        <Suspense fallback={null}>
          <UnsavedConfirmModal
            title="未保存的更改"
            message="当前文件有未保存的内容，返回项目前是否保存？"
            onClose={() => setShowBackUnsavedConfirm(false)}
            onDiscard={handleBackDiscardAndLeave}
            onSave={() => { void handleBackSaveAndLeave(); }}
          />
        </Suspense>
      )}
      {modal?.type === "new" && (
        <NewDocModal
          title="新建文档"
          onClose={() => setModal(null)}
          onConfirm={(name) => { handleNewDoc(name); setModal(null); }}
        />
      )}
      {modal?.type === "new-file" && (
        <NewDocModal
          title="新建文件"
          onClose={() => setModal(null)}
          onConfirm={(name) => {
            if (selectedProject?.folderPath) void handleNewFileInFolder(selectedProject.folderPath, name);
            else handleNewDoc(name);
            setModal(null);
          }}
        />
      )}
      {modal?.type === "new-level" && (
        <NewDocModal
          title="新建层级"
          onClose={() => setModal(null)}
          onConfirm={(name) => { handleNewRootFile(name); setModal(null); }}
        />
      )}
      {modal?.type === "rename" && (
        <NewDocModal
          title="重命名"
          initialValue={modal.target}
          onClose={() => setModal(null)}
          onConfirm={(name) => { void handleRename(modal.target, name); setModal(null); }}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </>
      )}
    </div>
  );
}
