import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { MessageCircle, Send, X, Bot, User, Sparkles, Minimize2, Maximize2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AIChatAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const token = localStorage.getItem('betrslip_token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: "Hey! I'm BetrSlip AI. Ask me anything about sports betting — game analysis, odds, strategy, or bankroll management. What can I help with?"
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/chat/message`,
        { message: userMsg, session_id: sessionId },
        { headers }
      );
      setSessionId(res.data.session_id);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
    } catch {
      toast.error('Failed to get response');
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const quickPrompts = [
    "Best NFL bets today?",
    "Explain Kelly Criterion",
    "Parlay strategy tips",
    "NBA player props?"
  ];

  const formatContent = (text) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={i} className="ml-4 text-sm leading-relaxed">{line.slice(2)}</li>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-semibold text-sm mt-2">{line.replace(/\*\*/g, '')}</p>;
      }
      if (line.trim() === '') return <br key={i} />;
      return <p key={i} className="text-sm leading-relaxed">{line.replace(/\*\*/g, '')}</p>;
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full shadow-lg shadow-violet-500/30 flex items-center justify-center hover:scale-105 transition-all group"
      >
        <MessageCircle className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-slate-900 animate-pulse" />
      </button>
    );
  }

  const chatW = isExpanded ? 'w-[520px]' : 'w-[380px]';
  const chatH = isExpanded ? 'h-[600px]' : 'h-[480px]';

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${chatW} ${chatH} flex flex-col transition-all duration-200`}>
      <Card className="flex flex-col h-full bg-slate-900 border-slate-700 shadow-2xl shadow-violet-500/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-violet-600/20 to-purple-600/20 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">BetrSlip AI</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                Online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 hover:bg-slate-800 rounded">
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5 text-slate-400" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-400" />}
            </button>
            <button onClick={() => { setIsOpen(false); setIsExpanded(false); }} className="p-1.5 hover:bg-slate-800 rounded">
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-slate-700">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-md bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-violet-400" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-xl px-3 py-2 ${
                msg.role === 'user'
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-800 text-slate-200'
              }`}>
                {msg.role === 'assistant' ? formatContent(msg.content) : <p className="text-sm">{msg.content}</p>}
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-md bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3 h-3 text-slate-400" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-md bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3 h-3 text-violet-400 animate-pulse" />
              </div>
              <div className="bg-slate-800 rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompts (show only if few messages) */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => { setInput(prompt); }}
                className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 hover:bg-violet-500/20 hover:text-violet-300 transition-colors border border-slate-700"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/80">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about games, odds, strategy..."
              className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 text-sm h-9"
              disabled={loading}
            />
            <Button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-violet-600 hover:bg-violet-700 h-9 w-9 p-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default AIChatAssistant;
