export default function Logo({ size = 22 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M7 4 L18 12 L7 20 Z" />
        <line x1="19.5" y1="9" x2="22" y2="9" />
        <line x1="19.5" y1="12" x2="22" y2="12" />
        <line x1="19.5" y1="15" x2="22" y2="15" />
      </svg>
      <span
        className="font-bold"
        style={{
          fontSize: size * 0.95,
          letterSpacing: "-0.028em",
          lineHeight: 1,
        }}
      >
        Prism
      </span>
    </span>
  );
}
