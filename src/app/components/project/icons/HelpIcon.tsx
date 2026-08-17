import { assetUrl } from "@/app/shared/utils/assetUrl";

export function HelpIcon() {
  return <img src={assetUrl("icons/book.svg")} alt="" className="size-[16px] block shrink-0" />;
}
