export type CollabRole = "host" | "guest" | null;

export type CollabPeer = {
  clientId: number;
  name: string;
  color: string;
  nodeId?: string;
};

export type CollabSessionState = {
  active: boolean;
  role: CollabRole;
  status: "idle" | "connecting" | "connected" | "error";
  url: string;
  wsUrl: string;
  room: string;
  token: string;
  error: string;
  peers: CollabPeer[];
  localName: string;
  localColor: string;
  synced: boolean;
  /** 是否为云端项目（云端协同不停止本机局域网协同服务） */
  cloud: boolean;
  /** 只读成员（服务端同样会丢弃写入） */
  readOnly: boolean;
};
