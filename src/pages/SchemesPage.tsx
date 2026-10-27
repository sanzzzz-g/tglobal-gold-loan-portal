import React, { useState, useEffect } from 'react';
import { Coins, CheckCircle2, ArrowRight, ShieldCheck, HelpCircle, ArrowUpDown } from 'lucide-react';
import { fetchSchemes } from '../api';
import type { LoanScheme } from '../types';

interface SchemesPageProps {
  setActiveTab: (tab: string) => void;
  onSelectSchemeForCalc: (schemeId: 'emi_plan' | 'bullet_plan') => void;
}

export const SchemesPage: React.FC<SchemesPageProps> = ({ setActiveTab, onSelectSchemeForCalc }) => {
  const [schemes, setSchemes] = useState<LoanScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoRate, setDemoRate] = useState<number>(7000);

  useEffect(() => {
    fetchSchemes()
      .then((res) => {
        setSchemes(res.schemes);
        setDemoRate(res.demonstration_gold_rate || 7000);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching schemes:', err);
        setLoading(false);
      });
  }, []);

  const handleCalculateWithScheme = (schemeId: 'emi_plan' | 'bullet_plan') => {
    onSelectSchemeForCalc(schemeId);
    setActiveTab('calculator');
  };

  return (
    <div className="space-y-12 py-6">
      {/* Page Header */}
      <div className="border-b border-stone-200 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-amber-50 text-amber-800 text-xs font-semibold uppercase tracking-wider mb-3 border border-amber-200/80">
          <Coins className="w-3.5 h-3.5 text-amber-600" />
          <span>AUTHORITATIVE CENTRAL SCHEMES</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0e1b2e] tracking-tight">
          Gold Loan Schemes & Repayment Options
        </h1>
        <p className="mt-2 text-sm text-stone-600 max-w-3xl leading-relaxed">
          Choose between our systematic monthly EMI option offering the highest LTV of 75%, or our flexible Bullet repayment plan designed for cyclical working capital needs. All schemes are calculated using our demonstration rate of ₹{demoRate.toLocaleString('en-IN')}/g.
        </p>
      </div>

      {loading ? (
        <div className="p-16 text-center text-stone-500 text-sm">Loading verified schemes from database...</div>
      ) : (
        <>
          {/* Detailed Scheme Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {schemes.map((scheme) => (
              <div
                key={scheme.id}
                className="bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-8 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded">
                      {scheme.repayment_type.toUpperCase()} REPAYMENT
                    </span>
                    <span className="text-xs font-mono font-medium text-stone-500">
                      ID: {scheme.id}
                    </span>
                  </div>

                  <h2 className="text-2xl font-bold text-[#0e1b2e]">{scheme.name}</h2>
                  <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
                    {scheme.description}
                  </p>

                  {/* Financial Metrics */}
                  <div className="mt-6 grid grid-cols-3 gap-3 p-4 rounded-xl bg-stone-50 border border-stone-200/80">
                    <div>
                      <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
                        Maximum LTV
                      </span>
                      <span className="text-xl sm:text-2xl font-bold text-[#0e1b2e] font-mono mt-0.5 block">
                        {scheme.formatted_ltv}
                      </span>
                      <span className="text-[10px] text-stone-400">Of gold valuation</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
                        Interest Rate
                      </span>
                      <span className="text-xl sm:text-2xl font-bold text-amber-700 font-mono mt-0.5 block">
                        {scheme.formatted_interest}
                      </span>
                      <span className="text-[10px] text-stone-400">Demonstration</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
                        Tenure Range
                      </span>
                      <span className="text-xl sm:text-2xl font-bold text-stone-800 font-mono mt-0.5 block">
                        {scheme.min_tenure_months}–{scheme.max_tenure_months}m
                      </span>
                      <span className="text-[10px] text-stone-400">Flexible options</span>
                    </div>
                  </div>

                  {/* Terms list */}
                  <div className="mt-6 space-y-2.5">
                    <h4 className="text-xs font-semibold text-[#0e1b2e] uppercase tracking-wider">
                      Official Scheme Terms & Conditions:
                    </h4>
                    <ul className="space-y-2 text-xs text-stone-600">
                      {scheme.key_terms.map((term, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                          <span>{term}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-stone-100 flex items-center justify-between gap-4">
                  <div className="text-xs text-stone-500">
                    <span className="block font-medium text-stone-700">Physical Gold Safety:</span>
                    <span>100% Insured Bank-grade Vaults</span>
                  </div>
                  <button
                    onClick={() => handleCalculateWithScheme(scheme.id)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0e1b2e] hover:bg-[#1a2e4a] text-white text-xs font-semibold transition-all shadow-xs"
                  >
                    <span>Calculate With This Scheme</span>
                    <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Scheme Comparison Matrix Table */}
          <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-stone-200">
              <h3 className="text-lg font-bold text-[#0e1b2e]">Direct Feature Comparison Matrix</h3>
              <p className="text-xs text-stone-600 mt-0.5">
                Compare financial features side-by-side to determine which structure aligns with your repayment capability.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-700 font-semibold">
                    <th className="py-3.5 px-6">Feature</th>
                    <th className="py-3.5 px-6 text-[#0e1b2e]">EMI Gold Advantage Plan</th>
                    <th className="py-3.5 px-6 text-[#0e1b2e]">Bullet Repayment Flexi Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/80 text-stone-600">
                  <tr>
                    <td className="py-3.5 px-6 font-semibold text-[#0e1b2e]">Maximum Loan-to-Value (LTV)</td>
                    <td className="py-3.5 px-6 font-mono font-bold text-emerald-700">75% (Maximum permissible)</td>
                    <td className="py-3.5 px-6 font-mono font-bold text-stone-800">70%</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-semibold text-[#0e1b2e]">Principal Repayment Schedule</td>
                    <td className="py-3.5 px-6">Equated monthly installments (EMI)</td>
                    <td className="py-3.5 px-6">Lumpsum at the end of the loan tenure</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-semibold text-[#0e1b2e]">Interest Servicing</td>
                    <td className="py-3.5 px-6">Included in monthly EMI</td>
                    <td className="py-3.5 px-6">Settled together at maturity</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-semibold text-[#0e1b2e]">Interest Rate (Demo)</td>
                    <td className="py-3.5 px-6 font-mono">9.50% p.a.</td>
                    <td className="py-3.5 px-6 font-mono">10.25% p.a.</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-semibold text-[#0e1b2e]">Tenure Duration</td>
                    <td className="py-3.5 px-6">3 to 36 Months</td>
                    <td className="py-3.5 px-6">3 to 12 Months</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-semibold text-[#0e1b2e]">Prepayment / Foreclosure Fee</td>
                    <td className="py-3.5 px-6 text-emerald-700 font-medium">Nil / Zero Penalty</td>
                    <td className="py-3.5 px-6 text-emerald-700 font-medium">Nil / Zero Penalty</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-6 font-semibold text-[#0e1b2e]">Ideal For</td>
                    <td className="py-3.5 px-6">Salaried individuals with predictable monthly cashflows</td>
                    <td className="py-3.5 px-6">Business owners & traders with cyclical inflows</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
