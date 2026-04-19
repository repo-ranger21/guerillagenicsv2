import { PlayoffBracketNode } from '../components/PlayoffBracketNode';

const championshipProbabilities = [
  { team: 'OKLAHOMA CITY THUNDER', logo: '⚡', probability: 22.4 },
  { team: 'BOSTON CELTICS', logo: '☘️', probability: 20.1 },
  { team: 'DENVER NUGGETS', logo: '⛰️', probability: 16.8 },
  { team: 'MILWAUKEE BUCKS', logo: '🦌', probability: 14.2 },
  { team: 'PHOENIX SUNS', logo: '☀️', probability: 11.9 },
  { team: 'GOLDEN STATE WARRIORS', logo: '🌉', probability: 10.3 },
  { team: 'DALLAS MAVERICKS', logo: '🐴', probability: 8.7 },
  { team: 'LA CLIPPERS', logo: '⛵', probability: 6.2 },
];

export function PlayoffBracket() {
  return (
    <div className="min-h-screen bg-bg-void p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="font-display text-[48px] text-text-primary">
            NBA PLAYOFF BRACKET
          </div>
          <div className="text-right">
            <div className="px-4 py-2 bg-bg-surface border border-border-dim inline-block">
              <div className="label-xs text-gg-green-500">10,000 SIMULATIONS</div>
              <div className="font-mono text-[8px] text-text-muted mt-1">
                LAST RUN: APR 19, 2026 08:42 ET
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bracket Visualization */}
      <div className="bg-bg-surface border border-border-dim p-12 mb-8">
        <div className="flex justify-center items-center gap-16">
          {/* Round 1 - Left Side */}
          <div className="space-y-12">
            <div className="label-xs text-text-muted mb-4">ROUND 1</div>
            <PlayoffBracketNode
              team={{ name: 'THUNDER', abbreviation: 'OKC', logo: '⚡' }}
              winProbability={87}
              state="active"
            />
            <PlayoffBracketNode
              team={{ name: 'SUNS', abbreviation: 'PHX', logo: '☀️' }}
              winProbability={76}
            />
            <PlayoffBracketNode
              team={{ name: 'CELTICS', abbreviation: 'BOS', logo: '☘️' }}
              winProbability={82}
            />
            <PlayoffBracketNode
              team={{ name: 'NUGGETS', abbreviation: 'DEN', logo: '⛰️' }}
              winProbability={79}
            />
          </div>

          {/* Round 2 - Left Side */}
          <div className="space-y-12">
            <div className="label-xs text-text-muted mb-4">ROUND 2</div>
            <div className="mt-24">
              <PlayoffBracketNode
                team={{ name: 'THUNDER', abbreviation: 'OKC', logo: '⚡' }}
                winProbability={64}
                state="active"
              />
            </div>
            <div className="mt-24">
              <PlayoffBracketNode
                team={{ name: 'CELTICS', abbreviation: 'BOS', logo: '☘️' }}
                winProbability={58}
              />
            </div>
          </div>

          {/* Conference Finals */}
          <div className="space-y-12">
            <div className="label-xs text-text-muted mb-4">CONF FINALS</div>
            <div className="mt-48">
              <PlayoffBracketNode
                team={{ name: 'THUNDER', abbreviation: 'OKC', logo: '⚡' }}
                winProbability={52}
                state="active"
              />
            </div>
          </div>

          {/* Championship */}
          <div className="space-y-12">
            <div className="label-xs text-gg-green-500 mb-4">CHAMPIONSHIP</div>
            <div className="mt-48">
              <div className="w-60 h-24 bg-bg-raised border-2 border-gg-green-500 p-4 shadow-[0_0_32px_rgba(132,255,71,0.12)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center text-[24px]">
                      ⚡
                    </div>
                    <span className="font-display text-[16px] text-text-primary">OKC</span>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-[32px] text-gg-green-500 leading-none">22%</div>
                    <div className="label-xs text-text-muted">WIN PROB</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Conference Finals - Right */}
          <div className="space-y-12">
            <div className="label-xs text-text-muted mb-4">CONF FINALS</div>
            <div className="mt-48">
              <PlayoffBracketNode
                team={{ name: 'CELTICS', abbreviation: 'BOS', logo: '☘️' }}
                winProbability={48}
              />
            </div>
          </div>

          {/* Round 2 - Right Side */}
          <div className="space-y-12">
            <div className="label-xs text-text-muted mb-4">ROUND 2</div>
            <div className="mt-24">
              <PlayoffBracketNode
                team={{ name: 'BUCKS', abbreviation: 'MIL', logo: '🦌' }}
                winProbability={54}
              />
            </div>
            <div className="mt-24">
              <PlayoffBracketNode
                team={{ name: 'WARRIORS', abbreviation: 'GSW', logo: '🌉' }}
                winProbability={49}
              />
            </div>
          </div>

          {/* Round 1 - Right Side */}
          <div className="space-y-12">
            <div className="label-xs text-text-muted mb-4">ROUND 1</div>
            <PlayoffBracketNode
              team={{ name: 'BUCKS', abbreviation: 'MIL', logo: '🦌' }}
              winProbability={78}
            />
            <PlayoffBracketNode
              team={{ name: 'MAVERICKS', abbreviation: 'DAL', logo: '🐴' }}
              winProbability={71}
            />
            <PlayoffBracketNode
              team={{ name: 'WARRIORS', abbreviation: 'GSW', logo: '🌉' }}
              winProbability={74}
            />
            <PlayoffBracketNode
              team={{ name: 'CLIPPERS', abbreviation: 'LAC', logo: '⛵' }}
              winProbability={62}
            />
          </div>
        </div>
      </div>

      {/* Championship Probabilities */}
      <div className="bg-bg-surface border border-border-dim p-8">
        <div className="label-md text-text-primary mb-6">CHAMPIONSHIP PROBABILITY</div>
        <div className="space-y-4">
          {championshipProbabilities.map((team, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-8 flex-shrink-0 font-display text-[20px] text-text-muted">
                {i + 1}
              </div>
              <div className="w-8 h-8 flex items-center justify-center text-[20px]">
                {team.logo}
              </div>
              <div className="flex-1 font-display text-[14px] text-text-primary">
                {team.team}
              </div>
              <div className="flex-1">
                <div className="h-2 bg-bg-raised">
                  <div
                    className="h-full bg-gg-green-500 transition-all duration-[800ms]"
                    style={{ width: `${team.probability * 4}%` }}
                  />
                </div>
              </div>
              <div className="w-16 text-right font-display text-[20px] text-gg-green-500">
                {team.probability}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
