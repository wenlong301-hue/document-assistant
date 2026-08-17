import { assetUrl } from "@/app/shared/utils/assetUrl";

export function SidebarModeHeader({ onNewDoc, onNewFile, mode, onSwitchMode }: { onNewDoc: () => void; onNewFile: () => void; mode: "document" | "outline"; onSwitchMode: () => void }) {
  const isOutline = mode === "outline";
  return (
    <div className="absolute content-stretch flex items-center justify-between left-[20px] top-[122px] w-[276px]">
      <div
        className="inline-flex items-center gap-[8px] h-[36px] px-[8px] box-border relative shrink-0 cursor-pointer rounded-[8px] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors duration-150"
        onClick={onSwitchMode}
      >
        <img src={assetUrl("icons/folder-open.svg")} alt="" className="size-[20px] shrink-0" />
        <p className="font-['PingFang_SC:Medium',sans-serif] font-medium leading-[22px] relative shrink-0 text-[#131212] text-[16px] whitespace-nowrap">
          {isOutline ? "大纲树" : "文件树"}
        </p>
      </div>
      <div
        className="inline-flex items-center gap-[8px] h-[32px] px-[8px] box-border relative shrink-0 cursor-pointer rounded-[8px] hover:bg-[#EBECF0] active:bg-[#dddee3] transition-colors duration-150"
        onClick={isOutline ? onNewFile : onNewDoc}
      >
        <img src={assetUrl("icons/plus-02.svg")} alt="" className="size-[16px] shrink-0" />
        <p className="font-['PingFang_SC:Regular',sans-serif] leading-[20px] relative shrink-0 text-[#131212] text-[14px] whitespace-nowrap">
          {isOutline ? "新建层级" : "新建文件"}
        </p>
      </div>
    </div>
  );
}
