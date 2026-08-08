import deleteSvg from "../../imports/删除提示确认/svg-wi3f4os8di";

export function DeleteConfirmModal({ message, onConfirm, onClose }: { message: string; onConfirm: () => void; onClose: () => void }) {
  const lines = message.split("\n");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="relative bg-white rounded-[16px] w-[378px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.1)] border border-[#e0e0e0] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div className="flex items-center justify-between px-[24px] h-[56px]">
          <p className="font-['PingFang_SC:Medium',sans-serif] text-[#131212] text-[16px] font-medium leading-[normal]">提示</p>
          <button
            className="size-[28px] flex items-center justify-center rounded-[6px] text-[#131212] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors cursor-pointer"
            onClick={onClose}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d={deleteSvg.p163cf00} stroke="currentColor" strokeLinecap="round" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
        {/* 内容 */}
        <div className="flex items-start gap-[8px] px-[24px] pb-[20px]">
          <div className="relative shrink-0 size-[20px] mt-[1px]">
            <svg className="block size-full" fill="none" viewBox="0 0 20 20">
              <path d={deleteSvg.pf7a1b80} stroke="black" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
            </svg>
          </div>
          <div className="flex flex-col">
            {lines.map((line, i) => (
              <p key={i} className="font-['PingFang_SC:Regular',sans-serif] text-[#606266] text-[14px] leading-[1.6]">{line}</p>
            ))}
          </div>
        </div>
        {/* 按钮 */}
        <div className="flex items-center justify-end gap-[12px] px-[24px] pb-[16px]">
          <button
            className="h-[34px] px-[16px] rounded-[6px] border border-[#ebecf0] bg-white text-[#131212] text-[14px] cursor-pointer hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={onClose}
          >取消</button>
          <button
            className="h-[34px] px-[16px] rounded-[6px] bg-[#131212] text-white text-[14px] cursor-pointer hover:opacity-80 active:opacity-60 transition-opacity"
            style={{ fontFamily: "PingFang SC, sans-serif" }}
            onClick={() => { onConfirm(); onClose(); }}
          >确定</button>
        </div>
      </div>
    </div>
  );
}
