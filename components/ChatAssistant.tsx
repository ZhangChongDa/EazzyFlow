import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, X, Maximize2, Zap, Paperclip, ArrowUp, Sparkles, ChevronDown, Search, MessageSquare, Image as ImageIcon, Brain, CheckCircle, XCircle, Loader2, Clock, Gift, Users, Wifi, Split, MessageCircle, Globe, Calendar, Phone, RotateCcw, Bell, Mail, Smartphone } from 'lucide-react';
import { useChatAssistant } from '../hooks/useChatAssistant';
import { useContext } from 'react';
import { ChatAssistantContext } from '../contexts/ChatAssistantContext';
import { dataService } from '../services/dataService';
import { Offer } from '../types';
import { Node } from '@xyflow/react';

// ✅ Task 3: Add context mode and canvas nodes props
interface ChatAssistantProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialPrompt?: string;
  onArtifactGenerated?: (artifact: { title?: string; copy?: string; imageUrl?: string }) => void;
  onCopyGenerated?: (copy: string | null) => void; // ✅ Fix-2: Callback for copy generation
  contextMode?: 'catalog' | 'canvas'; // ✅ Task 3: Context mode
  canvasNodes?: Node[]; // ✅ Task 3: Nodes for canvas mode
}

export default function ChatAssistant({ 
  isOpen: externalIsOpen, 
  onClose, 
  initialPrompt, 
  onArtifactGenerated,
  onCopyGenerated, // ✅ Fix-2: Copy generation callback
  contextMode = 'catalog', // ✅ Task 3: Default to catalog mode
  canvasNodes = [] // ✅ Task 3: Canvas nodes
}: ChatAssistantProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // ✅ Fix-1: Safely get Context if available (for Layout.tsx usage)
  const context = useContext(ChatAssistantContext);
  const contextOpenChat = context?.openChat || null;
  
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  
  // ✅ Fix-1: Handle opening - prefer Context, then external control, then internal state
  const handleOpen = () => {
    if (contextOpenChat) {
      // Use Context's openChat method
      contextOpenChat();
    } else if (externalIsOpen !== undefined) {
      // External control - if externalIsOpen is false, we can't open it externally
      // Fallback to internal state for standalone usage
      setInternalIsOpen(true);
    } else {
      // No external control, use internal state
      setInternalIsOpen(true);
    }
  };
  
  // ✅ Fix-1: Handle closing
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (context?.closeChat) {
      context.closeChat();
    } else {
      setInternalIsOpen(false);
    }
  };
  
  // ✅ Task 3: @ Mention state (supports both offers and nodes)
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionOffers, setMentionOffers] = useState<Offer[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { messages, input, setInput, isThinking, currentToolCalls, handleSend, handleInputChange } = useChatAssistant(onArtifactGenerated, mentionOffers, onCopyGenerated);  // ✅ Pass callbacks and mentionOffers
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // ✅ Auto-trigger initial prompt
  useEffect(() => {
    if (initialPrompt && isOpen && messages.length <= 1) {
      // Wait a bit for the chat to open, then send
      const timer = setTimeout(() => {
        setInput(initialPrompt);
        handleSend();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [initialPrompt, isOpen, messages.length]);
  
  // ✅ Width resize state
  const [chatWidth, setChatWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef({ x: 0, width: 0 });
  
  // ✅ Task 3: Load offers for @ mentions (only in catalog mode)
  useEffect(() => {
    if (contextMode === 'catalog' && isOpen) {
      const loadOffers = async () => {
        const offers = await dataService.getOffers();
        setMentionOffers(offers);
      };
      loadOffers();
    }
  }, [isOpen, contextMode]);
  
  // ✅ Task 3: Handle @ mention detection (supports both offers and nodes)
  const handleInputChangeWithMentions = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    // ✅ Robust Regex: Matches @ at start of line or after space
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionRegex = /(?:\s|^)@(\w*)$/;
    const match = textBeforeCursor.match(mentionRegex);
    
    if (match) {
      const query = match[1].toLowerCase();
      
      // Show mentions dropdown
      setMentionQuery(query);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
    
    // Call original handler
    if (handleInputChange) {
      handleInputChange(e);
    } else {
      setInput(value);
    }
  };
  
  // ✅ Task 3: Insert mention into input (supports both offers and nodes)
  const handleSelectMention = (item: Offer | Node) => {
    const value = input;
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    
    // Find the @ symbol and replace everything after it
    const mentionRegex = /(?:\s|^)@(\w*)$/;
    const match = textBeforeCursor.match(mentionRegex);
    
    if (match) {
      const matchStart = textBeforeCursor.lastIndexOf('@');
      const beforeAt = value.substring(0, matchStart);
      const afterCursor = value.substring(cursorPos);
      
      // ✅ Task 3: Determine if it's an offer or node
      const isNode = 'type' in item;
      const displayName = isNode ? (item as Node).data?.label || 'Node' : (item as Offer).marketingName;
      
      // Insert as @[Name] with trailing space
      const newValue = `${beforeAt}@[${displayName}] ${afterCursor}`;
      setInput(newValue);
      
      // Set cursor position after mention
      setTimeout(() => {
        if (textareaRef.current) {
          const displayNameStr = typeof displayName === 'string' ? displayName : String(displayName);
          const newCursorPos = matchStart + displayNameStr.length + 4; // +4 for @[ and ] 
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          textareaRef.current.focus();
        }
      }, 0);
    }
    
    setShowMentions(false);
  };
  
  // ✅ Task 3: Filter mentions based on context mode
  const getFilteredMentions = (): (Offer | Node)[] => {
    if (contextMode === 'canvas') {
      // Filter nodes by query
      const nodes = canvasNodes || [];
      return nodes.filter(node => {
        const label = (node.data as any)?.label || '';
        return typeof label === 'string' && label.toLowerCase().includes(mentionQuery.toLowerCase());
      });
    } else {
      // Filter offers by query
      const offers = mentionOffers || [];
      return offers.filter(offer => {
        const name = offer.marketingName || '';
        return typeof name === 'string' && name.toLowerCase().includes(mentionQuery.toLowerCase());
      });
    }
  };

  // Auto-scroll logic
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isThinking, isOpen]);

  // ✅ Resize handlers
  const handleResizeStart = (e: React.MouseEvent) => {
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      width: chatWidth
    };
  };

  useEffect(() => {
    const handleResizeMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const deltaX = resizeStartRef.current.x - e.clientX;
      const newWidth = Math.min(Math.max(resizeStartRef.current.width + deltaX, 320), 800);
      setChatWidth(newWidth);
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  return (
    <>
      {/* 1. Floating Trigger Button (Always Visible when closed) */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-[0_8px_30px_rgb(79,70,229,0.3)] flex items-center justify-center transition-all hover:scale-105 active:scale-95 group"
          title="Open AI Assistant"
        >
          <div className="absolute inset-0 rounded-full border-2 border-indigo-600 opacity-0 animate-[pulse-ring_2s_infinite]"></div>
          <Bot size={28} className="group-hover:rotate-12 transition-transform" />
          <span className="absolute top-0 right-0 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-white"></span>
          </span>
        </button>
      )}

      {/* 2. Global Chat Sidebar (Fixed Overlay) */}
      {/* Using 'fixed' positioning to work across all pages (Dashboard, Canvas, etc.) */}
      <div
        className={`fixed top-0 right-0 h-full bg-white border-l border-slate-200 shadow-2xl z-[80] flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        style={{ width: `${chatWidth}px` }}
      >
        {/* ✅ Resize Handle (Interactive) */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500 transition-colors z-[70] group"
          onMouseDown={handleResizeStart}
        >
          <div className="absolute left-[-2px] top-1/2 -translate-y-1/2 w-1.5 h-8 bg-slate-300 rounded-full group-hover:bg-indigo-600 transition-colors"></div>
        </div>

          {/* Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-100 bg-white/95 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Bot size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 leading-tight">TelePulse AI</h2>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Ready to assist</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors" title="Expand">
              <Maximize2 size={18} />
            </button>
            <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors" title="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 flex flex-col custom-scrollbar p-5 space-y-6">

          {/* Messages */}
            {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : ''} animate-in fade-in slide-in-from-bottom-4 duration-300`}>
              {msg.sender === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm mt-1">
                  <Sparkles size={16} className="text-indigo-600" />
                </div>
              )}
              <div className={`flex flex-col gap-2 max-w-[85%] ${msg.sender === 'user' ? 'items-end' : ''}`}>
                {/* ✅ Tool Calls Display (only for bot messages) */}
                {msg.sender === 'bot' && msg.toolCalls && msg.toolCalls.length > 0 && (
                  <details className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs group">
                    <summary className="list-none cursor-pointer font-semibold text-slate-700 flex items-center gap-2 select-none">
                      <Zap size={14} className="text-indigo-600" />
                      <span>AI Tools Used ({msg.toolCalls.length})</span>
                      <ChevronDown size={14} className="ml-auto group-open:rotate-180 transition-transform text-slate-400" />
                    </summary>
                    <div className="mt-3 space-y-2">
                      {msg.toolCalls.map((tool, idx) => {
                        const toolIcons = {
                          get_current_date: Clock,
                          search_web: Search,
                          grok_social_trends: MessageSquare,
                          generate_image: ImageIcon,
                          deep_think: Brain
                        };
                        const ToolIcon = toolIcons[tool.toolName as keyof typeof toolIcons] || Zap;
                        
                        return (
                          <div key={idx} className="flex items-start gap-2 p-2 bg-white border border-slate-200 rounded">
                            <ToolIcon size={14} className={`mt-0.5 ${tool.status === 'completed' ? 'text-emerald-600' : tool.status === 'failed' ? 'text-red-600' : 'text-indigo-600'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-700">{tool.toolName.replace(/_/g, ' ')}</span>
                                {tool.status === 'completed' && <CheckCircle size={12} className="text-emerald-600" />}
                                {tool.status === 'failed' && <XCircle size={12} className="text-red-600" />}
                                {tool.status === 'running' && <Loader2 size={12} className="animate-spin text-indigo-600" />}
                              </div>
                              {tool.output && (
                                <p className="text-slate-500 text-[10px] mt-1 line-clamp-2">{tool.output.substring(0, 100)}...</p>
                              )}
                              {tool.error && (
                                <p className="text-red-500 text-[10px] mt-1">{tool.error}</p>
                              )}
                            </div>
                            <span className="text-[9px] text-slate-400 whitespace-nowrap">{tool.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}
                
                <div className={`px-4 py-3 shadow-sm text-sm leading-relaxed ${msg.sender === 'user'
                  ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm'
                  : 'bg-white border border-slate-200 text-slate-700 rounded-2xl rounded-tl-sm'
                  }`}>
                  <div className="w-full">
                    {msg.text.match(/<think(?:ing)?>([\ s\S]*?)<\/think(?:ing)?>/) ? (
                      (() => {
                        const match = msg.text.match(/<think(?:ing)?>([\ s\S]*?)<\/think(?:ing)?>/);
                        const thinking = match ? match[1] : '';
                        const content = msg.text.replace(/<think(?:ing)?>[\ s\S]*?<\/think(?:ing)?>/, '').trim();
                        return (
                          <>
                            <details className="mb-3 group">
                              <summary className="list-none cursor-pointer p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-indigo-400 flex items-center gap-2 select-none hover:bg-slate-800 transition-colors">
                                <Zap size={14} />
                                <span className="font-bold">DeepSeek R1 Reasoning</span>
                                <ChevronDown size={14} className="ml-auto group-open:rotate-180 transition-transform text-slate-500" />
                              </summary>
                              <div className="mt-2 p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-400 whitespace-pre-wrap leading-relaxed animate-in fade-in slide-in-from-top-1">
                                {thinking}
                              </div>
                            </details>
                            <div className="prose prose-sm max-w-none prose-slate dark:prose-invert prose-p:leading-relaxed prose-pre:bg-slate-100 prose-pre:border prose-pre:border-slate-200">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                  ul: ({ children }) => <ul className="list-disc pl-4 mb-2 marker:text-indigo-500">{children}</ul>,
                                  li: ({ children }) => <li className="mb-1">{children}</li>,
                                  strong: ({ children }) => <span className="font-semibold text-indigo-700 dark:text-indigo-300">{children}</span>,
                                  // ✅ Image rendering with proper styling (using span to avoid hydration error)
                                  img: ({ src, alt }) => (
                                    <span className="block my-4 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                      <img 
                                        src={src} 
                                        alt={alt || 'Generated image'} 
                                        className="w-full h-auto max-w-full"
                                        loading="lazy"
                                        onError={(e) => {
                                          console.error('Image load error:', src);
                                          (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                      />
                                    </span>
                                  ),
                                  // ✅ Table with horizontal scroll
                                  table: ({ children }) => (
                                    <div className="overflow-x-auto my-3 border border-slate-200 rounded-lg">
                                      <table className="min-w-full divide-y divide-slate-200 text-xs">{children}</table>
                                    </div>
                                  ),
                                  thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
                                  tbody: ({ children }) => <tbody className="divide-y divide-slate-100">{children}</tbody>,
                                  tr: ({ children }) => <tr>{children}</tr>,
                                  th: ({ children }) => <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 whitespace-nowrap">{children}</th>,
                                  td: ({ children }) => <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{children}</td>
                                }}
                              >
                                {content}
                              </ReactMarkdown>
                            </div>
                          </>
                        );
                      })()
                    ) : (
                      <div className="prose prose-sm max-w-none prose-slate dark:prose-invert prose-p:leading-relaxed prose-pre:bg-slate-100 prose-pre:border prose-pre:border-slate-200">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc pl-4 mb-2 marker:text-indigo-500">{children}</ul>,
                            li: ({ children }) => <li className="mb-1">{children}</li>,
                            strong: ({ children }) => <span className="font-semibold text-indigo-700 dark:text-indigo-300">{children}</span>,
                            // ✅ Image rendering with proper styling (using span to avoid hydration error)
                            img: ({ src, alt }) => (
                              <span className="block my-4 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                <img 
                                  src={src} 
                                  alt={alt || 'Generated image'} 
                                  className="w-full h-auto max-w-full"
                                  loading="lazy"
                                  onError={(e) => {
                                    console.error('Image load error:', src);
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </span>
                            ),
                            // ✅ Table with horizontal scroll
                            table: ({ children }) => (
                              <div className="overflow-x-auto my-3 border border-slate-200 rounded-lg">
                                <table className="min-w-full divide-y divide-slate-200 text-xs">{children}</table>
                              </div>
                            ),
                            thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
                            tbody: ({ children }) => <tbody className="divide-y divide-slate-100">{children}</tbody>,
                            tr: ({ children }) => <tr>{children}</tr>,
                            th: ({ children }) => <th className="px-3 py-2 text-left text-xs font-semibold text-slate-700 whitespace-nowrap">{children}</th>,
                            td: ({ children }) => <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">{children}</td>
                          }}
                        >
                  {msg.text}
                        </ReactMarkdown>
                    </div>
                  )}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 px-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                </div>
              </div>
            ))}

          {/* ✅ Enhanced Thinking Indicator with Real-time Tool Calls */}
          {isThinking && (
            <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm mt-1">
                <Sparkles size={16} className="text-indigo-600" />
              </div>
              <div className="flex-1 max-w-[85%]">
                <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-indigo-400">
                      <div className="animate-spin"><Zap size={16} /></div>
                      <span className="text-xs font-mono font-bold uppercase tracking-widest">AI Processing</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Working...</span>
                  </div>
                  
                  {/* Real-time Tool Calls */}
                  {currentToolCalls.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {currentToolCalls.map((tool, idx) => {
                        const toolIcons = {
                          get_current_date: Clock,
                          search_web: Search,
                          grok_social_trends: MessageSquare,
                          generate_image: ImageIcon,
                          deep_think: Brain
                        };
                        const ToolIcon = toolIcons[tool.toolName as keyof typeof toolIcons] || Zap;
                        
                        return (
                          <div key={idx} className="flex items-center gap-2 p-2 bg-slate-800/50 border border-slate-700 rounded text-xs">
                            <ToolIcon size={14} className={`${tool.status === 'completed' ? 'text-emerald-400' : tool.status === 'failed' ? 'text-red-400' : 'text-indigo-400'}`} />
                            <span className="text-slate-300 flex-1">{tool.toolName.replace(/_/g, ' ')}</span>
                            {tool.status === 'completed' && <CheckCircle size={12} className="text-emerald-400" />}
                            {tool.status === 'failed' && <XCircle size={12} className="text-red-400" />}
                            {tool.status === 'running' && <Loader2 size={12} className="animate-spin text-indigo-400" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <div className="space-y-1.5 font-mono text-xs text-slate-400 border-l border-slate-700 pl-3">
                    <p className="text-indigo-300">Analyzing context...</p>
                    <p className="opacity-50">Generating response...</p>
                  </div>
                  <div className="absolute inset-0 pointer-events-none thinking-shimmer opacity-10" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 37%, rgba(255,255,255,0.05) 63%)', backgroundSize: '400% 100%', animation: 'shimmer 1.5s ease infinite' }}></div>
                </div>
                 </div>
              </div>
            )}

          <div ref={chatEndRef}></div>
          </div>

        {/* Input Area */}
        <div className="p-5 bg-white border-t border-slate-200 shrink-0 z-10">
          <div className="relative rounded-xl border border-slate-300 bg-white shadow-sm focus-within:ring-2 focus-within:ring-indigo-600/20 focus-within:border-indigo-600 transition-all">
            <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChangeWithMentions}
              onKeyDown={(e) => { 
                if (e.key === 'Enter' && !e.shiftKey) { 
                  e.preventDefault(); 
                  if (!showMentions) {
                    handleSend(); 
                  }
                }
                if (e.key === 'Escape') {
                  setShowMentions(false);
                }
                if (showMentions && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                  e.preventDefault();
                  // TODO: Navigate mentions list
                }
              }}
              className="w-full bg-transparent border-none rounded-xl py-3 pl-4 pr-12 text-sm focus:ring-0 resize-none min-h-[50px] max-h-[120px] outline-none placeholder:text-slate-400"
              placeholder="Ask TelePulse AI... (Type @ to mention products)"
              rows={1}
            />
            
            {/* ✅ Task 3: @ Mentions Dropdown - Supports both Offers and Nodes */}
            {showMentions && (() => {
              const filteredMentions = getFilteredMentions();
              const hasResults = filteredMentions.length > 0;
              
              return hasResults && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="bg-slate-50 px-3 py-2 border-b border-slate-100 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {contextMode === 'canvas' ? 'Campaign Nodes' : 'Suggested Offers'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {filteredMentions.length} found
                    </span>
                  </div>
                  <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
                    {contextMode === 'canvas' ? (
                      // ✅ Task 3: Render nodes
                      (filteredMentions as Node[]).slice(0, 5).map((node: Node) => {
                        const nodeType = node.type || 'default';
                        const nodeData = node.data as any;
                        const iconKey = nodeData?.icon || nodeType;
                        
                        // Icon mapping for nodes
                        const nodeIconMap: Record<string, any> = {
                          users: Users,
                          wifi: Wifi,
                          gift: Gift,
                          'message-square': MessageCircle,
                          clock: Clock,
                          split: Split,
                          zap: Zap,
                          bell: Bell,
                          mail: Mail,
                          smartphone: Smartphone,
                          globe: Globe,
                          calendar: Calendar,
                          phone: Phone,
                          'message-circle': MessageCircle,
                          'rotate-ccw': RotateCcw,
                          default: Zap
                        };
                        const NodeIcon = nodeIconMap[iconKey] || Zap;
                        const typeColors: Record<string, string> = {
                          trigger: 'text-amber-600',
                          segment: 'text-indigo-600',
                          action: 'text-pink-600',
                          channel: 'text-emerald-600',
                          logic: 'text-blue-600',
                          wait: 'text-slate-600'
                        };
                        
                        return (
                          <button
                            key={node.id}
                            onClick={() => handleSelectMention(node)}
                            className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-lg flex items-center gap-2 transition-colors"
                          >
                            <NodeIcon size={16} className={`${typeColors[nodeType] || 'text-slate-600'} shrink-0`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{nodeData?.label || 'Unnamed Node'}</p>
                              <p className="text-xs text-slate-500 capitalize">{nodeType}</p>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      // Render offers
                      (filteredMentions as Offer[]).slice(0, 5).map((offer: Offer) => (
                        <button
                          key={offer.id}
                          onClick={() => handleSelectMention(offer)}
                          className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <Gift size={16} className="text-indigo-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{offer.marketingName}</p>
                            <p className="text-xs text-slate-500">{offer.finalPrice.toLocaleString()} Ks</p>
                          </div>
                        </button>
                      ))
                    )}
                    {filteredMentions.length === 0 && (
                      <div className="px-3 py-2 text-sm text-slate-500 text-center">
                        {contextMode === 'canvas' ? 'No nodes found' : 'No offers found'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <button
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                title="Attach Context"
              >
                <Paperclip size={18} />
              </button>
               <button 
                  onClick={handleSend}
                disabled={!input || isThinking}
                className={`p-1.5 rounded-lg transition-all shadow-sm ${!input || isThinking
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200'
                  }`}
              >
                <ArrowUp size={18} />
               </button>
             </div>
          </div>
          <p className="text-[10px] text-center text-slate-400 mt-3 flex items-center justify-center gap-1">
            <Sparkles size={10} />
            AI generates insights based on live Supabase data
          </p>
        </div>
    </div>
    </>
  );
}
