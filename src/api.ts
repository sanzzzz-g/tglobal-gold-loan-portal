import type { CalculationBreakdown, LoanScheme, ApplicationRecord, AdminUser, AdminStats, PurityKarat, SchemeId, ApplicationStatus } from './types';

export async function fetchSchemes(): Promise<{ demonstration_gold_rate: number; schemes: LoanScheme[] }> {
  const res = await fetch('/api/schemes');
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch schemes');
  return data;
}

export async function fetchQuote(params: {
  gross_weight: number;
  stone_weight?: number;
  purity_karat: PurityKarat;
  scheme_id: SchemeId;
}): Promise<CalculationBreakdown> {
  const res = await fetch('/api/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to calculate quote');
  return data.quote;
}

export async function submitApplication(payload: {
  applicant_name: string;
  mobile_number: string;
  email?: string;
  gross_weight: number;
  stone_weight?: number;
  purity_karat: PurityKarat;
  scheme_id: SchemeId;
  consent: boolean;
}): Promise<{
  success: boolean;
  message: string;
  application: {
    application_reference: string;
    applicant_name: string;
    scheme_id: string;
    net_weight: number;
    purity_karat: number;
    eligible_loan_amount: number;
    status: ApplicationStatus;
    created_at: string;
  };
  quote_breakdown: CalculationBreakdown;
}> {
  const res = await fetch('/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    const error: any = new Error(data.error || 'Submission failed');
    error.status = res.status;
    error.code = data.code;
    throw error;
  }
  return data;
}

export async function trackApplication(reference: string): Promise<ApplicationRecord> {
  const res = await fetch(`/api/applications/${encodeURIComponent(reference)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Application reference not found');
  return data.application;
}

export async function sendAIChat(prompt: string, messages: Array<{ role: 'user' | 'model'; content: string }>): Promise<{
  reply: string;
  toolInvocations?: Array<{ toolName: string; args: any; result: any }>;
  suggestedAction?: { type: string; data?: any };
}> {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, messages }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'AI Assistant unavailable');
  return data;
}

export async function adminLogin(email: string, password: string): Promise<{ token: string; user: AdminUser }> {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

export async function adminGetMe(token: string): Promise<AdminUser> {
  const res = await fetch('/api/admin/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Session expired');
  return data.user;
}

export async function adminListApplications(
  token: string,
  params: {
    page?: number;
    limit?: number;
    status?: string;
    scheme_id?: string;
    search?: string;
    sort_by?: string;
    sort_order?: string;
  }
): Promise<{
  applications: ApplicationRecord[];
  total: number;
  page: number;
  total_pages: number;
  stats: AdminStats;
}> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.scheme_id && params.scheme_id !== 'all') query.set('scheme_id', params.scheme_id);
  if (params.search) query.set('search', params.search);
  if (params.sort_by) query.set('sort_by', params.sort_by);
  if (params.sort_order) query.set('sort_order', params.sort_order);

  const res = await fetch(`/api/admin/applications?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load applications');
  return data;
}

export async function adminGetApplication(token: string, id: number): Promise<ApplicationRecord> {
  const res = await fetch(`/api/admin/applications/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Application not found');
  return data.application;
}

export async function adminUpdateStatus(
  token: string,
  id: number,
  status: ApplicationStatus,
  remarks?: string
): Promise<ApplicationRecord> {
  const res = await fetch(`/api/admin/applications/${id}/status`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status, remarks }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Status update failed');
  return data.application;
}

export async function adminChangePassword(
  token: string,
  payload: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }
): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/admin/change-password', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update admin password');
  return data;
}

