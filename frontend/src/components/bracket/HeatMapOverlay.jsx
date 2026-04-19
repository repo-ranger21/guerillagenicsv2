export default function HeatMapOverlay({ data = {} }) {
  const rounds = ["r1", "conf_semis", "conf_finals", "finals", "champion"];
  const roundLabels = { r1: "R1", conf_semis: "SEMI", conf_finals: "CONF", finals: "FINALS", champion: "CHAMP" };
  const teams = Object.keys(data);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="label-xs text-text-muted text-left px-3 py-2 bg-bg-void border-b border-border-default w-32">TEAM</th>
            {rounds.map((r) => (
              <th key={r} className="label-xs text-text-muted text-center px-3 py-2 bg-bg-void border-b border-border-default">{roundLabels[r]}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr key={team} className="border-b border-border-dim hover:bg-bg-raised transition-colors">
              <td className="font-display text-[14px] text-text-primary px-3 py-2">{team}</td>
              {rounds.map((r) => {
                const prob = data[team]?.[r] ?? 0;
                const alpha = Math.min(0.8, prob * 3);
                return (
                  <td key={r} className="text-center px-3 py-2">
                    <span
                      className="font-mono text-[10px]"
                      style={{
                        color: `rgba(132,255,71,${0.3 + alpha * 0.7})`,
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {(prob * 100).toFixed(0)}%
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
