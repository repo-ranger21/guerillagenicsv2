import { useParams } from "react-router-dom";
import { useBracket } from "../../hooks/useBracket.js";
import BracketMatchup from "./BracketMatchup.jsx";
import LoadingState from "../shared/LoadingState.jsx";
import ErrorState from "../shared/ErrorState.jsx";

export default function PlayoffBracket() {
  const { sport } = useParams();
  const { data, isLoading, error, refetch } = useBracket(sport);

  if (isLoading) return <LoadingState label="SIMULATING BRACKET" />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  const championProbs = data?.bracket?.champion_probs ?? {};
  const sorted = Object.entries(championProbs)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 16);

  return (
    <div className="min-h-screen bg-bg-void p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="font-display text-[32px] text-text-primary">
            {sport?.toUpperCase()} BRACKET SIMULATOR
          </div>
          <div className="label-xs text-text-muted mt-1">
            {data?.simulations?.toLocaleString() ?? "100,000"} MONTE CARLO SIMULATIONS
          </div>
        </div>
        {data?.cached_at && (
          <div className="label-xs text-text-muted">
            UPDATED {new Date(data.cached_at).toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-2xl">
        {sorted.map(([team, prob], i) => (
          <BracketMatchup
            key={team}
            rank={i + 1}
            team={team}
            probability={prob}
            isTop={i === 0}
          />
        ))}
      </div>
    </div>
  );
}
