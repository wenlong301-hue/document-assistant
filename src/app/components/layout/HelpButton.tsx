export function HelpButton() {
  return (
    <div className="bg-white flex items-center justify-center gap-[8px] h-[32px] px-[12px] relative rounded-[8px] shrink-0 cursor-pointer transition-colors hover:bg-[#F7F8FA] active:bg-[#EBECF0]">
      <div aria-hidden className="absolute border border-[#EBECF0] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="relative shrink-0 size-[16px]">
        <svg className="block size-full" fill="none" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6.2" stroke="#131212" strokeWidth="1.2" />
          <path d="M6.6 6.2c0-1 .8-1.8 1.8-1.8s1.8.7 1.8 1.7c0 .9-.6 1.3-1.2 1.7-.4.2-.6.4-.6.8v.4" stroke="#131212" strokeLinecap="round" strokeWidth="1.2" />
          <circle cx="8" cy="11.4" r="0.7" fill="#131212" />
        </svg>
      </div>
      <p className="relative font-['PingFang_SC:Regular',sans-serif] leading-none not-italic text-[14px] text-[#131212] whitespace-nowrap">帮助</p>
    </div>
  );
}
