import { assetUrl } from "@/app/shared/utils/assetUrl";

export function EmptyStateIllustration() {
  return (
    <img src={assetUrl("empty-state.png")} alt="" className="w-[280px] h-[210px] object-contain" />
  );
}

