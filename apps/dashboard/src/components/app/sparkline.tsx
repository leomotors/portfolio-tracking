import { useMemo } from "react";

interface SparklineProps {
  data: { value: number }[];
  width?: number;
  height?: number;
  accent?: string;
}

export function Sparkline({
  data,
  width = 70,
  height = 22,
  accent = "var(--accent-pos)",
}: SparklineProps) {
  const path = useMemo(() => {
    if (data.length === 0) return "";
    const vals = data.map((d) => d.value);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const range = maxV - minV || 1;
    return data
      .map((d, i) => {
        const x = (i * width) / Math.max(1, data.length - 1);
        const y = (1 - (d.value - minV) / range) * height;
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }, [data, width, height]);

  if (data.length === 0) {
    return <span className="inline-block" style={{ width, height }} />;
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      style={{ display: "block" }}
    >
      <path
        d={path}
        fill="none"
        stroke={accent}
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
