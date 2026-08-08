import svgPaths from "./svg-45o8nxn78h";

function X() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute left-1/2 size-[16px] top-1/2" data-name="x-01">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="x-01">
          <path d={svgPaths.p163cf00} id="Icon" stroke="var(--stroke-0, #131212)" strokeLinecap="round" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

function Frame1() {
  return (
    <div className="bg-white col-1 ml-[476px] mt-[20px] overflow-clip relative rounded-[4px] row-1 size-[20px]">
      <X />
    </div>
  );
}

function Group() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0">
      <div className="bg-white col-1 h-[40px] ml-0 mt-0 relative rounded-tl-[16px] rounded-tr-[16px] row-1 w-[520px]" />
      <p className="[word-break:break-word] col-1 font-['PingFang_SC:Medium',sans-serif] leading-[normal] ml-[24px] mt-[18px] not-italic relative row-1 text-[#131212] text-[16px] whitespace-nowrap">分享文档</p>
      <Frame1 />
    </div>
  );
}

function Group2() {
  return (
    <div className="col-1 h-[32px] ml-[82.63%] mt-[17px] relative row-1 w-[13.98%]">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 66 32">
        <g id="Group 16">
          <rect fill="var(--fill-0, #2AB673)" height="32" id="Rectangle 29" rx="16" width="66" />
          <circle cx="50" cy="16" fill="var(--fill-0, white)" id="Ellipse 2" r="12" />
        </g>
      </svg>
    </div>
  );
}

function Group3() {
  return (
    <div className="col-1 grid-rows-[max-content] inline-grid ml-[4.62%] mt-[104px] place-items-start relative row-1 w-[90.76%]">
      <div className="bg-[rgba(42,182,115,0.1)] col-1 h-[66px] ml-0 mt-0 relative rounded-[12px] row-1 w-full" />
      <Group2 />
      <p className="[word-break:break-word] col-1 font-['PingFang_SC:Medium',sans-serif] leading-[normal] ml-[3.39%] mt-[12px] not-italic relative row-1 text-[#15803d] text-[14px] w-[11.86%] whitespace-nowrap">开启分享</p>
      <p className="[word-break:break-word] col-1 font-['PingFang_SC:Regular',sans-serif] leading-[normal] ml-[3.39%] mt-[36px] not-italic relative row-1 text-[#8d8e99] text-[13px] w-[73.73%] whitespace-nowrap">链接已生成，点击复制链接后发给同一Wi-Fi / 局域网内的人</p>
    </div>
  );
}

function Frame() {
  return (
    <div className="bg-[#131212] col-1 content-stretch flex flex-col items-start ml-[77.97%] mt-[40px] px-[16px] py-[10px] relative rounded-[6px] row-1 w-[18.64%]">
      <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">复制链接</p>
    </div>
  );
}

function Group4() {
  return (
    <div className="col-1 grid-rows-[max-content] inline-grid ml-[4.62%] mt-[182px] place-items-start relative row-1 w-[90.76%]">
      <div className="bg-[rgba(245,245,244,0.5)] col-1 h-[96px] ml-0 mt-0 relative rounded-[12px] row-1 w-full" />
      <Frame />
      <div className="bg-white border border-[#ebecf0] border-solid col-1 h-[40px] ml-[3.39%] mt-[40px] relative rounded-[6px] row-1 w-[72.03%]" />
      <p className="[word-break:break-word] col-1 font-['PingFang_SC:Regular',sans-serif] leading-[normal] ml-[6.78%] mt-[50px] not-italic relative row-1 text-[#131212] text-[14px] tracking-[1.12px] w-[40.89%]">{`http://192.168.3.25:6535`}</p>
      <p className="[word-break:break-word] col-1 font-['PingFang_SC:Medium',sans-serif] leading-[normal] ml-[3.39%] mt-[12px] not-italic relative row-1 text-[#131212] text-[14px] w-[11.86%] whitespace-nowrap">访问链接</p>
    </div>
  );
}

function Group1() {
  return (
    <div className="grid-rows-[max-content] inline-grid place-items-start relative shrink-0 w-full">
      <div className="bg-white col-1 h-[310px] ml-0 mt-0 relative row-1 w-full" />
      <Group3 />
      <Group4 />
      <p className="[word-break:break-word] col-1 font-['PingFang_SC:Regular',sans-serif] leading-[normal] ml-[4.62%] mt-[52px] not-italic relative row-1 text-[#8d8e99] text-[13px] w-[90.76%]">开启后，复制链接发给同事；对方用浏览器打开网址即可查看文档。</p>
      <p className="[word-break:break-word] col-1 font-['PingFang_SC:Regular',sans-serif] leading-[normal] ml-[4.62%] mt-[74px] not-italic relative row-1 text-[#8d8e99] text-[13px] w-[90.76%]">注意：您的电脑和文档助手需要保持开启，别人才能访问。</p>
      <p className="[word-break:break-word] col-1 font-['PingFang_SC:Medium',sans-serif] leading-[normal] ml-[4.62%] mt-[24px] not-italic relative row-1 text-[#131212] text-[14px] w-[90.76%]">分享给同一Wi-Fi / 局域网内的人</p>
    </div>
  );
}

export default function Component() {
  return (
    <div className="bg-white relative rounded-[16px] size-full" data-name="分享文档-已开启">
      <div className="content-stretch flex flex-col items-start leading-[0] overflow-clip relative rounded-[inherit] size-full">
        <Group />
        <Group1 />
      </div>
      <div aria-hidden className="absolute border border-[#e0e0e0] border-solid inset-0 pointer-events-none rounded-[16px]" />
    </div>
  );
}