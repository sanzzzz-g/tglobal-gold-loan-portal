import React, { useState, useEffect } from 'react';
import {
  Lock,
  LogOut,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Coins,
  ShieldAlert,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Sparkles,
  KeyRound,
  Check,
} from 'lucide-react';
import {
  adminLogin,
  adminGetMe,
  adminListApplications,
  adminGetApplication,
  adminUpdateStatus,
  adminChangePassword,
} from '../api';
import type { ApplicationRecord, AdminUser, AdminStats, ApplicationStatus } from '../types';

interface AdminPageProps {
  adminToken: string | null;
  setAdminToken: (token: string | null) => void;
  adminUser: AdminUser | null;
  setAdminUser: (user: AdminUser | null) => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  adminToken,
  setAdminToken,
  adminUser,
  setAdminUser,
}) => {
  // Login form state
  const [email, setEmail] = useState<string>('admin@tglobal.com');
  const [password, setPassword] = useState<string>('');
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Active section tab
  const [activeTab, setActiveTab] = useState<'applications' | 'password'>('applications');

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPw, setShowCurrentPw] = useState<boolean>(false);
  const [showNewPw, setShowNewPw] = useState<boolean>(false);
  const [showConfirmPw, setShowConfirmPw] = useState<boolean>(false);
  const [passwordChanging, setPasswordChanging] = useState<boolean>(false);
  const [changePwSuccess, setChangePwSuccess] = useState<string | null>(null);
  const [changePwError, setChangePwError] = useState<string | null>(null);

  // Dashboard state
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    total: 0,
    pending: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
    total_requested_amount: 0,
  });
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [schemeFilter, setSchemeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'eligible_loan_amount' | 'applicant_name'>('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Detail Modal state
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [detailApplication, setDetailApplication] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);
  const [newStatus, setNewStatus] = useState<ApplicationStatus>('Under Review');
  const [statusRemarks, setStatusRemarks] = useState<string>('');
  const [statusUpdateMessage, setStatusUpdateMessage] = useState<string | null>(null);

  // Load session or applications
  useEffect(() => {
    if (adminToken) {
      if (!adminUser) {
        adminGetMe(adminToken)
          .then((u) => setAdminUser(u))
          .catch(() => {
            setAdminToken(null);
            setAdminUser(null);
          });
      }
      loadApplications();
    }
  }, [adminToken, page, statusFilter, schemeFilter, sortBy, sortOrder]);

  const loadApplications = () => {
    if (!adminToken) return;
    setLoadingList(true);
    setDashboardError(null);

    adminListApplications(adminToken, {
      page,
      limit: 10,
      search,
      status: statusFilter,
      scheme_id: schemeFilter,
      sort_by: sortBy,
      sort_order: sortOrder,
    })
      .then((res) => {
        setApplications(res.applications);
        setTotalPages(res.total_pages);
        if (res.stats) setStats(res.stats);
        setLoadingList(false);
      })
      .catch((err) => {
        setDashboardError(err.message || 'Failed to retrieve applications');
        setLoadingList(false);
      });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await adminLogin(email, password);
      setAdminToken(res.token);
      setAdminUser(res.user);
      localStorage.setItem('t_global_admin_token', res.token);
    } catch (err: any) {
      setLoginError(err.message || 'Invalid credentials');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setAdminToken(null);
    setAdminUser(null);
    localStorage.removeItem('t_global_admin_token');
  };

  const handleOpenDetail = (id: number) => {
    if (!adminToken) return;
    setSelectedAppId(id);
    setDetailLoading(true);
    setStatusUpdateMessage(null);
    setStatusRemarks('');

    adminGetApplication(adminToken, id)
      .then((app) => {
        setDetailApplication(app);
        setNewStatus(app.status === 'Pending' ? 'Under Review' : app.status);
        setDetailLoading(false);
      })
      .catch((err) => {
        setDashboardError(err.message);
        setDetailLoading(false);
      });
  };

  const handleUpdateStatus = async () => {
    if (!adminToken || !selectedAppId) return;
    setStatusUpdating(true);
    setStatusUpdateMessage(null);

    try {
      const updated = await adminUpdateStatus(adminToken, selectedAppId, newStatus, statusRemarks);
      setDetailApplication(updated);
      setStatusUpdateMessage(`Status updated to '${updated.status}' successfully.`);
      loadApplications();
    } catch (err: any) {
      setStatusUpdateMessage(`Error: ${err.message}`);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;

    setChangePwError(null);
    setChangePwSuccess(null);

    if (newPassword.length < 12) {
      setChangePwError('New password must be at least 12 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePwError('New password and confirm password do not match.');
      return;
    }

    if (newPassword === currentPassword) {
      setChangePwError('New password must be different from current password.');
      return;
    }

    try {
      setPasswordChanging(true);
      const res = await adminChangePassword(adminToken, {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setChangePwSuccess(res.message || 'Password changed successfully! The new password is active immediately.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setChangePwError(err.message || 'Failed to update password. Please check your credentials.');
    } finally {
      setPasswordChanging(false);
    }
  };

  // If not logged in, show Login Screen
  if (!adminToken) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="bg-white rounded-2xl border border-stone-200/90 p-8 shadow-xs space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-[#0e1b2e] text-amber-400 mx-auto flex items-center justify-center border border-amber-500/40 shadow-xs">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-[#0e1b2e] tracking-tight">Loan Officer Sign In</h1>
            <p className="text-xs text-stone-500">
              Administrative portal for evaluating, reviewing, and approving customer gold loan submissions.
            </p>
          </div>

          {/* Quick preset for evaluator */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>Evaluation Seed Credentials:</span>
            </div>
            <div className="font-mono text-[11px] text-amber-900 space-y-0.5">
              <div>Email: <strong>admin@tglobal.com</strong></div>
              <div>Password: <strong>Admin@123_ChangeMeInProd</strong></div>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@tglobal.com');
                setPassword('Admin@123_ChangeMeInProd');
              }}
              className="text-[11px] font-semibold text-amber-800 underline block cursor-pointer hover:text-amber-950"
            >
              Fill Credentials Automatically
            </button>
          </div>

          {loginError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1">
                Admin Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-[#0e1b2e] outline-hidden"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-[#0e1b2e] outline-hidden"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-2.5 rounded-lg bg-[#0e1b2e] hover:bg-[#1a2e4a] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {loginLoading ? 'Authenticating...' : 'Sign In to Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-6">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-amber-50 text-amber-800 text-xs font-semibold uppercase tracking-wider mb-2 border border-amber-200/80">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>LOAN MANAGEMENT SYSTEM</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0e1b2e] tracking-tight">
            Administrative Loan Operations
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Logged in as <span className="font-semibold text-stone-800">{adminUser?.name || 'Loan Officer'}</span> ({adminUser?.email})
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab(activeTab === 'password' ? 'applications' : 'password');
              setChangePwSuccess(null);
              setChangePwError(null);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'password'
                ? 'bg-[#0e1b2e] text-white border-[#0e1b2e]'
                : 'border-stone-300 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{activeTab === 'password' ? 'View Applications' : 'Change Password'}</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Top Nav Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200">
        <button
          type="button"
          onClick={() => {
            setActiveTab('applications');
            setChangePwSuccess(null);
            setChangePwError(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'applications'
              ? 'border-[#0e1b2e] text-[#0e1b2e]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Coins className="w-4 h-4 text-amber-600" />
          <span>Loan Applications</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-stone-100 text-stone-600 font-mono">
            {stats.total}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('password');
            setChangePwSuccess(null);
            setChangePwError(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'password'
              ? 'border-[#0e1b2e] text-[#0e1b2e]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <KeyRound className="w-4 h-4 text-amber-600" />
          <span>Security & Change Password</span>
        </button>
      </div>

      {activeTab === 'applications' && (
        <div className="space-y-8">
          {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">Total Applications</span>
          <span className="text-2xl font-bold font-mono text-[#0e1b2e] mt-1 block">{stats.total}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 bg-blue-50/20 shadow-2xs">
          <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider block">Pending</span>
          <span className="text-2xl font-bold font-mono text-blue-900 mt-1 block">{stats.pending || 0}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-2xs">
          <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider block">Under Review</span>
          <span className="text-2xl font-bold font-mono text-amber-900 mt-1 block">{stats.under_review || 0}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-2xs">
          <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider block">Approved</span>
          <span className="text-2xl font-bold font-mono text-emerald-900 mt-1 block">{stats.approved || 0}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-red-200 bg-red-50/20 shadow-2xs">
          <span className="text-[10px] font-semibold text-red-700 uppercase tracking-wider block">Rejected</span>
          <span className="text-2xl font-bold font-mono text-red-900 mt-1 block">{stats.rejected || 0}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
          <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">Requested Value</span>
          <span className="text-lg font-bold font-mono text-[#0e1b2e] mt-1 block truncate">
            ₹{stats.total_requested_amount ? stats.total_requested_amount.toLocaleString('en-IN') : 0}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          {/* Search */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadApplications()}
              placeholder="Search reference, applicant name, mobile..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-[#0e1b2e] outline-hidden"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-[#0e1b2e] outline-hidden bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Under Review">Under Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Scheme Filter */}
          <div className="sm:col-span-2">
            <select
              value={schemeFilter}
              onChange={(e) => { setSchemeFilter(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-[#0e1b2e] outline-hidden bg-white"
            >
              <option value="all">All Schemes</option>
              <option value="emi_plan">EMI Plan (75%)</option>
              <option value="bullet_plan">Bullet Plan (70%)</option>
            </select>
          </div>

          {/* Refresh / Filter trigger */}
          <div className="sm:col-span-2 flex justify-end">
            <button
              onClick={() => loadApplications()}
              className="w-full sm:w-auto px-4 py-2 bg-[#0e1b2e] hover:bg-[#1a2e4a] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} />
              <span>Filter</span>
            </button>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-700 font-semibold">
                <th className="py-3.5 px-4">Reference</th>
                <th
                  onClick={() => {
                    setSortBy('applicant_name');
                    setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
                  }}
                  className="py-3.5 px-4 cursor-pointer hover:text-black"
                >
                  <div className="flex items-center gap-1">
                    <span>Applicant</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Contact (Masked)</th>
                <th className="py-3.5 px-4">Gold Details</th>
                <th
                  onClick={() => {
                    setSortBy('eligible_loan_amount');
                    setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
                  }}
                  className="py-3.5 px-4 cursor-pointer hover:text-black"
                >
                  <div className="flex items-center gap-1">
                    <span>Loan Amount</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Scheme</th>
                <th className="py-3.5 px-4">Status</th>
                <th
                  onClick={() => {
                    setSortBy('created_at');
                    setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
                  }}
                  className="py-3.5 px-4 cursor-pointer hover:text-black"
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/80 text-stone-600">
              {loadingList ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-stone-500">
                    Loading applications...
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-stone-500">
                    No loan applications matching the selected criteria.
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#0e1b2e]">
                      {app.application_reference}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-stone-900">
                      {app.applicant_name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-stone-500 text-[11px]">
                      {app.mobile_number}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      {app.net_weight}g • {app.purity_karat}K
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-800">
                      ₹{app.eligible_loan_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[11px] font-semibold bg-stone-100 text-stone-800 px-2 py-0.5 rounded">
                        {app.scheme_id === 'emi_plan' ? 'EMI (75%)' : 'Bullet (70%)'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          app.status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : app.status === 'Under Review'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : app.status === 'Rejected'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-stone-500 text-[11px]">
                      {new Date(app.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(app.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-[#0e1b2e] font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-stone-200 bg-stone-50/50 flex items-center justify-between text-xs text-stone-500">
          <div>
            Showing page <span className="font-semibold text-stone-800">{page}</span> of{' '}
            <span className="font-semibold text-stone-800">{totalPages}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded border border-stone-300 bg-white hover:bg-stone-50 disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded border border-stone-300 bg-white hover:bg-stone-50 disabled:opacity-40 cursor-pointer flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )}

      {/* Change Password Section */}
      {activeTab === 'password' && (
        <div className="max-w-2xl mx-auto py-2">
          <div className="bg-white rounded-2xl border border-stone-200/90 p-6 sm:p-8 shadow-xs space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-stone-200/80 pb-5">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[11px] font-semibold tracking-wide border border-amber-200">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                  <span>CREDENTIAL ROTATION</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#0e1b2e] tracking-tight">
                  Change Admin Password
                </h2>
                <p className="text-xs text-stone-500">
                  Securely update the authentication credentials for <strong className="text-stone-800">{adminUser?.email || 'admin@tglobal.com'}</strong>.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-600 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-medium">Bcrypt Encrypted</span>
              </div>
            </div>

            {/* Success Alert */}
            {changePwSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-3 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-950">Password Successfully Changed</p>
                  <p className="text-emerald-800">{changePwSuccess}</p>
                </div>
              </div>
            )}

            {/* Error Alert */}
            {changePwError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-red-950">Password Update Failed</p>
                  <p className="text-red-800">{changePwError}</p>
                </div>
              </div>
            )}

            {/* Password Policy Card */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2 text-xs text-stone-600">
              <span className="font-bold text-stone-800 uppercase tracking-wider text-[10px] block">
                Security Policy Requirements:
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-stone-600">
                <li className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    newPassword.length >= 12 ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'
                  }`}>
                    {newPassword.length >= 12 ? '✓' : '•'}
                  </span>
                  <span>Minimum 12 characters</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    newPassword.length > 0 && newPassword === confirmPassword ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'
                  }`}>
                    {newPassword.length > 0 && newPassword === confirmPassword ? '✓' : '•'}
                  </span>
                  <span>Passwords match</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    newPassword.length > 0 && newPassword !== currentPassword ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-600'
                  }`}>
                    {newPassword.length > 0 && newPassword !== currentPassword ? '✓' : '•'}
                  </span>
                  <span>Different from current</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                  <span>Bcrypt salted (12 rounds)</span>
                </li>
              </ul>
            </div>

            {/* Form */}
            <form onSubmit={handleChangePassword} className="space-y-5">
              {/* Current Password */}
              <div>
                <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block mb-1.5">
                  Current Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-stone-300 text-sm focus:ring-2 focus:ring-[#0e1b2e] outline-hidden font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 cursor-pointer"
                    title={showCurrentPw ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <span className={`text-[11px] font-mono ${
                    newPassword.length >= 12 ? 'text-emerald-700 font-semibold' : 'text-stone-400'
                  }`}>
                    {newPassword.length} / 12 characters min
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (at least 12 characters)"
                    className={`w-full pl-3.5 pr-10 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-[#0e1b2e] outline-hidden font-mono ${
                      newPassword.length > 0 && newPassword.length < 12
                        ? 'border-amber-300 bg-amber-50/20'
                        : newPassword.length >= 12
                        ? 'border-emerald-300 bg-emerald-50/20'
                        : 'border-stone-300'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 cursor-pointer"
                    title={showNewPw ? 'Hide password' : 'Show password'}
                  >
                    {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  {confirmPassword.length > 0 && (
                    <span className={`text-[11px] font-semibold ${
                      newPassword === confirmPassword ? 'text-emerald-700' : 'text-red-600'
                    }`}>
                      {newPassword === confirmPassword ? '✓ Passwords match' : '✕ Passwords do not match'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password to verify"
                    className={`w-full pl-3.5 pr-10 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-[#0e1b2e] outline-hidden font-mono ${
                      confirmPassword.length > 0 && newPassword !== confirmPassword
                        ? 'border-red-300 bg-red-50/20'
                        : confirmPassword.length > 0 && newPassword === confirmPassword
                        ? 'border-emerald-300 bg-emerald-50/20'
                        : 'border-stone-300'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 cursor-pointer"
                    title={showConfirmPw ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('applications');
                    setChangePwError(null);
                    setChangePwSuccess(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer order-2 sm:order-1"
                >
                  ← Return to Applications List
                </button>
                <button
                  type="submit"
                  disabled={passwordChanging || newPassword.length < 12 || newPassword !== confirmPassword || !currentPassword}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#0e1b2e] hover:bg-[#1a2e4a] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 order-1 sm:order-2"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{passwordChanging ? 'Updating Password...' : 'Save & Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Application Detail & Status Update Modal */}
      {selectedAppId && detailApplication && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
                  Application Detail
                </span>
                <span className="text-xl font-bold font-mono text-[#0e1b2e]">
                  {detailApplication.application_reference}
                </span>
              </div>
              <button
                onClick={() => { setSelectedAppId(null); setDetailApplication(null); }}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Applicant & Contact Info (Unmasked for Officer) */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
              <div className="font-bold text-stone-800 uppercase tracking-wider text-[11px] mb-2">
                Applicant & Contact Due Diligence:
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-stone-500">Applicant Legal Name:</span>
                  <p className="font-semibold text-stone-900 text-sm">{detailApplication.applicant_name}</p>
                </div>
                <div>
                  <span className="text-stone-500">Direct Contact Number (Unmasked):</span>
                  <p className="font-mono font-bold text-[#0e1b2e] text-sm">{detailApplication.mobile_number}</p>
                </div>
                <div>
                  <span className="text-stone-500">Email Address:</span>
                  <p className="text-stone-800">{detailApplication.email || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-stone-500">Customer Consent Timestamp:</span>
                  <p className="text-stone-800">{new Date(detailApplication.consent_timestamp).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>

            {/* Gold Breakdown */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2 text-xs">
              <div className="font-bold text-stone-800 uppercase tracking-wider text-[11px] mb-2">
                Physical Valuation Audit:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-stone-500">Gross Weight:</span>
                  <p className="font-mono font-semibold">{detailApplication.gross_weight} g</p>
                </div>
                <div>
                  <span className="text-stone-500">Stone Deduction:</span>
                  <p className="font-mono text-stone-600">{detailApplication.stone_weight} g</p>
                </div>
                <div>
                  <span className="text-stone-500">Net Gold Weight:</span>
                  <p className="font-mono font-bold text-[#0e1b2e]">{detailApplication.net_weight} g</p>
                </div>
                <div>
                  <span className="text-stone-500">Purity:</span>
                  <p className="font-mono">{detailApplication.purity_karat} Karat</p>
                </div>
                <div>
                  <span className="text-stone-500">Valued Gold Worth:</span>
                  <p className="font-mono font-bold text-amber-900">
                    ₹{detailApplication.calculated_gold_value?.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <span className="text-stone-500">Eligible Loan Amount:</span>
                  <p className="font-mono font-extrabold text-emerald-800 text-sm">
                    ₹{detailApplication.eligible_loan_amount?.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Update Controls */}
            <div className="p-4 rounded-xl bg-white border border-stone-300 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-stone-700">
                  Officer Status Transition:
                </span>
                <span className="text-xs">
                  Current: <strong className="font-mono">{detailApplication.status}</strong>
                </span>
              </div>

              {statusUpdateMessage && (
                <div className="p-2.5 rounded text-xs bg-stone-100 border border-stone-200 text-stone-800">
                  {statusUpdateMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Select Next Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ApplicationStatus)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs bg-white focus:ring-2 focus:ring-[#0e1b2e] outline-hidden"
                  >
                    <option value="Under Review">Under Review (Officer in Touch)</option>
                    <option value="Approved">Approved (Assay Verified & Disbursed)</option>
                    <option value="Rejected">Rejected (Ineligible / Discrepancy)</option>
                    <option value="Pending">Pending (Re-queue)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Officer Audit Remarks</label>
                  <input
                    type="text"
                    value={statusRemarks}
                    onChange={(e) => setStatusRemarks(e.target.value)}
                    placeholder="e.g. Ornaments verified at branch; hallmarking confirmed."
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:ring-2 focus:ring-[#0e1b2e] outline-hidden"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setSelectedAppId(null); setDetailApplication(null); }}
                  className="px-4 py-2 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={statusUpdating}
                  onClick={handleUpdateStatus}
                  className="px-5 py-2 rounded-lg bg-[#0e1b2e] hover:bg-[#1a2e4a] text-white text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {statusUpdating ? 'Updating Status...' : 'Apply Status Update'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
