// components/shared/PentaSchoolLogo.tsx
// Dùng chung cho Header, Hero và bất kỳ nơi nào cần logo

interface PentaSchoolLogoProps {
  size?: number;          // kích thước ngũ giác (px) — default 40
  showText?: boolean;     // hiển thị chữ "Penta School" — default true
  textSize?: string;      // tailwind class cho font-size — default "text-xl"
}

export default function PentaSchoolLogo({
  size = 40,
  showText = true,
  textSize = "text-xl",
}: PentaSchoolLogoProps) {
  const cx = size / 2;
  const cy = size / 2;
  const R  = size * 0.47;      // outer pentagon radius
  const bookR = size * 0.235;  // half-size of inner book canvas

  // 5 vertices, starting from top
  const pts = Array.from({ length: 5 }, (_, i) => {
    const a = (i * 72 - 90) * (Math.PI / 180);
    return [cx + R * Math.cos(a), cy + R * Math.sin(a)] as [number, number];
  });

  // Blue-to-cyan palette — one colour per triangle
  const colors = ["#2563eb", "#0891b2", "#1d4ed8", "#0e7490", "#3b82f6"];

  const bs = bookR * 2;   // book SVG canvas size
  const bx = cx - bookR;
  const by = cy - bookR;

  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* ── Pentagon SVG ── */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* 5 coloured triangles */}
        {pts.map(([px, py], i) => {
          const [nx, ny] = pts[(i + 1) % 5];
          return (
            <polygon
              key={i}
              points={`${cx},${cy} ${px},${py} ${nx},${ny}`}
              fill={colors[i]}
              opacity="0.94"
            />
          );
        })}

        {/* Thin white seam lines between triangles */}
        {pts.map(([px, py], i) => (
          <line
            key={`seam${i}`}
            x1={cx} y1={cy}
            x2={px} y2={py}
            stroke="white"
            strokeWidth={size * 0.012}
            opacity="0.22"
          />
        ))}

        {/* Pentagon outline */}
        <polygon
          points={pts.map(p => p.join(",")).join(" ")}
          fill="none"
          stroke="white"
          strokeWidth={size * 0.015}
          opacity="0.18"
        />

        {/* Dark circle background for the book icon */}
        <circle
          cx={cx} cy={cy}
          r={bookR + size * 0.04}
          fill="#0f172a"
          opacity="0.82"
        />
        <circle
          cx={cx} cy={cy}
          r={bookR + size * 0.04}
          fill="none"
          stroke="white"
          strokeWidth={size * 0.012}
          opacity="0.18"
        />

        {/* Book-open icon centred inside the circle */}
        <g transform={`translate(${bx}, ${by})`}>
          <svg
            width={bs}
            height={bs}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* left page */}
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            {/* right page */}
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </g>
      </svg>

      {/* ── Text ── */}
      {showText && (
        <span
          className={`font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 ${textSize}`}
        >
          Penta School
        </span>
      )}
    </div>
  );
}