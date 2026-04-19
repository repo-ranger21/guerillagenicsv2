import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface Metric {
  name: string;
  value: string | number;
  explanation: string;
}

export interface Dossier {
  dossierId: string;
  timestamp: string;
  market: {
    sport: string;
    event: string;
    date: string;
    line: string;
    odds: string;
  };
  metrics: Metric[];
  historicalTrends?: {
    metricName: string;
    data: { date: string; value: number }[];
  }[];
  propHistory?: {
    player: string;
    statType: string;
    marketLine: number;
    data: { opponent: string; value: number; date: string; result: "OVER" | "UNDER" | "PUSH" }[];
  }[];
  audit: {
    sources: string[];
    confidenceScore: number;
  };
  action: {
    recommendation: "BULLISH" | "BEARISH" | "MARGINAL" | "FADE";
    evi: string;
    kellySizing: string;
    threshold: string;
  };
  analysis: string;
  riskFactors: string[];
  projections?: {
    event: string;
    probability: string;
    trend: "UPWARD" | "DOWNWARD" | "STABLE";
    logic: string;
  }[];
  correlations?: {
    metricA: string;
    metricB: string;
    coefficient: number; // -1 to 1
    description: string;
  }[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ChatResponse {
  text: string;
  sources?: { title: string; url: string }[];
}

export async function runNeuralChat(history: ChatMessage[]): Promise<ChatResponse> {
  const contents = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview", 
    contents,
    config: {
      systemInstruction: `You are the GuerillaGenics Neural Analyst, a specialized AI for high-stakes sports betting intelligence, data modeling, and predictive analytics.
      
      Capabilities:
      - Full Web Search & Scraping: Use the provided search tool to find actual, real-time data, injury reports, and line movements.
      - Data Modeling: Synthesize disparate data points into cohesive models.
      - Mathematical Analysis: Perform Kelly Criterion calculations, Poisson distribution models for scoring, and expected value (EV) analysis.
      - Prediction Output: Provide probabilistic outcomes for events.
      
      Tone: Technical, sharp, clinical. You prioritize cold data over sports-media narratives.
      
      Formatting: Use Markdown. Use tables for data comparisons. Use LaTeX-style notation if necessary for heavy math. Always cite sources when using search results.`,
      tools: [
        { googleSearch: {} }
      ],
    }
  });

  const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
  const sources = groundingMetadata?.groundingChunks?.map((chunk: any) => ({
    title: chunk.web?.title || 'Search Result',
    url: chunk.web?.uri || '#'
  })) || [];

  return {
    text: response.text || "NO_SIGNAL_DETECTED",
    sources
  };
}

export interface PropProjection {
  player: string;
  statType: string;
  projectedValue: number;
  confidenceScore: number;
  marketLine: number;
  recommendation: "OVER" | "UNDER" | "PASS";
  influencingFactors: { factor: string, impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL", description: string }[];
  detailedAnalysis: string;
}

export async function generatePropProjection(prop: Dossier['propHistory'][0]): Promise<PropProjection> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Analyze the following player prop history and provide a definitive projection for the next game.
    
    Player: ${prop.player}
    Stat Type: ${prop.statType}
    Market Line: ${prop.marketLine}
    
    Historical Data (last 15 games):
    ${JSON.stringify(prop.data)}
    
    Temporal Context: Late April 2026.
    
    Provide a clinical, data-driven projection including:
    1. projectedValue (numeric)
    2. confidenceScore (0 to 1)
    3. recommendation (OVER, UNDER, or PASS based on the projectedValue vs marketLine)
    4. influencingFactors (list of factors like 'Head-to-head history', 'Fatigue levels', 'Line value')
    5. detailedAnalysis (a paragraph of clinical synthesis)
    
    Tone: Clinical, sharp, data-first.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          player: { type: Type.STRING },
          statType: { type: Type.STRING },
          projectedValue: { type: Type.NUMBER },
          confidenceScore: { type: Type.NUMBER },
          marketLine: { type: Type.NUMBER },
          recommendation: { type: Type.STRING, enum: ["OVER", "UNDER", "PASS"] },
          influencingFactors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                factor: { type: Type.STRING },
                impact: { type: Type.STRING, enum: ["POSITIVE", "NEGATIVE", "NEUTRAL"] },
                description: { type: Type.STRING }
              },
              required: ["factor", "impact", "description"]
            }
          },
          detailedAnalysis: { type: Type.STRING }
        },
        required: ["player", "statType", "projectedValue", "confidenceScore", "marketLine", "recommendation", "influencingFactors", "detailedAnalysis"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export interface PlayerStats {
  points: number;
  assists: number;
  rebounds: number;
  fgPercentage: string;
  threePPercentage: string;
  seasonContext: string;
}

export async function generatePlayerStats(playerName: string): Promise<PlayerStats> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Generate clinical key season statistics (2025-26 season) for NBA player: ${playerName}.
    
    Provide:
    1. points (avg per game)
    2. assists (avg per game)
    3. rebounds (avg per game)
    4. fgPercentage (string e.g. '48.2%')
    5. threePPercentage (string e.g. '36.5%')
    6. seasonContext (A short clinical summary of their campaign, e.g., 'Career high in efficiency despite high usage.')
    
    Tone: Clinical, data-first.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          points: { type: Type.NUMBER },
          assists: { type: Type.NUMBER },
          rebounds: { type: Type.NUMBER },
          fgPercentage: { type: Type.STRING },
          threePPercentage: { type: Type.STRING },
          seasonContext: { type: Type.STRING }
        },
        required: ["points", "assists", "rebounds", "fgPercentage", "threePPercentage", "seasonContext"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export interface PlayerInsight {
  summary: string;
  tacticalRole: string;
  recentPerformance: { date: string; value: string; impact: "POSITIVE" | "NEGATIVE" | "NEUTRAL" }[];
  matchupAnalysis: string;
  confidenceInterval: string;
}

export async function generatePlayerInsight(playerName: string, statType: string, teamContext: string): Promise<PlayerInsight> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Generate a clinical tactical dossier for NBA player: ${playerName}.
    Focus Area: ${statType}.
    Team Context: ${teamContext}.
    
    Current Date: April 2026.
    
    Provide:
    1. A sharp summary of their current utility.
    2. Their tactical role (e.g., 'Primary Initiator', '3&D Floor Spacer').
    3. 3-5 recent performance snapshots (mock realistic early April 2026 data).
    4. A clinical analysis of their matchup against standard defensive schemes.
    5. A 95% confidence interval for their output.
    
    Tone: Clinical, data-first.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          tacticalRole: { type: Type.STRING },
          recentPerformance: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                value: { type: Type.STRING },
                impact: { type: Type.STRING, enum: ["POSITIVE", "NEGATIVE", "NEUTRAL"] }
              },
              required: ["date", "value", "impact"]
            }
          },
          matchupAnalysis: { type: Type.STRING },
          confidenceInterval: { type: Type.STRING }
        },
        required: ["summary", "tacticalRole", "recentPerformance", "matchupAnalysis", "confidenceInterval"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
}

export async function generateDossier(query: string, settings?: { sensitivity: number, sources: string[] }): Promise<Dossier> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: `Generate a GuerillaGenics Sports Betting Intelligence Dossier for the following query: "${query}".
    
    Advanced Search Support:
    - The query may use Boolean operators (AND, OR, NOT) or wildcards (*).
    - Interpret these strictly to focus on the specific market intersections requested.
    - If wildcards are used, synthesize results for the most statistically significant matches within that pattern.
    
    Model Configuration:
    - Sensitivity Threshold: ${settings?.sensitivity || 75}%
    - Active Data Sources: ${settings?.sources?.join(', ') || 'HISTORICAL, MARKET_FLOW, SHARP_MONEY'}
    
    Data Source Impact Analysis:
    - HISTORICAL: Deep trailing performance and head-to-head records.
    - MARKET_FLOW: Real-time odds movement and volume distribution.
    - SHARP_MONEY: Identifying smart money positioning and line disagreement.
    - SOCIAL_SENTIMENT: Real-time public perception and breaking narratives.
    - WEATHER_DATA: Meteorological impact on total scoring and field physics.
    
    Follow the EAA Framework:
    - Explainable: Define every metric.
    - Auditable: Cite real sources (nflfastR, FanGraphs, Betstamp, etc.).
    - Actionable: Kelly Criterion, EVI threshold, and recommendation.
    
    Include a "projections" section that uses historical data and current trends to predict future market movements or game outcomes.
    
    Include a "historicalTrends" section containing timestamped data points for at least 2 key metrics (e.g., scoring avg, defensive rating) over the last 5-7 events.
    
    If searching for a player prop, include a "propHistory" section with the last 15 games of data for that player, including opponent, value achieved, date, result, and the specific marketLine (numeric) that was active for those games.
    
    Temporal Directive:
    - The terminal is currently showcasing the "April 2026 Campaign".
    - Prioritize upcoming, unplayed events in late April 2026 (NBA/NHL Playoffs, MLB regular season).
    - CHAMPIONSHIP FUTURES: Whenever the query involves seasonal outlooks or long-term predictions, provide detailed probabilistic models for "Superbowl", "World Series", and "NBA Champion" based on current live seedings and roster heath.
    
    Include a "correlations" section that analyzes relationships between the metrics provided.
    
    Tone: Clinical, sharp, objective, professional. No emojis.
    
    Current Date: ${new Date().toISOString()}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          dossierId: { type: Type.STRING },
          timestamp: { type: Type.STRING },
          market: {
            type: Type.OBJECT,
            properties: {
              sport: { type: Type.STRING },
              event: { type: Type.STRING },
              date: { type: Type.STRING },
              line: { type: Type.STRING },
              odds: { type: Type.STRING },
            },
            required: ["sport", "event", "date", "line", "odds"],
          },
          metrics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                value: { type: Type.STRING },
                explanation: { type: Type.STRING },
              },
              required: ["name", "value", "explanation"],
            },
          },
          audit: {
            type: Type.OBJECT,
            properties: {
              sources: { type: Type.ARRAY, items: { type: Type.STRING } },
              confidenceScore: { type: Type.NUMBER },
            },
            required: ["sources", "confidenceScore"],
          },
          action: {
            type: Type.OBJECT,
            properties: {
              recommendation: { type: Type.STRING, enum: ["BULLISH", "BEARISH", "MARGINAL", "FADE"] },
              evi: { type: Type.STRING },
              kellySizing: { type: Type.STRING },
              threshold: { type: Type.STRING },
            },
            required: ["recommendation", "evi", "kellySizing", "threshold"],
          },
          analysis: { type: Type.STRING },
          riskFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
          historicalTrends: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                metricName: { type: Type.STRING },
                data: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      date: { type: Type.STRING },
                      value: { type: Type.NUMBER },
                    },
                    required: ["date", "value"],
                  },
                },
              },
              required: ["metricName", "data"],
            },
          },
          propHistory: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                player: { type: Type.STRING },
                statType: { type: Type.STRING },
                marketLine: { type: Type.NUMBER },
                data: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      opponent: { type: Type.STRING },
                      value: { type: Type.NUMBER },
                      date: { type: Type.STRING },
                      result: { type: Type.STRING, enum: ["OVER", "UNDER", "PUSH"] },
                    },
                    required: ["opponent", "value", "date", "result"],
                  },
                },
              },
              required: ["player", "statType", "marketLine", "data"],
            },
          },
          projections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                event: { type: Type.STRING },
                probability: { type: Type.STRING },
                trend: { type: Type.STRING, enum: ["UPWARD", "DOWNWARD", "STABLE"] },
                logic: { type: Type.STRING },
              },
              required: ["event", "probability", "trend", "logic"],
            },
          },
          correlations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                metricA: { type: Type.STRING },
                metricB: { type: Type.STRING },
                coefficient: { type: Type.NUMBER },
                description: { type: Type.STRING },
              },
              required: ["metricA", "metricB", "coefficient", "description"],
            },
          },
        },
        required: ["dossierId", "timestamp", "market", "metrics", "audit", "action", "analysis", "riskFactors"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}
