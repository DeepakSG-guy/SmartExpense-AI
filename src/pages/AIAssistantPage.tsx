import React, { useState, useRef, useEffect } from 'react';
import { useFinance } from '../context/FinanceContext';
import { formatMoney, fromMinorUnits } from '../types/finance';
import { aiService } from '../services/aiService';
import { calculateCategoryBreakdown, calculateTotals } from '../services/financeCalculations';
import {
  Sparkles,
  Send,
  Bot,
  User,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Camera,
  Calculator,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const AIAssistantPage: React.FC = () => {
  const {
    transactions,
    categories,
    accounts,
    budgetStatuses,
    spendingForecast,
    currentMonthTotals,
    settings,
    aiHealth,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'chat' | 'forecast' | 'categorizer'>('chat');

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hello! I am your SmartExpense AI Copilot. I analyze your calculated financial records, budget limits, and spending habits to provide actionable recommendations. How can I assist your financial planning today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [chatError, setChatError] = useState('');

  // Categorizer Playground State
  const [testDesc, setTestDesc] = useState('');
  const [testAmount, setTestAmount] = useState('450');
  const [categorizerResult, setCategorizerResult] = useState<any>(null);
  const [isCategorizing, setIsCategorizing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currency = settings.currency;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Grounded context
  const buildFactualContext = () => {
    const today = new Date();
    const curMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const curMonthTxs = transactions.filter((t) => t.date.startsWith(curMonthStr));
    const curTotals = calculateTotals(curMonthTxs);
    const breakdown = calculateCategoryBreakdown(curMonthTxs, categories, 'expense');

    return {
      currentMonth: curMonthStr,
      currency: settings.currency,
      summary: {
        totalIncome: formatMoney(curTotals.totalIncome, currency),
        totalExpenses: formatMoney(curTotals.totalExpense, currency),
        netSavings: formatMoney(curTotals.netSavings, currency),
        savingsRate: `${curTotals.savingsRate}%`,
      },
      topExpenseCategories: breakdown.slice(0, 5).map((c) => ({
        category: c.categoryName,
        amount: formatMoney(c.totalAmount, currency),
        percentage: `${c.percentage}%`,
      })),
      budgetUtilization: budgetStatuses.map((b) => ({
        category: b.categoryName,
        spent: formatMoney(b.spentAmount, currency),
        limit: formatMoney(b.limitAmount, currency),
        status: b.state,
      })),
    };
  };

  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend || inputPrompt).trim();
    if (!text || isThinking) return;

    setInputPrompt('');
    setChatError('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    try {
      const groundedContext = buildFactualContext();
      const responseText = await aiService.chatWithAssistant(text, groundedContext);

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setChatError(err.message || 'Failed to receive AI response. Falling back to offline advice.');
    } finally {
      setIsThinking(false);
    }
  };

  const handleTestCategorize = async () => {
    if (!testDesc.trim()) return;
    setIsCategorizing(true);
    setCategorizerResult(null);

    try {
      const res = await aiService.categorizeTransaction(testDesc, categories);
      setCategorizerResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCategorizing(false);
    }
  };

  const quickPrompts = [
    'How is my savings rate this month?',
    'Which category am I spending the most on?',
    'Am I close to exceeding any of my budgets?',
    'What is my projected month-end spend?',
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#202020] dark:text-white tracking-tight flex items-center gap-2">
            <span>AI Financial Assistant</span>
            <span className="text-[10px] font-sans font-bold text-[#202020] bg-[#CFB0E8] px-2 py-0.5 rounded-lg border border-[#202020] uppercase tracking-wider">
              Gemini Powered
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-[#626262] dark:text-slate-400 mt-0.5">
            Grounded financial intelligence, projection modeling, and automated categorization
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center p-1 rounded-2xl bg-[#F6F4EB] dark:bg-[#18181D] border-[1.5px] border-[#202020] dark:border-slate-700 text-xs font-bold w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex-1 sm:flex-none py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-[#FFDB8A] text-[#202020] border border-[#202020] shadow-[1px_1px_0px_#202020]'
                : 'text-[#626262] dark:text-slate-400 hover:text-[#202020]'
            }`}
          >
            Financial Chat
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('forecast')}
            className={`flex-1 sm:flex-none py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'forecast'
                ? 'bg-[#FFDB8A] text-[#202020] border border-[#202020] shadow-[1px_1px_0px_#202020]'
                : 'text-[#626262] dark:text-slate-400 hover:text-[#202020]'
            }`}
          >
            Spending Forecast
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('categorizer')}
            className={`flex-1 sm:flex-none py-1.5 px-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'categorizer'
                ? 'bg-[#FFDB8A] text-[#202020] border border-[#202020] shadow-[1px_1px_0px_#202020]'
                : 'text-[#626262] dark:text-slate-400 hover:text-[#202020]'
            }`}
          >
            Smart Categorizer
          </button>
        </div>
      </div>

      {/* Warning if backend key is missing */}
      {!aiHealth.hasGeminiKey && (
        <div className="p-3.5 rounded-2xl bg-[#FFDB8A]/40 border-[1.5px] border-[#202020] text-xs text-[#202020] font-bold flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#202020]" />
          <div>
            <strong>Gemini Server Key:</strong> The server backend is currently operating without a configured GEMINI_API_KEY. All your expense tracking, deterministic insights, and offline rules remain 100% operational.
          </div>
        </div>
      )}

      {/* TAB 1: Financial Chat */}
      {activeTab === 'chat' && (
        <div className="card-retro p-5 sm:p-6 flex flex-col h-[600px]">
          {/* Messages container */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-2xl ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-2xl border-[1.5px] border-[#202020] flex items-center justify-center flex-shrink-0 text-[#202020] shadow-[1px_1px_0px_#202020] ${
                    msg.role === 'user' ? 'bg-[#FFDB8A]' : 'bg-[#CFB0E8]'
                  }`}
                >
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed border-[1.5px] border-[#202020] shadow-[2px_2px_0px_#202020] ${
                    msg.role === 'user'
                      ? 'bg-[#FFDB8A] text-[#202020] rounded-tr-none'
                      : 'bg-white dark:bg-[#1E1E23] text-[#202020] dark:text-slate-100 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line font-medium">{msg.content}</p>
                  <span className="block text-[10px] font-bold text-[#626262] dark:text-slate-400 mt-1 text-right">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex items-center gap-2 text-xs font-bold text-[#626262] dark:text-slate-400 py-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#CFB0E8] border border-[#202020] animate-ping" />
                <span>Computing grounded financial advice...</span>
              </div>
            )}

            {chatError && (
              <div className="p-3 rounded-xl bg-[#FFAB83]/40 border-[1.5px] border-[#202020] text-xs font-bold text-[#202020]">
                {chatError}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="pt-3 pb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-t-[1.5px] border-[#202020]/10 dark:border-slate-800">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(q)}
                className="py-1 px-3 rounded-xl bg-white dark:bg-[#1E1E23] hover:bg-[#F8F5EC] border border-[#202020] text-[11px] font-bold text-[#202020] dark:text-white shadow-[1px_1px_0px_#202020] whitespace-nowrap active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="pt-2 flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Ask about your expenses, budgets, savings, or spending trends..."
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] dark:border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-[#202020] dark:text-white placeholder-[#626262]/60 focus:outline-none focus:ring-2 focus:ring-[#FFDB8A]"
            />
            <button
              type="submit"
              disabled={isThinking || !inputPrompt.trim()}
              className="py-2.5 px-4 rounded-xl bg-[#FFDB8A] hover:bg-[#FFE099] border-2 border-[#202020] text-[#202020] font-bold text-xs sm:text-sm shadow-[2px_2px_0px_#202020] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: Spending Forecast */}
      {activeTab === 'forecast' && (
        <div className="card-retro p-5 sm:p-6 space-y-5">
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#202020] dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#202020] dark:text-white" />
              <span>Month-End Expense Trajectory & Forecast</span>
            </h3>
            <p className="text-xs text-[#626262] dark:text-slate-400 mt-1">
              Deterministic mathematical projection combining actual historical run-rate with scheduled recurring payments
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] shadow-[2px_2px_0px_#202020]">
              <span className="text-[10px] uppercase font-bold text-[#626262] dark:text-slate-400 tracking-wider">
                Current Actual Spend
              </span>
              <div className="font-serif text-2xl font-bold text-[#202020] dark:text-white mt-1 tabular-nums">
                {formatMoney(currentMonthTotals.totalExpense, currency)}
              </div>
              <p className="text-[11px] text-[#626262] dark:text-slate-400 mt-0.5">
                Recorded through today ({spendingForecast.daysElapsed} days)
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFDB8A] border-[1.5px] border-[#202020] shadow-[2px_2px_0px_#202020] text-[#202020]">
              <span className="text-[10px] uppercase font-bold tracking-wider">
                Projected Total Outflow
              </span>
              <div className="font-serif text-2xl font-bold mt-1 tabular-nums">
                {formatMoney(spendingForecast.projectedMonthEndExpense, currency)}
              </div>
              <p className="text-[11px] font-medium opacity-80 mt-0.5">
                Trajectory confidence: {spendingForecast.forecastConfidence}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#ADE0BB] border-[1.5px] border-[#202020] shadow-[2px_2px_0px_#202020] text-[#202020]">
              <span className="text-[10px] uppercase font-bold tracking-wider">
                Upcoming Recurring Bills
              </span>
              <div className="font-serif text-2xl font-bold mt-1 tabular-nums">
                {formatMoney(spendingForecast.recurringCommitmentsRemaining, currency)}
              </div>
              <p className="text-[11px] font-medium opacity-80 mt-0.5">
                Scheduled before month closes
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF7EE] dark:bg-[#18181D] border-[1.5px] border-[#202020] dark:border-slate-700 text-xs text-[#202020] dark:text-slate-200 space-y-2">
            <h4 className="font-bold">Transparent Mathematical Methodology:</h4>
            <p>
              Daily run-rate = current spend divided by elapsed month days ({formatMoney(spendingForecast.currentPace, currency)}/day).
              Projected end-of-month spend = Current Spend + (Daily Run-rate × {spendingForecast.daysRemaining} days remaining) + Scheduled Recurring Payments.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: Smart Categorizer */}
      {activeTab === 'categorizer' && (
        <div className="card-retro p-5 sm:p-6 space-y-5">
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#202020] dark:text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-[#202020] dark:text-white" />
              <span>Smart Transaction Categorizer Testbed</span>
            </h3>
            <p className="text-xs text-[#626262] dark:text-slate-400 mt-1">
              Test how the offline regex engine and Gemini AI auto-classify descriptions like "Swiggy biryani", "Uber ride", or "Hostel Wi-Fi"
            </p>
          </div>

          <div className="space-y-3 max-w-md">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#626262] dark:text-slate-400 mb-1">
                Transaction Memo / Narration
              </label>
              <input
                type="text"
                placeholder="e.g. Swiggy order, Hostel mess fee, Uber cab to airport"
                value={testDesc}
                onChange={(e) => setTestDesc(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border-[1.5px] border-[#202020] dark:border-slate-700 bg-white dark:bg-[#1E1E23] text-sm font-bold text-[#202020] dark:text-white"
              />
            </div>

            <button
              type="button"
              disabled={isCategorizing || !testDesc.trim()}
              onClick={handleTestCategorize}
              className="py-2.5 px-4 rounded-xl bg-[#FFDB8A] hover:bg-[#FFE099] border-2 border-[#202020] text-[#202020] font-bold text-xs sm:text-sm shadow-[2px_2px_0px_#202020] transition-all cursor-pointer disabled:opacity-50"
            >
              {isCategorizing ? 'Categorizing...' : 'Predict Category'}
            </button>
          </div>

          {categorizerResult && (
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1E1E23] border-[1.5px] border-[#202020] shadow-[2px_2px_0px_#202020] space-y-2 max-w-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#626262] uppercase">Predicted Category:</span>
                <span className="text-sm font-bold text-[#202020] dark:text-white bg-[#ADE0BB] px-2.5 py-0.5 rounded-lg border border-[#202020]">
                  {categorizerResult.name}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#626262]">Confidence Score:</span>
                <span className="font-bold text-[#202020] dark:text-white">
                  {Math.round(categorizerResult.confidence * 100)}%
                </span>
              </div>
              {categorizerResult.explanation && (
                <div className="text-xs text-[#626262] dark:text-slate-400 pt-1 border-t border-[#202020]/10">
                  {categorizerResult.explanation}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
