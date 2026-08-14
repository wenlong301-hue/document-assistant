export function HelpButton() {
  return (
    <div className="bg-white content-stretch flex flex-col h-[32px] items-center px-[12px] py-[6px] relative rounded-[6px] shrink-0 cursor-pointer transition-colors hover:bg-[#EBECF0] active:bg-[#dddee3]">
      <div aria-hidden className="absolute border-[#ececec] border-[0.6px] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
        <div className="relative shrink-0 size-[16px]">
          <svg className="absolute block inset-0 size-full" fill="none" viewBox="0 0 16 16">
            <circle cx="8" cy="8" r="6.2" stroke="black" strokeWidth="1.2" />
            <path d="M6.6 6.2c0-1 .8-1.8 1.8-1.8s1.8.7 1.8 1.7c0 .9-.6 1.3-1.2 1.7-.4.2-.6.4-.6.8v.4" stroke="black" strokeLinecap="round" strokeWidth="1.2" />
            <circle cx="8" cy="11.4" r="0.7" fill="black" />
          </svg>
        </div>
        <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[14px] text-black whitespace-nowrap">帮助</p>
      </div>
    </div>
  );
}
