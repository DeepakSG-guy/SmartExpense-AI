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

  // Construct factual grounded financial context
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
      spendingForecast: {
        projectedMonthEnd: formatMoney(spendingForecast.projectedMonthEndExpense, currency),
        dailyPace: formatMoney(spendingForecast.currentPace, currency),
        confidence: spendingForecast.forecastConfidence,
      },
      totalActiveAccounts: accounts.filter((a) => !a.isArchived).length,
    };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt) return;

    setChatError('');
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsThinking(true);

    try {
      const factualContext = buildFactualContext();
      const history = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const reply = await aiService.askFinancialChat(prompt, factualContext, history);

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setChatError(
        err.message ||
          'AI Assistant request failed. Ensure backend server is running with GEMINI_API_KEY.'
      );
    } finally {
      setIsThinking(false);
    }
  };

  // Test Categorization Playground
  const handleTestCategorize = async () => {
    if (!testDesc.trim()) return;
    setIsCategorizing(true);
    setCategorizerResult(null);

    const amt = parseFloat(testAmount) || 0;
    const res = await aiService.suggestCategory(testDesc, amt, 'expense', categories);
    setCategorizerResult(res);
    setIsCategorizing(false);
  };

  const quickPrompts = [
    'What are my biggest expenses this month?',
    'How much did I save this month and what is my savings rate?',
    'Am I on track with my category budgets?',
    'What can I do to reduce my non-essential spending?',
  ];

  return (
    <div className="space-y-6">
      {/* Top AI Status Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Gemini Financial Intelligence
              </h2>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  aiHealth.hasGeminiKey
                    ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
                }`}
              >
                {aiHealth.hasGeminiKey ? 'Gemini 3.8 Connected' : 'Local Fallback'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Grounded exclusively in your computed IndexedDB financial balances and budgets.
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex-1 sm:flex-none py-1.5 px-3 rounded-lg transition-all ${
              activeTab === 'chat'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500'
            }`}
          >
            Financial Chat
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('forecast')}
            className={`flex-1 sm:flex-none py-1.5 px-3 rounded-lg transition-all ${
              activeTab === 'forecast'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500'
            }`}
          >
            Spending Forecast
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('categorizer')}
            className={`flex-1 sm:flex-none py-1.5 px-3 rounded-lg transition-all ${
              activeTab === 'categorizer'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500'
            }`}
          >
            Smart Categorizer
          </button>
        </div>
      </div>

      {/* Warning if backend key is missing */}
      {!aiHealth.hasGeminiKey && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
          <div>
            <strong>Gemini Server Unavailable:</strong> The server backend is running without a GEMINI_API_KEY. All your expense tracking, deterministic insights, and local rule categorizations remain 100% operational.
          </div>
        </div>
      )}

      {/* TAB 1: Financial Chat */}
      {activeTab === 'chat' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col h-[600px]">
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
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white ${
                    msg.role === 'user' ? 'bg-slate-800 dark:bg-slate-700' : 'bg-emerald-600'
                  }`}
                >
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>

                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-slate-750'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                  <span
                    className={`block text-[10px] mt-1 text-right ${
                      msg.role === 'user' ? 'text-emerald-100' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>SmartExpense AI is computing grounded financial response...</span>
              </div>
            )}

            {chatError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs border border-rose-200">
                {chatError}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="pt-3 pb-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none border-t border-slate-100 dark:border-slate-800">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(q)}
                className="py-1 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap active:scale-95 transition-all cursor-pointer"
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
              className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              disabled={isThinking || !inputPrompt.trim()}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition-all disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* TAB 2: Transparent Spending Forecast */}
      {activeTab === 'forecast' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-500" />
              <span>Month-End Expense Trajectory & Forecast</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Transparent, deterministic financial extrapolation based on elapsed days, daily run-rate, and upcoming scheduled recurring obligations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                Projected Total Expense
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {formatMoney(spendingForecast.projectedMonthEndExpense, currency)}
              </div>
              <span className="text-[11px] text-slate-400">By end of current month</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                Current Daily Burn Rate
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {formatMoney(spendingForecast.currentPace, currency)}
              </div>
              <span className="text-[11px] text-slate-400">
                Across {spendingForecast.daysElapsed} days elapsed
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                Upcoming Recurring Bills
              </span>
              <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                {formatMoney(spendingForecast.recurringCommitmentsRemaining, currency)}
              </div>
              <span className="text-[11px] text-slate-400">
                Due in next {spendingForecast.daysRemaining} days
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              <span>Forecast Mathematical Assumptions:</span>
              <span className="capitalize px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-[10px]">
                {spendingForecast.forecastConfidence} Confidence
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {spendingForecast.summaryText}
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: Smart Categorizer Playground */}
      {activeTab === 'categorizer' && (
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              <span>Intelligent Categorization Playground</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Test how SmartExpense AI maps real-world descriptions (e.g. Swiggy, Uber, D-Mart, Electricity) to your expense categories.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-slate-400 uppercase block mb-1">
                Description / Merchant
              </label>
              <input
                type="text"
                placeholder="e.g. Starbucks cold brew, Blinkit grocery, BESCOM electricity"
                value={testDesc}
                onChange={(e) => setTestDesc(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400 uppercase block mb-1">
                Amount ({currency})
              </label>
              <input
                type="number"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm"
              />
            </div>
          </div>

          <button
            type="button"
            disabled={isCategorizing || !testDesc.trim()}
            onClick={handleTestCategorize}
            className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-all disabled:opacity-40 cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isCategorizing ? 'Classifying...' : 'Predict Category'}</span>
          </button>

          {categorizerResult && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 uppercase text-[10px]">Predicted Category</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Source: {categorizerResult.source}
                </span>
              </div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">
                {categorizerResult.category}
              </div>
              <p className="text-slate-500">
                Confidence: {(categorizerResult.confidence * 100).toFixed(0)}% •{' '}
                {categorizerResult.explanation || 'Matched dictionary'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
