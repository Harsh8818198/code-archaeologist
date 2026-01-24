'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, FileText } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    model?: string;
    responseTimeMs?: number;
    sources?: string[];
  };
}

interface ChatInterfaceProps {
  jobId: string;
}

export default function ChatInterface({ jobId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          jobId,
          sessionId
        })
      });

      if (!response.ok) throw new Error('Chat request failed');

      const data = await response.json();

      if (data.success) {
        // Set session ID for continuity
        if (data.sessionId && !sessionId) {
          setSessionId(data.sessionId);
        }

        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
          metadata: data.metadata
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-slate-900 rounded-lg border border-slate-700 shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700 bg-slate-800">
        <Sparkles className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-semibold text-white">Ask About This Repository</h3>
        {sessionId && (
          <span className="ml-auto text-xs text-slate-400">
            Session: {sessionId.slice(0, 8)}...
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 mt-8">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-slate-600" />
            <p className="text-sm">Ask questions about the code in this repository</p>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => setInput("What files were analyzed?")}
                className="block w-full text-left px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
              >
                💡 What files were analyzed?
              </button>
              <button
                onClick={() => setInput("Find code related to authentication")}
                className="block w-full text-left px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
              >
                🔍 Find code related to authentication
              </button>
              <button
                onClick={() => setInput("What are the main hotspots?")}
                className="block w-full text-left px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
              >
                🔥 What are the main hotspots?
              </button>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-100 border border-slate-700'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              
              {/* Metadata for assistant messages */}
              {message.role === 'assistant' && message.metadata && (
                <div className="mt-2 pt-2 border-t border-slate-700 text-xs text-slate-400">
                  <div className="flex items-center gap-4">
                    {message.metadata.model && (
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {message.metadata.model}
                      </span>
                    )}
                    {message.metadata.responseTimeMs && (
                      <span>{message.metadata.responseTimeMs}ms</span>
                    )}
                  </div>
                  
                  {/* Sources found */}
                  {message.metadata.sources && message.metadata.sources.length > 0 && (
                    <div className="mt-2">
                      <p className="font-semibold mb-1">Sources:</p>
                      {message.metadata.sources.map((source, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-amber-400">
                          <FileText className="w-3 h-3" />
                          <span>{source}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-700 p-4 bg-slate-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about this repository..."
            disabled={loading}
            className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
