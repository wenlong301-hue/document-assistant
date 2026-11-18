import { getElectronAPI } from "@/app/shared/electron";
import type { CloudSessionPayload, CloudUser } from "@/app/shared/electron";

export type CloudRole = "owner" | "editor" | "viewer";

export type CloudProject = {
  id: string;
  name: string;
  role: CloudRole;
  createdAt: number;
  updatedAt: number;
};

export type CloudSession = {
  user: CloudUser | null;
  serverUrl: string;
  projectId?: string | null;
};

export type CloudMember = {
  id: string;
  email: string;
  name: string;
  color: string;
  role: CloudRole;
};

export const ROLE_LABEL: Record<CloudRole, string> = {
  owner: "所有者",
  editor: "可编辑",
  viewer: "只读",
};

function api() {
  const electron = getElectronAPI();
  if (!electron?.cloudRequest) throw new Error("当前环境不支持云端协同");
  return electron;
}

export const cloudApi = {
  available: () => !!getElectronAPI()?.cloudSession,

  config: (payload?: { serverUrl?: string }) => api().cloudConfig(payload),
  login: (payload: { email: string; password: string; serverUrl?: string }) => api().cloudLogin(payload),
  register: (payload: { name: string; email: string; password: string; serverUrl?: string }) => api().cloudRegister(payload),
  logout: () => api().cloudLogout(),

  session: async (): Promise<CloudSession> => {
    const payload = (await api().cloudSession()) as CloudSessionPayload & { projectId?: string | null };
    return { user: payload.user ?? null, serverUrl: payload.serverUrl, projectId: payload.projectId ?? null };
  },

  async request<T>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
    const res = await api().cloudRequest({ method, path, body });
    if (!res?.ok) {
      const error = new Error(res?.error || "请求失败");
      (error as Error & { status?: number }).status = res?.status;
      throw error;
    }
    return res.data as T;
  },

  listProjects: () =>
    cloudApi.request<{ projects: CloudProject[] }>("GET", "/api/projects").then((r) => r.projects || []),

  createProject: (payload: { name: string; snapshot?: unknown }) =>
    cloudApi.request<{ project: CloudProject }>("POST", "/api/projects", payload).then((r) => r.project),

  renameProject: (projectId: string, name: string) =>
    cloudApi.request<{ ok: boolean }>("PATCH", `/api/projects/${projectId}`, { name }),

  deleteProject: (projectId: string) =>
    cloudApi.request<{ ok: boolean }>("DELETE", `/api/projects/${projectId}`),

  members: (projectId: string) =>
    cloudApi.request<{ members: CloudMember[] }>("GET", `/api/projects/${projectId}/members`).then((r) => r.members || []),

  invite: (projectId: string, email: string, role: CloudRole) =>
    cloudApi.request<{ members: CloudMember[] }>("POST", `/api/projects/${projectId}/members`, { email, role }).then((r) => r.members || []),

  removeMember: (projectId: string, userId: string) =>
    cloudApi.request<{ members: CloudMember[] }>("DELETE", `/api/projects/${projectId}/members/${userId}`).then((r) => r.members || []),

  wsTicket: (projectId: string) => api().cloudWsTicket({ projectId }),

  exportProject: (projectId: string) =>
    cloudApi.request<{ name: string; children: unknown[]; content: Record<string, string>; updatedAt: string }>(
      "GET",
      `/api/projects/${projectId}/export`
    ),
};
