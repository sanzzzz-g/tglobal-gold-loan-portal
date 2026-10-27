import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { SchemesPage } from './pages/SchemesPage';
import { CalculatorPage } from './pages/CalculatorPage';
import { ApplicationPage } from './pages/ApplicationPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { AdminPage } from './pages/AdminPage';
import type { SchemeId, PurityKarat, CalculationBreakdown, AdminUser } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedSchemeForCalc, setSelectedSchemeForCalc] = useState<SchemeId>('emi_plan');
  const [quoteDataForApplication, setQuoteDataForApplication] = useState<{
    gross_weight: number;
    stone_weight: number;
    purity_karat: PurityKarat;
    scheme_id: SchemeId;
    quote: CalculationBreakdown;
  } | null>(null);

  const [adminToken, setAdminToken] = useState<string | null>(() => {
    return localStorage.getItem('t_global_admin_token') || null;
  });
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  const handleSelectSchemeForCalc = (schemeId: SchemeId) => {
    setSelectedSchemeForCalc(schemeId);
    setActiveTab('calculator');
  };

  const handleProceedToApply = (data: {
    gross_weight: number;
    stone_weight: number;
    purity_karat: PurityKarat;
    scheme_id: SchemeId;
    quote: CalculationBreakdown;
  }) => {
    setQuoteDataForApplication(data);
    setActiveTab('apply');
  };

  // Scroll to top on tab switch
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col font-sans selection:bg-amber-200 selection:text-amber-950">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAdminLoggedIn={!!adminToken}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {activeTab === 'overview' && (
          <HomePage
            setActiveTab={setActiveTab}
            onSelectSchemeForCalc={handleSelectSchemeForCalc}
          />
        )}

        {activeTab === 'schemes' && (
          <SchemesPage
            setActiveTab={setActiveTab}
            onSelectSchemeForCalc={handleSelectSchemeForCalc}
          />
        )}

        {activeTab === 'calculator' && (
          <CalculatorPage
            initialScheme={selectedSchemeForCalc}
            onProceedToApply={handleProceedToApply}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'apply' && (
          <ApplicationPage
            initialQuoteData={quoteDataForApplication}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'ai-assistant' && (
          <AIAssistantPage setActiveTab={setActiveTab} />
        )}

        {activeTab === 'admin' && (
          <AdminPage
            adminToken={adminToken}
            setAdminToken={setAdminToken}
            adminUser={adminUser}
            setAdminUser={setAdminUser}
          />
        )}
      </main>

      <Footer setActiveTab={setActiveTab} />
    </div>
  );
}
