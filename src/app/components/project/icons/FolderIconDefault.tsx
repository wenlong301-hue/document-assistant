import { assetUrl } from "@/app/shared/utils/assetUrl";

export function FolderIconDefault() {
  return <img src={assetUrl("icons/folder-icon.svg")} alt="" className="w-[52px] h-[48px]" />;
}

