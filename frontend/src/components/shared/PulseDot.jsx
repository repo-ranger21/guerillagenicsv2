export default function PulseDot({ color = "var(--signal-needle)", size = 6 }) {
  return (
    <span
      className="rounded-full animate-needle-pulse inline-block"
      style={{ width: size, height: size, backgroundColor: color }}
    />
  );
}
