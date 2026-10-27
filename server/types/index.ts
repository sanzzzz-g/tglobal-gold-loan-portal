export type SchemeId = 'emi_plan' | 'bullet_plan';
export type PurityKarat = 18 | 22 | 24;
export type ApplicationStatus = 'Pending' | 'Under Review' | 'Approved' | 'Rejected';

export interface LoanScheme {
  id: SchemeId;
  name: string;
  repayment_type: 'EMI' | 'Bullet';
  interest_rate: number;
  ltv_ratio: number;
  description: string;
  min_tenure_months: number;
  max_tenure_months: number;
  key_terms: string[];
  active: number;
  created_at: string;
  updated_at: string;
}

export interface QuoteRequest {
  gross_weight: number;
  stone_weight?: number;
  purity_karat: PurityKarat;
  scheme_id: SchemeId;
}

export interface CalculationBreakdown {
  gross_weight: number;
  stone_weight: number;
  net_weight: number;
  purity_karat: PurityKarat;
  purity_factor: number;
  gold_rate_per_gram: number;
  purity_adjusted_gold_value: number;
  scheme_id: SchemeId;
  scheme_name: string;
  ltv_ratio: number;
  eligible_loan_amount_raw: number;
  eligible_loan_amount: number;
  formatted_gold_value: string;
  formatted_loan_amount: string;
  explanation: {
    formula_net_weight: string;
    formula_gold_value: string;
    formula_loan_amount: string;
    notes: string[];
  };
}

export interface ApplicationRecord {
  id: number;
  application_reference: string;
  applicant_name: string;
  mobile_number: string;
  email?: string | null;
  scheme_id: SchemeId;
  gross_weight: number;
  stone_weight: number;
  net_weight: number;
  purity_karat: PurityKarat;
  gold_rate: number;
  calculated_gold_value: number;
  eligible_loan_amount: number;
  status: ApplicationStatus;
  consent_timestamp: string;
  created_at: string;
  updated_at: string;
  scheme_name?: string;
  ltv_ratio?: number;
}

export interface ApplicationSubmissionInput {
  applicant_name: string;
  mobile_number: string;
  email?: string;
  scheme_id: SchemeId;
  gross_weight: number;
  stone_weight?: number;
  purity_karat: PurityKarat;
  consent: boolean;
}

export interface AdminUser {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  created_at: string;
}
