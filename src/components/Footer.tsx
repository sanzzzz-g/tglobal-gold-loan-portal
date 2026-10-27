import React from 'react';
import { ShieldCheck, Lock, Award, Coins } from 'lucide-react';

export const Footer: React.FC<{ setActiveTab: (tab: string) => void }> = ({ setActiveTab }) => {
  return (
    <footer className="bg-[#0e1b2e] text-stone-300 pt-12 pb-8 border-t border-amber-900/40 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-stone-800">
          {/* Col 1: Brand */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center">
                <Coins className="w-4 h-4 text-amber-400" />
              </div>
              <span className="font-bold text-white text-base tracking-tight">T GLOBAL GOLD LOANS</span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              Transparent, gold-backed liquidity with industry-leading LTV ratios up to 75% and instant algorithmic valuation.
            </p>
            <div className="pt-2 flex items-center gap-3 text-xs text-amber-400">
              <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Insured Vaults</span>
              <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5" /> BIS Hallmark Assayed</span>
            </div>
          </div>

          {/* Col 2: Customer Nav */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Portal Services</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => setActiveTab('overview')} className="hover:text-amber-300 transition-colors">
                  Overview & Methodology
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('schemes')} className="hover:text-amber-300 transition-colors">
                  Available Loan Schemes
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('calculator')} className="hover:text-amber-300 transition-colors">
                  Instant Gold Calculator
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('apply')} className="hover:text-amber-300 transition-colors">
                  3-Step Loan Application
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('ai-assistant')} className="hover:text-amber-300 transition-colors">
                  AI Loan Advisor
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Loan Schemes */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Loan Schemes</h4>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <span className="text-white font-medium">EMI Advantage Plan:</span> 75% LTV, 9.50% p.a., 3–36 Months tenure
              </li>
              <li>
                <span className="text-white font-medium">Bullet Flexi Plan:</span> 70% LTV, 10.25% p.a., 3–12 Months tenure
              </li>
              <li className="pt-1 text-[11px] text-stone-400">
                Purity benchmark: 18K (75%), 22K (91.67%), 24K (100%).
              </li>
            </ul>
          </div>

          {/* Col 4: Administrative & Evaluation Info */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Technical Assignment</h4>
            <p className="text-xs text-stone-400 leading-relaxed mb-3">
              Built for the T Global Full Stack Developer Intern assignment evaluation. Features full-stack persistence, transactional duplicate protection, and server-side Gemini function calling.
            </p>
            <button
              onClick={() => setActiveTab('admin')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Officer Admin Portal</span>
            </button>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="pt-6 text-center text-xs text-stone-400 space-y-2">
          <p className="text-stone-400 max-w-4xl mx-auto leading-relaxed">
            <strong className="text-amber-300 font-medium">Demonstration Notice:</strong> Gold rate benchmark of ₹7,000 per gram and scheme interest rates are strictly demonstration values specified for technical assignment testing and do not constitute live market financial products or financial advice.
          </p>
          <p className="text-stone-400">
            © {new Date().getFullYear()} T Global Financial Services. All rights reserved. Built with React, TypeScript, Express, SQLite & Gemini AI.
          </p>
        </div>
      </div>
    </footer>
  );
};
