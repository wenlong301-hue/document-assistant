export function parseCollabLink(raw: string): { wsUrl: string; token: string; room: string } | null {
  const input = String(raw || "").trim();
  if (!input) return null;
  try {
    const normalized = input.startsWith("http://") || input.startsWith("https://") || input.startsWith("ws://") || input.startsWith("wss://")
      ? input
      : `http://${input}`;
    const url = new URL(normalized);
    const token = url.searchParams.get("token") || "";
    const room = url.searchParams.get("room") || "doc-assistant";
    if (!url.hostname || !token) return null;
    const port = url.port || (url.protocol.startsWith("https") || url.protocol.startsWith("wss") ? "443" : "80");
    const wsProtocol = url.protocol.startsWith("https") || url.protocol.startsWith("wss") ? "wss:" : "ws:";
    return { wsUrl: `${wsProtocol}//${url.hostname}:${port}`, token, room };
  } catch {
    return null;
  }
}
