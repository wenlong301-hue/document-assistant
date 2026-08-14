import { assetUrl } from "@/app/shared/utils/assetUrl";

export function SidebarShareStatus({ shared, onClick }: { shared: boolean; onClick: () => void }) {
  return (
    <div className="absolute bottom-0 left-0 w-[276px]">
      <div className="h-[0.6px] mx-[20px] bg-[#EBECF0]" />
      <div className="flex items-center">
        <div
          className="flex items-center gap-[8px] px-[6px] py-[8px] cursor-pointer group flex-1"
          onClick={onClick}
        >
          <img src={assetUrl("icons/wifi-off.svg")} alt="" className="size-[16px] shrink-0" />
          <p className={`font-['PingFang_SC:Regular',sans-serif] text-[14px] leading-[normal] transition-colors ${shared ? "text-[#15803d]" : "text-[#8D8E99] group-hover:text-[#131212]"}`}>
            {shared ? "分享中" : "未开启分享"}
          </p>
        </div>
      </div>
    </div>
  );
}
