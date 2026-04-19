import { Cloud, Wind, MapPin, Clock } from 'lucide-react';

interface EnvironmentalFactorIndicatorProps {
  weather?: {
    condition: string;
    temp: number;
    wind?: { speed: number; direction: string };
  };
  altitude?: number;
  travelFatigue?: 'low' | 'medium' | 'high';
  umpireTendency?: 'K-HEAVY' | 'BB-HEAVY' | 'NEUTRAL';
  className?: string;
}

export function EnvironmentalFactorIndicator({
  weather,
  altitude,
  travelFatigue,
  umpireTendency,
  className = '',
}: EnvironmentalFactorIndicatorProps) {
  const fatigueColor = {
    low: 'bg-data-positive',
    medium: 'bg-signal-lean',
    high: 'bg-data-negative',
  };

  return (
    <div className={`flex flex-wrap items-center gap-4 ${className}`}>
      {/* Weather */}
      {weather && (
        <div className="flex items-center gap-2">
          <Cloud size={14} className="text-text-muted" />
          <span className="font-mono text-[10px] text-text-secondary">
            {weather.condition} {weather.temp}°F
          </span>
        </div>
      )}

      {/* Wind */}
      {weather?.wind && (
        <div className="flex items-center gap-2">
          <Wind size={14} className="text-text-muted" />
          <span className="font-mono text-[10px] text-text-secondary">
            {weather.wind.direction} {weather.wind.speed}mph
          </span>
        </div>
      )}

      {/* Altitude */}
      {altitude && altitude > 500 && (
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-text-muted" />
          <span className="font-mono text-[10px] text-text-secondary">
            {altitude}m elevation
          </span>
        </div>
      )}

      {/* Travel Fatigue */}
      {travelFatigue && (
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-text-muted" />
          <div className={`w-2 h-2 rounded-full ${fatigueColor[travelFatigue]}`} />
          <span className="font-mono text-[10px] text-text-secondary">
            {travelFatigue === 'low' ? '2+ rest' : travelFatigue === 'medium' ? '1d rest' : 'B2B'}
          </span>
        </div>
      )}

      {/* Umpire Tendency */}
      {umpireTendency && umpireTendency !== 'NEUTRAL' && (
        <div className="px-2 py-1 bg-bg-raised border border-border-dim">
          <span className="label-xs text-text-secondary">{umpireTendency}</span>
        </div>
      )}
    </div>
  );
}
