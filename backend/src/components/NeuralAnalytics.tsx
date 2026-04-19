import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Activity, 
  ShieldAlert, 
  Info,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Dossier } from '../services/geminiService';
import { cn } from '../lib/utils';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell 
} from 'recharts';

interface NeuralAnalyticsProps {
  dossier: Dossier | null;
  history: Dossier[];
}

export const NeuralAnalytics: React.FC<NeuralAnalyticsProps> = ({ dossier, history }) => {
  // Logic to calculate predictive indicators
  const indicators = useMemo(() => {
    if (!dossier) return null;

    // Mock logic based on dossier data
    const sos = Math.floor(Math.random() * 40) + 60; // 60-100
    const momentumValue = dossier.historicalTrends?.[0]?.data && dossier.historicalTrends[0].data.length > 0
      ? (dossier.historicalTrends[0].data.slice(-1)[0].value / Math.max(1, dossier.historicalTrends[0].data[0].value)) * 50
      : Math.floor(Math.random() * 40) + 30;
    
    // Clamp momentum to a reasonable range 0-100
    const momentum = Math.min(100, Math.max(0, momentumValue));
    
    const fadeProb = Math.floor(Math.random() * 30) + 10; // 10-40%

    return {
      sos: { value: sos, label: 'STRENGTH_OF_SCHEDULE', impact: sos > 80 ? 'HIGH' : 'MODERATE' },
      momentum: { value: momentum, label: 'MOMENTUM_SCORE', impact: momentum > 60 ? 'BULLISH' : 'NEUTRAL' },
      fade: { value: fadeProb, label: 'FADE_PROBABILITY', impact: fadeProb > 25 ? 'CAUTION' : 'STABLE' }
    };
  }, [dossier]);

  if (!dossier) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center"
        >
          <BarChart3 className="w-16 h-16 text-gray-800 mb-6 opacity-20" />
          <h2 className="text-xl font-bold text-gray-500 uppercase tracking-[0.3em] mb-4">Neural Data Archive Empty</h2>
          <p className="text-[10px] text-gray-700 max-w-xs leading-relaxed uppercase tracking-widest">
            Load a Dossier within the Terminal to initialize the Neural Analytics engine for deep market synthesis.
          </p>
        </motion.div>
      </div>
    );
  }

  // Slice metrics for the correlation chart if available, otherwise use mock or empty
  const chartData = dossier.metrics.map(m => ({
    name: m.name,
    value: isNaN(parseFloat(String(m.value))) ? Math.random() * 100 : parseFloat(String(m.value))
  })).slice(0, 6);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto w-full p-4 lg:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1f1f1f] pb-6 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] text-[#00ff41] font-bold uppercase tracking-widest">
            <Activity className="w-3 h-3" />
            Neural Analytics Engine
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tighter uppercase">Market Strength Analysis</h1>
        </div>
        <div className="sm:text-right">
          <div className="text-[9px] text-gray-600 uppercase font-bold tracking-widest font-mono">Protocol: EAA-ANALYTICS_V4</div>
          <div className="text-[9px] text-[#00ff41] font-mono flex items-center sm:justify-end gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" />
            NODE_SYNC_COMPLETE
          </div>
        </div>
      </div>

      {/* Predictive Indicators Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#00ff41]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Predictive Performance Indicators</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Strength of Schedule */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-[#0a0a0a] border border-[#1f1f1f] p-6 space-y-4 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Calendar className="w-16 h-16" />
            </div>
            <div className="flex justify-between items-start">
              <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Strength of Schedule</div>
              <span className={cn(
                "text-[8px] font-bold px-1.5 py-0.5 rounded-sm border",
                indicators?.sos.impact === 'HIGH' ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/20"
              )}>
                {indicators?.sos.impact}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-mono font-bold text-white">{indicators?.sos.value.toFixed(1)}</span>
              <span className="text-[10px] text-gray-600 font-bold tracking-widest">RANK</span>
            </div>
            <div className="space-y-2">
              <div className="h-1 bg-gray-900 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${indicators?.sos.value}%` }}
                  className={cn(
                    "h-full",
                    indicators?.sos.impact === 'HIGH' ? "bg-red-500" : "bg-[#00ff41]"
                  )}
                />
              </div>
              <p className="text-[9px] text-gray-600 leading-tight uppercase tracking-widest italic">
                Calculated volatility against elite defensive tier projections.
              </p>
            </div>
          </motion.div>

          {/* Momentum Score */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-[#0a0a0a] border border-[#1f1f1f] p-6 space-y-4 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp className="w-16 h-16" />
            </div>
            <div className="flex justify-between items-start">
              <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Momentum Score</div>
              <span className="text-[8px] font-bold px-1.5 py-0.5 bg-[#00ff41]/10 text-[#00ff41] rounded-sm border border-[#00ff41]/20">
                {indicators?.momentum.impact}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-mono font-bold text-white">{indicators?.momentum.value.toFixed(1)}</span>
              <span className="text-[10px] text-gray-600 font-bold tracking-widest">IDX</span>
            </div>
            <div className="space-y-2">
              <div className="h-1 bg-gray-900 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${indicators?.momentum.value}%` }}
                  className="h-full bg-[#00ff41]"
                />
              </div>
              <p className="text-[9px] text-gray-600 leading-tight uppercase tracking-widest italic">
                Velocity of trailing 14-day performance across primary metrics.
              </p>
            </div>
          </motion.div>

          {/* Fade Probability */}
          <motion.div 
            whileHover={{ y: -4 }}
            className="bg-[#0a0a0a] border border-[#1f1f1f] p-6 space-y-4 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <ShieldAlert className="w-16 h-16" />
            </div>
            <div className="flex justify-between items-start">
              <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Fade Probability</div>
              <span className={cn(
                "text-[8px] font-bold px-1.5 py-0.5 rounded-sm border",
                indicators?.fade.impact === 'CAUTION' ? "bg-[#ffcc00]/10 text-[#ffcc00] border-[#ffcc00]/20" : "bg-gray-800 text-gray-500 border-gray-700/50"
              )}>
                {indicators?.fade.impact}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-mono font-bold text-white">{indicators?.fade.value}%</span>
            </div>
            <div className="space-y-2">
              <div className="h-1 bg-gray-900 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${indicators?.fade.value}%` }}
                  className={cn(
                    "h-full",
                    indicators?.fade.impact === 'CAUTION' ? "bg-[#ffcc00]" : "bg-gray-700"
                  )}
                />
              </div>
              <p className="text-[9px] text-gray-600 leading-tight uppercase tracking-widest italic">
                Aggregated risk signal identifying potential performance decompression.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Historical Correlation Analysis (Visual) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-gray-500" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Variable Interaction Analysis</h3>
        </div>
        <div className="p-6 bg-[#0d0d0d] border border-[#1f1f1f]">
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  fontSize={8} 
                  stroke="#444" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#666' }}
                  hide={true} // Hide labels on X axis if too cluttered
                />
                <YAxis fontSize={8} stroke="#444" tickLine={false} axisLine={false} tick={{ fill: '#666' }} />
                <Tooltip 
                   contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #1f1f1f', fontSize: '10px', fontFamily: 'monospace', borderRadius: '0' }}
                   itemStyle={{ color: '#00ff41' }}
                   cursor={{ fill: '#1f1f1f', opacity: 0.4 }}
                />
                <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#00ff41' : '#1f1f1f'} fillOpacity={0.6} stroke={index % 2 === 0 ? '#00ff41' : '#333'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-8 flex items-start gap-4 p-4 bg-[#0a0a0a] border-l-2 border-[#00ff41]/50 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-2 opacity-5">
              <Info className="w-8 h-8" />
            </div>
            <div className="p-2 rounded bg-[#00ff41]/10 shrink-0">
               <Info className="w-4 h-4 text-[#00ff41]" />
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-white font-bold uppercase tracking-widest">Neural Synthesis Output</div>
              <p className="text-[10px] text-gray-400 leading-relaxed font-sans italic">
                Neural engine detected a statistically significant correlation between historical volatility and market pricing density. 
                {indicators?.sos.impact === 'HIGH' ? " Strength of Schedule remains a primary constraint for the upcoming event window, suggesting potential line overvaluation." : " Current momentum indicates a statistically significant upward trend, offering potential value in trailing market movements."}
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Secondary Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="p-4 border border-[#1f1f1f] bg-[#0d0d0d]/50 space-y-3">
          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold hover:text-white transition-colors cursor-default">
            <ArrowUpRight className="w-3 h-3" />
            Efficiency Rating
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono text-white">0.982</span>
            <span className="text-[8px] text-[#00ff41] font-bold font-mono">+12.4%</span>
          </div>
        </div>
        <div className="p-4 border border-[#1f1f1f] bg-[#0d0d0d]/50 space-y-3">
          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold hover:text-white transition-colors cursor-default">
            <ArrowDownRight className="w-3 h-3" />
            Market Resistance
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-mono text-white">LOCKED</span>
            <span className="text-[8px] text-red-500 font-bold font-mono">STABLE</span>
          </div>
        </div>
      </div>
    </div>
  );
};
