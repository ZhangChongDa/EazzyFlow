import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Ensure your API key is available in process.env.API_KEY
const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Chat with the AI using gemini-3-pro-preview for complex reasoning and search.
 * Uses Google Search Grounding.
 */
export const chatWithCopilot = async (
  message: string, 
  history: {role: string, parts: {text: string}[]}[]
): Promise<{ text: string; groundingUrls: string[] }> => {
  try {
    const ai = getClient();
    const chat = ai.chats.create({
      model: 'gemini-3-pro-preview',
      config: {
        tools: [{ googleSearch: {} }], // Enable search grounding
        systemInstruction: "You are an expert Telecom Business Growth Consultant. You analyze operator data, campaign logic, and MCCM strategies. You are helpful, professional, and data-driven."
      },
      history: history.map(h => ({
        role: h.role,
        parts: h.parts
      }))
    });

    const response: GenerateContentResponse = await chat.sendMessage({ message });
    
    // Extract grounding metadata if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const groundingUrls = groundingChunks
      .map((chunk: any) => chunk.web?.uri)
      .filter((uri: string | undefined) => !!uri);

    return {
      text: response.text || "I processed that but couldn't generate a text response.",
      groundingUrls: groundingUrls
    };
  } catch (error) {
    console.error("Chat error:", error);
    return { text: "Sorry, I encountered an error connecting to Gemini.", groundingUrls: [] };
  }
};

/**
 * Generates marketing copy using gemini-2.5-flash for speed.
 */
export const generateMarketingCopy = async (
  intent: string, 
  tone: 'Professional' | 'Urgent' | 'Playful'
): Promise<string> => {
  try {
    const ai = getClient();
    const prompt = `Write a short SMS marketing message (max 160 chars) for a telecom operator. 
    Context: ${intent}. 
    Tone: ${tone}. 
    Include placeholders like {Name} if needed.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate copy.";
  } catch (error) {
    console.error("Copy gen error:", error);
    return "Error generating content.";
  }
};

/**
 * Edits an image based on a text prompt using gemini-2.5-flash-image (Nano Banana).
 * Simulates the "Edit" capability by providing the image and prompt.
 */
export const editImage = async (base64Image: string, prompt: string): Promise<string | null> => {
  try {
    const ai = getClient();
    // Gemini 2.5 Flash Image supports image editing via prompt
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png', // Assuming PNG for simplicity in this demo
              data: base64Image
            }
          },
          {
            text: `Edit this image: ${prompt}. Return ONLY the edited image.`
          }
        ]
      }
    });

    // Extract the image from the response
    for (const part of response.candidates?.[0]?.content?.parts || []) {
       if (part.inlineData && part.inlineData.data) {
         return part.inlineData.data;
       }
    }
    return null;
  } catch (error) {
    console.error("Image edit error:", error);
    return null;
  }
};
