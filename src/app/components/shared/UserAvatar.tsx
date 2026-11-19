const AVATAR_COLORS = [
  "#134CFF",
  "#E53E3E",
  "#15803D",
  "#D97706",
  "#7C3AED",
  "#0F766E",
  "#DB2777",
  "#1D4ED8",
] as const;

/** 没有服务端颜色时，按名字稳定地挑一个头像底色（同一名字每次一致） */
export function avatarColorFor(seed: string): string {
  const value = String(seed || "?");
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** 头像：用户名的第一个字 + 纯色底（颜色优先取服务端分配的协同色） */
export function UserAvatar({
  name,
  color,
  size = 24,
  title,
  className = "",
}: {
  name?: string;
  color?: string;
  size?: number;
  title?: string;
  className?: string;
}) {
  const label = String(name || "?").trim() || "?";
  const initial = Array.from(label)[0]?.toUpperCase() || "?";
  const background = color || avatarColorFor(label);
  return (
    <span
      className={`shrink-0 rounded-full inline-flex items-center justify-center text-white font-medium select-none align-middle ${className}`}
      style={{
        width: size,
        height: size,
        background,
        fontSize: Math.max(10, Math.round(size * 0.42)),
        lineHeight: 1,
        fontFamily: "PingFang SC, sans-serif",
      }}
      title={title ?? label}
      aria-label={label}
    >
      {initial}
    </span>
  );
}
