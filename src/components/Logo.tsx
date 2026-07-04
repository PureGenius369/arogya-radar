// Arogya Radar mark: three concentric rings in the Indian tricolour
// (saffron, white, green) = India + radar/early-warning, with a mint
// heartbeat pulse through the centre = health.
export default function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Arogya Radar logo"
      style={{ display: "block", flexShrink: 0 }}
    >
      <circle cx="24" cy="24" r="20" fill="none" stroke="#FF9933" strokeWidth="3" />
      <circle cx="24" cy="24" r="13.5" fill="none" stroke="#FFFFFF" strokeWidth="3" />
      <circle cx="24" cy="24" r="7" fill="none" stroke="#17A34A" strokeWidth="3" />
      <polyline
        points="2,24 14,24 17.5,24 21,13 25,35 28.5,18 31.5,24 46,24"
        fill="none"
        stroke="#5EEAD4"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
