import { X } from 'lucide-react';
import type { ValuationOptions } from '../types/valuation';

interface OptionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  options: ValuationOptions;
  onOptionsChange: (options: ValuationOptions) => void;
}

const REGIONS = ['India', 'Global', 'US', 'Europe', 'Asia'];
const CURRENCIES = ['INR', 'USD', 'EUR'];
const STAGES = ['Seed', 'Series A', 'Series B', 'Growth', 'Pre-IPO'];

export function OptionsDrawer({ isOpen, onClose, options, onOptionsChange }: OptionsDrawerProps) {
  if (!isOpen) return null;

  const handleChange = (key: keyof ValuationOptions, value: string) => {
    onOptionsChange({ ...options, [key]: value });
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform">
        <div className="p-6 border-b border-acic-border">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-text-strong font-playfair">
              Options
            </h3>
            <button
              onClick={onClose}
              className="text-text-light hover:text-text-strong transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Region */}
          <div>
            <label className="block text-sm font-medium text-text-strong mb-2">
              Region
            </label>
            <select
              value={options.region}
              onChange={(e) => handleChange('region', e.target.value)}
              className="w-full input-field"
            >
              {REGIONS.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-text-strong mb-2">
              Currency
            </label>
            <select
              value={options.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              className="w-full input-field"
            >
              {CURRENCIES.map(currency => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          </div>

          {/* Stage */}
          <div>
            <label className="block text-sm font-medium text-text-strong mb-2">
              Stage
            </label>
            <select
              value={options.stage}
              onChange={(e) => handleChange('stage', e.target.value)}
              className="w-full input-field"
            >
              {STAGES.map(stage => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-acic-border">
            <p className="text-xs text-text-light">
              These defaults affect market multiple calculations and regional context for AI analysis.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}