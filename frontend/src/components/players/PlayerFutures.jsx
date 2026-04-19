import { useParams } from "react-router-dom";
import { usePlayerFutures } from "../../hooks/usePlayerFutures.js";
import PlayerCard from "./PlayerCard.jsx";
import AwardCandidateRow from "./AwardCandidateRow.jsx";
import LoadingState from "../shared/LoadingState.jsx";
import ErrorState from "../shared/ErrorState.jsx";
import { AWARD_OPTIONS } from "../../utils/constants.js";

export default function PlayerFutures() {
  const { sport, award } = useParams();
  const { data, isLoading, error, refetch } = usePlayerFutures(sport, award);
  const awardLabel = AWARD_OPTIONS[sport]?.find((a) => a.value === award)?.label ?? award?.toUpperCase();

  if (isLoading) return <LoadingState label={`LOADING ${awardLabel}`} />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  const candidates = data?.candidates ?? [];

  return (
    <div className="min-h-screen bg-bg-void">
      <div className="p-6 border-b border-border-default">
        <div className="font-display text-[32px] text-text-primary">
          {sport?.toUpperCase()} {awardLabel} RACE
        </div>
        <div className="label-xs text-text-muted mt-1">
          {data?.season} · {candidates.length} CANDIDATES
        </div>
      </div>

      <div className="bg-bg-surface">
        <div className="h-10 grid items-center px-4 bg-bg-void border-b border-border-default sticky top-0 z-10"
          style={{ gridTemplateColumns: "48px 1fr 100px 100px 100px 100px", gap: "16px" }}>
          {["RK", "PLAYER", "GG PROB", "MKT%", "EDGE", "ODDS"].map((h) => (
            <div key={h} className={`label-xs text-text-muted ${h !== "PLAYER" ? "text-right" : ""}`}>{h}</div>
          ))}
        </div>
        {candidates.map((p) => (
          <AwardCandidateRow key={p.player_name} player={p} />
        ))}
        {candidates.length === 0 && (
          <div className="p-12 text-center">
            <div className="font-display text-[48px] text-text-ghost">NO DATA</div>
          </div>
        )}
      </div>
    </div>
  );
}
