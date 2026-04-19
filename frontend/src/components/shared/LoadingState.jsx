export default function LoadingState({ label = "LOADING" }) {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <div className="font-display text-[48px] text-text-ghost animate-pulse">{label}</div>
        <div className="label-xs text-text-muted mt-3">FETCHING DATA</div>
      </div>
    </div>
  );
}
