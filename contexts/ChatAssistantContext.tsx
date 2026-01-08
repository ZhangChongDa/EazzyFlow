import React, { createContext, useContext, useState, useCallback } from 'react';

interface ChatAssistantContextType {
  isOpen: boolean;
  initialPrompt?: string; // ✅ Fix-3: Expose initialPrompt
  openChat: (initialPrompt?: string, onResponse?: (response: string | null) => void) => void;
  closeChat: () => void;
  onResponseCallback: ((response: string | null) => void) | null;
  setOnResponseCallback: (callback: ((response: string | null) => void) | null) => void;
}

export const ChatAssistantContext = createContext<ChatAssistantContextType | undefined>(undefined);

export const ChatAssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(undefined);
  const [onResponseCallback, setOnResponseCallback] = useState<((response: string | null) => void) | null>(null);

  const openChat = useCallback((prompt?: string, onResponse?: (response: string | null) => void) => {
    setInitialPrompt(prompt);
    setOnResponseCallback(onResponse ? onResponse : null);
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    setInitialPrompt(undefined);
    setOnResponseCallback(null);
  }, []);

  return (
    <ChatAssistantContext.Provider value={{ isOpen, initialPrompt, openChat, closeChat, onResponseCallback, setOnResponseCallback }}>
      {children}
    </ChatAssistantContext.Provider>
  );
};

export const useChatAssistant = () => {
  const context = useContext(ChatAssistantContext);
  if (!context) {
    throw new Error('useChatAssistant must be used within ChatAssistantProvider');
  }
  return context;
};

