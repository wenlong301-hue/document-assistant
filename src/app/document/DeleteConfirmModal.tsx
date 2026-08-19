import deleteSvg from "../../imports/删除提示确认/svg-wi3f4os8di";

export function DeleteConfirmModal({ message, onConfirm, onClose }: { message: string; onConfirm: () => void; onClose: () => void }) {
  const lines = message.split("\n").filter((line) => line.length > 0);
  const [title, ...rest] = lines.length > 0 ? lines : ["确定删除？"];
  const details = rest.length > 0 ? rest : [];

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[16px] w-[520px] max-w-[92vw] shadow-[0px_16px_32px_-8px_rgba(36,36,36,0.12)] border border-[#E0E0E0] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 — 与 NewDocModal / ShareModal 一致 */}
        <div className="flex items-center justify-between px-[24px] pt-[18px] pb-0">
          <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[16px] font-medium leading-[24px]">提示</p>
          <button
            type="button"
            className="size-[28px] flex items-center justify-center rounded-[6px] border-0 p-0 bg-transparent text-[#131212] hover:bg-[#EBECF0] active:bg-[#DDDEE3] transition-colors cursor-pointer outline-none appearance-none"
            onClick={onClose}
            aria-label="关闭"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d={deleteSvg.p163cf00} stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        {/* 内容区 — 上24；主文案 14 Medium；说明 13 muted */}
        <div className="px-[24px] pt-[24px] pb-[8px] flex items-start gap-[8px]">
          <div className="relative shrink-0 size-[20px] mt-[2px]">
            <svg className="block size-full" fill="none" viewBox="0 0 20 20">
              <path d={deleteSvg.pf7a1b80} stroke="#131212" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
            </svg>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <p className="m-0 font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[14px] font-medium leading-[20px] break-words">
              {title}
            </p>
            {details.map((line, i) => (
              <p
                key={i}
                className="m-0 mt-[8px] font-['PingFang_SC:Regular',sans-serif] text-[#8D8E99] text-[13px] leading-[18px] break-words"
              >
                {line}
              </p>
            ))}
          </div>
        </div>

        {/* 底部按钮 — 与 NewDocModal 一致：高 32、圆角 6 */}
        <div className="shrink-0 flex items-center justify-end gap-[12px] px-[24px] pt-[16px] pb-[16px]">
          <button
            type="button"
            className="h-[32px] px-[16px] rounded-[6px] border border-solid border-[#EBECF0] bg-white text-[#131212] text-[14px] font-normal leading-none cursor-pointer hover:bg-[#F7F8FA] active:bg-[#EBECF0] transition-colors outline-none appearance-none inline-flex items-center justify-center box-border"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={onClose}
          >取消</button>
          <button
            type="button"
            className="h-[32px] px-[16px] rounded-[6px] border-0 bg-[#131212] text-white text-[14px] font-normal leading-none cursor-pointer hover:opacity-90 active:opacity-80 transition-opacity outline-none appearance-none inline-flex items-center justify-center box-border"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={() => { onConfirm(); onClose(); }}
          >确定</button>
        </div>
      </div>
    </div>
  );
}
