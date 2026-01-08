import { useState, useCallback } from 'react';
import { chatWithCopilot } from '../services/geminiService';
import { contextService } from '../services/contextService';
import { dataService } from '../services/dataService';
import { Offer } from '../types';

export interface ChatMessage {
    id: string;
    sender: 'user' | 'bot';
    text: string;
    timestamp: Date;
    isThinking?: boolean;
    toolCalls?: ToolCallInfo[];  // ✅ New: Track tool calls
}

export interface ArtifactCallback {
    (artifact: { title?: string; copy?: string; imageUrl?: string }): void;
}

export interface ToolCallInfo {
    toolName: string;
    status: 'running' | 'completed' | 'failed';
    timestamp: Date;
    output?: string;
    error?: string;
}

export const useChatAssistant = (onArtifactGenerated?: ArtifactCallback, mentionOffers?: Offer[], onCopyGenerated?: (copy: string | null) => void) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            sender: 'bot',
            text: 'Hello! I am your TelePulse AI assistant. I can help you analyze campaign performance, identify churn risks, or suggest new marketing strategies. How can I help you today?',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [currentToolCalls, setCurrentToolCalls] = useState<ToolCallInfo[]>([]);  // ✅ New state

    const handleSend = useCallback(async () => {
        if (!input.trim()) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            sender: 'user',
            text: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsThinking(true);
        setCurrentToolCalls([]);  // ✅ Reset tool calls

        try {
            // 1. Parse @[Name] mentions from input
            const mentionedOffers: Offer[] = [];
            const mentionRegex = /@\[([^\]]+)\]/g;
            let match;
            const offerNames = new Set<string>();
            
            while ((match = mentionRegex.exec(userMsg.text)) !== null) {
                offerNames.add(match[1].trim());
            }
            
            // Lookup mentioned offers from the offers list (passed from ChatAssistant)
            const allOffers = mentionOffers && mentionOffers.length > 0 
                ? mentionOffers 
                : await dataService.getOffers();
            
            if (offerNames.size > 0) {
                for (const name of offerNames) {
                    const offer = allOffers.find(o => 
                        o.marketingName.toLowerCase() === name.toLowerCase() ||
                        o.marketingName.toLowerCase().includes(name.toLowerCase())
                    );
                    if (offer) {
                        mentionedOffers.push(offer);
                    }
                }
            }
            
            // 2. Get Live Context
            let systemContext = await contextService.getLiveContext();
            
            // 3. Append mentioned product context with full details
            if (mentionedOffers.length > 0) {
                const productContext = mentionedOffers.map(offer => {
                    const baseProduct = offer.product;
                    return {
                        id: offer.id,
                        marketingName: offer.marketingName,
                        baseProduct: baseProduct ? {
                            name: baseProduct.marketingName,
                            type: baseProduct.type,
                            originalPrice: baseProduct.price
                        } : null,
                        finalPrice: offer.finalPrice,
                        discountPercent: offer.discountPercent || 0,
                        imageUrl: offer.imageUrl || null,
                        marketingCopy: (offer as any).marketingCopy || null
                    };
                });
                
                systemContext += `\n\n[USER REFERENCED CONTEXT]:\n${JSON.stringify(productContext, null, 2)}\n\nWhen the user asks about these products (referenced with @[Name]), use this exact information to provide accurate, contextual answers. Include specific prices, discounts, and product details in your response.`;
            }

            // 2. Prepare Bot Message Placeholder
            const botMsgId = (Date.now() + 1).toString();
            setMessages(prev => [...prev, {
                id: botMsgId,
                sender: 'bot',
                text: '',
                timestamp: new Date(),
                isThinking: true,
                toolCalls: []
            }]);

            // ✅ 3. Tool call callback for real-time updates
            const onToolCall = (toolName: string, status: 'running' | 'completed' | 'failed', output?: string, error?: string) => {
                const toolCall: ToolCallInfo = {
                    toolName,
                    status,
                    timestamp: new Date(),
                    output,
                    error
                };
                
                setCurrentToolCalls(prev => {
                    // Update existing or add new
                    const existing = prev.find(t => t.toolName === toolName && t.status === 'running');
                    if (existing && status !== 'running') {
                        return prev.map(t => t.toolName === toolName && t.status === 'running' ? toolCall : t);
                    }
                    return [...prev, toolCall];
                });
            };

            // 4. Call AI Service (Unified DeepSeek Agent)
            const history = messages.map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            }));

            const response = await chatWithCopilot(
                userMsg.text,
                history,
                systemContext,
                onToolCall  // ✅ Pass callback
            );

            // 5. Reset isThinking FIRST to prevent UI glitches
            setIsThinking(false);

            // 6. Handle empty or invalid responses
            const responseText = response.text?.trim() || '';
            if (!responseText) {
                console.warn("AI returned empty response");
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === botMsgId
                            ? { ...msg, text: "I apologize, but I couldn't generate a proper response. Please try rephrasing your question.", isThinking: false, toolCalls: currentToolCalls }
                            : msg
                    )
                );
                // ✅ Fix-3: Call onCopyGenerated with null if response is empty
                if (onCopyGenerated) {
                    onCopyGenerated(null);
                }
                return;
            }

            // 7. Warn if response is suspiciously short (likely incomplete)
            if (responseText.length < 30) {
                console.warn("AI returned suspiciously short response:", responseText);
                setMessages(prev =>
                    prev.map(msg =>
                        msg.id === botMsgId
                            ? { ...msg, text: `${responseText}\n\n⚠️ *Note: This response seems incomplete. The AI may have encountered an issue. Please try asking again.*`, isThinking: false, toolCalls: currentToolCalls }
                            : msg
                    )
                );
                // ✅ Fix-3: Still try to extract copy from short response
                // Don't return early, continue to extraction logic
            }

            // 8. Parse JSON artifacts from response (for Product Catalog integration)
            if (onArtifactGenerated) {
                try {
                    // Look for JSON code blocks in the response
                    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
                    if (jsonMatch) {
                        const artifact = JSON.parse(jsonMatch[1]);
                        if (artifact.title || artifact.copy || artifact.imageUrl) {
                            onArtifactGenerated(artifact);
                        }
                    } else {
                        // Also try to parse if the entire response is JSON
                        try {
                            const artifact = JSON.parse(responseText);
                            if (artifact.title || artifact.copy || artifact.imageUrl) {
                                onArtifactGenerated(artifact);
                            }
                        } catch {
                            // Not JSON, continue
                        }
                    }
                } catch (e) {
                    console.warn("Failed to parse artifact JSON:", e);
                }
            }

            // 9. Update with full response and tool calls
            setMessages(prev =>
                prev.map(msg =>
                    msg.id === botMsgId
                        ? { ...msg, text: responseText, isThinking: false, toolCalls: currentToolCalls }
                        : msg
                )
            );
            
            // ✅ Fix-4: Call onCopyGenerated callback if provided
            if (onCopyGenerated) {
                console.log('📤 onCopyGenerated callback triggered, responseText length:', responseText.length);
                
                // Extract clean copy text from response - pass the FULL response to the callback
                // The callback (handleResponse in ConfigurationDrawer) will handle channel-specific extraction
                let cleanCopy = responseText.trim();
                
                // Remove markdown code blocks if present
                cleanCopy = cleanCopy.replace(/```[\s\S]*?```/g, '');
                
                // Remove any reasoning tags or explanations
                cleanCopy = cleanCopy.replace(/<think>[\s\S]*?<\/think>/g, '');
                cleanCopy = cleanCopy.replace(/<think>[\s\S]*?<\/redacted_reasoning>/g, '');
                
                // Extract text from markdown links or formatting
                cleanCopy = cleanCopy.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
                cleanCopy = cleanCopy.replace(/\*\*([^\*]+)\*\*/g, '$1');
                cleanCopy = cleanCopy.replace(/\*([^\*]+)\*/g, '$1');
                
                // Remove any "Here's the copy:" or similar prefixes
                const copyMatch = cleanCopy.match(/(?:copy|message|text|here'?s?)[:：]\s*(.+)/is);
                if (copyMatch) {
                    cleanCopy = copyMatch[1].trim();
                }
                
                // ✅ Fix-4: Pass the full cleaned response to the callback
                // The callback will handle channel-specific extraction (Email vs SMS vs Facebook)
                if (cleanCopy && cleanCopy.length > 0) {
                    console.log('✅ Passing cleaned copy to callback, length:', cleanCopy.length);
                    onCopyGenerated(cleanCopy);
                } else {
                    // If copy is empty, pass null to indicate failure
                    console.warn('⚠️ Extracted copy is empty, passing null to callback');
                    onCopyGenerated(null);
                }
            }

        } catch (error) {
            console.error("Chat Error:", error);
            setIsThinking(false); // Critical: reset state on error
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                sender: 'bot',
                text: "I'm sorry, I encountered an error analyzing that. Please try again.",
                timestamp: new Date()
            }]);
            // ✅ Fix-3: Call onCopyGenerated with null on error
            if (onCopyGenerated) {
                onCopyGenerated(null);
            }
        }
    }, [input, messages, onArtifactGenerated, onCopyGenerated, mentionOffers]); // ✅ Fix-3: Include callbacks in dependencies

    // ✅ Handle input change (for @ mentions)
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
    }, []);

    return {
        messages,
        input,
        setInput,
        isThinking,
        currentToolCalls,  // ✅ Export tool calls
        handleSend,
        handleInputChange  // ✅ Export for @ mentions
    };
};
