import { useState, useCallback } from 'react';
import { Settings, AlertTriangle } from 'lucide-react';
import { ValuationForm } from './components/ValuationForm';
import { ValuationResults } from './components/ValuationResults';
import { ChatInterface } from './components/ChatInterface';
import { OptionsDrawer } from './components/OptionsDrawer';
import type { ValuationSnapshot, ValuationResponse } from './types/valuation';

export default function App() {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [currentSnapshot, setCurrentSnapshot] = useState<ValuationSnapshot | null>(null);
  const [currentValuation, setCurrentValuation] = useState<ValuationResponse | null>(null);
  const [showApiKeyBanner, setShowApiKeyBanner] = useState(false);
  const [options, setOptions] = useState({
    region: 'India',
    currency: 'INR',
    stage: 'Seed',
  });

  const handleValuationComplete = useCallback((response: ValuationResponse) => {
    if (response.error) {
      if (response.error.includes('AI service unavailable')) {
        setShowApiKeyBanner(true);
      }
      return;
    }
    setCurrentSnapshot(response.snapshot);
    setCurrentValuation(response);
    setShowApiKeyBanner(false);
  }, []);

  const handleSnapshotUpdate = useCallback((snapshot: ValuationSnapshot, valuation: any) => {
    setCurrentSnapshot(snapshot);
    setCurrentValuation(prev => prev ? { ...prev, snapshot, valuation } : null);
  }, []);

  return (
    <div className="min-h-screen bg-acic-bg">
      {/* API Key Banner */}
      {showApiKeyBanner && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <div className="text-sm text-yellow-800">
              <span className="font-medium">AI service unavailable:</span> Please add your Gemini API key to the .env file to enable valuations.
            </div>
            <button
              onClick={() => setShowApiKeyBanner(false)}
              className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-acic-border bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-32 h-10 bg-acic-primary rounded flex items-center justify-center">
              <span className="text-acic-accent font-playfair font-medium text-sm">ACIC VGU</span>
            </div>
            <h1 className="text-2xl font-medium text-text-strong font-playfair">
              AI Valuator
            </h1>
          </div>
          
          <button
            onClick={() => setIsOptionsOpen(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Settings className="w-4 h-4" />
            <span>Options</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Valuation Form */}
        <ValuationForm 
          options={options}
          onValuationComplete={handleValuationComplete}
        />

        {/* Results */}
        {currentValuation && (
          <ValuationResults 
            response={currentValuation}
          />
        )}

        {/* Chat Interface */}
        {currentSnapshot && (
          <ChatInterface 
            snapshot={currentSnapshot}
            onSnapshotUpdate={handleSnapshotUpdate}
          />
        )}
      </main>

      {/* Options Drawer */}
      <OptionsDrawer
        isOpen={isOptionsOpen}
        onClose={() => setIsOptionsOpen(false)}
        options={options}
        onOptionsChange={setOptions}
      />
    </div>
  );
}