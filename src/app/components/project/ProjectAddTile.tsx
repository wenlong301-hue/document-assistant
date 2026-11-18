/** 与项目卡片同尺寸的「新增」占位瓦片，用于云端/本地项目分组的空位 */
export function ProjectAddTile({
  label,
  onClick,
  className = "",
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`group shrink-0 w-[142px] h-[138px] box-border rounded-[6px] border border-dashed border-[#E0E0E0] bg-transparent
        flex flex-col items-center justify-center gap-[8px] cursor-pointer transition-colors
        hover:border-[#C0C4CC] hover:bg-[#F7F8FA] ${className}`}
      onClick={onClick}
    >
      <span className="size-[32px] rounded-full bg-[#F7F8FA] group-hover:bg-white flex items-center justify-center transition-colors">
        <svg
          className="size-[16px] text-[#8D8E99] group-hover:text-[#131212] transition-colors"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path d="M8 3.2V12.8M12.8 8H3.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </span>
      <span className="text-[13px] leading-[18px] text-[#8D8E99] group-hover:text-[#131212] transition-colors font-['PingFang_SC:Regular',sans-serif]">
        {label}
      </span>
    </button>
  );
}
