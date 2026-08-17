export function SaveButton({ label = "保存" }: { label?: string }) {
  return (
    <div className="bg-[#131212] flex items-center justify-center h-[32px] px-[12px] relative rounded-[8px] shrink-0">
      <p className="font-['PingFang_SC:Regular',sans-serif] leading-none not-italic text-[14px] text-white whitespace-nowrap">{label}</p>
    </div>
  );
}
