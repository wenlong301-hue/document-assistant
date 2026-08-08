import svgPaths from "./svg-kvilwhz9cx";

function Plus() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="plus-01">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="plus-01">
          <path d="M8 3.2L8 12.8M12.8 8L3.2 8" id="Icon" stroke="var(--stroke-0, #131212)" strokeLinecap="round" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
      <Plus />
      <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic overflow-hidden relative shrink-0 text-[#131212] text-[14px] text-ellipsis whitespace-nowrap">添加子文档</p>
    </div>
  );
}

function Frame1() {
  return (
    <div className="bg-[#ebecf0] relative rounded-[4px] shrink-0 w-full">
      <div className="content-stretch flex flex-col items-start px-[12px] py-[6px] relative size-full">
        <Frame />
      </div>
    </div>
  );
}

function EditContained() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="edit-contained">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="edit-contained">
          <path d={svgPaths.pb1c0600} id="Icon" stroke="var(--stroke-0, #131212)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

function Frame3() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
      <EditContained />
      <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic overflow-hidden relative shrink-0 text-[#131212] text-[14px] text-ellipsis whitespace-nowrap">重命名</p>
    </div>
  );
}

function Frame2() {
  return (
    <div className="bg-white relative rounded-[4px] shrink-0 w-full">
      <div className="content-stretch flex flex-col items-start px-[12px] py-[6px] relative size-full">
        <Frame3 />
      </div>
    </div>
  );
}

function Download() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="download-02">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="download-02">
          <path d={svgPaths.p3809f980} id="Icon" stroke="var(--stroke-0, #131212)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

function Frame6() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
      <Download />
      <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic overflow-hidden relative shrink-0 text-[#131212] text-[14px] text-ellipsis whitespace-nowrap">导出HTML</p>
    </div>
  );
}

function Frame4() {
  return (
    <div className="bg-white relative rounded-[4px] shrink-0 w-full">
      <div className="content-stretch flex flex-col items-start px-[12px] py-[6px] relative size-full">
        <Frame6 />
      </div>
    </div>
  );
}

function Trash() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="trash-03">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="trash-03">
          <path d={svgPaths.p1db5f00} id="Icon" stroke="var(--stroke-0, #131212)" strokeLinecap="round" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}

function Frame8() {
  return (
    <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
      <Trash />
      <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic overflow-hidden relative shrink-0 text-[#131212] text-[14px] text-ellipsis whitespace-nowrap">删除</p>
    </div>
  );
}

function Frame7() {
  return (
    <div className="bg-white relative rounded-[4px] shrink-0 w-full">
      <div className="content-stretch flex flex-col items-start px-[12px] py-[6px] relative size-full">
        <Frame8 />
      </div>
    </div>
  );
}

function Frame5() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[4px] items-start left-0 top-0 w-[118px]">
      <Frame1 />
      <Frame2 />
      <Frame4 />
      <Frame7 />
    </div>
  );
}

export default function Group() {
  return (
    <div className="contents relative size-full">
      <div className="absolute bg-white border border-[#ebecf0] border-solid h-[156px] left-0 rounded-[8px] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] top-0 w-[134px]" />
      <Frame5 />
    </div>
  );
}