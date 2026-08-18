import React, { useEffect, useState } from "react";

export type AppSettings = {
  closeBehavior?: string;
  fontSize?: string;
  lineHeight?: string;
  theme?: string;
  autoSaveEnabled?: boolean;
};

const FONT_OPTIONS = [
  { value: "14px", label: "14（紧凑）" },
  { value: "15px", label: "15（默认）" },
  { value: "16px", label: "16" },
  { value: "18px", label: "18（大）" },
];

const LINE_OPTIONS = [
  { value: "1.6", label: "1.6" },
  { value: "1.8", label: "1.8（默认）" },
  { value: "2.0", label: "2.0" },
];

export function SettingsModal({
  open,
  onClose,
  settings,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
}) {
  const [closeBehavior, setCloseBehavior] = useState(settings.closeBehavior || "ask");
  const [fontSize, setFontSize] = useState(settings.fontSize || "15px");
  const [lineHeight, setLineHeight] = useState(settings.lineHeight || "1.8");

  useEffect(() => {
    if (!open) return;
    setCloseBehavior(settings.closeBehavior || "ask");
    setFontSize(settings.fontSize || "15px");
    setLineHeight(settings.lineHeight || "1.8");
  }, [open, settings]);

  if (!open) return null;

  const handleSave = () => {
    onSave({
      ...settings,
      closeBehavior,
      fontSize,
      lineHeight,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[16px] w-[520px] max-w-[92vw] shadow-[0_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#e0e0e0] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-[24px] pt-[18px] pb-0">
          <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[16px] font-medium leading-[24px]">设置</p>
          <button
            type="button"
            className="size-[28px] flex items-center justify-center rounded-[6px] border-0 p-0 bg-transparent text-[#131212] hover:bg-[#EBECF0] transition-colors outline-none appearance-none"
            onClick={onClose}
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.3333 2.66667L2.66667 13.3333M13.3333 13.3333L2.66667 2.66667" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        <div className="px-[24px] pt-[20px] pb-[8px] max-h-[min(70vh,520px)] overflow-y-auto">
          <div className="mb-[24px]">
            <h3 className="m-0 text-[14px] font-medium text-[#131212] mb-[12px]">编辑器</h3>
            <div className="flex flex-col gap-[16px]">
              <div>
                <p className="m-0 text-[13px] text-[#606266] mb-[8px]">正文字号</p>
                <div className="flex flex-wrap gap-[8px]">
                  {FONT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFontSize(opt.value)}
                      className={`h-[32px] px-[12px] rounded-[8px] border text-[13px] transition-colors ${
                        fontSize === opt.value
                          ? "border-[#131212] bg-[#EBECF0] text-[#131212]"
                          : "border-[#EBECF0] bg-white text-[#303133] hover:bg-[#F7F8FA]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="m-0 text-[13px] text-[#606266] mb-[8px]">行高</p>
                <div className="flex flex-wrap gap-[8px]">
                  {LINE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLineHeight(opt.value)}
                      className={`h-[32px] px-[12px] rounded-[8px] border text-[13px] transition-colors ${
                        lineHeight === opt.value
                          ? "border-[#131212] bg-[#EBECF0] text-[#131212]"
                          : "border-[#EBECF0] bg-white text-[#303133] hover:bg-[#F7F8FA]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-[8px]">
            <h3 className="m-0 text-[14px] font-medium text-[#131212] mb-[12px]">通用</h3>
            <p className="m-0 text-[13px] text-[#606266] mb-[8px]">关闭窗口时</p>
            <div className="flex flex-col gap-[8px]">
              {(
                [
                  { value: "ask", label: "询问我" },
                  { value: "tray", label: "最小化到托盘" },
                  { value: "quit", label: "直接退出" },
                ] as const
              ).map((opt) => (
                <label key={opt.value} className="flex items-center gap-[8px] cursor-pointer">
                  <input
                    type="radio"
                    name="closeBehavior"
                    value={opt.value}
                    checked={closeBehavior === opt.value}
                    onChange={() => setCloseBehavior(opt.value)}
                    className="size-[16px] accent-[#131212]"
                  />
                  <span className="text-[13px] text-[#303133]">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-[8px] px-[24px] pt-[12px] pb-[18px]">
          <button
            type="button"
            className="h-[32px] px-[16px] rounded-[6px] border border-[#EBECF0] bg-white text-[14px] text-[#131212] hover:bg-[#F7F8FA] transition-colors"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className="h-[32px] px-[16px] rounded-[6px] bg-[#131212] text-white text-[14px] hover:opacity-90 transition-opacity border-0"
            onClick={handleSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
