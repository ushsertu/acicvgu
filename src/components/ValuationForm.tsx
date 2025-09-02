import { useState } from 'react';
import { TrendingUp, Loader2, AlertCircle } from 'lucide-react';
import { parseINR } from '../lib/utils';
import type { ValuationOptions, ValuationResponse } from '../types/valuation';

interface ValuationFormProps {
  options: ValuationOptions;
  onValuationComplete: (response: ValuationResponse) => void;
}

const SECTORS = [
  'E-commerce',
  'SaaS',
  'Fintech', 
  'HealthTech',
  'Other'
];

export function ValuationForm({ options, onValuationComplete }: ValuationFormProps) {
  const [arrOrMrr, setArrOrMrr] = useState('');
  const [isMRR, setIsMRR] = useState(false);
  const [sector, setSector] = useState('E-commerce');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arrOrMrr.trim() || !sector) {
      setError('Enter both ARR/MRR and sector');
      return;
    }

    setIsLoading(true);
    setError('');
    setApiError('');

    try {
      // Validate the input format
      parseINR(arrOrMrr);
      
      // Call real API
      const response = await fetch('/api/valuation/quick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          arrOrMrr,
          isMRR,
          sector,
          region: options.region,
          currency: options.currency,
          stage: options.stage,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 429) {
          setApiError('Rate limit exceeded. Please wait a minute before trying again.');
        } else {
          setApiError(data.error || 'Failed to get valuation');
        }
        return;
      }

      onValuationComplete(data);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Enter a valid amount')) {
        setError(err.message);
      } else {
        setApiError('Network error. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-2xl font-medium text-text-strong mb-6 font-playfair">
            Get AI-Powered Valuation
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* ARR/MRR Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-strong">
                  Revenue (Annual/Monthly)
                </label>
                <div className="flex rounded-lg border border-acic-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setIsMRR(false)}
                    className={`px-3 py-1 text-sm font-medium transition-colors ${
                      !isMRR 
                        ? 'bg-acic-primary text-white' 
                        : 'bg-white text-text-medium hover:bg-gray-50'
                    }`}
                  >
                    ARR
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMRR(true)}
                    className={`px-3 py-1 text-sm font-medium transition-colors ${
                      isMRR 
                        ? 'bg-acic-primary text-white' 
                        : 'bg-white text-text-medium hover:bg-gray-50'
                    }`}
                  >
                    MRR
                  </button>
                </div>
              </div>
              
              <input
                type="text"
                value={arrOrMrr}
                onChange={(e) => setArrOrMrr(e.target.value)}
                placeholder="e.g., 1.5Cr, 12L, 85k"
                className="input-field"
                disabled={isLoading}
              />
              <p className="text-xs text-text-light">
                Supports: k, L/lakh, Cr/crore, commas (e.g., 2l, 1.5Cr)
              </p>
            </div>

            {/* Sector Select */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-text-strong">
                Sector
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="input-field"
                disabled={isLoading}
              >
                {SECTORS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {apiError && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{apiError}</span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !arrOrMrr.trim()}
          className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <TrendingUp className="w-5 h-5" />
          )}
          <span>
            {isLoading ? 'Getting Valuation...' : 'Get Valuation'}
          </span>
        </button>
      </form>
    </div>
  );
}