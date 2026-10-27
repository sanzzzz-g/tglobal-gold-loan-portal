import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  RotateCcw,
  Bot,
  User,
  Wrench,
  AlertTriangle,
  Calculator,
  FileText,
} from 'lucide-react';
import { sendAIChat } from '../api';

interface AIAssistantPageProps {
  setActiveTab: (tab: string) => void;
  onApplyWithQuote?: (quoteData: any) => void;
}

interface Message {
  role: 'user' | 'model';
  content: string;
  toolInvocations?: Array<{
    toolName: string;
    args: any;
    result: any;
  }>;
  suggestedAction?: {
    type: string;
    data?: any;
  };
}

export const AIAssistantPage: React.FC<AIAssistantPageProps> = ({ setActiveTab }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content:
        'Namaste! Welcome to T Global Gold Loans. I am your AI Loan Advisor powered by real-time database tools. I can look up live loan schemes, authoritatively calculate quotes at our ₹7,000/g demonstration benchmark, compare repayment structures, or guide you through application filing. How may I assist you today?',
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const suggestedQuestions = [
    'What gold loan schemes are available?',
    'Help me calculate a loan for 45 grams of 22K gold.',
    'Explain the difference between the available repayment plans.',
    'How much loan can I get for my gold?',
    'How do I apply for a gold loan?',
  ];

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || loading) return;

    setErrorMessage(null);
    setInputPrompt('');

    const newMessages: Message[] = [...messages, { role: 'user', content: prompt }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await sendAIChat(
        prompt,
        messages.map((m) => ({ role: m.role, content: m.content }))
      );

      setMessages([
        ...newMessages,
        {
          role: 'model',
          content: response.reply,
          toolInvocations: response.toolInvocations,
          suggestedAction: response.suggestedAction,
        },
      ]);
    } catch (err: any) {
      setErrorMessage(err.message || 'AI assistant encountered an error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        role: 'model',
        content:
          'Conversation cleared. I am ready to assist you with new gold loan valuations, scheme queries, or terms explanations.',
      },
    ]);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-6 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-amber-50 text-amber-800 text-xs font-semibold uppercase tracking-wider mb-2 border border-amber-200/80">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>REAL-TIME TOOL-CALLING AGENT</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#0e1b2e] tracking-tight">
            T Global AI Loan Advisor
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-600">
            Connected to official SQLite database tools & the authoritative financial calculation engine.
          </p>
        </div>

        <button
          onClick={handleResetChat}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>New Session</span>
        </button>
      </div>

      {/* Suggested Questions */}
      <div className="space-y-2">
        <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
          Suggested Questions for Evaluation:
        </span>
        <div className="flex flex-wrap gap-2">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-lg bg-white border border-stone-200 hover:border-amber-400 hover:bg-amber-50/50 text-stone-700 transition-all text-left shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs flex flex-col h-[560px] overflow-hidden">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={index}
                className={`flex gap-3 max-w-[88%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser
                      ? 'bg-[#0e1b2e] text-white'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-amber-700" />}
                </div>

                {/* Content */}
                <div className="space-y-3">
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-[#0e1b2e] text-white rounded-tr-xs'
                        : 'bg-stone-50 text-stone-800 border border-stone-200/80 rounded-tl-xs'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Real Tool Invocations Badge */}
                  {msg.toolInvocations && msg.toolInvocations.length > 0 && (
                    <div className="space-y-2">
                      {msg.toolInvocations.map((tool, tIdx) => (
                        <div
                          key={tIdx}
                          className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-950 flex items-start gap-2"
                        >
                          <Wrench className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-mono font-bold">Executed Tool: {tool.toolName}</span>
                            <p className="text-[10px] text-amber-800 mt-0.5">
                              {tool.toolName === 'get_loan_schemes' && 'Retrieved verified active schemes from central SQLite table.'}
                              {tool.toolName === 'calculate_loan_quote' && 'Invoked calculateQuote() authoritative financial calculation engine.'}
                              {tool.toolName === 'submit_loan_application' && 'Executed validated loan application service.'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Contextual Action Button */}
                  {msg.suggestedAction && msg.suggestedAction.type === 'CALCULATE' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveTab('calculator')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e1b2e] text-white text-xs font-semibold hover:bg-[#1a2e4a] cursor-pointer"
                      >
                        <Calculator className="w-3.5 h-3.5 text-amber-400" />
                        <span>Open Interactive Calculator</span>
                      </button>
                      <button
                        onClick={() => setActiveTab('apply')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-stone-800 text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        <span>Apply Online</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 max-w-[80%]">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 border border-amber-300">
                <Bot className="w-4 h-4 text-amber-700" />
              </div>
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 rounded-tl-xs flex items-center gap-2 text-xs text-stone-500">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-bounce"></span>
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:0.2s]"></span>
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:0.4s]"></span>
                <span className="ml-2 font-medium">Advisor is consulting authoritative backend tools...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-stone-50 border-t border-stone-200">
          {errorMessage && (
            <div className="mb-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Ask about loan schemes, calculation for gold weight, or application steps..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 bg-white text-xs sm:text-sm focus:ring-2 focus:ring-[#0e1b2e] outline-hidden"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputPrompt.trim()}
              className="px-4 py-2.5 rounded-xl bg-[#0e1b2e] hover:bg-[#1a2e4a] text-white text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5 text-amber-400" />
            </button>
          </form>
          <div className="mt-2 text-center text-[10px] text-stone-400">
            The AI Advisor executes validated tools on the server and adheres to customer confirmation requirements.
          </div>
        </div>
      </div>
    </div>
  );
};
