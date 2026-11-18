import React, { useEffect, useState } from "react";

export function CloudAuthModal({
  open,
  mode,
  loading,
  defaultServer,
  onLogin,
  onRegister,
  onClose,
  onSwitchMode,
}: {
  open: boolean;
  mode: "login" | "register";
  loading?: boolean;
  defaultServer?: string;
  onLogin: (payload: { email: string; password: string; serverUrl?: string }) => Promise<boolean>;
  onRegister: (payload: { name: string; email: string; password: string; serverUrl?: string }) => Promise<boolean>;
  onClose: () => void;
  onSwitchMode: (mode: "login" | "register") => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState(defaultServer || "http://127.0.0.1:8080");
  const [error, setError] = useState("");
  const [showServer, setShowServer] = useState(false);

  useEffect(() => {
    if (open) {
      setError("");
      if (defaultServer) setServer(defaultServer);
    }
  }, [open, defaultServer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    const nextEmail = email.trim();
    if (!nextEmail || !password) { setError("请填写邮箱和密码"); return; }
    if (mode === "register" && !name.trim()) { setError("请填写昵称"); return; }
    setError("");
    const ok = mode === "register"
      ? await onRegister({ name: name.trim(), email: nextEmail, password, serverUrl: server.trim() })
      : await onLogin({ email: nextEmail, password, serverUrl: server.trim() });
    if (!ok) setError(mode === "register" ? "注册失败，请检查填写内容" : "登录失败，请检查邮箱与密码");
  };

  const inputClass = "w-full h-[40px] box-border px-[12px] rounded-[6px] border border-[#EBECF0] bg-white text-[14px] text-[#131212] outline-none focus:border-[#131212] transition-colors placeholder:text-[#C0C4CC]";

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[16px] w-[520px] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#E0E0E0] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-[24px] pt-[18px]">
          <p className="m-0 text-[16px] font-medium text-[#131212] leading-[24px] font-['PingFang_SC:Medium',sans-serif]">
            {mode === "register" ? "注册云端账号" : "登录云端账号"}
          </p>
          <button
            type="button"
            className="size-[28px] flex items-center justify-center rounded-[6px] border-0 p-0 bg-transparent text-[#131212] hover:bg-[#EBECF0] transition-colors cursor-pointer outline-none"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.3333 2.66667L2.66667 13.3333M13.3333 13.3333L2.66667 2.66667" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        <div className="px-[24px] pt-[16px] pb-[24px] flex flex-col gap-[14px]">
          <div className="flex items-center gap-[8px] p-[3px] rounded-[8px] bg-[#F7F8FA] box-border">
            {(["login", "register"] as const).map((item) => (
              <button
                key={item}
                type="button"
                className={`flex-1 h-[32px] rounded-[6px] border-0 text-[13px] cursor-pointer transition-colors ${
                  mode === item ? "bg-white text-[#131212] shadow-[0px_1px_2px_rgba(0,0,0,0.06)]" : "bg-transparent text-[#8D8E99]"
                }`}
                onClick={() => onSwitchMode(item)}
              >
                {item === "login" ? "登录" : "注册"}
              </button>
            ))}
          </div>

          {mode === "register" && (
            <label className="flex flex-col gap-[6px]">
              <span className="text-[12px] text-[#8D8E99]">昵称</span>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="会显示在协同光标上" />
            </label>
          )}

          <label className="flex flex-col gap-[6px]">
            <span className="text-[12px] text-[#8D8E99]">邮箱</span>
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>

          <label className="flex flex-col gap-[6px]">
            <span className="text-[12px] text-[#8D8E99]">密码</span>
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
              placeholder={mode === "register" ? "至少 8 位" : "请输入密码"}
            />
          </label>

          <button type="button" className="text-left text-[12px] text-[#8D8E99] underline-offset-2 hover:underline" onClick={() => setShowServer((v) => !v)}>
            {showServer ? "收起服务器设置" : "服务器地址设置"}
          </button>
          {showServer && (
            <input className={inputClass} value={server} onChange={(e) => setServer(e.target.value)} placeholder="http://127.0.0.1:8080" />
          )}

          {error && <p className="m-0 text-[12px] text-[#E53E3E] leading-[18px]">{error}</p>}

          <button
            type="button"
            className="h-[40px] rounded-[8px] bg-[#131212] text-white text-[14px] border-0 cursor-pointer hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
            onClick={() => { void submit(); }}
          >
            {loading ? "处理中…" : mode === "register" ? "注册并登录" : "登录"}
          </button>

          <p className="m-0 text-[11px] text-[#8D8E99] leading-[18px]">
            登录后可以把本地项目上传到云端，与同事同时编辑同一份文档；无需保持同一 Wi-Fi。
          </p>
        </div>
      </div>
    </div>
  );
}
