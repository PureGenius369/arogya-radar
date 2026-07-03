export default function Sparkline({
  data,
  width = 110,
  height = 26,
  stroke = "#0e7490",
}: {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
}) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * (width - 2) + 1;
      const y = height - 2 - (v / max) * (height - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg className="spark" width={width} height={height} aria-hidden="true">
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" points={points} />
    </svg>
  );
}
