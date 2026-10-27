import React, { useState, useEffect } from 'react';
import {
  Shield,
  ArrowRight,
  Calculator,
  Coins,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Percent,
  Clock,
  Scale,
  Building2,
  Lock,
} from 'lucide-react';
import { fetchSchemes } from '../api';
import type { LoanScheme } from '../types';

interface HomePageProps {
  setActiveTab: (tab: string) => void;
  onSelectSchemeForCalc?: (schemeId: 'emi_plan' | 'bullet_plan') => void;
}

export const HomePage: React.FC<HomePageProps> = ({ setActiveTab, onSelectSchemeForCalc }) => {
  const [schemes, setSchemes] = useState<LoanScheme[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [loadingSchemes, setLoadingSchemes] = useState(true);

  useEffect(() => {
    fetchSchemes()
      .then((res) => {
        setSchemes(res.schemes);
        setLoadingSchemes(false);
      })
      .catch((err) => {
        console.error('Failed to load schemes:', err);
        setLoadingSchemes(false);
      });
  }, []);

  const handleSelectScheme = (schemeId: 'emi_plan' | 'bullet_plan') => {
    if (onSelectSchemeForCalc) {
      onSelectSchemeForCalc(schemeId);
    }
    setActiveTab('calculator');
  };

  const faqs = [
    {
      q: 'How is my gold loan valuation calculated?',
      a: 'Valuation follows our transparent, authoritative formula: First, any non-gold or stone weight is subtracted from gross weight to find net gold weight. Next, the net weight is multiplied by the demonstration rate (₹7,000/g) and adjusted for purity (e.g. 22K is 22/24 = 91.67%). Finally, the chosen scheme LTV (75% for EMI, 70% for Bullet) is applied to determine the maximum eligible loan amount.',
    },
    {
      q: 'What is the difference between EMI Plan and Bullet Repayment?',
      a: 'The EMI Plan offers our highest LTV of 75% where you repay both principal and interest in monthly installments. The Bullet Plan offers 70% LTV with zero monthly principal payments; you settle the principal and accumulated interest at tenure completion.',
    },
    {
      q: 'What is the 7-day duplicate application policy?',
      a: 'To prevent duplicate processing and protect customer requests, the T Global system restricts repeat applications from the same mobile number within 7 days. If you already have an application in review, please wait for our loan officer or track your reference ID.',
    },
    {
      q: 'How is my gold safely stored during the loan tenure?',
      a: 'Your gold is weighed and sealed in tamper-evident envelopes in your presence and deposited into bank-grade, 100% insured fire-proof vaults under continuous biometric surveillance until redemption.',
    },
    {
      q: 'Can I repay my loan before the completion of tenure?',
      a: 'Yes, both EMI and Bullet schemes allow prepayments and foreclosure at any time without penalty or hidden charges.',
    },
  ];

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-stone-50 via-white to-stone-50/50 rounded-2xl border border-stone-200/80 p-8 sm:p-12 shadow-xs">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-amber-50 border border-amber-200/90 text-amber-800 text-xs font-semibold uppercase tracking-wider mb-5">
            <Coins className="w-3.5 h-3.5 text-amber-600" />
            <span>Highest LTV In Industry • Up to 75% Loan Value</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#0e1b2e] tracking-tight leading-[1.15]">
            Unlock Instant Liquidity Against Your Gold Ornaments
          </h1>

          <p className="mt-4 text-base sm:text-lg text-stone-600 leading-relaxed font-normal">
            Authoritative, transparent net-weight gold valuation. Get an instant eligibility quote at our demonstration rate of <span className="font-semibold text-stone-900">₹7,000/g</span> and submit a secure 3-step application.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              onClick={() => setActiveTab('calculator')}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#0e1b2e] hover:bg-[#1a2e4a] text-white font-semibold text-sm shadow-sm transition-all group"
            >
              <Calculator className="w-4 h-4 text-amber-400" />
              <span>Calculate My Loan</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={() => setActiveTab('schemes')}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-white hover:bg-stone-50 text-stone-800 font-semibold text-sm border border-stone-300 shadow-2xs transition-all"
            >
              <Coins className="w-4 h-4 text-amber-600" />
              <span>Explore Schemes</span>
            </button>

            <button
              onClick={() => setActiveTab('ai-assistant')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-amber-50 hover:bg-amber-100/80 text-amber-900 font-semibold text-xs border border-amber-300/80 transition-all"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Ask AI Loan Advisor</span>
            </button>
          </div>
        </div>

        {/* Rate overview card in hero */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-stone-200">
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">24K Gold Rate</span>
            <span className="text-xl font-bold text-[#0e1b2e] font-mono mt-1 block">₹7,000 / g</span>
            <span className="text-[11px] text-stone-500">100% Purity Benchmark (Demo)</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">22K Gold Rate</span>
            <span className="text-xl font-bold text-[#0e1b2e] font-mono mt-1 block">₹6,416.67 / g</span>
            <span className="text-[11px] text-stone-500">91.67% Equivalent (22/24)</span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">18K Gold Rate</span>
            <span className="text-xl font-bold text-[#0e1b2e] font-mono mt-1 block">₹5,250.00 / g</span>
            <span className="text-[11px] text-stone-500">75.00% Equivalent (18/24)</span>
          </div>
        </div>
      </section>

      {/* 4-Step Process Section */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0e1b2e] tracking-tight">
            How The T Global Gold Loan Works
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            A fast, structured process from initial valuation to doorstep verification and account credit.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Gold Appraisal',
              desc: 'Enter gross weight, stone weight deduction, and karat purity (18K, 22K, 24K).',
              icon: Scale,
            },
            {
              step: '02',
              title: 'Choose Scheme',
              desc: 'Pick between 75% LTV EMI Plan or 70% LTV Bullet Flexi Repayment.',
              icon: Percent,
            },
            {
              step: '03',
              title: 'Instant Application',
              desc: 'Provide basic applicant name and mobile number. No sensitive documents required upfront.',
              icon: Clock,
            },
            {
              step: '04',
              title: 'Assay & Disbursal',
              desc: 'Branch officer completes physical verification; gold stored in insured vaults.',
              icon: Shield,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.step}
                className="bg-white p-6 rounded-xl border border-stone-200/90 shadow-2xs relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                      STEP {item.step}
                    </span>
                    <Icon className="w-5 h-5 text-stone-400" />
                  </div>
                  <h3 className="font-semibold text-base text-[#0e1b2e]">{item.title}</h3>
                  <p className="mt-2 text-xs text-stone-600 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Available Loan Schemes Preview */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0e1b2e] tracking-tight">
              Featured Loan Schemes
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Live schemes retrieved directly from our central financial database.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('schemes')}
            className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1 group"
          >
            <span>View detailed scheme comparison</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {loadingSchemes ? (
          <div className="p-12 text-center text-sm text-stone-500">Loading active loan schemes...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {schemes.map((scheme) => (
              <div
                key={scheme.id}
                className="bg-white rounded-xl border border-stone-200/90 p-6 sm:p-8 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                      {scheme.repayment_type} REPAYMENT
                    </span>
                    <span className="text-xs font-mono font-semibold text-stone-500">
                      Tenure: {scheme.min_tenure_months}–{scheme.max_tenure_months} mo
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-[#0e1b2e]">{scheme.name}</h3>
                  <p className="mt-2 text-xs text-stone-600 leading-relaxed">{scheme.description}</p>

                  <div className="mt-6 grid grid-cols-2 gap-4 p-4 rounded-lg bg-stone-50 border border-stone-200/80">
                    <div>
                      <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                        Maximum LTV
                      </span>
                      <span className="text-2xl font-extrabold text-[#0e1b2e] font-mono mt-0.5 block">
                        {scheme.formatted_ltv}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                        Interest Rate
                      </span>
                      <span className="text-2xl font-extrabold text-amber-700 font-mono mt-0.5 block">
                        {scheme.formatted_interest}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <span className="text-xs font-semibold text-stone-700 block">Key Plan Highlights:</span>
                    <ul className="space-y-1.5 text-xs text-stone-600">
                      {scheme.key_terms.slice(0, 3).map((term, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>{term}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-stone-100 flex items-center justify-between gap-4">
                  <span className="text-xs text-stone-400">Zero locker storage charges</span>
                  <button
                    onClick={() => handleSelectScheme(scheme.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0e1b2e] hover:bg-[#1a2e4a] text-white text-xs font-semibold transition-all shadow-2xs"
                  >
                    <span>Calculate With This Plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Gold Valuation Methodology Explainer */}
      <section className="bg-stone-50 rounded-2xl border border-stone-200/90 p-8 sm:p-10 shadow-xs">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
            <Scale className="w-4 h-4 text-amber-700" />
            <span>FINANCIAL TRANSPARENCY</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0e1b2e] tracking-tight">
            How Gold Valuation Works
          </h2>
          <p className="mt-2 text-sm text-stone-600 leading-relaxed">
            Unlike informal lenders who subtract arbitrary deductions, T Global calculates gold valuation deterministically through a three-stage mathematical formula.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-xs font-bold text-amber-700 block mb-1">Stage 1</span>
            <h4 className="font-semibold text-sm text-[#0e1b2e]">Net Gold Weight</h4>
            <div className="mt-2 text-xs font-mono bg-stone-100 p-2.5 rounded text-stone-800 border border-stone-200">
              Net Weight = Gross Weight - Stone Weight
            </div>
            <p className="mt-2 text-xs text-stone-500 leading-relaxed">
              We never charge or value stones, beads, or decorative wax as gold.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-xs font-bold text-amber-700 block mb-1">Stage 2</span>
            <h4 className="font-semibold text-sm text-[#0e1b2e]">Purity-Adjusted Value</h4>
            <div className="mt-2 text-xs font-mono bg-stone-100 p-2.5 rounded text-stone-800 border border-stone-200">
              Value = Net Wt × ₹7,000 × (Karat / 24)
            </div>
            <p className="mt-2 text-xs text-stone-500 leading-relaxed">
              22K gold is valued at 22/24 (91.67%) and 18K at 18/24 (75.00%) of the 24K demo benchmark.
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-xs font-bold text-amber-700 block mb-1">Stage 3</span>
            <h4 className="font-semibold text-sm text-[#0e1b2e]">Eligible Loan Amount</h4>
            <div className="mt-2 text-xs font-mono bg-stone-100 p-2.5 rounded text-stone-800 border border-stone-200">
              Loan = Purity Value × Scheme LTV
            </div>
            <p className="mt-2 text-xs text-stone-500 leading-relaxed">
              EMI plan applies 75% LTV; Bullet plan applies 70% LTV, rounded to the nearest rupee.
            </p>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between flex-wrap gap-4 pt-6 border-t border-stone-200 text-xs text-stone-600">
          <span>Verify these calculations anytime in our interactive calculator.</span>
          <button
            onClick={() => setActiveTab('calculator')}
            className="font-semibold text-[#0e1b2e] hover:text-amber-700 flex items-center gap-1"
          >
            <span>Open live calculator</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="space-y-6">
        <div className="max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0e1b2e] tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Answers to common questions regarding eligibility, interest calculation, and policies.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left font-semibold text-sm text-[#0e1b2e] hover:bg-stone-50/80 transition-colors"
                >
                  <span className="pr-4">{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-stone-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-stone-600 leading-relaxed border-t border-stone-100">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
