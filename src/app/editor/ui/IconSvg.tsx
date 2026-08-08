import React from "react";

export function IconSvg({ path, fill, stroke, viewBox = "0 0 20 20", isFill }: { path: string | string[]; fill?: string; stroke?: string; viewBox?: string; isFill?: boolean }) {
  return (
    <div className="absolute left-[4px] size-[20px] top-[4px]">
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

export function InlineIconSvg({ path, fill, stroke, viewBox = "0 0 20 20", isFill }: { path: string | string[]; fill?: string; stroke?: string; viewBox?: string; isFill?: boolean }) {
  return (
    <svg className="block size-[16px]" fill="none" preserveAspectRatio="xMidYMid meet" viewBox={viewBox} aria-hidden="true">
      {(Array.isArray(path) ? path : [path]).map((d, i) => (
        isFill
          ? <path key={i} d={d} fill={fill ?? "#131212"} />
          : <path key={i} d={d} stroke={stroke ?? "#131212"} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" />
      ))}
    </svg>
  );
}
