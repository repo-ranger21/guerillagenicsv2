import { useParams } from "react-router-dom";
import FuturesLeaderboard from "../futures/FuturesLeaderboard.jsx";

export default function CommandCenter() {
  const { sport } = useParams();
  return (
    <div className="min-h-screen bg-bg-void">
      <FuturesLeaderboard sport={sport} />
    </div>
  );
}
