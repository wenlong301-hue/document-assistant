export function MoreButton() {
  return (
    <div className="bg-white content-stretch flex flex-col h-[32px] items-center justify-center px-[10px] relative rounded-[6px] shrink-0 cursor-pointer transition-colors hover:bg-[#EBECF0] active:bg-[#dddee3]">
      <div aria-hidden className="absolute border-[#ececec] border-[0.6px] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <svg className="relative size-[16px]" fill="none" viewBox="0 0 16 16">
        <circle cx="3.5" cy="8" r="1.25" fill="black" />
        <circle cx="8" cy="8" r="1.25" fill="black" />
        <circle cx="12.5" cy="8" r="1.25" fill="black" />
      </svg>
    </div>
  );
}
