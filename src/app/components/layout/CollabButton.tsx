export function CollabButton({ active = false }: { active?: boolean }) {
  return (
    <div className="bg-white flex items-center justify-center gap-[8px] h-[32px] px-[12px] relative rounded-[8px] shrink-0 cursor-pointer transition-colors hover:bg-[#F7F8FA] active:bg-[#EBECF0]">
      <div aria-hidden className="absolute border border-[#EBECF0] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <svg className="relative size-[16px] block" fill="none" viewBox="0 0 16 16">
        <circle cx="6" cy="6" r="2.2" stroke={active ? "#15803D" : "#131212"} strokeWidth="1.2" />
        <circle cx="11" cy="6.5" r="1.8" stroke={active ? "#15803D" : "#131212"} strokeWidth="1.2" />
        <path d="M2.5 13c.4-2 1.8-3.2 3.5-3.2S9.1 11 9.5 13" stroke={active ? "#15803D" : "#131212"} strokeLinecap="round" strokeWidth="1.2" />
        <path d="M9.8 10.2c1.4 0 2.5.9 2.9 2.3" stroke={active ? "#15803D" : "#131212"} strokeLinecap="round" strokeWidth="1.2" />
      </svg>
      <p className={`relative font-['PingFang_SC:Regular',sans-serif] leading-none not-italic text-[14px] whitespace-nowrap ${active ? "text-[#15803D]" : "text-[#131212]"}`}>协同</p>
    </div>
  );
}
