import { assetUrl } from "@/app/shared/utils/assetUrl";

export function FileProjectIcon({ className = "w-[52px] h-[48px]" }: { className?: string }) {
  return <img src={assetUrl("icons/file-project-icon.svg")} alt="" className={className} />;
}
