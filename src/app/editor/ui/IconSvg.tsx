export function IconSvg({ path, fill, stroke, viewBox = "0 0 20 20", isFill }: { path: string | string[]; fill?: string; stroke?: string; viewBox?: string; isFill?: boolean }) {
  return (
    <div className="absolute left-[2px] size-[20px] top-[2px]">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox={viewBox}>
        {(Array.isArray(path) ? path : [path]).map((d, i) => (
          isFill
            ? <path key={i} d={d} fill={fill ?? "#131212"} />
            : <path key={i} d={d} stroke={stroke ?? "#131212"} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
        ))}
      </svg>
    </div>
  );
}
