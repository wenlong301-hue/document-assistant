import { assetUrl } from "@/app/shared/utils/assetUrl";

export function LogoIcon() {
  return <img src={assetUrl("icons/logo.svg")} alt="" className="size-[26px]" />;
}

