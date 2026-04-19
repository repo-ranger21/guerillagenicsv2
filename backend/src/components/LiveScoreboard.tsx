import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Trophy, Clock, ChevronRight } from 'lucide-react';
import { fetchNBAScoreboard, ScoreboardEvent } from '../services/scoreboardService';
import { cn } from '../lib/utils';

export const LiveScoreboard: React.FC = () => {
  const [events, setEvents] = useState<ScoreboardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);

  const updateScoreboard = async () => {
    const data = await fetchNBAScoreboard();
    if (data.events) {
      setEvents(data.events);
    }
    setLoading(false);
  };

  useEffect(() => {
    updateScoreboard();
    const timer = setInterval(updateScoreboard, 30000); // Update every 30s
    return () => clearInterval(timer);
  }, []);

  if (loading && events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3 opacity-50">
        <Activity className="w-5 h-5 text-gray-700 animate-pulse" />
        <span className="text-[8px] text-gray-700 uppercase tracking-widest font-mono">Syncing_NBA_Relay...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => {
        const competition = event.competitions[0];
        const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
        const awayTeam = competition.competitors.find(c => c.homeAway === 'away');

        return (
          <motion.div 
            key={event.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => setExpandedGameId(expandedGameId === event.id ? null : event.id)}
            className={cn(
              "p-3 border border-[#1f1f1f] bg-[#0d0d0d] hover:border-[#333] transition-all relative overflow-hidden group cursor-pointer",
              expandedGameId === event.id && "border-[#00ff41]/30 ring-1 ring-[#00ff41]/10 bg-[#0a0a0a]"
            )}
          >
            {/* Completion Overlay / Status */}
            {event.status.type.completed && (
              <div className="absolute top-0 right-0 w-12 h-12 -mr-6 -mt-6 bg-[#00ff41]/5 rotate-45 pointer-events-none" />
            )}

            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-1.5 font-mono">
                <span className={cn(
                  "text-[8px] px-1 rounded-sm font-bold uppercase tracking-tight",
                  event.status.type.completed ? "bg-gray-800 text-gray-400" : "bg-[#00ff41]/10 text-[#00ff41]"
                )}>
                  {event.status.type.shortDetail}
                </span>
                
                {event.status.type.state === 'in' && (
                  <div className="flex items-center gap-1.5 px-1 bg-red-500/10 border border-red-500/20 rounded-sm">
                    <span className="relative flex h-1 w-1">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1 w-1 bg-red-500"></span>
                    </span>
                    <span className="text-[8px] text-red-500 font-bold uppercase">LIVE</span>
                    <span className="text-[8px] text-gray-500 font-bold">{event.status.displayClock} // Q{event.status.period}</span>
                  </div>
                )}
                
                {/* Home Team Result Indicator */}
                {event.status.type.completed && (
                  <span className={cn(
                    "text-[8px] px-1 rounded-sm font-bold border",
                    homeTeam?.winner 
                      ? "bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/20" 
                      : awayTeam?.winner 
                        ? "bg-red-500/10 text-red-500 border-red-500/20"
                        : "bg-gray-800 text-gray-500 border-gray-700"
                  )}>
                    {homeTeam?.winner ? 'WIN' : awayTeam?.winner ? 'LOSS' : 'TIE'}
                  </span>
                )}
              </div>
              <div className="text-[8px] text-gray-700 font-mono flex items-center gap-2">
                ID_{event.id.substring(event.id.length - 4)}
                <ChevronRight className={cn(
                  "w-3 h-3 transition-transform",
                  expandedGameId === event.id ? "rotate-90 text-[#00ff41]" : "text-gray-800"
                )} />
              </div>
            </div>

            <div className="space-y-2 relative">
              {/* Score Connector Line for Completed Games */}
              {event.status.type.completed && (
                <div className="absolute left-[1.1rem] top-2 bottom-2 w-px bg-gray-900" />
              )}

              {/* Away Team */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#111] overflow-hidden flex items-center justify-center p-0.5 border border-gray-900 z-10 shadow-sm">
                    <img src={awayTeam?.team.logo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <span className={cn(
                    "text-[10px] uppercase font-bold tracking-tight",
                    awayTeam?.winner ? "text-white" : "text-gray-500"
                  )}>
                    {awayTeam?.team.abbreviation}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[11px] font-mono font-bold",
                    awayTeam?.winner || (event.status.type.state === 'in' && parseInt(awayTeam?.score || '0') > parseInt(homeTeam?.score || '0')) ? "text-[#00ff41]" : "text-gray-500"
                  )}>
                    {awayTeam?.score}
                  </span>
                  {awayTeam?.winner && <Trophy className="w-2.5 h-2.5 text-[#00ff41]/50" />}
                </div>
              </div>

              {/* Home Team */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-[#111] overflow-hidden flex items-center justify-center p-0.5 border border-gray-900 z-10 shadow-sm">
                    <img src={homeTeam?.team.logo} alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                  </div>
                  <span className={cn(
                    "text-[10px] uppercase font-bold tracking-tight",
                    homeTeam?.winner ? "text-white" : "text-gray-500"
                  )}>
                    {homeTeam?.team.abbreviation}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[11px] font-mono font-bold",
                    homeTeam?.winner || (event.status.type.state === 'in' && parseInt(homeTeam?.score || '0') > parseInt(awayTeam?.score || '0')) ? "text-[#00ff41]" : "text-gray-500"
                  )}>
                    {homeTeam?.score}
                  </span>
                  {homeTeam?.winner && <Trophy className="w-2.5 h-2.5 text-[#00ff41]/50" />}
                </div>
              </div>
            </div>

            {/* Expandable Section */}
            <AnimatePresence>
              {expandedGameId === event.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 pt-3 border-t border-[#1f1f1f] space-y-4">
                    {/* Period Scores */}
                    <div className="space-y-1.5">
                      <div className="text-[7px] text-gray-700 uppercase font-bold tracking-widest px-1">Phase Scoring</div>
                      <div className="grid grid-cols-5 gap-1">
                        {[1, 2, 3, 4].map(period => (
                          <div key={period} className="bg-[#050505] border border-[#1f1f1f] p-1.5 flex flex-col items-center">
                            <span className="text-[6px] text-gray-700 font-mono mb-1">Q{period}</span>
                            <div className="text-[8px] font-mono text-gray-400">
                              {awayTeam?.linescores?.[period-1]?.value ?? '-'}
                            </div>
                            <div className="text-[8px] font-mono text-gray-400">
                              {homeTeam?.linescores?.[period-1]?.value ?? '-'}
                            </div>
                          </div>
                        ))}
                        <div className="bg-[#111] border border-[#1f1f1f] p-1.5 flex flex-col items-center">
                          <span className="text-[6px] text-[#00ff41] font-mono mb-1">TTL</span>
                          <div className="text-[8px] font-mono text-white font-bold">{awayTeam?.score}</div>
                          <div className="text-[8px] font-mono text-white font-bold">{homeTeam?.score}</div>
                        </div>
                      </div>
                    </div>

                    {/* Leaders Section */}
                    {competition.leaders && competition.leaders.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[7px] text-gray-700 uppercase font-bold tracking-widest px-1">Tactical Leaders</div>
                        <div className="grid grid-cols-2 gap-2">
                          {competition.leaders.slice(0, 2).map((statGroup, idx) => (
                            <div key={idx} className="p-2 bg-[#050505] border border-[#1f1f1f] space-y-1">
                              <div className="text-[7px] text-gray-600 uppercase font-bold">{statGroup.displayName}</div>
                              {statGroup.leaders[0] && (
                                <div className="flex items-center justify-between">
                                  <span className="text-[8px] text-gray-400 truncate max-w-[50px]">{statGroup.leaders[0].athlete.shortName}</span>
                                  <span className="text-[8px] font-mono text-[#00ff41]">{statGroup.leaders[0].displayValue}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Final Highlight Footer (Only if not expanded) */}
            {event.status.type.completed && expandedGameId !== event.id && (
              <div className="mt-3 pt-2 border-t border-[#1f1f1f]">
                <div className="flex justify-between items-center bg-[#111]/50 p-1.5 border border-[#1f1f1f]">
                  <span className="text-[7px] text-gray-500 uppercase font-bold tracking-[0.2em]">Final Output</span>
                  <span className="text-[9px] text-[#00ff41] font-mono font-bold">
                    {awayTeam?.team.abbreviation} {awayTeam?.score} - {homeTeam?.score} {homeTeam?.team.abbreviation}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
