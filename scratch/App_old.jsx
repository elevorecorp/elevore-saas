import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { sb } from './supabase';

// Import our modular subcomponents
import Icon from './components/shared/Icon';
import AIAdvisor, { getStaffStats } from './components/shared/AIAdvisor';
import LandingPage from './components/auth/LandingPage';
import OnboardingFlow from './components/auth/OnboardingFlow';
import LoginFlow from './components/auth/LoginFlow';
import AIEstimator from './components/auth/AIEstimator';
import BriefView from './components/admin/BriefView';
import IntelView from './components/admin/IntelView';
import OperationsView from './components/admin/OperationsView';
import CrmView from './components/admin/CrmView';
import SettingsView from './components/admin/SettingsView';
import StaffView from './components/staff/StaffView';

import { PublicQuoteProposal } from './components/PublicQuoteProposal';
import LiveTracker from './components/shared/LiveTracker';

const DEFAULT_CFG = {
  STAFF_PAY: 0.40,
  GOAL: 15000,
  GOOGLE: 'https://g.page/r/review',
  ADMIN: '2026',
  STAFF: 'staff',
  ZELLE: '(407) 952-4228',
  BIZ: 'Elevore Premium Services'
};

const MBS = [
  { id: 'none', name: 'None', price: 0, color: '#6b7280' },
  { id: 'basic', name: 'Basic', price: 199, color: '#6b7280', perks: ['2 Cleans/mo', '5% off', 'Priority'] },
  { id: 'premium', name: 'Premium', price: 349, color: '#3b82f6', perks: ['4 Cleans/mo', '10% off', 'Free oven'] },
  { id: 'vip', name: 'VIP', price: 549, color: '#fbbf24', perks: ['6 Cleans/mo', '15% off', 'All add-ons', 'Dedicated team'] }
];

const INIT = { name: '', phone: '', email: '', address: '', svc: 'regular', beds: 2, baths: 2, living: 1, laundryRoom: 0, complexity: 1, sqft: 2000, oven: false, fridge: false, windows: false, pethair: false, garage: false, laundryLoads: 0, expenses: 0, deposit: 0, discount: 0, frequency: 'one-time', team: '', date: '', status: 'lead', totalPrice: 0, laborHours: 2, materialCost: 0, riskMargin: 50, selectedQuickJobs: [], audit_link: '', notes: '', urgencyHours: 24, membership: 'none', lang: 'en', leadSource: 'organic', adSpend: 0, marketingCost: 0 };
const fmt$ = n => '$' + Math.round(n || 0).toLocaleString();
const dAgo = d => d ? Math.round((Date.now() - new Date(d).getTime()) / 86400000) : 999;

export default function App() {
  const urlP = new URLSearchParams(window.location.search);
  const cjid = urlP.get('mision');
  const refCode = urlP.get('ref');
  const quoteId = urlP.get('propuesta') || urlP.get('quote') || urlP.get('cotizacion');

  if (quoteId) return <PublicQuoteProposal quoteId={quoteId} />;
  if (cjid) return <LiveTracker jobId={cjid} />;

  const [view, setView] = useState(urlP.get('view') || 'landing');
  const [role, setRole] = useState('admin');
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [staff, setStaff] = useState([
    { id: '1', name: 'Jose Mario', role: 'admin', passcode: '2026', wallet_balance: 0, total_earned: 0 },
    { id: '2', name: 'Team Alpha', role: 'staff', passcode: '1122', wallet_balance: 240, total_earned: 1450 },
    { id: '3', name: 'Team Beta', role: 'staff', passcode: '3344', wallet_balance: 180, total_earned: 920 }
  ]);
  const [activeEmployee, setActiveEmp] = useState(null);
  
  const [tenantId, setTenantId] = useState(null);
  const [tenantName, setTenantName] = useState('ELEVORE EMPIRE');
  const [user, setUser] = useState(null);
  const [tenantSettings, setTenantSettings] = useState(null);
  const [tenant, setTenant] = useState(null);

  const [selectedBillingPlan, setSelectedBillingPlan] = useState('premium');
  const [billingCardName, setBillingCardName] = useState('');
  const [billingCardNo, setBillingCardNo] = useState('');
  const [billingCardExpiry, setBillingCardExpiry] = useState('');
  const [billingCardCvc, setBillingCardCvc] = useState('');
  const [billingError, setBillingError] = useState('');
  const [billingLoading, setBillingLoading] = useState(false);

  const [campaignSending, setCampaignSending] = useState(false);
  const [campaignProgress, setCampaignProgress] = useState(0);
  const [campaignTotal, setCampaignTotal] = useState(0);

  const [activeMapAddress, setMapAddress] = useState('');
  const [aiOpen, setAIOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [aStaff, setAStaff] = useState(null);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  const [biSimClients, setBiSimClients] = useState(60);
  const [biSimPayoutPct, setBiSimPayoutPct] = useState(40);
  const [biSimMarketing, setBiSimMarketing] = useState(1500);

  const [settingsBusName, setSettingsBusName] = useState('');
  const [settingsPhone, setSettingsPhone] = useState('');
  const [settingsGoal, setSettingsGoal] = useState('15000');
  const [settingsPayPct, setSettingsPayPct] = useState('40');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tt = (m, c = 'green') => { setToast({ m, c }); setTimeout(() => setToast(null), 3500); };

  const getPayoutPct = (worker) => {
    if (worker && worker.payout_pct !== undefined && worker.payout_pct !== null) {
      return Number(worker.payout_pct) / 100;
    }
    return tenantSettings?.staff_pay_pct !== undefined ? Number(tenantSettings.staff_pay_pct) : DEFAULT_CFG.STAFF_PAY;
  };

  const refresh = useCallback(async () => {
    if (!tenantId) return;
    const [{ data: j }, { data: c }, { data: s }, { data: ts }, { data: t }] = await Promise.all([
      sb.from('elevore_missions').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
      sb.from('clients').select('*').eq('tenant_id', tenantId),
      sb.from('staff_profiles').select('*').eq('tenant_id', tenantId),
      sb.from('tenant_settings').select('*').eq('tenant_id', tenantId).maybeSingle(),
      sb.from('tenants').select('*').eq('id', tenantId).maybeSingle()
    ]);

    if (j) setJobs(j);
    if (c) setClients(c);
    if (s && s.length > 0) {
      setStaff(s);
      if (activeEmployee) {
        const updated = s.find(x => x.id === activeEmployee.id);
        if (updated) setActiveEmp(updated);
      }
    }
    if (ts) setTenantSettings(ts);
    if (t) setTenant(t);
  }, [tenantId, activeEmployee]);

  useEffect(() => {
    if (tenantId) refresh();
  }, [tenantId]);

  useEffect(() => {
    if (tenantSettings) {
      setSettingsBusName(tenantSettings.business_full_name || '');
      setSettingsPhone(tenantSettings.zelle_phone || '');
      setSettingsGoal(String(tenantSettings.monthly_goal || 15000));
      setSettingsPayPct(tenantSettings.staff_pay_pct !== undefined ? String(Math.round(Number(tenantSettings.staff_pay_pct) * 100)) : '40');
    }
  }, [tenantSettings]);

  const handleLoginSuccess = (assignedRole, assignedTenantId, authUser, activeEmp, tName) => {
    setRole(assignedRole);
    setTenantId(assignedTenantId);
    setUser(authUser);
    setActiveEmp(activeEmp);
    setTenantName(tName);
    setView(assignedRole === 'admin' ? 'brief' : 'staff');
  };

  const handleCashout = async (worker) => {
    tt(`Cashout requested for ${worker.name}. Processing Zelle payout...`, 'yellow');
    try {
      const { error } = await sb.from('staff_profiles').update({ wallet_balance: 0 }).eq('id', worker.id);
      if (error) throw error;
      tt(`Payout sent! Zelle: ${DEFAULT_CFG.ZELLE}`, 'green');
      refresh();
    } catch (e) {
      tt(e.message, 'red');
    }
  };

  const saveSettings = async (e) => {
    if (e) e.preventDefault();
    if (!tenantId) return;
    try {
      const payload = {
        business_full_name: settingsBusName,
        zelle_phone: settingsPhone,
        monthly_goal: Number(settingsGoal) || 0,
        staff_pay_pct: (Number(settingsPayPct) || 40) / 100
      };
      const { error } = await sb.from('tenant_settings').update(payload).eq('tenant_id', tenantId);
      if (error) throw error;
      setTenantSettings(prev => ({ ...prev, ...payload }));
      setTenantName(settingsBusName);
      tt('Settings saved ✓', 'green');
    } catch (err) {
      tt('Error: ' + err.message, 'red');
    }
  };

  const handleActivateSubscription = async () => {
    setBillingError('');
    setBillingLoading(true);
    try {
      const mockCustomerId = 'cus_sim_' + Math.random().toString(36).substring(7);
      const planStatus = 'active_' + selectedBillingPlan;
      const { error } = await sb.from('tenants').update({
        stripe_subscription_status: planStatus,
        stripe_customer_id: mockCustomerId
      }).eq('id', tenantId);
      
      if (error) throw error;
      setTenant(prev => ({ ...prev, stripe_subscription_status: planStatus, stripe_customer_id: mockCustomerId }));
      tt(`Plan ${selectedBillingPlan.toUpperCase()} activated successfully!`, 'green');
    } catch (e) {
      setBillingError(e.message);
    } finally {
      setBillingLoading(false);
    }
  };

  const reactivateClientWithAI = async (client) => {
    const message = `¡Hola ${client.name}! 😊 Te extrañamos en Elevore. Queríamos ofrecerte un descuento exclusivo de 15% en tu próximo servicio si agendas esta semana. ¿Te reservamos un espacio? 💫`;
    const ph = (client.phone || '').replace(/\D/g, '');
    const ph2 = ph.length === 10 ? '1' + ph : ph;
    window.open(`https://wa.me/${ph2}?text=${encodeURIComponent(message)}`, '_blank');
    tt(`Mensaje de reactivación generado ✓`, 'green');
  };

  const deploySmartCampaign = () => {
    tt('AI Campaign initialized!', 'green');
  };

  const autoDispatchMission = () => {
    setIsDispatching(true);
    setTimeout(() => {
      setIsDispatching(false);
      tt('AI Dispatch optimization complete! Routes deployed.', 'green');
    }, 1500);
  };

  // Trigger tenant-specific n8n webhook triggers
  const triggerTenantWebhook = async (eventType, jobData) => {
    const webhookUrl = {
      completed: tenantSettings?.webhook_completed,
      quote_approved: tenantSettings?.webhook_quote_approved,
      en_route: tenantSettings?.webhook_en_route
    }[eventType];

    if (!webhookUrl) {
      console.log(`Webhook URL not configured for event: ${eventType}. Skipping trigger.`);
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: eventType, record: jobData })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      console.log(`Webhook triggered successfully for event ${eventType}`);
    } catch (e) {
      console.error(`Failed to trigger webhook for event ${eventType}:`, e);
    }
  };

  const finance = useMemo(() => {
    const gross = jobs.reduce((a, b) => a + (b.total_price || 0), 0);
    const col = jobs.reduce((a, b) => a + (b.deposit_paid || 0), 0);
    const exp = jobs.reduce((acc, job) => acc + Number(job.specs?.expenses || 0) + Number(job.specs?.materialCost || 0), 0);
    const netPayAllocated = jobs.filter(j => j.status === 'paid').reduce((acc, job) => {
      const w = staff.find(s => s.name === job.team_assigned);
      return acc + Math.round((job.deposit_paid || 0) * getPayoutPct(w));
    }, 0);
    const net = Math.max(0, Math.round(col - netPayAllocated - exp));
    const pending = gross - col;
    const pct = Math.min(100, (gross / (tenantSettings?.monthly_goal || DEFAULT_CFG.GOAL)) * 100);
    const avg = jobs.length ? Math.round(gross / jobs.length) : 0;
    const mrr = clients.reduce((a, c) => { const m = MBS.find(x => x.id === c.membership); return a + (m?.price || 0); }, 0);
    const avgLTV = clients.length ? Math.round(gross / clients.length) : 0;
    const churn = clients.filter(c => {
      const cj = jobs.filter(j => j.client_name === c.name && j.status === 'paid');
      if (!cj.length) return false;
      const last = cj.sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))[0];
      return dAgo(last.scheduled_date) >= 45;
    });
    const churnRate = clients.length ? Math.round((churn.length / clients.length) * 100) : 0;
    const pendSig = jobs.filter(j => !j.approval_signature && j.status === 'lead');
    const moneyTable = pendSig.reduce((a, b) => a + (b.total_price || 0), 0);
    const expiring = jobs.filter(j => j.status === 'lead' && j.urgency_expires && new Date(j.urgency_expires) - Date.now() <= 6 * 3600000);
    const qcQ = jobs.filter(j => j.status === 'completed' && !j.specs?.quality_passed);
    const reviewQ = jobs.filter(j => j.status === 'paid' && !j.specs?.review_requested_at);
    
    return { 
      gross, col, net, pending, pct, avg, mrr, avgLTV, churn, churnRate, 
      pendSig, moneyTable, expiring, qcQ, reviewQ, todayJobs: jobs.filter(j => j.scheduled_date === todayStr)
    };
  }, [jobs, clients, staff, tenantSettings, todayStr]);

  const staffJobs = useMemo(() => {
    if (!activeEmployee) return [];
    return jobs.filter(j => j.team_assigned && j.team_assigned.toLowerCase().includes(activeEmployee.name.toLowerCase()));
  }, [jobs, activeEmployee]);

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[9999] px-6 py-4 rounded-2xl font-black uppercase text-xs shadow-2xl flex items-center gap-2 animate-bounce border ${
          toast.c === 'red' ? 'bg-red-950 border-red-500 text-red-400' :
          toast.c === 'yellow' ? 'bg-amber-950 border-amber-500 text-amber-400' :
          'bg-green-950 border-green-500 text-green-400'
        }`}>
          <Icon name={toast.c === 'red' ? 'alert-triangle' : toast.c === 'yellow' ? 'clock' : 'check'} className="w-4 h-4" />
          <span>{toast.m}</span>
        </div>
      )}

      {/* Main Layout Routing */}
      {view === 'landing' && (
        <LandingPage 
          onLogin={() => setView('auth')} 
          onSignup={() => setView('signup')} 
          onOpenAIEstimator={() => setView('ai-estimator')} 
        />
      )}
      {view === 'ai-estimator' && (
        <AIEstimator 
          onBack={() => setView('landing')} 
          onEstimateGenerated={(estimate) => {
            tt(`Estimación de $${estimate.estimatedPrice} USD guardada. Iniciando registro.`, 'green');
            setView('signup');
          }} 
        />
      )}
      {view === 'signup' && (
        <OnboardingFlow onBack={() => setView('landing')} tt={tt} />
      )}
      {view === 'auth' && (
        <LoginFlow onBack={() => setView('landing')} onLoginSuccess={handleLoginSuccess} tt={tt} />
      )}

      {/* Authenticated Workspace */}
      {user && (
        <div className="flex min-h-screen">
          {/* Sidebar Navigation */}
          <aside className="w-64 bg-zinc-950 border-r border-white/5 flex flex-col justify-between p-6">
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#F5C518] rounded-xl flex items-center justify-center font-black text-black text-lg italic">E</div>
                <span className="font-black text-lg tracking-tight uppercase">{tenantName}</span>
              </div>

              <nav className="space-y-2">
                {role === 'admin' && (
                  <>
                    {[
                      { id: 'brief', name: '📊 Dashboard', icon: 'layout-dashboard' },
                      { id: 'intel', name: '💰 Finances', icon: 'credit-card' },
                      { id: 'operations', name: '📅 Operations', icon: 'calendar' },
                      { id: 'crm', name: '👥 CRM DNA', icon: 'users' },
                      { id: 'settings', name: '⚙️ Settings', icon: 'settings' }
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() => setView(item.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-95 ${
                          view === item.id ? 'bg-[#F5C518] text-black shadow-lg shadow-[#F5C518]/15' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <Icon name={item.icon} className="w-4 h-4" />
                        <span>{item.name}</span>
                      </button>
                    ))}
                  </>
                )}

                {role === 'staff' && (
                  <button
                    onClick={() => setView('staff')}
                    className="w-full flex items-center gap-3 px-4 py-3.5 bg-[#F5C518] text-black rounded-xl text-xs font-black uppercase tracking-wider"
                  >
                    <Icon name="navigation" className="w-4 h-4" />
                    <span>My Missions</span>
                  </button>
                )}
              </nav>
            </div>

            <button 
              onClick={() => {
                sb.auth.signOut();
                setUser(null);
                setTenantId(null);
                setActiveEmp(null);
                setView('landing');
              }}
              className="w-full py-3.5 bg-white/5 border border-white/5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
            >
              Sign Out
            </button>
          </aside>

          {/* Main Dashboard Space */}
          <main className="flex-1 bg-[#030303] p-8 overflow-y-auto">
            {role === 'admin' && view === 'brief' && (
              <BriefView 
                activeEmployee={activeEmployee}
                activeMapAddress={activeMapAddress}
                isPrivate={isPrivate}
                finance={finance}
                jobs={jobs}
                clients={clients}
                todayStr={todayStr}
                setMapAddress={setMapAddress}
                setFSt={setView}
                setView={setView}
                deploySmartCampaign={deploySmartCampaign}
                autoDispatchMission={autoDispatchMission}
                isDispatching={isDispatching}
              />
            )}

            {role === 'admin' && view === 'intel' && (
              <IntelView 
                isPrivate={isPrivate}
                finance={finance}
                jobs={jobs}
                clients={clients}
                staff={staff}
                reactivateClientWithAI={reactivateClientWithAI}
                referralStats={{ totalReferred: 0, pendingReferrals: 0, paidReferrals: 0, conversions: 0 }}
                biSimClients={biSimClients}
                setBiSimClients={setBiSimClients}
                biSimPayoutPct={biSimPayoutPct}
                setBiSimPayoutPct={setBiSimPayoutPct}
                biSimMarketing={biSimMarketing}
                setBiSimMarketing={setBiSimMarketing}
              />
            )}

            {role === 'admin' && view === 'operations' && (
              <OperationsView 
                jobs={jobs}
                clients={clients}
                staff={staff}
                refresh={refresh}
                tt={tt}
                triggerN8nEmail={async (job) => triggerTenantWebhook('completed', job)}
              />
            )}

            {role === 'admin' && view === 'crm' && (
              <CrmView 
                clients={clients}
                jobs={jobs}
                calcDNA={(cj) => cj.length * 10}
                reactivateClientWithAI={reactivateClientWithAI}
                deployCampaign={deploySmartCampaign}
                campaignSending={campaignSending}
                campaignProgress={campaignProgress}
                campaignTotal={campaignTotal}
              />
            )}

            {role === 'admin' && view === 'settings' && (
              <SettingsView 
                tenantId={tenantId}
                tenant={tenant}
                settingsBusName={settingsBusName}
                settingsPhone={settingsPhone}
                settingsGoal={settingsGoal}
                settingsPayPct={settingsPayPct}
                setSettingsBusName={setSettingsBusName}
                setSettingsPhone={setSettingsPhone}
                setSettingsGoal={setSettingsGoal}
                setSettingsPayPct={setSettingsPayPct}
                saveSettings={saveSettings}
                selectedBillingPlan={selectedBillingPlan}
                setSelectedBillingPlan={setSelectedBillingPlan}
                billingCardName={billingCardName}
                setBillingCardName={setBillingCardName}
                billingCardNo={billingCardNo}
                setBillingCardNo={setBillingCardNo}
                billingCardExpiry={billingCardExpiry}
                setBillingCardExpiry={setBillingCardExpiry}
                billingCardCvc={billingCardCvc}
                setBillingCardCvc={setBillingCardCvc}
                billingError={billingError}
                setBillingError={setBillingError}
                billingLoading={billingLoading}
                handleActivateSubscription={handleActivateSubscription}
                tt={tt}
              />
            )}

            {role === 'staff' && view === 'staff' && (
              <StaffView 
                activeEmployee={activeEmployee}
                staffJobs={staffJobs}
                todayStr={todayStr}
                jobs={jobs}
                setAIOpen={setAIOpen}
                setRouteModalOpen={setRouteModalOpen}
                handleCashout={handleCashout}
                setAStaff={setAStaff}
              />
            )}
          </main>
        </div>
      )}

      {/* Floating AI Command Advisor */}
      {aiOpen && (
        <AIAdvisor 
          jobs={jobs} 
          clients={clients} 
          staff={staff} 
          isStaff={role === 'staff'} 
          activeUser={activeEmployee?.name || 'User'} 
          onClose={() => setAIOpen(false)} 
          tt={tt}
          onOpenReport={role === 'admin' ? () => setAIOpen(false) : null}
        />
      )}
    </div>
  );
}
