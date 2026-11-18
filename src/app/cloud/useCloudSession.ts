import { useCallback, useEffect, useRef, useState } from "react";
import type { StoredDoc } from "@/app/document/types";
import { cloudApi, type CloudMember, type CloudProject, type CloudRole, type CloudSession } from "./api";

type ToastSetter = (toast: { message: string; type: "success" | "error" | "info" } | null) => void;

export function useCloudSession(params: { isElectron: boolean; setToast: ToastSetter }) {
  const { isElectron, setToast } = params;
  const [session, setSession] = useState<CloudSession | null>(null);
  const [projects, setProjects] = useState<CloudProject[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [serverUrl, setServerUrl] = useState("");
  const [activeProject, setActiveProject] = useState<CloudProject | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [members, setMembers] = useState<CloudMember[]>([]);
  const [membersBusy, setMembersBusy] = useState(false);
  const sessionRef = useRef<CloudSession | null>(null);
  const activeProjectRef = useRef<CloudProject | null>(null);

  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => { activeProjectRef.current = activeProject; }, [activeProject]);

  const refreshProjects = useCallback(async () => {
    if (!isElectron || !cloudApi.available()) return [] as CloudProject[];
    try {
      const list = await cloudApi.listProjects();
      setProjects(list);
      return list;
    } catch (error) {
      console.error("load cloud projects failed:", error);
      return [] as CloudProject[];
    }
  }, [isElectron]);

  useEffect(() => {
    if (!isElectron || !cloudApi.available()) {
      setReady(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const config = await cloudApi.config();
        if (!cancelled && config?.serverUrl) setServerUrl(config.serverUrl);
        const current = await cloudApi.session();
        if (cancelled) return;
        setSession(current);
        if (current?.user) await refreshProjects();
      } catch (error) {
        console.error("restore cloud session failed:", error);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [isElectron, refreshProjects]);

  const openAuth = useCallback((mode: "login" | "register" = "login") => {
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);

  const login = useCallback(async (payload: { email: string; password: string; serverUrl?: string }) => {
    setBusy(true);
    try {
      const next = await cloudApi.login(payload);
      setSession({ user: next.user, serverUrl: next.serverUrl, projectId: next.projectId ?? null });
      setAuthOpen(false);
      await refreshProjects();
      setToast({ message: `欢迎，${next.user?.name || "同事"}`, type: "success" });
      return true;
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "登录失败", type: "error" });
      return false;
    } finally {
      setBusy(false);
    }
  }, [refreshProjects, setToast]);

  const register = useCallback(async (payload: { name: string; email: string; password: string; serverUrl?: string }) => {
    setBusy(true);
    try {
      const next = await cloudApi.register(payload);
      setSession({ user: next.user, serverUrl: next.serverUrl, projectId: next.projectId ?? null });
      setAuthOpen(false);
      await refreshProjects();
      setToast({ message: `账号已创建，欢迎 ${next.user?.name || "同事"}`, type: "success" });
      return true;
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "注册失败", type: "error" });
      return false;
    } finally {
      setBusy(false);
    }
  }, [refreshProjects, setToast]);

  const logout = useCallback(async () => {
    setBusy(true);
    try {
      await cloudApi.logout();
      setSession({ user: null, serverUrl: sessionRef.current?.serverUrl || "", projectId: null });
      setProjects([]);
      setActiveProject(null);
      setMembers([]);
      setToast({ message: "已退出云端账号", type: "info" });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "退出失败", type: "error" });
    } finally {
      setBusy(false);
    }
  }, [setToast]);

  const createProject = useCallback(async (name: string, snapshot?: { name: string; children: unknown[]; content: Record<string, string> }) => {
    if (!sessionRef.current?.user) {
      openAuth("login");
      return null;
    }
    setBusy(true);
    try {
      const project = await cloudApi.createProject({ name, snapshot });
      await refreshProjects();
      return project;
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "创建云端项目失败", type: "error" });
      return null;
    } finally {
      setBusy(false);
    }
  }, [openAuth, refreshProjects, setToast]);

  const uploadCurrent = useCallback(async (doc: StoredDoc) => {
    if (!doc?.name) {
      setToast({ message: "请先打开一个本地项目", type: "info" });
      return null;
    }
    return createProject(doc.name, {
      name: doc.name,
      children: doc.children || [],
      content: doc.content || {},
    });
  }, [createProject, setToast]);

  const renameProject = useCallback(async (project: CloudProject, name: string) => {
    const next = String(name || "").trim();
    if (!next || next === project.name) return;
    try {
      await cloudApi.renameProject(project.id, next);
      setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, name: next } : p)));
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "重命名失败", type: "error" });
    }
  }, [setToast]);

  const deleteProject = useCallback(async (project: CloudProject) => {
    try {
      await cloudApi.deleteProject(project.id);
      setProjects((prev) => prev.filter((p) => p.id !== project.id));
      if (activeProjectRef.current?.id === project.id) setActiveProject(null);
      setToast({ message: "云端项目已删除", type: "success" });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "删除失败", type: "error" });
    }
  }, [setToast]);

  const openMembers = useCallback(async (project: CloudProject | null) => {
    const target = project || activeProjectRef.current;
    if (!target) {
      setToast({ message: "请先打开云端项目", type: "info" });
      return;
    }
    setMembersOpen(true);
    setMembersBusy(true);
    try {
      setMembers(await cloudApi.members(target.id));
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "成员加载失败", type: "error" });
    } finally {
      setMembersBusy(false);
    }
  }, [setToast]);

  const inviteMember = useCallback(async (email: string, role: CloudRole) => {
    const target = activeProjectRef.current;
    if (!target) return false;
    setMembersBusy(true);
    try {
      setMembers(await cloudApi.invite(target.id, email, role));
      setToast({ message: "已添加成员", type: "success" });
      return true;
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "添加失败", type: "error" });
      return false;
    } finally {
      setMembersBusy(false);
    }
  }, [setToast]);

  const removeMember = useCallback(async (userId: string) => {
    const target = activeProjectRef.current;
    if (!target) return;
    setMembersBusy(true);
    try {
      setMembers(await cloudApi.removeMember(target.id, userId));
      setToast({ message: "已移除成员", type: "success" });
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : "移除失败", type: "error" });
    } finally {
      setMembersBusy(false);
    }
  }, [setToast]);

  return {
    available: isElectron && cloudApi.available(),
    ready,
    session,
    user: session?.user ?? null,
    projects,
    busy,
    serverUrl,
    authOpen,
    authMode,
    openAuth,
    closeAuth: () => setAuthOpen(false),
    login,
    register,
    logout,
    refreshProjects,
    createProject,
    uploadCurrent,
    renameProject,
    deleteProject,
    activeProject,
    setActiveProject,
    membersOpen,
    closeMembers: () => setMembersOpen(false),
    members,
    membersBusy,
    openMembers,
    inviteMember,
    removeMember,
  };
}
