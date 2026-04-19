import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';
import { 
  Filter,
  X,
  ShieldAlert, 
  Terminal, 
  Activity, 
  BarChart3, 
  Search, 
  History, 
  Info, 
  AlertTriangle, 
  ChevronRight,
  Download,
  Share2,
  Check,
  Lock,
  Cpu,
  Database,
  Code,
  Layers,
  Zap,
  Radio,
  Wifi,
  WifiOff,
  Calendar,
  Newspaper,
  Globe,
  Play,
  Pause,
  RefreshCcw,
  Settings,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  PanelLeft,
  PanelRight,
  LayoutGrid,
  MessageSquare,
  Settings2,
  CloudRain,
  Home,
  Brain,
  Sparkles,
  Trophy,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { generateDossier, Dossier, PropProjection, generatePropProjection } from './services/geminiService';
import { AIAnalystChat } from './components/AIAnalystChat';
import { NeuralAnalytics } from './components/NeuralAnalytics';
import { HistoryArchive } from './components/HistoryArchive';
import { LiveScoreboard } from './components/LiveScoreboard';
import MatchupCenter from './components/MatchupCenter';
import TacticalLeaderboard from './components/TacticalLeaderboard';
import { cn } from './lib/utils';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Legend,
  ReferenceLine,
  ReferenceArea,
  Brush
} from 'recharts';

// --- Components ---

const Header = ({ 
  leftCollapsed, 
  setLeftCollapsed, 
  rightCollapsed, 
  setRightCollapsed 
}: { 
  leftCollapsed: boolean, 
  setLeftCollapsed: (v: boolean) => void,
  rightCollapsed: boolean,
  setRightCollapsed: (v: boolean) => void
}) => (
  <header className="h-14 border-b border-[#1f1f1f] bg-[#0a0a0a] flex items-center justify-between px-4 sticky top-0 z-50">
    <div className="flex items-center gap-4">
      <button 
        onClick={() => setLeftCollapsed(!leftCollapsed)}
        className={cn(
          "p-2 rounded hover:bg-[#1f1f1f] transition-colors",
          leftCollapsed ? "text-gray-600" : "text-[#00ff41]"
        )}
        title={leftCollapsed ? "Expand History" : "Collapse History"}
      >
        <PanelLeft className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-[#00ff41]/10 border border-[#00ff41]/20 flex items-center justify-center">
          <Cpu className="w-5 h-5 text-[#00ff41]" />
        </div>
        <div>
          <h1 className="text-sm font-mono font-bold tracking-widest uppercase">GuerillaGenics <span className="text-[#00ff41]">Core Engine</span></h1>
          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter">Sports Intelligence Dossier v4.2.0-STABLE</p>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-6 text-[11px] font-mono text-gray-400">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" />
        <span>SYSTEM_ONLINE</span>
      </div>
      <div className="hidden md:flex items-center gap-6">
        <div>LATENCY: <span className="text-white">14ms</span></div>
        <div>EAA_COMPLIANCE: <span className="text-[#00ff41]">ACTIVE</span></div>
      </div>
      <button 
        onClick={() => setRightCollapsed(!rightCollapsed)}
        className={cn(
          "p-2 rounded hover:bg-[#1f1f1f] transition-colors",
          rightCollapsed ? "text-gray-600" : "text-[#00ff41]"
        )}
        title={rightCollapsed ? "Expand Intelligence" : "Collapse Intelligence"}
      >
        <PanelRight className="w-5 h-5" />
      </button>
    </div>
  </header>
);

const NavSidebar = ({ active, setActive, onHome, className }: { active: string, setActive: (v: string) => void, onHome: () => void, className?: string }) => (
  <nav className={cn("border-r border-[#1f1f1f] bg-[#050505] flex flex-col items-center py-6 gap-8 z-50 shrink-0", className)}>
    <div className="flex sm:flex-col gap-6 items-center flex-1 sm:flex-none">
      <button 
        onClick={onHome}
        className={cn(
          "p-3 rounded-lg transition-all group relative text-gray-600 hover:text-[#00ff41] hover:bg-[#00ff41]/5"
        )}
      >
        <Home className="w-6 h-6" />
        <div className="hidden sm:block absolute left-full ml-4 px-2 py-1 bg-[#111] border border-[#222] text-[9px] text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          Home Terminal
        </div>
      </button>

      <div className="hidden sm:block w-8 h-px bg-[#1f1f1f]" />

      <button 
        onClick={() => setActive('dossier')}
        className={cn(
          "p-3 rounded-lg transition-all group relative",
          active === 'dossier' ? "bg-[#00ff41]/10 text-[#00ff41]" : "text-gray-600 hover:text-gray-400"
        )}
      >
        <LayoutGrid className="w-6 h-6" />
        <div className="hidden sm:block absolute left-full ml-4 px-2 py-1 bg-[#111] border border-[#222] text-[9px] text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          Terminal Console
        </div>
      </button>
      <button 
        onClick={() => setActive('matchups')}
        className={cn(
          "p-3 rounded-lg transition-all group relative",
          active === 'matchups' ? "bg-[#00ff41]/10 text-[#00ff41]" : "text-gray-600 hover:text-gray-400"
        )}
      >
        <Trophy className="w-6 h-6" />
        <div className="hidden sm:block absolute left-full ml-4 px-2 py-1 bg-[#111] border border-[#222] text-[9px] text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          Matchup Center
        </div>
      </button>
      <button 
        onClick={() => setActive('history')}
        className={cn(
          "p-3 rounded-lg transition-all group relative",
          active === 'history' ? "bg-[#00ff41]/10 text-[#00ff41]" : "text-gray-600 hover:text-gray-400"
        )}
      >
        <History className="w-6 h-6" />
        <div className="hidden sm:block absolute left-full ml-4 px-2 py-1 bg-[#111] border border-[#222] text-[9px] text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          Archive Retrieval
        </div>
      </button>
      <button 
        onClick={() => setActive('analytics')}
        className={cn(
          "p-3 rounded-lg transition-all group relative",
          active === 'analytics' ? "bg-[#00ff41]/10 text-[#00ff41]" : "text-gray-600 hover:text-gray-400"
        )}
      >
        <BarChart3 className="w-6 h-6" />
        <div className="hidden sm:block absolute left-full ml-4 px-2 py-1 bg-[#111] border border-[#222] text-[9px] text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          Neural Analytics
        </div>
      </button>

      <button 
        onClick={() => setActive('chat')}
        className={cn(
          "p-3 rounded-lg transition-all group relative",
          active === 'chat' ? "bg-[#00ff41]/10 text-[#00ff41]" : "text-gray-600 hover:text-gray-400"
        )}
      >
        <Brain className="w-6 h-6" />
        <div className="hidden sm:block absolute left-full ml-4 px-2 py-1 bg-[#111] border border-[#222] text-[9px] text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          Neural Analyst Chat
        </div>
      </button>
    </div>

    <div className="mt-auto hidden sm:flex flex-col gap-6">
      <button 
        className="p-3 text-gray-700 hover:text-gray-400 transition-all group relative"
      >
        <MessageSquare className="w-6 h-6" />
        <div className="hidden sm:block absolute left-full ml-4 px-2 py-1 bg-[#111] border border-[#222] text-[9px] text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          Operator Support
        </div>
      </button>
      <button 
        className="p-3 text-gray-700 hover:text-gray-400 transition-all group relative"
      >
        <Settings2 className="w-6 h-6" />
        <div className="hidden sm:block absolute left-full ml-4 px-2 py-1 bg-[#111] border border-[#222] text-[9px] text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          System Config
        </div>
      </button>
    </div>
  </nav>
);

const MetricCard = ({ name, value, explanation }: { name: string, value: string | number, explanation: string }) => (
  <div className="p-4 border border-[#1f1f1f] bg-[#0d0d0d] group hover:border-[#333] transition-colors">
    <div className="flex justify-between items-start mb-2">
      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{name}</span>
      <div title={explanation}>
        <Info className="w-3 h-3 text-gray-600 group-hover:text-gray-400 cursor-help" />
      </div>
    </div>
    <div className="text-xl font-mono font-bold text-white tracking-tight">{value}</div>
    <p className="text-[10px] text-gray-600 mt-2 leading-relaxed">{explanation}</p>
  </div>
);

const RecommendationBadge = ({ type }: { type: Dossier['action']['recommendation'] }) => {
  const styles = {
    BULLISH: "bg-bullish",
    BEARISH: "bg-bearish",
    MARGINAL: "bg-marginal",
    FADE: "bg-[#1f1f1f] text-gray-400 border-gray-800"
  };

  return (
    <div className={cn("px-3 py-1 border text-[11px] font-mono font-bold tracking-widest uppercase", styles[type])}>
      {type}
    </div>
  );
};

const SystemLog = ({ message, type = 'info' }: { message: string, type?: 'info' | 'success' | 'warning' | 'error' }) => {
  const colors = {
    info: 'text-gray-500',
    success: 'text-[#00ff41]',
    warning: 'text-[#ffcc00]',
    error: 'text-[#ff3b30]'
  };

  return (
    <div className="flex gap-2 text-[9px] font-mono py-0.5">
      <span className="text-gray-700">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
      <span className={cn(colors[type])}>{message}</span>
    </div>
  );
};

const parseAdvancedQuery = (query: string) => {
  let processed = query.trim();
  if (!processed) return '';

  // Handle Boolean Operators (Case Insensitive)
  processed = processed
    .replace(/\s+AND\s+/gi, ' ')
    .replace(/\s+OR\s+/gi, ' | ')
    .replace(/\s+NOT\s+/gi, ' !');

  // Handle Wildcards
  processed = processed.split(/\s+/).map(token => {
    // If token has multiple wildcards or middle wildcards, Fuse might struggle with direct mapping
    // But we map the most common ones:
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      // Fuse doesn't have a direct "contains" exactly like SQL %term%, 
      // but 'term is exact match. For fuzzy/partial, simple space-separated works best.
      // However, for extended search, we can use ' for strict match.
      return `'${token.slice(1, -1)}`;
    }
    if (token.startsWith('*') && token.length > 1) {
      return `${token.slice(1)}$`; // ends with
    }
    if (token.endsWith('*') && token.length > 1) {
      return `^${token.slice(0, -1)}`; // starts with
    }
    return token;
  }).join(' ');

  return processed;
};

export default function CommandCenter() {
  const navigate = useNavigate();
  const location = useLocation();

  const activeNavItem = useMemo(() => {
    const path = location.pathname.substring(1);
    return path === '' ? 'dossier' : path;
  }, [location.pathname]);

  const setActiveNavItem = (v: string) => {
    navigate(v === 'dossier' ? '/' : `/${v}`);
  };

  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [history, setHistory] = useState<Dossier[]>([]);
  const [logs, setLogs] = useState<{msg: string, type: any}[]>([]);
  const [showRaw, setShowRaw] = useState(false);
  
  // Filter state
  const [filterSport, setFilterSport] = useState<string>('ALL');
  const [filterRec, setFilterRec] = useState<string>('ALL');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isShared, setIsShared] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000); // Default 30s
  const [showRefreshSettings, setShowRefreshSettings] = useState(false);
  const [activeNews, setActiveNews] = useState<{msg: string, impact: string} | null>(null);
  const [newsHistory, setNewsHistory] = useState<{msg: string, impact: string, timestamp: string}[]>([]);
  const [newsFilter, setNewsFilter] = useState<string>('ALL');
  const [sidebarTab, setSidebarTab] = useState<'news' | 'scores'>('news');
  const [newsSearch, setNewsSearch] = useState<string>('');
  const [newsDateStart, setNewsDateStart] = useState<string>('');
  const [newsDateEnd, setNewsDateEnd] = useState<string>('');
  const [showNewsFilters, setShowNewsFilters] = useState(false);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(window.innerWidth < 1024);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(window.innerWidth < 1280);

  // Resize listener for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setLeftSidebarCollapsed(true);
      if (window.innerWidth < 1280) setRightSidebarCollapsed(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [activeVisualTab, setActiveVisualTab] = useState<'snapshot' | 'trends' | 'props'>('snapshot');
  const [selectedPropId, setSelectedPropId] = useState<number>(0);
  const [propTimeframe, setPropTimeframe] = useState<number>(10);
  const [propProjection, setPropProjection] = useState<any>(null);
  const [isGeneratingPropProjection, setIsGeneratingPropProjection] = useState(false);

  useEffect(() => {
    setPropProjection(null);
  }, [selectedPropId]);
  
  // Model Parameters
  const [projectionSensitivity, setProjectionSensitivity] = useState(75);
  const [activeSources, setActiveSources] = useState(['HISTORICAL', 'MARKET_FLOW', 'SHARP_MONEY']);
  const [showModelConfig, setShowModelConfig] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle URL search parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q && q !== query) {
      setQuery(q);
      // We need to trigger handleSearch, but it depends on state.
      // Better to use a separate effect that watches query and a trigger if needed, 
      // or just call handleSearch with the value directly.
    }
  }, [location.search]);

  // Effect to trigger search when query state is updated from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q && query === q && !dossier && !isLoading) {
      handleSearch();
    }
  }, [query, location.search]);

  const filteredNewsHistory = useMemo(() => {
    let results = newsHistory;

    // Initial pass: Filter by impact and date
    results = results.filter(n => {
      const matchesImpact = newsFilter === 'ALL' || n.impact === newsFilter;
      
      let matchesDate = true;
      if (newsDateStart || newsDateEnd) {
        const itemDate = new Date(n.timestamp).getTime();
        if (newsDateStart) {
          const start = new Date(newsDateStart).getTime();
          if (itemDate < start) matchesDate = false;
        }
        if (newsDateEnd) {
          const end = new Date(newsDateEnd).getTime() + 86400000; // End of the day
          if (itemDate > end) matchesDate = false;
        }
      }

      return matchesImpact && matchesDate;
    });

    if (!newsSearch.trim()) return results;

    // Advanced search parsing for boolean and wildcards
    const processedSearch = parseAdvancedQuery(newsSearch);
    const fuse = new Fuse(results, {
      keys: ['msg', 'impact'],
      threshold: 0.3,
      useExtendedSearch: true
    });

    return fuse.search(processedSearch).map(result => result.item);
  }, [newsHistory, newsFilter, newsSearch, newsDateStart, newsDateEnd]);

  const addLog = (msg: string, type: any = 'info') => {
    setLogs(prev => [{msg, type}, ...prev.slice(0, 49)]);
  };

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    addLog(`INITIATING_QUERY: ${query.substring(0, 20)}...`, 'info');
    addLog(`CONNECTING_TO_DATA_NODES...`, 'info');
    
    try {
      const result = await generateDossier(query, {
        sensitivity: projectionSensitivity,
        sources: activeSources
      });
      addLog(`DOSSIER_SYNTHESIZED: ${result.dossierId}`, 'success');
      setDossier(result);
      setHistory(prev => [result, ...prev.slice(0, 9)]);
      // Reset prop projection when new dossier loads
      setPropProjection(null);
      setSelectedPropId(0);
    } catch (error) {
      addLog(`SYNTHESIS_FAILED: ${error instanceof Error ? error.message : 'Unknown Error'}`, 'error');
      console.error("Dossier generation failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [query, projectionSensitivity, activeSources]);

  const handlePropAnalysis = async (propIdx: number) => {
    if (!dossier?.propHistory?.[propIdx]) return;
    
    setIsGeneratingPropProjection(true);
    addLog(`ANALYZING_PROP: ${dossier.propHistory[propIdx].player} - ${dossier.propHistory[propIdx].statType}`, 'info');
    
    try {
      const projection = await generatePropProjection(dossier.propHistory[propIdx]);
      setPropProjection(projection);
      addLog(`PROP_PROJECTION_COMPLETE: Confidence ${(projection.confidenceScore * 100).toFixed(0)}%`, 'success');
    } catch (error) {
      addLog(`PROP_ANALYSIS_FAILED`, 'error');
      console.error(error);
    } finally {
      setIsGeneratingPropProjection(false);
    }
  };

  const handleShare = () => {
    if (!dossier) return;
    
    const shareText = `GuerillaGenics Intelligence Dossier: ${dossier.market.event}\nRecommendation: ${dossier.action.recommendation}\nEVI: ${dossier.action.evi}\n\nView full report at: ${window.location.href}`;
    
    navigator.clipboard.writeText(shareText).then(() => {
      setIsShared(true);
      addLog(`DOSSIER_SHARED: Intelligence packet copied to clipboard`, 'success');
      setTimeout(() => setIsShared(false), 2000);
    });
  };

  const triggerRefresh = () => {
    if (!dossier || isPaused) return;
    
    addLog(`MANUAL_REFRESH: Triggering data synchronization`, 'info');
    
    const newsEvents = [
      { msg: "CHAMPIONSHIP_FUTURES: NBA Title odds shift following playoff bracket lock", impact: "LINE_MOVEMENT" },
      { msg: "WORLD_SERIES_PROJECTIONS: Early April volume suggests AL East dominance", impact: "METRIC_VOLATILITY" },
      { msg: "SUPER_BOWL_LXI: Early sharp money detected on NFC contenders", impact: "ODDS_SHIFT" },
      { msg: "NBA_PLAYOFF_BRACKET: Clinching scenarios confirmed for April final seedings", impact: "LINE_MOVEMENT" },
      { msg: "MLB_OPENING_MONTH: Velocity data confirms early-season arm fatigue in starters", impact: "TOTALS_ADJUSTMENT" }
    ];

    setDossier(prev => {
      if (!prev) return null;

      const rand = Math.random();
      const newDossier = { ...prev };

      // 1. Market News Event (20% chance on manual refresh)
      if (rand < 0.20) {
        const news = newsEvents[Math.floor(Math.random() * newsEvents.length)];
        const newsItem = { ...news, timestamp: new Date().toISOString() };
        setActiveNews(news);
        setNewsHistory(prev => [newsItem, ...prev.slice(0, 19)]);
        addLog(`BREAKING_NEWS: ${news.msg}`, 'warning');
        
        const currentOdds = parseInt(prev.market.odds);
        if (!isNaN(currentOdds)) {
          const impact = Math.floor(Math.random() * 15) - 7;
          newDossier.market = {
            ...prev.market,
            odds: (currentOdds + impact > 0 ? '+' : '') + (currentOdds + impact)
          };
        }
        setTimeout(() => setActiveNews(null), 5000);
      } 
      // 2. Odds Update (40% chance)
      else if (rand < 0.60) {
        const currentOdds = parseInt(prev.market.odds);
        if (!isNaN(currentOdds)) {
          const change = Math.floor(Math.random() * 7) - 3;
          newDossier.market = {
            ...prev.market,
            odds: (currentOdds + change > 0 ? '+' : '') + (currentOdds + change)
          };
          addLog(`MARKET_UPDATE: Odds shift detected [${prev.market.odds} -> ${newDossier.market.odds}]`, 'info');
        }
      } 
      // 3. Metric Flux
      else {
        const numericMetrics = prev.metrics.filter(m => !isNaN(parseFloat(String(m.value))));
        if (numericMetrics.length > 0) {
          const targetIndex = Math.floor(Math.random() * numericMetrics.length);
          const targetMetric = numericMetrics[targetIndex];
          const originalValue = parseFloat(String(targetMetric.value));
          const change = (Math.random() * 0.2 - 0.1).toFixed(2);
          const newValue = (originalValue + parseFloat(change)).toFixed(2);

          newDossier.metrics = prev.metrics.map(m => 
            m.name === targetMetric.name ? { ...m, value: newValue } : m
          );
          addLog(`METRIC_FLUX: ${targetMetric.name} adjusted [${originalValue} -> ${newValue}]`, 'info');
        }
      }

      return newDossier;
    });
  };

  // Real-time data simulation
  useEffect(() => {
    if (!dossier || isLoading) {
      setIsLive(false);
      return;
    }

    // Simulate connection delay
    const connectionTimeout = setTimeout(() => {
      setIsLive(true);
      addLog(`LIVE_FEED_ESTABLISHED: Market data streaming active`, 'success');
    }, 1500);

    const newsEvents = [
      { msg: "CHAMPIONSHIP_FUTURES: NBA Title odds shift following playoff bracket lock", impact: "LINE_MOVEMENT" },
      { msg: "WORLD_SERIES_PROJECTIONS: Early April volume suggests AL East dominance", impact: "METRIC_VOLATILITY" },
      { msg: "SUPER_BOWL_LXI: Early sharp money detected on NFC contenders", impact: "ODDS_SHIFT" },
      { msg: "NBA_PLAYOFF_BRACKET: Clinching scenarios confirmed for April final seedings", impact: "LINE_MOVEMENT" },
      { msg: "MLB_OPENING_MONTH: Velocity data confirms early-season arm fatigue in starters", impact: "TOTALS_ADJUSTMENT" }
    ];

    const interval = setInterval(() => {
      if (!isLive || isPaused) return;
      triggerRefresh();
    }, refreshInterval);

    return () => {
      clearTimeout(connectionTimeout);
      clearInterval(interval);
      setIsLive(false);
    };
  }, [dossier?.dossierId, isLoading, isLive, isPaused, refreshInterval]);

  // Convert metrics to chart data if numeric
  const chartData = dossier?.metrics
    .filter(m => !isNaN(parseFloat(String(m.value))))
    .map(m => ({
      name: m.name,
      value: parseFloat(String(m.value))
    })) || [];

  // Merge historical trends for multi-line display
  const mergedTrends = useMemo(() => {
    if (!dossier?.historicalTrends) return [];
    
    const dates = Array.from(new Set(
      dossier.historicalTrends.flatMap(t => t.data.map(d => d.date))
    ));
    
    return dates.map(date => {
      const entry: any = { date };
      dossier.historicalTrends!.forEach(trend => {
        const point = trend.data.find(d => d.date === date);
        if (point) entry[trend.metricName] = point.value;
      });
      return entry;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [dossier?.historicalTrends]);

  // Filtered history
  const filteredHistory = useMemo(() => {
    let results = history;

    // Apply Sport and Recommendation filters first
    results = results.filter(h => {
      const matchesSport = filterSport === 'ALL' || h.market.sport.toUpperCase() === filterSport.toUpperCase();
      const matchesRec = filterRec === 'ALL' || h.action.recommendation === filterRec;
      return matchesSport && matchesRec;
    });

    if (!filterSearch.trim()) return results;

    // Check for exact phrase search (enclosed in double quotes)
    const isExactPhrase = filterSearch.startsWith('"') && filterSearch.endsWith('"') && filterSearch.length > 2;
    
    if (isExactPhrase) {
      const phrase = filterSearch.slice(1, -1).toLowerCase();
      return results.filter(h => 
        h.market.event.toLowerCase().includes(phrase) || 
        h.dossierId.toLowerCase().includes(phrase)
      );
    }

    // Advanced search parsing using shared helper
    const processedSearch = parseAdvancedQuery(filterSearch);

    // Fuzzy search using Fuse.js with Extended Search enabled
    const fuse = new Fuse(results, {
      keys: ['market.event', 'dossierId', 'market.sport'],
      threshold: 0.4,
      distance: 100,
      ignoreLocation: true,
      useExtendedSearch: true
    });

    return fuse.search(processedSearch).map(result => result.item);
  }, [history, filterSport, filterRec, filterSearch]);

  // Get unique sports for filter dropdown
  const uniqueSports = Array.from(new Set(history.map(h => h.market.sport.toUpperCase())));

  return (
    <div className="h-screen flex flex-col font-mono selection:bg-[#00ff41]/30 selection:text-white overflow-hidden bg-[#050505]">
      <Header 
        leftCollapsed={leftSidebarCollapsed} 
        setLeftCollapsed={setLeftSidebarCollapsed}
        rightCollapsed={rightSidebarCollapsed}
        setRightCollapsed={setRightSidebarCollapsed}
      />
      
      <main className="flex-1 flex overflow-hidden relative">
        <NavSidebar 
          className="hidden sm:flex w-16"
          active={activeNavItem} 
          setActive={setActiveNavItem} 
          onHome={() => {
            setDossier(null);
            navigate('/');
            setTimeout(() => {
              scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
          }}
        />

        {/* Sidebar Overlay for Mobile */}
        <AnimatePresence>
          {(!leftSidebarCollapsed || !rightSidebarCollapsed) && window.innerWidth < 1024 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setLeftSidebarCollapsed(true);
                setRightSidebarCollapsed(true);
              }}
              className="absolute inset-0 bg-black/60 z-30 backdrop-blur-sm"
            />
          )}
        </AnimatePresence>

        {/* Sidebar - Terminal History & Logs */}
        <motion.aside 
          initial={false}
          animate={{ 
            width: leftSidebarCollapsed ? 0 : (window.innerWidth < 640 ? '100%' : 288),
            x: leftSidebarCollapsed ? -288 : 0
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={cn(
            "border-r border-[#1f1f1f] bg-[#080808] flex flex-col overflow-hidden whitespace-nowrap shrink-0 z-40",
            window.innerWidth < 1024 ? "absolute inset-y-0 left-0" : "relative"
          )}
        >
          <div className="w-full sm:w-72 flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-[#1f1f1f] flex items-center justify-between bg-[#0a0a0a]">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Recent Dossiers</span>
              <div className="flex items-center gap-2">
                <button 
                  className="sm:hidden p-1 text-gray-600 hover:text-white"
                  onClick={() => setLeftSidebarCollapsed(true)}
                >
                  <X className="w-4 h-4" />
                </button>
                {filteredHistory.length !== history.length && (
                  <span className="text-[9px] text-[#00ff41] font-bold bg-[#00ff41]/10 px-1.5 py-0.5 rounded-sm">
                    {filteredHistory.length}/{history.length}
                  </span>
                )}
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "p-1 hover:bg-[#1f1f1f] transition-colors rounded",
                    showFilters || filterSport !== 'ALL' || filterRec !== 'ALL' || filterSearch !== '' ? "text-[#00ff41]" : "text-gray-600"
                  )}
                  title="Toggle Filters"
                >
                  <Filter className="w-3.5 h-3.5" />
                </button>
                <History className="w-3.5 h-3.5 text-gray-600" />
              </div>
            </div>

            {/* Filter Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b border-[#1f1f1f] bg-[#0d0d0d] overflow-hidden"
                >
                  <div className="p-4 space-y-4">
                    {/* Search Section */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] text-gray-600 uppercase font-bold tracking-wider">Search Event</label>
                        {filterSearch && (
                          <button onClick={() => setFilterSearch('')} className="text-[8px] text-gray-700 hover:text-white uppercase">Clear</button>
                        )}
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
                          <Search className="w-3 h-3 text-gray-700" />
                        </div>
                        <input 
                          type="text"
                          value={filterSearch}
                          onChange={(e) => setFilterSearch(e.target.value)}
                          placeholder="e.g. NFL AND BULLISH"
                          className="w-full bg-[#050505] border border-[#1f1f1f] py-1.5 pl-7 pr-7 text-[10px] text-white focus:outline-none focus:border-[#00ff41]/30 transition-colors"
                        />
                        {filterSearch && (
                          <button 
                            onClick={() => setFilterSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <div className="text-[8px] text-gray-800 mt-1 flex justify-between font-mono">
                        <span>AND, OR, NOT supported</span>
                        <span>Use * for wildcards</span>
                      </div>
                    </div>

                    {/* Sport Section */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] text-gray-600 uppercase font-bold tracking-wider">Sport</label>
                        {filterSport !== 'ALL' && (
                          <button onClick={() => setFilterSport('ALL')} className="text-[8px] text-gray-700 hover:text-white uppercase">Clear</button>
                        )}
                      </div>
                      <select 
                        value={filterSport}
                        onChange={(e) => setFilterSport(e.target.value)}
                        className="w-full bg-[#050505] border border-[#1f1f1f] py-1.5 px-2 text-[10px] text-white focus:outline-none focus:border-[#00ff41]/30 appearance-none cursor-pointer"
                      >
                        <option value="ALL">ALL SPORTS</option>
                        {uniqueSports.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    {/* Recommendation Section */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] text-gray-600 uppercase font-bold tracking-wider">Recommendation</label>
                        {filterRec !== 'ALL' && (
                          <button onClick={() => setFilterRec('ALL')} className="text-[8px] text-gray-700 hover:text-white uppercase">Clear</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {['BULLISH', 'BEARISH', 'MARGINAL', 'FADE'].map(rec => (
                          <button
                            key={rec}
                            onClick={() => setFilterRec(filterRec === rec ? 'ALL' : rec)}
                            className={cn(
                              "py-1 px-2 text-[8px] font-bold border transition-all uppercase text-center",
                              filterRec === rec 
                                ? "bg-[#00ff41]/10 border-[#00ff41]/40 text-[#00ff41]" 
                                : "bg-[#050505] border-[#1f1f1f] text-gray-600 hover:border-gray-700"
                            )}
                          >
                            {rec}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(filterSport !== 'ALL' || filterRec !== 'ALL' || filterSearch !== '') && (
                      <button 
                        onClick={() => {
                          setFilterSport('ALL');
                          setFilterRec('ALL');
                          setFilterSearch('');
                        }}
                        className="w-full py-2 border border-[#00ff41]/20 text-[9px] text-[#00ff41]/60 hover:text-[#00ff41] hover:bg-[#00ff41]/5 transition-all uppercase font-bold tracking-widest mt-2"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredHistory.length === 0 ? (
                <div className="p-4 text-[10px] text-gray-600 italic text-center">
                  {history.length === 0 ? "No active history" : "No results matching filters"}
                </div>
              ) : (
                filteredHistory.map((h, i) => (
                  <button 
                    key={i}
                    onClick={() => setDossier(h)}
                    className={cn(
                      "w-full text-left p-3 border transition-all group",
                      dossier?.dossierId === h.dossierId 
                        ? "border-[#00ff41]/30 bg-[#00ff41]/5" 
                        : "border-transparent hover:bg-[#111]"
                    )}
                  >
                    <div className="text-[10px] text-gray-500 mb-1">{h.dossierId}</div>
                    <div className="text-[11px] text-white font-bold truncate">{h.market.event}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[9px] text-gray-600">{h.market.sport}</span>
                      <span className={cn(
                        "text-[9px] font-bold",
                        h.action.recommendation === 'BULLISH' ? 'text-[#00ff41]' : 
                        h.action.recommendation === 'BEARISH' ? 'text-[#ff3b30]' : 'text-gray-500'
                      )}>
                        {h.action.recommendation}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="h-48 border-t border-[#1f1f1f] flex flex-col min-h-0">
            <div className="p-2 border-b border-[#1f1f1f] bg-[#0a0a0a] flex items-center justify-between">
              <span className="text-[9px] text-gray-500 uppercase font-bold">System Logs</span>
              <Activity className="w-2.5 h-2.5 text-gray-600" />
            </div>
            <div className="flex-1 overflow-y-auto p-2 bg-[#050505]">
              {logs.length === 0 ? (
                <div className="text-[9px] text-gray-800 italic">Awaiting system activity...</div>
              ) : (
                logs.map((log, i) => (
                  <SystemLog key={i} message={log.msg} type={log.type} />
                ))
              )}
            </div>
          </div>

          <div className="p-4 border-t border-[#1f1f1f] bg-[#050505]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] text-gray-600">
                <Lock className="w-3 h-3" />
                <span>ENCRYPTED_SESSION</span>
              </div>
              <div className="text-[9px] text-gray-700">NODE_01</div>
            </div>
          </div>
        </motion.aside>

        {/* Main Content Area */}
        <section className="flex-1 flex flex-col bg-[#050505] relative overflow-y-auto border-r border-[#1f1f1f] min-w-0" ref={scrollRef}>
          {/* Search Bar */}
          <div className="p-6 border-b border-[#1f1f1f] bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-40 flex items-center gap-4">
            <form onSubmit={handleSearch} className="flex-1 max-w-3xl relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-gray-500 hidden sm:block" />
              </div>
              <input 
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ENTER MARKET QUERY..."
                className="w-full bg-[#0d0d0d] border border-[#1f1f1f] py-3 pl-4 sm:pl-12 pr-28 text-xs font-mono text-white placeholder:text-gray-700 focus:outline-none focus:border-[#00ff41]/50 transition-colors"
                disabled={isLoading}
              />
              <button 
                type="submit"
                disabled={isLoading}
                className="absolute inset-y-1.5 right-1.5 px-3 sm:px-4 bg-[#00ff41] text-black text-[9px] sm:text-[10px] font-bold uppercase tracking-widest hover:bg-[#00cc33] disabled:bg-gray-800 disabled:text-gray-600 transition-colors"
              >
                {isLoading ? '...' : 'EXECUTE'}
              </button>
            </form>
            
            {/* Global Refresh Settings (Header) */}
            <div className="flex items-center gap-2">
              <div className="relative group/refresh">
                <button 
                  onClick={() => setShowRefreshSettings(!showRefreshSettings)}
                  disabled={!dossier}
                  className={cn(
                    "p-2 rounded border transition-all flex items-center justify-center",
                    !dossier ? "border-gray-900 text-gray-800 cursor-not-allowed" : 
                    showRefreshSettings ? "border-[#00ff41] text-[#00ff41] bg-[#00ff41]/10" : 
                    "border-[#1f1f1f] text-gray-500 hover:text-white"
                  )}
                  title="Pulse Settings"
                >
                  <RefreshCcw className={cn("w-4 h-4", isLive && !isPaused && "animate-spin-slow")} />
                </button>
                
                <AnimatePresence>
                  {showRefreshSettings && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-3 w-48 bg-[#0a0a0a] border border-[#1f1f1f] shadow-2xl z-50 p-4 space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-widest">
                          <span className="text-gray-500 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            Pulse Interval
                          </span>
                          <span className="text-[#00ff41] font-mono">{refreshInterval / 1000}s</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[5000, 15000, 30000, 60000].map(val => (
                            <button
                              key={val}
                              onClick={() => {
                                setRefreshInterval(val);
                                addLog(`CONFIG_UPDATE: Pulse interval recalibrated to ${val/1000}s`, 'info');
                              }}
                              className={cn(
                                "py-2 text-[9px] border transition-all font-bold tracking-tighter",
                                refreshInterval === val 
                                  ? "border-[#00ff41] text-[#00ff41] bg-[#00ff41]/5" 
                                  : "border-[#1f1f1f] text-gray-600 hover:border-gray-500"
                              )}
                            >
                              {val/1000}S
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="h-px bg-[#1f1f1f]" />

                      <div className="space-y-2">
                        <button 
                          onClick={() => {
                            triggerRefresh();
                            setShowRefreshSettings(false);
                          }}
                          className="w-full py-2 bg-[#00ff41]/5 border border-[#00ff41]/20 text-[#00ff41] hover:bg-[#00ff41]/10 text-[9px] flex items-center justify-center gap-2 transition-all font-bold uppercase tracking-widest"
                        >
                          <Zap className="w-3 h-3" />
                          Manual Sync
                        </button>
                        
                        <button 
                          onClick={() => setIsPaused(!isPaused)}
                          className={cn(
                            "w-full py-2 border text-[9px] flex items-center justify-center gap-2 transition-all font-bold uppercase tracking-widest",
                            isPaused 
                              ? "bg-red-500/5 border-red-500/30 text-red-500 hover:bg-red-500/10" 
                              : "bg-gray-900 border-[#1f1f1f] text-gray-400 hover:text-white"
                          )}
                        >
                          {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                          {isPaused ? 'RESUME_FEED' : 'PAUSE_FEED'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="p-6 max-w-6xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
                <Route path="/chat" element={
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-[calc(100vh-14rem)] min-h-[500px]"
                >
                  <AIAnalystChat />
                </motion.div>
              } />
              <Route path="/analytics" element={
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                >
                  <NeuralAnalytics dossier={dossier} history={history} />
                </motion.div>
              } />
              <Route path="/history" element={
                <motion.div
                  key="history"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <HistoryArchive 
                    history={history} 
                    onSelect={(d) => {
                      setDossier(d);
                      setActiveNavItem('dossier');
                      addLog(`RETRIEVAL: Accessing archived intelligence ID_${d.dossierId}`, 'info');
                    }} 
                  />
                </motion.div>
              } />
              <Route path="/matchups" element={
                <motion.div
                  key="matchups"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                >
                  <MatchupCenter />
                </motion.div>
              } />
              <Route path="/" element={
                isLoading ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20 space-y-6"
                >
                  <div className="relative">
                    <div className="w-16 h-16 border-2 border-[#1f1f1f] border-t-[#00ff41] rounded-full animate-spin" />
                    <Activity className="w-6 h-6 text-[#00ff41] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-mono text-[#00ff41] animate-pulse mb-2">INITIALIZING_NEURAL_ENGINE</div>
                    <div className="text-[10px] text-gray-600 uppercase tracking-[0.2em]">Synthesizing EAA-Compliant Intelligence...</div>
                  </div>
                </motion.div>
              ) : dossier ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  {/* Breaking News Banner */}
                  <AnimatePresence>
                    {activeNews && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-[#ffcc00]/10 border border-[#ffcc00]/30 p-3 flex items-center gap-3 overflow-hidden"
                      >
                        <AlertTriangle className="w-4 h-4 text-[#ffcc00] shrink-0" />
                        <div className="flex-1">
                          <div className="text-[9px] font-bold text-[#ffcc00] uppercase tracking-widest">Market Alert // {activeNews.impact}</div>
                          <div className="text-[11px] text-white font-bold">{activeNews.msg}</div>
                        </div>
                        <div className="text-[9px] text-[#ffcc00] font-mono animate-pulse">LIVE_IMPACT_ACTIVE</div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Dossier Header */}
                  <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#1f1f1f]">
                    <div className="flex-1">
                      <button 
                        onClick={() => setDossier(null)}
                        className="flex items-center gap-2 mb-6 text-[10px] text-gray-500 hover:text-[#00ff41] transition-colors group"
                      >
                        <ChevronRight className="w-3 h-3 rotate-180 group-hover:-translate-x-1 transition-transform" />
                        <span>BACK_TO_TERMINAL_HOME</span>
                      </button>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-[10px] bg-[#1f1f1f] px-2 py-0.5 text-gray-400 font-bold tracking-widest uppercase">ID: {dossier.dossierId}</span>
                        <span className="text-[10px] text-gray-600 uppercase tracking-widest">{dossier.timestamp}</span>
                      </div>
                      <h2 className="text-3xl font-bold text-white tracking-tighter uppercase">{dossier.market.event}</h2>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1.5"><Terminal className="w-3 h-3" /> {dossier.market.sport}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-700" />
                        <span>DATE: {dossier.market.date}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-700" />
                        <span>MARKET: {dossier.market.line} ({dossier.market.odds})</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <div className="flex items-center gap-2">
                        {isLive && (
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <button 
                                onClick={() => setShowRefreshSettings(!showRefreshSettings)}
                                className={cn(
                                  "p-1.5 rounded border transition-all flex items-center justify-center",
                                  showRefreshSettings ? "border-[#00ff41] text-[#00ff41] bg-[#00ff41]/10" : "border-gray-800 text-gray-600 hover:text-gray-400"
                                )}
                                title="Refresh Settings"
                              >
                                <Settings className="w-2.5 h-2.5" />
                              </button>
                              
                              <AnimatePresence>
                                {showRefreshSettings && (
                                  <motion.div 
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 top-full mt-2 w-40 bg-[#0a0a0a] border border-[#1f1f1f] shadow-2xl z-50 p-3 space-y-3"
                                  >
                                    <div className="space-y-1.5">
                                      <div className="flex items-center gap-1.5 text-[9px] text-gray-500 uppercase font-bold">
                                        <Clock className="w-2.5 h-2.5" />
                                        Interval
                                      </div>
                                      <div className="grid grid-cols-2 gap-1">
                                        {[5000, 15000, 30000, 60000].map(val => (
                                          <button
                                            key={val}
                                            onClick={() => {
                                              setRefreshInterval(val);
                                              setShowRefreshSettings(false);
                                              addLog(`CONFIG_UPDATE: Auto-refresh interval set to ${val/1000}s`, 'info');
                                            }}
                                            className={cn(
                                              "py-1 text-[8px] border transition-all",
                                              refreshInterval === val 
                                                ? "border-[#00ff41] text-[#00ff41] bg-[#00ff41]/5" 
                                                : "border-[#1f1f1f] text-gray-600 hover:border-gray-700"
                                            )}
                                          >
                                            {val/1000}s
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => {
                                        triggerRefresh();
                                        setShowRefreshSettings(false);
                                      }}
                                      className="w-full py-1.5 bg-[#111] border border-[#1f1f1f] text-[8px] text-gray-400 hover:text-white hover:border-gray-600 flex items-center justify-center gap-1.5 transition-all"
                                    >
                                      <RefreshCcw className="w-2.5 h-2.5" />
                                      Sync Now
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            <button 
                              onClick={() => setIsPaused(!isPaused)}
                              className={cn(
                                "p-1.5 rounded border transition-all flex items-center justify-center",
                                isPaused 
                                  ? "border-gray-700 text-gray-500 hover:text-white hover:border-gray-500" 
                                  : "border-[#00ff41]/30 text-[#00ff41] hover:bg-[#00ff41]/10"
                              )}
                              title={isPaused ? "Resume Auto-Refresh" : "Pause Auto-Refresh"}
                            >
                              {isPaused ? <Play className="w-2.5 h-2.5 fill-current" /> : <Pause className="w-2.5 h-2.5 fill-current" />}
                            </button>
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className={cn(
                                "flex items-center gap-1.5 px-2 py-0.5 border rounded-full transition-colors",
                                isPaused ? "bg-gray-900 border-gray-800" : "bg-[#00ff41]/10 border-[#00ff41]/30"
                              )}
                            >
                              <span className="relative flex h-2 w-2">
                                {!isPaused && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff41] opacity-75"></span>}
                                <span className={cn(
                                  "relative inline-flex rounded-full h-2 w-2",
                                  isPaused ? "bg-gray-600" : "bg-[#00ff41]"
                                )}></span>
                              </span>
                              <span className={cn(
                                "text-[9px] font-bold tracking-widest uppercase",
                                isPaused ? "text-gray-500" : "text-[#00ff41]"
                              )}>
                                {isPaused ? 'Paused' : 'Live'}
                              </span>
                            </motion.div>
                          </div>
                        )}
                        <RecommendationBadge type={dossier.action.recommendation} />
                      </div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest">Confidence: <span className="text-white">{(dossier.audit.confidenceScore * 100).toFixed(1)}%</span></div>
                    </div>
                  </div>

                  {/* Actionable Intelligence Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
                    <div className="p-6 bg-[#00ff41]/5 border border-[#00ff41]/20 relative overflow-hidden group">
                      <Zap className="absolute -right-4 -bottom-4 w-24 h-24 text-[#00ff41]/5 group-hover:text-[#00ff41]/10 transition-colors" />
                      <div className="text-[10px] text-[#00ff41] font-bold uppercase tracking-widest mb-4">Edge Value Index (EVI)</div>
                      <div className="text-4xl font-bold text-white tracking-tighter">{dossier.action.evi}</div>
                      <div className="text-[10px] text-gray-500 mt-2 uppercase">Threshold: {dossier.action.threshold}</div>
                    </div>
                    <div className="p-6 bg-[#0a0a0a] border border-[#1f1f1f]">
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">Kelly Sizing</div>
                      <div className="text-4xl font-bold text-white tracking-tighter">{dossier.action.kellySizing}</div>
                      <div className="text-[10px] text-gray-600 mt-2 uppercase">Risk-Adjusted Allocation</div>
                    </div>
                    <div className="p-6 bg-[#0a0a0a] border border-[#1f1f1f]">
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-4">Audit Sources</div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {dossier.audit.sources.map((s, i) => (
                          <span key={i} className="text-[9px] bg-[#111] border border-[#222] px-2 py-1 text-gray-400 uppercase tracking-tighter">{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Visualization Section */}
                  {(chartData.length > 0 || (dossier.historicalTrends && dossier.historicalTrends.length > 0)) && (
                    <div className="p-6 border border-[#1f1f1f] bg-[#0a0a0a]">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-gray-500" />
                            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Intelligence Visualization</h3>
                          </div>
                          <div className="flex flex-wrap p-0.5 bg-[#050505] border border-[#1f1f1f] rounded-sm">
                            <button 
                              onClick={() => setActiveVisualTab('snapshot')}
                              className={cn(
                                "px-3 py-1 text-[9px] font-bold uppercase tracking-tighter transition-all",
                                activeVisualTab === 'snapshot' ? "bg-[#00ff41]/10 text-[#00ff41]" : "text-gray-600 hover:text-gray-400"
                              )}
                            >
                              Snapshots
                            </button>
                            <button 
                              onClick={() => setActiveVisualTab('trends')}
                              className={cn(
                                "px-3 py-1 text-[9px] font-bold uppercase tracking-tighter transition-all",
                                activeVisualTab === 'trends' ? "bg-[#00ff41]/10 text-[#00ff41]" : "text-gray-600 hover:text-gray-400"
                              )}
                            >
                              Historical Trends
                            </button>
                            <button 
                              onClick={() => setActiveVisualTab('props')}
                              className={cn(
                                "px-3 py-1 text-[9px] font-bold uppercase tracking-tighter transition-all",
                                activeVisualTab === 'props' ? "bg-[#00ff41]/10 text-[#00ff41]" : "text-gray-600 hover:text-gray-400"
                              )}
                            >
                              Prop Analysis
                            </button>
                          </div>
                        </div>
                        <div className="text-[9px] text-gray-600 uppercase">Normalized Analytical Output</div>
                      </div>

                      <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          {activeVisualTab === 'snapshot' ? (
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#00ff41" stopOpacity={0.8}/>
                                  <stop offset="100%" stopColor="#00ff41" stopOpacity={0.2}/>
                                </linearGradient>
                                <linearGradient id="barGradientRed" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#ff3b30" stopOpacity={0.8}/>
                                  <stop offset="100%" stopColor="#ff3b30" stopOpacity={0.2}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#141414" vertical={false} />
                              <XAxis 
                                dataKey="name" 
                                stroke="#333" 
                                fontSize={9} 
                                tickLine={false} 
                                axisLine={false}
                                tick={{ fill: '#555' }}
                              />
                              <YAxis 
                                stroke="#333" 
                                fontSize={9} 
                                tickLine={false} 
                                axisLine={false}
                                tick={{ fill: '#555' }}
                              />
                              <Tooltip 
                                cursor={{ fill: '#0a0a0a', opacity: 0.4 }}
                                content={({ active, payload, label }) => {
                                  if (active && payload && payload.length) {
                                    const value = payload[0].value;
                                    const isPositive = Number(value) >= 0;
                                    return (
                                      <div className="bg-[#050505] border border-[#1f1f1f] p-3 font-mono shadow-2xl">
                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 border-b border-[#1f1f1f] pb-1">Metric_Input</div>
                                        <div className="flex items-center justify-between gap-6">
                                          <span className="text-[11px] text-white font-bold">{label}</span>
                                          <span className={cn("text-sm font-bold", isPositive ? "text-[#00ff41]" : "text-red-500")}>
                                            {value}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <Bar dataKey="value" radius={[2, 2, 0, 0]} animationDuration={1200} animationBegin={200}>
                                {chartData.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.value >= 0 ? 'url(#barGradient)' : 'url(#barGradientRed)'} 
                                    className="hover:opacity-80 transition-opacity cursor-crosshair"
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          ) : activeVisualTab === 'trends' ? (
                            dossier.historicalTrends && dossier.historicalTrends.length > 0 ? (
                              <AreaChart data={mergedTrends} margin={{ top: 10, right: 30, left: -20, bottom: 20 }}>
                                <defs>
                                  {dossier.historicalTrends.map((trend, idx) => {
                                    const colors = ['#00ff41', '#0EA5E9', '#F59E0B', '#EF4444', '#D946EF', '#8B5CF6'];
                                    const color = colors[idx % colors.length];
                                    return (
                                      <linearGradient key={`gradient-${trend.metricName}`} id={`color-${trend.metricName}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                      </linearGradient>
                                    );
                                  })}
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#141414" vertical={false} />
                                <XAxis 
                                  dataKey="date" 
                                  stroke="#333" 
                                  fontSize={9} 
                                  tickLine={false} 
                                  axisLine={false}
                                  tick={{ fill: '#555' }}
                                  minTickGap={30}
                                />
                                <YAxis 
                                  stroke="#333" 
                                  fontSize={9} 
                                  tickLine={false} 
                                  axisLine={false}
                                  tick={{ fill: '#555' }}
                                />
                                <Tooltip 
                                  cursor={{ stroke: '#333', strokeWidth: 1 }}
                                  content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                      return (
                                        <div className="bg-[#050505] border border-[#1f1f1f] p-3 font-mono shadow-2xl min-w-[180px]">
                                          <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 border-b border-[#1f1f1f] pb-1 flex justify-between">
                                            <span>Temporal_Slice</span>
                                            <span>{label}</span>
                                          </div>
                                          <div className="space-y-1.5">
                                            {payload.map((entry: any, i: number) => (
                                              <div key={i} className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-2">
                                                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                                  <span className="text-[10px] text-gray-400 uppercase tracking-tighter">{entry.name}</span>
                                                </div>
                                                <span className="text-[11px] text-white font-bold">{entry.value}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Legend 
                                  verticalAlign="top" 
                                  height={36} 
                                  wrapperStyle={{ 
                                    fontSize: '9px', 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '1px',
                                    paddingBottom: '16px'
                                  }}
                                  iconType="square"
                                  iconSize={8}
                                />
                                {dossier.historicalTrends.map((trend, idx) => {
                                  const colors = ['#00ff41', '#0EA5E9', '#F59E0B', '#EF4444', '#D946EF', '#8B5CF6'];
                                  const color = colors[idx % colors.length];
                                  
                                  return (
                                    <Area 
                                      key={trend.metricName}
                                      type="monotone"
                                      dataKey={trend.metricName}
                                      stroke={color}
                                      strokeWidth={2}
                                      fillOpacity={1}
                                      fill={`url(#color-${trend.metricName})`}
                                      activeDot={{ 
                                        r: 4, 
                                        fill: '#050505', 
                                        stroke: color, 
                                        strokeWidth: 2,
                                        className: "hover:scale-150 transition-transform"
                                      }}
                                      animationDuration={1500}
                                      animationEasing="ease-in-out"
                                    />
                                  );
                                })}
                                <Brush 
                                  dataKey="date" 
                                  height={30} 
                                  stroke="#1a1a1a" 
                                  fill="#0a0a0a"
                                  travellerWidth={10}
                                  gap={1}
                                  className="brush-tech"
                                >
                                  <AreaChart>
                                    {dossier.historicalTrends.slice(0, 1).map((trend) => (
                                      <Area 
                                        key={`brush-${trend.metricName}`}
                                        dataKey={trend.metricName} 
                                        stroke="#00ff41" 
                                        fill="#00ff41" 
                                        fillOpacity={0.05} 
                                      />
                                    ))}
                                  </AreaChart>
                                </Brush>
                              </AreaChart>
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center border border-dashed border-[#1f1f1f] text-gray-700">
                                <Activity className="w-8 h-8 mb-2 opacity-20" />
                                <span className="text-[10px] uppercase tracking-widest">No trend data available for this dossier</span>
                              </div>
                            )
                          ) : (
                            dossier.propHistory && dossier.propHistory.length > 0 ? (() => {
                              const activeProp = dossier.propHistory[selectedPropId];
                              const slice = activeProp.data.slice(-propTimeframe);
                              const avg = slice.reduce((acc, curr) => acc + curr.value, 0) / slice.length;
                              const hitCount = slice.filter(d => d.result === 'OVER').length;
                              const hitRate = (hitCount / slice.length) * 100;
                              const maxVal = Math.max(...slice.map(d => d.value), activeProp.marketLine);
                              const minVal = Math.min(...slice.map(d => d.value), activeProp.marketLine);

                              return (
                                <div className="h-full flex flex-col lg:flex-row gap-6">
                                  {/* Left: Interactive Chart & History */}
                                  <div className="flex-1 flex flex-col gap-4 min-w-0">
                                    {/* Prop Header Info */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#050505] p-3 border border-[#1f1f1f]">
                                      <div className="space-y-1">
                                        <span className="text-[8px] text-gray-600 uppercase font-bold tracking-widest">Market Line</span>
                                        <div className="text-sm font-mono text-white font-bold">{activeProp.marketLine}</div>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-[8px] text-gray-600 uppercase font-bold tracking-widest">L{propTimeframe} Average</span>
                                        <div className="text-sm font-mono text-[#00ff41] font-bold">{avg.toFixed(1)}</div>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-[8px] text-gray-600 uppercase font-bold tracking-widest">Hit Rate (OVER)</span>
                                        <div className="flex items-center gap-2">
                                          <div className="text-sm font-mono text-white font-bold">{hitRate.toFixed(0)}%</div>
                                          <div className="h-1 flex-1 bg-gray-900 rounded-full overflow-hidden">
                                            <div className="h-full bg-[#00ff41]" style={{ width: `${hitRate}%` }} />
                                          </div>
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-[8px] text-gray-600 uppercase font-bold tracking-widest">Volatility</span>
                                        <div className="text-sm font-mono text-gray-400 font-bold">±{((maxVal - minVal) / 2).toFixed(1)}</div>
                                      </div>
                                    </div>

                                    {/* Action Selectors */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
                                      <div className="flex flex-wrap gap-2">
                                        {dossier.propHistory.map((p, i) => (
                                          <button 
                                            key={i}
                                            onClick={() => setSelectedPropId(i)}
                                            className={cn(
                                              "px-3 py-1.5 text-[8px] border transition-all uppercase tracking-widest font-bold",
                                              selectedPropId === i ? "border-[#00ff41] text-[#00ff41] bg-[#00ff41]/5" : "border-[#1f1f1f] text-gray-600 hover:text-gray-400"
                                            )}
                                          >
                                            {p.player} <span className="text-gray-700 mx-1">//</span> {p.statType}
                                          </button>
                                        ))}
                                      </div>
                                      <div className="flex bg-[#050505] border border-[#1f1f1f] p-0.5 rounded-sm">
                                        {[5, 10, 15].map(val => (
                                          <button 
                                            key={val}
                                            onClick={() => setPropTimeframe(val)}
                                            className={cn(
                                              "px-4 py-0.5 text-[8px] font-bold transition-all uppercase tracking-widest",
                                              propTimeframe === val ? "text-[#00ff41] bg-[#00ff41]/10" : "text-gray-600 hover:text-gray-400"
                                            )}
                                          >
                                            L{val}
                                          </button>
                                        ))}
                                      </div>
                                    </div>

                                    {/* The Chart */}
                                    <div className="flex-1 min-h-[300px] relative">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={slice} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                          <defs>
                                            <linearGradient id="colorPropValue" x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="5%" stopColor="#00ff41" stopOpacity={0.3}/>
                                              <stop offset="95%" stopColor="#00ff41" stopOpacity={0}/>
                                            </linearGradient>
                                          </defs>
                                          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                                          <XAxis dataKey="opponent" stroke="#444" fontSize={8} tickLine={false} axisLine={false} tick={{ fill: '#666' }} />
                                          <YAxis stroke="#444" fontSize={8} tickLine={false} axisLine={false} tick={{ fill: '#666' }} domain={[(dataMin: number) => Math.floor(Math.min(dataMin, activeProp.marketLine) * 0.8), (dataMax: number) => Math.ceil(Math.max(dataMax, activeProp.marketLine) * 1.2)]} />
                                          <Tooltip 
                                            cursor={{ stroke: '#00ff41', strokeWidth: 1, strokeDasharray: '4 4' }}
                                            content={({ active, payload, label }) => {
                                              if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                const diff = (data.value - activeProp.marketLine).toFixed(1);
                                                const isOver = data.value >= activeProp.marketLine;
                                                
                                                return (
                                                  <div className="bg-[#0a0a0a] border border-[#00ff41]/30 p-3 font-mono shadow-[0_0_20px_rgba(0,255,65,0.1)] backdrop-blur-md">
                                                    <div className="flex items-center justify-between gap-4 mb-2 border-b border-[#1f1f1f] pb-1.5 font-bold">
                                                      <div className="text-[10px] text-[#00ff41] uppercase tracking-tighter flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" />
                                                        {data.date}
                                                      </div>
                                                      <div className="text-[9px] text-gray-500 uppercase tracking-widest">OPP // {data.opponent}</div>
                                                    </div>
                                                    
                                                    <div className="space-y-3">
                                                      <div className="flex items-end justify-between gap-8">
                                                        <div className="flex flex-col">
                                                          <span className="text-[8px] text-gray-600 uppercase font-bold mb-0.5">Performance Input</span>
                                                          <span className="text-2xl text-white font-bold tracking-tighter leading-none">{data.value}</span>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                          <span className="text-[8px] text-gray-600 uppercase font-bold mb-0.5">Edge Variance</span>
                                                          <div className={cn(
                                                            "text-[10px] px-2 py-0.5 font-bold rounded-sm flex items-center gap-1.5 border",
                                                            isOver ? "bg-[#00ff41]/10 text-[#00ff41] border-[#00ff41]/30" : "bg-red-500/10 text-red-500 border-red-500/30"
                                                          )}>
                                                            {isOver ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                                            {isOver ? '+' : ''}{diff}
                                                          </div>
                                                        </div>
                                                      </div>

                                                      {/* Visual Delta Meter */}
                                                      <div className="space-y-1">
                                                        <div className="flex items-center justify-between text-[7px] text-gray-600 uppercase font-bold">
                                                          <span>Market Line: {activeProp.marketLine}</span>
                                                          <span>Diff: {isOver ? 'OVER' : 'UNDER'}</span>
                                                        </div>
                                                        <div className="h-1 bg-gray-900 rounded-full overflow-hidden flex">
                                                          {/* Center of the line is the market line */}
                                                          <div className="flex-1 flex justify-end">
                                                            {!isOver && (
                                                              <div 
                                                                className="h-full bg-red-500" 
                                                                style={{ width: `${Math.min(100, (Math.abs(data.value - activeProp.marketLine) / activeProp.marketLine) * 100)}%` }} 
                                                              />
                                                            )}
                                                          </div>
                                                          <div className="w-0.5 h-full bg-[#333] shrink-0" />
                                                          <div className="flex-1">
                                                            {isOver && (
                                                              <div 
                                                                className="h-full bg-[#00ff41]" 
                                                                style={{ width: `${Math.min(100, (Math.abs(data.value - activeProp.marketLine) / activeProp.marketLine) * 100)}%` }} 
                                                              />
                                                            )}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              }
                                              return null;
                                            }}
                                          />
                                          <ReferenceLine 
                                            y={activeProp.marketLine} 
                                            stroke="#00ff41" 
                                            strokeDasharray="5 5" 
                                            strokeOpacity={0.6}
                                            label={{ position: 'right', value: `LINE: ${activeProp.marketLine}`, fill: '#00ff41', fontSize: 7, fontWeight: 'bold', dy: -8 }} 
                                          />
                                          <Area 
                                            type="monotone" 
                                            dataKey="value" 
                                            stroke="#00ff41" 
                                            strokeWidth={3}
                                            fillOpacity={1} 
                                            fill="url(#colorPropValue)" 
                                            animationDuration={1200}
                                            animationEasing="ease-out"
                                            activeDot={{ 
                                              r: 6, 
                                              fill: '#050505', 
                                              stroke: '#00ff41', 
                                              strokeWidth: 2,
                                              className: "drop-shadow-[0_0_15px_rgba(0,255,65,1)]"
                                            }} 
                                          />
                                        </AreaChart>
                                      </ResponsiveContainer>
                                    </div>
                                  </div>

                                  {/* Right: AI Projection Panel */}
                                  <div className="w-full lg:w-80 flex flex-col border border-[#1f1f1f] bg-[#080808] overflow-hidden">
                                    <div className="p-4 border-b border-[#1f1f1f] bg-[#0a0a0a] flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Sparkles className="w-3.5 h-3.5 text-[#00ff41]" />
                                        <span className="text-[10px] text-white uppercase font-bold tracking-[0.2em]">Neural Projection</span>
                                      </div>
                                      {!propProjection && !isGeneratingPropProjection && (
                                        <button 
                                          onClick={() => handlePropAnalysis(selectedPropId)}
                                          className="text-[9px] text-[#00ff41] hover:text-[#00cc33] uppercase font-bold tracking-widest animate-pulse"
                                        >
                                          Initialize_Engine
                                        </button>
                                      )}
                                    </div>

                                    <div className="flex-1 overflow-y-auto min-h-[300px]">
                                      {isGeneratingPropProjection ? (
                                        <div className="h-full flex flex-col items-center justify-center p-8 space-y-4">
                                          <div className="relative">
                                            <Cpu className="w-10 h-10 text-gray-800 animate-pulse" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                              <Loader2 className="w-4 h-4 text-[#00ff41] animate-spin" />
                                            </div>
                                          </div>
                                          <p className="text-[9px] text-gray-600 uppercase tracking-[0.2em] animate-pulse">Synthesizing_Performance_Model...</p>
                                        </div>
                                      ) : propProjection ? (
                                        <motion.div 
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          className="p-5 space-y-6"
                                        >
                                          {/* Big Number */}
                                          <div className="space-y-2">
                                            <div className="text-[9px] text-gray-600 uppercase font-bold tracking-widest">EAA Projected Performance</div>
                                            <div className="flex items-baseline gap-2">
                                              <span className="text-4xl font-mono font-bold text-white">{propProjection.projectedValue}</span>
                                              <span className={cn(
                                                "text-xs font-bold px-2 py-0.5 rounded-sm uppercase tracking-widest",
                                                propProjection.recommendation === 'OVER' ? "bg-[#00ff41]/20 text-[#00ff41]" : "bg-red-500/20 text-red-500"
                                              )}>
                                                {propProjection.recommendation}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-4 pt-1">
                                              <div className="flex-1 h-1 bg-gray-900 rounded-full overflow-hidden">
                                                <div className="h-full bg-[#00ff41]" style={{ width: `${propProjection.confidenceScore * 100}%` }} />
                                              </div>
                                              <span className="text-[10px] text-gray-500 font-mono font-bold">{(propProjection.confidenceScore * 100).toFixed(0)}% CONF</span>
                                            </div>
                                          </div>

                                          {/* Factors */}
                                          <div className="space-y-3">
                                            <div className="text-[9px] text-gray-600 uppercase font-bold tracking-widest">Key Influencing Factors</div>
                                            <div className="space-y-2">
                                              {propProjection.influencingFactors.map((f: any, i: number) => (
                                                <div key={i} className="p-3 bg-[#0a0a0a] border border-[#1f1f1f] group hover:border-[#333] transition-colors">
                                                  <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[10px] text-gray-300 font-bold uppercase tracking-tight">{f.factor}</span>
                                                    <span className={cn(
                                                      "text-[8px] font-bold uppercase",
                                                      f.impact === 'POSITIVE' ? "text-[#00ff41]" : f.impact === 'NEGATIVE' ? "text-red-500" : "text-gray-600"
                                                    )}>
                                                      {f.impact}
                                                    </span>
                                                  </div>
                                                  <p className="text-[10px] text-gray-500 leading-tight">{f.description}</p>
                                                </div>
                                              ))}
                                            </div>
                                          </div>

                                          {/* Synthesis */}
                                          <div className="space-y-2">
                                            <div className="text-[9px] text-gray-600 uppercase font-bold tracking-widest">Neural Synthesis</div>
                                            <div className="p-3 bg-[#050505] border border-[#1f1f1f] text-[10px] text-gray-400 leading-relaxed font-sans italic">
                                              "{propProjection.detailedAnalysis}"
                                            </div>
                                          </div>

                                          <button 
                                            onClick={() => handlePropAnalysis(selectedPropId)}
                                            className="w-full py-2 border border-[#1f1f1f] bg-[#111] text-[9px] text-gray-600 hover:text-[#00ff41] hover:border-[#00ff41]/30 transition-all uppercase font-bold tracking-[0.2em]"
                                          >
                                            RECALIBRATE_MODEL
                                          </button>
                                        </motion.div>
                                      ) : (
                                        <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
                                          <Search className="w-8 h-8 text-gray-800" />
                                          <p className="text-[9px] text-gray-600 uppercase tracking-widest leading-relaxed">
                                            Select a player profile and initialize the neural engine for clinical projections.
                                          </p>
                                          <button 
                                            onClick={() => handlePropAnalysis(selectedPropId)}
                                            className="px-6 py-2 bg-[#00ff41] text-black text-[10px] font-bold uppercase tracking-widest hover:bg-[#00cc33] transition-all"
                                          >
                                            Analyze Props
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    <div className="p-3 bg-[#0a0a0a] border-t border-[#1f1f1f] text-[8px] text-gray-700 uppercase tracking-widest font-mono">
                                      Model: neural_prop_v2.1 // Seed: {selectedPropId}
                                    </div>
                                  </div>
                                </div>
                              );
                            })() : (
                              <div className="h-full flex flex-col items-center justify-center border border-dashed border-[#1f1f1f] text-gray-700">
                                <Cpu className="w-8 h-8 mb-2 opacity-20" />
                                <span className="text-[10px] uppercase tracking-widest">No detailed prop analysis available for this player profile</span>
                              </div>
                            )
                          )}
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Metrics Grid */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-gray-500" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Explainable Metrics</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {dossier.metrics.map((m, i) => (
                        <MetricCard key={i} {...m} />
                      ))}
                    </div>
                  </div>

                  {/* Analysis & Risk */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-gray-500" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Clinical Analysis</h3>
                      </div>
                      <div className="p-6 bg-[#0d0d0d] border border-[#1f1f1f] text-sm leading-relaxed text-gray-300 font-sans relative">
                        <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                          <Code className="w-12 h-12" />
                        </div>
                        <ReactMarkdown components={{
                          p: ({children}) => <p className="mb-4 last:mb-0">{children}</p>,
                          strong: ({children}) => <strong className="text-white font-mono">{children}</strong>
                        }}>
                          {dossier.analysis}
                        </ReactMarkdown>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-[#ffcc00]" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Risk Factors</h3>
                      </div>
                      <div className="space-y-2">
                        {dossier.riskFactors.map((r, i) => (
                          <div key={i} className="p-3 bg-[#0a0a0a] border-l-2 border-[#ffcc00] text-[11px] text-gray-400">
                            {r}
                          </div>
                        ))}
                      </div>
                      <div className="mt-8 p-4 bg-[#ff3b30]/5 border border-[#ff3b30]/20 rounded-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <ShieldAlert className="w-4 h-4 text-[#ff3b30]" />
                          <span className="text-[10px] font-bold text-[#ff3b30] uppercase tracking-widest">Operator Warning</span>
                        </div>
                        <p className="text-[10px] text-gray-500 leading-tight">
                          This intelligence is for informational purposes only. Past performance does not guarantee future results. Maintain strict bankroll discipline.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Predictive Projections */}
                  {dossier.projections && dossier.projections.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-[#00ff41]" />
                          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Predictive Projections</h3>
                        </div>
                        <div className="relative">
                          <button 
                            onClick={() => setShowModelConfig(!showModelConfig)}
                            className={cn(
                              "flex items-center gap-1.5 px-2 py-1 border rounded-sm text-[9px] font-bold uppercase tracking-widest transition-all",
                              showModelConfig ? "bg-[#00ff41]/10 border-[#00ff41]/40 text-[#00ff41]" : "bg-[#0a0a0a] border-gray-800 text-gray-500 hover:text-gray-300"
                            )}
                          >
                            <Settings className="w-3 h-3" />
                            Model Config
                          </button>

                          <AnimatePresence>
                            {showModelConfig && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 sm:right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] bg-[#0a0a0a] border border-[#1f1f1f] shadow-2xl z-50 p-4 space-y-4"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Sensitivity Threshold</label>
                                    <span className="text-[9px] text-[#00ff41] font-mono">{projectionSensitivity}%</span>
                                  </div>
                                  <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    value={projectionSensitivity}
                                    onChange={(e) => setProjectionSensitivity(parseInt(e.target.value))}
                                    className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-[#00ff41]"
                                  />
                                  <div className="flex justify-between text-[7px] text-gray-700 uppercase font-bold">
                                    <span>Conservative</span>
                                    <span>Aggressive</span>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Active Data Sources</label>
                                    <div className="flex gap-2">
                                      <button 
                                        onClick={() => setActiveSources(['HISTORICAL', 'MARKET_FLOW', 'SHARP_MONEY', 'SOCIAL_SENTIMENT', 'WEATHER_DATA'])}
                                        className="text-[7px] text-[#00ff41] uppercase font-bold hover:underline"
                                      >
                                        All
                                      </button>
                                      <button 
                                        onClick={() => setActiveSources([])}
                                        className="text-[7px] text-red-500 uppercase font-bold hover:underline"
                                      >
                                        None
                                      </button>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 gap-1">
                                    {[
                                      { id: 'HISTORICAL', icon: <Database className="w-2.5 h-2.5" /> },
                                      { id: 'MARKET_FLOW', icon: <Activity className="w-2.5 h-2.5" /> },
                                      { id: 'SHARP_MONEY', icon: <TrendingUp className="w-2.5 h-2.5" /> },
                                      { id: 'SOCIAL_SENTIMENT', icon: <MessageSquare className="w-2.5 h-2.5" /> },
                                      { id: 'WEATHER_DATA', icon: <CloudRain className="w-2.5 h-2.5" /> }
                                    ].map(source => (
                                      <button
                                        key={source.id}
                                        onClick={() => {
                                          setActiveSources(prev => 
                                            prev.includes(source.id) 
                                              ? prev.filter(s => s !== source.id) 
                                              : [...prev, source.id]
                                          );
                                        }}
                                        className={cn(
                                          "flex items-center justify-between px-2 py-1.5 border text-[8px] font-bold transition-all",
                                          activeSources.includes(source.id) 
                                            ? "border-[#00ff41]/30 text-[#00ff41] bg-[#00ff41]/5" 
                                            : "border-[#1f1f1f] text-gray-600 hover:border-gray-800"
                                        )}
                                      >
                                        <div className="flex items-center gap-2">
                                          {source.icon}
                                          {source.id.replace('_', ' ')}
                                        </div>
                                        {activeSources.includes(source.id) && <Check className="w-2.5 h-2.5" />}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                <button 
                                  onClick={() => {
                                    setShowModelConfig(false);
                                    handleSearch();
                                    addLog(`MODEL_RECALIBRATION: Re-synthesizing projections with new parameters`, 'warning');
                                  }}
                                  className="w-full py-2 bg-[#00ff41]/10 border border-[#00ff41]/30 text-[9px] text-[#00ff41] hover:bg-[#00ff41]/20 transition-all uppercase font-bold tracking-widest"
                                >
                                  Recalibrate Engine
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {dossier.projections.map((p, i) => (
                          <div key={i} className="p-4 bg-[#0d0d0d] border border-[#1f1f1f] relative overflow-hidden group">
                            <div className="flex items-start justify-between mb-3">
                              <div className="space-y-1">
                                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Event Projection</div>
                                <div className="text-sm font-bold text-white uppercase">{p.event}</div>
                              </div>
                              <div className="flex flex-col items-end">
                                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Probability</div>
                                <div className="text-lg font-bold text-[#00ff41] tracking-tighter">{p.probability}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 py-2 border-y border-[#1f1f1f] mb-3">
                              <div className={cn(
                                "flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[9px] font-bold uppercase",
                                p.trend === 'UPWARD' ? "bg-[#00ff41]/10 text-[#00ff41]" :
                                p.trend === 'DOWNWARD' ? "bg-[#ff3b30]/10 text-[#ff3b30]" :
                                "bg-gray-800 text-gray-400"
                              )}>
                                {p.trend === 'UPWARD' && <TrendingUp className="w-3 h-3" />}
                                {p.trend === 'DOWNWARD' && <TrendingDown className="w-3 h-3" />}
                                {p.trend === 'STABLE' && <Minus className="w-3 h-3" />}
                                {p.trend}
                              </div>
                              <div className="text-[9px] text-gray-600 uppercase tracking-widest">Market Momentum</div>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-relaxed italic">
                              {p.logic}
                            </p>
                            <div className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                              <Activity className="w-16 h-16" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Market Correlation Matrix */}
                  {dossier.correlations && dossier.correlations.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#00ff41]" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Market Correlation Matrix</h3>
                      </div>
                      <div className="p-6 bg-[#0a0a0a] border border-[#1f1f1f]">
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                          {dossier.correlations.map((c, i) => {
                            const absCoeff = Math.abs(c.coefficient);
                            const isPositive = c.coefficient > 0;
                            const size = 60 + (absCoeff * 40); // 60% to 100% size
                            
                            return (
                              <div 
                                key={i} 
                                className="aspect-square relative flex items-center justify-center bg-[#050505] border border-[#1a1a1a] overflow-hidden group cursor-help"
                                title={`${c.metricA} ↔ ${c.metricB}\n${c.description}`}
                              >
                                {/* Heatmap Cell */}
                                <div 
                                  className={cn(
                                    "rounded-sm transition-all duration-700",
                                    isPositive ? "bg-[#00ff41]" : "bg-[#ff3b30]"
                                  )}
                                  style={{ 
                                    width: `${size}%`, 
                                    height: `${size}%`,
                                    opacity: 0.1 + (absCoeff * 0.8)
                                  }}
                                />
                                
                                {/* Label Overlay */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center bg-black/0 group-hover:bg-black/60 transition-all">
                                  <div className="text-[10px] font-mono font-bold text-white mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {c.coefficient > 0 ? '+' : ''}{c.coefficient.toFixed(2)}
                                  </div>
                                  <div className="text-[6px] text-gray-500 uppercase font-bold tracking-tighter truncate w-full px-1">
                                    {c.metricA}
                                  </div>
                                  <div className="text-[6px] text-gray-500 uppercase font-bold tracking-tighter truncate w-full px-1">
                                    {c.metricB}
                                  </div>
                                </div>

                                {/* Active Borders on Hover */}
                                <div className="absolute inset-0 border border-transparent group-hover:border-[#00ff41]/40 transition-colors" />
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-6 p-4 bg-[#00ff41]/5 border border-[#00ff41]/10 rounded-sm">
                          <div className="flex items-start gap-3">
                            <Info className="w-4 h-4 text-[#00ff41] mt-0.5" />
                            <div className="space-y-1">
                              <div className="text-[10px] text-[#00ff41] font-bold uppercase tracking-widest">Strategic Impact</div>
                              <p className="text-[10px] text-gray-400 leading-relaxed">
                                High positive correlations (+0.70+) suggest metrics move in tandem, allowing for risk stacking. Negative correlations (-0.70+) indicate hedging opportunities. Coefficients near 0.00 represent independent variables, critical for multi-factor validation.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Raw Data Toggle */}
                  <div className="pt-4">
                    <button 
                      onClick={() => setShowRaw(!showRaw)}
                      className="text-[9px] text-gray-700 hover:text-gray-400 uppercase tracking-widest flex items-center gap-2 transition-colors"
                    >
                      <Code className="w-3 h-3" />
                      {showRaw ? 'Hide Raw Dossier Data' : 'View Raw Dossier Data'}
                    </button>
                    {showRaw && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 border border-[#1f1f1f] overflow-hidden"
                      >
                        <SyntaxHighlighter 
                          language="json" 
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            padding: '1rem',
                            fontSize: '10px',
                            backgroundColor: '#0a0a0a',
                            fontFamily: 'inherit'
                          }}
                        >
                          {JSON.stringify(dossier, null, 2)}
                        </SyntaxHighlighter>
                      </motion.div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-8 border-t border-[#1f1f1f]">
                    <div className="text-[10px] text-gray-600 uppercase tracking-widest">
                      GuerillaGenics Terminal // Node: US-EAST-1 // Hash: {Math.random().toString(36).substring(7).toUpperCase()}
                    </div>
                    <div className="flex items-center gap-4">
                      <button className="p-2 text-gray-500 hover:text-white transition-colors" title="Download PDF"><Download className="w-4 h-4" /></button>
                      <button 
                        onClick={handleShare}
                        className={cn(
                          "p-2 transition-all flex items-center gap-2 rounded-sm",
                          isShared ? "text-[#00ff41] bg-[#00ff41]/10" : "text-gray-500 hover:text-white"
                        )}
                        title="Share Dossier"
                      >
                        {isShared ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Copied</span>
                          </>
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-12 py-10">
                  {/* Search Hub */}
                  <div className="flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-16 h-16 bg-[#0a0a0a] border border-[#1f1f1f] flex items-center justify-center">
                      <Terminal className="w-8 h-8 text-gray-800" />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-sm font-bold text-gray-500 uppercase tracking-[0.3em]">Neural Terminal Home</h3>
                       <p className="text-[10px] text-gray-700 max-w-xs leading-relaxed uppercase tracking-widest">
                         Synthesizing clinical market intelligence for the April 2026 campaign.
                       </p>
                    </div>
                    
                    <div className="flex flex-wrap justify-center gap-2">
                      {[
                        'NBA Championship Projections',
                        'MLB World Series Analysis',
                        'NFL Super Bowl LXI Futures'
                      ].map((example, i) => (
                        <button 
                          key={i}
                          onClick={() => { setQuery(example); handleSearch(); }}
                          className="px-4 py-2 border border-[#1f1f1f] bg-[#050505] text-[9px] text-gray-600 hover:border-[#00ff41]/30 hover:text-gray-400 transition-all uppercase tracking-widest font-bold"
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="h-px bg-gradient-to-r from-transparent via-[#1f1f1f] to-transparent" />

                  {/* Tactical Leaderboard Section */}
                  <TacticalLeaderboard />
                </div>
              ) } />
            </Routes>
          </AnimatePresence>
          </div>
        </section>

        {/* Right Sidebar - Market News Feed */}
        <motion.aside 
          initial={false}
          animate={{ 
            width: rightSidebarCollapsed ? 0 : (window.innerWidth < 640 ? '100%' : 288),
            x: rightSidebarCollapsed ? 288 : 0
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={cn(
            "bg-[#080808] flex flex-col overflow-hidden whitespace-nowrap shrink-0 z-40 border-l border-[#1f1f1f]",
            window.innerWidth < 1280 ? "absolute inset-y-0 right-0" : "relative"
          )}
        >
          <div className="w-full sm:w-72 flex-1 flex flex-col min-h-0">
            <div className="p-4 border-b border-[#1f1f1f] bg-[#0a0a0a] flex flex-col gap-3 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-[#111] p-0.5 rounded border border-[#1f1f1f]">
                  <button 
                    onClick={() => setSidebarTab('news')}
                    className={cn(
                      "px-2 py-1 text-[8px] uppercase font-bold tracking-widest transition-all rounded-[2px]",
                      sidebarTab === 'news' ? "bg-[#1f1f1f] text-white" : "text-gray-600 hover:text-gray-400"
                    )}
                  >
                    Intelligence
                  </button>
                  <button 
                    onClick={() => setSidebarTab('scores')}
                    className={cn(
                      "px-2 py-1 text-[8px] uppercase font-bold tracking-widest transition-all rounded-[2px]",
                      sidebarTab === 'scores' ? "bg-[#1f1f1f] text-white" : "text-gray-600 hover:text-gray-400"
                    )}
                  >
                    Scoreboard
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {sidebarTab === 'news' && (
                    <button 
                      onClick={() => setShowNewsFilters(!showNewsFilters)}
                      className={cn(
                        "p-1 rounded border transition-all",
                        showNewsFilters ? "border-[#00ff41]/40 text-[#00ff41] bg-[#00ff41]/5" : "border-gray-800 text-gray-600 hover:text-gray-400"
                      )}
                    >
                      <Filter className="w-3 h-3" />
                    </button>
                  )}
                  <div className="flex items-center gap-1.5 ml-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff41] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00ff41]"></span>
                    </span>
                    <span className="text-[8px] text-[#00ff41] font-mono uppercase">Live</span>
                  </div>
                </div>
              </div>

              {sidebarTab === 'news' && (
                <AnimatePresence>
                  {showNewsFilters && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-3 overflow-hidden"
                    >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[8px] text-gray-600 uppercase font-bold tracking-widest">Keyword Search</label>
                      <div className="group relative">
                        <Info className="w-2.5 h-2.5 text-gray-800 cursor-help" />
                        <div className="absolute right-0 top-full mt-1 w-40 p-2 bg-[#111] border border-[#222] text-[8px] text-gray-500 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                          Operators: AND, OR, NOT, *wildcards*
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-700" />
                      <input 
                        type="text"
                        value={newsSearch}
                        onChange={(e) => setNewsSearch(e.target.value)}
                        placeholder="Search signals..."
                        className="w-full bg-[#050505] border border-[#1f1f1f] py-1 pl-6 pr-2 text-[9px] text-gray-400 focus:outline-none focus:border-[#00ff41]/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] text-gray-600 uppercase font-bold tracking-widest">Impact Type</label>
                    <select 
                      value={newsFilter}
                      onChange={(e) => setNewsFilter(e.target.value)}
                      className="w-full bg-[#050505] border border-[#1f1f1f] py-1 px-2 text-[9px] text-gray-400 focus:outline-none focus:border-[#00ff41]/30 appearance-none cursor-pointer uppercase font-bold tracking-tighter"
                    >
                      <option value="ALL">ALL IMPACTS</option>
                      <option value="ODDS_SHIFT">ODDS_SHIFT</option>
                      <option value="METRIC_VOLATILITY">METRIC_VOLATILITY</option>
                      <option value="TOTALS_ADJUSTMENT">TOTALS_ADJUSTMENT</option>
                      <option value="LINE_MOVEMENT">LINE_MOVEMENT</option>
                      <option value="SYSTEM_RECALIBRATION">SYSTEM_RECALIBRATION</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[8px] text-gray-600 uppercase font-bold tracking-widest">Date Range</label>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => {
                            const today = new Date().toISOString().split('T')[0];
                            setNewsDateStart(today);
                            setNewsDateEnd(today);
                          }}
                          className="text-[7px] text-gray-500 hover:text-[#00ff41] uppercase transition-colors"
                        >
                          Today
                        </button>
                        <button 
                          onClick={() => {
                            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                            setNewsDateStart(yesterday);
                            setNewsDateEnd('');
                          }}
                          className="text-[7px] text-gray-500 hover:text-[#00ff41] uppercase transition-colors"
                        >
                          L24H
                        </button>
                        <button 
                          onClick={() => {
                            const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
                            setNewsDateStart(lastWeek);
                            setNewsDateEnd('');
                          }}
                          className="text-[7px] text-gray-500 hover:text-[#00ff41] uppercase transition-colors"
                        >
                          7D
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="relative">
                        <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-700 pointer-events-none" />
                        <input 
                          type="date"
                          value={newsDateStart}
                          onChange={(e) => setNewsDateStart(e.target.value)}
                          className="w-full bg-[#050505] border border-[#1f1f1f] py-1 pl-6 pr-1 text-[8px] text-gray-500 focus:outline-none focus:border-[#00ff41]/30"
                        />
                      </div>
                      <div className="relative">
                        <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-gray-700 pointer-events-none" />
                        <input 
                          type="date"
                          value={newsDateEnd}
                          onChange={(e) => setNewsDateEnd(e.target.value)}
                          className="w-full bg-[#050505] border border-[#1f1f1f] py-1 pl-6 pr-1 text-[8px] text-gray-500 focus:outline-none focus:border-[#00ff41]/30"
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      setNewsFilter('ALL');
                      setNewsSearch('');
                      setNewsDateStart('');
                      setNewsDateEnd('');
                    }}
                    className="w-full py-1.5 border border-[#1f1f1f] bg-[#111]/50 text-[8px] text-gray-600 hover:text-[#00ff41] hover:border-[#00ff41]/20 transition-all uppercase font-bold tracking-widest mt-2"
                  >
                    Clear All Sidebar Filters
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {sidebarTab === 'scores' ? (
              <LiveScoreboard />
            ) : filteredNewsHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                <Globe className="w-8 h-8 text-gray-800" />
                <p className="text-[9px] text-gray-700 uppercase tracking-widest leading-relaxed">
                  {newsHistory.length === 0 ? "Awaiting global market signals..." : "No signals match selected criteria."}<br/>Data stream initialized.
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filteredNewsHistory.map((news, i) => (
                  <motion.div 
                    key={`${news.timestamp}-${i}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 border border-[#1f1f1f] bg-[#0d0d0d] hover:border-[#333] transition-colors relative overflow-hidden group"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#ffcc00]/30 group-hover:bg-[#ffcc00]/50 transition-colors" />
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[8px] font-mono text-[#ffcc00] uppercase tracking-widest font-bold">{news.impact}</span>
                      <span className="text-[8px] font-mono text-gray-700">
                        {new Date(news.timestamp).toLocaleTimeString([], { hour12: false })}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-relaxed font-sans">{news.msg}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          <div className="p-4 border-t border-[#1f1f1f] bg-[#050505]">
            <div className="text-[8px] text-gray-700 uppercase tracking-widest leading-tight">
              Source: GuerillaGenics Global Intelligence Network<br/>
              Latency: 14ms // Protocol: EAA-S
            </div>
          </div>
        </div>
      </motion.aside>
      </main>

      {/* Status Bar */}
      <footer className="h-8 border-t border-[#1f1f1f] bg-[#0a0a0a] flex items-center justify-between px-4 text-[9px] font-mono text-gray-600 uppercase tracking-widest">
        <div className="flex items-center gap-4">
          <span>CPU_LOAD: 12%</span>
          <span>MEM_USE: 456MB</span>
          <div className="flex items-center gap-1.5">
            {isLive ? (
              <>
                <Wifi className="w-3 h-3 text-[#00ff41]" />
                <span className="text-[#00ff41]">STREAMING_ACTIVE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-gray-700" />
                <span>STREAM_OFFLINE</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span>EAA_VERSION: 4.2.0</span>
          <span>© 2026 GUERILLAGENICS</span>
        </div>
      </footer>
      <NavSidebar 
        className="flex sm:hidden w-full h-16 border-r-0 border-t"
        active={activeNavItem} 
        setActive={setActiveNavItem} 
        onHome={() => {
          setDossier(null);
          navigate('/');
          setTimeout(() => {
            scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
          }, 100);
        }}
      />
    </div>
  );
}
