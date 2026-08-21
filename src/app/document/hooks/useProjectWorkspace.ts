import { useState, useEffect, useCallback, useRef } from "react";
import type { FolderFileItem, FolderTreeNode, Project } from "@/app/document/types";
import { getElectronAPI } from "@/app/shared/electron";
import { formatSavedAt } from "@/app/editor/constants";

type ToastSetter = (toast: { message: string; type: "success" | "error" | "info" } | null) => void;

export function useProjectWorkspace(params: {
  isElectron: boolean;
  setToast: ToastSetter;
  setMode: (mode: "document" | "outline") => void;
  setSelectedDoc: React.Dispatch<React.SetStateAction<string>>;
  setOutlineNodes: React.Dispatch<React.SetStateAction<import("@/app/document/types").OutlineNode[]>>;
  setSelectedNodeId: React.Dispatch<React.SetStateAction<string>>;
  openFileInfoRef: React.MutableRefObject<{ docName: string; filePath: string; ext: string; originalText?: string; lineEnding?: string } | null>;
  dirtyOpenDocsRef: React.MutableRefObject<Set<string>>;
  selectedDocRef: React.MutableRefObject<string>;
  saveTimersRef: React.MutableRefObject<Record<string, ReturnType<typeof setTimeout>>>;
  flushDoc: (docName: string) => Promise<boolean>;
  isOpenDocDirty: (docName: string) => boolean;
  clearOpenDocDirty: (docName: string) => void;
  setLastSavedAt: (v: string | null) => void;
  setShowBackUnsavedConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveFolder: React.Dispatch<React.SetStateAction<string | null>>;
  setFolderFiles: React.Dispatch<React.SetStateAction<FolderFileItem[]>>;
  folderFilesRef: React.MutableRefObject<FolderFileItem[]>;
  openFolderFileRef: React.MutableRefObject<(file: FolderFileItem) => Promise<void>>;
}) {
  const {
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
  } = params;

  const [level, setLevel] = useState<"projects" | "project">("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectViewMode, setProjectViewMode] = useState<"grid" | "list">("grid");
  const [submode, setSubmode] = useState<"files" | "outline">("files");
  const [folderTree, setFolderTree] = useState<FolderTreeNode[]>([]);
  const [selectedFileNode, setSelectedFileNode] = useState<FolderTreeNode | null>(null);
  const selectedProjectRef = useRef<Project | null>(null);
  useEffect(() => { selectedProjectRef.current = selectedProject; }, [selectedProject]);

  useEffect(() => {
    if (!isElectron) return;
    const api = getElectronAPI();
    if (!api?.getProjects) return;
    api.getProjects().then((projectList: Project[]) => {
      setProjects(projectList || []);
      if (projectList && projectList.length > 0) {
        const firstProject = projectList[0];
        setSelectedProject(firstProject);
        if (firstProject.folderPath && api.scanFolderTree) {
          api.scanFolderTree(firstProject.folderPath).then((tree: FolderTreeNode[]) => {
            setFolderTree(tree || []);
          }).catch((error: unknown) => console.error("scan folder tree failed:", error));
        }
      }
    }).catch((error: unknown) => console.error("load projects failed:", error));
  }, [isElectron]);

  const handleSelectProject = useCallback(async (project: Project) => {
    setSelectedProject(project);
    setLevel("project");
    setSubmode("files");
    setSelectedFileNode(null);
    if (project.filePath) {
      const name = project.filePath.split(/[\\/]/).pop() || project.name;
      const fileNode: FolderTreeNode = { name, path: project.filePath, isDirectory: false };
      setFolderTree([fileNode]);
      setActiveFolder(null);
      setFolderFiles([{ path: project.filePath, relPath: name, name, ext: name.includes(".") ? `.${name.split(".").pop()?.toLowerCase()}` : "", size: 0, mtimeMs: 0 }]);
      setSelectedFileNode(fileNode);
      await openFolderFileRef.current({ path: project.filePath, relPath: name, name, ext: name.includes(".") ? `.${name.split(".").pop()?.toLowerCase()}` : "", size: 0, mtimeMs: 0 });
      setSubmode("outline");
      return;
    }
    const api = getElectronAPI();
    if (project.folderPath && api?.scanFolderTree) {
      try {
        const tree = await api.scanFolderTree(project.folderPath);
        setFolderTree(tree || []);
        setActiveFolder(project.folderPath);
        if (api.scanFolder) {
          const files = await api.scanFolder(project.folderPath);
          setFolderFiles(Array.isArray(files) ? files : []);
        }
      } catch (error) {
        console.error("scan folder tree failed:", error);
        setFolderTree([]);
        setActiveFolder(null);
        setFolderFiles([]);
      }
    } else {
      setFolderTree([]);
      setActiveFolder(null);
      setFolderFiles([]);
    }
  }, [openFolderFileRef, setActiveFolder, setFolderFiles]);

  const handleCreateProject = useCallback(async (name: string, folderPath?: string) => {
    const api = getElectronAPI();
    try {
      let result;
      if (folderPath && api?.createProjectAt) {
        result = await api.createProjectAt(name, folderPath);
      } else if (api?.createProject) {
        result = await api.createProject(name);
      } else {
        return;
      }
      if (result?.ok && result.project) {
        setProjects((prev) => [...prev, result.project]);
        handleSelectProject(result.project);
      } else if (result?.error) {
        setToast({ message: result.error, type: "error" });
      }
    } catch {
      setToast({ message: "创建项目失败", type: "error" });
    }
  }, [handleSelectProject, setToast]);

  const handleImportFolder = useCallback(async (kind?: "file" | "folder") => {
    const api = getElectronAPI();
    if (!api?.importFolder) return;
    try {
      const result = await api.importFolder(kind);
      if (result?.canceled) return;
      if (result?.error) {
        setToast({ message: result.error, type: "error" });
        return;
      }
      if (!result?.name || !result?.path) return;
      if (projects.some((project) => project.filePath === result.path || project.folderPath === result.path)) {
        setToast({ message: "项目已存在", type: "info" });
        return;
      }
      const now = new Date().toISOString();
      const project: Project = {
        id: `project-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: result.name,
        ...(result.isFile ? { filePath: result.path } : { folderPath: result.path }),
        createdAt: now,
        updatedAt: now,
      };
      const nextProjects = [...projects, project];
      const saveResult = await api.saveProjects(nextProjects);
      if (saveResult) {
        setProjects(nextProjects);
        handleSelectProject(project);
      }
    } catch {
      setToast({ message: "导入项目失败", type: "error" });
    }
  }, [projects, handleSelectProject, setToast]);

  const handleImportFolderDrop = useCallback(async (folderPath: string) => {
    const api = getElectronAPI();
    try {
      const projectName = folderPath.split(/[\\/]/).pop() || "导入的项目";
      if (projects.some((project) => project.filePath === folderPath || project.folderPath === folderPath)) {
        setToast({ message: "项目已存在", type: "info" });
        return;
      }
      const ext = projectName.includes(".") ? `.${projectName.split(".").pop()?.toLowerCase()}` : "";
      const isFile = [".mdoc", ".md", ".txt", ".docx", ".html", ".htm", ".sql"].includes(ext);
      const now = new Date().toISOString();
      const project: Project = {
        id: `project-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: projectName,
        ...(isFile ? { filePath: folderPath } : { folderPath }),
        createdAt: now,
        updatedAt: now,
      };
      const nextProjects = [...projects, project];
      const saveResult = await api.saveProjects(nextProjects);
      if (saveResult) {
        setProjects(nextProjects);
        handleSelectProject(project);
      }
    } catch {
      setToast({ message: "导入项目失败", type: "error" });
    }
  }, [projects, handleSelectProject, setToast]);

  const handleFileSelect = useCallback(async (node: FolderTreeNode) => {
    setSelectedFileNode(node);
    if (node.isDirectory) {
      setSubmode("files");
    } else {
      const file = folderFilesRef.current.find((item) => item.path === node.path) || {
        path: node.path,
        relPath: node.name,
        name: node.name,
        ext: node.name.includes(".") ? `.${node.name.split(".").pop()?.toLowerCase()}` : "",
        size: 0,
        mtimeMs: 0,
      };
      await openFolderFileRef.current(file);
      setSubmode("files");
    }
  }, [folderFilesRef, openFolderFileRef]);

  const handleSwitchSubmode = useCallback(() => {
    setSubmode((prev) => (prev === "files" ? "outline" : "files"));
  }, []);

  const handleNewFileInFolder = useCallback(async (folderPath: string, fileName = "新建文件") => {
    const api = getElectronAPI();
    if (!api?.createFileInFolder) return;
    try {
      const result = await api.createFileInFolder(folderPath, fileName);
      if (result?.ok) {
        const createdName = result.name || result.path.split(/[\\/]/).pop() || "新建文件.mdoc";
        const currentProject = selectedProjectRef.current;
        const fileItem = {
          path: result.path,
          relPath: currentProject?.folderPath && result.path.startsWith(currentProject.folderPath)
            ? result.path.slice(currentProject.folderPath.length).replace(/^[\\/]/, "")
            : createdName,
          name: createdName,
          ext: result.ext || ".mdoc",
          size: result.size || 0,
          mtimeMs: result.mtimeMs || Date.now(),
        };
        if (currentProject?.folderPath) {
          const tree = await api.scanFolderTree(currentProject.folderPath);
          setFolderTree(tree || []);
        }
        setFolderFiles((prev) => [...prev.filter((item) => item.path !== fileItem.path), fileItem]);
        setSelectedFileNode({ name: fileItem.name, path: fileItem.path, isDirectory: false });
        await openFolderFileRef.current(fileItem);
        setToast({ message: "文件已创建", type: "success" });
      } else if (result?.error) {
        setToast({ message: result.error, type: "error" });
      }
    } catch {
      setToast({ message: "创建文件失败", type: "error" });
    }
  }, [openFolderFileRef, setFolderFiles, setToast]);

  const leaveProjectToList = useCallback(() => {
    dirtyOpenDocsRef.current.clear();
    openFileInfoRef.current = null;
    setShowBackUnsavedConfirm(false);
    setLevel("projects");
    setSelectedProject(null);
    setFolderTree([]);
    setSelectedFileNode(null);
    setSubmode("files");
    setActiveFolder(null);
    setFolderFiles([]);
    setSelectedDoc("");
    setOutlineNodes([]);
    setSelectedNodeId("");
    setMode("document");
  }, [dirtyOpenDocsRef, openFileInfoRef, setShowBackUnsavedConfirm, setActiveFolder, setFolderFiles, setSelectedDoc, setOutlineNodes, setSelectedNodeId, setMode]);

  const handleBackToProjects = useCallback(() => {
    const docName = selectedDocRef.current;
    if (docName && isOpenDocDirty(docName)) {
      setShowBackUnsavedConfirm(true);
      return;
    }
    leaveProjectToList();
  }, [selectedDocRef, isOpenDocDirty, setShowBackUnsavedConfirm, leaveProjectToList]);

  const handleBackSaveAndLeave = useCallback(async () => {
    const docName = selectedDocRef.current;
    if (!docName) {
      leaveProjectToList();
      return;
    }
    clearTimeout(saveTimersRef.current[docName]);
    const ok = await flushDoc(docName);
    if (!ok) {
      setToast({ message: "保存失败，仍停留在当前文件", type: "error" });
      return;
    }
    clearOpenDocDirty(docName);
    setLastSavedAt(formatSavedAt(false));
    leaveProjectToList();
  }, [selectedDocRef, saveTimersRef, flushDoc, clearOpenDocDirty, setLastSavedAt, leaveProjectToList, setToast]);

  const handleBackDiscardAndLeave = useCallback(() => {
    leaveProjectToList();
  }, [leaveProjectToList]);

  const handleDeleteProject = useCallback(async (project: Project) => {
    const newProjects = projects.filter((p) => p.id !== project.id);
    setProjects(newProjects);
    const api = getElectronAPI();
    if (api?.saveProjects) {
      await api.saveProjects(newProjects);
    }
  }, [projects]);

  const handleRenameProject = useCallback((project: Project, newName: string) => {
    setProjects((prev) => prev.map((p) => p.id === project.id ? { ...p, name: newName } : p));
  }, []);

  return {
    level, setLevel,
    projects, setProjects,
    selectedProject, setSelectedProject,
    selectedProjectRef,
    projectViewMode, setProjectViewMode,
    submode, setSubmode,
    folderTree, setFolderTree,
    selectedFileNode, setSelectedFileNode,
    handleSelectProject,
    handleCreateProject,
    handleImportFolder,
    handleImportFolderDrop,
    handleFileSelect,
    handleSwitchSubmode,
    handleNewFileInFolder,
    leaveProjectToList,
    handleBackToProjects,
    handleBackSaveAndLeave,
    handleBackDiscardAndLeave,
    handleDeleteProject,
    handleRenameProject,
  };
}
