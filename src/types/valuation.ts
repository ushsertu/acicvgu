export interface ValuationOptions {
  region: string;
  currency: string;
  stage: string;
}

export interface ValuationSnapshot {
  arr: number;
  sector: string;
  region: string;
  currency: string;
  stage: string;
  multiples: {
    mid: number;
    low?: number;
    high?: number;
    asOf: string;
    shortRationale?: string;
  };
}

export interface ValuationRange {
  mid: number;
  low: number;
  high: number;
}

export interface Citation {
  index: number;
  title: string;
  uri: string;
}

export interface ValuationResponse {
  snapshot: ValuationSnapshot;
  valuation: ValuationRange;
  explanationBullets: string[];
  citations: Citation[];
  error?: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  reply: string;
  snapshot?: ValuationSnapshot;
  valuation?: ValuationRange;
  citations?: Citation[];
  error?: string;
}