import React from 'react';
import { motion } from 'framer-motion';
import { History, ChevronRight, Search, Clock, ShieldCheck, Terminal } from 'lucide-react';
import { Dossier } from '../services/geminiService';
import { cn } from '../lib/utils';

interface HistoryArchiveProps {
  history: Dossier[];
  onSelect: (d: Dossier) => void;
}

export const HistoryArchive: React.FC<HistoryArchiveProps> = ({ history, onSelect }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto w-full p-4 lg:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1f1f1f] pb-6 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            <History className="w-3 h-3" />
            Data Retention Archive
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tighter uppercase">Intelligence Retrieval</h1>
        </div>
        <div className="text-[9px] text-gray-600 uppercase font-bold tracking-widest font-mono bg-[#0d0d0d] px-3 py-1 border border-[#1f1f1f]">
          Retention: 30D // Records: {history.length}
        </div>
      </div>

      {history.length === 0 ? (
        <div className="h-96 flex flex-col items-center justify-center text-center">
          <Terminal className="w-16 h-16 text-gray-800 mb-6 opacity-20" />
          <h2 className="text-xl font-bold text-gray-500 uppercase tracking-[0.3em] mb-4">Archive Empty</h2>
          <p className="text-[10px] text-gray-700 max-w-xs leading-relaxed uppercase tracking-widest">
            Execute a market query to begin building your intelligence database. No previous dossiers archived in this session.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {history.map((d, i) => (
            <motion.div 
              key={d.dossierId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => onSelect(d)}
              className="p-6 bg-[#0a0a0a] border border-[#1f1f1f] hover:border-[#00ff41]/30 hover:bg-[#0d0d0d] transition-all cursor-pointer group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-[#00ff41]/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex flex-col">
                   <div className="text-[10px] text-gray-600 font-mono flex items-center gap-1.5">
                     <Clock className="w-2.5 h-2.5" />
                     {new Date(d.timestamp).toLocaleTimeString([], { hour12: false })}
                   </div>
                   <div className="text-[8px] text-gray-700 font-mono tracking-tighter">HASH_{d.dossierId.substring(0, 8)}</div>
                </div>
                <div className="text-[8px] bg-[#1f1f1f] px-1.5 py-0.5 text-gray-500 rounded-sm font-bold tracking-widest">{d.market.sport}</div>
              </div>
              
              <h3 className="text-sm font-bold text-white uppercase tracking-tight group-hover:text-[#00ff41] transition-colors mb-2 relative z-10 truncate">
                {d.market.event}
              </h3>
              
              <div className="text-[9px] text-gray-600 mb-6 font-medium relative z-10 italic">
                {d.market.line} // {d.market.date}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#1f1f1f] relative z-10">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "relative flex h-1.5 w-1.5",
                    d.action.recommendation === 'BULLISH' ? "text-[#00ff41]" : 
                    d.action.recommendation === 'BEARISH' ? "text-red-500" : "text-[#ffcc00]"
                  )}>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
                  </div>
                  <span className="text-[9px] uppercase font-bold text-gray-500 tracking-widest">{d.action.recommendation}</span>
                </div>
                <div className="flex items-center gap-1 hover:text-[#00ff41] transition-colors">
                  <span className="text-[8px] uppercase font-bold tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Retrieve</span>
                  <ChevronRight className="w-4 h-4 text-gray-800 group-hover:text-[#00ff41] transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      
      <div className="pt-8 flex justify-center">
        <div className="flex items-center gap-3 p-4 bg-[#0a0a0a] border border-[#1f1f1f] max-w-sm">
          <ShieldCheck className="w-5 h-5 text-gray-700" />
          <div className="space-y-0.5">
            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Encryption Standard</div>
            <p className="text-[8px] text-gray-700 uppercase tracking-widest">AES-256 Retained // Neural Integrity Verified</p>
          </div>
        </div>
      </div>
    </div>
  );
};
