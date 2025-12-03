import React, { useState, useRef, useEffect } from 'react';
import { chatWithCopilot } from '../services/geminiService';
import { ChatMessage } from '../types';
import { MessageCircle, X, Send, Globe, Loader2, Minimize2 } from 'lucide-react';

const ChatAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Hello! I am your TeleFlow Assistant. Ask me about campaign performance, market trends, or subscriber insights.' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Prepare history for API
    const history = messages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    // Call Gemini
    const { text, groundingUrls } = await chatWithCopilot(userMsg.text, history);
    
    const botMsg: ChatMessage = { 
      id: (Date.now() + 1).toString(), 
      role: 'model', 
      text,
      groundingUrls
    };

    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white w-96 h-[500px] rounded-2xl shadow-2xl border border-slate-200 flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="font-semibold">TeleFlow Copilot</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
              <Minimize2 size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50" ref={scrollRef}>
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'}`}>
                  {msg.text}
                  {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-100">
                      <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Globe size={10} /> Sources:</p>
                      <ul className="space-y-1">
                        {msg.groundingUrls.slice(0, 3).map((url, idx) => (
                          <li key={idx}>
                             <a href={url} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:underline truncate block max-w-full">
                               {new URL(url).hostname}
                             </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                 <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-3 shadow-sm">
                    <Loader2 className="animate-spin text-indigo-600" size={16} />
                 </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-slate-200">
             <div className="flex items-center gap-2 bg-slate-100 rounded-full px-4 py-2">
               <input 
                  type="text" 
                  className="bg-transparent flex-1 outline-none text-sm text-slate-800"
                  placeholder="Ask about data, churn..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
               />
               <button 
                  onClick={handleSend}
                  disabled={isLoading || !input}
                  className="text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
               >
                 <Send size={18} />
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-105 flex items-center gap-2"
        >
          <MessageCircle size={24} />
          <span className="font-semibold pr-2">Ask AI</span>
        </button>
      )}
    </div>
  );
};

export default ChatAssistant;
