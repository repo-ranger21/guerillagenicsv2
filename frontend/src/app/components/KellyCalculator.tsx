import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface KellyCalculatorProps {
  edge: number;
  modelPercent: number;
  marketOdds: string;
  onClose?: () => void;
  className?: string;
}

export function KellyCalculator({
  edge,
  modelPercent,
  marketOdds,
  onClose,
  className = '',
}: KellyCalculatorProps) {
  const [bankroll, setBankroll] = useState<string>('10000');

  // Parse market odds to decimal
  const parseOdds = (odds: string): number => {
    const num = parseInt(odds.replace('+', ''));
    if (num > 0) {
      return num / 100;
    }
    return 100 / Math.abs(num);
  };

  const decimalOdds = parseOdds(marketOdds);
  const winProbability = modelPercent / 100;
  const loseProbability = 1 - winProbability;

  // Kelly formula: f* = (bp - q) / b
  // where b = decimal odds, p = win probability, q = lose probability
  const kellyFraction = (decimalOdds * winProbability - loseProbability) / decimalOdds;
  const kellyPercent = kellyFraction * 100;
  const quarterKellyPercent = kellyPercent / 4;

  const bankrollNum = parseFloat(bankroll) || 0;
  const rawKellyAmount = (bankrollNum * kellyPercent) / 100;
  const quarterKellyAmount = (bankrollNum * quarterKellyPercent) / 100;

  const isHighRisk = kellyPercent > 10;

  return (
    <div className={`w-80 bg-bg-surface border border-border-default ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-dim">
        <div className="font-display text-[24px] text-text-primary">KELLY CALCULATOR</div>
        {onClose && (
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-b border-border-dim">
        <div className="label-xs text-text-muted mb-2">BANKROLL</div>
        <div className="flex items-center gap-2 px-3 py-2 bg-bg-raised border border-border-default focus-within:border-border-active">
          <span className="font-mono text-[11px] text-text-muted">$</span>
          <input
            type="number"
            value={bankroll}
            onChange={(e) => setBankroll(e.target.value)}
            className="flex-1 bg-transparent font-mono text-[11px] text-text-primary outline-none"
          />
        </div>
      </div>

      {/* Auto-populated inputs */}
      <div className="p-4 space-y-3 border-b border-border-dim">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="label-xs text-text-muted mb-1">EDGE</div>
            <div className="font-mono text-[11px] text-gg-green-500">{edge.toFixed(2)}%</div>
          </div>
          <div>
            <div className="label-xs text-text-muted mb-1">MODEL%</div>
            <div className="font-mono text-[11px] text-text-primary">{modelPercent.toFixed(1)}%</div>
          </div>
        </div>
        <div>
          <div className="label-xs text-text-muted mb-1">MARKET ODDS</div>
          <div className="font-mono text-[11px] text-text-primary">{marketOdds}</div>
        </div>
      </div>

      {/* Output */}
      <div className="p-4 space-y-4">
        <div>
          <div className="label-xs text-text-muted mb-2">RAW KELLY</div>
          <div className="font-display text-[32px] text-gg-green-500 leading-none">
            {kellyPercent.toFixed(2)}%
          </div>
          <div className="font-mono text-[10px] text-text-secondary mt-1">
            ${rawKellyAmount.toFixed(2)}
          </div>
        </div>

        <div>
          <div className="label-xs text-text-muted mb-2">1/4 KELLY (RECOMMENDED)</div>
          <div className="font-display text-[32px] text-gg-green-500 leading-none">
            {quarterKellyPercent.toFixed(2)}%
          </div>
          <div className="font-mono text-[10px] text-text-secondary mt-1">
            ${quarterKellyAmount.toFixed(2)} • {(quarterKellyAmount / 100).toFixed(2)}u
          </div>
        </div>

        {isHighRisk && (
          <div className="flex gap-2 p-3 bg-bg-raised border-l-2 border-l-signal-lean">
            <AlertTriangle size={14} className="text-signal-lean flex-shrink-0 mt-0.5" />
            <div className="font-mono text-[9px] text-text-secondary">
              Raw Kelly &gt; 10% — consider fractional Kelly sizing for risk management
            </div>
          </div>
        )}

        {/* Formula */}
        <div className="pt-3 border-t border-border-dim">
          <div className="label-xs text-text-muted mb-2">FORMULA</div>
          <div className="font-mono text-[9px] text-text-secondary">
            f* = (bp - q) / b
          </div>
        </div>
      </div>
    </div>
  );
}
