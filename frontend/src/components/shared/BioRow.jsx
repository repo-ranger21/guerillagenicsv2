export default function BioRow({ label, value, highlight = false }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border-dim">
      <span className="label-xs text-text-muted">{label}</span>
      <span
        className={`font-mono text-[10px] ${highlight ? "text-gg-green-500" : "text-text-secondary"}`}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}
