import svgPaths from "@/imports/首页文档模式/svg-8pwaal4bp9";

export function FolderIcon({ color = "#131212" }: { color?: string }) {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="folder">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <path d={svgPaths.p2d6a180} id="Icon" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
      </svg>
    </div>
  );
}
