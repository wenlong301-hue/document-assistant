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
};
