import { BarChart, Bar, XAxis, ResponsiveContainer } from 'recharts';
import { formatINR } from '../lib/utils';
import type { ValuationResponse } from '../types/valuation';

interface ValuationResultsProps {
  response: ValuationResponse;
}

export function ValuationResults({ response }: ValuationResultsProps) {
  const { snapshot, valuation, explanationBullets, citations } = response;

  // Prepare chart data
  const chartData = [
    {
      name: 'Valuation Range',
      low: valuation.low,
      midLow: valuation.mid - valuation.low,
      highMid: valuation.high - valuation.mid,
    }
  ];

  return (
    <div className="space-y-6">
      {/* Valuation Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-medium text-text-strong font-playfair">
            Valuation Range
          </h3>
          <span className="text-sm text-text-light">
            As of {snapshot.multiples.asOf}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-sm text-text-light mb-1">Low</div>
            <div className="text-lg font-semibold text-red-600">
              {formatINR(valuation.low)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-text-light mb-1">Mid</div>
            <div className="text-2xl font-semibold text-text-strong">
              {formatINR(valuation.mid)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-text-light mb-1">High</div>
            <div className="text-lg font-semibold text-green-600">
              {formatINR(valuation.high)}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-20 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="horizontal">
              <XAxis type="number" hide />
              <Bar dataKey="low" stackId="range" fill="#EF4444" />
              <Bar dataKey="midLow" stackId="range" fill="#F59E0B" />
              <Bar dataKey="highMid" stackId="range" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Multiple Info */}
        <div className="text-sm text-text-medium">
          <div className="flex justify-between">
            <span>Multiple Range:</span>
            <span>
              {(snapshot.multiples.low || 0.8 * snapshot.multiples.mid).toFixed(1)}× - {snapshot.multiples.mid.toFixed(1)}× - {(snapshot.multiples.high || 1.2 * snapshot.multiples.mid).toFixed(1)}×
            </span>
          </div>
          {snapshot.multiples.shortRationale && (
            <div className="mt-2 text-xs text-text-light">
              {snapshot.multiples.shortRationale}
            </div>
          )}
        </div>
      </div>

      {/* Explanation */}
      <div className="card">
        <h4 className="text-lg font-medium text-text-strong mb-4 font-playfair">
          Key Insights
        </h4>
        <ul className="space-y-2">
          {explanationBullets.map((bullet, index) => (
            <li key={index} className="text-text-medium flex items-start space-x-2">
              <span className="w-1.5 h-1.5 bg-acic-primary rounded-full mt-2 flex-shrink-0" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>

        {/* Citations */}
        {citations.length > 0 && (
          <div className="mt-6 pt-4 border-t border-acic-border">
            <h5 className="text-sm font-medium text-text-strong mb-2">Sources</h5>
            <div className="space-y-1">
              {citations.map((citation) => (
                <div key={citation.index} className="text-xs text-text-light">
                  <span>[{citation.index}] </span>
                  <a 
                    href={citation.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-acic-primary transition-colors underline"
                  >
                    {citation.title}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}