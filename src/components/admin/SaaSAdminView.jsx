import React, { useState, useEffect, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { sb } from '../../supabase';

const Icon = ({ name, className, style, ...props }) => {
  if (!name) return null;
  const pascalName = name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  const LucideIcon = Icons[pascalName] || Icons.HelpCircle;
  return <LucideIcon className={className} style={style} {...props} />;
};

export const SaaSAdminView = ({ user, tt }) => {
  const [tenants, setTenants] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('tenants'); // 'tenants' | 'leads'
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSaaSData = async () => {
    setLoading(true);
    try {
      // Fetch tenants
      const { data: tenantsData, error: tenantsError } = await sb
        .from('tenants')
        .select('*');
      if (tenantsError) throw tenantsError;

      // Fetch settings to join business phone/email
      const { data: settingsData, error: settingsError } = await sb
        .from('tenant_settings')
        .select('tenant_id, zelle_phone, sender_email, owner_phone');
      if (settingsError) throw settingsError;

      // Fetch marketing leads
      const { data: leadsData, error: leadsError } = await sb
        .from('saas_leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (leadsError) throw leadsError;

      // Map settings to tenants
      const settingsMap = {};
      (settingsData || []).forEach(s => {
        settingsMap[s.tenant_id] = s;
      });

      const mergedTenants = (tenantsData || []).map(t => ({
        ...t,
        phone: settingsMap[t.id]?.owner_phone || settingsMap[t.id]?.zelle_phone || 'N/A',
        email: settingsMap[t.id]?.sender_email || 'N/A'
      }));

      setTenants(mergedTenants);
      setLeads(leadsData || []);
    } catch (err) {
      tt("Error fetching SaaS Admin data: " + err.message, "red");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaaSData();
  }, []);

  // Filter lists based on search
  const filteredTenants = tenants.filter(t => {
    const term = searchQuery.toLowerCase();
    return (
      (t.business_name || '').toLowerCase().includes(term) ||
      (t.slug || '').toLowerCase().includes(term) ||
      (t.id || '').toLowerCase().includes(term) ||
      (t.stripe_subscription_status || '').toLowerCase().includes(term)
    );
  });

  const filteredLeads = leads.filter(l => {
    const term = searchQuery.toLowerCase();
    return (
      (l.email || '').toLowerCase().includes(term) ||
      (l.business_name || '').toLowerCase().includes(term) ||
      (l.owner_name || '').toLowerCase().includes(term) ||
      (l.phone || '').toLowerCase().includes(term)
    );
  });

  // Calculate statistics
  const totalTenantsCount = tenants.length;
  const activePaidCount = tenants.filter(t => t.stripe_subscription_status && t.stripe_subscription_status.startsWith('active')).length;
  
  const trialingCount = tenants.filter(t => {
    const isSubscribed = t.stripe_subscription_status && t.stripe_subscription_status.startsWith('active');
    const isFree = t.stripe_subscription_status === 'free';
    if (isSubscribed || isFree) return false;
    const trialEnds = new Date(t.trial_ends_at || 0);
    return new Date() <= trialEnds;
  }).length;

  const churnedLeadsCount = leads.length;

  return (
    <div className="space-y-6 animate-in fade-in pb-24">
      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div>
          <p className="text-xs font-bold text-[#F5C518] uppercase tracking-[0.25em] mb-1">
            Plataforma Elevore SaaS // Control Panel
          </p>
          <h2 className="text-4xl font-black tracking-widest uppercase text-white font-display leading-none">SAAS SUPERADMIN</h2>
        </div>
        <button
          onClick={fetchSaaSData}
          disabled={loading}
          className="px-4 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all flex items-center gap-1.5"
        >
          <Icon name="rotate-cw" className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refrescar Datos
        </button>
      </div>

      {/* ── STATS BAR ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="g p-5 border-l-4 border-blue-500 bg-black/40">
          <p className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Total Compañías SaaS</p>
          <p className="text-2xl font-black text-white italic mt-1">{totalTenantsCount}</p>
        </div>
        <div className="g p-5 border-l-4 border-green-500 bg-black/40">
          <p className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Suscripciones Activas</p>
          <p className="text-2xl font-black text-green-400 italic mt-1">{activePaidCount}</p>
        </div>
        <div className="g p-5 border-l-4 border-yellow-500 bg-black/40">
          <p className="text-[8px] font-black uppercase text-slate-500 tracking-wider">En Periodo de Prueba</p>
          <p className="text-2xl font-black text-yellow-400 italic mt-1">{trialingCount}</p>
        </div>
        <div className="g p-5 border-l-4 border-red-500 bg-black/40">
          <p className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Leads Cancelados (Marketing)</p>
          <p className="text-2xl font-black text-red-400 italic mt-1">{churnedLeadsCount}</p>
        </div>
      </div>

      {/* ── SEARCH & TABS SWITCHER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/25 p-3 rounded-2xl border border-white/5">
        <div className="flex gap-2">
          {[
            { id: 'tenants', name: `👥 Clientes Registrados (${tenants.length})` },
            { id: 'leads', name: `🎯 Leads Cancelados (${leads.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveSubTab(tab.id);
                setSearchQuery('');
              }}
              className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase active:scale-95 transition-all ${
                activeSubTab === tab.id
                  ? 'bg-[#F5C518] text-black shadow-lg shadow-[#F5C518]/15'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Buscar por nombre, email, slug..."
            className="inp w-full pr-10 text-[10px]"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <Icon name="search" className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* ── VIEW CONTENT ── */}
      {loading ? (
        <div className="g p-20 text-center bg-black/40 border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-3">
          <Icon name="loader-2" className="w-8 h-8 animate-spin text-[#F5C518]" />
          <p className="text-xs font-black uppercase text-slate-500 tracking-wider">Cargando base de datos SaaS...</p>
        </div>
      ) : activeSubTab === 'tenants' ? (
        <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto custom-scroll">
            <table className="w-full text-left border-collapse text-[8.5px] font-bold uppercase tracking-wider">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400">
                  <th className="p-4">Compañía</th>
                  <th className="p-4">Tenant ID / Slug</th>
                  <th className="p-4">Dueño ID</th>
                  <th className="p-4">Contacto</th>
                  <th className="p-4">Fecha Registro</th>
                  <th className="p-4">Periodo de Prueba</th>
                  <th className="p-4">Estado Suscripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-left text-white">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-500 italic">No se encontraron clientes registrados</td>
                  </tr>
                ) : (
                  filteredTenants.map(t => {
                    const isSubscribed = t.stripe_subscription_status && t.stripe_subscription_status.startsWith('active');
                    const trialEnds = new Date(t.trial_ends_at || 0);
                    const isTrialExpired = !isSubscribed && t.stripe_subscription_status !== 'free' && new Date() > trialEnds;
                    
                    let statusBadge = (
                      <span className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-2 py-1 rounded-md tracking-wider">
                        TRIAILING
                      </span>
                    );
                    if (isSubscribed) {
                      statusBadge = (
                        <span className="bg-green-500/10 border border-green-500/30 text-green-400 px-2 py-1 rounded-md tracking-wider">
                          PAGO ACTIVO ({t.stripe_subscription_status.replace('active_', '').toUpperCase()})
                        </span>
                      );
                    } else if (isTrialExpired) {
                      statusBadge = (
                        <span className="bg-red-500/10 border border-red-500/30 text-red-400 px-2 py-1 rounded-md tracking-wider">
                          PRUEBA EXPIRADA
                        </span>
                      );
                    } else if (t.stripe_subscription_status === 'free') {
                      statusBadge = (
                        <span className="bg-slate-500/10 border border-slate-500/30 text-slate-400 px-2 py-1 rounded-md tracking-wider">
                          GRATUITO
                        </span>
                      );
                    }

                    return (
                      <tr key={t.id} className="hover:bg-white/[0.01] transition-all">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-[#F5C518]/10 border border-[#F5C518]/20 flex items-center justify-center text-xs font-black text-[#F5C518]">
                              {(t.business_name || 'E')[0].toUpperCase()}
                            </div>
                            <span className="text-white font-extrabold text-[10px]">{t.business_name || 'Sin Nombre'}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-slate-400 text-[8px]">
                          <div>{t.id}</div>
                          <div className="text-amber-500/80 mt-0.5">{t.slug || 'sin-slug'}</div>
                        </td>
                        <td className="p-4 font-mono text-slate-500 text-[8px]">{t.owner_id || 'N/A'}</td>
                        <td className="p-4">
                          <div className="text-slate-300 font-semibold">{t.email}</div>
                          <div className="text-slate-500 mt-0.5 font-mono">{t.phone}</div>
                        </td>
                        <td className="p-4 text-slate-400 font-mono">
                          {t.created_at ? new Date(t.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-4 text-slate-400 font-mono">
                          {t.trial_ends_at ? new Date(t.trial_ends_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-4">{statusBadge}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto custom-scroll">
            <table className="w-full text-left border-collapse text-[8.5px] font-bold uppercase tracking-wider">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400">
                  <th className="p-4">Owner Name</th>
                  <th className="p-4">Business Name</th>
                  <th className="p-4">Email de Campaña</th>
                  <th className="p-4">Teléfono</th>
                  <th className="p-4">Fecha Cancelación</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-left text-white">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-500 italic">No hay leads de cancelación archivados</td>
                  </tr>
                ) : (
                  filteredLeads.map(l => (
                    <tr key={l.id} className="hover:bg-white/[0.01] transition-all">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-red-500/10 border border-red-500/20 flex items-center justify-center text-xs font-black text-red-400">
                            {(l.owner_name || 'U')[0].toUpperCase()}
                          </div>
                          <span className="text-white font-extrabold text-[10px]">{l.owner_name || 'Usuario Churned'}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-300 font-extrabold">{l.business_name || 'Negocio Churned'}</td>
                      <td className="p-4 text-slate-400 font-mono text-[9px]">{l.email}</td>
                      <td className="p-4 text-slate-400 font-mono">{l.phone || 'N/A'}</td>
                      <td className="p-4 text-slate-400 font-mono">
                        {l.created_at ? new Date(l.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <a
                            href={`mailto:${l.email}`}
                            className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-md active:scale-95 transition-all text-[8px] font-black uppercase tracking-wider"
                          >
                            Email Marketing
                          </a>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${l.owner_name} | ${l.business_name} | ${l.email} | ${l.phone || ''}`);
                              tt("Lead copiado al portapapeles ✓", "green");
                            }}
                            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md active:scale-95 transition-all text-[8px] font-black uppercase tracking-wider"
                          >
                            Copiar Datos
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
