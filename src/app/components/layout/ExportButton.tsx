import { ExportIcon } from "./ExportIcon";

export function ExportButton() {
  return (
    <div className="bg-black content-stretch flex flex-col h-[32px] items-center px-[12px] py-[6px] relative rounded-[6px] shrink-0">
      <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
        <ExportIcon />
        <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">导出</p>
      </div>
    </div>
  );
}
