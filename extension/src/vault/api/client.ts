// Typed fetch wrapper for the Vault backend.
import type {
  AuthResponse,
  Decision,
  EstimatedSavings,
  InterceptedItem,
  LogResponse,
  MatchResponse,
  SecondhandResponse,
  Tally,
  TrueCostResponse,
} from '../../shared/types';

export const BACKEND_URL = 'http://localhost:8000'; // TODO: swap to deployed hf.space URL

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`${path} -> ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`);
  if (!res.ok) {
    throw new Error(`${path} -> ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  startAuth(): Promise<AuthResponse> {
    return post<AuthResponse>('/auth/gmail', { user_id: 'pending' });
  },

  getMatches(user_id: string, item: InterceptedItem): Promise<MatchResponse> {
    return post<MatchResponse>('/match', {
      user_id,
      image_url: item.image_url,
      title: item.title,
      category: item.retailer === 'shein' ? 'fast_fashion_top' : 'electronics_small',
    });
  },

  getSecondhand(title: string): Promise<SecondhandResponse> {
    return post<SecondhandResponse>('/secondhand', { title });
  },

  getTrueCost(price: number, category: string, hourly_rate: number): Promise<TrueCostResponse> {
    return post<TrueCostResponse>('/true-cost', { price, category, hourly_rate });
  },

  logDecision(
    user_id: string,
    item: InterceptedItem,
    decision: Decision,
    estimated_savings: EstimatedSavings
  ): Promise<LogResponse> {
    return post<LogResponse>('/log', { user_id, item, decision, estimated_savings });
  },

  getHistory(user_id: string): Promise<{ interceptions: unknown[] }> {
    return get<{ interceptions: unknown[] }>(`/history?user_id=${encodeURIComponent(user_id)}`);
  },

  getTally(user_id: string): Promise<Tally> {
    return get<Tally>(`/tally?user_id=${encodeURIComponent(user_id)}`);
  },
};
