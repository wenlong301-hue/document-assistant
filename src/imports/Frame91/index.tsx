import svgPaths from "./svg-mnkp41cgqd";

function WifiOn() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="wifi-on">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="wifi-on">
          <path d={svgPaths.pbf2d700} id="Icon" stroke="var(--stroke-0, #15803D)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

export default function Frame() {
  return (
    <div className="content-stretch flex gap-[8px] items-center px-[8px] py-[6px] relative size-full">
      <WifiOn />
      <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#15803d] text-[14px] whitespace-nowrap">分享中</p>
    </div>
  );
}