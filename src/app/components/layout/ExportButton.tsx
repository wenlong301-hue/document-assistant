import { ExportIcon } from "./ExportIcon";

export function ExportButton() {
  return (
    <div className="bg-[#131212] flex items-center justify-center gap-[8px] h-[32px] px-[12px] relative rounded-[8px] shrink-0">
      <ExportIcon />
      <p className="font-['PingFang_SC:Regular',sans-serif] leading-none not-italic text-[14px] text-white whitespace-nowrap">导出</p>
    </div>
  );
}
