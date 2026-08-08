import svgPaths from "./svg-wi3f4os8di";

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

function Frame2() {
  return (
    <div className="bg-white col-1 ml-[334px] mt-[20px] overflow-clip relative rounded-[4px] row-1 size-[20px]">
      <X />
    </div>
  );
}

function Group() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0">
      <div className="bg-white col-1 h-[40px] ml-0 mt-0 relative rounded-tl-[16px] rounded-tr-[16px] row-1 w-[378px]" />
      <p className="[word-break:break-word] col-1 font-['PingFang_SC:Medium',sans-serif] leading-[normal] ml-[24px] mt-[18px] not-italic relative row-1 text-[#131212] text-[16px] whitespace-nowrap">提示</p>
      <Frame2 />
    </div>
  );
}

function AlertCircle() {
  return (
    <div className="col-1 ml-[24px] mt-[24px] relative row-1 size-[20px]" data-name="alert-circle">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="alert-circle">
          <path d={svgPaths.pf7a1b80} id="Icon" stroke="var(--stroke-0, black)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" />
        </g>
      </svg>
    </div>
  );
}

function Group1() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0">
      <div className="bg-white col-1 h-[76px] ml-0 mt-0 relative row-1 w-[378px]" />
      <div className="[word-break:break-word] col-1 font-['PingFang_SC:Regular',sans-serif] ml-[52px] mt-[24px] not-italic relative row-1 text-[#606266] text-[14px] w-[302px]">
        <p className="leading-[normal] mb-0">确定删除【文件名称 1】 及其 8 个子文档？</p>
        <p className="leading-[normal]">不可撤销。</p>
      </div>
      <AlertCircle />
    </div>
  );
}

function Group2() {
  return (
    <div className="col-1 grid-cols-[max-content] grid-rows-[max-content] inline-grid ml-0 mt-0 place-items-start relative row-1">
      <div className="bg-white col-1 h-[54px] ml-0 mt-0 relative rounded-bl-[12px] rounded-br-[12px] row-1 w-[378px]" />
    </div>
  );
}

function Frame1() {
  return (
    <div className="bg-white content-stretch flex flex-col items-start px-[16px] py-[6px] relative rounded-[6px] shrink-0">
      <div aria-hidden className="absolute border border-[#ebecf0] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#131212] text-[14px] whitespace-nowrap">取消</p>
    </div>
  );
}

function Frame() {
  return (
    <div className="bg-[#131212] content-stretch flex flex-col items-start px-[16px] py-[6px] relative rounded-[6px] shrink-0">
      <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[14px] text-white whitespace-nowrap">确定</p>
    </div>
  );
}

function Frame3() {
  return (
    <div className="col-1 content-stretch flex gap-[12px] items-center ml-[222px] mt-[6px] relative row-1">
      <Frame1 />
      <Frame />
    </div>
  );
}

function Group3() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0">
      <Group2 />
      <Frame3 />
    </div>
  );
}

export default function Component() {
  return (
    <div className="bg-white relative rounded-[16px] size-full" data-name="删除提示确认">
      <div className="content-stretch flex flex-col items-start leading-[0] overflow-clip relative rounded-[inherit] size-full">
        <Group />
        <Group1 />
        <Group3 />
      </div>
      <div aria-hidden className="absolute border border-[#e0e0e0] border-solid inset-0 pointer-events-none rounded-[16px] shadow-[0px_2px_12px_0px_rgba(0,0,0,0.1)]" />
    </div>
  );
}