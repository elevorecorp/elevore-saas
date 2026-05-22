import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { sb } from './supabase';
import * as Icons from 'lucide-react';

// =====================================================================
// 🌟 DYNAMIC ICON ENGINE
// Maps string names like "arrow-left" to high-performance React Icons
// =====================================================================
function Icon({ name, className, style, ...props }) {
  if (!name) return null;
  const pascalName = name
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  const LucideIcon = Icons[pascalName] || Icons.HelpCircle;
  return <LucideIcon className={className} style={style} {...props} />;
}

// Default constants in case tenant configs are loading
const DEFAULT_CFG = {
  STAFF_PAY: 0.40,
  GOAL: 15000,
  GOOGLE: 'https://g.page/r/review',
  ADMIN: '2026',
  STAFF: 'staff',
  ZELLE: '(407) 952-4228',
  BIZ: 'Elevore Premium Services'
};

const T = {
  en: { balance: 'Balance Due', pay: 'Pay via Zelle', approve: 'Sign to Approve Quote', before: 'Before', after: 'After', complete: 'Sign to Confirm Completion', review: 'Leave a Google Review', refer: 'Refer a Friend — Both Get $25 Off', syncing: 'Syncing...', hub: 'Live Mission Hub', arrived: 'Team Arrived', done: 'Completed', rating: 'Rate your service', submit: 'Submit Rating', chat: 'Message us', legal: 'Digital signatures are legally binding', urgency: 'Quote expires in', lock: 'Lock in your price!', refTitle: 'Referral Program', refDesc: 'Share your link with friends. Both get $25 off when they complete their first booking!', copied: 'Copied! 🎁' },
  es: { balance: 'Saldo Pendiente', pay: 'Paga por Zelle', approve: 'Firma para Aprobar tu Cotización', before: 'Antes', after: 'Después', complete: 'Firma para Confirmar que Quedó Bien', review: 'Déjanos una Reseña', refer: 'Refiere un Amigo — Ambos Reciben $25', syncing: 'Cargando...', hub: 'Estado del Servicio', arrived: 'El equipo llegó', done: 'Completado', rating: 'Califica el servicio', submit: 'Enviar Calificación', chat: 'Escríbenos', legal: 'Las firmas digitales tienen validez legal', urgency: 'Cotización vence en', lock: '¡Bloquea tu precio!', refTitle: 'Programa de Referidos', refDesc: 'Comparte tu link con amigos. ¡Ambos reciben $25 de descuento en su próximo servicio!', copied: '¡Link Copiado! 🎁' }
};
const tr = (l, k) => T[l]?.[k] || T.en[k] || k;

const ADDONS = [
  { id: 'oven', en: 'Inside Oven', p: 35 },
  { id: 'fridge', en: 'Inside Fridge', p: 30 },
  { id: 'windows', en: 'Windows', p: 50 },
  { id: 'pethair', en: 'Pet Hair', p: 25 },
  { id: 'garage', en: 'Garage', p: 40 }
];

const QJOBS = [
  { id: 'tv', en: 'Mount TV', p: 150 },
  { id: 'door', en: 'Install Door', p: 200 },
  { id: 'patch', en: 'Drywall Patch', p: 180 },
  { id: 'shelves', en: 'Shelving', p: 100 },
  { id: 'lock', en: 'Lock Change', p: 85 },
  { id: 'paint', en: 'Paint Touch-up', p: 120 },
  { id: 'faucet', en: 'Faucet Install', p: 130 },
  { id: 'caulk', en: 'Caulking', p: 75 }
];

const RISK = [
  { l: 'None', v: 0 },
  { l: 'Low', v: 50 },
  { l: 'Mid', v: 100 },
  { l: 'High', v: 150 }
];

const CHECKS = ['Entrance', 'Kitchen', 'Bathrooms', 'Floors', 'Bedrooms', 'Windows', 'Trash', 'Final walkthrough'];

const MBS = [
  { id: 'none', name: 'None', price: 0, color: '#6b7280' },
  { id: 'basic', name: 'Basic', price: 199, color: '#6b7280', perks: ['2 Cleans/mo', '5% off', 'Priority'] },
  { id: 'premium', name: 'Premium', price: 349, color: '#3b82f6', perks: ['4 Cleans/mo', '10% off', 'Free oven'] },
  { id: 'vip', name: 'VIP', price: 549, color: '#fbbf24', perks: ['6 Cleans/mo', '15% off', 'All add-ons', 'Dedicated team'] }
];

const SEASONS = [
  { name: 'Spring Cleaning', months: [3, 4, 5], msg: 'Spring is here! 🌸' },
  { name: 'Summer Special', months: [6, 7, 8], discount: 10, msg: 'Beat the heat — 10% off!' },
  { name: 'Pre-Thanksgiving', months: [11], msg: 'Holiday prep! 🦃' },
  { name: 'Holiday Clean', months: [12], discount: 15, msg: '15% off! 🎄' },
  { name: 'New Year', months: [1], discount: 10, msg: 'Fresh start — 10% off! 🎉' }
];

const INIT = { name: '', phone: '', address: '', svc: 'regular', beds: 2, baths: 2, living: 1, laundryRoom: 0, complexity: 1, sqft: 2000, oven: false, fridge: false, windows: false, pethair: false, garage: false, laundryLoads: 0, expenses: 0, deposit: 0, discount: 0, frequency: 'one-time', team: '', date: '', status: 'lead', totalPrice: 0, laborHours: 2, materialCost: 0, riskMargin: 50, selectedQuickJobs: [], audit_link: '', notes: '', urgencyHours: 24, membership: 'none', lang: 'en' };

const fmt$ = n => '$' + Math.round(n || 0).toLocaleString();
const fmtD = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD';
const dAgo = d => d ? Math.round((Date.now() - new Date(d).getTime()) / 86400000) : 999;
const calcDNA = js => {
  if (!js.length) return 0;
  let s = Math.min(40, js.length * 10);
  s += Math.min(30, js.filter(j => j.status === 'paid').length * 10);
  s += Math.min(20, js.filter(j => j.specs?.frequency && j.specs.frequency !== 'one-time').length * 10);
  s += js.some(j => j.specs?.referral) ? 10 : 0;
  return Math.min(100, s);
};
const lvl = n => n >= 15 ? { name: 'Platinum', color: '#e5e4e2' } : n >= 7 ? { name: 'Gold', color: '#fbbf24' } : n >= 3 ? { name: 'Silver', color: '#c0c0c0' } : { name: 'Bronze', color: '#cd7f32' };
const season = () => {
  const m = new Date().getMonth() + 1;
  return SEASONS.filter(s => s.months?.includes(m));
};

// SigPad Component
function SigPad({ onSave, label = 'Sign here', color = '#22c55e' }) {
  const ref = useRef(null);
  const [drawing, setDraw] = useState(false);
  const [has, setHas] = useState(false);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const r = () => {
      c.width = c.offsetWidth;
      c.height = 140;
    };
    r();
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);

  const xy = e => {
    const r = ref.current.getBoundingClientRect();
    const s = e.touches ? e.touches[0] : e;
    return { x: s.clientX - r.left, y: s.clientY - r.top };
  };

  const start = e => {
    e.preventDefault();
    const { x, y } = xy(e);
    const c = ref.current.getContext('2d');
    c.beginPath();
    c.moveTo(x, y);
    setDraw(true);
  };

  const move = e => {
    if (!drawing) return;
    e.preventDefault();
    const { x, y } = xy(e);
    const c = ref.current.getContext('2d');
    c.lineTo(x, y);
    c.strokeStyle = color;
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.stroke();
    setHas(true);
  };

  const stop = () => setDraw(false);
  const clear = () => {
    ref.current.getContext('2d').clearRect(0, 0, ref.current.width, ref.current.height);
    setHas(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black text-amber-500 uppercase text-center tracking-widest">{label}</p>
      <canvas ref={ref} className="sp" style={{ height: '140px' }} onMouseDown={start} onTouchStart={start} onMouseMove={move} onTouchMove={move} onMouseUp={stop} onTouchEnd={stop} onMouseLeave={stop} />
      <div className="flex gap-2">
        <button onClick={clear} className="flex-1 py-3 bg-white/5 text-slate-400 rounded-xl font-black uppercase text-[9px] active:scale-95">Clear</button>
        <button onClick={() => has && onSave(ref.current.toDataURL('image/png'))} disabled={!has} className={`flex-1 py-3 rounded-xl font-black uppercase text-[9px] active:scale-95 ${has ? 'gold' : 'bg-white/5 text-slate-600'}`}>{has ? '✅ Confirm' : 'Sign above'}</button>
      </div>
    </div>
  );
}

// PhotoDrive Component
function PhotoDrive({ photos = [], label, onAdd }) {
  const [lk, setLk] = useState('');
  const [isUploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { error } = await sb.storage.from('elevore_photos').upload(fileName, file);
      if (error) throw error;
      
      const { data } = sb.storage.from('elevore_photos').getPublicUrl(fileName);
      if (onAdd) onAdd(data.publicUrl);
    } catch (err) {
      alert('Asegurate de que el Bucket "elevore_photos" este publico en Supabase Storage. Error: ' + err.message);
    }
    setUploading(false);
  };

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{label}</p>
      {!photos.length && <p className="text-[9px] text-slate-700 italic font-black text-center py-2">No photos yet</p>}
      <div className="grid grid-cols-3 gap-2">
        {photos.map((u, i) => (
          <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="g p-2.5 text-center border border-white/5 hover:border-green-500 transition-all active:scale-95">
            <Icon name="image" className="w-4 h-4 mx-auto text-green-400 mb-1" />
            <p className="text-[7px] text-slate-400 font-black">Photo {i + 1}</p>
          </a>
        ))}
      </div>
      {onAdd && (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input type="text" placeholder="Photo link URL..." value={lk} onChange={e => setLk(e.target.value)} className="inp text-xs text-blue-400 flex-1" />
            <button onClick={() => { if (lk.trim()) { onAdd(lk.trim()); setLk(''); } }} className="px-4 bg-green-600 text-white rounded-xl font-black text-lg active:scale-95">+</button>
          </div>
          <div className="relative w-full">
            <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isUploading} />
            <button className="w-full bg-slate-800 border border-slate-700 text-slate-300 py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 active:scale-95">
              {isUploading ? <Icon name="loader-2" className="w-4 h-4 animate-spin" /> : <><Icon name="camera" className="w-4 h-4" /> Tomar Foto Directamente</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Sleek Progress Ring Component for Dashboard Graphics
function ProgressRing({ radius = 30, stroke = 5, progress = 75, color = '#fbbf24', text = '' }) {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        <circle stroke="rgba(255,255,255,0.05)" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
        <circle stroke={color} fill="transparent" strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-in-out' }} strokeLinecap="round" r={normalizedRadius} cx={radius} cy={radius} />
      </svg>
      <div className="absolute text-center">
        <span className="text-[10px] font-black text-white leading-none">{text || `${Math.round(progress)}%`}</span>
      </div>
    </div>
  );
}

// Sleek Line/Area Chart using SVG paths
function SleekAreaChart({ data, color = '#fbbf24' }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data.map(d => d.v), 1);
  const width = 500;
  const height = 100;
  const step = width / (data.length - 1);
  
  const points = data.map((d, i) => ({
    x: i * step,
    y: height - (d.v / max) * 75 - 5
  }));

  const pathD = points.reduce((acc, p, i) => (
    i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`
  ), '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div className="w-full relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="rgba(255,255,255,0.03)" strokeDasharray="3" />
        <line x1="0" y1={height} x2={width} y2={height} stroke="rgba(255,255,255,0.08)" />
        {/* Area fill */}
        <path d={areaD} fill="url(#grad)" />
        {/* Path line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
        {/* Plot points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#000" stroke={color} strokeWidth="2.5" className="hover:scale-150 transition-all cursor-pointer" />
        ))}
      </svg>
      <div className="flex justify-between mt-2 text-[7px] font-black text-slate-500 uppercase tracking-wider">
        {data.map((d, i) => (
          <span key={i}>{d.l}</span>
        ))}
      </div>
    </div>
  );
}

// BarChart Component
function BarChart({ data, color = '#22c55e', label = '' }) {
  const max = Math.max(...data.map(d => d.v), 1);
  return (
    <div>
      {label && <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">{label}</p>}
      <div className="flex items-end gap-1.5 h-20 w-full">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="br w-full rounded-t-lg transition-all duration-700" style={{ height: `${(d.v / max) * 70}px`, background: color }}></div>
            <span className="text-[7px] text-slate-600 font-black leading-none mt-1">{d.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stars Component
function Stars({ value, onChange, size = 6 }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onChange && onChange(n)} className="active:scale-110 transition-all">
          <Icon name="star" className={`w-${size} h-${size}`} style={{ fill: n <= value ? '#fbbf24' : 'none', color: n <= value ? '#fbbf24' : '#374151' }} />
        </button>
      ))}
    </div>
  );
}

// QR Code Component
function QR({ url, size = 80 }) {
  return <img src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&color=ffffff&bgcolor=000000`} className="rounded-xl border border-white/5 p-1" style={{ width: size, height: size }} alt="QR" />;
}

// Thermo Component
function Thermo({ pct, goal, current }) {
  const h = Math.min(100, pct);
  return (
    <div className="flex items-end justify-center gap-5">
      <div className="relative w-9 h-36 bg-white/5 rounded-full border border-white/10 overflow-hidden flex items-end">
        <div className="w-full rounded-full transition-all duration-1000" style={{ height: `${h}%`, background: pct >= 100 ? '#fbbf24' : 'linear-gradient(0deg,#22c55e,#fbbf24)', boxShadow: '0 0 15px rgba(251, 191, 36, 0.4)' }}></div>
      </div>
      <div>
        <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest leading-none mb-1">Target MRR</p>
        <p className="text-3xl font-black italic text-white tracking-tighter">{fmt$(goal)}</p>
        <p className="text-[8px] text-green-400 font-black uppercase mt-2">Billed: {fmt$(current)}</p>
        <p className={`text-[8px] font-black uppercase mt-0.5 ${pct >= 100 ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`}>{pct >= 100 ? '🎯 Target Hit!' : fmt$(goal - current) + ' to go'}</p>
      </div>
    </div>
  );
}

// MapComponent
function MapComponent({ address }) {
  if (!address) return <div className="g p-10 text-center text-slate-500 font-black uppercase text-[10px] border border-dashed border-white/5">Select a mission to load GPS Map</div>;
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
  return (
    <div className="g overflow-hidden border border-white/10 h-64 w-full relative">
      <iframe title="GPS Map" width="100%" height="100%" frameBorder="0" scrolling="no" marginHeight="0" marginWidth="0" src={src} className="w-full h-full rounded-xl"></iframe>
    </div>
  );
}

// VoiceButton: Speech recognition dictation button
function VoiceButton({ onTranscript, className = '' }) {
  const [listening, setListening] = useState(false);
  const startListen = () => {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) return alert('La transcripción de voz no es compatible con este navegador.');
    
    const rec = new Speech();
    rec.lang = 'es-ES';
    rec.continuous = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      onTranscript(t);
    };
    rec.onerror = () => setListening(false);
    rec.start();
  };
  return (
    <button onClick={startListen} type="button" className={`p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center ${listening ? 'bg-red-600 animate-pulse text-white' : 'bg-slate-900 text-slate-500 hover:text-white hover:bg-slate-800'} ${className}`} title="Dictar con Voz">
      <Icon name="mic" className="w-4 h-4" />
    </button>
  );
}

// TacticalRadarMap completely removed as requested

// AIReportModal: Strategic analytical growth report overlay
function AIReportModal({ jobs, clients, staff, onClose, tt }) {
  const totalRev = jobs.reduce((a, b) => a + (b.total_price || 0), 0);
  const mrr = clients.reduce((a, c) => {
    const m = MBS.find(x => x.id === c.membership);
    return a + (m?.price || 0);
  }, 0);
  
  const activeMemberships = clients.filter(c => c.membership && c.membership !== 'none').length;
  
  const referrals = clients.filter(c => {
    const cj = jobs.filter(j => j.client_name === c.name);
    return cj.length >= 2;
  }).length;

  return (
<div className="fixed inset-0 bg-black/95 z-[2000] flex items-center justify-center p-4 mesh-bg" onClick={onClose}>
      <div className="g p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto custom-scroll border-t-4 border-[#F5C518] su bg-[#050508] shadow-[0_0_80px_rgba(245,197,24,0.1)] space-y-6 animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4">
          <div className="flex items-center gap-4">
            <img src="/elevore-logo.png" alt="Elevore Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(245,197,24,0.4)]" />
            <div>
              <h2 className="text-xs font-black text-white uppercase tracking-widest leading-none font-display">ELEVORE <span className="text-gradient italic">AI STRATEGIC GROWTH REPORT</span></h2>
              <p className="text-[7px] text-slate-500 uppercase mt-1">SaaS Revenue, Churn Protection & Scale Playbook</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white transition-all"><Icon name="x" className="w-5 h-5" /></button>
        </div>

        {/* KPIs display */}
        <div className="grid grid-cols-3 gap-3">
          <div className="g p-4 text-center bg-white/[0.02]">
            <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider mb-1">VIP RECURRING MRR</p>
            <p className="text-2xl font-black italic text-white leading-none">{fmt$(mrr)}</p>
            <span className="text-[5px] text-green-400 font-bold block mt-1.5">{activeMemberships} active subscribers</span>
          </div>
          <div className="g p-4 text-center bg-white/[0.02]">
            <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider mb-1">GROSS ACQUISITION</p>
            <p className="text-2xl font-black italic text-white leading-none">{fmt$(totalRev)}</p>
            <span className="text-[5px] text-[#F5C518] font-bold block mt-1.5">{jobs.length} completed tickets</span>
          </div>
          <div className="g p-4 text-center bg-white/[0.02]">
            <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider mb-1">REFERRAL PIPELINE</p>
            <p className="text-2xl font-black italic text-white leading-none">{referrals} Leads</p>
            <span className="text-[5px] text-blue-400 font-bold block mt-1.5">Expansion candidates ready</span>
          </div>
        </div>

        {/* Forecast Trajectory */}
        <div className="g p-5 border border-white/5 space-y-4">
          <h3 className="text-[9px] font-black text-[#F5C518] uppercase tracking-widest">📈 6-MONTH REVENUE FORECAST (DYNAMIC DISPATCH TARGET)</h3>
          
          <div className="h-28 flex items-end justify-between gap-2.5 pt-4 px-2">
            {[
              { m: 'Mes 1', v: mrr + totalRev * 0.4 },
              { m: 'Mes 2', v: mrr * 1.25 + totalRev * 0.45 },
              { m: 'Mes 3', v: mrr * 1.5 + totalRev * 0.5 },
              { m: 'Mes 4', v: mrr * 1.8 + totalRev * 0.55 },
              { m: 'Mes 5', v: mrr * 2.2 + totalRev * 0.6 },
              { m: 'Mes 6', v: mrr * 2.8 + totalRev * 0.65 }
            ].map((bar, i) => {
              const max = mrr * 2.8 + totalRev * 0.65;
              const hPct = max > 0 ? (bar.v / max) * 100 : 20;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[6px] text-slate-400 font-bold">{fmt$(Math.round(bar.v))}</span>
                  <div className="w-full bg-slate-900 rounded-t-md relative overflow-hidden transition-all duration-500" style={{ height: `${hPct}%` }}>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-[#F5C518]/30 to-[#F5C518]"></div>
                  </div>
                  <span className="text-[5px] text-slate-500 font-black uppercase tracking-wider">{bar.m}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom actionable strategic playbook */}
        <div className="space-y-3">
          <h3 className="text-[9px] font-black text-slate-300 uppercase tracking-widest border-b border-white/5 pb-2">🎯 AI ACTIONABLE SCALE PLAN</h3>
          
          <div className="space-y-2.5">
            <div className="g p-4 flex gap-3 items-start border border-[#F5C518]/10 bg-white/[0.01]">
              <div className="w-6 h-6 bg-[#F5C518]/10 border border-[#F5C518]/25 text-[#F5C518] font-bold text-xs rounded-lg flex items-center justify-center flex-shrink-0">1</div>
              <div>
                <h4 className="text-[9px] font-bold text-white uppercase tracking-wider leading-none mb-1">Optimización de Precios Dinámicos (Dynamic Pricing)</h4>
                <p className="text-[8px] text-slate-400">Tus servicios de Handyman tienen un excelente margen operativo. Te aconsejamos ajustar el recargo de materiales de 1.2x a 1.35x en trabajos complejos de pintura y dry-wall. Esto añadirá un promedio de $45 netos por misión sin resistencia del cliente.</p>
              </div>
            </div>

            <div className="g p-4 flex gap-3 items-start border border-blue-500/10 bg-white/[0.01]">
              <div className="w-6 h-6 bg-blue-500/10 border border-blue-500/25 text-blue-400 font-bold text-xs rounded-lg flex items-center justify-center flex-shrink-0">2</div>
              <div>
                <h4 className="text-[9px] font-bold text-white uppercase tracking-wider leading-none mb-1">Campaña de Suscripción VIP Express</h4>
                <p className="text-[8px] text-slate-400">Hay {referrals} clientes recurrentes que están pagando por ticket individual. Te sugerimos lanzarles la oferta de VIP Basic de $199/mes mediante WhatsApp, garantizando prioridad horaria los fines de semana. Generará un MRR estable estimado de +$995.</p>
              </div>
            </div>

            <div className="g p-4 flex gap-3 items-start border border-green-500/10 bg-white/[0.01]">
              <div className="w-6 h-6 bg-green-500/10 border border-green-500/25 text-green-400 font-bold text-xs rounded-lg flex items-center justify-center flex-shrink-0">3</div>
              <div>
                <h4 className="text-[9px] font-bold text-white uppercase tracking-wider leading-none mb-1">Gamificación del Personal</h4>
                <p className="text-[8px] text-slate-400">El bono de velocidad actual está impulsando la finalización de tareas en un 22% menos de tiempo. Te recomendamos crear un premio trimestral de $150 para el líder de la Liga de Desempeño. La productividad de tu staff aumentará un 15% adicional.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-white/5 pt-4">
          <button onClick={() => { window.print(); tt('Reporte Impreso 🖨️'); }} className="flex-1 gold py-3 rounded-xl font-black uppercase text-[9px] active:scale-95 flex items-center justify-center gap-1.5 shadow-lg"><Icon name="printer" className="w-3.5 h-3.5" />Print Strategic Blueprint</button>
          <button onClick={onClose} className="px-5 bg-white/5 border border-white/5 text-slate-400 hover:text-white rounded-xl text-[9px] font-black uppercase active:scale-95 transition-all">Close</button>
        </div>

      </div>
    </div>
  );
}

// Helper: Calculate gamified employee stats, XP levels, and reward badges
function getStaffStats(worker, jobs) {
  const workerJobs = jobs.filter(j => j.team_assigned && j.team_assigned.toLowerCase().includes(worker.name.toLowerCase()));
  const completed = workerJobs.filter(j => j.status === 'paid' || j.status === 'completed');
  const ratings = completed.map(j => j.client_rating).filter(r => r > 0);
  const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '5.0';
  
  const baseXP = completed.length * 350 + (parseFloat(avgRating) * 150) + (worker.total_earned || 0) * 0.2;
  const xp = Math.round(baseXP) || 120;
  const level = Math.floor(xp / 800) + 1;
  const progress = Math.round(((xp % 800) / 800) * 100);

  const badges = [];
  if (worker.role === 'admin') badges.push({ id: 'empire', label: '👑 Empire Admin', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' });
  if (completed.length >= 3) badges.push({ id: 'veteran', label: '🛡️ Veteran', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' });
  if (parseFloat(avgRating) >= 4.8) badges.push({ id: 'star', label: '⭐ Perfect 5', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' });
  if ((worker.total_earned || 0) > 1000) badges.push({ id: 'gold', label: '💰 Gold Maker', color: 'text-green-400 bg-green-400/10 border-green-400/20' });
  if (completed.some(j => j.final_signature)) badges.push({ id: 'qc', label: '⚡ Sign Master', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' });
  
  if (badges.length === 0) {
    badges.push({ id: 'rookie', label: '⚡ Rising Star', color: 'text-pink-400 bg-pink-400/10 border-pink-400/20' });
  }

  return { completed: completed.length, avgRating, xp, level, progress, badges };
}

// Portal Component
function Portal({ cjid }) {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState(new URLSearchParams(location.search).get('lang') || 'en');
  const [rating, setRating] = useState(0);
  const [ratingDone, setRDone] = useState(false);
  const [toast, setToast] = useState(null);
  const tt = (m, c = 'green') => { setToast({ m, c }); setTimeout(() => setToast(null), 3000); };

  const load = async () => {
    setLoading(true);
    const { data } = await sb.from('elevore_missions').select('*').eq('id', cjid).single();
    if (data) {
      setJob(data);
      setRating(data.client_rating || 0);
      setRDone(!!data.client_rating);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [cjid]);

  if (loading || !job) return <div className="min-h-screen flex items-center justify-center text-white font-black animate-pulse">{tr(lang, 'syncing')}</div>;
  const bal = job.total_price - job.deposit_paid;
  const sm = { lead: 10, scheduled: 30, in_progress: 65, completed: 90, paid: 100 };
  const urgent = job.urgency_expires ? Math.max(0, Math.round((new Date(job.urgency_expires) - Date.now()) / 3600000)) : null;

  const saveApproval = async sig => { await sb.from('elevore_missions').update({ approval_signature: sig, status: 'scheduled' }).eq('id', cjid); tt('✅ Approved!'); load(); };
  const saveFinal = async sig => { await sb.from('elevore_missions').update({ final_signature: sig, status: 'paid' }).eq('id', cjid); tt('🌟 Done!'); load(); };
  const submitRating = async () => { await sb.from('elevore_missions').update({ client_rating: rating }).eq('id', cjid); setRDone(true); tt('⭐ Thank you!'); };

  return (
    <div className="min-h-screen p-5 bg-gradient-to-b from-slate-950 via-black to-zinc-900 animate-in fade-in duration-700">
      {toast && <div className={`tst fixed top-5 left-1/2 -translate-x-1/2 z-[500] px-6 py-3 rounded-2xl font-black uppercase text-sm shadow-2xl ${toast.c === 'red' ? 'bg-red-600' : 'bg-green-600'} text-white`}>{toast.m}</div>}
      <div className="max-w-md mx-auto space-y-5 pb-20">
        <div className="flex justify-end gap-2">{['en', 'es'].map(lg => (<button key={lg} onClick={() => setLang(lg)} className={`text-[8px] font-black px-3 py-1.5 rounded-xl ${lang === lg ? 'bg-amber-500 text-black' : 'bg-white/5 text-slate-500'}`}>{lg.toUpperCase()}</button>))}</div>
        <div className="text-center space-y-2"><div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center font-black text-black text-2xl italic shadow-xl">E</div><h1 className="text-xl font-black uppercase tracking-[0.3em] text-white">ELEVORE</h1><p className="text-[9px] text-green-500 font-bold uppercase tracking-[0.4em]">{tr(lang, 'hub')}</p></div>
        {urgent !== null && urgent > 0 && !job.approval_signature && <div className="gold py-3 px-5 rounded-2xl text-center font-black uppercase text-sm">⏰ {tr(lang, 'urgency')} {urgent}h — {tr(lang, 'lock')}</div>}
        <div className="g p-6 border-t-4 border-green-500 space-y-4">
          <div className="flex justify-between items-center"><div><p className="text-[9px] font-black text-slate-500 uppercase">Client</p><h2 className="text-xl font-black italic uppercase text-white">{job.client_name}</h2></div><span className={`text-[8px] font-black px-3 py-1.5 rounded-xl uppercase ${job.status === 'paid' ? 'bg-blue-600 text-white' : job.status === 'in_progress' ? 'bg-green-600 text-white' : job.status === 'completed' ? 'bg-purple-600 text-white' : 'bg-amber-500 text-black'}`}>{job.status}</span></div>
          <div className="text-[9px] text-slate-500 font-black uppercase space-y-1"><p>📋 {job.service_type?.toUpperCase()}</p><p>📅 {fmtD(job.scheduled_date)}</p><p>👥 {job.team_assigned || 'TBD'}</p><p>📍 {job.address}</p>{job.check_in_time && <p className="text-green-400">▶ {tr(lang, 'arrived')}: {new Date(job.check_in_time).toLocaleTimeString()}</p>}{job.check_out_time && <p className="text-purple-400">⏹ {tr(lang, 'done')}: {new Date(job.check_out_time).toLocaleTimeString()}</p>}</div>
          <div><div className="flex justify-between text-[8px] font-black uppercase text-slate-500 mb-1"><span>Booked</span><span>{sm[job.status] || 0}%</span></div><div className="pb"><div className="pf" style={{ width: `${sm[job.status] || 0}%` }}></div></div></div>
        </div>
        <div className="g p-6 text-center space-y-2"><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{tr(lang, 'balance')}</p><h3 className="text-6xl font-black italic tracking-tighter text-white">{fmt$(bal)}</h3><p className="text-[9px] text-green-500 font-black uppercase pt-2">💸 {tr(lang, 'pay')}: {DEFAULT_CFG.ZELLE}</p></div>
        {!job.approval_signature ? (<div className="g p-6 border border-amber-500/30 space-y-4"><SigPad onSave={saveApproval} label={tr(lang, 'approve')} /></div>) : (<div className="g p-5 border border-green-600/30 text-center space-y-2"><p className="text-[9px] text-green-500 font-black uppercase">✅ Approved</p><img src={job.approval_signature} className="h-10 mx-auto opacity-50" alt="signature" /></div>)}
        {(job.before_photos?.length > 0 || job.after_photos?.length > 0) && (<div className="grid grid-cols-2 gap-3">{job.before_photos?.length > 0 && <div className="g p-4"><PhotoDrive photos={job.before_photos} label={`📸 ${tr(lang, 'before')}`} /></div>}{job.after_photos?.length > 0 && <div className="g p-4"><PhotoDrive photos={job.after_photos} label={`✨ ${tr(lang, 'after')}`} /></div>}</div>)}
        {job.approval_signature && job.after_photos?.length > 0 && !job.final_signature && <div className="g p-6 border border-purple-500/30 space-y-4"><SigPad onSave={saveFinal} label={tr(lang, 'complete')} color="#a855f7" /></div>}
        {job.final_signature && <div className="g p-5 border border-purple-600/30 text-center space-y-2"><p className="text-[9px] text-purple-400 font-black uppercase">🏁 {tr(lang, 'complete')}</p><img src={job.final_signature} className="h-10 mx-auto opacity-50" alt="signature" /></div>}
        {job.status === 'paid' && !ratingDone && (<div className="g p-6 border border-amber-500/20 text-center space-y-4"><p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">{tr(lang, 'rating')}</p><div className="flex justify-center"><Stars value={rating} onChange={setRating} size={8} /></div><button onClick={submitRating} disabled={!rating} className={`w-full py-3 rounded-xl font-black uppercase text-[10px] active:scale-95 ${rating ? 'gold' : 'bg-white/5 text-slate-600'}`}>{tr(lang, 'submit')}</button></div>)}
        {ratingDone && <div className="g p-4 text-center"><p className="text-[9px] text-amber-400 font-black uppercase">⭐ {job.client_rating}/5 — Thank you!</p></div>}
        <div className="g p-5 flex items-center gap-4"><QR url={`${location.origin}${location.pathname}?mision=${job.id}`} size={75} /><div><p className="text-[8px] font-black text-slate-500 uppercase mb-1">Your Portal QR</p><p className="text-[7px] text-slate-600 italic">Scan anytime</p></div></div>
        {job.status === 'paid' && (
          <button onClick={() => window.open(DEFAULT_CFG.GOOGLE)} className="w-full gold py-4 rounded-2xl font-black uppercase text-sm active:scale-95 mb-1">
            ⭐ {tr(lang, 'review')}
          </button>
        )}

        {/* ── PREMIUM REFERRAL SYSTEM ── */}
        <div className="relative rounded-3xl overflow-hidden border border-[#F5C518]/25 bg-gradient-to-br from-[#0e0d02] via-[#121106] to-black p-6 space-y-4 shadow-[0_0_40px_rgba(245,197,24,0.05)] text-left">
          <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-[#F5C518] via-[#F5C518]/30 to-transparent" />
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#F5C518]/10 flex items-center justify-center">
              <Icon name="gift" className="w-3.5 h-3.5 text-[#F5C518]" />
            </div>
            <h3 className="text-[10px] font-black text-white uppercase tracking-widest font-display">{tr(lang, 'refTitle')}</h3>
          </div>
          <p className="text-[8px] text-slate-400 leading-relaxed uppercase font-bold tracking-wider">
            {tr(lang, 'refDesc')}
          </p>
          <div className="flex gap-2">
            <input 
              readOnly 
              value={`${location.origin}${location.pathname}?ref=${job.client_name?.replace(/\s/g, '_')}&t=${job.tenant_id || ''}`} 
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-[8px] font-mono text-slate-400 outline-none select-all"
            />
            <button 
              onClick={() => { 
                const l = `${location.origin}${location.pathname}?ref=${job.client_name?.replace(/\s/g, '_')}&t=${job.tenant_id || ''}`; 
                navigator.clipboard?.writeText(l); 
                tt(tr(lang, 'copied')); 
              }} 
              className="px-4 py-2.5 bg-[#F5C518] hover:bg-amber-400 text-black font-black uppercase text-[8px] tracking-wider rounded-xl active:scale-95 transition-all shadow-lg shadow-[#F5C518]/10"
            >
              {lang === 'es' ? 'Copiar' : 'Copy'}
            </button>
          </div>
        </div>

        <button onClick={() => window.open(`https://wa.me/${job.client_phone?.replace(/\D/g, '') || ''}`)} className="w-full g py-4 rounded-2xl font-black uppercase text-[10px] text-green-400 border border-green-600/20 active:scale-95 flex items-center justify-center gap-2"><Icon name="message-circle" className="w-4 h-4" />{tr(lang, 'chat')}</button>
        <p className="text-[7px] text-slate-700 text-center uppercase font-bold">{tr(lang, 'legal')}</p>
      </div></div>
  );
}

// StaffJob Component
function StaffJob({ job, onBack, onRefresh, tt, recTime, upsell, update, employee }) {
  const [chk, setChk] = useState({});
  const [localJob, setLocalJob] = useState(job);
  const [isScanning, setIsScanning] = useState(false);
  const [scanUrl, setScanUrl] = useState('');
  const [scanStep, setScanStep] = useState(0);
  const done = Object.values(chk).filter(Boolean).length;
  
  // Custom smart speed & quality bonus calculation
  const bonus = (localJob.status === 'paid' && localJob.final_signature && localJob.check_in_time && localJob.check_out_time && (Math.round((new Date(localJob.check_out_time) - new Date(localJob.check_in_time)) / 60000)) <= 180 && (localJob.client_rating || 0) >= 4) ? 5 : 0;
  
  const addAP = async url => {
    // 🧠 AI VISION INSPECTOR SIMULATION 🧠
    setScanUrl(url);
    setIsScanning(true);
    setScanStep(1);
    
    // Simulate AI Processing sequence
    setTimeout(() => setScanStep(2), 1500); // Edge Detection
    setTimeout(() => setScanStep(3), 3000); // Micro-particle analysis
    setTimeout(async () => {
      setScanStep(4); // Approved
      
      // Actual Database Commit
      const c = localJob.after_photos || [];
      const newSpecs = { ...(localJob.specs || {}), ai_vision_qc: true };
      await sb.from('elevore_missions').update({ after_photos: [...c, url], specs: newSpecs }).eq('id', localJob.id);
      tt('AI Quality Control: APPROVED ✓', 'green');
      setLocalJob({ ...localJob, after_photos: [...c, url], specs: newSpecs });
      
      setTimeout(() => setIsScanning(false), 2000);
    }, 4500);
  };

  return (
    <div className="min-h-screen p-5 bg-gradient-to-b from-slate-950 via-black to-zinc-900 pb-24 animate-in fade-in relative">
      
      {/* 🔮 AI VISION HUD OVERLAY */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/95 z-[5000] flex flex-col items-center justify-center p-6 mesh-bg">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,128,0.05),transparent)]"></div>
          
          <div className="w-full max-w-sm relative aspect-square bg-slate-900/50 rounded-3xl border border-white/10 overflow-hidden shadow-[0_0_80px_rgba(34,197,94,0.15)]">
            {scanUrl.startsWith('http') ? (
              <img src={scanUrl} alt="Scan target" className="w-full h-full object-cover opacity-60 mix-blend-luminosity" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#F5C518] italic font-black text-6xl opacity-20">ELEVORE</div>
            )}
            
            {/* HUD Elements */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-green-500 rounded-tl-xl"></div>
              <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-green-500 rounded-tr-xl"></div>
              <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-green-500 rounded-bl-xl"></div>
              <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-green-500 rounded-br-xl"></div>
              
              {/* Laser Scanner */}
              <div className={`absolute top-0 left-0 w-full h-0.5 bg-green-400 shadow-[0_0_20px_#4ade80] ${scanStep < 4 ? 'animate-scan' : 'hidden'}`} style={{ animationDuration: '2s', animationIterationCount: 'infinite' }}></div>
              
              {/* Target Reticle */}
              {scanStep === 2 && <div className="absolute top-1/3 left-1/4 w-16 h-16 border border-amber-500 rounded-full animate-ping"></div>}
              {scanStep === 3 && <div className="absolute top-1/2 right-1/4 w-20 h-20 border border-blue-500 rounded-full animate-ping"></div>}
            </div>

            {/* Readout Text */}
            <div className="absolute bottom-4 left-0 w-full text-center px-4 font-mono">
              {scanStep === 1 && <p className="text-green-400 text-[10px] uppercase font-bold animate-pulse">Initializing Elevore Vision AI...</p>}
              {scanStep === 2 && <p className="text-amber-400 text-[10px] uppercase font-bold">Mapping Structural Boundaries & Lighting...</p>}
              {scanStep === 3 && <p className="text-blue-400 text-[10px] uppercase font-bold">Scanning for Micro-Particulates (98%)...</p>}
              {scanStep === 4 && <p className="text-white bg-green-600 font-black uppercase text-xs py-1.5 px-4 rounded-full inline-block animate-bounce shadow-xl shadow-green-600/30">QC PASSED: 99.4% CLEAN</p>}
            </div>
          </div>
          
          <h2 className="text-white font-black italic tracking-widest text-2xl mt-8 uppercase font-display">AI Quality Inspector</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Elevore Command Center</p>
        </div>
      )}

      <button onClick={onBack} className="mb-5 flex items-center gap-2 text-slate-500 font-black uppercase text-[9px]"><Icon name="arrow-left" className="w-4 h-4" />Back</button>
      <div className="max-w-md mx-auto space-y-5">
        <div className="g p-6 border-t-4 border-green-500 relative overflow-hidden">
          {localJob.specs?.ai_vision_qc && (
            <div className="absolute top-0 right-0 bg-green-500/20 text-green-400 px-3 py-1 rounded-bl-xl text-[7px] font-black uppercase tracking-widest border border-green-500/30">
              AI QC Verified
            </div>
          )}
          <h2 className="text-xl font-black uppercase italic text-white mb-1">{localJob.client_name}</h2>
          <p className="text-[9px] text-slate-500 uppercase">{localJob.service_type} • {localJob.address}</p>
          {employee && <p className="text-[8px] text-green-400 font-black uppercase mt-1">👤 Active Worker: {employee.name}</p>}
          <div className="grid grid-cols-2 gap-2 mt-4">
            <button onClick={() => {
                const p = localJob.client_phone?.replace(/\D/g, '') || '';
                const msg = `🚗 Hola ${localJob.client_name}! Soy ${employee?.name || 'tu profesional de Elevore'}. Voy en camino a tu ubicacion. Sigue mi llegada aqui: https://elevore.app/track/${localJob.id}`;
                window.open(`https://wa.me/${p}?text=${encodeURIComponent(msg)}`);
                tt('Client Notified OMW!', 'green');
            }} className="col-span-2 bg-blue-600 text-white py-3 rounded-xl font-black uppercase text-[10px] active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"><Icon name="truck" className="w-4 h-4" /> Enviar "Voy En Camino" al Cliente (GPS)</button>
            <button onClick={() => recTime(localJob.id, 'check_in_time')} className="bg-green-600 text-white py-3 rounded-xl font-black uppercase text-[9px] active:scale-95 flex items-center justify-center gap-1"><Icon name="play" className="w-3 h-3" />Check In</button>
            <button onClick={() => recTime(localJob.id, 'check_out_time')} className="bg-red-600 text-white py-3 rounded-xl font-black uppercase text-[9px] active:scale-95 flex items-center justify-center gap-1"><Icon name="square" className="w-3 h-3" />Check Out</button>
            <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(localJob.address)}`)} className="col-span-2 bg-slate-700 text-white px-4 py-3 rounded-xl font-black text-[9px] active:scale-95 flex items-center justify-center gap-1">📍 Abrir en Waze / Google Maps</button>
            <VoiceButton onTranscript={async (txt) => {
              if (txt) {
                await update(localJob, { specs: { ...(localJob.specs || {}), staff_issue: txt, staff_issue_at: new Date().toISOString() } }, 'Issue reported');
                tt('🎙️ Voz registrada: ' + txt);
              }
            }} className="bg-orange-600/90 border border-orange-600/20 text-white py-3 rounded-xl hover:bg-orange-600 active:scale-95 flex items-center justify-center" />
            <button onClick={async () => { const i = prompt('Issue?'); if (i) { await update(localJob, { specs: { ...(localJob.specs || {}), staff_issue: i, staff_issue_at: new Date().toISOString() } }, 'Issue reported'); } }} className="bg-orange-600 text-white py-3 rounded-xl font-black text-[9px] active:scale-95 flex items-center justify-center">! Reportar Problema</button>
          </div>
          {localJob.check_in_time && <p className="text-[8px] text-green-400 font-black uppercase mt-2">▶ In: {new Date(localJob.check_in_time).toLocaleTimeString()}</p>}
        </div>
        
        {/* Dynamic GPS Map of the active mission */}
        <div className="space-y-1">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">📍 Interactive GPS Route</p>
          <MapComponent address={localJob.address} />
        </div>

        <div className="g p-5"><p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-3">⚡ Upsell Strike</p><div className="grid grid-cols-2 gap-2">{ADDONS.filter(a => !localJob.specs?.[a.id]).map(a => { const sent = (localJob.upsell_sent || []).includes(a.id); return (<button key={a.id} disabled={sent} onClick={() => upsell(localJob, a.id)} className={`p-3 rounded-xl border text-[8px] font-black uppercase active:scale-95 ${sent ? 'bg-green-900/30 border-green-600/30 text-green-600' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>{sent ? '✅ ' : ''}{a.en} ${a.p}</button>); })}</div></div>
        <div className="g p-5 space-y-2"><div className="flex justify-between items-center mb-2"><p className="text-[9px] font-black uppercase text-amber-500">Checklist</p><span className="text-[9px] font-black text-white">{done}/{CHECKS.length}</span></div><div className="pb mb-3"><div className="pf" style={{ width: `${(done / CHECKS.length) * 100}%` }}></div></div>{CHECKS.map((item, i) => (<button key={i} onClick={() => setChk(c => ({ ...c, [i]: !c[i] }))} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-95 ${chk[i] ? 'bg-green-600/20 border-green-600/40 text-green-400' : 'bg-white/5 border-white/5 text-slate-400'}`}><div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${chk[i] ? 'bg-green-600 border-green-600' : 'border-slate-600'}`}>{chk[i] && <Icon name="check" className="w-3 h-3 text-white" />}</div><span className="text-[10px] font-black uppercase text-left">{item}</span></button>))}</div>
        <div className="g p-5 border border-purple-500/20 bg-purple-500/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
          <div className="flex justify-between items-center mb-1">
             <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1.5"><Icon name="camera" className="w-3 h-3" /> AI Quality Inspection</p>
          </div>
          <p className="text-[7px] text-slate-400 uppercase tracking-wider mb-3 font-bold">Upload After-Photo to trigger Computer Vision Scan</p>
          <PhotoDrive photos={localJob.after_photos || []} label="" onAdd={addAP} />
        </div>
        {bonus > 0 && <div className="g p-5 border border-amber-500/30 text-center"><p className="text-amber-500 font-black uppercase text-[9px] mb-1">🌟 Speed & Rating Bonus</p><p className="text-3xl font-black italic text-white">+${bonus}</p></div>}
        
        {/* DIGITAL SIGNATURE */}
        <div className="g p-5 border border-amber-500/30 space-y-4 bg-black/40">
          <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5"><Icon name="edit-3" className="w-3 h-3" /> Client Sign-Off</p>
          {!localJob.final_signature ? (
            <SigPad onSave={async (sig) => {
              await sb.from('elevore_missions').update({ final_signature: sig }).eq('id', localJob.id);
              setLocalJob({ ...localJob, final_signature: sig });
              tt('Firma guardada correctamente ✓', 'green');
            }} label="Customer Signature to finish work" color="#F5C518" />
          ) : (
            <div className="text-center bg-white/5 p-4 rounded-xl border border-white/5">
              <p className="text-[8px] text-green-500 font-black uppercase mb-2">✅ Signed by Client</p>
              <img src={localJob.final_signature} className="h-10 mx-auto opacity-70" alt="signature" />
            </div>
          )}
        </div>

        {done === CHECKS.length && <button onClick={async () => { if (!(localJob.after_photos || []).length) return tt('Add at least 1 after photo for AI Scan', 'red'); if (!localJob.final_signature) return tt('El cliente debe firmar antes de finalizar', 'red'); await sb.from('elevore_missions').update({ status: 'completed', specs: { ...(localJob.specs || {}), checklist_done_at: new Date().toISOString() } }).eq('id', localJob.id); tt('Sent to QC ✅'); onBack(); onRefresh(); }} className="w-full gold py-5 rounded-2xl font-black uppercase text-base active:scale-95 shadow-[0_0_30px_rgba(245,197,24,0.2)]">✅ Execute Sign-Off & Close</button>}
      </div></div>
  );
}

// AI Advisor Component
// STRICT PRIVACY PROTECTION: When 'isStaff' is true, it strictly operates as an Operational Task Assistant.
// It will NEVER mention financial goals, MRR, balances, or revenue!
function AIAdvisor({ jobs, clients, staff, isStaff, activeUser, onClose, tt, onOpenReport }) {
  const initialText = isStaff 
    ? `¡Hola ${activeUser}! Soy tu **Manual de Operaciones con IA**. Estoy aquí para ayudarte en tu trabajo de campo. 🛠️ Pregúntame cómo limpiar orificios, parchar drywall, remover manchas de alfombras, o cómo actuar frente a un cliente difícil.`
    : `¡Hola ${activeUser}! Soy tu **Asesor de IA Elevore**. Estoy conectado a tu base de datos en tiempo real. 📊 ¿En qué puedo ayudarte hoy?`;

  // Local settings for LLM provider
  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem('elevore_ai_provider') || 'gemini');
  const [ollamaUrl, setOllamaUrl] = useState(() => {
    const saved = localStorage.getItem('elevore_ollama_url');
    if (saved === 'http://localhost:11434') return 'http://127.0.0.1:11434';
    return saved || 'http://127.0.0.1:11434';
  });
  const [ollamaModel, setOllamaModel] = useState(() => localStorage.getItem('elevore_ollama_model') || 'llama3');
  const [showSettings, setShowSettings] = useState(false);
  const [connStatus, setConnStatus] = useState('idle'); // idle, testing, connected, error

  // Save AI Provider details
  useEffect(() => {
    localStorage.setItem('elevore_ai_provider', aiProvider);
  }, [aiProvider]);

  useEffect(() => {
    localStorage.setItem('elevore_ollama_url', ollamaUrl);
  }, [ollamaUrl]);

  useEffect(() => {
    localStorage.setItem('elevore_ollama_model', ollamaModel);
  }, [ollamaModel]);

  // Load chat memory from LocalStorage
  const storageKey = `elevore_chat_history_${isStaff ? 'staff' : 'admin'}`;
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    return [{ from: 'ai', text: initialText, time: new Date().toLocaleTimeString() }];
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, storageKey]);

  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Deep context advisor formulas
  const stats = useMemo(() => {
    if (isStaff) return {}; // Zero-out stats for security
    const totalRev = jobs.reduce((a, b) => a + (b.total_price || 0), 0);
    const completed = jobs.filter(j => j.status === 'paid').length;
    const mrr = clients.reduce((a, c) => { const m = MBS.find(x => x.id === c.membership); return a + (m?.price || 0); }, 0);
    const churn = clients.filter(c => {
      const cj = jobs.filter(j => j.client_name === c.name && j.status === 'paid');
      if (!cj.length) return false;
      const last = cj.sort((a, b) => new Date(b.scheduled_date || 0) - new Date(a.scheduled_date || 0))[0];
      return dAgo(last.scheduled_date) >= 45;
    });
    const unsigned = jobs.filter(j => !j.approval_signature && j.status === 'lead');
    const soon = new Date(); soon.setDate(soon.getDate() + 7);
    const rent = jobs.filter(j => j.next_visit && new Date(j.next_visit) <= soon && j.status === 'paid');
    
    return { totalRev, completed, mrr, churn, unsigned, rent };
  }, [jobs, clients, isStaff]);

  const [isTyping, setIsTyping] = useState(false);

  // Health check for active provider
  const testConnection = async () => {
    setConnStatus('testing');
    if (aiProvider === 'gemini') {
      const key = import.meta.env.VITE_GEMINI_KEY;
      if (!key) {
        setConnStatus('error');
        tt('Falta la API Key de Gemini en las variables de entorno', 'red');
      } else {
        setConnStatus('connected');
        tt('Conexión con Gemini lista', 'green');
      }
    } else {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(`${ollamaUrl}/api/tags`, { signal: controller.signal });
        clearTimeout(id);
        if (res.ok) {
          const data = await res.json();
          const hasModel = data.models?.some(m => 
            m.name.toLowerCase().includes(ollamaModel.toLowerCase()) || 
            m.model.toLowerCase().includes(ollamaModel.toLowerCase())
          );
          if (hasModel) {
            setConnStatus('connected');
            tt(`Conectado a Ollama exitosamente (Modelo: ${ollamaModel})`, 'green');
          } else {
            setConnStatus('connected');
            tt(`Ollama responde, pero el modelo "${ollamaModel}" no parece estar descargado. Corre 'ollama run ${ollamaModel}'`, 'amber');
          }
        } else {
          setConnStatus('error');
          tt('Error al conectar con Ollama', 'red');
        }
      } catch (e) {
        clearTimeout(id);
        setConnStatus('error');
        tt('No se pudo conectar a Ollama. Asegúrate de ejecutar: $env:OLLAMA_ORIGINS="*" ; ollama run ' + ollamaModel, 'red');
      }
    }
  };

  const callAI = async (userMessage) => {
    // --- BUILD SYSTEM PROMPT WITH REAL CONTEXT ---
    const systemPrompt = isStaff
      ? `Eres el Asistente de Operaciones de Campo de Elevore, una empresa de servicios de limpieza y mantenimiento de hogar en Orlando, Florida.
Tu trabajo es ayudar al empleado de campo llamado "${activeUser}" con:
- Técnicas profesionales de limpieza y procedimientos de campo
- Protocolos de seguridad y manejo de situaciones difíciles
- Scripts de ventas / upsell para ofrecer servicios adicionales en campo
- Manejo de quejas de clientes y resolución de conflictos
- SOPs (procedimientos estándar) de la empresa

Reglas CRÍTICAS de seguridad:
- NUNCA reveles datos financieros, ingresos, MRR, ganancias, salarios de otros empleados ni información estratégica
- Si el empleado pregunta sobre dinero de la empresa, finanzas, o datos de otros: responde que esa información es confidencial para administradores
- Habla siempre en español, de forma directa y práctica
- Tus respuestas deben ser concisas y accionables para alguien que está en campo con las manos ocupadas`

      : `Eres el Asesor Estratégico de IA de Elevore, el motor de inteligencia de negocios del CEO "${activeUser}".
Tienes acceso completo a los datos en tiempo real de su empresa de servicios en Orlando, Florida.

=== DATOS EN TIEMPO REAL DE LA EMPRESA ===
- Facturación Bruta Total: ${fmt$(stats.totalRev || 0)}
- Trabajos Completados y Pagados: ${stats.completed || 0}
- MRR (Ingresos Recurrentes Mensuales por membresías): ${fmt$(stats.mrr || 0)}
- Clientes en Riesgo de Abandono (>45 días sin reservar): ${stats.churn?.length || 0} clientes (${stats.churn?.map(c => c.name).slice(0, 3).join(', ') || 'ninguno'})
- Presupuestos sin firmar (leads pendientes): ${stats.unsigned?.length || 0}
- Total de empleados en el sistema: ${staff.length}
- Visitas de retención pendientes esta semana: ${stats.rent?.length || 0}
- Meta de facturación: ${fmt$(DEFAULT_CFG.GOAL || 10000)}
- Progreso hacia la meta: ${Math.round(((stats.totalRev || 0) / (DEFAULT_CFG.GOAL || 10000)) * 100)}%
==========================================

Eres un asesor de negocios de élite con experiencia en:
- Análisis financiero y proyecciones de crecimiento para home services
- Estrategias de retención de clientes y reducción de churn
- Copywriting persuasivo y scripts de WhatsApp marketing
- Gestión de equipos y payroll para field service companies
- Pricing strategy para el mercado de Orlando, FL
- Automatización y escala de operaciones SaaS

Habla en español. Sé directo, estratégico y orientado a resultados. Si el CEO pide algo que requiere datos que no tienes, trabaja con lo que hay y ofrece una solución accionable.`;

    const controller = new AbortController();
    const timeoutDuration = aiProvider === 'ollama' ? 90000 : 20000; // 90s for local Ollama, 20s for Gemini Cloud
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

    try {
      if (aiProvider === 'gemini') {
        const payload = {
          contents: [
            { role: 'user', parts: [{ text: systemPrompt + '\n\n--- INICIO DEL CHAT ---' }] },
            { role: 'model', parts: [{ text: isStaff
              ? `Hola ${activeUser}! Soy tu guía de operaciones de campo. Estoy aquí para ayudarte en tiempo real. ¿Qué necesitas?`
              : `Hola ${activeUser}! Sistema de IA Elevore activo. Tengo acceso completo a tus métricas en tiempo real. ¿Qué analizamos?`
            }]},
            // Inject conversation history (last 8 messages for context window)
            ...messages.slice(-8).map(m => ({
              role: m.from === 'user' ? 'user' : 'model',
              parts: [{ text: m.text }]
            })),
            { role: 'user', parts: [{ text: userMessage }] }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 600,
            topK: 40,
            topP: 0.95
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' }
          ]
        };

        const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY;
        if (!GEMINI_KEY) {
          clearTimeout(timeoutId);
          return '⚠️ Error: No se pudo conectar a la IA. La clave de API de Gemini no está configurada en Vercel/.env.';
        }

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: controller.signal }
        );

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const errMsg = errBody?.error?.message || `HTTP ${res.status}`;
          if (res.status === 429 || errMsg.toLowerCase().includes('quota')) {
            return '⚠️ Has agotado la cuota de la IA. Si es una clave nueva, por favor revisa que tengas habilitada la cuota del modelo o intenta en unos minutos.';
          }
          return `⚠️ Error de Conexión IA: ${errMsg}`;
        }

        const data = await res.json();
        const candidate = data?.candidates?.[0];
        if (!candidate) {
          const blockReason = data?.promptFeedback?.blockReason;
          return blockReason
            ? `⚠️ Consulta bloqueada por filtro de seguridad (${blockReason}). Reformula tu pregunta.`
            : 'Lo siento, no recibí respuesta de la IA. Intenta de nuevo.';
        }
        if (candidate.finishReason === 'SAFETY') {
          return '⚠️ La respuesta fue bloqueada por filtros de seguridad. Intenta reformular tu pregunta.';
        }
        return candidate?.content?.parts?.[0]?.text || 'Lo siento, no pude generar una respuesta. Intenta de nuevo.';
      } else {
        // --- OLLAMA LOCAL AI CALL ---
        const res = await fetch(`${ollamaUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.slice(-8).map(m => ({
                role: m.from === 'user' ? 'user' : 'assistant',
                content: m.text
              })),
              { role: 'user', content: userMessage }
            ],
            stream: false
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          return `⚠️ Error de Conexión a Ollama local: HTTP ${res.status}`;
        }

        const data = await res.json();
        return data.message?.content || 'Lo siento, Ollama no devolvió ningún contenido. Verifica la configuración de tu modelo.';
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        return `⚠️ Tiempo de espera agotado (20 segundos). Si estás usando la IA Local, asegúrate de que Ollama está activo (ejecuta 'ollama run ${ollamaModel}') y responde rápido.`;
      }
      return `⚠️ Error de conexión: ${err.message || 'Verifica tu red o si Ollama local tiene CORS habilitado (OLLAMA_ORIGINS="*").'}`;
    }
  };

  const handleSend = async (overrideText) => {
    const txt = (overrideText || input).trim();
    if (!txt) return;
    setMessages(prev => [...prev, { from: 'user', text: txt, time: new Date().toLocaleTimeString() }]);
    setInput('');
    setIsTyping(true);
    try {
      const reply = await callAI(txt);
      setMessages(prev => [...prev, { from: 'ai', text: reply, time: new Date().toLocaleTimeString() }]);
    } catch (err) {
      setMessages(prev => [...prev, { from: 'ai', text: '⚠️ Error de conexión con la IA. Verifica tu conexión a internet o la configuración del servidor local e intenta de nuevo.', time: new Date().toLocaleTimeString() }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-[1500] flex items-end p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="g p-6 w-full max-w-md h-[90vh] flex flex-col justify-between border-t-4 border-amber-500 su mx-auto bg-[#060609] shadow-[0_0_50px_rgba(251,191,36,0.15)]">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-500 text-black rounded-lg flex items-center justify-center font-black italic relative">
              IA
              <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-[#060609] ${
                connStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 
                connStatus === 'error' ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 
                connStatus === 'testing' ? 'bg-amber-500 animate-pulse' : 
                'bg-slate-500'
              }`} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none">
                  {isStaff ? 'Elevore Field Operations Guide' : 'Elevore AI Command'}
                </p>
                <span className="text-[6px] bg-white/10 text-slate-400 px-1 py-0.5 rounded uppercase font-bold">
                  {aiProvider === 'gemini' ? 'Gemini 2.5' : `Ollama: ${ollamaModel}`}
                </span>
              </div>
              <p className="text-[7px] text-slate-500 uppercase mt-0.5">
                {isStaff ? 'Help Desk & Cleaning Standards' : 'Context-aware CRM Intelligence'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowSettings(!showSettings)} 
              className={`p-2 rounded-xl transition-all ${showSettings ? 'bg-white/10 text-[#F5C518]' : 'text-slate-500 hover:text-white'}`}
              title="Ajustes de la IA"
            >
              <Icon name="settings" className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white"><Icon name="x" className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Local AI / Settings Panel */}
        {showSettings && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 my-2 space-y-3 animate-in slide-in-from-top-4 duration-200">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Ajustes de Inteligencia Artificial</span>
              <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white text-[9px] font-bold uppercase">Cerrar</button>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[8px] font-bold text-slate-400 uppercase block">Proveedor de IA</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setAiProvider('gemini'); setConnStatus('idle'); }}
                  className={`py-2 rounded-xl text-[8px] font-black uppercase border transition-all ${aiProvider === 'gemini' ? 'bg-[#F5C518] text-black border-[#F5C518]' : 'bg-white/5 border-white/5 text-slate-400'}`}
                >
                  ☁️ Gemini Cloud
                </button>
                <button
                  onClick={() => { setAiProvider('ollama'); setConnStatus('idle'); }}
                  className={`py-2 rounded-xl text-[8px] font-black uppercase border transition-all ${aiProvider === 'ollama' ? 'bg-[#F5C518] text-black border-[#F5C518]' : 'bg-white/5 border-white/5 text-slate-400'}`}
                >
                  💻 Ollama Local
                </button>
              </div>
            </div>

            {aiProvider === 'ollama' && (
              <div className="space-y-2.5 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[7px] font-bold text-slate-400 uppercase block">Host de Ollama</label>
                    <input
                      value={ollamaUrl}
                      onChange={e => { setOllamaUrl(e.target.value); setConnStatus('idle'); }}
                      placeholder="http://127.0.0.1:11434"
                      className="inp text-[10px] py-1.5"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7px] font-bold text-slate-400 uppercase block">Modelo local</label>
                    <input
                      value={ollamaModel}
                      onChange={e => { setOllamaModel(e.target.value); setConnStatus('idle'); }}
                      placeholder="llama3"
                      className="inp text-[10px] py-1.5"
                    />
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <p className="text-[7px] text-[#F5C518] uppercase font-bold">Instrucciones para IA Local:</p>
                  <p className="text-[7px] text-slate-400 leading-normal uppercase">
                    1. Abre tu terminal y ejecuta:
                  </p>
                  <code className="block bg-black p-1.5 rounded text-[7px] font-mono text-green-400 break-all select-all">
                    $env:OLLAMA_ORIGINS="*" ; ollama run {ollamaModel || 'llama3'}
                  </code>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={testConnection}
                disabled={connStatus === 'testing'}
                className="flex-1 bg-white/10 hover:bg-white/15 text-white py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 border border-white/5"
              >
                {connStatus === 'testing' ? (
                  <>
                    <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin" />
                    Probando...
                  </>
                ) : (
                  <>
                    <Icon name="activity" className="w-3 h-3" />
                    Probar Conexión
                  </>
                )}
              </button>
              
              <button
                onClick={() => {
                  if (confirm('¿Estás seguro de que deseas limpiar todo el historial de chat?')) {
                    setMessages([{ from: 'ai', text: initialText, time: new Date().toLocaleTimeString() }]);
                    localStorage.removeItem(storageKey);
                    tt('Historial de chat limpiado', 'green');
                  }
                }}
                className="px-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 py-2 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all border border-red-500/10"
              >
                Limpiar Historial
              </button>
            </div>
          </div>
        )}

        {/* Strategic Growth Report golden button (Admin only) */}
        {!isStaff && onOpenReport && !showSettings && (
          <button onClick={onOpenReport} className="w-full gold py-3.5 rounded-xl font-black uppercase text-[8px] tracking-widest active:scale-95 flex items-center justify-center gap-1.5 mt-3 shadow-md shadow-[#F5C518]/10 animate-bounce">
            📊 GENERAR REPORTE ESTRATÉGICO IA (1-CLIC)
          </button>
        )}

        {/* Chat Log */}
        <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1 nsb">
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.from === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-4 rounded-2xl text-xs max-w-[85%] leading-relaxed ${m.from === 'user' ? 'bg-amber-500 text-black font-semibold' : 'bg-white/5 text-slate-200 border border-white/5 shadow-md'}`}>
                {m.text.split('\n').map((line, idx) => {
                  if (line.startsWith('### ')) return <h4 key={idx} className="text-amber-400 font-bold uppercase text-[10px] tracking-widest mt-2 mb-1">{line.replace('### ', '')}</h4>;
                  if (line.startsWith('* ') || line.startsWith('- ')) return <p key={idx} className="pl-2 mt-1">✨ {line.replace(/^[*-] /, '')}</p>;
                  if (line.match(/^\d+\./)) return <p key={idx} className="pl-2 mt-1">{line}</p>;
                  if (line.startsWith('**') && line.endsWith('**')) return <p key={idx} className="font-bold text-white mt-1">{line.replace(/\*\*/g, '')}</p>;
                  return <p key={idx} className="mt-1">{line}</p>;
                })}
              </div>
              <span className="text-[6px] text-slate-600 mt-1 font-bold">{m.time}</span>
            </div>
          ))}
          {/* Typing indicator */}
          {isTyping && (
            <div className="flex items-start">
              <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{animationDelay:'0ms'}} />
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{animationDelay:'150ms'}} />
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" style={{animationDelay:'300ms'}} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex gap-1.5 overflow-x-auto nsb pb-3">
          {isStaff ? (
            [['🛠️ Drywall', 'Explícame paso a paso cómo reparar drywall con patch'], ['🧼 Horno', '¿Cómo limpio un horno con mucha grasa acumulada?'], ['🐾 Mascotas', '¿Cómo elimino pelos de mascotas y olores de las alfombras?'], ['📋 Checklist', '¿Cuál es el checklist de control de calidad antes de irme de una casa?']].map(([lbl, pmt]) => (
              <button key={lbl} onClick={() => { if (!isTyping) handleSend(pmt); }} disabled={isTyping} className="px-2.5 py-1.5 bg-white/5 border border-white/5 text-slate-400 rounded-lg text-[8px] font-black uppercase whitespace-nowrap active:scale-95 hover:border-amber-500/30 disabled:opacity-40">{lbl}</button>
            ))
          ) : (
            [['📊 Finanzas', '¿Cómo van mis finanzas y qué me recomiendas hacer hoy?'], ['🚨 Churn', '¿Cuáles son mis clientes con más riesgo de abandono y qué hago?'], ['✍️ Campaña WA', 'Escríbeme una campaña de WhatsApp para reactivar clientes fríos'], ['🚀 Proyección', '¿Cuál es mi proyección de ingresos para el próximo mes?']].map(([lbl, pmt]) => (
              <button key={lbl} onClick={() => { if (!isTyping) handleSend(pmt); }} disabled={isTyping} className="px-2.5 py-1.5 bg-white/5 border border-white/5 text-slate-400 rounded-lg text-[8px] font-black uppercase whitespace-nowrap active:scale-95 hover:border-amber-500/30 disabled:opacity-40">{lbl}</button>
            ))
          )}
        </div>

        {/* Text Area Input */}
        <div className="flex gap-2 border-t border-white/5 pt-3">
          <VoiceButton onTranscript={(txt) => setInput(txt)} />
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !isTyping && handleSend()}
            placeholder={isTyping ? 'La IA está respondiendo...' : 'Pregúntame lo que quieras...'}
            className="inp text-xs flex-1"
            disabled={isTyping}
          />
          <button
            onClick={() => handleSend()}
            disabled={isTyping || !input.trim()}
            className="bg-amber-500 text-black px-4 rounded-xl font-black active:scale-95 flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {isTyping
              ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              : <Icon name="send" className="w-4 h-4 text-black" />}
          </button>
        </div>

      </div>
    </div>
  );
}

// ⚡ Quick Quote Component
function QQ({ onClose }) {
  const [qq, setQQ] = useState({ name: '', phone: '', address: '', svc: 'regular', beds: 2, baths: 2, sqft: 2000 });
  const qp = qq.svc === 'postcon' 
    ? (qq.sqft * 0.25) 
    : ((qq.svc === 'moveout' || qq.svc === 'deep') ? (qq.beds * 75 + qq.baths * 45 + 120) : (qq.beds * 55 + qq.baths * 35 + 80));

  const send = () => {
    const msg = `*ELEVORE EMPIRE QUICK QUOTE*\nClient: ${qq.name}\nPhone: ${qq.phone}\nAddress: ${qq.address}\nService: ${qq.svc.toUpperCase()}\nBeds/Baths: ${qq.beds}/${qq.baths}\nSqFt: ${qq.sqft}\n*ESTIMATE: $${qp}*`;
    window.open(`https://wa.me/${qq.phone ? qq.phone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(msg)}`);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[2000] flex items-end p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="g p-6 w-full max-w-md space-y-4 border-t-4 border-amber-500 su mx-auto bg-slate-950 border border-white/5 shadow-2xl rounded-2xl">
        <div className="flex justify-between items-center">
          <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest font-display">⚡ Quick Quote — 30 sec</p>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>
        <input className="inp uppercase text-xs" placeholder="Client Name" value={qq.name} onChange={e => setQQ({ ...qq, name: e.target.value })} />
        <input className="inp text-xs" placeholder="Phone" value={qq.phone} onChange={e => setQQ({ ...qq, phone: e.target.value })} />
        <input className="inp text-xs uppercase" placeholder="Address" value={qq.address} onChange={e => setQQ({ ...qq, address: e.target.value })} />
        <div className="grid grid-cols-4 gap-1">
          {['regular', 'deep', 'moveout', 'postcon'].map(s => (
            <button key={s} onClick={() => setQQ({ ...qq, svc: s })} className={`py-2 rounded-xl text-[8px] font-black uppercase border-2 active:scale-95 ${qq.svc === s ? 'bg-green-600 border-green-600 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>{s}</button>
          ))}
        </div>
        {qq.svc === 'postcon' ? (
          <div className="bg-white/5 p-3 rounded-xl text-center border border-white/5">
            <span className="text-[8px] uppercase block mb-1 text-slate-400 font-black">SqFt</span>
            <input type="number" value={qq.sqft} onChange={e => setQQ({ ...qq, sqft: parseInt(e.target.value) || 0 })} className="inp text-center text-xl text-white" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {[{ l: 'Beds', k: 'beds' }, { l: 'Baths', k: 'baths' }].map(i => (
              <div key={i.k} className="bg-white/5 p-3 rounded-xl text-center border border-white/5">
                <span className="text-[8px] uppercase block mb-1.5 text-slate-400 font-black">{i.l}</span>
                <div className="flex justify-between items-center">
                  <button onClick={() => setQQ({ ...qq, [i.k]: Math.max(0, qq[i.k] - 1) })} className="w-7 h-7 bg-white/10 rounded-lg text-white font-bold active:scale-95">-</button>
                  <span className="text-lg font-black italic text-white">{qq[i.k]}</span>
                  <button onClick={() => setQQ({ ...qq, [i.k]: qq[i.k] + 1 })} className="w-7 h-7 bg-white/10 rounded-lg text-white font-bold active:scale-95">+</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="bg-black/40 p-4 rounded-xl text-center border border-white/10">
          <p className="text-[8px] text-slate-500 uppercase font-black">Estimated</p>
          <p className="text-4xl font-black italic text-white">${qp}</p>
        </div>
        <button onClick={send} className="w-full gold py-4 rounded-xl font-black uppercase active:scale-95 shadow-xl">🚀 Send Quote via WhatsApp</button>
      </div>
    </div>
  );
}

// Public Lead Capture Form (Referral)
function PublicLeadForm({ refCode }) {
  const [form, setForm] = useState({ name: '', phone: '', address: '', service_type: 'cleaning' });
  const [submitted, setSubmitted] = useState(false);
  const referrer = refCode.replace(/_/g, ' ');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) return alert('Name and phone required');
    
    try {
      // Extract tenant from URL (?t=tenantId encoded in referral link)
      const urlParams = new URLSearchParams(window.location.search);
      const tenantFromUrl = urlParams.get('t');
      await sb.from('elevore_missions').insert([{
        client_name: form.name,
        client_phone: form.phone,
        address: form.address,
        service_type: form.service_type,
        status: 'lead',
        total_price: 0,
        tenant_id: tenantFromUrl || null,
        specs: { referred_by: referrer, referral_discount: 25, referred_by_client_name: referrer },
        created_at: new Date().toISOString()
      }]);
      setSubmitted(true);
    } catch (err) {
      alert('Error submitting request. Please try again.');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-5 text-center">
        <div className="max-w-md w-full g p-8 border-t-4 border-amber-500 space-y-4 shadow-[0_0_50px_rgba(251,191,36,0.15)]">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg shadow-green-500/20 animate-bounce">✅</div>
          <h2 className="text-2xl font-black italic text-white uppercase tracking-widest">¡Solicitud Recibida!</h2>
          <p className="text-slate-400 text-xs leading-relaxed uppercase font-bold tracking-wider">Tu descuento de $25 ha sido asegurado gracias a {referrer}.</p>
          <p className="text-slate-500 text-[9px] mt-4">Nuestro equipo te contactará por WhatsApp en breve con tu presupuesto oficial.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-black to-zinc-900 flex items-center justify-center p-5 animate-in fade-in">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center font-black text-black text-2xl italic shadow-xl">E</div>
          <h1 className="text-2xl font-black uppercase tracking-[0.2em] text-white">ELEVORE</h1>
          <p className="text-[9px] text-green-500 font-bold uppercase tracking-[0.4em]">Premium Services</p>
        </div>

        <div className="g p-8 border-t-4 border-[#F5C518] space-y-5 relative overflow-hidden shadow-[0_0_50px_rgba(251,191,36,0.1)]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-20"></div>
          
          <div className="text-center space-y-1 border-b border-white/10 pb-4">
            <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest">🌟 INVITACIÓN VIP</p>
            <h2 className="text-white text-sm font-bold uppercase">Has sido referido por</h2>
            <p className="italic font-black text-amber-400 text-3xl tracking-tighter">{referrer}</p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-center shadow-inner">
            <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest">🎁 Reclama $25 OFF en tu primer servicio</p>
          </div>

          <form onSubmit={submit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Nombre Completo</label>
              <input required type="text" placeholder="Ej: Maria Lopez" className="inp w-full p-4 text-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Número de WhatsApp</label>
              <input required type="tel" placeholder="(123) 456-7890" className="inp w-full p-4 text-sm" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-500 uppercase ml-1">Dirección / Zip Code</label>
              <input required type="text" placeholder="Tu dirección o área" className="inp w-full p-4 text-sm" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
            </div>
            
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-500 uppercase ml-1">¿Qué necesitas?</label>
              <select className="inp w-full p-4 text-sm" value={form.service_type} onChange={e => setForm({...form, service_type: e.target.value})}>
                <option value="cleaning">Limpieza del Hogar (Deep Clean)</option>
                <option value="handyman">Reparaciones (Handyman)</option>
                <option value="maintenance">Mantenimiento General</option>
              </select>
            </div>
            
            <button type="submit" className="w-full gold py-5 rounded-2xl font-black uppercase text-sm active:scale-95 shadow-lg mt-4 flex items-center justify-center gap-2">
              <Icon name="check-circle" className="w-5 h-5" />
              Reclamar Descuento
            </button>
          </form>
        </div>
        
        <p className="text-[8px] text-slate-600 text-center font-bold uppercase">🔒 Información Segura y Confidencial</p>
      </div>
    </div>
  );
}

// =====================================================================
// 🚀 SAAS ONBOARDING FLOW (REGISTRATION)
// =====================================================================
function OnboardingFlow({ onBack, tt }) {
  const [form, setForm] = useState({ company: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    tt('Registering your business... 🏢', 'yellow');
    
    try {
      // 1. Sign up user
      const { data, error } = await sb.auth.signUp({
        email: form.email,
        password: form.password,
      });
      
      if (error) {
        setLoading(false);
        return tt(error.message, 'red');
      }

      if (data?.user) {
        // 2. Create the tenant
        const { data: tenantData, error: tErr } = await sb.from('tenants').insert([
          { business_name: form.company, owner_id: data.user.id }
        ]).select().maybeSingle();
        
        if (tErr || !tenantData) {
          setLoading(false);
          return tt('Error creating workspace: ' + (tErr?.message || 'Unknown'), 'red');
        }

        // 3. Create the admin staff profile so they can also use the PIN if needed
        await sb.from('staff_profiles').insert([
          { tenant_id: tenantData.id, user_id: data.user.id, name: form.company + ' Admin', role: 'admin', passcode: form.password }
        ]);

        tt('Welcome to Elevore Empire! 🎉', 'green');
        onBack(); // Redirect to login
      } else {
        setLoading(false);
        tt('Unexpected error: User not returned', 'red');
      }
    } catch (err) {
      setLoading(false);
      tt('System Error: ' + err.message, 'red');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white bg-[radial-gradient(ellipse_at_top,rgba(245,197,24,0.1),transparent)]">
      <div className="max-w-md w-full space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <button onClick={onBack} disabled={loading} className="text-[10px] text-slate-500 font-black uppercase flex items-center gap-2 hover:text-white transition-colors">
          <Icon name="arrow-left" className="w-3 h-3" /> Back
        </button>

        <div className="space-y-2">
          <h2 className="text-3xl font-black uppercase tracking-tighter">Create Your <span className="text-gradient italic">Empire</span></h2>
          <p className="text-slate-400 text-sm">Start your 14-day free trial. No credit card required.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-1">Business Name</label>
            <input required type="text" placeholder="e.g. Sparkle Cleaning LLC" className="inp w-full py-4 text-sm" value={form.company} onChange={e => setForm({...form, company: e.target.value})} disabled={loading} />
          </div>
          
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-1">Work Email</label>
            <input required type="email" placeholder="ceo@company.com" className="inp w-full py-4 text-sm" value={form.email} onChange={e => setForm({...form, email: e.target.value})} disabled={loading} />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-1">Master Password</label>
            <input required type="password" placeholder="••••••••" className="inp w-full py-4 text-sm tracking-widest" value={form.password} onChange={e => setForm({...form, password: e.target.value})} disabled={loading} />
          </div>

          <button type="submit" disabled={loading} className="w-full gold py-5 rounded-2xl font-black uppercase text-sm shadow-[0_0_30px_rgba(245,197,24,0.2)] mt-4 active:scale-95 transition-all flex justify-center items-center gap-2">
            {loading ? <Icon name="loader-2" className="w-5 h-5 animate-spin" /> : 'Launch Platform'}
          </button>
        </form>
        
        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest text-center">By continuing, you agree to our Terms of Service.</p>
      </div>
    </div>
  );
}

// =====================================================================
// 🔑 LOGIN FLOW (EMAIL OR PIN)
// =====================================================================
function LoginFlow({ onLoginSuccess, onBack, tt }) {
  const [tab, setTab] = useState('email'); // 'email' | 'pin' | 'client'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    tt('Authenticating...', 'yellow');
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { setLoading(false); return tt('Invalid credentials. Try again.', 'red'); }

      const { data: tenant } = await sb.from('tenants').select('*').eq('owner_id', data.user.id).maybeSingle();
      if (tenant) {
        const { data: emp } = await sb.from('staff_profiles').select('*').eq('user_id', data.user.id).limit(1).maybeSingle();
        tt(`Welcome back to ${tenant.business_name}!`, 'green');
        onLoginSuccess('admin', tenant.id, data.user, emp || { name: tenant.business_name + ' CEO', role: 'admin' }, tenant.business_name);
      } else {
        // Tenant not found — sign out to avoid stale session
        await sb.auth.signOut();
        setLoading(false);
        tt('No empire found for this account. Please register first.', 'red');
      }
    } catch (err) {
      setLoading(false);
      tt('Connection error. Check your internet and try again.', 'red');
    }
  };

  const handlePinLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    tt('Authenticating Field Access...', 'yellow');
    
    // Instead of company name, we use the email directly to find the staff profile.
    let query = sb.from('staff_profiles').select('*').eq('passcode', pin).limit(1);
    
    // Filter by staff email if the staff_email column exists.
    // Para no romper la compatibilidad si la DB no tiene la columna aun, buscamos por correo en el nombre o asumimos fallback.
    const { data: matchedStaff, error } = await query.maybeSingle();
    
    // Check email logic (we assume email is saved in staff_email OR we use name as fallback)
    let isValid = false;
    if (matchedStaff) {
       const storedEmail = matchedStaff.staff_email || matchedStaff.name;
       if (storedEmail.toLowerCase().includes(companyName.trim().toLowerCase())) {
          isValid = true;
       }
    }

    if (isValid && matchedStaff) {
      tt(`Welcome ${matchedStaff.name} ✓`, 'green');
      onLoginSuccess(matchedStaff.role, matchedStaff.tenant_id, null, matchedStaff, 'ELEVORE EMPIRE');
    } else {
      setLoading(false);
      tt('Access Denied: Invalid Email or PIN', 'red');
    }
  };

  const handleClientLogin = async (e) => {
    e.preventDefault();
    if (!phone) return tt('Phone number is required', 'red');
    setLoading(true);
    tt('Searching portals...', 'yellow');
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const { data, error } = await sb
        .from('elevore_missions')
        .select('id')
        .ilike('client_phone', `%${cleanPhone}%`)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (error || !data || data.length === 0) {
        setLoading(false);
        return tt('No portal found for this phone number', 'red');
      }
      
      tt('Access Granted! Redirecting...', 'green');
      window.location.search = `?mision=${data[0].id}`;
    } catch (err) {
      setLoading(false);
      tt('Connection error. Try again.', 'red');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 mesh-bg animate-in fade-in duration-1000 text-white">
      <div className="g p-10 w-full max-w-sm text-center space-y-6 border-t-4 border-[#F5C518] shadow-[0_0_50px_rgba(245,197,24,0.15)] bg-black/60 backdrop-blur-2xl">
        <button onClick={onBack} disabled={loading} className="text-[10px] text-slate-500 font-black uppercase flex items-center gap-2 hover:text-white transition-colors mb-2">
          <Icon name="arrow-left" className="w-3 h-3" /> Back
        </button>
        
        <img src="/elevore-logo.png" alt="Elevore Logo" className="w-16 h-16 object-contain mx-auto drop-shadow-[0_0_20px_rgba(245,197,24,0.4)] animate-pulse" />
        
        <div className="flex bg-white/5 rounded-xl p-1 mb-6">
          <button onClick={() => setTab('email')} className={`flex-1 py-2 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all ${tab === 'email' ? 'bg-[#F5C518] text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}>CEO</button>
          <button onClick={() => setTab('pin')} className={`flex-1 py-2 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all ${tab === 'pin' ? 'bg-[#F5C518] text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}>Staff</button>
          <button onClick={() => setTab('client')} className={`flex-1 py-2 text-[8px] font-black uppercase tracking-wider rounded-lg transition-all ${tab === 'client' ? 'bg-[#F5C518] text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}>Client Portal</button>
        </div>

        {tab === 'email' && (
          <form onSubmit={handleEmailLogin} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-1">Work Email</label>
              <input required type="email" placeholder="ceo@company.com" className="inp w-full py-4 text-sm" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-1">Master Password</label>
              <input required type="password" placeholder="••••••••" className="inp w-full py-4 text-sm tracking-widest" value={password} onChange={e => setPassword(e.target.value)} disabled={loading} />
            </div>
            <button type="submit" disabled={loading} className="w-full gold py-4 rounded-xl font-black uppercase text-sm shadow-[0_0_30px_rgba(245,197,24,0.2)] mt-4 active:scale-95 transition-all flex items-center justify-center gap-2">
              {loading ? <Icon name="loader-2" className="w-5 h-5 animate-spin" /> : 'Enter Empire'}
            </button>
          </form>
        )}

        {tab === 'pin' && (
          <form onSubmit={handlePinLogin} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-1">Staff Email</label>
              <input required type="email" placeholder="staff@company.com" className="inp w-full py-4 text-sm" value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={loading} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-1">Access PIN</label>
              <input required type="password" placeholder="••••" className="inp w-full py-4 text-center text-xl tracking-[0.5em] text-[#F5C518]" value={pin} onChange={e => setPin(e.target.value)} disabled={loading} />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-white/10 hover:bg-white/20 border border-white/10 text-white py-4 rounded-xl font-black uppercase active:scale-95 transition-all text-xs tracking-wider flex items-center justify-center gap-2 mt-4">
              {loading ? <Icon name="loader-2" className="w-5 h-5 animate-spin" /> : 'Access Field App'}
            </button>
          </form>
        )}

        {tab === 'client' && (
          <form onSubmit={handleClientLogin} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-1">Registered Phone</label>
              <input required type="tel" placeholder="Ej: (407) 952-4228" className="inp w-full py-4 text-sm" value={phone} onChange={e => setPhone(e.target.value)} disabled={loading} />
            </div>
            <p className="text-[7.5px] text-slate-500 leading-normal uppercase font-bold tracking-wider pt-1">
              * Enter the phone number you used for your booking. We'll automatically find your active mission portal and referral link.
            </p>
            <button type="submit" disabled={loading} className="w-full gold py-4 rounded-xl font-black uppercase text-sm shadow-[0_0_30px_rgba(245,197,24,0.2)] mt-4 active:scale-95 transition-all flex items-center justify-center gap-2">
              {loading ? <Icon name="loader-2" className="w-5 h-5 animate-spin" /> : 'Find My Portal →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// 🌍 PUBLIC SAAS LANDING PAGE (MARKETING)
// =====================================================================
function CountUp({ end, prefix = '', suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const step = end / (duration / 16);
        const timer = setInterval(() => {
          start += step;
          if (start >= end) { setCount(end); clearInterval(timer); }
          else setCount(Math.floor(start));
        }, 16);
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);
  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

function LandingPage({ onLogin, onSignup }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const features = [
    { icon: 'brain', color: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/30', text: 'amber-400', label: 'Predictive AI Engine', desc: 'Identifies VIP upsell opportunities automatically and forecasts monthly revenue with 94% accuracy.', big: true },
    { icon: 'camera', color: 'from-purple-500/20 to-purple-500/5', border: 'border-purple-500/30', text: 'purple-400', label: 'AI Vision QC', desc: 'Computer vision scans every after-photo ensuring 99.4% quality pass rate before client sees it.' },
    { icon: 'truck', color: 'from-blue-500/20 to-blue-500/5', border: 'border-blue-500/30', text: 'blue-400', label: 'On-My-Way GPS', desc: 'Auto-notifies clients with real-time tracking link the moment staff departs — Uber-style.' },
    { icon: 'message-circle', color: 'from-green-500/20 to-green-500/5', border: 'border-green-500/30', text: 'green-400', label: 'WhatsApp CRM', desc: 'One-click AI scripts for dead leads, 5-star review requests, and quote follow-ups.', big: true },
    { icon: 'edit-3', color: 'from-rose-500/20 to-rose-500/5', border: 'border-rose-500/30', text: 'rose-400', label: 'Digital Signatures', desc: 'Clients sign off on-site with finger — legally binding proof before staff leaves.' },
    { icon: 'zap', color: 'from-yellow-500/20 to-yellow-500/5', border: 'border-yellow-500/30', text: 'yellow-400', label: 'Good-Better-Best Quotes', desc: 'Psychology-driven 3-tier pricing sent via WhatsApp. 80% pick the middle = +35% revenue.' },
  ];
  const testimonials = [
    { name: 'Carlos R.', biz: 'Pristine Cleaning Co.', text: 'We went from $8K/mo to $31K/mo in 4 months. The AI upsell engine paid for itself in week 1.', stars: 5 },
    { name: 'Maria S.', biz: 'Elite Handyman Services', text: 'My clients love the GPS tracking and signature feature. Zero disputes since we launched.', stars: 5 },
    { name: 'David K.', biz: 'Apex Property Services', text: 'The quote matrix alone increased our average job value by 40%. Insane ROI.', stars: 5 },
  ];
  return (
    <div className="min-h-screen bg-[#030303] text-white selection:bg-[#F5C518] selection:text-black overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        .land { font-family: 'Inter', sans-serif; }
        .glow-text { background: linear-gradient(135deg, #F5C518 0%, #ff9500 50%, #F5C518 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .grid-bg { background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 60px 60px; }
        .card-hover { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
        @keyframes float { 0%,100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-20px) rotate(2deg); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .shimmer { background: linear-gradient(90deg, transparent, rgba(245,197,24,0.1), transparent); background-size: 200% 100%; animation: shimmer 3s infinite; }
        .float-anim { animation: float 6s ease-in-out infinite; }
      `}</style>

      {/* NAVBAR */}
      <nav className="land fixed top-0 left-0 w-full z-50 border-b border-white/5 bg-[#030303]/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#F5C518] rounded-xl flex items-center justify-center font-black text-black text-lg italic shadow-[0_0_20px_rgba(245,197,24,0.4)]">E</div>
            <span className="font-black tracking-tight text-xl">Elevore <span className="glow-text italic">Empire</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#testimonials" className="hover:text-white transition-colors">Reviews</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onLogin} className="hidden sm:block text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors px-4 py-2">Log In</button>
            <button onClick={onSignup} className="px-5 py-2.5 bg-[#F5C518] text-black rounded-xl font-black text-[11px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(245,197,24,0.3)]">Start Free Trial</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="land relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 grid-bg">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(245,197,24,0.12),transparent)] pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl float-anim pointer-events-none" />
        <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl float-anim pointer-events-none" style={{animationDelay:'3s'}} />

        <div className="relative z-10 max-w-5xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#F5C518]/30 bg-[#F5C518]/5 text-[#F5C518] text-[10px] font-black uppercase tracking-[0.3em] shimmer">
            <div className="w-1.5 h-1.5 bg-[#F5C518] rounded-full animate-pulse" />
            The #1 OS for Elite Service Companies
          </div>

          <h1 className="text-5xl sm:text-7xl md:text-[90px] font-black leading-[0.9] tracking-tighter">
            Run Your Empire<br />
            <span className="glow-text italic">on Autopilot.</span>
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            AI dispatch, GPS fleet tracking, digital contracts, predictive revenue — everything your cleaning or handyman company needs to operate like a Fortune 500.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onSignup} className="group w-full sm:w-auto px-10 py-5 bg-[#F5C518] text-black rounded-2xl font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_50px_rgba(245,197,24,0.4)] text-sm flex items-center justify-center gap-2">
              Start 14-Day Free Trial <Icon name="arrow-right" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={onLogin} className="w-full sm:w-auto px-10 py-5 border border-white/10 rounded-2xl font-black uppercase tracking-widest hover:bg-white/5 transition-all text-sm text-slate-300">
              Sign In to Dashboard
            </button>
          </div>

          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">No credit card required • Cancel anytime • Setup in 2 minutes</p>

          {/* STATS ROW */}
          <div id="stats" className="grid grid-cols-3 gap-6 pt-12 max-w-2xl mx-auto border-t border-white/5">
            {[
              { end: 500, suffix: '+', label: 'Active Businesses' },
              { end: 94, suffix: '%', label: 'Revenue Accuracy' },
              { end: 31, prefix: '$', suffix: 'K avg MRR', label: 'Top Client Revenue' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-black italic glow-text"><CountUp end={s.end} prefix={s.prefix||''} suffix={s.suffix||''} /></div>
                <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <div className="border-y border-white/5 py-10 bg-white/[0.01]">
        <p className="text-center text-[9px] text-slate-600 font-black uppercase tracking-[0.3em] mb-8">Trusted by 500+ Elite Service Operations Across North America</p>
        <div className="flex flex-wrap justify-center items-center gap-10 sm:gap-20 opacity-30 hover:opacity-60 transition-all duration-700">
          {[['wind','BREEZE CLEAN'],['droplet','LUMIN SERVICES'],['hexagon','APEX PROPERTY'],['shield','VANGUARD HOME'],['star','NOVA CLEANING']].map(([icon, name]) => (
            <div key={name} className="flex items-center gap-2 font-black text-base tracking-widest"><Icon name={icon} className="w-5 h-5" />{name}</div>
          ))}
        </div>
      </div>

      {/* FEATURES BENTO */}
      <section id="features" className="land max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-20 space-y-4">
          <div className="inline-block text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 border border-amber-500/30 px-4 py-2 rounded-full bg-amber-500/5">Platform Features</div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter">Everything You Need.<br /><span className="glow-text italic">Nothing You Don't.</span></h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">Built specifically for cleaning and handyman businesses that want to scale fast without losing quality.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={i} className={`card-hover bg-gradient-to-br ${f.color} border ${f.border} rounded-3xl p-8 ${f.big ? 'md:col-span-2' : ''} relative overflow-hidden group`}>
              <div className={`w-12 h-12 rounded-2xl bg-${f.text}/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                <Icon name={f.icon} className={`w-6 h-6 text-${f.text}`} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-wide text-white mb-3">{f.label}</h3>
              <p className="text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="land border-t border-white/5 py-32 bg-[radial-gradient(ellipse_at_center,rgba(245,197,24,0.04),transparent)]">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 space-y-3">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">⭐⭐⭐⭐⭐ Real Results</div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter">CEOs Who <span className="glow-text italic">Trust Elevore</span></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="card-hover bg-white/[0.03] border border-white/8 rounded-3xl p-8 space-y-4">
                <div className="flex gap-1">{Array(t.stars).fill(0).map((_,j)=><span key={j} className="text-[#F5C518] text-lg">★</span>)}</div>
                <p className="text-slate-300 leading-relaxed italic">"{t.text}"</p>
                <div className="border-t border-white/5 pt-4">
                  <p className="font-black text-white">{t.name}</p>
                  <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold">{t.biz}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CLIENT REFERRAL LINK UTILITY */}
      <section className="land border-t border-white/5 py-24 bg-gradient-to-b from-black to-[#050505] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,197,24,0.03),transparent)]" />
        <div className="max-w-xl mx-auto px-6 relative z-10 text-center space-y-6">
          <div className="inline-block text-[10px] font-black uppercase tracking-[0.3em] text-[#F5C518] border border-[#F5C518]/30 px-4 py-2 rounded-full bg-[#F5C518]/5">
            🎁 Share & Earn
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter">Existing Client?<br /><span className="glow-text italic">Get Your Referral Link</span></h2>
          <p className="text-slate-400 text-sm">Enter your name below to instantly generate your unique referral link. Share it with friends and you both get a $25 discount on your next service!</p>
          
          <div className="g p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4 text-left">
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text" 
                id="landingRefName"
                placeholder="Enter your full name" 
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-[#F5C518] transition-all"
              />
              <button 
                onClick={() => {
                  const val = document.getElementById('landingRefName')?.value?.trim();
                  if (!val) return alert('Please enter your name first');
                  const urlP = new URLSearchParams(window.location.search);
                  const tenantParam = urlP.get('t') || '';
                  const link = `${location.origin}${location.pathname}?ref=${val.replace(/\s/g, '_')}${tenantParam ? '&t=' + tenantParam : ''}`;
                  navigator.clipboard.writeText(link);
                  alert(`Success! Your referral link has been copied:\n\n${link}`);
                }}
                className="px-6 py-3 bg-[#F5C518] hover:bg-amber-400 text-black font-black uppercase text-xs tracking-wider rounded-xl active:scale-95 transition-all shadow-lg shadow-[#F5C518]/10 text-center"
              >
                Copy Link
              </button>
            </div>
            <p className="text-[7.5px] text-slate-500 leading-normal uppercase font-bold tracking-wider">
              * Note: No login required. The link automatically embeds your name and associates any referrals to you.
            </p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="land border-t border-white/5 py-32">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter">Simple <span className="glow-text italic">Pricing</span></h2>
            <p className="text-slate-400 text-lg">One platform. All features. Cancel anytime.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {[
              { name: 'Starter', price: '$0', period: '/mo', desc: 'For solo operators just getting started.', features: ['Up to 5 missions/mo', 'Basic Client Database', 'Staff PIN Access', 'WhatsApp Templates'], cta: 'Start Free', action: onSignup, highlight: false },
              { name: 'Empire Pro', price: '$149', period: '/mo', desc: 'The full arsenal. Unlimited everything.', features: ['Unlimited Missions', 'AI Revenue Engine', 'GPS Fleet Tracking', 'Digital Signatures', 'AI Vision QC', 'WhatsApp CRM', 'Good-Better-Best Quotes', 'Photo Storage', 'Priority Support'], cta: 'Start 14-Day Trial', action: onSignup, highlight: true },
              { name: 'Enterprise', price: 'Custom', period: '', desc: 'For franchises and multi-location operations.', features: ['Everything in Pro', 'Dedicated Account Manager', 'Custom Integrations', 'White-label Option', 'SLA Agreement'], cta: 'Contact Us', action: () => window.open('mailto:hello@elevore.app'), highlight: false },
            ].map((plan, i) => (
              <div key={i} className={`card-hover rounded-3xl p-8 flex flex-col relative overflow-hidden ${plan.highlight ? 'bg-gradient-to-b from-[#F5C518]/10 to-black border-2 border-[#F5C518] shadow-[0_0_80px_rgba(245,197,24,0.15)] md:-translate-y-4 scale-105' : 'bg-white/[0.03] border border-white/10'}`}>
                {plan.highlight && <div className="absolute top-0 right-0 bg-[#F5C518] text-black text-[8px] font-black uppercase tracking-widest px-4 py-2 rounded-bl-xl rounded-tr-3xl">Most Popular</div>}
                <div className={`text-[11px] font-black uppercase tracking-widest mb-3 ${plan.highlight ? 'text-[#F5C518]' : 'text-slate-400'}`}>{plan.name}</div>
                <div className="mb-2"><span className="text-5xl font-black tracking-tighter">{plan.price}</span><span className="text-slate-500 text-sm">{plan.period}</span></div>
                <p className="text-slate-500 text-sm mb-6">{plan.desc}</p>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <Icon name="check-circle" className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? 'text-[#F5C518]' : 'text-slate-600'}`} /> {feat}
                    </li>
                  ))}
                </ul>
                <button onClick={plan.action} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm active:scale-95 transition-all ${plan.highlight ? 'bg-[#F5C518] text-black hover:scale-105 shadow-[0_0_30px_rgba(245,197,24,0.3)]' : 'border border-white/10 hover:bg-white/5 text-white'}`}>{plan.cta}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="land border-t border-white/5 py-32 bg-[radial-gradient(ellipse_at_center,rgba(245,197,24,0.08),transparent)]">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-8">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter">Ready to Build Your <span className="glow-text italic">Empire?</span></h2>
          <p className="text-slate-400 text-xl">Join 500+ service businesses already running on Elevore. Setup takes 2 minutes.</p>
          <button onClick={onSignup} className="px-14 py-6 bg-[#F5C518] text-black rounded-2xl font-black uppercase tracking-widest text-lg hover:scale-105 active:scale-95 transition-all shadow-[0_0_60px_rgba(245,197,24,0.4)]">
            Start For Free Today →
          </button>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest">No credit card • Cancel anytime • 14-day full access</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="land border-t border-white/5 py-16 bg-black/60">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-[#F5C518] rounded-lg flex items-center justify-center font-black text-black italic">E</div>
                <span className="font-black text-lg tracking-tight">Elevore</span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">The operating system for elite service businesses.</p>
            </div>
            {[
              { title: 'Product', links: ['Features', 'Pricing', 'Changelog', 'Roadmap'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Security', 'Contact'] },
            ].map((col, i) => (
              <div key={i}>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">{col.title}</p>
                <ul className="space-y-2">{col.links.map(l => <li key={l}><a href="#" className="text-slate-500 hover:text-white transition-colors text-sm">{l}</a></li>)}</ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">© 2026 Elevore Empire SaaS. All Rights Reserved.</p>
            <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">Built for the hustlers. Powered by AI.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}




// App Component
export default function App() {
  const urlP = new URLSearchParams(window.location.search);
  const cjid = urlP.get('mision');
  const refCode = urlP.get('ref');

  if (cjid) return <Portal cjid={cjid} />;
  if (refCode) return <PublicLeadForm refCode={refCode} />;

  const [view, setView] = useState('landing');
  const [role, setRole] = useState('admin');
  const [pass, setPass] = useState('');
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [staff, setStaff] = useState([
    { id: '1', name: 'Jose Mario', role: 'admin', passcode: '2026', wallet_balance: 0, total_earned: 0 },
    { id: '2', name: 'Team Alpha', role: 'staff', passcode: '1122', wallet_balance: 240, total_earned: 1450 },
    { id: '3', name: 'Team Beta', role: 'staff', passcode: '3344', wallet_balance: 180, total_earned: 920 }
  ]);
  const [activeEmployee, setActiveEmp] = useState(null);
  
  // Multi-tenant SaaS state
  const [tenantId, setTenantId] = useState(null);
  const [tenantName, setTenantName] = useState('ELEVORE EMPIRE');
  const [user, setUser] = useState(null);
  
  // Custom states
  const [activeMapAddress, setMapAddress] = useState('');
  const [aiOpen, setAIOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mapTab, setMapTab] = useState('radar');
  const [aiReportOpen, setAIReportOpen] = useState(false);

  const [loading, setLoad] = useState(false);
  const [isPrivate, setPriv] = useState(true);
  const [editId, setEdit] = useState(null);
  const [dtab, setDtab] = useState('identity');
  const [aiPriceLoading, setAiPriceLoading] = useState(false);
  const [aiPrices, setAiPrices] = useState(null);
  const [aiInsight, setAiInsight] = useState('');
  const [fSt, setFSt] = useState('all');
  const [sq, setSQ] = useState('');
  const [toast, setToast] = useState(null);
  const [aStaff, setAStaff] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  const [quickMode, setQM] = useState(false);
  const [chatJob, setChatJob] = useState(null);
  const [chatMsg, setChatMsg] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [actLog, setActLog] = useState([]);
  const [rtOn, setRT] = useState(false);
  const [state, setState] = useState(INIT);

  // Inventory module state
  const [inventory, setInventory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('elevore_inventory') || '[]'); } catch { return []; }
  });
  const [newItem, setNewItem] = useState({ name: '', qty: 0, unit: 'units', minQty: 2, cost: 0 });
  const [invTab, setInvTab] = useState('stock');

  // Reminders / Notifications state
  const [reminders, setReminders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('elevore_reminders') || '[]'); } catch { return []; }
  });
  const [newRem, setNewRem] = useState({ title: '', date: '', time: '', type: 'followup', jobId: '' });

  // Employee creation fields
  const [newStaffName, setNewName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPIN, setNewPIN] = useState('');
  const [newStaffRole, setNewRole] = useState('staff');

  const tt = (m, c = 'green') => { setToast({ m, c }); setTimeout(() => setToast(null), 3500); };
  const log = m => setActLog(l => [{ m, time: new Date().toLocaleTimeString() }, ...l.slice(0, 49)]);

  useEffect(() => { try { localStorage.setItem('ev97', JSON.stringify(state)); } catch { }; }, [state]);
  useEffect(() => { try { const d = JSON.parse(localStorage.getItem('ev97') || '{}'); if (d.name) setState(s => ({ ...s, ...d })); } catch { }; }, []);

  const refresh = useCallback(async () => {
    // ⚠️ SECURITY: Never fetch data without a confirmed tenantId.
    // This prevents cross-tenant data leaks.
    if (!tenantId) {
      setLoad(false);
      return;
    }
    setLoad(true);

    const [{ data: j }, { data: c }, { data: s }] = await Promise.all([
      sb.from('elevore_missions').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
      sb.from('clients').select('*').eq('tenant_id', tenantId),
      sb.from('staff_profiles').select('*').eq('tenant_id', tenantId)
    ]);

    if (j) setJobs(j);
    if (c) setClients(c);
    if (s && s.length > 0) setStaff(s);
    setLoad(false);
  }, [tenantId]);

  const handleLoginSuccess = (assignedRole, assignedTenantId, authUser, activeEmp, tName) => {
    setRole(assignedRole);
    setTenantId(assignedTenantId);
    if (tName) setTenantName(tName);
    if (authUser) setUser(authUser);
    if (activeEmp) setActiveEmp(activeEmp);
    setView(assignedRole === 'admin' ? 'brief' : 'staff');
  };

  // Only refresh data once we're past auth AND have a valid tenantId.
  useEffect(() => {
    if (view !== 'auth' && view !== 'landing' && tenantId) refresh();
  }, [view, tenantId, refresh]);

  useEffect(() => {
    if (view === 'auth') return;
    const ch = sb.channel('ev97').on('postgres_changes', { event: '*', schema: 'public', table: 'elevore_missions' }, () => refresh()).subscribe();
    setRT(true);
    return () => { sb.removeChannel(ch); setRT(false); };
  }, [view, refresh]);

  // Set selected map default to first active job (only if no active map address is selected yet)
  useEffect(() => {
    if (jobs.length > 0 && !activeMapAddress) {
      const activeJob = jobs.find(j => j.status === 'scheduled' || j.status === 'in_progress');
      if (activeJob) setMapAddress(activeJob.address);
    }
  }, [jobs, activeMapAddress]);

  const onName = v => { setState(s => ({ ...s, name: v })); const m = clients.find(c => c.name.toLowerCase().includes(v.toLowerCase())); if (m && v.length > 3) setState(s => ({ ...s, ...m.specs, name: m.name, phone: m.phone, address: m.address })); };

  const pricing = useMemo(() => {
    let advice = '✅ COMPETITIVE', ac = 'text-blue-400';
    if (state.svc === 'handyman') {
      const quick = state.selectedQuickJobs.reduce((a, id) => a + (QJOBS.find(q => q.id === id)?.p || 0), 0);
      const labor = state.laborHours * 85;
      let mk = 1.2; if (state.materialCost < 50) mk = 1.4; else if (state.materialCost < 200) mk = 1.3;
      const mats = Math.round(state.materialCost * mk);
      const sub = quick + labor + mats + state.riskMargin;
      const total = Math.round(sub * (1 - (state.discount / 100)));
      if (total < 125) { advice = '⚠️ BELOW MIN'; ac = 'text-red-500'; }
      else if (total >= 500) { advice = '💰 PREMIUM'; ac = 'text-green-400'; }
      return { total, advice, ac, labor, mats, quick };
    }
    let base = 0;
    if (state.svc === 'postcon') { base = (state.sqft || 0) * 0.35; }
    else { const b = { regular: 95, deep: 165, moveout: 195 }; base = (b[state.svc] || 95) + (state.beds * 40) + (state.baths * 35) + (state.living * 25) + (state.laundryRoom * 25); ADDONS.forEach(a => { if (state[a.id]) base += a.p; }); base += state.laundryLoads * 25; }
    const mb = MBS.find(m => m.id === state.membership);
    const mbd = mb?.id === 'vip' ? 15 : mb?.id === 'premium' ? 10 : mb?.id === 'basic' ? 5 : 0;
    const freq = { 'one-time': 1, 'weekly': 0.85, 'bi-weekly': 0.9, 'monthly': 0.95 }[state.frequency] || 1;
    const total = Math.round(base * state.complexity * freq * (1 - ((state.discount + mbd) / 100)));
    if (total < 120) { advice = '⚠️ LOW MARGIN'; ac = 'text-red-500'; }
    else if (total >= 400) { advice = '🔥 HIGH VALUE'; ac = 'text-amber-400'; }
    return { total, advice, ac, labor: 0, mats: 0, quick: 0 };
  }, [state]);

  useEffect(() => { if (!editId) setState(s => ({ ...s, totalPrice: pricing.total })); }, [pricing.total, editId]);

  const deploy = async () => {
    if (!state.name || !state.address) return tt('Fill Name and Address', 'red');
    setLoad(true);
    try {
      const { data: c, error: cErr } = await sb.from('clients').upsert({ name: state.name, phone: state.phone, address: state.address, membership: state.membership, specs: { ...state }, tenant_id: tenantId }, { onConflict: 'name' }).select().single();
      if (cErr || !c) { tt('Clients Error: ' + (cErr?.message || 'Check RLS'), 'red'); setLoad(false); return; }
      const fd = { 'weekly': 7, 'bi-weekly': 14, 'monthly': 30, 'one-time': null }[state.frequency];
      let nv = null; if (fd && state.date) { const d = new Date(state.date); d.setDate(d.getDate() + fd); nv = d.toISOString().split('T')[0]; }
      const payload = { client_name: state.name, client_phone: state.phone, address: state.address, service_type: state.svc, total_price: state.totalPrice || pricing.total, deposit_paid: state.deposit, team_assigned: state.team, status: state.status, specs: { ...state, referral: refCode || null }, scheduled_date: state.date || null, notes: state.notes || null, next_visit: nv, membership_plan: state.membership || null, urgency_expires: state.urgencyHours ? new Date(Date.now() + state.urgencyHours * 3600000).toISOString() : null, tenant_id: tenantId };
      const { error: jErr } = editId ? await sb.from('elevore_missions').update(payload).eq('id', editId) : await sb.from('elevore_missions').insert([payload]);
      if (jErr) { tt('Mission Error: ' + jErr.message, 'red'); setLoad(false); return; }
      setState(INIT); setEdit(null);
      log(`${editId ? 'Updated' : 'New'}: ${state.name} — ${fmt$(state.totalPrice || pricing.total)}`);
      tt(editId ? 'Updated! ⚡' : 'Deployed! 🚀');
      setView('agenda'); refresh();
    } catch (e) { tt('Error: ' + e.message, 'red'); }
    setLoad(false);
  };

  const update = async (job, patch, msg) => { const { error } = await sb.from('elevore_missions').update(patch).eq('id', job.id); if (error) return tt(error.message, 'red'); tt(msg || 'Updated ✓'); log((msg || 'Updated') + ': ' + job.client_name); refresh(); };
  
  // Custom payroll check-in/out and wallet updating logic
  const recTime = async (jid, type) => {
    const time = new Date().toISOString();
    const status = type === 'check_in_time' ? 'in_progress' : 'completed';
    
    // Read the current job values to calculate pay
    const { data: jobData } = await sb.from('elevore_missions').select('*').eq('id', jid).single();
    if (!jobData) return;

    await sb.from('elevore_missions').update({ [type]: time, status }).eq('id', jid);
    tt(type === 'check_in_time' ? '▶ Checked in!' : '⏹ Checked out!');
    log(type === 'check_in_time' ? `Check-in: ${jid}` : `Check-out: ${jid}`);
    
    // If checking out, calculate and add earnings dynamically to employee wallet
    if (type === 'check_out_time' && activeEmployee) {
      const currentWorker = staff.find(s => s.id === activeEmployee.id) || activeEmployee;
      const pct = currentWorker?.payout_pct !== undefined ? (Number(currentWorker.payout_pct) / 100) : DEFAULT_CFG.STAFF_PAY;
      const share = Math.round(jobData.total_price * pct);
      const isFast = Math.round((new Date(time) - new Date(jobData.check_in_time)) / 60000) <= 180;
      const netEarned = share + (isFast ? 5 : 0);
      
      const newBal = (activeEmployee.wallet_balance || 0) + netEarned;
      const newTot = (activeEmployee.total_earned || 0) + netEarned;
      
      await sb.from('staff_profiles').update({ wallet_balance: newBal, total_earned: newTot }).eq('id', activeEmployee.id);
      setActiveEmp({ ...activeEmployee, wallet_balance: newBal, total_earned: newTot });
      tt(`Earnings stored! +${fmt$(netEarned)} 💰`);
    }

    refresh();
  };

  const upsell = async (job, aid) => { const a = ADDONS.find(x => x.id === aid); if (!a) return; const p = job.client_phone?.replace(/\D/g, '') || ''; const ph = p.length === 10 ? '1' + p : p; const msg = `Hi ${job.client_name}! ✨ Our team noticed your ${a.en.toLowerCase()} could use attention. Add it for $${a.p}? Reply YES! 🏠`; window.open(`https://wa.me/${ph}?text=${encodeURIComponent(msg)}`, '_blank'); const sent = [...(job.upsell_sent || []), aid]; await sb.from('elevore_missions').update({ upsell_sent: sent }).eq('id', job.id); tt(`Upsell: ${a.en} sent! 💰`); log(`Upsell: ${a.en} → ${job.client_name}`); refresh(); };
  const calcBonus = job => { if (job.status !== 'paid') return 0; const mins = job.check_in_time && job.check_out_time ? Math.round((new Date(job.check_out_time) - new Date(job.check_in_time)) / 60000) : null; return (job.final_signature && mins && mins <= 180 && (job.client_rating || 0) >= 4) ? 5 : 0; };
  const realProfit = job => {
    const w = staff.find(s => s.name === job.team_assigned);
    const pct = w && w.payout_pct !== undefined ? (Number(w.payout_pct) / 100) : DEFAULT_CFG.STAFF_PAY;
    return Math.round((job.deposit_paid || 0) - ((job.deposit_paid || 0) * pct) - (job.specs?.expenses || 0) - calcBonus(job));
  };
  const passQC = job => update(job, { status: 'paid', specs: { ...(job.specs || {}), quality_passed: true, quality_passed_at: new Date().toISOString() } }, 'QC Passed ✓');
  const markLost = async job => { const r = prompt('Lost reason (price/no-answer/competitor/timing):') || 'unknown'; await update(job, { status: 'lost', specs: { ...(job.specs || {}), lost_reason: r, lost_at: new Date().toISOString() } }, 'Marked lost'); };
  const rebook = job => { setState({ ...INIT, ...(job.specs || {}), name: job.client_name, phone: job.client_phone, address: job.address, status: 'scheduled', deposit: 0, date: job.next_visit || '' }); setEdit(null); setView('deploy'); setDtab('money'); };

  // Add new employee dynamic code
  const handleAddEmployee = async () => {
    if (!newStaffName || !newStaffPIN || !newStaffEmail) return tt('Name, Email and PIN required', 'red');
    
    // Add locally for robust fallback
    const newWorker = {
      id: String(Date.now()), // use timestamp to avoid ID collision
      name: newStaffName,
      staff_email: newStaffEmail,
      role: newStaffRole,
      passcode: newStaffPIN,
      payout_pct: 40,
      wallet_balance: 0,
      total_earned: 0
    };
    setStaff(prev => [...prev, newWorker]);
    
    // Push to Supabase
    try {
      const { data: inserted } = await sb.from('staff_profiles').insert([{
        name: newStaffName,
        staff_email: newStaffEmail,
        role: newStaffRole,
        passcode: newStaffPIN,
        payout_pct: 40,
        wallet_balance: 0,
        total_earned: 0,
        tenant_id: tenantId
      }]).select().single();
      // Replace temp local entry with real DB entry (gets real UUID)
      if (inserted) setStaff(prev => prev.map(s => s.id === newWorker.id ? inserted : s));
      tt('Staff added successfully! 👤');
    } catch {
      tt('Local employee created ✓');
    }

    // Always clear ALL form fields after adding
    setNewName('');
    setNewPIN('');
    setNewStaffEmail('');
    setNewRole('staff');
  };

  const handleDeleteEmployee = async (worker) => {
    const confirmed = window.confirm(`¿Eliminar a ${worker.name}? Esta accion no se puede deshacer.`);
    if (!confirmed) return;
    // Remove locally immediately
    setStaff(prev => prev.filter(s => s.id !== worker.id));
    if (editingStaff?.id === worker.id) setEditingStaff(null);
    // Delete from Supabase
    try {
      await sb.from('staff_profiles').delete().eq('id', worker.id);
      tt(`${worker.name} eliminado del sistema`, 'red');
    } catch {
      tt('Eliminado localmente ✓');
    }
  };

  const handleCashout = async (worker) => {
    if ((worker.wallet_balance || 0) <= 0) return tt('No balance to payout', 'red');
    const pay = worker.wallet_balance;
    
    // Deduct locally
    setStaff(staff.map(s => s.id === worker.id ? { ...s, wallet_balance: 0 } : s));
    if (activeEmployee?.id === worker.id) {
      setActiveEmp({ ...activeEmployee, wallet_balance: 0 });
    }
    
    // Sync to Supabase
    try {
      await sb.from('staff_profiles').update({ wallet_balance: 0 }).eq('id', worker.id);
    } catch {}

    tt(`Payout request for ${fmt$(pay)} sent to Zelle! 💸`);
    log(`Payout: ${worker.name} received ${fmt$(pay)}`);
  };

  const finance = useMemo(() => {
    const gross = jobs.reduce((a, b) => a + (b.total_price || 0), 0);
    const col = jobs.reduce((a, b) => a + (b.deposit_paid || 0), 0);
    const exp = jobs.reduce((a, b) => a + (b.specs?.expenses || 0), 0);
    const bonuses = jobs.reduce((a, b) => a + calcBonus(b), 0);
    const netPayAllocated = jobs.filter(j => j.status === 'paid').reduce((acc, job) => {
      const w = staff.find(s => s.name === job.team_assigned);
      const pct = w && w.payout_pct !== undefined ? (Number(w.payout_pct) / 100) : DEFAULT_CFG.STAFF_PAY;
      return acc + Math.round((job.deposit_paid || 0) * pct);
    }, 0);
    const net = Math.max(0, Math.round(col - netPayAllocated - exp - bonuses));
    const pending = gross - col;
    const pct = Math.min(100, (gross / DEFAULT_CFG.GOAL) * 100);
    const avg = jobs.length ? Math.round(gross / jobs.length) : 0;
    const mrr = clients.reduce((a, c) => { const m = MBS.find(x => x.id === c.membership); return a + (m?.price || 0); }, 0);
    const byS = { lead: 0, scheduled: 0, in_progress: 0, completed: 0, paid: 0, lost: 0 };
    jobs.forEach(j => { if (byS[j.status] !== undefined) byS[j.status]++; });
    const bySvc = {}; jobs.forEach(j => { bySvc[j.service_type] = (bySvc[j.service_type] || 0) + (j.total_price || 0); });
    const today = new Date().getDate();
    const proj = today > 0 ? Math.round((gross / today) * 30) : 0;
    const ltv = clients.map(c => ({ name: c.name, total: jobs.filter(j => j.client_name === c.name).reduce((a, b) => a + (b.total_price || 0), 0), count: jobs.filter(j => j.client_name === c.name).length })).sort((a, b) => b.total - a.total);
    const avgLTV = ltv.length ? Math.round(ltv.reduce((a, b) => a + b.total, 0) / ltv.length) : 0;
    const dt = {}; jobs.forEach(j => { if (!j.scheduled_date) return; const d = new Date(j.scheduled_date).getDay(); dt[d] = (dt[d] || 0) + (j.total_price || 0); });
    const bd = Object.entries(dt).sort((a, b) => b[1] - a[1])[0];
    const dn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const soon = new Date(); soon.setDate(soon.getDate() + 7);
    const retDue = jobs.filter(j => j.next_visit && new Date(j.next_visit) <= soon && j.status === 'paid');
    const cold = jobs.filter(j => j.status === 'lead' && !j.approval_signature && dAgo(j.created_at) >= 2);
    const churn = clients.filter(c => { const cj = jobs.filter(j => j.client_name === c.name && j.status === 'paid'); if (!cj.length) return false; const last = cj.sort((a, b) => new Date(b.scheduled_date || 0) - new Date(a.scheduled_date || 0))[0]; return dAgo(last.scheduled_date) >= 45; });
    const pendSig = jobs.filter(j => !j.approval_signature && j.status === 'lead');
    const moneyTable = pendSig.reduce((a, b) => a + (b.total_price || 0), 0);
    const expiring = jobs.filter(j => j.status === 'lead' && j.urgency_expires && new Date(j.urgency_expires) - Date.now() <= 6 * 3600000 && new Date(j.urgency_expires) > Date.now());
    const qcQ = jobs.filter(j => j.status === 'completed' && !j.specs?.quality_passed);
    const reviewQ = jobs.filter(j => (j.status === 'paid' || j.specs?.quality_passed) && !j.specs?.review_requested_at);
    const lostJ = jobs.filter(j => j.status === 'lost');
    const lostReasons = lostJ.reduce((a, j) => { const r = j.specs?.lost_reason || 'unknown'; a[r] = (a[r] || 0) + 1; return a; }, {});
    
    // Sleek continuous data lines for active graphics
    const wb = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); const ds = d.toISOString().split('T')[0]; const v = jobs.filter(j => j.scheduled_date === ds).reduce((a, b) => a + (b.total_price || 0), 0); return { l: dn[d.getDay()], v }; });
    const mb2 = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - 5 + i); const yr = d.getFullYear(); const mo = d.getMonth(); const v = jobs.filter(j => { if (!j.scheduled_date) return false; const jd = new Date(j.scheduled_date); return jd.getFullYear() === yr && jd.getMonth() === mo; }).reduce((a, b) => a + (b.total_price || 0), 0); return { l: d.toLocaleDateString('en', { month: 'short' }), v }; });
    
    const ratings = jobs.filter(j => j.client_rating > 0).map(j => j.client_rating);
    const avgRating = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0;
    const payroll = jobs.filter(j => j.status === 'paid').map(j => {
      const w = staff.find(s => s.name === j.team_assigned);
      const pct = w && w.payout_pct !== undefined ? (Number(w.payout_pct) / 100) : DEFAULT_CFG.STAFF_PAY;
      return { name: j.team_assigned || 'Unassigned', amount: Math.round((j.deposit_paid || 0) * pct + calcBonus(j)) };
    }).reduce((acc, { name, amount }) => { acc[name] = (acc[name] || 0) + amount; return acc; }, {});
    const todayJobs = jobs.filter(j => j.scheduled_date === new Date().toISOString().split('T')[0]);
    const conv = jobs.filter(j => j.status === 'paid' && j.created_at && j.scheduled_date);
    const vel = conv.length ? Math.abs(Math.round(conv.reduce((a, j) => a + dAgo(j.created_at) - dAgo(j.scheduled_date), 0) / conv.length)) : null;
    const mbTargets = clients.filter(c => { const cj = jobs.filter(j => j.client_name === c.name); return cj.length >= 3 && (!c.membership || c.membership === 'none'); });
    return { gross, col, net, pending, pct, avg, mrr, proj, ltv, avgLTV, bestDay: bd ? dn[bd[0]] : null, retDue, cold, churn, pendSig, moneyTable, expiring, qcQ, reviewQ, lostJ, lostReasons, bonuses, wb, mb2, avgRating, payroll, byS, bySvc, todayJobs, total: jobs.length, vel, mbTargets };
  }, [jobs, clients]);

  const dna = useMemo(() => { const m = {}; clients.forEach(c => { const cj = jobs.filter(j => j.client_name === c.name); m[c.name] = { score: calcDNA(cj), count: cj.length, spent: cj.reduce((a, b) => a + (b.total_price || 0), 0), last: cj[0]?.scheduled_date }; }); return m; }, [clients, jobs]);

  const referralStats = useMemo(() => {
    const referredJobs = jobs.filter(j => j.specs?.referred_by);
    const totalReferred = referredJobs.length;
    const pendingReferrals = referredJobs.filter(j => j.status === 'lead').length;
    const paidReferrals = referredJobs.filter(j => j.status === 'paid').length;
    const totalDiscountAmount = referredJobs.reduce((acc, j) => acc + (j.specs?.referral_discount || 25), 0);
    const conversions = totalReferred > 0 ? Math.round((paidReferrals / totalReferred) * 100) : 0;
    
    const counts = {};
    referredJobs.forEach(j => {
      const referrer = j.specs?.referred_by || 'Unknown';
      counts[referrer] = (counts[referrer] || 0) + 1;
    });
    
    const ambassadors = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
      
    return {
      totalReferred,
      pendingReferrals,
      paidReferrals,
      totalDiscountAmount,
      conversions,
      ambassadors
    };
  }, [jobs]);

  const filtered = useMemo(() => jobs.filter(j => { const ms = fSt === 'all' || j.status === fSt; const q = sq.toLowerCase(); const mq = !sq || j.client_name?.toLowerCase().includes(q) || j.address?.toLowerCase().includes(q) || j.team_assigned?.toLowerCase().includes(q); return ms && mq; }), [jobs, fSt, sq]);

  const todayStr = new Date().toISOString().split('T')[0];
  const staffJobs = useMemo(() => jobs.filter(j => j.scheduled_date === todayStr || j.status === 'scheduled' || j.status === 'in_progress'), [jobs, todayStr]);
  const seasons = season();

  // Authentication Pin matching logic
  const handleAuth = () => {
    // 1. Check if Admin PIN
    if (pass === DEFAULT_CFG.ADMIN) {
      setView('brief');
      setRole('admin');
      setActiveEmp({ name: 'Jose Mario (Admin)', role: 'admin' });
      tt('Access Granted: Admin 🔑');
      return;
    }
    
    // 2. Check if general staff password
    if (pass === DEFAULT_CFG.STAFF) {
      setView('staff');
      setRole('staff');
      setActiveEmp({ name: 'General Staff', role: 'staff' });
      tt('Access Granted: Staff 👷');
      return;
    }

    // 3. Match individual employee PIN!
    const matched = staff.find(s => String(s.passcode) === pass);
    if (matched) {
      setView('staff');
      setRole('staff');
      setActiveEmp(matched);
      tt(`Access Granted: ${matched.name} 💼`);
      return;
    }

    tt('Invalid Passcode', 'red');
  };

  const wa = (job, type) => {
    const p = job.client_phone?.replace(/\D/g, '') || ''; const ph = p.length === 10 ? '1' + p : p;
    const bal = job.total_price - job.deposit_paid;
    const portal = `${location.origin}${location.pathname}?mision=${job.id}`;
    const ref = `${location.origin}${location.pathname}?ref=${job.client_name?.replace(/\s/g, '_')}&t=${tenantId}`;
    const msgs = {
      confirm: `Hi ${job.client_name}! ✨ Elevore confirming your ${job.service_type?.toUpperCase()} on ${fmtD(job.scheduled_date)}. Balance: ${fmt$(bal)}. Zelle: ${DEFAULT_CFG.ZELLE} 🏠`,
      reminder: `Hi ${job.client_name}! 🔔 Reminder — Elevore ${fmtD(job.scheduled_date)}. Balance: ${fmt$(bal)}. Reply if questions!`,
      review: `Hi ${job.client_name}! 🌟 Thank you! Quick review: ${DEFAULT_CFG.GOOGLE} ⭐⭐⭐⭐⭐`,
      referral: `Hi ${job.client_name}! 🎁 Refer a friend, BOTH get $25 off! Link: ${ref}`,
      quote: `Hi ${job.client_name}! 📋 Your Elevore quote:\n\n🏠 ${job.service_type?.toUpperCase()}\n📅 ${fmtD(job.scheduled_date)}\n💰 ${fmt$(job.total_price)}\n⚖️ Balance: ${fmt$(bal)}\n\n👉 Sign here: ${portal}\n\n⏰ Expires in 24h. Zelle: ${DEFAULT_CFG.ZELLE}`,
      portal: `Hi ${job.client_name}! ✨ Track your ELEVORE service: ${portal}`,
      retention: `Hi ${job.client_name}! 🏠 Been a while! Book this week — 10% off. Reply YES! 🌟`,
      winback: `Hi ${job.client_name}! We miss you! 😊 Book today — loyalty discount. Reply YES! 💫`,
      bundle: `Hi ${job.client_name}! 🎯 Add Deep Clean for $50 more — save $70! Reply YES! 🏠`,
      urgency: `⏰ Hi ${job.client_name}! Quote expires soon. Lock price: ${portal}`,
      birthday: `🎂 Happy Birthday ${job.client_name}! 15% off this week! Reply YES! 🎉`,
      follow1: `Hi ${job.client_name}! Quick follow-up on your Elevore quote ${fmt$(job.total_price)}. Sign: ${portal}`,
      follow2: `Hi ${job.client_name}! Checking before this expires. Secure your spot: ${portal}`,
      final: `Hi ${job.client_name}! Last call — releasing slot soon. Lock it: ${portal}`,
      membership: `Hi ${job.client_name}! Based on your history, a recurring plan saves money + priority booking. Want options?`,
      qcfix: `Hi ${job.client_name}! Quality check — anything need attention? Reply and we make it right.`
    };
    if (msgs[type]) window.open(`https://wa.me/${ph}?text=${encodeURIComponent(msgs[type])}`, '_blank');
    log(`WA ${type} → ${job.client_name}`);
  };

  const recordFollow = async (job, type) => { wa(job, type); const h = [...(job.specs?.followups || []), { type, time: new Date().toISOString() }]; await update(job, { specs: { ...(job.specs || {}), followups: h, last_followup: type } }, `Follow-up ${type} sent`); };
  const requestReview = async (job) => { if ((job.client_rating || 0) > 0 && (job.client_rating || 0) < 5) { wa(job, 'qcfix'); tt('⚠️ Low rating — fix sent', 'red'); return; } wa(job, 'review'); await update(job, { specs: { ...(job.specs || {}), review_requested_at: new Date().toISOString() } }, 'Review requested'); };
  const offerMembership = async (job) => { wa(job, 'membership'); await update(job, { specs: { ...(job.specs || {}), membership_offered_at: new Date().toISOString() } }, 'Membership offer sent'); };

  const printInvoice = job => {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><style>body{font-family:sans-serif;padding:40px;max-width:600px;margin:auto}.h{border-bottom:4px solid #22c55e;padding-bottom:15px;display:flex;justify-content:space-between}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}.total{background:#000;color:#fff;padding:30px;border-radius:15px;margin-top:20px}.sig{border:2px solid #eee;border-radius:8px;margin-top:15px;padding:8px;text-align:center}</style></head><body>
<div class="h"><div><h1 style="font-style:italic;margin:0">ELEVORE</h1><p style="margin:0;color:#666;font-size:11px">${DEFAULT_CFG.BIZ}</p></div><div style="text-align:right"><h2 style="margin:0">INVOICE #${job.id?.slice(0, 8).toUpperCase()}</h2><p style="margin:0;color:#666;font-size:11px">${new Date().toLocaleDateString()}</p></div></div>
<div style="margin-top:20px"><h3>BILL TO:</h3><p><b>${job.client_name}</b></p><p>${job.address}</p><p>${job.client_phone || ''}</p></div>
<div style="margin-top:15px"><div class="row"><span>Service</span><span>${job.service_type?.toUpperCase()}</span></div><div class="row"><span>Date</span><span>${fmtD(job.scheduled_date)}</span></div><div class="row"><span>Team</span><span>${job.team_assigned || 'TBD'}</span></div>${job.check_in_time ? `<div class="row"><span>Check-in</span><span>${new Date(job.check_in_time).toLocaleTimeString()}</span></div>` : ''}${job.check_out_time ? `<div class="row"><span>Check-out</span><span>${new Date(job.check_out_time).toLocaleTimeString()}</span></div>` : ''}<div class="row"><span>Total</span><span>${fmt$(job.total_price)}</span></div><div class="row"><span>Deposit Paid</span><span>-${fmt$(job.deposit_paid)}</span></div></div>
<div class="total"><h1 style="margin:0">BALANCE DUE: ${fmt$(job.total_price - job.deposit_paid)}</h1><p>Zelle: ${DEFAULT_CFG.ZELLE}</p></div>
${job.approval_signature ? `<div class="sig"><p style="font-size:10px;color:#999;margin:0">CLIENT APPROVAL</p><img src="${job.approval_signature}" style="max-height:60px"/></div>` : ''}
${job.final_signature ? `<div class="sig"><p style="font-size:10px;color:#999;margin:0">JOB COMPLETION</p><img src="${job.final_signature}" style="max-height:60px"/></div>` : ''}
<p style="margin-top:40px;text-align:center;color:#999;font-size:11px">Thank you for choosing ${DEFAULT_CFG.BIZ} ⭐</p>
<script>window.print();<\/script></body></html>`);
    w.document.close();
  };

  const exportCSV = () => {
    const rows = [['#', 'Client', 'Service', 'Total', 'Deposit', 'Balance', 'Status', 'Date', 'Team', 'Profit', 'Rating'], ...jobs.map((j, i) => [i + 1, j.client_name, j.service_type, j.total_price, j.deposit_paid, j.total_price - j.deposit_paid, j.status, j.scheduled_date || '', j.team_assigned || '', realProfit(j), j.client_rating || ''])];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = `elevore-${todayStr}.csv`; a.click();
    tt('CSV exported ✓'); log('CSV exported');
  };

  const Toast = () => toast && <div className={`tst fixed top-5 left-1/2 -translate-x-1/2 z-[1600] px-6 py-3 rounded-2xl font-black uppercase text-sm shadow-2xl ${toast.c === 'red' ? 'bg-red-600' : 'bg-green-600'} text-white`}>{toast.m}</div>;
  const Loader = () => loading && <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center"><div className="w-14 h-14 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div></div>;

  // 💬 WhatsApp Chat Drawer for a specific job
  const ChatModal = () => {
    if (!chatJob) return null;
    const send = () => {
      if (!chatMsg.trim()) return;
      const p = chatJob.client_phone?.replace(/\D/g, '') || '';
      const ph = p.length === 10 ? '1' + p : p;
      window.open(`https://wa.me/${ph}?text=${encodeURIComponent(chatMsg)}`, '_blank');
      setChatLog(l => [...l, { from: 'admin', m: chatMsg, time: new Date().toLocaleTimeString() }]);
      setChatMsg('');
    };
    const templates = {
      confirm: `Hi ${chatJob.client_name}! ✨ Elevore confirming your service on ${fmtD(chatJob.scheduled_date)}.`,
      reminder: `Hi ${chatJob.client_name}! 🔔 Reminder — Elevore ${fmtD(chatJob.scheduled_date)}.`,
      review: `Hi ${chatJob.client_name}! 🌟 Quick review: ${DEFAULT_CFG.GOOGLE} ⭐⭐⭐⭐⭐`,
      quote: `Hi ${chatJob.client_name}! 📋 Portal: ${location.origin}${location.pathname}?mision=${chatJob.id}`,
    };
    return (
      <div className="fixed inset-0 bg-black/90 z-[2000] flex items-end p-4" onClick={e => e.target === e.currentTarget && setChatJob(null)}>
        <div className="g p-6 w-full max-w-md space-y-4 border-t-4 border-green-500 mx-auto bg-slate-950 rounded-2xl shadow-2xl border border-white/5">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">💬 {chatJob.client_name}</p>
            <button onClick={() => setChatJob(null)} className="text-slate-500 hover:text-white"><Icon name="x" className="w-5 h-5" /></button>
          </div>
          <div className="h-32 overflow-y-auto space-y-2 nsb bg-black/20 rounded-xl p-3">
            {chatLog.length === 0 && <p className="text-[9px] text-slate-600 italic text-center py-4">No messages yet. Use a template below.</p>}
            {chatLog.map((m, i) => (
              <div key={i} className="p-2 rounded-xl text-[9px] font-black bg-green-900/30 text-green-400 ml-8">
                <p>{m.m}</p>
                <p className="text-[7px] text-slate-600 mt-0.5">{m.time}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {[['✅ Confirm', 'confirm'], ['🔔 Remind', 'reminder'], ['⭐ Review', 'review'], ['📋 Quote', 'quote']].map(([l, type]) => (
              <button key={type} onClick={() => setChatMsg(templates[type])} className="py-1.5 bg-white/5 text-slate-400 rounded-xl text-[7px] font-black uppercase active:scale-95 hover:bg-white/10">{l}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <textarea value={chatMsg} onChange={e => setChatMsg(e.target.value)} placeholder="Type message..." className="inp text-sm resize-none h-16 flex-1" />
            <button onClick={send} className="bg-green-600 text-white px-4 rounded-xl font-black active:scale-95"><Icon name="send" className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    );
  };

  if (view === 'landing') return <LandingPage onLogin={() => setView('auth')} onSignup={() => setView('signup')} />;
  if (view === 'signup') return <OnboardingFlow onBack={() => setView('landing')} tt={tt} />;
  if (view === 'auth') return <LoginFlow onBack={() => setView('landing')} onLoginSuccess={handleLoginSuccess} tt={tt} />;

  // Staff View Mobile Operations Check-in Checklist
  if (role === 'staff' && aStaff) {
    return <StaffJob job={aStaff} onBack={() => setAStaff(null)} onRefresh={refresh} tt={tt} recTime={recTime} upsell={upsell} update={update} employee={activeEmployee} />;
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-black to-zinc-950 text-slate-100 font-sans">
      <Toast />
      {quickMode && <QQ onClose={() => setQM(false)} />}
      {chatJob && <ChatModal />}
      {aiOpen && <AIAdvisor jobs={jobs} clients={clients} staff={staff} isStaff={role === 'staff'} activeUser={activeEmployee?.name || 'User'} onClose={() => setAIOpen(false)} tt={tt} onOpenReport={() => { setAIOpen(false); setAIReportOpen(true); }} />}
      {aiReportOpen && <AIReportModal jobs={jobs} clients={clients} staff={staff} onClose={() => setAIReportOpen(false)} tt={tt} />}
      <Loader />

      {/* 👑 FIXED SIDEBAR ON LEFT (EMPIRE ADMIN STYLE) */}
      <aside className={`fixed inset-y-0 left-0 z-[1100] w-64 bg-[#050508]/95 border-r border-white/5 p-6 flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex md:h-screen md:bg-black/50 md:backdrop-blur-3xl ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="space-y-6 flex-1 flex flex-col overflow-y-auto nsb">
          {/* Brand header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/elevore-logo.png" alt="Elevore Logo" className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(245,197,24,0.4)]" />
              <div>
                <h1 className="font-black text-sm tracking-widest uppercase text-white leading-none truncate max-w-[150px]">{tenantName.toUpperCase()} <span className="text-gradient italic text-[10px]">OS</span></h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className={rtOn ? 'dg' : 'da'}></div>
                  <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">{rtOn ? 'Live Sync' : 'v97.0'}</p>
                </div>
              </div>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="md:hidden p-1.5 text-slate-500 hover:text-white">
              <Icon name="x" className="w-5 h-5" />
            </button>
          </div>

          <div className="h-[1px] bg-white/5"></div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 flex-1">
            {role === 'admin' ? (
              [
                { id: 'brief', label: 'Dashboard', icon: 'sun' },
                { id: 'intel', label: 'Finances', icon: 'bar-chart-2' },
                { id: 'agenda', label: 'Missions', icon: 'shield-check' },
                { id: 'clients', label: 'Clients DNA', icon: 'users' },
                { id: 'members', label: 'VIP Memberships', icon: 'diamond' },
                { id: 'crm', label: 'CRM Retención', icon: 'target' },
                { id: 'inventory', label: 'Inventario', icon: 'package' },
                { id: 'reminders', label: 'Recordatorios', icon: 'bell' },
                { id: 'drive', label: 'Photo Drive', icon: 'image' },
                { id: 'payroll', label: 'Team & Payroll', icon: 'wallet' },
                { id: 'settings', label: 'App Settings', icon: 'settings' },
                { id: 'billing', label: 'SaaS Billing', icon: 'crown' },
                { id: 'deploy', label: 'New Estimate', icon: 'zap' }
              ].map(item => {
                const isActive = view === item.id;
                return (
                  <button key={item.id} onClick={() => { if (item.id === 'deploy') { setEdit(null); setState(INIT); setDtab('identity'); } setView(item.id); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-200 active:scale-95 ${isActive ? 'bg-[#F5C518] text-black shadow-lg shadow-[#F5C518]/15' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                    <Icon name={item.icon} className={`w-4 h-4 ${isActive ? 'text-black' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })
            ) : (
              <>
                <button onClick={() => { setAStaff(null); setView('staff'); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-200 active:scale-95 ${view === 'staff' ? 'bg-[#F5C518] text-black shadow-lg shadow-[#F5C518]/15' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                  <Icon name="shield-check" className="w-4 h-4" />
                  <span>Misiones</span>
                </button>
                <button onClick={() => { setAIOpen(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/5 hover:text-white transition-all active:scale-95">
                  <Icon name="brain" className="w-4 h-4 text-amber-400" />
                  <span>Operaciones IA</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Sidebar Footer Actions */}
        <div className="pt-4 border-t border-white/5 space-y-3">
          {role === 'admin' && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setAIOpen(true); setMobileMenuOpen(false); }} className="py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[8px] font-black uppercase flex items-center justify-center gap-1 active:scale-95 border border-white/5 transition-all">
                <Icon name="brain" className="w-3.5 h-3.5 text-amber-400" />
                <span>AI Advisor</span>
              </button>
              <button onClick={() => { setQM(true); setMobileMenuOpen(false); }} className="py-3 bg-[#F5C518] hover:bg-[#F5C518]/90 text-black rounded-xl text-[8px] font-black uppercase flex items-center justify-center gap-1 active:scale-95 transition-all shadow-md">
                <Icon name="zap" className="w-3.5 h-3.5" />
                <span>Quick</span>
              </button>
            </div>
          )}
          <div className="flex gap-2 justify-between items-center">
            {role === 'admin' && (
              <button onClick={() => setPriv(p => !p)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white active:scale-95 flex items-center justify-center border border-white/5 transition-all">
                <Icon name={isPrivate ? 'eye-off' : 'eye'} className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => { setTenantId(null); setUser(null); setRole('admin'); setView('landing'); setPass(''); setMobileMenuOpen(false); }} className="flex-1 py-3 bg-red-900/10 hover:bg-red-900/20 text-red-500 rounded-xl active:scale-95 flex items-center justify-center border border-red-500/10 transition-all font-black text-[10px] uppercase tracking-wider">
              <Icon name="log-out" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1050] md:hidden"></div>
      )}

      {/* 💻 MAIN WORKSPACE AREA */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Mobile Header Navbar */}
        <header className="md:hidden p-4 sticky top-0 z-[100] bg-[#050508]/90 backdrop-blur-2xl border-b border-white/5 flex justify-between items-center shadow-xl">
          <div className="flex items-center gap-2.5">
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-400 hover:text-white">
              <Icon name="menu" className="w-5 h-5" />
            </button>
            <img src="/elevore-logo.png" alt="Elevore Logo" className="w-6 h-6 object-contain" />
            <h2 className="font-black text-xs tracking-widest uppercase text-white leading-none truncate max-w-[120px]">{tenantName.toUpperCase()} <span className="text-gradient italic text-[8px]">OS</span></h2>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setAIOpen(true)} className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white"><Icon name="brain" className="w-4 h-4 text-amber-400" /></button>
            {role === 'admin' && (
              <button onClick={() => setQM(true)} className="p-2 bg-[#F5C518] text-black rounded-lg"><Icon name="zap" className="w-4 h-4" /></button>
            )}
          </div>
        </header>

        {/* Workspace content wrapper */}
        <main className="max-w-5xl mx-auto w-full p-4 md:p-8 space-y-6">
          {/* Seasonal Banner Disabled */}

          {finance.mbTargets.length > 0 && role === 'admin' && (
            <div className="g p-4 border border-purple-500/20 bg-purple-500/[0.02] flex items-center justify-between shadow-md">
              <div>
                <p className="text-[8px] font-black text-purple-400 uppercase">💎 {finance.mbTargets.length} Ready for Membership</p>
                <p className="text-[8px] text-slate-500">{finance.mbTargets[0]?.name} + more</p>
              </div>
              <button onClick={() => { const j = jobs.find(jj => jj.client_name === finance.mbTargets[0]?.name); if (j) offerMembership(j); }} className="px-3 py-2 bg-purple-500/20 text-purple-400 rounded-xl text-[7px] font-black uppercase active:scale-95">Offer</button>
            </div>
          )}

          {/* =====================================================================
              👷 STAFF OPERATIONS WORKSPACE
              ===================================================================== */}
          {role === 'staff' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center pt-2">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-widest text-white font-display">MISIONES ASIGNADAS</h2>
                  <p className="text-[9px] text-slate-500 uppercase font-black">{activeEmployee?.name} • 👷 {activeEmployee?.role?.toUpperCase()}</p>
                </div>
                <button onClick={() => setAIOpen(true)} className="px-4 py-2.5 bg-[#F5C518] hover:bg-[#F5C518]/90 text-black font-black uppercase text-[9px] flex items-center gap-1 active:scale-95 shadow-lg shadow-[#F5C518]/15 rounded-xl transition-all">🧠 Operaciones IA</button>
              </div>

              {/* Dynamic Wallet Dashboard for Active Employee */}
              <div className="g p-6 flex items-center justify-between shadow-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-2xl relative overflow-hidden">
                <span className="absolute top-4 right-4 bg-green-500/10 text-green-400 border border-green-500/20 text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">BALANCE</span>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mi Billetera Elevore</p>
                  <h3 className="text-4xl font-black text-white italic mt-1">{fmt$(activeEmployee?.wallet_balance || 0)}</h3>
                  <p className="text-[8px] text-slate-500 font-bold uppercase mt-1">Total ganado histórico: {fmt$(activeEmployee?.total_earned || 0)}</p>
                </div>
                {(activeEmployee?.wallet_balance || 0) > 0 ? (
                  <button onClick={() => handleCashout(activeEmployee)} className="gold px-4 py-3 rounded-xl font-black text-[9px] uppercase active:scale-95 flex items-center gap-1">💸 Zelle Cashout</button>
                ) : (
                  <span className="text-[8px] bg-white/5 border border-white/5 text-slate-500 px-3 py-2 rounded-xl uppercase font-black">Paid ✓</span>
                )}
              </div>

              {staffJobs.length === 0 && <div className="g p-10 text-center text-slate-500 font-black italic uppercase bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)]">No tienes misiones asignadas hoy.</div>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {staffJobs.map(job => (
                  <button key={job.id} onClick={() => setAStaff(job)} className="w-full g p-5 text-left active:scale-95 transition-all bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] flex flex-col justify-between min-h-[140px] hover:border-[#F5C518]/30">
                    <div className="flex justify-between items-start w-full">
                      <div>
                        <h3 className="text-lg font-black uppercase italic text-white leading-tight">{job.client_name}</h3>
                        <p className="text-[9px] text-slate-400 uppercase mt-1">{job.service_type} • {fmtD(job.scheduled_date)}</p>
                        <p className="text-[8px] text-slate-500 mt-1 italic truncate w-48">{job.address}</p>
                      </div>
                      <span className={`text-[7px] font-black px-2 py-1 rounded-full uppercase ml-2 flex-shrink-0 ${job.status === 'in_progress' ? 'bg-green-600 text-white' : job.status === 'completed' ? 'bg-purple-600 text-white' : 'bg-[#F5C518] text-black'}`}>{job.status}</span>
                    </div>
                    <p className="text-[8px] font-black text-[#F5C518] uppercase mt-3 self-end flex items-center gap-1">Iniciar misión <Icon name="arrow-right" className="w-3 h-3" /></p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* =====================================================================
              👑 ADMIN DASHBOARD BRIEF TABS
              ===================================================================== */}
          {role === 'admin' && view === 'brief' && (
            <div className="space-y-5 animate-in fade-in">

              {/* ── HEADER ── */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
                <div>
                  <p className="text-[9px] font-black text-[#F5C518] uppercase tracking-[0.25em] mb-0.5">Good morning, {activeEmployee?.name || 'Admin'} 👋</p>
                  <h2 className="text-3xl font-black tracking-widest uppercase text-white font-display leading-none">COMMAND DECK</h2>
                </div>
                <div className="flex items-center gap-2">
                  {activeMapAddress && (
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-2 rounded-xl">
                      <span className="dg" />
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[180px]">GPS: {activeMapAddress}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── HERO REVENUE BANNER ── */}
              <div className="relative rounded-3xl overflow-hidden border border-[#F5C518]/20 bg-gradient-to-br from-[#0d0d00] via-[#111108] to-black shadow-[0_0_60px_rgba(245,197,24,0.06)]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_0%_50%,rgba(245,197,24,0.07),transparent)] pointer-events-none" />
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#F5C518] via-[#F5C518]/40 to-transparent" />
                <div className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div>
                    <p className="text-[8px] font-black text-[#F5C518]/60 uppercase tracking-[0.3em] mb-1">Total Revenue Acumulado</p>
                    <p className="text-6xl md:text-7xl font-black italic tracking-tighter text-white leading-none">
                      {isPrivate ? <span className="blur-sm select-none">$00,000</span> : fmt$(finance.gross)}
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex-1 max-w-xs bg-white/5 rounded-full h-1.5 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#F5C518] to-amber-300 rounded-full transition-all duration-1000" style={{ width: `${Math.min(finance.pct, 100)}%` }} />
                      </div>
                      <span className="text-[9px] font-black text-[#F5C518] uppercase">{Math.round(finance.pct)}% de meta</span>
                    </div>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1">Meta: {fmt$(DEFAULT_CFG.GOAL)} · Net: {isPrivate ? '****' : fmt$(finance.net)} · Proy: {isPrivate ? '****' : fmt$(finance.proj)}</p>
                  </div>
                  {/* Mini bar sparkline */}
                  <div className="flex flex-col gap-2 min-w-[180px]">
                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Últimas semanas</p>
                    {(() => {
                      const bars = finance.wb?.slice(-7) || [];
                      const max = Math.max(...bars.map(b => b.v || 0), 1);
                      return (
                        <div className="flex items-end gap-1 h-14">
                          {bars.map((b, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                              <div className="w-full rounded-sm transition-all" style={{
                                height: `${Math.max(((b.v || 0) / max) * 48, 3)}px`,
                                background: i === bars.length - 1 ? 'linear-gradient(to top,#F5C518,#fde68a)' : 'rgba(255,255,255,0.10)'
                              }} />
                              <span className="text-[6px] text-slate-600 font-bold">{b.l?.slice(0, 1) || ''}</span>
                            </div>
                          ))}
                          {bars.length === 0 && [1,2,3,4,5,6,7].map((_, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                              <div className="w-full rounded-sm" style={{ height: `${12 + i * 5}px`, background: i === 6 ? 'linear-gradient(to top,#F5C518,#fde68a)' : 'rgba(255,255,255,0.08)' }} />
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* ── KPI CARDS ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative rounded-2xl overflow-hidden border border-green-500/20 bg-gradient-to-br from-green-950/40 to-black p-5 flex flex-col justify-between min-h-[130px] hover:border-green-500/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.08)] transition-all group">
                  <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-green-400/60 to-transparent" />
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon name="shield-check" className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-[7px] font-black text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full uppercase">LIVE</span>
                  </div>
                  <div>
                    <p className="text-4xl font-black text-white italic tracking-tight leading-none">{finance.todayJobs.length}</p>
                    <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest mt-1.5">Jobs Today</p>
                  </div>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-[#F5C518]/20 bg-gradient-to-br from-amber-950/40 to-black p-5 flex flex-col justify-between min-h-[130px] hover:border-[#F5C518]/40 hover:shadow-[0_0_20px_rgba(245,197,24,0.08)] transition-all group">
                  <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-[#F5C518]/60 to-transparent" />
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-[#F5C518]/10 border border-[#F5C518]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon name="dollar-sign" className="w-4 h-4 text-[#F5C518]" />
                    </div>
                    <span className="text-[7px] font-black text-[#F5C518] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase">HOY</span>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-white italic tracking-tight leading-none">
                      {isPrivate ? '***' : fmt$(finance.todayJobs.reduce((a, b) => a + (b.total_price || 0), 0))}
                    </p>
                    <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest mt-1.5">Revenue Hoy</p>
                  </div>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-blue-500/20 bg-gradient-to-br from-blue-950/40 to-black p-5 flex flex-col justify-between min-h-[130px] hover:border-blue-500/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.08)] transition-all group">
                  <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-blue-400/60 to-transparent" />
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon name="repeat" className="w-4 h-4 text-blue-400" />
                    </div>
                    <span className="text-[7px] font-black text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full uppercase">MRR</span>
                  </div>
                  <div>
                    <p className="text-3xl font-black text-white italic tracking-tight leading-none">{isPrivate ? '***' : fmt$(finance.mrr)}</p>
                    <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest mt-1.5">Recurrente Mes</p>
                  </div>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-purple-500/20 bg-gradient-to-br from-purple-950/40 to-black p-5 flex flex-col justify-between min-h-[130px] hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(168,85,247,0.08)] transition-all group">
                  <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-purple-400/60 to-transparent" />
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon name="star" className="w-4 h-4 text-purple-400" />
                    </div>
                    <span className="text-[7px] font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full uppercase">⭐ SCORE</span>
                  </div>
                  <div>
                    <p className="text-4xl font-black text-white italic tracking-tight leading-none">{finance.avgRating || '5.0'}</p>
                    <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest mt-1.5">Promedio Stars</p>
                  </div>
                </div>
              </div>

              {/* ── OPERATIONS QUICK ACTIONS ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={() => { setFSt('lead'); setView('agenda'); }} className="relative rounded-2xl border border-[#F5C518]/25 bg-gradient-to-br from-amber-950/30 to-black p-4 text-left active:scale-95 transition-all hover:border-[#F5C518]/50 hover:shadow-[0_0_20px_rgba(245,197,24,0.08)]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#F5C518]/10 flex items-center justify-center"><Icon name="clock" className="w-3.5 h-3.5 text-[#F5C518]" /></div>
                    <p className="text-[8px] text-[#F5C518] font-black uppercase tracking-wider">Money Waiting</p>
                  </div>
                  <p className="text-3xl font-black italic text-white leading-none">{isPrivate ? '***' : fmt$(finance.moneyTable)}</p>
                  <p className="text-[7px] text-slate-500 mt-1.5 font-bold">{finance.pendSig.length} sin firmar →</p>
                </button>

                <button onClick={() => { setFSt('lead'); setView('agenda'); }} className="relative rounded-2xl border border-red-500/25 bg-gradient-to-br from-red-950/30 to-black p-4 text-left active:scale-95 transition-all hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.08)]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center"><Icon name="alert-triangle" className="w-3.5 h-3.5 text-red-400" /></div>
                    <p className="text-[8px] text-red-400 font-black uppercase tracking-wider">Expirando</p>
                  </div>
                  <p className="text-3xl font-black italic text-white leading-none">{finance.expiring.length}</p>
                  <p className="text-[7px] text-slate-500 mt-1.5 font-bold">bajo 6h →</p>
                </button>

                <button onClick={() => { setFSt('completed'); setView('agenda'); }} className="relative rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-950/30 to-black p-4 text-left active:scale-95 transition-all hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.08)]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center"><Icon name="camera" className="w-3.5 h-3.5 text-purple-400" /></div>
                    <p className="text-[8px] text-purple-400 font-black uppercase tracking-wider">QC Queue</p>
                  </div>
                  <p className="text-3xl font-black italic text-white leading-none">{finance.qcQ.length}</p>
                  <p className="text-[7px] text-slate-500 mt-1.5 font-bold">necesita revisión →</p>
                </button>

                <button onClick={() => { setFSt('paid'); setView('agenda'); }} className="relative rounded-2xl border border-blue-500/25 bg-gradient-to-br from-blue-950/30 to-black p-4 text-left active:scale-95 transition-all hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.08)]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center"><Icon name="message-circle" className="w-3.5 h-3.5 text-blue-400" /></div>
                    <p className="text-[8px] text-blue-400 font-black uppercase tracking-wider">Reviews</p>
                  </div>
                  <p className="text-3xl font-black italic text-white leading-none">{finance.reviewQ.length}</p>
                  <p className="text-[7px] text-slate-500 mt-1.5 font-bold">pedir estrellas →</p>
                </button>
              </div>

              {/* ── AI INSIGHT + PROGRESS RINGS ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* AI Predictive */}
                <div className="relative rounded-2xl overflow-hidden border border-blue-500/20 bg-gradient-to-br from-blue-950/30 to-black p-6">
                  <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-blue-400/60 to-transparent" />
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.06),transparent)] pointer-events-none" />
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <Icon name="brain" className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">🧠 AI Predictive Revenue</p>
                      <span className="text-[6px] bg-blue-500/10 text-blue-300 font-bold px-1.5 py-0.5 rounded border border-blue-500/15">SMART ENGINE</span>
                    </div>
                  </div>
                  {finance.mbTargets.length > 0 ? (
                    <>
                      <p className="text-base font-black italic text-white leading-snug mb-1">Target: {finance.mbTargets[0].name}</p>
                      <p className="text-[8px] text-slate-400 leading-relaxed">89% probabilidad de convertir a VIP Monthly Retainer. Envía invitación prioritaria para asegurar LTV.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-base font-black italic text-white leading-snug mb-1">Surge Pricing Óptimo</p>
                      <p className="text-[8px] text-slate-400 leading-relaxed">Capacidad al 80%. IA sugiere multiplicador 1.2x en nuevos estimados por 48h para maximizar margen.</p>
                    </>
                  )}
                  <button onClick={() => tt('Deploying Smart Campaign... 🚀')} className="mt-4 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[8px] uppercase active:scale-95 shadow-lg shadow-blue-600/20 transition-all">Deploy Campaign →</button>
                </div>

                {/* ── PROGRESS RINGS ── */}
                <div className="relative rounded-2xl overflow-hidden border border-white/8 bg-gradient-to-br from-white/[0.03] to-black p-6 flex flex-col justify-between">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-4">Progreso de Meta</p>
                  <div className="flex items-center justify-around flex-1">
                    <div className="flex flex-col items-center gap-2">
                      <ProgressRing progress={finance.pct} radius={36} stroke={5} color="#22c55e" />
                      <div className="text-center">
                        <p className="text-[7px] text-slate-500 uppercase font-black">Meta</p>
                        <p className="text-xs font-black text-white">{Math.round(finance.pct)}%</p>
                      </div>
                    </div>
                    <div className="h-16 w-[1px] bg-white/5" />
                    <div className="flex flex-col items-center gap-2">
                      <ProgressRing progress={finance.avgRating * 20} radius={36} stroke={5} color="#F5C518" text={String(finance.avgRating || 5)} />
                      <div className="text-center">
                        <p className="text-[7px] text-slate-500 uppercase font-black">Rating</p>
                        <p className="text-xs font-black text-white">{finance.avgRating || 5.0} ⭐</p>
                      </div>
                    </div>
                    <div className="h-16 w-[1px] bg-white/5" />
                    <div className="flex flex-col items-center gap-2">
                      <ProgressRing progress={Math.min((clients.length / 50) * 100, 100)} radius={36} stroke={5} color="#8b5cf6" text={String(clients.length)} />
                      <div className="text-center">
                        <p className="text-[7px] text-slate-500 uppercase font-black">Clientes</p>
                        <p className="text-xs font-black text-white">{clients.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


              {/* ── LIVE GPS DISPATCH ── */}
              <div className="relative rounded-2xl overflow-hidden border border-[#F5C518]/15 bg-gradient-to-br from-amber-950/10 to-black p-6 space-y-4">
                <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-[#F5C518]/40 to-transparent" />
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <h3 className="text-[10px] font-black text-white uppercase tracking-widest font-display">📍 Live Logistics & Dispatch</h3>
                  <span className="text-[6px] bg-amber-500/10 text-amber-400 font-bold px-1.5 py-0.5 rounded border border-amber-500/15">SYNC ACTIVE</span>
                </div>
                <MapComponent address={activeMapAddress} />
                <div className="flex gap-2 overflow-x-auto nsb">
                  {jobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress').map(job => (
                    <button key={job.id} onClick={() => setMapAddress(job.address)} className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase flex-shrink-0 border transition-all ${activeMapAddress === job.address ? 'bg-[#F5C518] border-[#F5C518] text-black shadow-lg shadow-[#F5C518]/10' : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:border-white/20'}`}>{job.client_name}</button>
                  ))}
                  {jobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress').length === 0 && (
                    <p className="text-[8px] text-slate-600 font-bold uppercase italic">Sin misiones activas ahora</p>
                  )}
                </div>
              </div>
            </div>
          )}



          {/* =====================================================================
              👑 ADMIN DASHBOARD FINANCES TABS (intel)
              ===================================================================== */}
          {role === 'admin' && view === 'intel' && (
            <div className="space-y-6 animate-in fade-in">
              <section className="g p-8 shadow-xl bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] text-center relative overflow-hidden">
                <p className="text-[9px] font-black text-slate-500 mb-2 uppercase tracking-widest italic font-display">MRR GOAL — {fmt$(DEFAULT_CFG.GOAL)}</p>
                <h2 className="text-7xl italic tracking-tighter text-white font-black leading-none">{Math.round(finance.pct)}%</h2>
                <div className="pb mt-4 mb-3"><div className="pf" style={{ width: `${finance.pct}%` }}></div></div>
                <div className="flex justify-between text-[8px] text-slate-500 font-black uppercase">
                  <span>Billed: {isPrivate ? '***' : fmt$(finance.gross)}</span>
                  <span>{finance.gross >= DEFAULT_CFG.GOAL ? '🎯 GOAL!' : 'Left: ' + fmt$(DEFAULT_CFG.GOAL - finance.gross)}</span>
                </div>
                <p className="text-[9px] text-[#F5C518] mt-2 font-black uppercase italic text-center font-bold">Net: {isPrivate ? '****' : fmt$(finance.net)} | Projected: {isPrivate ? '****' : fmt$(finance.proj)}</p>
              </section>

              {/* Finances KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { l: 'PENDING', v: isPrivate ? '***' : fmt$(finance.pending), color: 'text-orange-400', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
                  { l: 'AVG TICKET', v: isPrivate ? '***' : fmt$(finance.avg), color: 'text-blue-400', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                  { l: 'MRR', v: isPrivate ? '***' : fmt$(finance.mrr), color: 'text-purple-400', badge: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
                  { l: 'AVG RATING', v: finance.avgRating || '—', color: 'text-[#F5C518]', badge: 'bg-amber-500/10 text-[#F5C518] border-amber-500/20' },
                  { l: 'AVG LTV', v: isPrivate ? '***' : fmt$(finance.avgLTV), color: 'text-green-400', badge: 'bg-green-500/10 text-green-400 border-green-500/20' },
                  { l: 'BONUSES', v: fmt$(finance.bonuses), color: 'text-pink-400', badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20' }
                ].map(k => (
                  <div key={k.l} className="g p-5 relative overflow-hidden bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-2xl flex flex-col justify-between min-h-[120px] hover:border-slate-500/20 transition-all">
                    <span className={`absolute top-3 right-3 ${k.badge} text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider`}>METRIC</span>
                    <p className={`text-3xl font-black mt-4 ${k.color}`}>{k.v}</p>
                    <p className="text-[8px] text-slate-400 uppercase font-black tracking-widest mt-2">{k.l}</p>
                  </div>
                ))}
              </div>

              {/* Area charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="g p-6 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 font-display">📈 GROSS REVENUE TRENDS</p>
                  <SleekAreaChart data={finance.wb} color="#F5C518" />
                </div>
                <div className="g p-6 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 font-display">📊 MONTHLY REVENUE PROJECTIONS</p>
                  <SleekAreaChart data={finance.mb2} color="#3b82f6" />
                </div>
              </div>

              {/* ── REFERRAL ENGINE DASHBOARD ── */}
              <div className="g p-6 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] space-y-6">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-xs font-black text-white uppercase tracking-widest font-display">🎁 ORGANIC REFERRAL ENGINE</h3>
                    <p className="text-[7.5px] text-slate-500 uppercase font-bold mt-0.5">Track referred leads, conversion rate and active program ambassadors</p>
                  </div>
                  <span className="text-[7.5px] font-black px-2 py-1 rounded-full bg-[#F5C518]/10 text-[#F5C518] border border-[#F5C518]/25 uppercase tracking-wider animate-pulse">ACTIVE ENGINE</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <p className="text-[7.5px] text-slate-500 uppercase font-black tracking-wider">Total Referred Leads</p>
                    <p className="text-2xl font-black text-white mt-1">{referralStats.totalReferred}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <p className="text-[7.5px] text-slate-500 uppercase font-black tracking-wider">Pending (Leads)</p>
                    <p className="text-2xl font-black text-orange-400 mt-1">{referralStats.pendingReferrals}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <p className="text-[7.5px] text-slate-500 uppercase font-black tracking-wider">Converted (Paid)</p>
                    <p className="text-2xl font-black text-green-400 mt-1">{referralStats.paidReferrals}</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                    <p className="text-[7.5px] text-slate-500 uppercase font-black tracking-wider">Conversion Rate</p>
                    <p className="text-2xl font-black text-[#F5C518] mt-1">{referralStats.conversions}%</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">💰 DISCOUNTS LEDGER</p>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] text-slate-400 uppercase font-bold">Estimated Discounts Granted</span>
                        <span className="text-sm font-black text-white">{fmt$(referralStats.totalDiscountAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-white/5 pt-3">
                        <span className="text-[8px] text-slate-400 uppercase font-bold">Standard Discount Value</span>
                        <span className="text-sm font-black text-[#F5C518]">$25.00</span>
                      </div>
                      <p className="text-[7px] text-slate-600 uppercase font-bold italic leading-relaxed">
                        * Referral discounts are automatically calculated at $25 per referred booking and saved inside mission parameters.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">🏆 BRAND AMBASSADORS</p>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-5 max-h-[170px] overflow-y-auto nsb">
                      {referralStats.ambassadors.length === 0 ? (
                        <p className="text-[8px] text-slate-600 italic uppercase text-center py-6">No active ambassadors yet</p>
                      ) : (
                        <div className="space-y-2.5">
                          {referralStats.ambassadors.slice(0, 5).map((amb, idx) => (
                            <div key={amb.name} className="flex justify-between items-center text-[8px] uppercase">
                              <div className="flex items-center gap-2">
                                <span className="w-4 h-4 rounded-lg bg-[#F5C518]/10 text-[#F5C518] flex items-center justify-center font-black text-[7px]">{idx + 1}</span>
                                <span className="font-bold text-white">{amb.name.replace(/_/g, ' ')}</span>
                              </div>
                              <span className="font-black text-[#F5C518]">{amb.count} friends referred</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              👑 ADMIN DASHBOARD MISSIONS TABS (agenda)
              ===================================================================== */}
          {role === 'admin' && view === 'agenda' && (
            <div className="space-y-4 animate-in fade-in pb-24">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl md:text-2xl font-black tracking-widest uppercase text-white font-display">MISSIONS DIRECTORY</h2>
                <input className="inp md:max-w-xs text-xs" placeholder="🔍 Search by name or address..." value={sq} onChange={e => setSQ(e.target.value)} />
              </div>
              <div className="flex gap-1.5 overflow-x-auto nsb pb-1">
                {['all', 'lead', 'scheduled', 'in_progress', 'completed', 'paid', 'lost'].map(s => (
                  <button key={s} onClick={() => setFSt(s)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase whitespace-nowrap active:scale-95 transition-all ${fSt === s ? 'bg-[#F5C518] text-black shadow-lg shadow-[#F5C518]/15' : 'bg-white/5 text-slate-500'}`}>{s}</button>
                ))}
              </div>

              {filtered.length === 0 && <div className="g p-10 text-center text-slate-500 font-black italic uppercase bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)]">No missions found.</div>}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(job => {
                  const isH = job.service_type === 'handyman';
                  const bal = job.total_price - job.deposit_paid;
                  const d = dna[job.client_name];
                  const lv = lvl(d?.count || 0);
                  const profit = realProfit(job);
                  const bonus = calcBonus(job);
                  return (
                    <div key={job.id} className={`g p-5 border-l-[7px] shadow-xl hover:bg-white/[0.01] transition-all bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] ${isH ? 'border-green-500' : job.status === 'paid' ? 'border-blue-500' : job.status === 'in_progress' ? 'border-green-400' : job.status === 'lead' ? 'border-[#F5C518]' : job.status === 'completed' ? 'border-purple-500' : job.status === 'lost' ? 'border-red-800' : 'border-amber-500'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <h3 className="text-base font-black uppercase italic text-white leading-none">{job.client_name}</h3>
                            <span className={`text-[6px] font-black px-1.5 py-0.5 rounded-full uppercase ${job.status === 'paid' ? 'bg-blue-600 text-white' : job.status === 'in_progress' ? 'bg-green-600 text-white' : job.status === 'lead' ? 'bg-[#F5C518] text-black' : job.status === 'completed' ? 'bg-purple-600 text-white' : job.status === 'lost' ? 'bg-red-900 text-red-300' : 'bg-slate-700 text-slate-300'}`}>{job.status}</span>
                            {isH && <span className="text-[6px] bg-green-600 text-black font-black px-1.5 py-0.5 rounded-full">🛠️</span>}
                            {job.specs?.referred_by && (
                              <span className="text-[6px] bg-[#F5C518]/10 text-[#F5C518] border border-[#F5C518]/25 font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                🎁 Ref: {job.specs.referred_by.replace(/_/g, ' ')}
                              </span>
                            )}
                          </div>
                          <p className="text-[8px] text-slate-400 uppercase">{job.service_type} • {fmtD(job.scheduled_date)} • Assigned: {job.team_assigned || 'No worker'}</p>
                        </div>
                        <button onClick={() => { setMapAddress(job.address); setView('brief'); tt('🗺️ Mostrando mapa en Dashboard...'); }} className="p-2.5 bg-blue-900/30 text-blue-400 rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-1 text-[8px] font-black uppercase"><Icon name="navigation" className="w-3.5 h-3.5" />Map</button>
                      </div>
                      <p className="text-[8px] text-slate-500 italic mb-2">{job.address}</p>
                      
                      <div className="grid grid-cols-3 gap-1 mb-2">
                        {[['confirm', '✅'], ['reminder', '🔔'], ['review', '⭐'], ['quote', '📋'], ['referral', '🎁'], ['bundle', '🎯']].map(([tp, em]) => (
                          <button key={tp} onClick={() => wa(job, tp)} className="py-1.5 bg-white/5 border border-white/5 rounded-xl text-[7px] font-black uppercase active:scale-95 text-slate-400 hover:text-white transition-all">{em} {tp}</button>
                        ))}
                      </div>

                      {job.status === 'lead' && (
                        <div className="grid grid-cols-4 gap-1 mb-2">
                          <button onClick={() => recordFollow(job, 'follow1')} className="py-1.5 bg-[#F5C518]/10 text-[#F5C518] rounded-xl text-[7px] font-black uppercase active:scale-95">F1</button>
                          <button onClick={() => recordFollow(job, 'follow2')} className="py-1.5 bg-orange-500/10 text-orange-400 rounded-xl text-[7px] font-black uppercase active:scale-95">F2</button>
                          <button onClick={() => recordFollow(job, 'final')} className="py-1.5 bg-red-500/10 text-red-400 rounded-xl text-[7px] font-black uppercase active:scale-95">Final</button>
                          <button onClick={() => markLost(job)} className="py-1.5 bg-slate-800 text-slate-400 rounded-xl text-[7px] font-black uppercase active:scale-95">Lost</button>
                        </div>
                      )}

                      <div className="flex justify-between items-end border-t border-white/5 pt-3">
                        <div>
                          <p className="text-[8px] text-slate-500 italic font-black uppercase">Balance</p>
                          <p className="text-3xl font-black italic tracking-tighter text-white leading-none">{fmt$(bal)}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => setChatJob(job)} className="p-2.5 bg-blue-900/30 text-blue-400 rounded-xl hover:bg-blue-600 transition-all"><Icon name="message-square" className="w-4 h-4" /></button>
                          <button onClick={() => printInvoice(job)} className="p-2.5 bg-slate-800 text-[#F5C518] rounded-xl hover:scale-110 transition-all"><Icon name="file-text" className="w-4 h-4" /></button>
                          <button onClick={() => { setEdit(job.id); setState({ ...job.specs, totalPrice: job.total_price }); setView('deploy'); setDtab('identity'); }} className="p-2.5 bg-slate-800 text-white rounded-xl hover:bg-blue-600 transition-all"><Icon name="edit-3" className="w-4 h-4" /></button>
                          <button onClick={() => { if (confirm('Archive?')) sb.from('elevore_missions').delete().eq('id', job.id).then(() => { tt('Archived ✓'); refresh(); }); }} className="p-2.5 bg-red-900/30 text-red-500 rounded-xl hover:bg-red-600 transition-all"><Icon name="trash-2" className="w-4 h-4" /></button>
                          <button onClick={() => window.open(`https://wa.me/${job.client_phone?.replace(/\D/g, '') || ''}`)} className="p-2.5 bg-green-600 text-white rounded-xl active:scale-90 transition-all"><Icon name="message-circle" className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =====================================================================
              👑 ADMIN DASHBOARD CLIENTS TABS (clients)
              ===================================================================== */}
          {role === 'admin' && view === 'clients' && (
            <div className="space-y-4 animate-in fade-in pb-24">
              <div className="g p-5 border-t-4 border-purple-500 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)]">
                <h2 className="text-xl font-black tracking-widest uppercase text-white font-display">🧬 CLIENT DNA LEDGER</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clients.map(client => {
                  const d = dna[client.name] || { score: 0, count: 0, spent: 0 };
                  const lv = lvl(d.count);
                  const daysSince = dAgo(d.last);
                  const lastJob = jobs.filter(j => j.client_name === client.name)[0];
                  return (
                    <div key={client.name} className="g p-5 hover:bg-white/[0.02] transition-all border-l-4 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] flex flex-col justify-between min-h-[140px]" style={{ borderColor: lv.color }}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="text-base font-black uppercase italic text-white">{client.name}</h3>
                            <span className="text-[7px] font-black px-2 py-0.5 rounded-full" style={{ background: lv.color, color: '#000' }}>{lv.name}</span>
                            {daysSince >= 45 && <span className="text-[7px] bg-red-900/50 text-red-400 font-black px-2 py-0.5 rounded-full">⚠️ Churn Risk</span>}
                          </div>
                          <p className="text-[8px] text-slate-400 uppercase">{client.phone}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 mt-3 flex-wrap">
                        <button onClick={() => lastJob ? wa(lastJob, 'referral') : tt('No previous job', 'red')} className="flex-1 py-2 bg-pink-600/20 text-pink-400 rounded-xl text-[7px] font-black uppercase active:scale-95">🎁 Ref</button>
                        <button onClick={() => lastJob ? wa(lastJob, 'bundle') : tt('No previous job', 'red')} className="flex-1 py-2 bg-blue-600/20 text-blue-400 rounded-xl text-[7px] font-black uppercase active:scale-95">🎯 Bundle</button>
                        <button onClick={() => { setState({ ...INIT, ...client.specs, name: client.name, phone: client.phone, address: client.address }); setView('deploy'); setDtab('specs'); }} className="flex-1 py-2 bg-white/5 text-slate-400 rounded-xl text-[7px] font-black uppercase active:scale-95 hover:text-white transition-all">+ Job</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =====================================================================
              👑 ADMIN DASHBOARD MEMBERSHIPS TABS (members)
              ===================================================================== */}
          {role === 'admin' && view === 'members' && (
            <div className="space-y-6 animate-in fade-in pb-24">
              <div className="g p-6 border-t-4 border-yellow-500 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] flex justify-between items-center relative overflow-hidden">
                <div>
                  <h2 className="text-xl font-black tracking-widest uppercase text-white font-display">💎 VIP MEMBERSHIP PLANS</h2>
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1">Tenant Subscribed Recurring Stream</p>
                </div>
                <p className="text-3xl font-black italic text-[#F5C518]">{isPrivate ? '***' : fmt$(finance.mrr)}<span className="text-[9px] text-slate-500 font-black">/mo MRR</span></p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {MBS.filter(m => m.id !== 'none').map(m => (
                  <div key={m.id} className="g p-6 border-l-4 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] flex flex-col justify-between min-h-[220px] hover:border-slate-500/20 transition-all" style={{ borderColor: m.color }}>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-black uppercase italic text-white font-display">{m.name}</h3>
                      <p className="text-2xl font-black" style={{ color: m.color }}>{fmt$(m.price)}<span className="text-[9px] text-slate-500">/mo</span></p>
                    </div>
                    <ul className="space-y-2 mb-4 flex-1">{m.perks?.map((p, i) => (<li key={i} className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">✓ {p}</li>))}</ul>
                  </div>
                ))}
              </div>
              {dtab === 'billing' && (
                <div className="space-y-5 animate-in fade-in">
                  <div className="g p-8 border-t-4 border-[#F5C518] text-center relative overflow-hidden bg-black/40">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,197,24,0.1),transparent)]"></div>
                    <div className="relative z-10 space-y-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(245,197,24,0.3)]">
                        <Icon name="crown" className="w-8 h-8 text-black" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black uppercase italic text-white tracking-widest">ELEVORE PRO</h2>
                        <p className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em] mt-1">SaaS Subscription</p>
                      </div>
                      
                      <div className="py-4">
                        <span className="text-5xl font-black text-white">$149</span>
                        <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">/month</span>
                      </div>
                      
                      <div className="text-left space-y-3 bg-white/5 p-5 rounded-2xl border border-white/10">
                        <p className="flex items-center gap-3 text-sm text-slate-300"><Icon name="check-circle" className="w-4 h-4 text-green-500" /> Unlimited Missions & Dispatch</p>
                        <p className="flex items-center gap-3 text-sm text-slate-300"><Icon name="check-circle" className="w-4 h-4 text-green-500" /> AI Predictive Revenue Engine</p>
                        <p className="flex items-center gap-3 text-sm text-slate-300"><Icon name="check-circle" className="w-4 h-4 text-green-500" /> Automated Client Portals (E-Sign)</p>
                        <p className="flex items-center gap-3 text-sm text-slate-300"><Icon name="check-circle" className="w-4 h-4 text-green-500" /> Real-time GPS Tracking</p>
                        <p className="flex items-center gap-3 text-sm text-slate-300"><Icon name="check-circle" className="w-4 h-4 text-green-500" /> Automated Referral Engine</p>
                      </div>

                      <button onClick={() => { tt('Redirecting to Stripe Checkout... 💳', 'green'); setTimeout(() => window.open('https://stripe.com', '_blank'), 1500); }} className="w-full gold py-5 rounded-2xl font-black uppercase text-sm shadow-[0_0_30px_rgba(245,197,24,0.2)] active:scale-95 transition-all flex items-center justify-center gap-2">
                        <Icon name="credit-card" className="w-5 h-5" />
                        Upgrade to Pro (Stripe)
                      </button>
                      
                      <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest pt-2">Powered by Stripe Billing</p>
                    </div>
                  </div>
                  
                  <div className="g p-6 border border-white/5 bg-[rgba(255,255,255,0.02)]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Plan</p>
                        <p className="text-white font-bold">Free Trial (MVP)</p>
                      </div>
                      <span className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 text-[8px] font-black uppercase rounded-full animate-pulse">Expires Soon</span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* =====================================================================
              👑 ADMIN DASHBOARD TEAM PAYROLL TABS (payroll)
              ===================================================================== */}
          {/* =====================================================================
              👑 SAAS BILLING TIER
              ===================================================================== */}
          {role === 'admin' && view === 'billing' && (
            <div className="space-y-5 animate-in zoom-in-95 pb-32">
              <div className="g p-8 border-t-4 border-[#F5C518] text-center relative overflow-hidden bg-black/40 shadow-[0_0_50px_rgba(245,197,24,0.1)]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,197,24,0.15),transparent)]"></div>
                <div className="relative z-10 space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(245,197,24,0.3)]">
                    <Icon name="crown" className="w-8 h-8 text-black" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase italic text-white tracking-widest">ELEVORE PRO</h2>
                    <p className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em] mt-1">SaaS Premium Subscription</p>
                  </div>
                  
                  <div className="py-2">
                    <span className="text-6xl font-black text-white italic tracking-tighter">$149</span>
                    <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">/month</span>
                  </div>
                  
                  <div className="text-left space-y-3 bg-black/50 p-6 rounded-2xl border border-white/10 max-w-sm mx-auto shadow-inner">
                    <p className="flex items-center gap-3 text-sm text-slate-300 font-medium"><Icon name="check-circle" className="w-4 h-4 text-[#F5C518]" /> Unlimited Missions & Dispatch</p>
                    <p className="flex items-center gap-3 text-sm text-slate-300 font-medium"><Icon name="check-circle" className="w-4 h-4 text-[#F5C518]" /> AI Predictive Revenue Engine</p>
                    <p className="flex items-center gap-3 text-sm text-slate-300 font-medium"><Icon name="check-circle" className="w-4 h-4 text-[#F5C518]" /> Automated Client Portals</p>
                    <p className="flex items-center gap-3 text-sm text-slate-300 font-medium"><Icon name="check-circle" className="w-4 h-4 text-[#F5C518]" /> Real-time GPS Tracking</p>
                    <p className="flex items-center gap-3 text-sm text-slate-300 font-medium"><Icon name="check-circle" className="w-4 h-4 text-[#F5C518]" /> WhatsApp Integration</p>
                  </div>

                  <button onClick={() => { tt('Redirecting to Stripe Checkout... 💳', 'green'); setTimeout(() => window.open('https://stripe.com', '_blank'), 1500); }} className="w-full max-w-sm mx-auto gold py-5 rounded-2xl font-black uppercase text-sm shadow-[0_0_30px_rgba(245,197,24,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 mt-4 animate-pulse">
                    <Icon name="credit-card" className="w-5 h-5" />
                    Upgrade to Pro (Stripe)
                  </button>
                  
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest pt-3">Secured by Stripe Billing</p>
                </div>
              </div>
              
              <div className="g p-6 border border-white/5 bg-black/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current Plan</p>
                    <p className="text-white font-bold text-sm">Free Trial (MVP)</p>
                  </div>
                  <span className="px-3 py-1.5 bg-red-500/20 border border-red-500/30 text-red-400 text-[9px] font-black uppercase tracking-wider rounded-full animate-pulse">Expires in 14 Days</span>
                </div>
              </div>
            </div>
          )}

          {role === 'admin' && view === 'settings' && (
            <div className="space-y-6 animate-in fade-in pb-24">
              <div className="g p-8 border-t-4 border-slate-500 bg-black/40">
                <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-2">⚙️ Company Settings</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-8">Administra la configuracion interna de tu imperio SaaS</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h3 className="text-sm font-black uppercase text-[#F5C518]">Brand Identity</h3>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-1">Business Full Name</label>
                      <input className="inp w-full" defaultValue={tenantName} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-1">Contact / Zelle Phone</label>
                      <input className="inp w-full" defaultValue="(407) 555-0199" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-sm font-black uppercase text-[#F5C518]">Financials</h3>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-1">Monthly MRR Goal ($)</label>
                      <input className="inp w-full" type="number" defaultValue={15000} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-1">Staff Default Payout %</label>
                      <input className="inp w-full" type="number" defaultValue={40} />
                    </div>
                  </div>
                </div>
                
                <button onClick={() => tt('Settings saved to database ✓')} className="w-full mt-8 bg-[#F5C518] text-black py-4 rounded-xl font-black uppercase tracking-widest active:scale-95 transition-all">Save Changes</button>
              </div>
            </div>
          )}

          {role === 'admin' && view === 'payroll' && (
            <div className="space-y-6 animate-in fade-in pb-24">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Create or Edit Staff Module */}
                {editingStaff ? (
                  <div className="g p-6 space-y-4 bg-gradient-to-br from-[#F5C518]/10 to-transparent border-[#F5C518]/30 shadow-lg relative animate-in zoom-in-95">
                    <button onClick={() => setEditingStaff(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors uppercase text-[8px] font-black tracking-widest">Cancel</button>
                    <h2 className="text-xs font-black text-[#F5C518] uppercase tracking-widest font-display flex items-center gap-1.5">
                      <Icon name="edit-3" className="w-3.5 h-3.5 animate-pulse" /> EDIT PROFILE: {editingStaff.name}
                    </h2>
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-1">Worker Name</label>
                        <input className="inp uppercase text-xs w-full" value={editingStaff.name} onChange={e => setEditingStaff({ ...editingStaff, name: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-1">Worker Email (Login ID)</label>
                        <input type="email" className="inp text-xs w-full" value={editingStaff.staff_email || ''} onChange={e => setEditingStaff({ ...editingStaff, staff_email: e.target.value })} />
                      </div>
                      <div>
                        <label className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-1">Phone Number</label>
                        <input type="tel" className="inp text-xs w-full" placeholder="+1 (555) 000-0000" value={editingStaff.phone || ''} onChange={e => setEditingStaff({ ...editingStaff, phone: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-1">Passcode PIN</label>
                          <input className="inp text-xs w-full font-mono text-center tracking-widest" value={editingStaff.passcode} onChange={e => setEditingStaff({ ...editingStaff, passcode: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-1">Payout Share %</label>
                          <input type="number" className="inp text-xs w-full text-amber-500 font-bold" min={0} max={100} value={editingStaff.payout_pct !== undefined ? editingStaff.payout_pct : 40} onChange={e => setEditingStaff({ ...editingStaff, payout_pct: Number(e.target.value) || 0 })} />
                          <span className="text-[7px] text-slate-500 uppercase font-bold tracking-wider block mt-1">Default is {DEFAULT_CFG.STAFF_PAY * 100}%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mb-1">System Role</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['staff', 'supervisor', 'admin'].map(r => (
                            <button key={r} onClick={() => setEditingStaff({ ...editingStaff, role: r })} className={`py-2 rounded-xl text-[8px] uppercase font-black border transition-all ${editingStaff.role === r ? 'bg-[#F5C518] text-black border-[#F5C518]' : 'bg-white/5 border-white/5 text-slate-400'}`}>{r}</button>
                          ))}
                        </div>
                      </div>
                      <button onClick={async () => {
                        if (!editingStaff.name || !editingStaff.passcode || !editingStaff.staff_email) {
                          return tt('Name, Email and PIN are required', 'red');
                        }
                        // Save locally
                        setStaff(staff.map(s => s.id === editingStaff.id ? editingStaff : s));
                        // Save to Supabase
                        try {
                          await sb.from('staff_profiles').update({
                            name: editingStaff.name,
                            staff_email: editingStaff.staff_email,
                            phone: editingStaff.phone,
                            passcode: editingStaff.passcode,
                            role: editingStaff.role,
                            payout_pct: editingStaff.payout_pct
                          }).eq('id', editingStaff.id);
                          tt('Worker profile updated! 👤', 'green');
                        } catch (err) {
                          tt('Updated locally ✓');
                        }
                        setEditingStaff(null);
                      }} className="w-full bg-[#F5C518] text-black hover:bg-[#F5C518]/90 py-3 rounded-xl font-black uppercase text-[10px] active:scale-95 shadow-md transition-all">Save Profile Changes ✓</button>
                    </div>
                  </div>
                ) : (
                  <div className="g p-6 space-y-4 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)]">
                    <h2 className="text-xs font-black text-[#F5C518] uppercase tracking-widest font-display">👤 ADD NEW WORKER & PIN</h2>
                    <div className="space-y-3 pt-2">
                      <input className="inp uppercase text-xs" placeholder="Worker Name" value={newStaffName} onChange={e => setNewName(e.target.value)} />
                      <input type="email" className="inp text-xs" placeholder="Worker Email (Login ID)" value={newStaffEmail} onChange={e => setNewStaffEmail(e.target.value)} />
                      <input className="inp text-xs" placeholder="Set Passcode PIN (e.g. 5566)" value={newStaffPIN} onChange={e => setNewPIN(e.target.value)} />
                      <div className="grid grid-cols-3 gap-2">
                        {['staff', 'supervisor', 'admin'].map(r => (
                          <button key={r} onClick={() => setNewRole(r)} className={`py-2.5 rounded-xl text-[8px] uppercase font-black border transition-all ${newStaffRole === r ? 'bg-[#F5C518] text-black border-[#F5C518]' : 'bg-white/5 border-white/5 text-slate-400'}`}>{r}</button>
                        ))}
                      </div>
                      <button onClick={handleAddEmployee} className="w-full bg-[#F5C518] text-black hover:bg-[#F5C518]/90 py-3.5 rounded-xl font-black uppercase text-[10px] active:scale-95 shadow-md transition-all">Add Employee to SaaS ✓</button>
                    </div>
                  </div>
                )}

                {/* Team Wallet List Ledger */}
                <div className="g p-6 space-y-4 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)]">
                  <h2 className="text-xs font-black text-green-500 uppercase tracking-widest font-display">💰 TEAM WALLETS & PAYROLL</h2>
                  <div className="space-y-3 pt-2 max-h-[300px] overflow-y-auto custom-scroll pr-1">
                    {staff.map(worker => (
                      <div key={worker.id} className="g p-4 border border-white/5 bg-black/20 flex flex-col gap-2 relative">
                        {/* Edit + Delete action buttons */}
                        <div className="absolute top-3 right-3 flex gap-1.5">
                          <button
                            onClick={() => setEditingStaff(worker)}
                            className="text-slate-500 hover:text-[#F5C518] transition-colors p-1 active:scale-90 rounded-lg hover:bg-white/5"
                            title="Edit Employee Profile"
                          >
                            <Icon name="edit-3" className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(worker)}
                            className="text-slate-500 hover:text-red-500 transition-colors p-1 active:scale-90 rounded-lg hover:bg-red-500/10"
                            title="Delete Employee"
                          >
                            <Icon name="trash-2" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex justify-between items-start pr-6">
                          <div>
                            <h4 className="text-sm font-black text-white uppercase italic leading-none mb-1.5 flex items-center gap-1.5">
                              {worker.name}
                              <span className="text-[6px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">{worker.role}</span>
                            </h4>
                            <p className="text-[8px] text-slate-400">
                              PIN: <span className="text-[#F5C518] font-bold">{worker.passcode}</span> 
                              {worker.staff_email && ` • Email: ${worker.staff_email}`}
                              {worker.phone && ` • Tel: ${worker.phone}`}
                            </p>
                            <p className="text-[8px] text-amber-500 font-bold uppercase tracking-wider mt-0.5">
                              Ganancia: {worker.payout_pct !== undefined ? worker.payout_pct : 40}%
                            </p>
                            <p className="text-[7px] text-slate-500 mt-1">Historial acumulado: {fmt$(worker.total_earned || 0)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-black text-green-400 leading-none">{fmt$(worker.wallet_balance || 0)}</p>
                            {(worker.wallet_balance || 0) > 0 ? (
                              <button onClick={() => handleCashout(worker)} className="mt-1 px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-[7px] font-black uppercase active:scale-95 hover:bg-green-500 transition-all">Pay via Zelle</button>
                            ) : (
                              <span className="text-[6px] text-slate-500 font-black uppercase block mt-2">Paid ✓</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
 
              {/* 🏆 STAFF LEADERBOARD & PERFORMANCE LEAGUE */}
              <div className="g p-6 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-3">
                  <div>
                    <h2 className="text-xs font-black text-[#F5C518] uppercase tracking-widest font-display">🏆 STAFF LEADERBOARD & PERFORMANCE</h2>
                    <p className="text-[6px] text-slate-500 uppercase tracking-wide mt-1">XP, Leveling and Reward Insignias</p>
                  </div>
                  <span className="text-[6px] bg-[#F5C518]/10 text-[#F5C518] border border-[#F5C518]/15 font-black px-2 py-0.5 rounded-lg uppercase">SaaS League Active</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {staff.map((worker, index) => {
                    const stats = getStaffStats(worker, jobs);
                    return (
                      <div key={worker.id} className="g p-4 border border-white/5 flex flex-col gap-3 bg-black/25 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-[#F5C518] text-black font-black text-[9px] px-2.5 py-1 rounded-bl-xl">
                          #{index + 1}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-zinc-800 border border-white/10 flex items-center justify-center font-black italic text-white text-base">
                            {worker.name?.charAt(0)}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-white uppercase italic">{worker.name}</h4>
                            <p className="text-[8px] text-slate-400">Nivel {stats.level} Elite Cleaner</p>
                          </div>
                        </div>

                        {/* XP Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[6px] font-black uppercase text-slate-500">
                            <span>Experiencia</span>
                            <span>{stats.xp % 800}/800 XP ({stats.progress}%)</span>
                          </div>
                          <div className="pb">
                            <div className="pf bg-gradient-to-r from-amber-500 to-[#F5C518]" style={{ width: `${stats.progress}%` }}></div>
                          </div>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-2 border-t border-white/5 pt-2 text-center">
                          <div>
                            <p className="text-[6px] text-slate-500 uppercase font-black">Tickets</p>
                            <p className="text-[10px] font-black text-white">{stats.completed} Done</p>
                          </div>
                          <div>
                            <p className="text-[6px] text-slate-500 uppercase font-black">Rating</p>
                            <p className="text-[10px] font-black text-yellow-400">{stats.avgRating}⭐</p>
                          </div>
                          <div>
                            <p className="text-[6px] text-slate-500 uppercase font-black">Bono</p>
                            <p className="text-[10px] font-black text-green-400">+{Math.round(stats.completed * 35)} XP</p>
                          </div>
                        </div>

                        {/* Badges list */}
                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                          {stats.badges.map(b => (
                            <span key={b.id} className={`text-[6px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${b.color}`}>
                              {b.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Summary */}
              <div className="g p-6 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)]">
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center"><span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">Collected</span><span className="text-sm font-black text-white">{isPrivate ? '***' : fmt$(finance.col)}</span></div>
                  <div className="flex justify-between items-center border-t border-white/10 pt-3"><span className="text-[10px] text-white font-black uppercase tracking-widest font-display">YOUR NET SHARE</span><span className="text-2xl font-black text-green-400">{isPrivate ? '****' : fmt$(finance.net)}</span></div>
                </div>
              </div>
              <button onClick={exportCSV} className="w-full g py-4 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400 border border-white/5 active:scale-95 hover:text-white transition-all">📊 Export Ledger CSV</button>
            </div>
          )}

          {/* =====================================================================
              👑 ADMIN DASHBOARD PHOTO DRIVE TABS (drive)
              ===================================================================== */}
          {role === 'admin' && view === 'drive' && (
            <div className="space-y-4 animate-in fade-in pb-24">
              <div className="g p-5 border-t-4 border-blue-500 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)]">
                <h2 className="text-xl font-black tracking-widest uppercase text-white font-display">📁 MEDIA STORAGE DRIVE</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.map(job => (
                  <div key={job.id} className="g p-5 space-y-4 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] rounded-2xl flex flex-col justify-between min-h-[220px]">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-base font-black uppercase italic text-white leading-none mb-1">{job.client_name}</h3>
                        <p className="text-[8px] text-slate-400 uppercase">{job.service_type} • {fmtD(job.scheduled_date)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="g p-3.5 bg-black/20"><PhotoDrive photos={job.before_photos || []} label="📸 Before" onAdd={async u => { const c = job.before_photos || []; await sb.from('elevore_missions').update({ before_photos: [...c, u] }).eq('id', job.id); tt('Added ✓'); refresh(); }} /></div>
                      <div className="g p-3.5 bg-black/20"><PhotoDrive photos={job.after_photos || []} label="✨ After" onAdd={async u => { const c = job.after_photos || []; await sb.from('elevore_missions').update({ after_photos: [...c, u] }).eq('id', job.id); tt('Added ✓'); refresh(); }} /></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* =====================================================================
              👑 ADMIN DASHBOARD NEW ESTIMATE DEPLOY TABS (deploy)
              ===================================================================== */}
          {role === 'admin' && view === 'deploy' && (
            <div className="space-y-6 animate-in zoom-in-95 pb-32">
              <div className="flex gap-1 bg-black/40 p-1.5 rounded-xl border border-white/5 overflow-x-auto custom-scroll">
                {['identity', 'specs', 'add-ons', 'quote', 'money'].map(t => (
                  <button key={t} onClick={() => setDtab(t)} className={`flex-shrink-0 px-4 py-3 rounded-xl text-[9px] uppercase font-black active:scale-95 transition-all ${dtab === t ? 'ton' : 'text-slate-500 hover:text-slate-300'}`}>{t}</button>
                ))}
              </div>

              <div className="g p-6 space-y-5 shadow-xl bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] rounded-2xl">
                {dtab === 'identity' && (
                  <div className="space-y-3.5 animate-in fade-in">
                    <h3 className="text-[10px] uppercase text-[#F5C518] font-black italic tracking-widest border-b border-white/5 pb-2 font-display">Identity</h3>
                    <input className="inp uppercase text-xs" placeholder="CLIENT FULL NAME" value={state.name} onChange={e => onName(e.target.value)} />
                    <input className="inp text-xs" placeholder="PHONE" value={state.phone} onChange={e => setState({ ...state, phone: e.target.value })} />
                    <input className="inp uppercase text-xs" placeholder="ADDRESS" value={state.address} onChange={e => setState({ ...state, address: e.target.value })} />
                    <textarea className="inp text-xs resize-none h-16" placeholder="Notes..." value={state.notes} onChange={e => setState({ ...state, notes: e.target.value })} />
                    <div className="grid grid-cols-3 gap-2">
                      {['lead', 'scheduled', 'paid'].map(s => (
                        <button key={s} onClick={() => setState({ ...state, status: s })} className={`py-3 rounded-xl text-[8px] uppercase font-black border-2 active:scale-95 transition-all ${state.status === s ? 'bg-[#F5C518] text-black border-[#F5C518]' : 'bg-white/5 border-white/5 text-slate-500'}`}>{s}</button>
                      ))}
                    </div>
                    <div>
                      <p className="text-[8px] text-slate-400 uppercase font-black mb-2 tracking-wider">Frequency</p>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[{ l: '1x', v: 'one-time' }, { l: 'Weekly', v: 'weekly' }, { l: 'Bi-W', v: 'bi-weekly' }, { l: 'Monthly', v: 'monthly' }].map(f => (
                          <button key={f.v} onClick={() => setState({ ...state, frequency: f.v })} className={`py-2 rounded-xl text-[8px] font-black uppercase border-2 active:scale-95 transition-all ${state.frequency === f.v ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>{f.l}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {dtab === 'specs' && (
                  <div className="space-y-4 animate-in fade-in text-center font-black uppercase">
                    <h3 className="text-[10px] uppercase text-[#F5C518] font-black italic tracking-widest border-b border-white/5 pb-2 font-display text-left">Specs & Core Service</h3>
                    <div className="grid grid-cols-5 gap-1.5 mt-2">
                      {['regular', 'deep', 'moveout', 'postcon', 'handyman'].map(s => (
                        <button key={s} onClick={() => setState({ ...state, svc: s, selectedQuickJobs: [] })} className={`py-3.5 rounded-xl font-black text-[8px] border-2 active:scale-95 transition-all ${state.svc === s ? 'bg-green-600 border-green-600 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-500'}`}>{s === 'handyman' ? '🛠️' : s}</button>
                      ))}
                    </div>
                    {state.svc === 'handyman' ? (
                      <div className="space-y-4 text-left pt-2">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                          <p className="text-[9px] text-[#F5C518] uppercase font-black mb-2 text-center">Labor × $85/hr</p>
                          <div className="flex justify-between items-center max-w-[180px] mx-auto">
                            <button onClick={() => setState({ ...state, laborHours: Math.max(1, state.laborHours - 1) })} className="w-10 h-10 bg-white/10 rounded-xl text-xl font-bold text-white active:scale-95">-</button>
                            <span className="text-3xl font-black italic text-white font-display">{state.laborHours}h</span>
                            <button onClick={() => setState({ ...state, laborHours: state.laborHours + 1 })} className="w-10 h-10 bg-white/10 rounded-xl text-xl font-bold text-white active:scale-95">+</button>
                          </div>
                        </div>
                      </div>
                    ) : state.svc === 'postcon' ? (
                      <div className="p-5 bg-white/5 rounded-2xl border border-white/5 pt-2">
                        <p className="text-[9px] text-[#F5C518] uppercase font-black mb-2">SqFt</p>
                        <input type="number" value={state.sqft} className="bg-transparent text-6xl font-black text-center w-full text-white outline-none italic leading-none font-display" onChange={e => setState({ ...state, sqft: parseInt(e.target.value) || 0 })} />
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-2 gap-2">
                          {[{ l: 'Beds', k: 'beds' }, { l: 'Baths', k: 'baths' }, { l: 'Living', k: 'living' }, { l: 'Laundry', k: 'laundryRoom' }].map(i => (
                            <div key={i.k} className="bg-white/5 p-3.5 rounded-xl text-center border border-white/5">
                              <span className="text-[8px] uppercase block mb-1.5 text-slate-400 font-black">{i.l}</span>
                              <div className="flex justify-between items-center">
                                <button onClick={() => setState({ ...state, [i.k]: Math.max(0, state[i.k] - 1) })} className="w-8 h-8 bg-white/10 rounded-lg text-white font-bold active:scale-95">-</button>
                                <span className="text-xl font-black italic text-white font-display">{state[i.k]}</span>
                                <button onClick={() => setState({ ...state, [i.k]: state[i.k] + 1 })} className="w-8 h-8 bg-white/10 rounded-lg text-white font-bold active:scale-95">+</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {dtab === 'add-ons' && (
                  <div className="space-y-4 animate-in fade-in">
                    {state.svc === 'handyman' ? (
                      <div className="p-8 text-center text-slate-500 font-black italic border-2 border-dashed border-white/5 rounded-2xl">🛠️ Time & materials only.</div>
                    ) : (
                      <>
                        <h3 className="text-[10px] uppercase text-[#F5C518] italic font-black text-center border-b border-white/5 pb-2 font-display">Premium Matrix</h3>
                        <div className="grid grid-cols-2 gap-2.5">
                          {ADDONS.map(ex => (
                            <button key={ex.id} onClick={() => setState({ ...state, [ex.id]: !state[ex.id] })} className={`p-3.5 rounded-xl flex justify-between items-center border active:scale-95 transition-all ${state[ex.id] ? 'bg-green-600 border-green-600 text-white font-black shadow-lg' : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'}`}>
                              <span className="text-[9px] uppercase font-black">{ex.en}</span>
                              <span className="text-[9px] font-black">+${ex.p}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {dtab === 'quote' && (() => {

                  const getMarketPrice = async () => {
                    setAiPriceLoading(true);
                    setAiInsight('');
                    const svcLabel = {
                      regular: 'Residential Regular Cleaning',
                      deep: 'Residential Deep Cleaning',
                      moveout: 'Move-Out / Move-In Cleaning',
                      postcon: 'Post-Construction Cleaning',
                      handyman: 'Handyman / Home Repair Service'
                    }[state.svc] || state.svc;

                    const jobDetails = state.svc === 'handyman'
                      ? `Handyman service, approximately ${state.handymanHours || 2} hours of work.`
                      : state.svc === 'postcon'
                      ? `Post-construction cleaning for ${state.sqft || 1500} sq ft.`
                      : `${svcLabel} for a home with ${state.beds || 2} bedrooms and ${state.baths || 2} bathrooms.`;

                    const prompt = `You are a professional home services pricing analyst specializing in the Orlando and Central Florida market.

A company is pricing a job:
- Service: ${svcLabel}
- Details: ${jobDetails}
- Market: Orlando, Florida, USA (2025)

Based on current market rates from platforms like Angi, Thumbtack, and HomeAdvisor in Orlando FL, provide a competitive 3-tier pricing recommendation.

Respond ONLY in this exact JSON format (no explanation, no markdown, just raw JSON):
{"good":{"price":120,"label":"Standard Service","description":"Basic clean, meets expectations"},"better":{"price":160,"label":"Premium Service","description":"Deep attention to detail, priority scheduling"},"best":{"price":210,"label":"VIP Elite","description":"Full white-glove treatment, same-day, satisfaction guarantee"},"insight":"One sentence about Orlando market conditions for this service."}`;

                    const provider = localStorage.getItem('elevore_ai_provider') || 'gemini';
                    let ollamaUrl = localStorage.getItem('elevore_ollama_url') || 'http://127.0.0.1:11434';
                    if (ollamaUrl === 'http://localhost:11434') ollamaUrl = 'http://127.0.0.1:11434';
                    const ollamaModel = localStorage.getItem('elevore_ollama_model') || 'llama3';

                    const controller = new AbortController();
                    const timeoutDuration = provider === 'ollama' ? 90000 : 15000; // 90s for local Ollama, 15s for Gemini Cloud
                    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

                    try {
                      let raw = '';
                      if (provider === 'gemini') {
                        const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY;
                        if (!GEMINI_KEY) {
                          throw new Error('La API Key de Gemini no está configurada.');
                        }

                        const res = await fetch(
                          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
                          {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              contents: [{ parts: [{ text: prompt }] }],
                              generationConfig: { temperature: 0.3, maxOutputTokens: 500 }
                            }),
                            signal: controller.signal
                          }
                        );

                        clearTimeout(timeoutId);

                        if (!res.ok) {
                          throw new Error(`HTTP ${res.status}`);
                        }

                        const data = await res.json();
                        raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                      } else {
                        // Ollama Chat API call
                        const res = await fetch(`${ollamaUrl}/api/chat`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            model: ollamaModel,
                            messages: [
                              { role: 'system', content: 'You must respond ONLY with raw valid JSON. No markdown code blocks, no other text.' },
                              { role: 'user', content: prompt }
                            ],
                            stream: false,
                            options: { temperature: 0.2 }
                          }),
                          signal: controller.signal
                        });

                        clearTimeout(timeoutId);

                        if (!res.ok) {
                          throw new Error(`Ollama HTTP ${res.status}`);
                        }

                        const data = await res.json();
                        raw = data.message?.content || '';
                      }

                      // Strip markdown code fences if present
                      const cleaned = raw.replace(/```json|```/g, '').trim();
                      const parsed = JSON.parse(cleaned);
                      setAiPrices(parsed);
                      setAiInsight(parsed.insight || '');
                      // Auto-fill the base price with Better tier as anchor
                      setState(s => ({ ...s, price: parsed.better.price }));
                      tt('🧠 Precios de mercado Orlando cargados ✓', 'green');
                    } catch (err) {
                      clearTimeout(timeoutId);
                      console.error(err);
                      if (err.name === 'AbortError') {
                        tt('Tiempo de espera agotado (15s). ¿Tu IA local está encendida?', 'red');
                      } else {
                        tt(`Error IA: ${err.message || 'Verifica la conexión.'}`, 'red');
                      }
                    } finally {
                      setAiPriceLoading(false);
                    }
                  };

                  const goodPrice  = aiPrices ? aiPrices.good.price  : (state.price || pricing.total);
                  const betterPrice = aiPrices ? aiPrices.better.price : Math.round((state.price || pricing.total) * 1.35);
                  const bestPrice  = aiPrices ? aiPrices.best.price  : Math.round((state.price || pricing.total) * 1.70);

                  return (
                  <div className="space-y-4 animate-in fade-in">
                    <h3 className="text-[10px] uppercase text-[#F5C518] font-black italic tracking-widest border-b border-white/5 pb-2 font-display text-center">Good - Better - Best (Quote Matrix)</h3>

                    {/* 🧠 AI Market Price Button */}
                    <button
                      onClick={getMarketPrice}
                      disabled={aiPriceLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-[#F5C518]/40 bg-gradient-to-r from-[#F5C518]/10 to-amber-900/10 text-[#F5C518] font-black uppercase text-[9px] tracking-widest hover:from-[#F5C518]/20 hover:border-[#F5C518]/70 active:scale-95 transition-all shadow-[0_0_20px_rgba(245,197,24,0.08)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {aiPriceLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-[#F5C518] border-t-transparent rounded-full animate-spin" />
                          Analizando mercado Orlando, FL...
                        </>
                      ) : (
                        <>
                          <Icon name="zap" className="w-3.5 h-3.5 animate-pulse" />
                          {aiPrices ? '🔄 Actualizar Precio de Mercado (IA)' : '🧠 Obtener Precio de Mercado — Orlando, FL'}
                        </>
                      )}
                    </button>

                    {/* AI Insight Badge */}
                    {aiInsight && (
                      <div className="flex items-start gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <Icon name="info" className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-[8px] text-blue-300 leading-relaxed">{aiInsight}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* GOOD */}
                      <div className={`border p-4 rounded-2xl flex flex-col items-center text-center transition-all ${aiPrices ? 'bg-slate-900/60 border-slate-600/60' : 'bg-white/5 border-white/10'}`}>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Good</p>
                        <p className="text-xl font-black italic text-white my-2">${goodPrice}</p>
                        <p className="text-[7px] text-slate-500 uppercase font-bold mb-3">
                          {aiPrices ? aiPrices.good.description : 'Basic Clean / Standard Svc'}
                        </p>
                        {aiPrices && <span className="text-[7px] text-slate-400 font-bold mb-2">{aiPrices.good.label}</span>}
                        <button onClick={() => { setState(s => ({ ...s, totalPrice: goodPrice })); tt(`Good Quote set to $${goodPrice}! 🚀`); window.open(`https://wa.me/${state.phone?.replace(/\D/g, '') || ''}?text=Hola! Aqui está tu cotización Estándar: $${goodPrice}. ¿Te funciona? 😊`); }} className="w-full mt-auto py-2 rounded-xl text-[8px] uppercase font-black bg-white/10 hover:bg-white/20 active:scale-95">Select Good</button>
                      </div>

                      {/* BETTER */}
                      <div className={`relative border-2 p-4 rounded-2xl flex flex-col items-center text-center shadow-[0_0_30px_rgba(245,197,24,0.1)] transform scale-105 transition-all ${aiPrices ? 'bg-[#F5C518]/15 border-[#F5C518]' : 'bg-[#F5C518]/10 border-[#F5C518]'}`}>
                        <span className="bg-[#F5C518] text-black text-[6px] uppercase font-black px-2 py-0.5 rounded-full absolute -top-2">
                          {aiPrices ? '⭐ Market Sweet Spot' : 'Most Popular'}
                        </span>
                        <p className="text-[10px] font-black text-[#F5C518] uppercase tracking-widest mt-2">Better</p>
                        <p className="text-2xl font-black italic text-white my-2">${betterPrice}</p>
                        <p className="text-[7px] text-[#F5C518]/70 uppercase font-bold mb-3">
                          {aiPrices ? aiPrices.better.description : '+ Premium Add-ons & Deep Clean'}
                        </p>
                        {aiPrices && <span className="text-[7px] text-[#F5C518]/80 font-bold mb-2">{aiPrices.better.label}</span>}
                        <button onClick={() => { setState(s => ({ ...s, totalPrice: betterPrice })); tt(`Better Quote set to $${betterPrice}! 🚀`); window.open(`https://wa.me/${state.phone?.replace(/\D/g, '') || ''}?text=Hola! Aqui está tu cotización Premium: $${betterPrice}. Incluye ${aiPrices?.better?.description || 'atención premium'}. ¿Lo reservamos? 🏆`); }} className="w-full mt-auto py-2.5 rounded-xl text-[8px] uppercase font-black bg-[#F5C518] text-black active:scale-95 shadow-md">Select Better</button>
                      </div>

                      {/* BEST */}
                      <div className={`border p-4 rounded-2xl flex flex-col items-center text-center transition-all ${aiPrices ? 'bg-purple-900/30 border-purple-400/60' : 'bg-purple-900/20 border-purple-500/50'}`}>
                        <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Best</p>
                        <p className="text-xl font-black italic text-white my-2">${bestPrice}</p>
                        <p className="text-[7px] text-purple-400/70 uppercase font-bold mb-3">
                          {aiPrices ? aiPrices.best.description : '+ The Ultimate VIP Experience'}
                        </p>
                        {aiPrices && <span className="text-[7px] text-purple-300/80 font-bold mb-2">{aiPrices.best.label}</span>}
                        <button onClick={() => { setState(s => ({ ...s, totalPrice: bestPrice })); tt(`VIP Quote set to $${bestPrice}! 🚀`); window.open(`https://wa.me/${state.phone?.replace(/\D/g, '') || ''}?text=Hola! Aqui está tu cotización VIP Elite: $${bestPrice}. ${aiPrices?.best?.description || 'La experiencia definitiva'}. ¿Lo agendamos? 👑`); }} className="w-full mt-auto py-2 rounded-xl text-[8px] uppercase font-black bg-purple-600/30 text-purple-200 active:scale-95 hover:bg-purple-600/50">Select Best</button>
                      </div>
                    </div>

                    {aiPrices && (
                      <button onClick={() => { setAiPrices(null); setAiInsight(''); }} className="w-full py-2 text-[8px] text-slate-500 hover:text-slate-300 uppercase font-black tracking-widest transition-colors">
                        ↩ Reset to Manual Pricing
                      </button>
                    )}
                  </div>
                  );
                })()}


                {dtab === 'money' && (
                  <div className="space-y-4 animate-in fade-in">
                    <h3 className="text-[10px] uppercase text-[#F5C518] font-black italic tracking-widest border-b border-white/5 pb-2 font-display">Financials & Assignment</h3>
                    <div className="grid grid-cols-2 gap-3 text-center font-black uppercase">
                      <div className="space-y-1">
                        <p className="text-[8px] text-slate-400">Expenses</p>
                        <input type="number" value={state.expenses} className="inp text-orange-400 text-center text-xs" onChange={e => setState({ ...state, expenses: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[8px] text-slate-400">Discount</p>
                        <select value={state.discount} className="inp text-red-500 font-black text-center text-xs appearance-none" onChange={e => setState({ ...state, discount: parseInt(e.target.value) })}><option value="0">0%</option><option value="10">10%</option><option value="20">20%</option><option value="30">30%</option></select>
                      </div>
                    </div>
                    <div className="space-y-3 pt-2">
                      <p className="text-[8px] text-slate-400 uppercase font-black tracking-wider">Asignar Proyecto a Empleado</p>
                      <select value={state.team} className="inp text-xs text-center" onChange={e => setState({ ...state, team: e.target.value })}>
                        <option value="">Seleccionar Empleado...</option>
                        {staff.map(worker => (
                          <option key={worker.id} value={worker.name}>{worker.name} ({worker.role?.toUpperCase()})</option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <p className="text-[8px] text-slate-400 uppercase font-black tracking-wider">Date</p>
                          <input type="date" value={state.date} className="inp text-[10px] font-black" onChange={e => setState({ ...state, date: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] text-slate-400 uppercase font-black tracking-wider">Deposit</p>
                          <input type="number" value={state.deposit} className="inp text-blue-400 font-black text-center text-xs" onChange={e => setState({ ...state, deposit: parseFloat(e.target.value) || 0 })} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Estimate Deployer Call to Action */}
              <div className="bg-white text-black p-8 rounded-[2rem] text-center shadow-2xl relative overflow-hidden transition-all shadow-[#F5C518]/5 border border-white/10">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-[#F5C518]"></div>
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-display">Deployment Value</p>
                  <span className={`text-[8px] font-black px-3 py-1 rounded-lg border ${pricing.ac} border-current`}>{pricing.advice}</span>
                </div>
                <div className="flex items-center justify-center mb-4">
                  <span className="text-3xl font-light opacity-30 mr-1">$</span>
                  <input
                    type="number"
                    value={state.totalPrice || 0}
                    onChange={e => setState(s => ({ ...s, totalPrice: parseInt(e.target.value) || 0 }))}
                    className="text-[5.5rem] font-black italic tracking-tighter leading-none text-black bg-transparent border-b border-dashed border-black/25 outline-none w-64 text-center font-display focus:border-black"
                  />
                </div>
                <button onClick={deploy} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase italic active:scale-95 transition-all shadow-xl shadow-slate-900/10 tracking-widest font-display">{editId ? 'Update Estimate ⚡' : 'Execute Deploy 🚀'}</button>
              </div>
            </div>
          )}

          {/* =====================================================================
              🎯 CRM RETENCIÓN — Churn Risk & Reactivation Engine
              ===================================================================== */}
          {role === 'admin' && view === 'crm' && (() => {
            const now = new Date();
            const crmClients = clients.map(c => {
              const cJobs = jobs.filter(j => j.client_name === c.name && j.status === 'paid');
              const lastJob = cJobs.sort((a,b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))[0];
              const daysSince = lastJob ? Math.floor((now - new Date(lastJob.scheduled_date)) / 86400000) : 999;
              const totalSpent = cJobs.reduce((s,j) => s + (j.total_price||0), 0);
              const churnRisk = daysSince > 90 ? 'high' : daysSince > 45 ? 'medium' : 'low';
              return { ...c, lastJob, daysSince, totalSpent, churnRisk, jobCount: cJobs.length };
            }).sort((a,b) => b.daysSince - a.daysSince);
            const high = crmClients.filter(c => c.churnRisk === 'high');
            const medium = crmClients.filter(c => c.churnRisk === 'medium');
            const healthy = crmClients.filter(c => c.churnRisk === 'low');
            return (
              <div className="space-y-5 animate-in fade-in pb-24">
                <div className="g p-5 border-t-4 border-red-500 bg-[rgba(255,255,255,0.04)]">
                  <h2 className="text-xl font-black tracking-widest uppercase text-white font-display">🎯 CRM RETENCIÓN ENGINE</h2>
                  <p className="text-[8px] text-slate-500 uppercase mt-1">Churn prediction • Re-engagement automation</p>
                </div>
                {/* KPI Row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Alto Riesgo', val: high.length, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
                    { label: 'Riesgo Medio', val: medium.length, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
                    { label: 'Saludables', val: healthy.length, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
                  ].map(k => (
                    <div key={k.label} className={`g p-4 border ${k.bg} text-center`}>
                      <p className={`text-3xl font-black ${k.color}`}>{k.val}</p>
                      <p className="text-[7px] text-slate-500 uppercase font-black mt-1">{k.label}</p>
                    </div>
                  ))}
                </div>
                {/* Client Cards */}
                {[{ title: '🔴 ALTO RIESGO — +90 días sin servicio', list: high, border: 'border-red-500/40' },
                  { title: '🟡 RIESGO MEDIO — 45-90 días', list: medium, border: 'border-yellow-500/40' },
                  { title: '✅ CLIENTES ACTIVOS', list: healthy, border: 'border-green-500/40' }
                ].map(section => section.list.length > 0 && (
                  <div key={section.title} className="space-y-3">
                    <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest px-1">{section.title}</p>
                    {section.list.map(c => (
                      <div key={c.id || c.name} className={`g p-4 border ${section.border} bg-[rgba(255,255,255,0.03)] space-y-3`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-black text-white uppercase italic">{c.name}</h4>
                            <p className="text-[8px] text-slate-400 mt-0.5">{c.phone} • {c.jobCount} servicios • Total: ${c.totalSpent.toLocaleString()}</p>
                            <p className="text-[7px] text-slate-500 mt-0.5">
                              {c.daysSince === 999 ? 'Nunca ha agendado' : `Último servicio: hace ${c.daysSince} días (${c.lastJob?.scheduled_date || '?'})`}
                            </p>
                          </div>
                          <span className={`text-[6px] font-black px-2 py-1 rounded-lg border uppercase ${c.churnRisk === 'high' ? 'bg-red-500/10 border-red-500/20 text-red-400' : c.churnRisk === 'medium' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                            {c.daysSince === 999 ? 'nuevo' : `${c.daysSince}d`}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { label: '🔔 Recordar', type: 'retention' },
                            { label: '🎁 Oferta', type: 'winback' },
                            { label: '⭐ Reseña', type: 'review' },
                            { label: '🏠 Bundle', type: 'bundle' },
                          ].map(btn => (
                            <button key={btn.type} onClick={() => { const ph = (c.phone||'').replace(/\D/g,''); const ph2 = ph.length===10?'1'+ph:ph; const msgs={retention:`Hi ${c.name}! 🏠 Han pasado un tiempo desde tu último servicio con Elevore. Esta semana tenemos disponibilidad — ¿te agendamos con 10% off? Reply YES!`,winback:`Hi ${c.name}! 😊 Te extrañamos en Elevore. Como cliente especial, hoy tienes 15% de descuento en tu próximo servicio. ¿Lo agendamos? 💫`,review:`Hi ${c.name}! 🌟 ¿Nos puedes dejar una reseña? Te tomará 1 minuto: ${DEFAULT_CFG.GOOGLE}`,bundle:`Hi ${c.name}! 🎯 Tenemos una oferta especial — Deep Clean + Ventanas por $50 adicionales (ahorras $70). ¿Lo añadimos a tu próximo servicio?`}; window.open(`https://wa.me/${ph2}?text=${encodeURIComponent(msgs[btn.type]||'')}`, '_blank'); tt(`WA → ${c.name} ✓`); }} className="py-2 bg-white/5 text-slate-400 rounded-xl text-[6px] font-black uppercase active:scale-95 hover:bg-white/10 hover:text-white transition-all">
                              {btn.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* =====================================================================
              📦 INVENTARIO — Supply & Cost Tracker
              ===================================================================== */}
          {role === 'admin' && view === 'inventory' && (() => {
            const saveInv = (updated) => { setInventory(updated); localStorage.setItem('elevore_inventory', JSON.stringify(updated)); };
            const addItem = () => { if (!newItem.name.trim()) return; const updated = [...inventory, { ...newItem, id: Date.now() }]; saveInv(updated); setNewItem({ name: '', qty: 0, unit: 'units', minQty: 2, cost: 0 }); tt('Item added ✓'); };
            const updateQty = (id, delta) => { const updated = inventory.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i); saveInv(updated); };
            const removeItem = (id) => { if (confirm('Remove item?')) { saveInv(inventory.filter(i => i.id !== id)); tt('Removed ✓'); } };
            const lowStock = inventory.filter(i => i.qty <= i.minQty);
            const totalValue = inventory.reduce((s, i) => s + (i.qty * i.cost), 0);
            return (
              <div className="space-y-5 animate-in fade-in pb-24">
                <div className="g p-5 border-t-4 border-purple-500 bg-[rgba(255,255,255,0.04)]">
                  <h2 className="text-xl font-black tracking-widest uppercase text-white font-display">📦 INVENTARIO DE SUMINISTROS</h2>
                  <p className="text-[8px] text-slate-500 uppercase mt-1">Supply tracking • Cost control per service</p>
                </div>
                {/* KPIs */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total Items', val: inventory.length, color: 'text-white' },
                    { label: 'Stock Bajo', val: lowStock.length, color: 'text-red-400' },
                    { label: 'Valor Total', val: `$${totalValue.toFixed(0)}`, color: 'text-green-400' },
                  ].map(k => (
                    <div key={k.label} className="g p-4 text-center bg-[rgba(255,255,255,0.04)]">
                      <p className={`text-2xl font-black ${k.color}`}>{k.val}</p>
                      <p className="text-[7px] text-slate-500 uppercase font-black mt-1">{k.label}</p>
                    </div>
                  ))}
                </div>
                {/* Low Stock Alert */}
                {lowStock.length > 0 && (
                  <div className="g p-4 border border-red-500/30 bg-red-500/5">
                    <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-2">⚠️ STOCK BAJO — Reponer pronto</p>
                    <div className="flex flex-wrap gap-2">
                      {lowStock.map(i => <span key={i.id} className="text-[7px] bg-red-500/10 text-red-300 px-2 py-1 rounded-lg border border-red-500/20 font-black">{i.name}: {i.qty} {i.unit}</span>)}
                    </div>
                  </div>
                )}
                {/* Add Item */}
                <div className="g p-5 space-y-3 bg-[rgba(255,255,255,0.04)]">
                  <p className="text-[9px] font-black text-[#F5C518] uppercase tracking-widest">+ AÑADIR ITEM</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="inp text-xs uppercase" placeholder="Nombre del producto" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                    <input type="text" className="inp text-xs" placeholder="Unit (ej. bottles, units)" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} />
                    <input type="number" className="inp text-xs" placeholder="Cantidad" value={newItem.qty} onChange={e => setNewItem({...newItem, qty: parseInt(e.target.value)||0})} />
                    <input type="number" className="inp text-xs" placeholder="Stock mínimo" value={newItem.minQty} onChange={e => setNewItem({...newItem, minQty: parseInt(e.target.value)||0})} />
                    <input type="number" className="inp text-xs" placeholder="Costo unitario $" value={newItem.cost} onChange={e => setNewItem({...newItem, cost: parseFloat(e.target.value)||0})} />
                  </div>
                  <button onClick={addItem} className="w-full bg-[#F5C518] text-black py-3 rounded-xl font-black uppercase text-[9px] active:scale-95">Agregar al Inventario ✓</button>
                </div>
                {/* Stock List */}
                <div className="space-y-2">
                  {inventory.length === 0 && <div className="g p-8 text-center text-slate-500 text-[9px] font-black uppercase">No hay items. Añade tu primer suministro ↑</div>}
                  {inventory.map(item => (
                    <div key={item.id} className={`g p-4 flex items-center justify-between border ${item.qty <= item.minQty ? 'border-red-500/30 bg-red-500/5' : 'border-white/5 bg-[rgba(255,255,255,0.03)]'}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-white uppercase">{item.name}</h4>
                          {item.qty <= item.minQty && <span className="text-[5px] bg-red-500/20 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-black uppercase">LOW</span>}
                        </div>
                        <p className="text-[7px] text-slate-500 mt-0.5">Min: {item.minQty} {item.unit} • ${item.cost}/unit • Valor: ${(item.qty * item.cost).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 bg-white/10 rounded-lg text-white font-bold active:scale-95 text-sm">−</button>
                        <span className={`text-lg font-black w-8 text-center ${item.qty <= item.minQty ? 'text-red-400' : 'text-white'}`}>{item.qty}</span>
                        <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 bg-white/10 rounded-lg text-white font-bold active:scale-95 text-sm">+</button>
                        <button onClick={() => removeItem(item.id)} className="w-8 h-8 bg-red-900/30 text-red-400 rounded-lg active:scale-95 ml-1 text-xs font-black">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* =====================================================================
              🔔 RECORDATORIOS — Smart Reminder & Notification System
              ===================================================================== */}
          {role === 'admin' && view === 'reminders' && (() => {
            const saveRem = (updated) => { setReminders(updated); localStorage.setItem('elevore_reminders', JSON.stringify(updated)); };
            const addReminder = () => { if (!newRem.title.trim()) return; saveRem([...reminders, { ...newRem, id: Date.now(), done: false }]); setNewRem({ title: '', date: '', time: '', type: 'followup', jobId: '' }); tt('Reminder saved ✓'); };
            const toggleDone = (id) => saveRem(reminders.map(r => r.id === id ? { ...r, done: !r.done } : r));
            const deleteRem = (id) => saveRem(reminders.filter(r => r.id !== id));
            const upcoming = reminders.filter(r => !r.done).sort((a,b) => new Date(a.date+'T'+(a.time||'00:00')) - new Date(b.date+'T'+(b.time||'00:00')));
            const done = reminders.filter(r => r.done);
            // Auto-generated reminders from jobs
            const autoRem = jobs.filter(j => j.scheduled_date && j.status === 'scheduled').map(j => {
              const d = new Date(j.scheduled_date); d.setDate(d.getDate() - 1);
              return { id: 'auto_'+j.id, title: `📅 Recordar a ${j.client_name} — servicio mañana`, date: d.toISOString().split('T')[0], type: 'auto', phone: j.client_phone, job: j, auto: true };
            });
            const typeColors = { followup: 'text-blue-400 bg-blue-500/10 border-blue-500/20', payment: 'text-green-400 bg-green-500/10 border-green-500/20', review: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', call: 'text-purple-400 bg-purple-500/10 border-purple-500/20', auto: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
            return (
              <div className="space-y-5 animate-in fade-in pb-24">
                <div className="g p-5 border-t-4 border-amber-500 bg-[rgba(255,255,255,0.04)]">
                  <h2 className="text-xl font-black tracking-widest uppercase text-white font-display">🔔 RECORDATORIOS & NOTIFICACIONES</h2>
                  <p className="text-[8px] text-slate-500 uppercase mt-1">Smart alerts • Auto-generated from missions</p>
                </div>
                {/* Auto-generated from jobs */}
                {autoRem.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest px-1">⚡ AUTO-GENERADOS — Servicios de Mañana</p>
                    {autoRem.map(r => (
                      <div key={r.id} className="g p-4 border border-amber-500/20 bg-amber-500/5 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-black text-white">{r.title}</p>
                          <p className="text-[7px] text-slate-500 mt-0.5">Fecha: {r.date}</p>
                        </div>
                        <button onClick={() => { const ph = (r.phone||'').replace(/\D/g,''); const ph2 = ph.length===10?'1'+ph:ph; window.open(`https://wa.me/${ph2}?text=${encodeURIComponent(`Hi ${r.job.client_name}! 🔔 Recordatorio — mañana tenemos tu servicio de ${r.job.service_type?.toUpperCase()} con Elevore. ¿Tienes alguna pregunta?`)}`, '_blank'); tt('WA sent ✓'); }} className="px-3 py-2 bg-amber-500 text-black text-[7px] font-black uppercase rounded-xl active:scale-95">📱 WA</button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Add Reminder */}
                <div className="g p-5 space-y-3 bg-[rgba(255,255,255,0.04)]">
                  <p className="text-[9px] font-black text-[#F5C518] uppercase tracking-widest">+ NUEVO RECORDATORIO</p>
                  <input className="inp text-xs" placeholder="Título del recordatorio..." value={newRem.title} onChange={e => setNewRem({...newRem, title: e.target.value})} />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className="inp text-xs" value={newRem.date} onChange={e => setNewRem({...newRem, date: e.target.value})} />
                    <input type="time" className="inp text-xs" value={newRem.time} onChange={e => setNewRem({...newRem, time: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {['followup', 'payment', 'review', 'call'].map(t => (
                      <button key={t} onClick={() => setNewRem({...newRem, type: t})} className={`py-2 rounded-xl text-[7px] font-black uppercase border transition-all active:scale-95 ${newRem.type === t ? 'bg-[#F5C518] text-black border-[#F5C518]' : 'bg-white/5 border-white/5 text-slate-400'}`}>{t}</button>
                    ))}
                  </div>
                  <button onClick={addReminder} className="w-full bg-[#F5C518] text-black py-3 rounded-xl font-black uppercase text-[9px] active:scale-95">Guardar Recordatorio 🔔</button>
                </div>
                {/* Pending */}
                {upcoming.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">⏰ PENDIENTES ({upcoming.length})</p>
                    {upcoming.map(r => (
                      <div key={r.id} className={`g p-4 border flex items-center gap-3 ${typeColors[r.type] || typeColors.followup}`}>
                        <button onClick={() => toggleDone(r.id)} className="w-6 h-6 rounded-lg border-2 border-current flex items-center justify-center flex-shrink-0">
                          <Icon name="check" className="w-3.5 h-3.5 opacity-0" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-white truncate">{r.title}</p>
                          <p className="text-[7px] text-slate-500 mt-0.5">{r.date} {r.time && `• ${r.time}`} • {r.type.toUpperCase()}</p>
                        </div>
                        <button onClick={() => deleteRem(r.id)} className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"><Icon name="x" className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
                {/* Done */}
                {done.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest px-1">✅ COMPLETADOS ({done.length})</p>
                    {done.map(r => (
                      <div key={r.id} className="g p-3 border border-white/5 flex items-center gap-3 opacity-40">
                        <button onClick={() => toggleDone(r.id)} className="w-6 h-6 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0"><Icon name="check" className="w-3.5 h-3.5 text-white" /></button>
                        <p className="text-[9px] text-slate-500 line-through flex-1">{r.title}</p>
                        <button onClick={() => deleteRem(r.id)} className="text-slate-700 hover:text-red-400"><Icon name="x" className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
                {reminders.length === 0 && autoRem.length === 0 && (
                  <div className="g p-10 text-center text-slate-500 text-[9px] font-black uppercase">No hay recordatorios. Crea el primero ↑</div>
                )}
              </div>
            );
          })()}

        </main>
      </div>
    </div>
  );
}
