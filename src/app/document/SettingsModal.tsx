import React, { useEffect, useState } from "react";

export function SettingsModal({
  open,
  onClose,
  settings,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  settings: { closeBehavior?: string };
  onSave: (settings: { closeBehavior: string }) => void;
}) {
  const [closeBehavior, setCloseBehavior] = useState(settings.closeBehavior || 'ask');

  useEffect(() => {
    if (open) {
      setCloseBehavior(settings.closeBehavior || 'ask');
    }
  }, [open, settings]);

  if (!open) return null;

  const handleSave = () => {
    onSave({ closeBehavior });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/36" onClick={onClose} />
      <div className="relative bg-white rounded-[16px] shadow-[0_8px_32px_rgba(0,0,0,0.16)] w-[400px] overflow-hidden">
        <div className="flex items-center justify-between px-[20px] py-[16px] border-b border-[#EBECF0]">
          <h2 className="text-[16px] font-medium text-[#131212]">设置</h2>
          <button
            className="size-[28px] flex items-center justify-center rounded-[6px] border-0 p-0 bg-transparent text-[#131212] hover:bg-[#EBECF0] transition-colors outline-none appearance-none"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.3333 2.66667L2.66667 13.3333M13.3333 13.3333L2.66667 2.66667" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        <div className="p-[20px]">
          <div className="mb-[20px]">
            <h3 className="text-[14px] font-medium text-[#131212] mb-[12px]">通用</h3>
            <div className="flex flex-col gap-[12px]">
              <div>
                <p className="text-[13px] text-[#606266] mb-[8px]">关闭窗口时</p>
                <div className="flex flex-col gap-[8px]">
                  <label className="flex items-center gap-[8px] cursor-pointer">
                    <input
                      type="radio"
                      name="closeBehavior"
                      value="ask"
                      checked={closeBehavior === 'ask'}
                      onChange={() => setCloseBehavior('ask')}
                      className="size-[16px] accent-[#131212]"
                    />
                    <span className="text-[13px] text-[#303133]">询问我</span>
                  </label>
                  <label className="flex items-center gap-[8px] cursor-pointer">
                    <input
                      type="radio"
                      name="closeBehavior"
                      value="tray"
                      checked={closeBehavior === 'tray'}
                      onChange={() => setCloseBehavior('tray')}
                      className="size-[16px] accent-[#131212]"
                    />
                    <span className="text-[13px] text-[#303133]">最小化到托盘</span>
                  </label>
                  <label className="flex items-center gap-[8px] cursor-pointer">
                    <input
                      type="radio"
                      name="closeBehavior"
                      value="quit"
                      checked={closeBehavior === 'quit'}
                      onChange={() => setCloseBehavior('quit')}
                      className="size-[16px] accent-[#131212]"
                    />
                    <span className="text-[13px] text-[#303133]">直接退出</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-[8px] px-[20px] pb-[16px]">
          <button
            className="h-[32px] px-[16px] rounded-[8px] border border-[#EBECF0] bg-white text-[14px] text-[#131212] hover:bg-[#F7F8FA] transition-colors"
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="h-[32px] px-[16px] rounded-[8px] bg-[#131212] text-white text-[14px] hover:opacity-90 transition-opacity"
            onClick={handleSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
