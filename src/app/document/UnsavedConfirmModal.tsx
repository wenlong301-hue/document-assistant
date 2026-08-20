export function UnsavedConfirmModal({ title, message, onSave, onDiscard, onClose }: {
  title: string;
  message: string;
  onSave: () => void;
  onDiscard: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[16px] w-[520px] max-w-[92vw] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#E0E0E0] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-[24px] pt-[18px] pb-0">
          <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[16px] font-medium leading-[24px]">{title}</p>
          <button
            type="button"
            className="size-[28px] flex items-center justify-center rounded-[6px] border-0 p-0 bg-transparent text-[#131212] hover:bg-[#EBECF0] active:bg-[#DDDEE3] transition-colors cursor-pointer outline-none appearance-none"
            onClick={onClose}
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13.3333 2.66667L2.66667 13.3333M13.3333 13.3333L2.66667 2.66667" stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        <div className="px-[24px] pt-[24px] pb-[8px]">
          <p className="m-0 font-['PingFang_SC:Regular',sans-serif] text-[#303133] text-[14px] leading-[20px] break-words">
            {message}
          </p>
        </div>

        <div className="shrink-0 flex items-center justify-end gap-[12px] px-[24px] pt-[16px] pb-[16px]">
          <button
            type="button"
            className="h-[32px] px-[16px] rounded-[6px] border border-solid border-[#EBECF0] bg-white text-[#131212] text-[14px] font-normal leading-none cursor-pointer hover:bg-[#F7F8FA] active:bg-[#EBECF0] transition-colors outline-none appearance-none inline-flex items-center justify-center box-border"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={onClose}
          >取消</button>
          <button
            type="button"
            className="h-[32px] px-[16px] rounded-[6px] border border-solid border-[#EBECF0] bg-white text-[#E53E3E] text-[14px] font-normal leading-none cursor-pointer hover:bg-[#FFF1F0] active:bg-[#FFE4E1] transition-colors outline-none appearance-none inline-flex items-center justify-center box-border"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={onDiscard}
          >不保存</button>
          <button
            type="button"
            className="h-[32px] px-[16px] rounded-[6px] border-0 bg-[#131212] text-white text-[14px] font-normal leading-none cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity outline-none appearance-none inline-flex items-center justify-center box-border"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={onSave}
          >保存</button>
        </div>
      </div>
    </div>
  );
}
