import svgPaths from "@/imports/首页文档模式/svg-8pwaal4bp9";

export function FolderPathBar({ folderName, hasFolder, onOpen, onClose }: { folderName: string; hasFolder: boolean; onOpen: () => void; onClose?: () => void }) {
  return (
    <div className="absolute content-stretch flex items-center left-[20px] px-[8px] py-[8px] top-[170px] w-[276px]">
      <div
        className="flex items-center gap-[8px] flex-1 min-w-0 cursor-pointer rounded-[6px] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors duration-150 px-[4px] py-[3px]"
        onClick={onOpen}
        title={hasFolder ? "点击切换文件夹" : "点击打开文件夹"}
      >
        <div className="relative shrink-0 size-[16px]">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
            <path d={svgPaths.p3d9dd500} id="Icon" stroke="#93959F" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
          </svg>
        </div>
        <p className="[word-break:break-word] flex-1 min-w-0 font-['PingFang_SC:Medium',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#93959f] text-[12px] truncate">{folderName}</p>
        {hasFolder && onClose && (
          <span
            className="shrink-0 flex items-center justify-center size-[16px] rounded-[4px] text-[#93959F] hover:text-[#131212] hover:bg-[#d5d6da] transition-colors"
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            title="返回默认文件夹"
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M12 12L4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.4" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}
