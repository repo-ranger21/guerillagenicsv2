import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { X as XIcon } from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine 
} from "recharts";
import { fetchNBAScoreboard, fetchTeamRoster, RosterAthlete } from "../services/scoreboardService";
import { cn } from "../lib/utils";
import { generatePlayerInsight, PlayerInsight, generatePlayerStats, PlayerStats } from "../services/geminiService";
import { Loader2, Brain, Target, Zap, BarChart3, TrendingUp } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  "Scheduled": "#a3a3a3",
  "In Progress": "#84ff47",
  "Halftime": "#f59e0b",
  "Final": "#ef4444",
  "Final/OT": "#ef4444",
};

interface Team {
  id: string;
  abbreviation: string;
  displayName: string;
  logo: string;
  score: string;
  winner?: boolean;
  topAthlete?: {
    id: string;
    name: string;
    shortName: string;
    headshot: string;
  };
}

interface Leader {
  displayName: string;
  value: string;
  athlete: {
    id: string;
    fullName: string;
    shortName: string;
    headshot: string;
  };
}

interface Matchup {
  id: string;
  home: Team;
  away: Team;
  status: string;
  period: number;
  clock: string;
  game_time: string;
  winProbability?: number;
  leaders?: {
    displayName: string;
    leaders: Leader[];
  }[];
}

interface PlayerDetail {
  id: string;
  name: string;
  stat: string;
  value: string;
  team: string;
  headshot: string;
}

function formatGameTime(dateStr: string) {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}

function PulseDot({ color }: { color: string }) {
  return (
    <span className="relative inline-flex items-center mr-1.5">
      <span 
        className="absolute w-2 h-2 rounded-full opacity-40 animate-ping"
        style={{ backgroundColor: color }}
      />
      <span 
        className="w-2 h-2 rounded-full relative"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

function StatsTrigger({ playerName, align = "left" }: { playerName: string, align?: "left" | "right" }) {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleMouseEnter = async () => {
    setShow(true);
    if (stats) return;
    setLoading(true);
    try {
      const data = await generatePlayerStats(playerName);
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={() => setShow(false)}>
      <button className="p-1 -m-1 rounded-sm hover:bg-[#84ff47]/10 text-gray-700 hover:text-[#84ff47] transition-all group/stats">
        <TrendingUp className="w-2.5 h-2.5 group-hover/stats:scale-110 transition-transform" />
      </button>
      
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 5 }}
            className={cn(
              "absolute bottom-full mb-2 z-[110] w-48 bg-[#0d0d0d] border border-[#1f1f1f] shadow-2xl p-3 font-mono",
              align === "left" ? "left-0" : "right-0"
            )}
          >
            <div className="text-[7px] text-[#84ff47] uppercase font-bold tracking-[0.2em] mb-2 border-b border-[#84ff47]/20 pb-1">
              Statistical_Profile // {playerName}
            </div>
            {loading ? (
              <div className="flex items-center gap-2 py-1">
                <Loader2 className="w-2 h-2 animate-spin text-[#84ff47]" />
                <span className="text-[8px] text-gray-700 uppercase tracking-widest">Compiling_Dossier...</span>
              </div>
            ) : stats ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="bg-[#050505] p-1.5 border border-[#1a1a1a]">
                    <div className="text-[6px] text-gray-700 uppercase font-bold mb-0.5">PTS</div>
                    <div className="text-[10px] text-white font-bold">{stats.points}</div>
                  </div>
                  <div className="bg-[#050505] p-1.5 border border-[#1a1a1a]">
                    <div className="text-[6px] text-gray-700 uppercase font-bold mb-0.5">AST</div>
                    <div className="text-[10px] text-[#84ff47] font-bold">{stats.assists}</div>
                  </div>
                  <div className="bg-[#050505] p-1.5 border border-[#1a1a1a]">
                    <div className="text-[6px] text-gray-700 uppercase font-bold mb-0.5">REB</div>
                    <div className="text-[10px] text-white font-bold">{stats.rebounds}</div>
                  </div>
                  <div className="bg-[#050505] p-1.5 border border-[#1a1a1a]">
                    <div className="text-[6px] text-gray-700 uppercase font-bold mb-0.5">FG%</div>
                    <div className="text-[10px] text-white font-bold">{stats.fgPercentage}</div>
                  </div>
                </div>
                <div className="text-[8px] text-gray-500 leading-relaxed border-t border-[#191919] pt-2 italic">
                  {stats.seasonContext}
                </div>
              </div>
            ) : (
              <div className="text-[8px] text-red-500 uppercase">Signal_Obscured</div>
            )}
            <div className={cn(
              "absolute top-full w-2.5 h-2.5 bg-[#0d0d0d] border-b border-r border-[#1f1f1f] rotate-45 -mt-1.5",
              align === "left" ? "left-4" : "right-4"
            )} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TeamBlock({ team, align = "left", onPlayerClick }: { team: Team, align?: "left" | "right", onPlayerClick: (p: PlayerDetail) => void }) {
  const isRight = align === "right";
  return (
    <div className={cn(
      "flex flex-col gap-3 flex-1",
      isRight ? "items-end" : "items-start"
    )}>
      {/* Team Info */}
      <div className={cn(
        "flex items-center gap-3.5 w-full",
        isRight ? "flex-row-reverse text-right" : "flex-row text-left"
      )}>
        <div className="relative group/logo shrink-0">
          <div className="absolute -inset-1 bg-[#84ff47]/10 rounded-full blur-md opacity-0 group-hover/logo:opacity-100 transition-opacity" />
          <img
            src={`https://a.espncdn.com/i/teamlogos/nba/500/${team.id}.png`}
            alt={team.abbreviation}
            className="w-11 h-11 object-contain relative z-10 filter drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]"
            referrerPolicy="no-referrer"
            onError={e => { (e.target as HTMLImageElement).src = team.logo || `https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/nba.png`; }}
          />
        </div>
        <div className="min-w-0">
          <div className="font-sans font-bold text-base sm:text-lg tracking-tighter text-[#f0f0f0] leading-none uppercase truncate">
            {team.displayName}
          </div>
          <div className="font-mono text-[9px] text-gray-500 tracking-[0.2em] mt-1.5 uppercase font-medium">
            {team.abbreviation}
          </div>
        </div>
      </div>

      {/* Player Headshot Accent */}
      {team.topAthlete && (
        <div className={cn(
          "flex items-center gap-2 px-2 py-1.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-sm transition-all hover:border-[#84ff47]/40 group/player w-full sm:w-auto relative",
          isRight ? "flex-row-reverse" : "flex-row"
        )}>
          <button 
            onClick={() => onPlayerClick({
              id: team.topAthlete!.id,
              name: team.topAthlete!.name,
              stat: "Top Performer",
              value: team.topAthlete!.shortName,
              team: team.displayName,
              headshot: `https://a.espncdn.com/i/headshots/nba/players/full/${team.topAthlete!.id}.png`
            })}
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
          >
            <div className="w-7 h-7 bg-[#111] overflow-hidden border border-[#222] shrink-0">
              <img 
                src={`https://a.espncdn.com/i/headshots/nba/players/full/${team.topAthlete.id}.png`}
                alt="" 
                className="w-full h-full object-cover scale-110 group-hover/player:scale-125 transition-transform" 
                referrerPolicy="no-referrer"
                loading="lazy"
                onError={e => { 
                  const target = e.target as HTMLImageElement;
                  if (target.src.includes('espncdn')) {
                    target.src = `https://cdn.nba.com/headshots/nba/latest/1040x760/${team.topAthlete?.id}.png`;
                  } else {
                    target.src = "https://a.espncdn.com/i/headshots/nba/players/full/default.png";
                  }
                }}
              />
            </div>
            <div className="min-w-0 items-start">
              <div className="text-[7px] text-[#84ff47] uppercase font-bold tracking-widest leading-none mb-0.5 text-left">Top Performer</div>
              <div className="text-[9px] text-gray-400 font-bold uppercase truncate tracking-tight text-left">{team.topAthlete.shortName}</div>
            </div>
          </button>
          
          <div className="absolute top-1 right-1 opacity-0 group-hover/player:opacity-100 transition-opacity">
            <StatsTrigger playerName={team.topAthlete.name} align={isRight ? "right" : "left"} />
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreBlock({ home, away, status }: { home: Team, away: Team, status: string }) {
  const isLive = status === "In Progress" || status === "Halftime";
  const isFinal = status?.startsWith("Final");
  const hasScore = home.score !== "-" && home.score !== undefined;

  return (
    <div className="flex flex-col items-center min-w-[90px] px-3">
      {hasScore && (isLive || isFinal) ? (
        <div className="flex gap-2 items-center font-bold text-4xl tracking-tighter">
          <span className={cn(isLive ? "text-[#84ff47]" : "text-[#f0f0f0]")}>{away.score}</span>
          <span className="text-gray-800 text-2xl font-light">—</span>
          <span className={cn(isLive ? "text-[#84ff47]" : "text-[#f0f0f0]")}>{home.score}</span>
        </div>
      ) : (
        <div className="font-bold text-xs text-[#84ff47] tracking-[0.3em] mb-0.5 uppercase">VS</div>
      )}
    </div>
  );
}

function PlayerHeadshot({ playerId, alt, className }: { playerId: string, alt?: string, className?: string }) {
  const [src, setSrc] = useState(`https://a.espncdn.com/i/headshots/nba/players/full/${playerId}.png`);
  const [loaded, setLoaded] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  const handleError = () => {
    if (errorCount === 0) {
      setSrc(`https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`);
      setErrorCount(1);
    } else if (errorCount === 1) {
      setSrc("https://a.espncdn.com/i/headshots/nba/players/full/default.png");
      setErrorCount(2);
    }
  };

  return (
    <div className={cn("bg-[#111] overflow-hidden relative", className)}>
      <motion.img
        src={src}
        alt={alt || ""}
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        onLoad={() => setLoaded(true)}
        onError={handleError}
        className="w-full h-full object-cover scale-110"
        referrerPolicy="no-referrer"
        loading="lazy"
      />
      {!loaded && errorCount < 2 && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0d0d0d]">
          <div className="w-2 h-2 rounded-full bg-[#84ff47]/20 animate-pulse" />
        </div>
      )}
    </div>
  );
}

function RosterSection({ teamId, teamName, onPlayerClick }: { teamId: string, teamName: string, onPlayerClick: (p: PlayerDetail) => void }) {
  const [roster, setRoster] = useState<RosterAthlete[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRoster = async () => {
      const data = await fetchTeamRoster(teamId);
      setRoster(data.athletes || []);
      setLoading(false);
    };
    loadRoster();
  }, [teamId]);

  if (loading) return <div className="text-[9px] text-gray-700 animate-pulse py-2">SCANNING_ROSTER...</div>;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {roster.slice(0, 9).map(player => (
        <div 
          key={player.id}
          className="flex items-center gap-2 p-1.5 bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#84ff47]/30 transition-all group/roster-item relative"
        >
          <button 
            onClick={() => onPlayerClick({
              id: player.id,
              name: player.fullName,
              stat: "Position: " + player.position.abbreviation,
              value: "#" + player.jersey,
              team: teamName,
              headshot: `https://a.espncdn.com/i/headshots/nba/players/full/${player.id}.png`
            })}
            className="flex items-center gap-2 flex-1 min-w-0 text-left group/player-btn"
          >
            <PlayerHeadshot 
              playerId={player.id} 
              className="w-6 h-6 shrink-0" 
            />
            <div className="min-w-0 text-left">
              <div className="text-[9px] text-gray-400 font-bold truncate group-hover/player-btn:text-[#84ff47] transition-colors">{player.shortName}</div>
              <div className="text-[7px] text-gray-700 font-mono">#{player.jersey} · {player.position.abbreviation}</div>
            </div>
          </button>
          
          <div className="absolute top-1 right-1 opacity-0 group-hover/roster-item:opacity-100 transition-opacity">
            <StatsTrigger playerName={player.fullName} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MatchupCard({ matchup, onPlayerClick }: { matchup: Matchup, onPlayerClick: (p: PlayerDetail) => void }) {
  const { home, away, status, game_time, period, clock, leaders, winProbability } = matchup;
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'market' | 'leaders' | 'roster'>('market');
  const statusColor = STATUS_COLORS[status] || "#a3a3a3";
  const isLive = status === "In Progress";

  // Pseudo-randomized data based on matchup ID
  const oddsData = useMemo(() => {
    const seed = parseInt(matchup.id) || 1000;
    const basePrice = 1.70 + ((seed % 50) / 100);
    return [
      { time: '08:00', price: basePrice + 0.1, volume: 1200 },
      { time: '10:00', price: basePrice + 0.15, volume: 1500 },
      { time: '12:00', price: basePrice + 0.05, volume: 800 },
      { time: '14:00', price: basePrice - 0.05, volume: 2200 },
      { time: '16:00', price: basePrice, volume: 1100 },
      { time: '18:00', price: basePrice - 0.15, volume: 3500 },
      { time: 'LIVE', price: basePrice - 0.2, volume: 5000 },
    ].map(p => ({ ...p, price: Number(p.price.toFixed(2)) }));
  }, [matchup.id]);

  const displayedWinProb = useMemo(() => {
    if (winProbability) return winProbability;
    if (!isLive && status !== "Final") return 50;
    // Mock progression for live games if missing
    const seed = parseInt(matchup.id) || 1000;
    const base = 50 + ((seed % 20) - 10);
    const scoreDiff = parseInt(home.score || '0') - parseInt(away.score || '0');
    return Math.max(5, Math.min(95, base + (scoreDiff * 4)));
  }, [matchup.id, home.score, away.score, isLive, status, winProbability]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-gradient-to-br from-[#111] to-[#0d0d0d] border border-[#1e1e1e] p-5 sm:p-6 transition-all relative overflow-hidden group",
        isLive ? "border-l-4 border-l-[#84ff47]" : "border-l-4 border-l-[#222]",
        "hover:shadow-[0_0_24px_rgba(132,255,71,0.07)] hover:border-[#84ff47]"
      )}
    >
      {/* Background grid texture */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, #84ff47 0.5px, transparent 0.5px)', backgroundSize: '16px 16px' }} />

      {/* Status bar */}
      <div className="flex justify-between items-center mb-4 relative z-10">
        <div className="flex items-center gap-1.5">
          {isLive && <PulseDot color="#84ff47" />}
          <span 
            className="font-mono text-[10px] tracking-widest uppercase font-bold"
            style={{ color: statusColor }}
          >
            {isLive && period ? `Q${period}${clock ? ` · ${clock}` : ""}` : status}
          </span>
        </div>
        <span className="font-mono text-[10px] text-gray-700 tracking-wider">
          {!isLive && status !== "Final" ? formatGameTime(game_time) : ""}
        </span>
      </div>

      {/* Teams + Score */}
      <div className="flex items-center gap-2 relative z-10">
        <TeamBlock team={away} align="left" onPlayerClick={onPlayerClick} />
        <ScoreBlock home={home} away={away} status={status} />
        <TeamBlock team={home} align="right" onPlayerClick={onPlayerClick} />
      </div>

      {/* Win Probability Gauge (Live Only) */}
      {(isLive || status === "Halftime") && (
        <div className="mt-5 relative z-10">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[7px] text-gray-700 font-bold uppercase tracking-[0.2em]">{away.abbreviation} WIN_PROB</span>
            <span className="text-[7px] text-gray-700 font-bold uppercase tracking-[0.2em]">{home.abbreviation} WIN_PROB</span>
          </div>
          <div className="h-1 bg-[#1a1a1a] w-full flex overflow-hidden">
            <motion.div 
              initial={{ width: '50%' }}
              animate={{ width: `${100 - displayedWinProb}%` }}
              className="h-full bg-gray-800"
            />
            <motion.div 
              initial={{ width: '50%' }}
              animate={{ width: `${displayedWinProb}%` }}
              className="h-full bg-[#84ff47] shadow-[0_0_8px_#84ff47]"
            />
          </div>
          <div className="flex justify-between mt-1 font-mono text-[9px] font-bold">
            <span className="text-gray-500">{(100 - displayedWinProb).toFixed(1)}%</span>
            <span className="text-[#84ff47]">{displayedWinProb.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {/* Analysis Tabs */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-6 pt-5 border-t border-[#191919] relative z-10 overflow-hidden"
          >
            <div className="flex gap-2 mb-5 border-b border-[#1a1a1a] pb-2">
              {[
                { id: 'market', label: 'Market Depth' },
                { id: 'leaders', label: 'Tactical Leaders' },
                { id: 'roster', label: 'Combat Roster' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "font-mono text-[9px] tracking-widest px-3 py-1.5 transition-all uppercase border",
                    activeTab === tab.id 
                      ? "bg-[#84ff47]/10 text-[#84ff47] border-[#84ff47]/30" 
                      : "text-gray-600 border-transparent hover:text-gray-400"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'market' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#84ff47] animate-pulse" />
                    Live Market Depth // Odds Propagation
                  </div>
                  <div className="text-[9px] font-mono text-gray-700">Protocol: EAA-7</div>
                </div>

                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={oddsData} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#84ff47" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#84ff47" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                      <XAxis 
                        dataKey="time" 
                        stroke="#333" 
                        fontSize={8} 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fill: '#444' }}
                      />
                      <YAxis 
                        stroke="#333" 
                        fontSize={8} 
                        tickLine={false} 
                        axisLine={false}
                        tick={{ fill: '#444' }}
                        domain={['dataMin - 0.1', 'dataMax + 0.1']}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0d0d0d', 
                          border: '1px solid #1e1e1e', 
                          fontSize: '9px',
                          color: '#f0f0f0',
                          borderRadius: '0px',
                          fontFamily: 'monospace'
                        }}
                        itemStyle={{ color: '#84ff47' }}
                        cursor={{ stroke: '#84ff47', strokeWidth: 1 }}
                      />
                      <ReferenceLine y={1.90} stroke="#333" strokeDasharray="3 3" label={{ position: 'right', value: 'Resist (1.90)', fill: '#333', fontSize: 7 }} />
                      <ReferenceLine y={1.75} stroke="#84ff47" strokeDasharray="3 3" label={{ position: 'right', value: 'Support (1.75)', fill: '#84ff47', fontSize: 7, opacity: 0.5 }} />
                      <Area 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#84ff47" 
                        fillOpacity={1} 
                        fill="url(#colorPrice)" 
                        strokeWidth={2}
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="bg-[#0a0a0a] p-2 border border-[#1a1a1a]">
                    <div className="text-[7px] text-gray-600 uppercase font-bold tracking-widest mb-1.5">Sharp Flow</div>
                    <div className="text-xs font-bold text-[#84ff47]">+4.2%</div>
                  </div>
                  <div className="bg-[#0a0a0a] p-2 border border-[#1a1a1a]">
                    <div className="text-[7px] text-gray-600 uppercase font-bold tracking-widest mb-1.5">Signal Strength</div>
                    <div className="text-xs font-bold text-white">92.4</div>
                  </div>
                  <div className="bg-[#0a0a0a] p-2 border border-[#1a1a1a]">
                    <div className="text-[7px] text-gray-600 uppercase font-bold tracking-widest mb-1.5">Market Bias</div>
                    <div className="text-xs font-bold text-white">OVER</div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'leaders' && leaders && leaders.length > 0 && (
              <div className="space-y-4">
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#84ff47] rounded-full" />
                  Tactical Leaders // High Output Assets
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {leaders.slice(0, 2).map((group, idx) => (
                    <div key={idx} className="bg-[#0d0d0d] border border-[#1a1a1a] p-3 flex items-center gap-3 group/leader transition-colors hover:border-[#84ff47]/30">
                      <div className="w-10 h-10 bg-[#111] overflow-hidden border border-[#222]">
                        <img 
                          src={`https://a.espncdn.com/i/headshots/nba/players/full/${group.leaders[0]?.athlete.id || ''}.png`}
                          alt="" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={e => { 
                            const target = e.target as HTMLImageElement;
                            const pid = group.leaders[0]?.athlete.id;
                            if (target.src.includes('espncdn') && pid) {
                              target.src = `https://cdn.nba.com/headshots/nba/latest/1040x760/${pid}.png`;
                            } else {
                              target.src = "https://a.espncdn.com/i/headshots/nba/players/full/default.png";
                            }
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[8px] text-gray-600 uppercase font-bold mb-0.5">{group.displayName}</div>
                        <button 
                          onClick={() => onPlayerClick({
                            id: group.leaders[0]?.athlete.id,
                            name: group.leaders[0]?.athlete.fullName,
                            stat: group.displayName,
                            value: group.leaders[0]?.value,
                            team: "",
                            headshot: `https://a.espncdn.com/i/headshots/nba/players/full/${group.leaders[0]?.athlete.id}.png`
                          })}
                          className="block w-full text-left group/btn"
                        >
                          <div className="text-[11px] text-white font-bold uppercase truncate group-hover/btn:text-[#84ff47] transition-colors tracking-tight">
                            {group.leaders[0]?.athlete.shortName}
                          </div>
                          <div className="text-xs font-mono text-[#84ff47] font-bold group-hover/btn:scale-110 origin-left transition-transform">
                            {group.leaders[0]?.value}
                          </div>
                        </button>
                      </div>
                      <div className="absolute top-2 right-2 opacity-0 group-hover/leader:opacity-100 transition-opacity">
                        <StatsTrigger playerName={group.leaders[0]?.athlete.fullName} align="right" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'roster' && (
              <div className="space-y-5">
                <div>
                  <div className="text-[9px] text-gray-600 uppercase font-bold tracking-widest mb-3 flex items-center justify-between">
                    <span>{away.displayName} Assets</span>
                    <span className="h-px bg-[#1a1a1a] flex-1 mx-3" />
                  </div>
                  <RosterSection teamId={away.id} teamName={away.displayName} onPlayerClick={onPlayerClick} />
                </div>
                <div>
                  <div className="text-[9px] text-gray-600 uppercase font-bold tracking-widest mb-3 flex items-center justify-between">
                    <span>{home.displayName} Assets</span>
                    <span className="h-px bg-[#1a1a1a] flex-1 mx-3" />
                  </div>
                  <RosterSection teamId={home.id} teamName={home.displayName} onPlayerClick={onPlayerClick} />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer label */}
      <div className="mt-4 pt-3 border-t border-[#191919] flex justify-between items-center relative z-10">
        <span className="font-mono text-[9px] text-gray-800 tracking-widest uppercase">
          NBA · POSTSEASON
        </span>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "bg-transparent border border-[#222] text-gray-600 font-mono text-[9px] tracking-widest px-2.5 py-1 transition-all uppercase hover:border-[#84ff47] hover:text-[#84ff47]",
            isExpanded && "bg-[#84ff47]/10 border-[#84ff47] text-[#84ff47]"
          )}
        >
          {isExpanded ? "Collapse ←" : "Analyze →"}
        </button>
      </div>
    </motion.div>
  );
}

function DateToggle({ selected, onChange }: { selected: string, onChange: (s: string) => void }) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const fmt = (d: Date) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="flex gap-0.5 mb-7">
      {["today", "tomorrow"].map((day, i) => {
        const label = i === 0 ? `Today · ${fmt(today)}` : `Tomorrow · ${fmt(tomorrow)}`;
        const active = selected === day;
        return (
          <button 
            key={day} 
            onClick={() => onChange(day)} 
            className={cn(
              "font-mono text-[10px] tracking-widest px-4 py-2 transition-all uppercase border",
              active ? "bg-[#84ff47] text-black border-[#84ff47]" : "bg-transparent text-gray-600 border-[#222] hover:text-gray-400"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function MatchupCenter() {
  const navigate = useNavigate();
  const [matchups, setMatchups] = useState<Matchup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [day, setDay] = useState("today");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerDetail | null>(null);
  const [playerInsight, setPlayerInsight] = useState<PlayerInsight | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    if (selectedPlayer) {
      setPlayerInsight(null);
    }
  }, [selectedPlayer]);

  const fetchInsight = async () => {
    if (!selectedPlayer) return;
    setLoadingInsight(true);
    try {
      const insight = await generatePlayerInsight(selectedPlayer.name, selectedPlayer.stat, selectedPlayer.team);
      setPlayerInsight(insight);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingInsight(false);
    }
  };

  const fetchMatchups = async (selectedDay: string) => {
    setLoading(true);
    setError(null);
    try {
      const d = new Date();
      if (selectedDay === "tomorrow") {
        d.setDate(d.getDate() + 1);
      }
      const dateParam = d.getFullYear() + 
                        String(d.getMonth() + 1).padStart(2, '0') + 
                        String(d.getDate()).padStart(2, '0');
      
      const data = await fetchNBAScoreboard(dateParam);

      const parsed = (data.events || []).map((event: any) => {
        const comp = event.competitions[0];
        const teams = comp.competitors;
        const homeCompetitor = teams.find((t: any) => t.homeAway === "home");
        const awayCompetitor = teams.find((t: any) => t.homeAway === "away");
        const statusDesc = event.status.type.description;
        const period = event.status.period;
        const clock = event.status.displayClock;
        const leaders = comp.leaders;
        const odds = comp.odds?.[0];
        
        // Simple win probability mock if not provided by API
        // homeTeam win probability
        let winProb = undefined;
        if (odds?.awayTeamOdds?.winProbability) {
          winProb = odds.homeTeamOdds?.winProbability;
        }

        // Extract top athlete for each team (usually from first category: Points)
        const findTopAthlete = (teamId: string) => {
          if (!leaders) return undefined;
          const pointsCat = leaders.find((l: any) => l.name === "points") || leaders[0];
          if (!pointsCat || !pointsCat.leaders) return undefined;
          
          const lead = pointsCat.leaders.find((pl: any) => pl.team?.id === teamId) || 
                      pointsCat.leaders[0]; // fallback if teamId missing in leader data
          
          if (!lead) return undefined;
          
          return {
            id: lead.athlete.id,
            name: lead.athlete.fullName,
            shortName: lead.athlete.shortName,
            headshot: lead.athlete.headshot
          };
        };

        return {
          id: event.id,
          home: { 
            ...homeCompetitor.team, 
            logo: homeCompetitor.team.logo, 
            score: homeCompetitor.score ?? "-",
            topAthlete: findTopAthlete(homeCompetitor.team.id)
          },
          away: { 
            ...awayCompetitor.team, 
            logo: awayCompetitor.team.logo, 
            score: awayCompetitor.score ?? "-",
            topAthlete: findTopAthlete(awayCompetitor.team.id)
          },
          status: statusDesc,
          period,
          clock,
          game_time: comp.date,
          winProbability: winProb,
          leaders: (leaders || []).map((l: any) => ({
            displayName: l.displayName,
            leaders: l.leaders.map((p: any) => ({
              displayName: p.displayName,
              value: p.displayValue,
              athlete: {
                id: p.athlete.id,
                fullName: p.athlete.fullName,
                shortName: p.athlete.shortName,
                headshot: p.athlete.headshot
              }
            }))
          }))
        };
      });

      setMatchups(parsed);
      setLastUpdated(new Date());
    } catch (e) {
      setError("Unable to load matchups. System communication error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatchups(day);
    const interval = setInterval(() => fetchMatchups(day), 30000);
    return () => clearInterval(interval);
  }, [day]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-8 sm:p-10 font-mono">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-baseline gap-3 mb-1.5 font-bold">
          <span className="text-[11px] text-[#84ff47] tracking-[0.4em] uppercase">GUERILLAGENICS</span>
          <span className="text-[#222] text-[11px] font-light tracking-widest">//</span>
          <span className="text-[11px] text-gray-800 tracking-[0.4em] uppercase">COMMAND CENTER</span>
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-[#f0f0f0] tracking-tighter leading-none shadow-sm uppercase">
          LIVE MATCHUPS
        </h1>
        {lastUpdated && (
          <div className="mt-2 text-[9px] text-gray-700 tracking-widest uppercase">
            UPDATED {lastUpdated.toLocaleTimeString()} · AUTO-REFRESH 30s
          </div>
        )}
      </div>

      <DateToggle selected={day} onChange={setDay} />

      {loading && matchups.length === 0 && (
        <div className="flex items-center gap-2.5 text-gray-700 text-[11px] tracking-widest uppercase">
          <span className="animate-pulse">◈</span>
          LOADING SLATE...
        </div>
      )}

      {error && (
        <div className="text-red-500 text-[11px] tracking-widest border border-red-900/30 p-4 bg-red-900/10 uppercase">
          ⚠ {error}
        </div>
      )}

      {!loading && !error && matchups.length === 0 && (
        <div className="text-gray-800 text-[11px] tracking-widest py-10 text-center uppercase">
          NO GAMES SCHEDULED
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {matchups.map(m => <MatchupCard key={m.id} matchup={m} onPlayerClick={(p) => setSelectedPlayer(p)} />)}
      </div>

      {/* Player Detail Modal */}
      <AnimatePresence>
        {selectedPlayer && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPlayer(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-[#0d0d0d] border border-[#1f1f1f] shadow-2xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-[#1f1f1f] flex justify-between items-start shrink-0">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 bg-[#111] border border-[#222] overflow-hidden p-1 shadow-[0_0_20px_rgba(132,255,71,0.1)]">
                    <img 
                      src={selectedPlayer.headshot} 
                      alt="" 
                      className="w-full h-full object-contain" 
                      referrerPolicy="no-referrer"
                      onError={e => { 
                        const target = e.target as HTMLImageElement;
                        if (target.src.includes('espncdn')) {
                          const parts = target.src.split('/');
                          const idWithExt = parts[parts.length - 1];
                          const id = idWithExt.split('.')[0];
                          if (id && !isNaN(Number(id))) {
                            target.src = `https://cdn.nba.com/headshots/nba/latest/1040x760/${id}.png`;
                            return;
                          }
                        }
                        target.src = "https://a.espncdn.com/i/headshots/nba/players/full/default.png";
                      }}
                    />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white uppercase tracking-tighter leading-none mb-2">
                      {selectedPlayer.name}
                    </div>
                    <div className="text-[10px] text-[#84ff47] font-mono tracking-widest uppercase flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#84ff47] animate-pulse" />
                      Active_Subject_Profiling
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedPlayer(null)}
                  className="text-gray-600 hover:text-white transition-colors"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#0a0a0a] border border-[#1a1a1a]">
                    <div className="text-[9px] text-gray-600 uppercase font-bold tracking-widest mb-1.5">{selectedPlayer.stat}</div>
                    <div className="text-3xl font-bold text-[#84ff47] tracking-tighter">{selectedPlayer.value}</div>
                  </div>
                  <div className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] relative overflow-hidden group">
                    <div className="text-[9px] text-gray-600 uppercase font-bold tracking-widest mb-1.5">Model Confidence</div>
                    <div className="text-3xl font-bold text-white tracking-tighter">98.2%</div>
                    <div className="absolute inset-0 bg-[#84ff47]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {!playerInsight ? (
                  <div className="space-y-4">
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-[0.2em] border-b border-[#191919] pb-2">Intelligence Stream</div>
                    <p className="text-[11px] text-gray-400 leading-relaxed italic">
                      Standard dossier loaded. Historical clustering suggests typical output volume under current defensive alignment.
                    </p>
                    <button 
                      onClick={fetchInsight}
                      disabled={loadingInsight}
                      className="w-full bg-[#111] border border-[#222] py-4 text-[10px] font-bold uppercase tracking-widest text-[#84ff47] flex items-center justify-center gap-3 hover:bg-[#1a1a1a] transition-all disabled:opacity-50"
                    >
                      {loadingInsight ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Synthesizing Tactical Intel...
                        </>
                      ) : (
                        <>
                          <Brain className="w-4 h-4" />
                          Generate Neural Projection
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="space-y-3">
                      <div className="text-[10px] text-[#84ff47] uppercase font-bold tracking-[0.2em] border-b border-[#84ff47]/20 pb-2 flex items-center justify-between">
                        <span>Neural Dossier Result</span>
                        <Zap className="w-3 h-3 animate-pulse" />
                      </div>
                      <div className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] space-y-3">
                        <div className="text-[11px] text-white font-bold uppercase tracking-widest flex items-center gap-2">
                          <Target className="w-3 h-3 text-[#84ff47]" />
                          Tactical Role: {playerInsight.tacticalRole}
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          {playerInsight.summary}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="text-[10px] text-gray-500 uppercase font-bold tracking-[0.2em]">Recent Output Log</div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {playerInsight.recentPerformance.map((p, i) => (
                          <div key={i} className="flex justify-between items-center p-2 bg-[#080808] border border-[#151515]">
                            <span className="text-[9px] text-gray-600 font-mono">{p.date}</span>
                            <span className="text-[10px] text-gray-300 font-bold">{p.value}</span>
                            <span className={cn(
                              "text-[8px] px-1 font-bold",
                              p.impact === "POSITIVE" ? "text-[#84ff47]" : p.impact === "NEGATIVE" ? "text-red-500" : "text-gray-600"
                            )}>
                              {p.impact}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] text-gray-500 uppercase font-bold tracking-[0.2em]">Confidence Interval</div>
                      <div className="p-3 bg-[#111] border-l-2 border-[#84ff47]">
                        <div className="text-xs font-bold text-white font-mono">{playerInsight.confidenceInterval}</div>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="pt-4 border-t border-[#191919] flex gap-3">
                  <button 
                    onClick={() => {
                      navigate(`/?q=${encodeURIComponent(selectedPlayer.name)}`);
                      setSelectedPlayer(null);
                    }}
                    className="flex-1 bg-[#84ff47] text-black py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-[#a0ff70] transition-all"
                  >
                    Full Dossier Search
                  </button>
                  <button 
                    onClick={() => setSelectedPlayer(null)}
                    className="flex-1 border border-[#222] text-gray-400 py-3 text-[10px] font-bold uppercase tracking-widest hover:border-gray-600 hover:text-white transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              {/* Grid backgrounds */}
              <div className="absolute inset-0 opacity-5 pointer-events-none" 
                   style={{ backgroundImage: 'radial-gradient(circle, #84ff47 0.5px, transparent 0.5px)', backgroundSize: '16px 16px' }} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Live count badge */}
      {!loading && matchups.filter(m => m.status === "In Progress").length > 0 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed bottom-6 right-6 bg-[#84ff47] text-black font-mono text-[10px] font-bold tracking-widest px-4 py-2 shadow-xl uppercase z-50"
        >
          {matchups.filter(m => m.status === "In Progress").length} LIVE NOW
        </motion.div>
      )}
    </div>
  );
}
