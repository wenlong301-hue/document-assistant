import { BrandIcon } from "./BrandIcon";

export function BrandTitle() {
  return (
    <div className="content-stretch flex gap-[6px] items-center relative shrink-0">
      <BrandIcon />
      <p className="[word-break:break-word] font-['Alimama_FangYuanTi_VF:SemiBold-Square',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[18px] text-black whitespace-nowrap" style={{ fontVariationSettings: '"BEVL" 1' }}>
        文档助手
      </p>
    </div>
  );
}
