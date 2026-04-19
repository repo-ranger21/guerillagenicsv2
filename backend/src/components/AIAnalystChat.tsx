import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, 
  Bot, 
  User, 
  Search, 
  Terminal, 
  Cpu, 
  LineChart, 
  Calculator, 
  Globe,
  Loader2,
  ChevronRight,
  Database
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { runNeuralChat, ChatMessage } from '../services/geminiService';

export const AIAnalystChat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      content: "Neural Analyst calibrated. Provide a market entry or data query for high-stakes clinical analysis. I have full access to real-time market signals, historical data modeling, and mathematical prediction engines."
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await runNeuralChat([...messages, userMessage]);
      setMessages(prev => [...prev, { role: 'model', content: response.text }]);
    } catch (error) {
      console.error("Neural Chat Failure:", error);
      setMessages(prev => [...prev, { 
        role: 'model', 
        content: "CRITICAL_ERROR: Synchronous connection to the neural engine was interrupted. Please retry entry." 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] border border-[#1f1f1f] overflow-hidden relative">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="absolute top-10 left-10 text-[80px] font-mono select-none">EAA</div>
        <div className="absolute bottom-10 right-10 text-[80px] font-mono select-none rotate-180">GENICS</div>
      </div>

      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1f1f1f] bg-[#0a0a0a]/80 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Cpu className="w-5 h-5 text-[#00ff41]" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#00ff41] rounded-full animate-pulse shadow-[0_0_8px_#00ff41]" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-white">NEURAL_ANALYST_v4.5</h2>
            <div className="text-[9px] text-gray-500 font-mono flex items-center gap-2">
              <span className="flex h-1 w-1 rounded-full bg-[#00ff41]"></span>
              REAL_TIME_SEARCH_GATED
            </div>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-4 text-[9px] font-mono text-gray-600">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3 h-3" />
            <span>LIVE_SCRAPING</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calculator className="w-3 h-3" />
            <span>MATH_ENGINE</span>
          </div>
        </div>
      </div>

      {/* Chat Space */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-[#1f1f1f]"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-4 max-w-4xl mx-auto",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "shrink-0 w-8 h-8 flex items-center justify-center rounded-sm border",
                msg.role === 'user' 
                  ? "bg-[#00ff41]/5 border-[#00ff41]/20 text-[#00ff41]" 
                  : "bg-[#111] border-[#1f1f1f] text-gray-500"
              )}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              
              <div className={cn(
                "flex-1 space-y-2",
                msg.role === 'user' ? "text-right" : "text-left"
              )}>
                <div className={cn(
                  "text-[9px] font-mono uppercase tracking-[0.1em]",
                  msg.role === 'user' ? "text-[#00ff41]" : "text-gray-600"
                )}>
                  {msg.role === 'user' ? 'Operator' : 'AI_Neural_Analyst'}
                </div>
                
                <div className={cn(
                  "p-4 border text-sm leading-relaxed relative",
                  msg.role === 'user' 
                    ? "bg-[#0d0d0d] border-[#1f1f1f] text-gray-300 ml-12" 
                    : "bg-[#080808]/50 border-transparent text-gray-200 mr-12"
                )}>
                  {msg.role === 'model' && (
                    <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none">
                      <Terminal className="w-8 h-8" />
                    </div>
                  )}
                  <div className="markdown-chat">
                    <ReactMarkdown components={{
                      table: ({children}) => (
                        <div className="overflow-x-auto my-4">
                          <table className="w-full border-collapse border border-[#1f1f1f] text-xs font-mono">
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({children}) => <th className="border border-[#1f1f1f] bg-[#111] p-2 text-left text-gray-500 uppercase">{children}</th>,
                      td: ({children}) => <td className="border border-[#1f1f1f] p-2 text-gray-300">{children}</td>,
                      code: ({children}) => <code className="bg-[#111] px-1 rounded text-red-400 font-mono text-xs">{children}</code>,
                      pre: ({children}) => <pre className="bg-[#0a0a0a] border border-[#1f1f1f] p-4 rounded-sm my-4 overflow-x-auto font-mono text-xs text-[#00ff41]">{children}</pre>,
                      p: ({children}) => <p className="mb-4 last:mb-0">{children}</p>,
                      strong: ({children}) => <strong className="text-white font-bold">{children}</strong>
                    }}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isTyping && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-4 max-w-4xl mx-auto"
          >
            <div className="shrink-0 w-8 h-8 flex items-center justify-center rounded-sm border bg-[#111] border-[#1f1f1f] text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin text-[#00ff41]" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="text-[9px] font-mono uppercase tracking-[0.1em] text-gray-600 font-bold">Analyst_Thinking...</div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-[#00ff41] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-[#00ff41] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-[#00ff41] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Input Zone */}
      <div className="p-6 border-t border-[#1f1f1f] bg-[#0a0a0a]/80 backdrop-blur-md z-10">
        <div className="max-w-4xl mx-auto">
          {/* Quick Commands */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
            {[
              { icon: <Search className="w-3 h-3" />, text: "Search Real-time Line Shifts" },
              { icon: <LineChart className="w-3 h-3" />, text: "Predict NBA Champion Seedings" },
              { icon: <Calculator className="w-3 h-3" />, text: "Kelly Criterion EV Analysis" },
              { icon: <Database className="w-3 h-3" />, text: "Scrape Current Injury Reports" }
            ].map((cmd, i) => (
              <button
                key={i}
                onClick={() => setInput(prev => prev + (prev ? ' ' : '') + cmd.text)}
                className="shrink-0 flex items-center gap-2 px-3 py-1.5 border border-[#1f1f1f] bg-[#0d0d0d] hover:border-[#00ff41]/40 hover:bg-[#00ff41]/5 text-[9px] uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-all group"
              >
                <span className="group-hover:text-[#00ff41] transition-colors">{cmd.icon}</span>
                {cmd.text}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Terminal className="w-4 h-4 text-gray-600 group-focus-within:text-[#00ff41] transition-colors" />
            </div>
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="INPUT NEURAL COMMAND (e.g. 'Synthesize MLB World Series Projections with April 2026 data')"
              className="w-full bg-[#0d0d0d] border border-[#1f1f1f] py-4 pl-12 pr-16 text-xs font-mono text-white placeholder:text-gray-700 focus:outline-none focus:border-[#00ff41]/50 transition-all rounded-sm"
              disabled={isTyping}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isTyping}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-sm transition-all",
                input.trim() && !isTyping 
                  ? "bg-[#00ff41] text-black hover:bg-[#00cc33] scale-100" 
                  : "bg-[#111] text-gray-700 pointer-events-none scale-95"
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="mt-2 flex items-center justify-between text-[8px] font-mono text-gray-700 uppercase tracking-widest px-1">
            <div className="flex items-center gap-4">
              <span>EAA_TUNING: OPTIMAL</span>
              <span>TOKEN_THRESHOLD: UNRESTRICTED</span>
            </div>
            <div className="flex items-center gap-2">
              <span>CTRL + ENTER TO SEND</span>
              <ChevronRight className="w-2 h-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
