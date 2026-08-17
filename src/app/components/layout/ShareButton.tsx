import { ShareIcon } from "./ShareIcon";

export function ShareButton() {
  return (
    <div className="bg-white flex items-center justify-center gap-[8px] h-[32px] px-[12px] relative rounded-[8px] shrink-0 cursor-pointer transition-colors hover:bg-[#F7F8FA] active:bg-[#EBECF0]">
      <div aria-hidden className="absolute border border-[#EBECF0] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <ShareIcon />
      <p className="relative font-['PingFang_SC:Regular',sans-serif] leading-none not-italic text-[14px] text-[#131212] whitespace-nowrap">分享</p>
    </div>
  );
}
