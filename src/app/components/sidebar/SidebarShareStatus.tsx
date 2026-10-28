import { assetUrl } from "@/app/shared/utils/assetUrl";

export function SidebarShareStatus({ shared, collabActive = false, onClick, onCollabClick }: { shared: boolean; collabActive?: boolean; onClick: () => void; onCollabClick?: () => void }) {
  return (
    <div className="absolute bottom-0 left-0 z-[2] h-[40px] w-[276px] bg-[#F7F8FA]">
      <div className="h-px mx-[20px] bg-[#EBECF0]" />
      <div className="flex items-center h-[39px] px-[20px] gap-[8px]">
        <div
          className="flex items-center gap-[8px] px-[6px] py-[8px] cursor-pointer group flex-1 min-w-0"
          onClick={onClick}
        >
          <img src={assetUrl("icons/wifi-off.svg")} alt="" className="size-[16px] shrink-0" />
          <p className={`font-['PingFang_SC:Regular',sans-serif] text-[14px] leading-[normal] truncate transition-colors ${shared ? "text-[#15803D]" : "text-[#8D8E99] group-hover:text-[#131212]"}`}>
            {shared ? "分享中" : "未开启分享"}
          </p>
        </div>
        <div
          className="flex items-center px-[6px] py-[8px] cursor-pointer group shrink-0"
          onClick={onCollabClick}
        >
          <p className={`font-['PingFang_SC:Regular',sans-serif] text-[14px] leading-[normal] transition-colors ${collabActive ? "text-[#15803D]" : "text-[#8D8E99] group-hover:text-[#131212]"}`}>
            {collabActive ? "协同中" : "协同"}
          </p>
        </div>
      </div>
    </div>
  );
}
