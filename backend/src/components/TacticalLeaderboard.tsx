import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp, TrendingDown, Target, ShieldAlert, Zap, BarChart3, ChevronRight, Activity, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { TeamStats } from '../types/guerilla';

export default function TacticalLeaderboard() {
  const [sport, setSport] = useState<'basketball_nba' | 'baseball_mlb' | 'americanfootball_nfl'>('basketball_nba');
  const [teams, setTeams] = useState<TeamStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/futures/${sport}`);
        if (!res.ok) throw new Error('Failed to fetch tactical intelligence');
        const data = await res.json();
        setTeams(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [sport]);

  const needles = teams.filter(t => t.tier === 'NEEDLE');

  return (
    <div className="space-y-6">
      {/* Header & Sport Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#1f1f1f] pb-4">
        <div>
          <h2 className="text-sm font-mono font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <Target className="w-4 h-4 text-[#00ff41]" />
            Futures Tactical Leaderboard
          </h2>
          <p className="text-[10px] text-gray-500 uppercase mt-1">Real-time CFS // Probabilistic Edge Ranking</p>
        </div>
        <div className="flex p-0.5 bg-[#0a0a0a] border border-[#1f1f1f] rounded-sm">
          {[
            { id: 'basketball_nba', label: 'NBA' },
            { id: 'baseball_mlb', label: 'MLB' },
            { id: 'americanfootball_nfl', label: 'NFL' }
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setSport(s.id as any)}
              className={cn(
                "px-3 py-1 text-[9px] font-bold uppercase tracking-tighter transition-all",
                sport === s.id ? "bg-[#00ff41]/10 text-[#00ff41]" : "text-gray-600 hover:text-gray-400"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Needle Alerts */}
      <AnimatePresence>
        {needles.length > 0 && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#00ff41] uppercase tracking-widest">
              <ShieldAlert className="w-4 h-4 animate-pulse" />
              Needle Detected // Significant Market Inefficiency
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {needles.map(team => (
                <div key={team.id} className="bg-[#00ff41]/5 border border-[#00ff41]/20 p-4 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity">
                    <Zap className="w-8 h-8 text-[#00ff41]" />
                  </div>
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div>
                      <div className="text-xl font-bold text-white tracking-tighter uppercase">{team.name}</div>
                      <div className="text-[9px] text-[#00ff41] font-mono font-bold mt-1 tracking-widest">Composite Score: {team.cfs}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-500 uppercase">Edge</div>
                      <div className="text-lg font-mono font-bold text-[#00ff41]">+8.4%</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[9px] text-gray-400 font-mono relative z-10">
                    <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-[#00ff41]" /> ELO_RISING</span>
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-[#00ff41]" /> HOT_STREAK</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leaderboard Table */}
      <div className="bg-[#0a0a0a] border border-[#1f1f1f] overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0f0f0f] border-b border-[#1f1f1f]">
              <th className="px-4 py-3 text-[9px] font-bold text-gray-600 uppercase tracking-widest">Rank</th>
              <th className="px-4 py-3 text-[9px] font-bold text-gray-600 uppercase tracking-widest">Subject</th>
              <th className="px-4 py-3 text-[9px] font-bold text-gray-600 uppercase tracking-widest">CFS</th>
              <th className="px-4 py-3 text-[9px] font-bold text-gray-600 uppercase tracking-widest">NIR</th>
              <th className="px-4 py-3 text-[9px] font-bold text-gray-600 uppercase tracking-widest">MDI</th>
              <th className="px-4 py-3 text-[9px] font-bold text-gray-600 uppercase tracking-widest">Tier</th>
              <th className="px-4 py-3 text-[9px] font-bold text-gray-600 uppercase tracking-widest">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#151515]">
            {loading ? (
              [...Array(10)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={7} className="px-4 py-3 bg-[#0d0d0d]/50" />
                </tr>
              ))
            ) : teams.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-20 text-center text-gray-700 font-mono text-[10px] uppercase">No active tactical tracking detected</td>
              </tr>
            ) : (
              teams.map((team, idx) => (
                <tr key={team.id} className="hover:bg-[#00ff41]/5 transition-colors group">
                  <td className="px-4 py-3 text-xs font-mono text-gray-600">{(idx + 1).toString().padStart(2, '0')}</td>
                  <td className="px-4 py-3 font-bold text-white uppercase tracking-tight text-sm">{team.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                       <span className="text-sm font-mono font-bold text-[#00ff41]">{team.cfs}</span>
                       <div className="h-1 flex-1 bg-gray-900 w-16 rounded-full overflow-hidden">
                          <div className="h-full bg-[#00ff41]" style={{ width: `${team.cfs}%` }} />
                       </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-400">{team.nir > 0 ? '+' : ''}{team.nir.toFixed(1)}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-[10px] font-mono font-bold",
                      team.mdi > 0.7 ? "text-[#00ff41]" : team.mdi < 0.3 ? "text-red-500" : "text-gray-500"
                    )}>
                      {(team.mdi * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-[9px] font-bold px-2 py-0.5 border uppercase",
                      team.tier === 'NEEDLE' ? "bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/30" : 
                      team.tier === 'LOCK' ? "bg-[#3b82f6]/10 text-[#3b82f6] border-[#3b82f6]/30" :
                      "bg-gray-900 text-gray-500 border-[#1f1f1f]"
                    )}>
                      {team.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="p-1 text-gray-700 hover:text-[#00ff41] transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-[#0d0d0d] border border-[#1f1f1f] border-dashed">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-gray-700 mt-0.5" />
          <p className="text-[10px] text-gray-500 leading-relaxed font-mono italic">
            CFS (Composite Futures Score) leverages 10 independent tactical models including GG-ELO, NIR, and Monte Carlo bracket simulations. A score above 80 indicate Dynasty Tier dominance. Signals update every 2 hours based on real-time market movement.
          </p>
        </div>
      </div>
    </div>
  );
}
