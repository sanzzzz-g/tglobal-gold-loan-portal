import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Shield,
  Coins,
  Scale,
  Search,
  Clock,
  Printer,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { submitApplication, fetchQuote, trackApplication, fetchSchemes } from '../api';
import type { CalculationBreakdown, PurityKarat, SchemeId, ApplicationRecord, LoanScheme } from '../types';

interface ApplicationPageProps {
  initialQuoteData?: {
    gross_weight: number;
    stone_weight: number;
    purity_karat: PurityKarat;
    scheme_id: SchemeId;
    quote: CalculationBreakdown;
  } | null;
  setActiveTab: (tab: string) => void;
}

export const ApplicationPage: React.FC<ApplicationPageProps> = ({
  initialQuoteData,
  setActiveTab,
}) => {
  // Navigation between 'new' application or 'track'
  const [viewMode, setViewMode] = useState<'new' | 'track'>('new');

  // Application wizard steps: 1 = Gold Details, 2 = Applicant Info, 3 = Review & Submit, 4 = Success
  const [currentStep, setCurrentStep] = useState<number>(initialQuoteData ? 2 : 1);

  // Step 1: Gold Data
  const [grossWeight, setGrossWeight] = useState<number>(initialQuoteData?.gross_weight || 45);
  const [stoneWeight, setStoneWeight] = useState<number>(initialQuoteData?.stone_weight || 0);
  const [purityKarat, setPurityKarat] = useState<PurityKarat>(initialQuoteData?.purity_karat || 22);
  const [schemeId, setSchemeId] = useState<SchemeId>(initialQuoteData?.scheme_id || 'emi_plan');
  const [liveQuote, setLiveQuote] = useState<CalculationBreakdown | null>(initialQuoteData?.quote || null);

  // Step 2: Applicant Data
  const [applicantName, setApplicantName] = useState<string>('');
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [consentTerms, setConsentTerms] = useState<boolean>(false);

  // Step 3: Explicit Confirmation Checkbox
  const [explicitConfirmation, setExplicitConfirmation] = useState<boolean>(false);

  // State management
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDuplicateConflict, setIsDuplicateConflict] = useState<boolean>(false);

  // Tracking state
  const [searchReference, setSearchReference] = useState<string>('');
  const [trackedRecord, setTrackedRecord] = useState<ApplicationRecord | null>(null);
  const [trackingLoading, setTrackingLoading] = useState<boolean>(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  // Recalculate quote whenever Step 1 parameters change
  useEffect(() => {
    if (grossWeight <= 0 || stoneWeight < 0 || stoneWeight >= grossWeight) {
      setLiveQuote(null);
      return;
    }

    fetchQuote({
      gross_weight: grossWeight,
      stone_weight: stoneWeight,
      purity_karat: purityKarat,
      scheme_id: schemeId,
    })
      .then((q) => setLiveQuote(q))
      .catch((err) => console.error('Quote error:', err));
  }, [grossWeight, stoneWeight, purityKarat, schemeId]);

  const handleStep1Next = () => {
    setErrorMessage(null);
    if (!liveQuote) {
      setErrorMessage('Please verify your gold details to obtain an approved quote before proceeding.');
      return;
    }
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    setErrorMessage(null);
    if (!applicantName.trim() || applicantName.trim().length < 2) {
      setErrorMessage('Please enter your full legal name (at least 2 characters).');
      return;
    }

    const cleanedMobile = mobileNumber.replace(/[\s\-\(\)\.]/g, '');
    const has10Digits = cleanedMobile.endsWith('$') || /^[6-9]\d{9}$/.test(cleanedMobile.replace(/^(\+91|91|0)/, ''));

    if (!has10Digits) {
      setErrorMessage('Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.');
      return;
    }

    if (!consentTerms) {
      setErrorMessage('You must review and accept the terms and consent checkbox to proceed.');
      return;
    }

    setCurrentStep(3);
  };

  const handleSubmitApplication = async () => {
    setErrorMessage(null);
    setIsDuplicateConflict(false);

    if (!explicitConfirmation) {
      setErrorMessage('Explicit confirmation is required. Please check the confirmation box before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitApplication({
        applicant_name: applicantName.trim(),
        mobile_number: mobileNumber.trim(),
        email: email.trim() || undefined,
        gross_weight: grossWeight,
        stone_weight: stoneWeight,
        purity_karat: purityKarat,
        scheme_id: schemeId,
        consent: true,
      });

      setSubmissionResult(res);
      setCurrentStep(4);
    } catch (err: any) {
      if (err.status === 409 || err.code === 'DUPLICATE_APPLICATION_WINDOW') {
        setIsDuplicateConflict(true);
        setErrorMessage(
          err.message ||
            'An application from this mobile number was submitted within the last 7 days. Under our policy, repeat applications are permitted only after 7 days.'
        );
      } else {
        setErrorMessage(err.message || 'Submission failed. Please check your connection and inputs.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchReference.trim()) return;

    setTrackingLoading(true);
    setTrackingError(null);
    setTrackedRecord(null);

    try {
      const record = await trackApplication(searchReference.trim());
      setTrackedRecord(record);
    } catch (err: any) {
      setTrackingError(err.message || 'No application found with this reference number.');
    } finally {
      setTrackingLoading(false);
    }
  };

  return (
    <div className="space-y-8 py-6">
      {/* Top Header & Tab Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-amber-50 text-amber-800 text-xs font-semibold uppercase tracking-wider mb-2 border border-amber-200/80">
            <FileText className="w-3.5 h-3.5 text-amber-600" />
            <span>CUSTOMER APPLICATION DESK</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#0e1b2e] tracking-tight">
            {viewMode === 'new' ? 'Gold Loan Application' : 'Track Application Status'}
          </h1>
        </div>

        {/* View toggle button */}
        <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-lg border border-stone-200">
          <button
            onClick={() => { setViewMode('new'); setErrorMessage(null); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'new' ? 'bg-white text-[#0e1b2e] shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            New Application
          </button>
          <button
            onClick={() => { setViewMode('track'); setErrorMessage(null); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              viewMode === 'track' ? 'bg-white text-[#0e1b2e] shadow-2xs' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Track Existing Reference
          </button>
        </div>
      </div>

      {viewMode === 'track' ? (
        /* Application Tracking View */
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h2 className="text-lg font-bold text-[#0e1b2e]">Check Application Status</h2>
            <p className="text-xs text-stone-600 mt-1">
              Enter your unique Application Reference ID (e.g. TG-GL-202610-XXXX) issued during submission.
            </p>
          </div>

          <form onSubmit={handleTrackSearch} className="flex gap-2">
            <input
              type="text"
              value={searchReference}
              onChange={(e) => setSearchReference(e.target.value)}
              placeholder="e.g. TG-GL-202610-8492"
              className="flex-1 px-4 py-2.5 rounded-lg border border-stone-300 font-mono text-sm focus:ring-2 focus:ring-[#0e1b2e] outline-hidden uppercase"
              required
            />
            <button
              type="submit"
              disabled={trackingLoading}
              className="px-5 py-2.5 bg-[#0e1b2e] hover:bg-[#1a2e4a] text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span>{trackingLoading ? 'Searching...' : 'Track'}</span>
            </button>
          </form>

          {trackingError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{trackingError}</span>
            </div>
          )}

          {trackedRecord && (
            <div className="p-6 rounded-xl bg-stone-50 border border-stone-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div>
                  <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
                    Application Reference
                  </span>
                  <span className="font-mono font-bold text-base text-[#0e1b2e]">
                    {trackedRecord.application_reference}
                  </span>
                </div>
                <div>
                  <span
                    className={`inline-block px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                      trackedRecord.status === 'Approved'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : trackedRecord.status === 'Under Review'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : trackedRecord.status === 'Rejected'
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-blue-100 text-blue-800 border border-blue-300'
                    }`}
                  >
                    {trackedRecord.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-stone-500">Applicant:</span>
                  <p className="font-semibold text-stone-800">{trackedRecord.applicant_name}</p>
                </div>
                <div>
                  <span className="text-stone-500">Scheme:</span>
                  <p className="font-semibold text-stone-800">{trackedRecord.scheme_name || trackedRecord.scheme_id}</p>
                </div>
                <div>
                  <span className="text-stone-500">Gold Pledged:</span>
                  <p className="font-mono text-stone-800">{trackedRecord.net_weight}g ({trackedRecord.purity_karat}K)</p>
                </div>
                <div>
                  <span className="text-stone-500">Approved Loan Amount:</span>
                  <p className="font-mono font-bold text-emerald-700">
                    ₹{trackedRecord.eligible_loan_amount.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <span className="text-stone-500">Submitted On:</span>
                  <p className="text-stone-700">{new Date(trackedRecord.created_at).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-stone-500">Last Updated:</span>
                  <p className="text-stone-700">{new Date(trackedRecord.updated_at).toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-stone-500 border-t border-stone-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>Our branch loan officer reviews applications within 24 business hours.</span>
              </div>
            </div>
          )}
        </div>
      ) : currentStep === 4 ? (
        /* Step 4: Submission Success Page */
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-stone-200/90 p-8 shadow-xs text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center border-2 border-emerald-300 shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded border border-emerald-200">
              APPLICATION SUBMITTED SUCCESSFULLY
            </span>
            <h2 className="text-2xl font-extrabold text-[#0e1b2e] mt-3">
              Application Reference Issued
            </h2>
            <div className="mt-4 p-4 rounded-xl bg-stone-50 border border-stone-200 inline-block font-mono text-xl sm:text-2xl font-bold text-[#0e1b2e]">
              {submissionResult?.application?.application_reference}
            </div>
            <p className="mt-2 text-xs text-stone-500">
              Please save this reference number to track your gold loan status.
            </p>
          </div>

          {/* Loan Quote Recap */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-left text-xs space-y-2">
            <div className="flex justify-between py-1 border-b border-stone-200">
              <span className="text-stone-500">Applicant:</span>
              <span className="font-semibold text-stone-800">{submissionResult?.application?.applicant_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-stone-200">
              <span className="text-stone-500">Pledged Net Gold:</span>
              <span className="font-mono text-stone-800">
                {submissionResult?.application?.net_weight}g ({submissionResult?.application?.purity_karat}K)
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-stone-200">
              <span className="text-stone-500">Eligible Loan Amount:</span>
              <span className="font-mono font-bold text-emerald-700">
                ₹{submissionResult?.application?.eligible_loan_amount?.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-stone-500">Initial Status:</span>
              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Pending Verification
              </span>
            </div>
          </div>

          {/* Next Steps Timeline */}
          <div className="text-left space-y-3 pt-2">
            <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">Next Steps:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-stone-200 bg-white">
                <span className="font-bold text-[#0e1b2e] block">1. Officer Call</span>
                <span className="text-stone-500 text-[11px]">Appointment scheduling within 24h.</span>
              </div>
              <div className="p-3 rounded-lg border border-stone-200 bg-white">
                <span className="font-bold text-[#0e1b2e] block">2. Branch Assay</span>
                <span className="text-stone-500 text-[11px]">Physical hallmark assay verification.</span>
              </div>
              <div className="p-3 rounded-lg border border-stone-200 bg-white">
                <span className="font-bold text-[#0e1b2e] block">3. Fast Disbursal</span>
                <span className="text-stone-500 text-[11px]">Immediate credit upon vault deposit.</span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-800"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save Receipt</span>
            </button>
            <button
              onClick={() => {
                setCurrentStep(1);
                setSubmissionResult(null);
                setExplicitConfirmation(false);
                setConsentTerms(false);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0e1b2e] hover:bg-[#1a2e4a] text-xs font-semibold text-white shadow-xs"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Start Another Quote</span>
            </button>
          </div>
        </div>
      ) : (
        /* Wizard Steps 1, 2, 3 */
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Progress Indicator */}
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-stone-200 -z-1"></div>
            {[
              { num: 1, label: 'Gold Details' },
              { num: 2, label: 'Applicant Details' },
              { num: 3, label: 'Review & Confirm' },
            ].map((step) => {
              const isPassed = currentStep > step.num;
              const isCurrent = currentStep === step.num;
              return (
                <div key={step.num} className="flex flex-col items-center bg-white px-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                      isPassed
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-[#0e1b2e] text-white ring-4 ring-amber-100'
                        : 'bg-stone-200 text-stone-500'
                    }`}
                  >
                    {isPassed ? <CheckCircle2 className="w-5 h-5" /> : step.num}
                  </div>
                  <span
                    className={`text-xs mt-1.5 font-medium ${
                      isCurrent ? 'font-bold text-[#0e1b2e]' : 'text-stone-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Error & Duplicate Policy Alert */}
          {errorMessage && (
            <div
              className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                isDuplicateConflict
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}
            >
              {isDuplicateConflict ? (
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-bold block">
                  {isDuplicateConflict ? '7-Day Duplicate Application Restriction' : 'Validation Error'}
                </span>
                <p className="leading-relaxed">{errorMessage}</p>
                {isDuplicateConflict && (
                  <button
                    onClick={() => setViewMode('track')}
                    className="text-amber-900 underline font-semibold mt-1 inline-block"
                  >
                    Click here to track your existing application reference →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Gold Details */}
          {currentStep === 1 && (
            <div className="bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="pb-3 border-b border-stone-100">
                <h3 className="text-lg font-bold text-[#0e1b2e]">Step 1: Gold Details & Live Appraisal</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Input ornament weights and choose purity. The backend calculates an authoritative quote.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                    Gross Weight (g)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.01"
                    value={grossWeight || ''}
                    onChange={(e) => setGrossWeight(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 font-mono text-sm focus:ring-2 focus:ring-[#0e1b2e] outline-hidden"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                    Stone / Non-Gold Weight (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={stoneWeight}
                    onChange={(e) => setStoneWeight(parseFloat(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-300 font-mono text-sm focus:ring-2 focus:ring-[#0e1b2e] outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                  Gold Purity
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {([18, 22, 24] as PurityKarat[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setPurityKarat(k)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                        purityKarat === k
                          ? 'bg-[#0e1b2e] border-[#0e1b2e] text-white'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {k} Karat ({k === 24 ? '100%' : k === 22 ? '91.67%' : '75%'})
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                  Select Loan Scheme
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSchemeId('emi_plan')}
                    className={`p-3 rounded-xl text-left border text-xs transition-all ${
                      schemeId === 'emi_plan'
                        ? 'bg-amber-50/80 border-amber-400 font-medium'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex justify-between font-bold text-[#0e1b2e]">
                      <span>EMI Advantage</span>
                      <span className="text-emerald-700 font-mono">75% LTV</span>
                    </div>
                    <span className="text-[11px] text-stone-500">Monthly equated installments</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSchemeId('bullet_plan')}
                    className={`p-3 rounded-xl text-left border text-xs transition-all ${
                      schemeId === 'bullet_plan'
                        ? 'bg-amber-50/80 border-amber-400 font-medium'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex justify-between font-bold text-[#0e1b2e]">
                      <span>Bullet Flexi</span>
                      <span className="text-stone-800 font-mono">70% LTV</span>
                    </div>
                    <span className="text-[11px] text-stone-500">Lumpsum settlement at maturity</span>
                  </button>
                </div>
              </div>

              {liveQuote && (
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-stone-500 block">Eligible Loan Amount (Calculated):</span>
                    <span className="text-xl font-bold font-mono text-emerald-800">
                      {liveQuote.formatted_loan_amount}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-stone-500">
                    Net: {liveQuote.net_weight}g • {(liveQuote.ltv_ratio * 100).toFixed(0)}% LTV
                  </span>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleStep1Next}
                  className="px-6 py-3 rounded-lg bg-[#0e1b2e] hover:bg-[#1a2e4a] text-white text-xs font-semibold flex items-center gap-2 shadow-xs"
                >
                  <span>Continue to Applicant Details</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Applicant Information */}
          {currentStep === 2 && (
            <div className="bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="pb-3 border-b border-stone-100">
                <h3 className="text-lg font-bold text-[#0e1b2e]">Step 2: Applicant Information</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  We only request basic contact details necessary for your loan quotation. No bank or Aadhaar details required.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                  Full Name (as per ID) *
                </label>
                <input
                  type="text"
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full px-4 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-[#0e1b2e] outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                  Indian Mobile Number *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-mono font-bold text-stone-400">+91</span>
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="9876543210"
                    className="w-full pl-12 pr-4 py-2.5 rounded-lg border border-stone-300 font-mono text-sm focus:ring-2 focus:ring-[#0e1b2e] outline-hidden"
                    required
                  />
                </div>
                <span className="text-[11px] text-stone-400 mt-1 block">
                  10-digit number. Used for application tracking and OTP contact verification.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rajesh.kumar@example.com"
                  className="w-full px-4 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-[#0e1b2e] outline-hidden"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentTerms}
                    onChange={(e) => setConsentTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-stone-300 text-[#0e1b2e] focus:ring-[#0e1b2e]"
                  />
                  <span className="text-xs text-stone-600 leading-relaxed">
                    I declare that the gold ornaments offered for pledge are my self-acquired personal property, free from any lien or dispute. I consent to T Global contacting me regarding this loan application under T Global's privacy guidelines.
                  </span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="button"
                  onClick={handleStep2Next}
                  className="px-6 py-2.5 rounded-lg bg-[#0e1b2e] hover:bg-[#1a2e4a] text-white text-xs font-semibold flex items-center gap-2 shadow-xs"
                >
                  <span>Review Application Quote</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Explicit Confirmation */}
          {currentStep === 3 && (
            <div className="bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="pb-3 border-b border-stone-100">
                <h3 className="text-lg font-bold text-[#0e1b2e]">Step 3: Review and Final Confirmation</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Verify your quote and applicant details. Explicit customer confirmation is mandatory before submission.
                </p>
              </div>

              {/* Quote Overview Box */}
              <div className="p-5 rounded-xl bg-gradient-to-br from-[#0e1b2e] to-[#162c4a] text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[11px] text-amber-300 uppercase tracking-wider block">
                      Approved Authoritative Loan Amount
                    </span>
                    <span className="text-3xl font-extrabold font-mono mt-1 block">
                      {liveQuote?.formatted_loan_amount}
                    </span>
                  </div>
                  <span className="text-xs font-mono bg-white/10 px-2.5 py-1 rounded text-white border border-white/20">
                    {liveQuote?.scheme_name}
                  </span>
                </div>
              </div>

              {/* Data Summary Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Applicant:</span>
                    <span className="font-semibold text-stone-800">{applicantName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Mobile Contact:</span>
                    <span className="font-mono text-stone-800">{mobileNumber}</span>
                  </div>
                  {email && (
                    <div className="flex justify-between">
                      <span className="text-stone-500">Email:</span>
                      <span className="text-stone-800">{email}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Net Weight:</span>
                    <span className="font-mono font-bold text-stone-800">{liveQuote?.net_weight} g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Purity:</span>
                    <span className="font-mono text-stone-800">{liveQuote?.purity_karat} Karat</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Gold Value:</span>
                    <span className="font-mono text-amber-900 font-semibold">{liveQuote?.formatted_gold_value}</span>
                  </div>
                </div>
              </div>

              {/* Explicit Confirmation Checkbox (Safety Checkpoint) */}
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-300">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={explicitConfirmation}
                    onChange={(e) => setExplicitConfirmation(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-amber-400 text-[#0e1b2e] focus:ring-[#0e1b2e]"
                  />
                  <span className="text-xs font-semibold text-amber-950 leading-relaxed">
                    I explicitly confirm that I have reviewed the gold details, scheme selection ({liveQuote?.scheme_name}), and eligible loan quote of {liveQuote?.formatted_loan_amount}. I authorize T Global to create my formal loan application.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-between border-t border-stone-100">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Edit Information</span>
                </button>

                <button
                  type="button"
                  disabled={submitting || !explicitConfirmation}
                  onClick={handleSubmitApplication}
                  className={`px-6 py-2.5 rounded-lg text-xs font-bold text-white flex items-center gap-2 shadow-xs transition-all ${
                    submitting || !explicitConfirmation
                      ? 'bg-stone-400 cursor-not-allowed'
                      : 'bg-[#0e1b2e] hover:bg-[#1a2e4a]'
                  }`}
                >
                  {submitting ? (
                    <span>Submitting Authoritative Application...</span>
                  ) : (
                    <>
                      <span>Submit Application Now</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
