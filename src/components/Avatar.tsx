interface Props {
  name: string;
  color?: string;
  size?: number;
  online?: boolean;
}

export function Avatar({ name, color = "oklch(0.72 0.21 295)", size = 40, online }: Props) {
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex h-full w-full items-center justify-center rounded-full font-display font-semibold text-background"
        style={{
          background: `linear-gradient(135deg, ${color}, oklch(from ${color} calc(l - 0.15) c h))`,
          fontSize: size * 0.4,
          boxShadow: `0 4px 16px -4px ${color}`,
        }}
      >
        {initials}
      </div>
      {online !== undefined && (
        <span
          className="absolute bottom-0 right-0 block rounded-full ring-2 ring-background"
          style={{
            width: size * 0.28,
            height: size * 0.28,
            background: online ? "oklch(0.78 0.18 160)" : "oklch(0.5 0.02 270)",
          }}
        />
      )}
    </div>
  );
}
