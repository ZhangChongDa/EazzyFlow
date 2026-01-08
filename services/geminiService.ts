import { ChatDeepSeek } from "@langchain/deepseek";
import { HumanMessage, SystemMessage, AIMessage, ToolMessage, BaseMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { fal } from "@fal-ai/client";
import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

// --- Configuration ---
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || import.meta.env.NUXT_DEEPSEEK_API_KEY || 'sk-mock-key';
const TAVILY_API_KEY = import.meta.env.VITE_TAVILY_API_KEY || '';
const GROK_API_KEY = import.meta.env.VITE_GROK_API_KEY || '';
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const FAL_API_KEY = import.meta.env.VITE_FAL_KEY || import.meta.env.FAL_KEY || '';

// ✅ Configure FAL client with API Key
if (FAL_API_KEY) {
  fal.config({
    credentials: FAL_API_KEY
  });
} else {
  console.warn('⚠️ FAL_API_KEY not configured. Image generation will fail.');
}

// --- Tools ---

const deepThinkTool = tool(async ({ topic }) => {
  try {
    const reasoner = new ChatDeepSeek({
      model: "deepseek-reasoner", // R1
      apiKey: DEEPSEEK_API_KEY,
      temperature: 0.7,
    });

    const response = await reasoner.invoke([
      new HumanMessage(`Analyze this strictly and logically: ${topic}`)
    ]);

    // DeepSeek R1 returns reasoning in 'reasoning_content' field
    // @ts-ignore - LangChain types may not include this field yet
    const reasoningProcess = response.additional_kwargs?.reasoning_content || response.reasoning_content || '';
    const finalAnswer = String(response.content);

    console.log("[R1] Reasoning length:", reasoningProcess.length, "Answer length:", finalAnswer.length);

    // Wrap reasoning in <think> tags for UI parsing
    if (reasoningProcess) {
      return `<think>${reasoningProcess}</think>\n\n${finalAnswer}`;
    }

    return finalAnswer;
  } catch (e) {
    console.error("DeepThink tool error:", e);
    return "Analysis failed.";
  }
}, {
  name: "deep_think",
  description: "Use this tool to perform deep logical analysis, root cause analysis, or strategy formulation using the Reasoning model.",
  schema: z.object({
    topic: z.string().describe("The topic or question to analyze deeply.")
  })
});

const generateImageTool = tool(async ({ prompt }) => {
  try {
    // ✅ Check if FAL API Key is configured
    if (!FAL_API_KEY) {
      throw new Error("FAL API Key (VITE_FAL_KEY) not configured. Please set it in your .env file.");
    }

    console.log(`[FAL] Generating image with prompt: "${prompt.substring(0, 50)}..."`);

    // ✅ Use Ideogram V3 for better typography and commercial use (as per user's suggestion)
    // Fallback to Flux/Dev if Ideogram fails
    let result;
    try {
      // Try Ideogram V3 first (better for marketing posters with text)
      result = await fal.subscribe("fal-ai/ideogram/v3", {
        input: {
          prompt: prompt,
          image_size: "landscape_4_3",
          style: "AUTO",
          rendering_speed: "BALANCED"
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            update.logs?.map((log) => log.message).forEach((msg) => console.log(`[Ideogram V3] ${msg}`));
          }
        },
      });
      console.log("[Ideogram V3] Image generated successfully");
    } catch (ideogramError: any) {
      console.warn("[Ideogram V3] Failed, falling back to Flux/Dev:", ideogramError.message);
      // Fallback to Flux/Dev
      result = await fal.subscribe("fal-ai/flux/dev", {
        input: { prompt, image_size: "landscape_4_3" },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            update.logs?.map((log) => log.message).forEach((msg) => console.log(`[Flux/Dev] ${msg}`));
          }
        },
      });
      console.log("[Flux/Dev] Image generated successfully");
    }

    // Extract image URL from result
    // @ts-ignore - FAL result structure
    const imageUrl = result.data?.images?.[0]?.url || result.images?.[0]?.url;
    
    if (!imageUrl) {
      throw new Error("No image URL returned from FAL API");
    }

    console.log(`[FAL] Image URL: ${imageUrl}`);
    return `![Generated Image](${imageUrl})`;
  } catch (error: any) {
    console.error("[FAL] Image generation error:", error);
    const errorMsg = error.message || "Unknown error";
    return `(Image generation failed: ${errorMsg}. Please check VITE_FAL_KEY configuration.)`;
  }
}, {
  name: "generate_image",
  description: "Generate high-quality images, posters, and marketing visuals using AI (Ideogram V3 or Flux/Dev). Ideogram V3 is optimized for typography and commercial use, making it ideal for marketing campaigns.",
  schema: z.object({
    prompt: z.string().describe("The image description or prompt for generation.")
  })
});

const webSearchTool = tool(async ({ query }) => {
  try {
    console.log(`[Tavily] Searching for: "${query}"`);

    if (!TAVILY_API_KEY) {
      throw new Error("Tavily API key not configured");
    }

    // Call Tavily REST API directly
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: query,
        max_results: 5,
        search_depth: "basic",
        include_answer: true,
        include_raw_content: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[Tavily] Found ${data.results?.length || 0} results`);

    // Format the search results
    let formattedResults = `[Search Results for "${query}"]:\n\n`;

    if (data.answer) {
      formattedResults += `Summary: ${data.answer}\n\n`;
    }

    if (data.results && data.results.length > 0) {
      formattedResults += "Top Sources:\n";
      data.results.slice(0, 3).forEach((result: any, index: number) => {
        formattedResults += `${index + 1}. ${result.title}\n`;
        if (result.content) {
          formattedResults += `   ${result.content}\n`;
        }
        if (result.url) {
          formattedResults += `   Source: ${result.url}\n`;
        }
        formattedResults += `\n`;
      });
    } else {
      formattedResults += "No relevant results found.\n";
    }

    return formattedResults;
  } catch (error) {
    console.error("[Tavily] Search failed:", error);
    // Fallback to mock data
    return `[Search Result for "${query}" - Using fallback data]:
Based on general knowledge about "${query}":
- This is simulated data as the search API is unavailable
- Error: ${error instanceof Error ? error.message : String(error)}
- Please check the API configuration`;
  }
}, {
  name: "search_web",
  description: "Search the web for real-time information, trends, news, or general knowledge using Tavily Search API.",
  schema: z.object({
    query: z.string().describe("The search query")
  })
});

const grokSocialTrendsTool = tool(async ({ query }) => {
  try {
    console.log(`[Grok] Searching social trends for: "${query}"`);

    if (!GROK_API_KEY) {
      throw new Error("Grok API key not configured");
    }

    // ✅ Fix: Use grok-4-1-fast-reasoning (latest fast model)
    // Reference: https://docs.x.ai/docs/tutorial
    const grokModel = new ChatOpenAI({
      modelName: "grok-4-1-fast-reasoning", // ✅ Updated from grok-beta
      apiKey: GROK_API_KEY,
      temperature: 0.8,
      timeout: 60000,
      maxRetries: 2,
      configuration: {
        baseURL: "https://api.x.ai/v1",
        apiKey: GROK_API_KEY
      } as any
    });

    const prompt = `Search X.com (Twitter) and social platforms for the latest trends, news, and discussions about: "${query}"

Provide:
1. Top 5 trending topics or posts related to this query
2. Key influencers or accounts discussing this
3. Sentiment analysis (positive/negative/neutral)
4. Actionable insights for marketing campaigns

Format as a detailed report with specific examples and sources.`;

    const response = await grokModel.invoke([new HumanMessage(prompt)]);
    const result = typeof response.content === 'string' ? response.content : String(response.content);

    console.log(`[Grok] Social trends analysis complete (${result.length} chars)`);
    return `[Grok Social Trends Analysis for "${query}"]:\n\n${result}`;
  } catch (error) {
    console.error("[Grok] Social trends search failed:", error);
    return `[Grok Social Trends - Error]:
Unable to fetch real-time social trends for "${query}".
Error: ${error instanceof Error ? error.message : String(error)}
Please check the Grok API configuration.`;
  }
}, {
  name: "grok_social_trends",
  description: "Query X.com (Twitter) trends, social media discussions, AI news, and MarTech updates using Grok. Use this for real-time social insights, trending topics, and current events.",
  schema: z.object({
    query: z.string().describe("The social trend or topic to search for")
  })
});

// ✅ New Tool: Get Current Date & Time
const getCurrentDateTool = tool(async () => {
  try {
    const now = new Date();
    
    // 获取详细的日期时间信息
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 0-indexed
    const day = now.getDate();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    const monthName = now.toLocaleDateString('en-US', { month: 'long' });
    const time = now.toLocaleTimeString('en-US', { hour12: false });
    
    // ISO 格式
    const isoDate = now.toISOString();
    
    // 计算距离年底还有多少天
    const endOfYear = new Date(year, 11, 31);
    const daysUntilYearEnd = Math.ceil((endOfYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const result = `[Current Date & Time Information]:

**Today**: ${dayOfWeek}, ${monthName} ${day}, ${year}
**Time**: ${time} (24-hour format)
**ISO Format**: ${isoDate}

**Key Facts**:
- Current Year: ${year}
- Current Month: ${monthName} (${month}/12)
- Days until end of ${year}: ${daysUntilYearEnd} days

**Important**: When searching for events, campaigns, or news, always use the current year (${year}) or specify "latest" or "upcoming" in your queries.`;

    console.log(`[DateTime] Current date: ${year}-${month}-${day}`);
    return result;
  } catch (error) {
    console.error("[DateTime] Error getting current date:", error);
    return `[DateTime Tool Error]: Unable to retrieve current date and time. Error: ${error}`;
  }
}, {
  name: "get_current_date",
  description: "Get the current date, time, year, month, day, and other time-related information. ALWAYS call this tool first when the user asks about 'today', 'this year', 'upcoming events', 'latest news', or any time-sensitive information.",
  schema: z.object({})
});

// ✅ New Tool: Generate Multilingual Marketing Copy (Gemini 2.5 Flash)
const multilingualCopyTool = tool(async ({ topic, language, tone }) => {
  try {
    if (!GOOGLE_API_KEY) {
      throw new Error("Google API Key (VITE_GOOGLE_API_KEY) not configured");
    }

    console.log(`[Gemini 2.5 Flash] Generating ${tone || 'professional'} copy in ${language} about: ${topic}`);

    const chat = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey: GOOGLE_API_KEY,
      temperature: 0.7,
      maxRetries: 2,
    });

    const prompt = `You are a local marketing expert in Myanmar (Burma).

Task: Write a ${tone || 'professional'} SMS/Email marketing message in ${language} about: ${topic}

Constraints:
- Native sounding and culturally relevant
- Maximum 160 characters for SMS (if SMS format)
- Natural, engaging tone
- Appropriate for telecom/mobile services context
- Use local expressions and idioms when appropriate

Language: ${language}
Tone: ${tone || 'professional'}
Topic: ${topic}

Generate the marketing copy now:`;

    const response = await chat.invoke([
      new HumanMessage(prompt)
    ]);

    const content = String(response.content);
    console.log(`[Gemini 2.5 Flash] Generated copy (${content.length} chars): ${content.substring(0, 100)}...`);
    
    return content;
  } catch (e: any) {
    console.error("[Gemini 2.5 Flash] Error generating multilingual copy:", e);
    return `Failed to generate ${language} copy. Error: ${e.message || 'Please check VITE_GOOGLE_API_KEY configuration.'}`;
  }
}, {
  name: "generate_multilingual_copy",
  description: "Generate marketing copy in specific languages (especially Burmese/Myanmar, Jingpho, or other local languages) using Google Gemini 2.5 Flash. This tool is optimized for native-sounding, culturally relevant content for telecom marketing campaigns.",
  schema: z.object({
    topic: z.string().describe("The subject or topic of the marketing message (e.g., '5GB data bundle promotion', 'Independence Day special offer')"),
    language: z.string().describe("Target language (e.g., 'Burmese', 'Myanmar', 'English', 'Jingpho', 'Shan')"),
    tone: z.string().optional().describe("Tone of voice (e.g., 'Exciting', 'Formal', 'Friendly', 'Urgent', 'Professional')")
  })
});

// ✅ New Tool: Optimize Image Prompt for Ideogram V3
const optimizeImagePromptTool = tool(async ({ userPrompt, context }) => {
  try {
    const optimizer = new ChatDeepSeek({
      model: "deepseek-chat",
      apiKey: DEEPSEEK_API_KEY,
      temperature: 0.7,
    });

    const systemPrompt = `You are an Ideogram V3 Prompt Optimization Expert.

Your task is to transform simple, vague user prompts into highly detailed, optimized prompts that will produce stunning marketing visuals on Ideogram V3.

IDEAGRAM V3 STRENGTHS:
- Exceptional typography and text rendering
- High-quality 3D renders and photorealistic images
- Commercial-grade marketing visuals
- Strong understanding of composition and lighting

OPTIMIZATION RULES:
1. Add specific visual details: lighting (neon, cinematic, studio), composition (centered, rule of thirds), style (3D render, photorealistic, illustration)
2. Include typography details if text is needed: font style, text placement, effects (holographic, neon, glowing)
3. Specify color palette: "neon purple and cyan", "vibrant indigo and gold", etc.
4. Add cultural/local context if relevant: "Yangon skyline", "Myanmar market", "local gaming culture"
5. Enhance with marketing elements: "premium", "high-tech", "futuristic", "professional"
6. Keep it concise but detailed (150-200 words max)

INPUT: ${userPrompt}
CONTEXT: ${context || 'General marketing poster'}

Generate ONLY the optimized prompt, no explanation:`;

    const response = await optimizer.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Optimize this prompt for Ideogram V3: "${userPrompt}"`)
    ]);

    const optimizedPrompt = String(response.content).trim();
    console.log(`[Prompt Optimizer] Optimized: ${optimizedPrompt.substring(0, 100)}...`);
    return optimizedPrompt;
  } catch (e: any) {
    console.error("[Prompt Optimizer] Error:", e);
    return userPrompt; // Fallback to original prompt
  }
}, {
  name: "optimize_image_prompt",
  description: "Optimize a simple image prompt into a detailed, high-quality prompt specifically designed for Ideogram V3 image generation. Use this when the user provides a vague or simple prompt that needs enhancement for better results.",
  schema: z.object({
    userPrompt: z.string().describe("The original, simple user prompt"),
    context: z.string().optional().describe("Additional context (e.g., 'marketing poster for telecom', 'gaming theme')")
  })
});

const tools = [deepThinkTool, generateImageTool, webSearchTool, grokSocialTrendsTool, getCurrentDateTool, multilingualCopyTool, optimizeImagePromptTool];
const toolsByName = {
  deep_think: deepThinkTool,
  generate_image: generateImageTool,
  search_web: webSearchTool,
  grok_social_trends: grokSocialTrendsTool,
  get_current_date: getCurrentDateTool,
  generate_multilingual_copy: multilingualCopyTool,
  optimize_image_prompt: optimizeImagePromptTool
};

// --- Main Service ---

export const chatWithCopilot = async (
  message: string,
  history: { role: string; parts: { text: string }[] }[],
  systemContext?: string,
  onToolCall?: (toolName: string, status: 'running' | 'completed' | 'failed', output?: string, error?: string) => void  // ✅ New callback
): Promise<{ text: string; groundingUrls: string[] }> => {

  const model = new ChatDeepSeek({
    model: "deepseek-chat", // V3
    apiKey: DEEPSEEK_API_KEY,
    temperature: 0.7, // Increased for more natural responses
  }).bindTools(tools);

  const langchainHistory: BaseMessage[] = history.slice(-10).map(h => {
    if (h.role === 'user') return new HumanMessage(h.parts[0].text);
    return new AIMessage(h.parts[0].text);
  });

  const systemPrompt = `You are Eazzy Flow AI, a senior human marketing strategist and co-pilot for telecom industry.

YOUR CAPABILITIES:
- Analyze telecom market trends and customer behavior
- Create comprehensive marketing strategies and campaigns
- Generate social media content and promotional materials
- Provide strategic marketing advice based on real-time data
- Answer questions about telecom marketing trends and best practices

YOUR TOOLS:
- get_current_date: Get current date, time, and year. ALWAYS call this FIRST when user asks about "today", "this year", "upcoming", "latest", or any time-sensitive queries
- deep_think: Perform deep logical analysis and strategy formulation using DeepSeek R1 Reasoning model
- search_web: Search the internet for current information, trends, and general knowledge (Tavily)
- grok_social_trends: Query X.com (Twitter) trends, social media discussions, AI news, and real-time events (Grok)
- optimize_image_prompt: Optimize simple image prompts into detailed, high-quality prompts for Ideogram V3. Use this BEFORE calling generate_image if the user provides a vague or simple prompt.
- generate_image: Create visual marketing assets and ad creatives (Ideogram V3 or Flux/Dev). ⚠️ CRITICAL: When this tool returns a Markdown image link (format: ![Generated Image](url)), you MUST include it directly in your response so the user can see the generated image. Do NOT summarize or omit the image link.
- generate_multilingual_copy: Generate marketing copy in specific languages (especially Burmese/Myanmar, Jingpho, or other local languages) using Google Gemini 2.5 Flash. ⚠️ CRITICAL: When the user asks for content in Burmese, Myanmar, Jingpho, Shan, or any local language, ALWAYS use this tool instead of generating copy yourself.

⚠️ CRITICAL: When user asks about "Independence Day", "upcoming events", "this year's campaigns", etc., you MUST:
1. First call get_current_date to know the current year
2. Then call search_web or grok_social_trends with the correct year in the query

PERSONALITY & TONE:
- Act as a senior human colleague, NOT a robotic assistant
- Use conversational, marketing-centric language focused on ROI and business impact
- Be direct and punchy - no templates or robotic intros
- NO phrases like: "Based on my analysis", "As an AI", "Here's what I found", "Let me search for you"
- Be confident but acknowledge limitations when data is unavailable

CRITICAL RULES:
1. Use provided context ([REAL-TIME BUSINESS CONTEXT]) for accurate responses
2. If context is insufficient, acknowledge limitations clearly
3. Provide actionable, marketing-focused advice with specific examples
4. When you use a tool, you MUST provide a comprehensive response based on the tool's output
5. Use tools when needed - don't guess if you can search or analyze

🎯 COMPREHENSIVE REPORTING RULES (MANDATORY):
- When tools (grok_social_trends, search_web, deep_think) return data, provide a COMPREHENSIVE report
- DO NOT over-summarize or reduce rich data to one-liners
- For news/trends queries: List at least 5 specific items with sources and key insights
- For search results: Include main points, statistics, and actionable takeaways
- For multi-source analysis: Compare and contrast each source with specific details
- ALWAYS include ROI implications and marketing recommendations when relevant
- If a tool returns substantial data (>500 chars), your response MUST be detailed (>300 words)

📝 MARKDOWN FORMATTING RULES:
- Present information in clean, professional Markdown
- Use tables for comparative data (e.g., | Column 1 | Column 2 |)
- Use **bold headers** for sections and emphasis
- DO NOT include anchor links (#) in headers
- Use bullet points (- or *) for lists
- Keep formatting simple and readable - no excessive nesting

🚨 MANDATORY RESPONSE REQUIREMENT:
After using ANY tool, you MUST:
1. Acknowledge what you found (e.g., "I found 5 key trends...")
2. Present the data in a structured format (tables, lists, sections)
3. Provide analysis and insights (What does this mean? Why does it matter?)
4. Give actionable recommendations (What should we do with this information?)

FAILURE TO PROVIDE A DETAILED RESPONSE AFTER TOOL USAGE IS UNACCEPTABLE.

📦 MARKETING PACKAGE GENERATION:
When the user asks for a "complete marketing package" or "marketing package for [product]", you MUST:
1. Generate a marketing name (Title) using generate_multilingual_copy or your knowledge
2. Generate marketing copy (SMS/Email) using generate_multilingual_copy tool
3. Optimize the image prompt using optimize_image_prompt tool
4. Generate the image using generate_image tool
5. Return ALL results in this EXACT JSON format (use code block):
\`\`\`json
{
  "title": "Marketing Name Here",
  "copy": "Marketing Copy Here",
  "imageUrl": "Image URL Here (extract from markdown format)"
}
\`\`\`

CRITICAL: Extract the image URL from the markdown format (![alt](url)) and provide just the URL in the JSON.

${systemContext || ''}`;

  const messages = [
    new SystemMessage(systemPrompt),
    ...langchainHistory,
    new HumanMessage(message)
  ];

  let finalResponse = "";

  try {
    console.log("[DeepSeek] Starting Agent Loop...");
    
    // ✅ Agent Loop: 支持多轮工具调用
    const MAX_ITERATIONS = 5;
    let iteration = 0;
    let currentAiMessage = null;

    while (iteration < MAX_ITERATIONS) {
      iteration++;
      console.log(`[DeepSeek] Iteration ${iteration}/${MAX_ITERATIONS}`);

      // 调用 AI
      currentAiMessage = await model.invoke(messages);
      
      // 检查是否有工具调用
      if (!currentAiMessage.tool_calls || currentAiMessage.tool_calls.length === 0) {
        // 没有工具调用，这是最终答案
        finalResponse = String(currentAiMessage.content || '');
        console.log(`[DeepSeek] Final response received (no tools). Length: ${finalResponse.length}`);
        break;
      }

      // 有工具调用，执行所有工具
      console.log(`[DeepSeek] Tool calls detected: ${currentAiMessage.tool_calls.length}`);
      
      // ✅ 关键：必须先将 AI 的工具调用请求加入历史
      messages.push(currentAiMessage);

      // 执行所有工具
      for (const toolCall of currentAiMessage.tool_calls) {
        const selectedTool = toolsByName[toolCall.name as keyof typeof toolsByName];
        if (selectedTool) {
          console.log(`[DeepSeek] Executing tool: ${toolCall.name}`);
          
          // ✅ Notify UI: Tool started
          onToolCall?.(toolCall.name, 'running');
          
          try {
            const toolOutput = await (selectedTool as any).invoke(toolCall.args);
            console.log(`[DeepSeek] Tool ${toolCall.name} output len: ${toolOutput.length}`);

            // ✅ Notify UI: Tool completed
            onToolCall?.(toolCall.name, 'completed', toolOutput);

            // 将工具输出加入历史
            messages.push(new ToolMessage({
              tool_call_id: toolCall.id || '',
              content: toolOutput
            }));
          } catch (toolErr) {
            console.error(`[DeepSeek] Tool ${toolCall.name} Failed:`, toolErr);
            const errorMsg = String(toolErr);
            
            // ✅ Notify UI: Tool failed
            onToolCall?.(toolCall.name, 'failed', undefined, errorMsg);
            
            messages.push(new ToolMessage({
              tool_call_id: toolCall.id || '',
              content: `Tool Execution Failed: ${errorMsg}`
            }));
          }
        } else {
          console.warn(`[DeepSeek] Unknown tool: ${toolCall.name}`);
          onToolCall?.(toolCall.name, 'failed', undefined, 'Tool not found');
          messages.push(new ToolMessage({
            tool_call_id: toolCall.id || '',
            content: `Error: Tool "${toolCall.name}" not found`
          }));
        }
      }
      
      console.log(`[DeepSeek] Tools executed. Messages count: ${messages.length}. Continuing loop...`);
    }

    // 检查是否达到最大迭代次数
    if (iteration >= MAX_ITERATIONS && (!finalResponse || finalResponse.length === 0)) {
      console.warn("[DeepSeek] Max iterations reached without final response");
      // 尝试从最后一次 AI 消息中提取内容
      if (currentAiMessage) {
        finalResponse = String(currentAiMessage.content || '');
      }
      
      // 如果还是空，给个降级回答
      if (!finalResponse || finalResponse.length === 0) {
        finalResponse = "I've gathered information using multiple tools, but reached the maximum processing limit. Please try asking a more specific question.";
      }
    }

    // 最终检查
    if (!finalResponse || finalResponse.length === 0) {
      console.warn("[DeepSeek] Empty final response. Last AI message:", JSON.stringify(currentAiMessage, null, 2));
      finalResponse = "I apologize, but I couldn't generate a complete response. Please try rephrasing your question.";
    }

  } catch (e: any) {
    console.error("DeepSeek Agent Critical Error:", e);
    const errorMessage = e?.message || e?.toString() || "Unknown Error";
    if (errorMessage.includes("400")) {
      finalResponse = "System Error: The AI request was rejected (400). Please check tool outputs.";
    } else {
      finalResponse = `I encountered a technical issue while processing that: ${errorMessage}. Please try again.`;
    }
  }

  return {
    text: finalResponse,
    groundingUrls: []
  };
};

export const editImage = async (image: string, prompt: string) => {
  return image;
};

export const generateMarketingCopy = async (prompt: string, tone?: string): Promise<string> => {
  const contextPrompt = tone ? `${prompt}. Tone: ${tone}` : prompt;
  const response = await chatWithCopilot(
    `Generate professional marketing copy for: ${contextPrompt}`,
    [],
    undefined
  );
  return response.text;
};
