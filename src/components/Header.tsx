import React, { useState } from 'react';
import { ShieldCheck, Calculator, FileText, Sparkles, Lock, Menu, X, Coins, HelpCircle } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdminLoggedIn: boolean;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, isAdminLoggedIn }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: ShieldCheck },
    { id: 'schemes', label: 'Loan Schemes', icon: Coins },
    { id: 'calculator', label: 'Calculator', icon: Calculator },
    { id: 'apply', label: 'Apply Now', icon: FileText },
    { id: 'ai-assistant', label: 'AI Advisor', icon: Sparkles, badge: 'Smart' },
  ];

  const handleNav = (id: string) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/90 shadow-xs">
      {/* Rate ticker banner */}
      <div className="bg-[#0e1b2e] text-white text-xs py-1.5 px-4 border-b border-amber-900/30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-stone-300 font-medium">Demonstration Gold Rate:</span>
            <span className="font-bold text-amber-300 font-mono">₹7,000 / gram</span>
            <span className="text-stone-400 text-[11px]">(24K Pure Gold Benchmark)</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-stone-300">
            <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px] font-semibold border border-amber-400/30">
              EVALUATION DEMO DATA
            </span>
            <span>T Global Enterprise Portal</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Brand Logo */}
          <button
            onClick={() => handleNav('overview')}
            className="flex items-center gap-3 text-left group focus:outline-hidden"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0e1b2e] to-[#1a2e4a] border border-amber-500/40 flex items-center justify-center shadow-xs group-hover:border-amber-400 transition-colors">
              <Coins className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-[#0e1b2e]">T GLOBAL</span>
                <span className="text-[10px] font-semibold tracking-wider text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded">FINANCE</span>
              </div>
              <p className="text-[11px] font-medium text-stone-500 uppercase tracking-widest -mt-0.5">
                Gold Loan Portal
              </p>
            </div>
          </button>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-stone-100 text-[#0e1b2e] shadow-2xs font-semibold'
                      : 'text-stone-600 hover:text-[#0e1b2e] hover:bg-stone-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-700' : 'text-stone-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-xs border border-amber-300">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Admin Portal Button */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => handleNav('admin')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'admin'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-800 hover:bg-stone-200 border border-stone-300/80'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isAdminLoggedIn ? 'Admin Dashboard' : 'Admin Portal'}</span>
              {isAdminLoggedIn && (
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              )}
            </button>
          </div>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => handleNav('admin')}
              className="p-2 rounded-lg text-stone-600 hover:bg-stone-100"
              title="Admin Portal"
            >
              <Lock className="w-5 h-5 text-stone-700" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-stone-600 hover:bg-stone-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive ? 'bg-amber-50 text-amber-900 font-semibold' : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-700' : 'text-stone-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded border border-amber-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
          <div className="pt-2 border-t border-stone-200 mt-2">
            <button
              onClick={() => handleNav('admin')}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold bg-stone-100 text-stone-800"
            >
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-stone-600" />
                <span>{isAdminLoggedIn ? 'Admin Dashboard (Active)' : 'Admin Sign In'}</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
