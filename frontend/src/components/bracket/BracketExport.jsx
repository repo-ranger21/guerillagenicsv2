export default function BracketExport({ onExport }) {
  return (
    <button
      onClick={onExport}
      className="px-4 py-2 border border-border-default label-sm text-text-muted hover:text-text-primary hover:border-border-active transition-colors"
    >
      EXPORT PNG →
    </button>
  );
}
