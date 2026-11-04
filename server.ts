import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '15mb' }));

// Shared Gemini AI client (only instantiated if GEMINI_API_KEY is available)
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// 1. Health check & AI capability status
app.get('/api/health', (_req: Request, res: Response) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  res.json({
    status: 'ok',
    hasGeminiKey: hasKey,
    environment: isProduction ? 'production' : 'development',
    timestamp: new Date().toISOString(),
  });
});

// 2. Intelligent Category Suggestion
app.post('/api/ai/categorize', async (req: Request, res: Response) => {
  const { description, amount, type = 'expense', availableCategories = [] } = req.body;
  if (!description || typeof description !== 'string') {
    return res.status(400).json({ error: 'Description is required' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'Gemini API key is not configured on the server.',
      isFallbackAvailable: true,
    });
  }

  try {
    const categoryNames = availableCategories.length > 0
      ? availableCategories.map((c: any) => c.name || c).join(', ')
      : 'Food & Dining, Groceries, Shopping, Transportation, Rent & Housing, Utilities, Education, Healthcare, Entertainment, Subscriptions, Travel, Personal Care, Salary, Freelancing, Investments, Gifts, Other';

    const prompt = `Given the financial transaction description "${description}" of type "${type}" (amount: ${amount || 'unknown'}), identify the single best matching category from this list: [${categoryNames}].
Also provide a short explanation (1 sentence) and a confidence score between 0.0 and 1.0.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, description: 'The exact matching category name from the list' },
            confidence: { type: Type.NUMBER, description: 'Confidence between 0 and 1' },
            explanation: { type: Type.STRING, description: 'Brief reason for the categorization' },
          },
          required: ['category', 'confidence', 'explanation'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Categorize error from Gemini:', err?.message || err);

    // Smart fallback if Gemini is temporarily busy or rate limited
    const lower = description.toLowerCase();
    let fallbackCat = 'Other';
    if (/swiggy|zomato|food|restaurant|dining|cafe|coffee|pizza|burger|biryani/i.test(lower)) fallbackCat = 'Food & Dining';
    else if (/blinkit|zepto|grocery|dmart|reliance smart|supermarket|vegetables/i.test(lower)) fallbackCat = 'Groceries';
    else if (/uber|ola|rapido|metro|petrol|fuel|fuel|flight|transport/i.test(lower)) fallbackCat = 'Transportation';
    else if (/amazon|flipkart|myntra|zara|shopping|electronics/i.test(lower)) fallbackCat = 'Shopping';
    else if (/rent|society|landlord/i.test(lower)) fallbackCat = 'Rent & Housing';
    else if (/netflix|spotify|prime|hotstar|sub/i.test(lower)) fallbackCat = 'Subscriptions';
    else if (/wifi|electricity|bescom|airtel|jio|bill/i.test(lower)) fallbackCat = 'Utilities & Bills';
    else if (/salary|payroll/i.test(lower)) fallbackCat = 'Salary';
    else if (/freelance|consulting/i.test(lower)) fallbackCat = 'Freelancing';

    return res.json({
      category: fallbackCat,
      confidence: 0.85,
      explanation: 'Matched intelligent keyword heuristics (Gemini fallback)',
      source: 'rules',
    });
  }
});

// 3. AI Financial Chat (Grounding in factual computed summaries)
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const { query, financialContext, conversationHistory = [] } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query is required' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'Gemini API key is not configured on the server.',
    });
  }

  try {
    const systemInstruction = `You are SmartExpense AI, an intelligent personal finance copilot.
CRITICAL RULES:
1. Always base your financial answers strictly on the user's computed factual financial context provided below.
2. DO NOT hallucinate or invent financial numbers, balances, transactions, or account values that are not in the context.
3. If the user asks a question about data not present in the summary, state clearly what information is missing.
4. Keep answers concise, actionable, and structured with bullet points where appropriate.
5. Provide helpful financial budgeting advice, spending pattern observations, and savings tips.
6. Note: Do not provide formal legal, tax, or accredited investment advice.

FACTUAL COMPUTED FINANCIAL CONTEXT:
${JSON.stringify(financialContext || {}, null, 2)}
`;

    // Construct history for multi-turn if provided
    const messages = [];
    if (Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        messages.push(`${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`);
      }
    }
    messages.push(`User: ${query}`);

    const promptText = messages.join('\n\n');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction,
      },
    });

    return res.json({
      reply: response.text || 'I analyzed your financial data, but was unable to produce a response. Please try rephrasing.',
    });
  } catch (err: any) {
    console.error('AI Chat error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to process AI chat request.',
    });
  }
});

// 4. AI Financial Insights & Forecast Analysis
app.post('/api/ai/insights', async (req: Request, res: Response) => {
  const { financialSummary } = req.body;

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'Gemini API key is not configured on the server.',
    });
  }

  try {
    const prompt = `Analyze this computed financial summary of the user and produce 3 to 4 actionable, high-quality, personalized financial observations and spending advice:
${JSON.stringify(financialSummary || {}, null, 2)}

Provide each insight with:
- title: concise title (e.g., "Food & Dining Spike", "Healthy Savings Pace")
- type: 'positive' | 'warning' | 'tip' | 'neutral'
- message: 1-2 sentence actionable description referencing specific percentages or categories
- action: optional recommendation`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['positive', 'warning', 'tip', 'neutral'] },
                  message: { type: Type.STRING },
                  action: { type: Type.STRING },
                },
                required: ['title', 'type', 'message'],
              },
            },
            forecastSummary: {
              type: Type.STRING,
              description: 'Brief explanation of projected month-end trajectory',
            },
          },
          required: ['insights'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Insights error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to generate AI insights.',
    });
  }
});

// 5. Multimodal Receipt Scanner
app.post('/api/ai/scan-receipt', async (req: Request, res: Response) => {
  const { imageBase64, mimeType = 'image/jpeg', availableCategories = [] } = req.body;

  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: 'Receipt imageBase64 is required' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.status(503).json({
      error: 'Gemini API key is not configured on the server.',
    });
  }

  try {
    // Strip header prefix if present (e.g. data:image/png;base64,...)
    const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');

    const categoryList = availableCategories.length > 0
      ? availableCategories.map((c: any) => c.name || c).join(', ')
      : 'Food & Dining, Groceries, Shopping, Transportation, Utilities, Healthcare, Entertainment, Other';

    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: cleanBase64,
      },
    };

    const textPart = {
      text: `Extract all transaction details from this receipt image.
Categories available: [${categoryList}].
Return:
- merchant: store / vendor name
- date: YYYY-MM-DD (if year not visible, assume current year 2026 or closest past)
- amount: total amount as a decimal number (e.g. 450.50)
- currency: e.g. INR, USD, EUR, etc. (default to INR if ₹ or rupees or Indian merchant)
- category: best category from the available list
- lineItems: list of extracted item names and prices
- confidence: number between 0 and 1`,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING },
            date: { type: Type.STRING, description: 'ISO date YYYY-MM-DD' },
            amount: { type: Type.NUMBER, description: 'Total amount' },
            currency: { type: Type.STRING },
            category: { type: Type.STRING },
            lineItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                },
                required: ['name', 'price'],
              },
            },
            confidence: { type: Type.NUMBER },
          },
          required: ['merchant', 'amount', 'category'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Scan receipt error:', err);
    return res.status(500).json({
      error: err.message || 'Failed to scan receipt image.',
    });
  }
});

// Setup Vite dev middleware or static serving
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmartExpense AI server running on port ${PORT} (${isProduction ? 'prod' : 'dev'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
