import type { Category } from '../types/finance';
import { categorizeOffline } from './financeCalculations';

export interface AIHealthStatus {
  isAvailable: boolean;
  hasGeminiKey: boolean;
  message?: string;
}

export interface CategorizeResult {
  category: string;
  confidence: number;
  explanation?: string;
  source: 'gemini' | 'rules';
}

export interface ReceiptScanResult {
  merchant: string;
  date?: string;
  amount: number; // in major currency units (e.g. 450.50)
  currency?: string;
  category?: string;
  lineItems?: Array<{ name: string; price: number }>;
  confidence?: number;
}

export class AIService {
  private customBaseUrl: string = '';

  constructor(customBaseUrl: string = '') {
    this.customBaseUrl = customBaseUrl.replace(/\/+$/, '');
  }

  setBaseUrl(url: string) {
    this.customBaseUrl = url.replace(/\/+$/, '');
  }

  private getEndpoint(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return this.customBaseUrl ? `${this.customBaseUrl}${cleanPath}` : cleanPath;
  }

  /**
   * Checks if AI backend and Gemini API key are active and reachable.
   */
  async checkHealth(): Promise<AIHealthStatus> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(this.getEndpoint('/api/health'), {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return { isAvailable: false, hasGeminiKey: false, message: `Server responded with ${res.status}` };
      }

      const data = await res.json();
      return {
        isAvailable: true,
        hasGeminiKey: !!data.hasGeminiKey,
        message: data.hasGeminiKey
          ? 'Gemini 3.8 Flash Connected'
          : 'Backend online, but GEMINI_API_KEY is not set',
      };
    } catch {
      return {
        isAvailable: false,
        hasGeminiKey: false,
        message: 'Backend server unavailable. Operating in local-only mode.',
      };
    }
  }

  /**
   * Suggests transaction category. First checks local fast rule categorizer.
   * If local confidence is high, returns immediately without network round-trip.
   * Otherwise, attempts Gemini server endpoint; on failure, returns best local rule or null.
   */
  async suggestCategory(
    description: string,
    amountMajor: number,
    type: 'expense' | 'income',
    categories: Category[]
  ): Promise<CategorizeResult | null> {
    // 1. Fast local check
    const localMatch = categorizeOffline(description, categories);
    if (localMatch && localMatch.confidence >= 0.9) {
      const cat = categories.find((c) => c.id === localMatch.categoryId);
      if (cat) {
        return {
          category: cat.name,
          confidence: localMatch.confidence,
          explanation: 'Matched rule-based offline dictionary',
          source: 'rules',
        };
      }
    }

    // 2. Try Gemini server endpoint
    try {
      const res = await fetch(this.getEndpoint('/api/ai/categorize'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          amount: amountMajor,
          type,
          availableCategories: categories.filter((c) => c.type === type).map((c) => c.name),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.category) {
          return {
            category: data.category,
            confidence: data.confidence || 0.85,
            explanation: data.explanation,
            source: 'gemini',
          };
        }
      }
    } catch (err) {
      console.warn('AI categorization backend call failed, using offline fallback', err);
    }

    // 3. Fallback to local match if available
    if (localMatch) {
      const cat = categories.find((c) => c.id === localMatch.categoryId);
      if (cat) {
        return {
          category: cat.name,
          confidence: localMatch.confidence,
          explanation: 'Matched offline keyword pattern',
          source: 'rules',
        };
      }
    }

    return null;
  }

  /**
   * Financial Q&A with grounded context.
   */
  async askFinancialChat(
    query: string,
    factualContext: Record<string, any>,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<string> {
    const res = await fetch(this.getEndpoint('/api/ai/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        financialContext: factualContext,
        conversationHistory: history,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Server responded with ${res.status}`);
    }

    const data = await res.json();
    return data.reply;
  }

  /**
   * Scans a receipt image via Gemini multimodal.
   */
  async scanReceipt(
    imageBase64: string,
    mimeType: string,
    categories: Category[]
  ): Promise<ReceiptScanResult> {
    const res = await fetch(this.getEndpoint('/api/ai/scan-receipt'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64,
        mimeType,
        availableCategories: categories.filter((c) => c.type === 'expense').map((c) => c.name),
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Receipt scanning failed with status ${res.status}`);
    }

    return await res.json();
  }
}

export const aiService = new AIService();
