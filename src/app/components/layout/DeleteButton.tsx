import { TrashIcon } from "./TrashIcon";

export function DeleteButton() {
  return (
    <div className="bg-white content-stretch flex flex-col h-[32px] items-center px-[12px] py-[6px] relative rounded-[6px] shrink-0 cursor-pointer transition-colors hover:bg-[#EBECF0] active:bg-[#dddee3]">
      <div aria-hidden className="absolute border-[#ececec] border-[0.6px] border-solid inset-0 pointer-events-none rounded-[6px]" />
      <div className="content-stretch flex gap-[8px] items-center relative shrink-0">
        <TrashIcon />
        <p className="[word-break:break-word] font-['PingFang_SC:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[14px] text-black whitespace-nowrap">删除</p>
      </div>
    </div>
  );
}
