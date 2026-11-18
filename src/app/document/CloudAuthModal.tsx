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

  const isRegister = mode === "register";
  const submit = async () => {
    const nextEmail = email.trim();
    if (!nextEmail || !password) { setError("请填写邮箱和密码"); return; }
    if (isRegister && !name.trim()) { setError("请填写昵称"); return; }
    setError("");
    const ok = isRegister
      ? await onRegister({ name: name.trim(), email: nextEmail, password, serverUrl: server.trim() })
      : await onLogin({ email: nextEmail, password, serverUrl: server.trim() });
    if (!ok) setError(isRegister ? "注册失败，请检查填写内容" : "登录失败，请检查邮箱与密码");
  };

  const inputClass =
    "w-full h-[36px] box-border px-[12px] rounded-[8px] border border-solid border-[#EBECF0] bg-white " +
    "text-[14px] leading-[20px] text-[#131212] outline-none focus:border-[#131212] " +
    "placeholder:text-[#C0C4CC] transition-colors font-['PingFang_SC:Regular',sans-serif]";
  const labelClass = "block m-0 mb-[8px] text-[14px] leading-[20px] text-[#606266] font-['PingFang_SC:Regular',sans-serif]";

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[16px] w-[520px] border border-[#E0E0E0] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-[24px] pt-[18px] pb-0">
          <p className="m-0 text-[16px] font-medium leading-[24px] text-[#131212] font-['PingFang_SC:Medium',sans-serif]">
            {isRegister ? "注册云端账号" : "登录云端账号"}
          </p>
          <button
            type="button"
            className="size-[28px] flex items-center justify-center rounded-[6px] border-0 p-0 bg-transparent text-[#131212]
              hover:bg-[#EBECF0] active:bg-[#DDDEE3] transition-colors cursor-pointer outline-none appearance-none"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.3333 2.66667L2.66667 13.3333M13.3333 13.3333L2.66667 2.66667" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        <div className="px-[24px] pt-[20px] pb-0 flex flex-col gap-[16px]">
          {isRegister && (
            <div>
              <p className={labelClass}>昵称</p>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="会显示在协同光标上" />
            </div>
          )}

          <div>
            <p className={labelClass}>邮箱</p>
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="username"
            />
          </div>

          <div>
            <p className={labelClass}>密码</p>
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
              placeholder="请输入密码"
              autoComplete={isRegister ? "new-password" : "current-password"}
            />
            {isRegister && (
              <p className="m-0 mt-[6px] text-[12px] leading-[18px] text-[#8D8E99] font-['PingFang_SC:Regular',sans-serif]">
                至少 8 位字符
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-[12px]">
            <button
              type="button"
              className="h-[20px] px-0 border-0 bg-transparent cursor-pointer text-[12px] leading-[18px] text-[#8D8E99]
                font-['PingFang_SC:Regular',sans-serif] hover:text-[#131212] transition-colors"
              onClick={() => setShowServer((v) => !v)}
            >
              {showServer ? "收起服务器设置" : `服务器：${server.replace(/^https?:\/\//, "")}`}
            </button>
            <button
              type="button"
              className="h-[20px] px-0 border-0 bg-transparent cursor-pointer text-[12px] leading-[18px] text-[#8D8E99]
                font-['PingFang_SC:Regular',sans-serif] hover:text-[#131212] transition-colors"
              onClick={() => onSwitchMode(isRegister ? "login" : "register")}
            >
              {isRegister ? "已有账号？登录" : "还没有账号？注册"}
            </button>
          </div>

          {showServer && (
            <div>
              <p className={labelClass}>服务器地址</p>
              <input className={inputClass} value={server} onChange={(e) => setServer(e.target.value)} placeholder="http://127.0.0.1:8080" />
            </div>
          )}

          {error && (
            <p className="m-0 text-[13px] leading-[18px] text-[#E53E3E] font-['PingFang_SC:Regular',sans-serif]">{error}</p>
          )}

          <p className="m-0 text-[12px] leading-[18px] text-[#8D8E99] font-['PingFang_SC:Regular',sans-serif]">
            登录后可以把本地项目上传到云端，与同事同时编辑同一份文档；无需保持同一 Wi-Fi。
          </p>
        </div>

        <div className="flex justify-end gap-[8px] px-[24px] pt-[16px] pb-[20px]">
          <button
            type="button"
            className="h-[32px] px-[16px] rounded-[6px] border border-solid border-[#EBECF0] bg-white text-[#131212]
              text-[14px] font-['PingFang_SC:Regular',sans-serif] leading-none inline-flex items-center justify-center
              hover:bg-[#F7F8FA] active:bg-[#EBECF0] transition-colors cursor-pointer"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            data-cloud-submit
            className="h-[32px] px-[16px] rounded-[6px] border-0 bg-[#131212] text-white text-[14px]
              font-['PingFang_SC:Regular',sans-serif] leading-none inline-flex items-center justify-center cursor-pointer
              hover:opacity-90 active:opacity-80 transition-opacity
              disabled:bg-[#C0C4CC] disabled:cursor-not-allowed disabled:opacity-100"
            disabled={loading}
            onClick={() => { void submit(); }}
          >
            {loading ? "处理中…" : isRegister ? "注册并登录" : "登录"}
          </button>
        </div>
      </div>
    </div>
  );
}
