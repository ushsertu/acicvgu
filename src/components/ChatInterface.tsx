import { useState } from 'react';
import { Send, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import type { ValuationSnapshot, ChatMessage } from '../types/valuation';

interface ChatInterfaceProps {
  snapshot: ValuationSnapshot;
  onSnapshotUpdate: (snapshot: ValuationSnapshot, valuation: any) => void;
}

export function ChatInterface({ snapshot, onSnapshotUpdate }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setApiError('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          snapshot,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (response.status === 429) {
          setApiError('Rate limit exceeded. Please wait a minute.');
        } else {
          setApiError(data.error || 'Failed to process request');
        }
        return;
      }
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Update snapshot if provided
      if (data.snapshot && data.valuation) {
        onSnapshotUpdate(data.snapshot, data.valuation);
      }
    } catch (err) {
      setApiError('Network error. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center space-x-2 mb-4">
        <MessageSquare className="w-5 h-5 text-acic-primary" />
        <h4 className="text-lg font-medium text-text-strong font-playfair">
          Ask About This Valuation
        </h4>
      </div>

      {/* Messages */}
      {(messages.length > 0 || apiError) && (
        <div className="space-y-4 mb-4 max-h-64 overflow-y-auto">
          {apiError && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{apiError}</span>
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-sm px-4 py-2 rounded-lg text-sm ${
                  message.type === 'user'
                    ? 'bg-acic-primary text-white'
                    : 'bg-gray-100 text-text-strong'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex space-x-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this valuation… e.g., 'make ARR 2Cr', 'use 9×', 'what if ARR +25%?', 'latest E-commerce multiples in India?'"
          className="flex-1 px-4 py-3 rounded-lg border border-acic-border resize-none focus:outline-none focus:ring-2 focus:ring-acic-primary focus:border-transparent"
          rows={1}
          disabled={isLoading}
          maxLength={2500}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="btn-primary px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>

      <div className="mt-2 text-xs text-text-light">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}