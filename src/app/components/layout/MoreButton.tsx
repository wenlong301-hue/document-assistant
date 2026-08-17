export function MoreButton() {
  return (
    <div className="bg-white flex items-center justify-center h-[32px] px-[10px] relative rounded-[8px] shrink-0 cursor-pointer transition-colors hover:bg-[#F7F8FA] active:bg-[#EBECF0]">
      <div aria-hidden className="absolute border border-[#EBECF0] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <svg className="relative size-[16px] block" fill="none" viewBox="0 0 16 16">
        <circle cx="3.5" cy="8" r="1.25" fill="#131212" />
        <circle cx="8" cy="8" r="1.25" fill="#131212" />
        <circle cx="12.5" cy="8" r="1.25" fill="#131212" />
      </svg>
    </div>
  );
}
