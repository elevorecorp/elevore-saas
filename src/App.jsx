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
  GOOGLE: 'https://g.page/r/TU_LINK_AQUI/review',
  ADMIN: '2026',
  STAFF: 'staff',
  ZELLE: '(407) 952-4228',
  BIZ: 'Elevore Premium Services'
};

const T = {
  en: { balance: 'Balance Due', pay: 'Pay via Zelle', approve: 'Sign to Approve Quote', before: 'Before', after: 'After', complete: 'Sign to Confirm Completion', review: 'Leave a Google Review', refer: 'Refer a Friend — Both Get $25 Off', syncing: 'Syncing...', hub: 'Live Mission Hub', arrived: 'Team Arrived', done: 'Completed', rating: 'Rate your service', submit: 'Submit Rating', chat: 'Message us', legal: 'Digital signatures are legally binding', urgency: 'Quote expires in', lock: 'Lock in your price!' },
  es: { balance: 'Saldo Pendiente', pay: 'Paga por Zelle', approve: 'Firma para Aprobar tu Cotización', before: 'Antes', after: 'Después', complete: 'Firma para Confirmar que Quedó Bien', review: 'Déjanos una Reseña', refer: 'Refiere un Amigo — Ambos Reciben $25', syncing: 'Cargando...', hub: 'Estado del Servicio', arrived: 'El equipo llegó', done: 'Completado', rating: 'Califica el servicio', submit: 'Enviar Calificación', chat: 'Escríbenos', legal: 'Las firmas digitales tienen validez legal', urgency: 'Cotización vence en', lock: '¡Bloquea tu precio!' }
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
        <div className="flex gap-2">
          <input type="text" placeholder="Photo link..." value={lk} onChange={e => setLk(e.target.value)} className="inp text-xs text-blue-400 flex-1" />
          <button onClick={() => { if (lk.trim()) { onAdd(lk.trim()); setLk(''); } }} className="px-4 bg-green-600 text-white rounded-xl font-black text-lg active:scale-95">+</button>
        </div>
      )}
    </div>
  );
}

// BarChart Component
function BarChart({ data, color = '#22c55e', label = '' }) {
  const max = Math.max(...data.map(d => d.v), 1);
  return (
    <div>
      {label && <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">{label}</p>}
      <div className="flex items-end gap-1 h-20 w-full">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="br w-full" style={{ height: `${(d.v / max) * 70}px`, background: color }}></div>
            <span className="text-[7px] text-slate-600 font-black leading-none">{d.l}</span>
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
  return <img src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&color=ffffff&bgcolor=000000`} className="rounded-xl" style={{ width: size, height: size }} alt="QR" />;
}

// Thermo Component
function Thermo({ pct, goal, current }) {
  const h = Math.min(100, pct);
  return (
    <div className="flex items-end justify-center gap-4">
      <div className="relative w-10 h-40 bg-white/5 rounded-full border border-white/10 overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 rounded-full" style={{ height: `${h}%`, background: pct >= 100 ? '#fbbf24' : 'linear-gradient(0deg,#22c55e,#fbbf24)', transition: 'height 1.5s cubic-bezier(.19,1,.22,1)' }}></div>
      </div>
      <div>
        <p className="text-[8px] text-slate-500 uppercase font-black">Goal</p>
        <p className="text-2xl font-black italic text-white">{fmt$(goal)}</p>
        <p className="text-[8px] text-green-400 font-black uppercase mt-1">Current: {fmt$(current)}</p>
        <p className={`text-[8px] font-black uppercase mt-0.5 ${pct >= 100 ? 'text-amber-400' : 'text-slate-500'}`}>{pct >= 100 ? '🎯 GOAL HIT!' : fmt$(goal - current) + ' to go'}</p>
      </div>
    </div>
  );
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
    <div className="min-h-screen p-5 bg-black animate-in fade-in duration-700">
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
        {job.status === 'paid' && (<div className="space-y-2"><button onClick={() => window.open(DEFAULT_CFG.GOOGLE)} className="w-full gold py-4 rounded-2xl font-black uppercase text-sm active:scale-95">⭐ {tr(lang, 'review')}</button><button onClick={() => { const l = `${location.origin}${location.pathname}?ref=${job.client_name?.replace(/\s/g, '_')}`; navigator.clipboard?.writeText(l); tt('Copied! 🎁'); }} className="w-full bg-white/10 text-white py-4 rounded-2xl font-black uppercase text-sm active:scale-95">🎁 {tr(lang, 'refer')}</button></div>)}
        <button onClick={() => window.open(`https://wa.me/${job.client_phone?.replace(/\D/g, '') || ''}`)} className="w-full g py-4 rounded-2xl font-black uppercase text-[10px] text-green-400 border border-green-600/20 active:scale-95 flex items-center justify-center gap-2"><Icon name="message-circle" className="w-4 h-4" />{tr(lang, 'chat')}</button>
        <p className="text-[7px] text-slate-700 text-center uppercase font-bold">{tr(lang, 'legal')}</p>
      </div></div>
  );
}

// StaffJob Component
function StaffJob({ job, onBack, onRefresh, tt, recTime, upsell, update }) {
  const [chk, setChk] = useState({});
  const [localJob, setLocalJob] = useState(job);
  const done = Object.values(chk).filter(Boolean).length;
  const bonus = (localJob.status === 'paid' && localJob.final_signature && localJob.check_in_time && localJob.check_out_time && (Math.round((new Date(localJob.check_out_time) - new Date(localJob.check_in_time)) / 60000)) <= 180 && (localJob.client_rating || 0) >= 4) ? 5 : 0;
  const addAP = async url => { const c = localJob.after_photos || []; await sb.from('elevore_missions').update({ after_photos: [...c, url] }).eq('id', localJob.id); tt('Photo added ✓'); setLocalJob({ ...localJob, after_photos: [...c, url] }); };

  return (
    <div className="min-h-screen p-5 bg-black pb-24">
      <button onClick={onBack} className="mb-5 flex items-center gap-2 text-slate-500 font-black uppercase text-[9px]"><Icon name="arrow-left" className="w-4 h-4" />Back</button>
      <div className="max-w-md mx-auto space-y-5">
        <div className="g p-6 border-t-4 border-green-500"><h2 className="text-xl font-black uppercase italic text-white mb-1">{localJob.client_name}</h2><p className="text-[9px] text-slate-500 uppercase">{localJob.service_type} • {localJob.address}</p>
          <div className="flex gap-2 mt-4">
            <button onClick={() => recTime(localJob.id, 'check_in_time')} className="flex-1 bg-green-600 text-white py-3 rounded-xl font-black uppercase text-[9px] active:scale-95 flex items-center justify-center gap-1"><Icon name="play" className="w-3 h-3" />Check In</button>
            <button onClick={() => recTime(localJob.id, 'check_out_time')} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black uppercase text-[9px] active:scale-95 flex items-center justify-center gap-1"><Icon name="square" className="w-3 h-3" />Check Out</button>
            <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(localJob.address)}`)} className="bg-blue-600 text-white px-4 py-3 rounded-xl font-black text-[9px] active:scale-95">📍</button>
            <button onClick={async () => { const i = prompt('Issue?'); if (i) { await update(localJob, { specs: { ...(localJob.specs || {}), staff_issue: i, staff_issue_at: new Date().toISOString() } }, 'Issue reported'); } }} className="bg-orange-600 text-white px-4 py-3 rounded-xl font-black text-[9px] active:scale-95">!</button>
          </div>
          {localJob.check_in_time && <p className="text-[8px] text-green-400 font-black uppercase mt-2">▶ In: {new Date(localJob.check_in_time).toLocaleTimeString()}</p>}
        </div>
        <div className="g p-5"><p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-3">⚡ Upsell Strike</p><div className="grid grid-cols-2 gap-2">{ADDONS.filter(a => !localJob.specs?.[a.id]).map(a => { const sent = (localJob.upsell_sent || []).includes(a.id); return (<button key={a.id} disabled={sent} onClick={() => upsell(localJob, a.id)} className={`p-3 rounded-xl border text-[8px] font-black uppercase active:scale-95 ${sent ? 'bg-green-900/30 border-green-600/30 text-green-600' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>{sent ? '✅ ' : ''}{a.en} ${a.p}</button>); })}</div></div>
        <div className="g p-5 space-y-2"><div className="flex justify-between items-center mb-2"><p className="text-[9px] font-black uppercase text-amber-500">Checklist</p><span className="text-[9px] font-black text-white">{done}/{CHECKS.length}</span></div><div className="pb mb-3"><div className="pf" style={{ width: `${(done / CHECKS.length) * 100}%` }}></div></div>{CHECKS.map((item, i) => (<button key={i} onClick={() => setChk(c => ({ ...c, [i]: !c[i] }))} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-95 ${chk[i] ? 'bg-green-600/20 border-green-600/40 text-green-400' : 'bg-white/5 border-white/5 text-slate-400'}`}><div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${chk[i] ? 'bg-green-600 border-green-600' : 'border-slate-600'}`}>{chk[i] && <Icon name="check" className="w-3 h-3 text-white" />}</div><span className="text-[10px] font-black uppercase text-left">{item}</span></button>))}</div>
        <div className="g p-5"><PhotoDrive photos={localJob.after_photos || []} label="✨ After Photos" onAdd={addAP} /></div>
        {bonus > 0 && <div className="g p-5 border border-amber-500/30 text-center"><p className="text-amber-500 font-black uppercase text-[9px] mb-1">🌟 Bonus Earned</p><p className="text-3xl font-black italic text-white">+${bonus}</p></div>}
        {done === CHECKS.length && <button onClick={async () => { if (!(localJob.after_photos || []).length) return tt('Add at least 1 after photo', 'red'); await sb.from('elevore_missions').update({ status: 'completed', specs: { ...(localJob.specs || {}), checklist_done_at: new Date().toISOString() } }).eq('id', localJob.id); tt('Sent to QC ✅'); onBack(); onRefresh(); }} className="w-full gold py-5 rounded-2xl font-black uppercase text-base active:scale-95">✅ Send To QC</button>}
      </div></div>
  );
}

// App Component
export default function App() {
  const urlP = new URLSearchParams(window.location.search);
  const cjid = urlP.get('mision');
  const refCode = urlP.get('ref');

  if (cjid) return <Portal cjid={cjid} />;

  const [view, setView] = useState('auth');
  const [role, setRole] = useState('admin');
  const [pass, setPass] = useState('');
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoad] = useState(false);
  const [isPrivate, setPriv] = useState(true);
  const [editId, setEdit] = useState(null);
  const [dtab, setDtab] = useState('identity');
  const [fSt, setFSt] = useState('all');
  const [sq, setSQ] = useState('');
  const [toast, setToast] = useState(null);
  const [aStaff, setAStaff] = useState(null);
  const [quickMode, setQM] = useState(false);
  const [chatJob, setChatJob] = useState(null);
  const [chatMsg, setChatMsg] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [actLog, setActLog] = useState([]);
  const [rtOn, setRT] = useState(false);
  const [state, setState] = useState(INIT);

  const tt = (m, c = 'green') => { setToast({ m, c }); setTimeout(() => setToast(null), 3500); };
  const log = m => setActLog(l => [{ m, time: new Date().toLocaleTimeString() }, ...l.slice(0, 49)]);

  useEffect(() => { try { localStorage.setItem('ev97', JSON.stringify(state)); } catch { }; }, [state]);
  useEffect(() => { try { const d = JSON.parse(localStorage.getItem('ev97') || '{}'); if (d.name) setState(s => ({ ...s, ...d })); } catch { }; }, []);

  const refresh = useCallback(async () => {
    setLoad(true);
    const { data: j } = await sb.from('elevore_missions').select('*').order('created_at', { ascending: false });
    const { data: c } = await sb.from('clients').select('*');
    if (j) setJobs(j);
    if (c) setClients(c);
    setLoad(false);
  }, []);

  useEffect(() => { if (view !== 'auth') refresh(); }, [view, refresh]);

  useEffect(() => {
    if (view === 'auth') return;
    const ch = sb.channel('ev97').on('postgres_changes', { event: '*', schema: 'public', table: 'elevore_missions' }, () => refresh()).subscribe();
    setRT(true);
    return () => { sb.removeChannel(ch); setRT(false); };
  }, [view, refresh]);

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
      const { data: c, error: cErr } = await sb.from('clients').upsert({ name: state.name, phone: state.phone, address: state.address, membership: state.membership, specs: { ...state } }, { onConflict: 'name' }).select().single();
      if (cErr || !c) { tt('Clients Error: ' + (cErr?.message || 'Check RLS'), 'red'); setLoad(false); return; }
      const fd = { 'weekly': 7, 'bi-weekly': 14, 'monthly': 30, 'one-time': null }[state.frequency];
      let nv = null; if (fd && state.date) { const d = new Date(state.date); d.setDate(d.getDate() + fd); nv = d.toISOString().split('T')[0]; }
      const payload = { client_name: state.name, client_phone: state.phone, address: state.address, service_type: state.svc, total_price: pricing.total, deposit_paid: state.deposit, team_assigned: state.team, status: state.status, specs: { ...state, referral: refCode || null }, scheduled_date: state.date || null, notes: state.notes || null, next_visit: nv, membership_plan: state.membership || null, urgency_expires: state.urgencyHours ? new Date(Date.now() + state.urgencyHours * 3600000).toISOString() : null };
      const { error: jErr } = editId ? await sb.from('elevore_missions').update(payload).eq('id', editId) : await sb.from('elevore_missions').insert([payload]);
      if (jErr) { tt('Mission Error: ' + jErr.message, 'red'); setLoad(false); return; }
      setState(INIT); setEdit(null);
      log(`${editId ? 'Updated' : 'New'}: ${state.name} — ${fmt$(pricing.total)}`);
      tt(editId ? 'Updated! ⚡' : 'Deployed! 🚀');
      setView('agenda'); refresh();
    } catch (e) { tt('Error: ' + e.message, 'red'); }
    setLoad(false);
  };

  const update = async (job, patch, msg) => { const { error } = await sb.from('elevore_missions').update(patch).eq('id', job.id); if (error) return tt(error.message, 'red'); tt(msg || 'Updated ✓'); log((msg || 'Updated') + ': ' + job.client_name); refresh(); };
  const recTime = async (jid, type) => { const time = new Date().toISOString(); const status = type === 'check_in_time' ? 'in_progress' : 'completed'; await sb.from('elevore_missions').update({ [type]: time, status }).eq('id', jid); tt(type === 'check_in_time' ? '▶ Checked in!' : '⏹ Checked out!'); log(type === 'check_in_time' ? `Check-in: ${jid}` : `Check-out: ${jid}`); refresh(); };
  const upsell = async (job, aid) => { const a = ADDONS.find(x => x.id === aid); if (!a) return; const p = job.client_phone?.replace(/\D/g, '') || ''; const ph = p.length === 10 ? '1' + p : p; const msg = `Hi ${job.client_name}! ✨ Our team noticed your ${a.en.toLowerCase()} could use attention. Add it for $${a.p}? Reply YES! 🏠`; window.open(`https://wa.me/${ph}?text=${encodeURIComponent(msg)}`, '_blank'); const sent = [...(job.upsell_sent || []), aid]; await sb.from('elevore_missions').update({ upsell_sent: sent }).eq('id', job.id); tt(`Upsell: ${a.en} sent! 💰`); log(`Upsell: ${a.en} → ${job.client_name}`); refresh(); };
  const calcBonus = job => { if (job.status !== 'paid') return 0; const mins = job.check_in_time && job.check_out_time ? Math.round((new Date(job.check_out_time) - new Date(job.check_in_time)) / 60000) : null; return (job.final_signature && mins && mins <= 180 && (job.client_rating || 0) >= 4) ? 5 : 0; };
  const realProfit = job => Math.round((job.deposit_paid || 0) - ((job.deposit_paid || 0) * DEFAULT_CFG.STAFF_PAY) - (job.specs?.expenses || 0) - calcBonus(job));
  const passQC = job => update(job, { status: 'paid', specs: { ...(job.specs || {}), quality_passed: true, quality_passed_at: new Date().toISOString() } }, 'QC Passed ✓');
  const markLost = async job => { const r = prompt('Lost reason (price/no-answer/competitor/timing):') || 'unknown'; await update(job, { status: 'lost', specs: { ...(job.specs || {}), lost_reason: r, lost_at: new Date().toISOString() } }, 'Marked lost'); };
  const rebook = job => { setState({ ...INIT, ...(job.specs || {}), name: job.client_name, phone: job.client_phone, address: job.address, status: 'scheduled', deposit: 0, date: job.next_visit || '' }); setEdit(null); setView('deploy'); setDtab('money'); };

  const finance = useMemo(() => {
    const gross = jobs.reduce((a, b) => a + (b.total_price || 0), 0);
    const col = jobs.reduce((a, b) => a + (b.deposit_paid || 0), 0);
    const exp = jobs.reduce((a, b) => a + (b.specs?.expenses || 0), 0);
    const bonuses = jobs.reduce((a, b) => a + calcBonus(b), 0);
    const net = Math.max(0, Math.round(col - (col * DEFAULT_CFG.STAFF_PAY) - exp - bonuses));
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
    const wb = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); const ds = d.toISOString().split('T')[0]; const v = jobs.filter(j => j.scheduled_date === ds).reduce((a, b) => a + (b.total_price || 0), 0); return { l: dn[d.getDay()], v }; });
    const mb2 = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - 5 + i); const yr = d.getFullYear(); const mo = d.getMonth(); const v = jobs.filter(j => { if (!j.scheduled_date) return false; const jd = new Date(j.scheduled_date); return jd.getFullYear() === yr && jd.getMonth() === mo; }).reduce((a, b) => a + (b.total_price || 0), 0); return { l: d.toLocaleDateString('en', { month: 'short' }), v }; });
    const ratings = jobs.filter(j => j.client_rating > 0).map(j => j.client_rating);
    const avgRating = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0;
    const payroll = jobs.filter(j => j.status === 'paid').map(j => ({ name: j.team_assigned || 'Unassigned', amount: Math.round((j.deposit_paid || 0) * DEFAULT_CFG.STAFF_PAY + calcBonus(j)) })).reduce((acc, { name, amount }) => { acc[name] = (acc[name] || 0) + amount; return acc; }, {});
    const todayJobs = jobs.filter(j => j.scheduled_date === new Date().toISOString().split('T')[0]);
    const conv = jobs.filter(j => j.status === 'paid' && j.created_at && j.scheduled_date);
    const vel = conv.length ? Math.abs(Math.round(conv.reduce((a, j) => a + dAgo(j.created_at) - dAgo(j.scheduled_date), 0) / conv.length)) : null;
    const mbTargets = clients.filter(c => { const cj = jobs.filter(j => j.client_name === c.name); return cj.length >= 3 && (!c.membership || c.membership === 'none'); });
    return { gross, col, net, pending, pct, avg, mrr, proj, ltv, avgLTV, bestDay: bd ? dn[bd[0]] : null, retDue, cold, churn, pendSig, moneyTable, expiring, qcQ, reviewQ, lostJ, lostReasons, bonuses, wb, mb2, avgRating, payroll, byS, bySvc, todayJobs, total: jobs.length, vel, mbTargets };
  }, [jobs, clients]);

  const dna = useMemo(() => { const m = {}; clients.forEach(c => { const cj = jobs.filter(j => j.client_name === c.name); m[c.name] = { score: calcDNA(cj), count: cj.length, spent: cj.reduce((a, b) => a + (b.total_price || 0), 0), last: cj[0]?.scheduled_date }; }); return m; }, [clients, jobs]);

  const filtered = useMemo(() => jobs.filter(j => { const ms = fSt === 'all' || j.status === fSt; const q = sq.toLowerCase(); const mq = !sq || j.client_name?.toLowerCase().includes(q) || j.address?.toLowerCase().includes(q) || j.team_assigned?.toLowerCase().includes(q); return ms && mq; }), [jobs, fSt, sq]);

  const todayStr = new Date().toISOString().split('T')[0];
  const staffJobs = useMemo(() => jobs.filter(j => j.scheduled_date === todayStr || j.status === 'scheduled' || j.status === 'in_progress'), [jobs, todayStr]);
  const seasons = season();

  const wa = (job, type) => {
    const p = job.client_phone?.replace(/\D/g, '') || ''; const ph = p.length === 10 ? '1' + p : p;
    const bal = job.total_price - job.deposit_paid;
    const portal = `${location.origin}${location.pathname}?mision=${job.id}`;
    const ref = `${location.origin}${location.pathname}?ref=${job.client_name?.replace(/\s/g, '_')}`;
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

  const Toast = () => toast && <div className={`tst fixed top-5 left-1/2 -translate-x-1/2 z-[500] px-6 py-3 rounded-2xl font-black uppercase text-sm shadow-2xl ${toast.c === 'red' ? 'bg-red-600' : 'bg-green-600'} text-white`}>{toast.m}</div>;
  const Loader = () => loading && <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center"><div className="w-14 h-14 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div></div>;

  if (view === 'auth') return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black">
      <Toast />
      <div className="g p-10 w-full max-w-sm text-center space-y-7 border-t-4 border-amber-500 shadow-2xl">
        <div className="w-16 h-16 bg-amber-500 rounded-2xl mx-auto flex items-center justify-center font-black italic text-3xl text-black">E</div>
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-white">ELEVORE <span className="text-amber-500 italic">EMPIRE</span></h1>
          <p className="text-[7px] text-slate-500 uppercase tracking-widest mt-1">v97.0 — Built to Dominate</p>
        </div>
        <input type="password" placeholder="ACCESS PIN" className="inp text-center text-xl tracking-[0.5em]" onChange={e => setPass(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { if (pass === DEFAULT_CFG.ADMIN) { setView('brief'); setRole('admin'); } else if (pass === DEFAULT_CFG.STAFF) { setView('staff'); setRole('staff'); } } }} />
        <div className="flex gap-2">
          <button onClick={() => pass === DEFAULT_CFG.ADMIN ? (setView('brief'), setRole('admin')) : tt('Denied', 'red')} className="flex-1 bg-amber-500 text-black py-4 rounded-xl font-black uppercase active:scale-95 shadow-xl">Admin</button>
          <button onClick={() => pass === DEFAULT_CFG.STAFF ? (setView('staff'), setRole('staff')) : tt('Denied', 'red')} className="flex-1 bg-white text-black py-4 rounded-xl font-black shadow-xl active:scale-95">Staff</button>
        </div>
      </div>
    </div>
  );

  if (role === 'staff') {
    if (aStaff) return <StaffJob job={aStaff} onBack={() => setAStaff(null)} onRefresh={refresh} tt={tt} recTime={recTime} upsell={upsell} update={update} />;
    return (
      <div className="min-h-screen p-5 bg-black pb-20">
        <Toast /><Loader />
        <div className="max-w-md mx-auto space-y-5">
          <div className="flex justify-between items-center pt-2">
            <div>
              <h1 className="text-xl font-black uppercase italic text-white">Today's Missions</h1>
              <p className="text-[9px] text-slate-500 uppercase font-black">{todayStr}</p>
            </div>
            <button onClick={() => { setRole('admin'); setView('auth'); }} className="p-3 bg-slate-900 rounded-xl text-slate-500"><Icon name="log-out" className="w-5 h-5" /></button>
          </div>
          {staffJobs.length === 0 && <div className="g p-10 text-center text-slate-500 font-black italic uppercase">No missions today.</div>}
          {staffJobs.map(job => (
            <button key={job.id} onClick={() => setAStaff(job)} className="w-full g p-5 border-l-[7px] border-amber-500 text-left active:scale-95 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black uppercase italic text-white">{job.client_name}</h3>
                  <p className="text-[9px] text-slate-500 uppercase mt-1">{job.service_type} • {fmtD(job.scheduled_date)}</p>
                  <p className="text-[9px] text-slate-400 mt-1 italic truncate w-48">{job.address}</p>
                </div>
                <span className={`text-[7px] font-black px-2 py-1 rounded-full uppercase ml-2 flex-shrink-0 ${job.status === 'in_progress' ? 'bg-green-600 text-white' : job.status === 'completed' ? 'bg-purple-600 text-white' : 'bg-amber-500 text-black'}`}>{job.status}</span>
              </div>
              <p className="text-[8px] font-black text-amber-500 uppercase mt-3 text-right">Tap to start →</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const QQ = () => {
    const [qq, setQQLocal] = useState({ name: '', phone: '', address: '', svc: 'regular', beds: 2, baths: 2, sqft: 2000 });
    const qp = (() => { if (qq.svc === 'postcon') return Math.round((qq.sqft || 0) * 0.35); const b = { regular: 95, deep: 165, moveout: 195 }; return Math.round((b[qq.svc] || 95) + (qq.beds * 40) + (qq.baths * 35)); })();
    const send = async () => {
      if (!qq.name || !qq.phone) return tt('Name + Phone required', 'red');
      setLoad(true);
      await sb.from('clients').upsert({ name: qq.name, phone: qq.phone, address: qq.address, specs: {} }, { onConflict: 'name' });
      const { data: j } = await sb.from('elevore_missions').insert([{ client_name: qq.name, client_phone: qq.phone, address: qq.address, service_type: qq.svc, total_price: qp, deposit_paid: 0, status: 'lead', specs: {}, urgency_expires: new Date(Date.now() + 24 * 3600000).toISOString() }]).select().single();
      if (j) { const link = `${location.origin}${location.pathname}?mision=${j.id}`; const p = qq.phone.replace(/\D/g, ''); const ph = p.length === 10 ? '1' + p : p; const msg = `Hi ${qq.name}! 📋 Elevore quote: ${fmt$(qp)} for ${qq.svc.toUpperCase()}.\n\n👉 Sign: ${link}\n\n⏰ 24h. Zelle: ${DEFAULT_CFG.ZELLE}`; window.open(`https://wa.me/${ph}?text=${encodeURIComponent(msg)}`, '_blank'); tt('Sent! 🚀'); log(`Quick: ${qq.name}`); }
      setQM(false); refresh(); setLoad(false);
    };
    return (
      <div className="fixed inset-0 bg-black/90 z-[400] flex items-end p-4" onClick={e => e.target === e.currentTarget && setQM(false)}>
        <div className="g p-6 w-full max-w-md space-y-4 border-t-4 border-amber-500 su mx-auto">
          <div className="flex justify-between items-center"><p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">⚡ Quick Quote — 30 sec</p><button onClick={() => setQM(false)} className="text-slate-500"><Icon name="x" className="w-5 h-5" /></button></div>
          <input className="inp uppercase" placeholder="Client Name" value={qq.name} onChange={e => setQQLocal({ ...qq, name: e.target.value })} />
          <input className="inp" placeholder="Phone" value={qq.phone} onChange={e => setQQLocal({ ...qq, phone: e.target.value })} />
          <input className="inp text-xs uppercase" placeholder="Address" value={qq.address} onChange={e => setQQLocal({ ...qq, address: e.target.value })} />
          <div className="grid grid-cols-4 gap-1">{['regular', 'deep', 'moveout', 'postcon'].map(s => (<button key={s} onClick={() => setQQLocal({ ...qq, svc: s })} className={`py-2 rounded-xl text-[8px] font-black uppercase border-2 active:scale-95 ${qq.svc === s ? 'bg-green-600 border-green-600 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>{s}</button>))}</div>
          {qq.svc === 'postcon' ? (<div className="bg-white/5 p-3 rounded-xl text-center border border-white/5"><span className="text-[8px] uppercase block mb-1 text-slate-400 font-black">SqFt</span><input type="number" value={qq.sqft} onChange={e => setQQLocal({ ...qq, sqft: parseInt(e.target.value) || 0 })} className="inp text-center text-xl text-white" /></div>) : (<div className="grid grid-cols-2 gap-3">{[{ l: 'Beds', k: 'beds' }, { l: 'Baths', k: 'baths' }].map(i => (<div key={i.k} className="bg-white/5 p-3 rounded-xl text-center border border-white/5"><span className="text-[8px] uppercase block mb-1.5 text-slate-400 font-black">{i.l}</span><div className="flex justify-between items-center"><button onClick={() => setQQLocal({ ...qq, [i.k]: Math.max(0, qq[i.k] - 1) })} className="w-7 h-7 bg-white/10 rounded-lg text-white font-bold active:scale-95">-</button><span className="text-lg font-black italic text-white">{qq[i.k]}</span><button onClick={() => setQQLocal({ ...qq, [i.k]: qq[i.k] + 1 })} className="w-7 h-7 bg-white/10 rounded-lg text-white font-bold active:scale-95">+</button></div></div>))}</div>)}
          <div className="bg-black/40 p-4 rounded-xl text-center border border-white/10"><p className="text-[8px] text-slate-500 uppercase font-black">Estimated</p><p className="text-4xl font-black italic text-white">{fmt$(qp)}</p></div>
          <button onClick={send} className="w-full gold py-4 rounded-xl font-black uppercase active:scale-95 shadow-xl">🚀 Send Quote via WhatsApp</button>
        </div></div>
    );
  };

  const ChatModal = () => {
    const send = () => { if (!chatMsg.trim()) return; const p = chatJob.client_phone?.replace(/\D/g, '') || ''; const ph = p.length === 10 ? '1' + p : p; window.open(`https://wa.me/${ph}?text=${encodeURIComponent(chatMsg)}`, '_blank'); setChatLog(l => [...l, { from: 'admin', m: chatMsg, time: new Date().toLocaleTimeString() }]); setChatMsg(''); log(`Chat → ${chatJob.client_name}`); };
    return (
      <div className="fixed inset-0 bg-black/90 z-[400] flex items-end p-4" onClick={e => e.target === e.currentTarget && setChatJob(null)}>
        <div className="g p-6 w-full max-w-md space-y-4 border-t-4 border-green-500 su mx-auto">
          <div className="flex justify-between items-center"><p className="text-[10px] font-black text-green-500 uppercase">💬 {chatJob?.client_name}</p><button onClick={() => setChatJob(null)}><Icon name="x" className="w-5 h-5 text-slate-500" /></button></div>
          <div className="h-32 overflow-y-auto space-y-2 nsb">{chatLog.length === 0 && <p className="text-[9px] text-slate-600 italic text-center py-4">No messages yet.</p>}{chatLog.map((m, i) => (<div key={i} className="p-2 rounded-xl text-[9px] font-black bg-green-900/30 text-green-400 ml-8"><p>{m.m}</p><p className="text-[7px] text-slate-600 mt-0.5">{m.time}</p></div>))}</div>
          <div className="grid grid-cols-2 gap-1">{[['✅ Confirm', 'confirm'], ['🔔 Remind', 'reminder'], ['⭐ Review', 'review'], ['📋 Quote', 'quote']].map(([l, type]) => (<button key={type} onClick={() => { const msgs = { confirm: `Hi ${chatJob.client_name}! ✨ Elevore confirming service ${fmtD(job.scheduled_date)}.`, reminder: `Hi ${chatJob.client_name}! 🔔 Service ${fmtD(job.scheduled_date)}.`, review: `Hi ${chatJob.client_name}! 🌟 Review: ${DEFAULT_CFG.GOOGLE}`, quote: `Hi ${chatJob.client_name}! Portal: ${location.origin}${location.pathname}?mision=${chatJob.id}` }; setChatMsg(msgs[type]); }} className="py-1.5 bg-white/5 text-slate-400 rounded-xl text-[7px] font-black uppercase active:scale-95">{l}</button>))}</div>
          <div className="flex gap-2"><textarea value={chatMsg} onChange={e => setChatMsg(e.target.value)} placeholder="Type message..." className="inp text-sm resize-none h-16 flex-1" /><button onClick={send} className="bg-green-600 text-white px-4 rounded-xl font-black active:scale-95"><Icon name="send" className="w-5 h-5" /></button></div>
        </div></div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col pb-32">
      <Toast />
      {quickMode && <QQ />}
      {chatJob && <ChatModal />}
      <Loader />
      <nav className="p-4 sticky top-0 z-[100] bg-black/90 backdrop-blur-3xl border-b border-white/5 flex justify-between items-center shadow-xl">
        <div className="flex items-center gap-3"><div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-black italic text-xl shadow-xl">E</div><div><h1 className="font-black text-lg tracking-tighter uppercase text-white leading-none">Elevore <span className="text-amber-500 italic font-light">Empire</span></h1><div className="flex items-center gap-2 mt-0.5"><div className={rtOn ? 'dg' : 'da'}></div><p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">{rtOn ? 'Live Sync' : 'v97.0'}</p></div></div></div>
        <div className="flex gap-1.5"><button onClick={() => setQM(true)} className="gold px-3 py-2 rounded-xl font-black uppercase text-[7px] active:scale-95">⚡ Quick</button><button onClick={() => setPriv(p => !p)} className="p-2 bg-slate-900 rounded-xl text-slate-500 hover:text-amber-500 transition-all"><Icon name={isPrivate ? 'eye-off' : 'eye'} className="w-4 h-4" /></button><button onClick={() => setView('auth')} className="p-2 bg-slate-900 rounded-xl text-slate-500 hover:text-white transition-all"><Icon name="log-out" className="w-4 h-4" /></button></div>
      </nav>

      <main className="max-w-xl mx-auto w-full p-4 space-y-5">
        {seasons.length > 0 && <div className="g p-4 border border-amber-500/30 flex items-center justify-between"><div><p className="text-[8px] font-black text-amber-500 uppercase">🎯 {seasons[0].name}</p><p className="text-[8px] text-slate-400">{seasons[0].msg}</p></div>{seasons[0].discount > 0 && <span className="text-amber-500 font-black text-sm">-{seasons[0].discount}%</span>}</div>}

        {finance.mbTargets.length > 0 && <div className="g p-4 border border-purple-500/30 flex items-center justify-between"><div><p className="text-[8px] font-black text-purple-400 uppercase">💎 {finance.mbTargets.length} Ready for Membership</p><p className="text-[8px] text-slate-500">{finance.mbTargets[0]?.name} + more</p></div><button onClick={() => { const j = jobs.find(jj => jj.client_name === finance.mbTargets[0]?.name); if (j) offerMembership(j); }} className="px-3 py-2 bg-purple-500/20 text-purple-400 rounded-xl text-[7px] font-black uppercase active:scale-95">Offer</button></div>}

        <div className="flex gap-1 bg-black/40 p-1 rounded-2xl border border-white/5 shadow-xl overflow-x-auto nsb">{[['brief', '☀️', 'AM'], ['intel', '📊', 'Intel'], ['agenda', '📋', 'Logs'], ['clients', '🧬', 'DNA'], ['members', '💎', 'VIP'], ['drive', '📁', 'Drive'], ['payroll', '💰', 'Pay'], ['deploy', '⚡', 'New']].map(([v, e, l]) => (<button key={v} onClick={() => { if (v === 'deploy') { setEdit(null); setState(INIT); setDtab('identity'); } setView(v); }} className={`flex-shrink-0 flex-1 py-2 rounded-xl text-[7px] uppercase font-black whitespace-nowrap px-2 active:scale-95 ${view === v ? (v === 'deploy' ? 'bg-amber-500 text-black shadow-lg' : 'ton') : 'text-slate-500'}`}>{e} {l}</button>))}</div>

        {view === 'brief' && (<div className="space-y-5 animate-in fade-in">
          <div className="g p-6 border-t-4 border-amber-500"><p className="text-[9px] font-black text-slate-500 uppercase mb-1">Good morning, Jose Mario 👋</p><h2 className="text-2xl font-black italic text-white mb-4">Today's Command</h2><div className="grid grid-cols-2 gap-3"><div className="bg-green-600/10 border border-green-600/20 p-4 rounded-xl text-center"><p className="text-[7px] text-green-400 font-black uppercase mb-1">Jobs Today</p><p className="text-3xl font-black italic text-white">{finance.todayJobs.length}</p></div><div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-center"><p className="text-[7px] text-amber-400 font-black uppercase mb-1">Revenue Today</p><p className="text-3xl font-black italic text-white">{fmt$(finance.todayJobs.reduce((a, b) => a + (b.total_price || 0), 0))}</p></div><div className="bg-blue-600/10 border border-blue-600/20 p-4 rounded-xl text-center"><p className="text-[7px] text-blue-400 font-black uppercase mb-1">MRR</p><p className="text-3xl font-black italic text-white">{isPrivate ? '***' : fmt$(finance.mrr)}</p></div><div className="bg-purple-600/10 border border-purple-600/20 p-4 rounded-xl text-center"><p className="text-[7px] text-purple-400 font-black uppercase mb-1">Avg Rating</p><p className="text-3xl font-black italic text-white">{finance.avgRating || '—'}</p></div></div></div>
          <div className="g p-6 flex items-center justify-center gap-8"><Thermo pct={finance.pct} goal={DEFAULT_CFG.GOAL} current={finance.gross} /><div className="space-y-2">{finance.vel !== null && <p className="text-[8px] font-black text-slate-400 uppercase">⚡ Velocity: <span className="text-white">{finance.vel}d</span></p>}{finance.proj > 0 && <p className="text-[8px] font-black text-green-400 uppercase">📈 Projected: {fmt$(finance.proj)}</p>}{finance.bestDay && <p className="text-[8px] font-black text-amber-400 uppercase">💰 Money Day: {finance.bestDay}</p>}<p className="text-[8px] font-black text-slate-500 uppercase">Total: {finance.total}</p></div></div>
          <div className="g p-5 border-t-4 border-green-500 space-y-4"><p className="text-[9px] font-black text-green-400 uppercase tracking-widest">War Room</p><div className="grid grid-cols-2 gap-2"><button onClick={() => { setFSt('lead'); setView('agenda'); }} className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-left active:scale-95"><p className="text-[7px] text-amber-400 font-black uppercase">Money Waiting</p><p className="text-2xl font-black italic text-white">{isPrivate ? '***' : fmt$(finance.moneyTable)}</p><p className="text-[7px] text-slate-500">{finance.pendSig.length} unsigned</p></button><button onClick={() => { setFSt('lead'); setView('agenda'); }} className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-left active:scale-95"><p className="text-[7px] text-red-400 font-black uppercase">Expiring</p><p className="text-2xl font-black italic text-white">{finance.expiring.length}</p><p className="text-[7px] text-slate-500">under 6h</p></button><button onClick={() => { setFSt('completed'); setView('agenda'); }} className="bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl text-left active:scale-95"><p className="text-[7px] text-purple-400 font-black uppercase">QC Queue</p><p className="text-2xl font-black italic text-white">{finance.qcQ.length}</p></button><button onClick={() => { setFSt('paid'); setView('agenda'); }} className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl text-left active:scale-95"><p className="text-[7px] text-blue-400 font-black uppercase">Review Queue</p><p className="text-2xl font-black italic text-white">{finance.reviewQ.length}</p></button></div></div>
          {finance.expiring.length > 0 && <div className="g p-5 border-l-4 border-red-500 ap"><p className="text-[9px] font-black text-red-400 uppercase mb-2">⏰ Expiring</p>{finance.expiring.slice(0, 3).map(job => (<div key={job.id} className="flex justify-between items-center py-1.5"><span className="text-[10px] font-black text-white uppercase">{job.client_name} — {fmt$(job.total_price)}</span><button onClick={() => recordFollow(job, 'final')} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-xl text-[8px] font-black uppercase active:scale-95">Final Push</button></div>))}</div>}
          {finance.qcQ.length > 0 && <div className="g p-5 border-l-4 border-purple-500"><p className="text-[9px] font-black text-purple-400 uppercase mb-2">QC Queue</p>{finance.qcQ.slice(0, 3).map(job => (<div key={job.id} className="flex justify-between items-center py-1.5"><span className="text-[10px] font-black text-white uppercase">{job.client_name}</span><div className="flex gap-1"><button onClick={() => passQC(job)} className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-xl text-[8px] font-black uppercase active:scale-95">✅ Pass</button><button onClick={async () => { wa(job, 'qcfix'); await update(job, { specs: { ...(job.specs || {}), quality_issue: true } }, 'Fix sent'); }} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-xl text-[8px] font-black uppercase active:scale-95">🔧 Fix</button></div></div>))}</div>}
          {finance.cold.length > 0 && <div className="g p-5 border-l-4 border-red-500 ap"><p className="text-[9px] font-black text-red-400 uppercase mb-2">🔥 {finance.cold.length} Cold Lead{finance.cold.length > 1 ? 's' : ''}</p>{finance.cold.slice(0, 3).map(job => (<div key={job.id} className="flex justify-between items-center py-1.5"><span className="text-[10px] font-black text-white uppercase">{job.client_name}</span><button onClick={() => wa(job, 'urgency')} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-xl text-[8px] font-black uppercase active:scale-95">🚨 Urgency</button></div>))}</div>}
          {finance.retDue.length > 0 && <div className="g p-5 border-l-4 border-blue-500"><p className="text-[9px] font-black text-blue-400 uppercase mb-2">👻 {finance.retDue.length} Retention Due</p>{finance.retDue.slice(0, 3).map(job => (<div key={job.id} className="flex justify-between items-center py-1.5"><div><span className="text-[10px] font-black text-white uppercase">{job.client_name}</span><p className="text-[7px] text-slate-500">Next: {job.next_visit}</p></div><button onClick={() => wa(job, 'retention')} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-xl text-[8px] font-black uppercase active:scale-95">Re-engage</button></div>))}</div>}
          {finance.churn.length > 0 && <div className="g p-5 border-l-4 border-orange-500"><p className="text-[9px] font-black text-orange-400 uppercase mb-2">⚠️ {finance.churn.length} Churn Risk</p>{finance.churn.slice(0, 3).map(c => (<div key={c.name} className="flex justify-between items-center py-1.5"><span className="text-[10px] font-black text-white uppercase">{c.name}</span><button onClick={() => { const j = jobs.find(jj => jj.client_name === c.name); if (j) wa(j, 'winback'); }} className="px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-xl text-[8px] font-black uppercase active:scale-95">Win Back</button></div>))}</div>}
          <button onClick={() => setView('intel')} className="w-full g py-4 rounded-xl font-black uppercase text-[9px] text-slate-400 border border-white/5 active:scale-95">Full Intel Dashboard →</button>
        </div>)}

        {view === 'intel' && (<div className="space-y-5 animate-in fade-in">
          <section className="g p-8 border-t-4 border-green-600 shadow-xl"><p className="text-[9px] font-black text-slate-500 mb-2 uppercase tracking-widest italic">Monthly Goal — {fmt$(DEFAULT_CFG.GOAL)}</p><h2 className="text-7xl italic tracking-tighter text-white font-black leading-none">{Math.round(finance.pct)}%</h2><div className="pb mt-4 mb-3"><div className="pf" style={{ width: `${finance.pct}%` }}></div></div><div className="flex justify-between text-[8px] text-slate-500 font-black uppercase"><span>Billed: {isPrivate ? '***' : fmt$(finance.gross)}</span><span>{finance.gross >= DEFAULT_CFG.GOAL ? '🎯 GOAL!' : 'Left: ' + fmt$(DEFAULT_CFG.GOAL - finance.gross)}</span></div><p className="text-[9px] text-green-500 mt-2 font-black uppercase italic text-center">Net: {isPrivate ? '****' : fmt$(finance.net)} | Projected: {isPrivate ? '****' : fmt$(finance.proj)}</p>{finance.bestDay && <p className="text-[8px] text-amber-400 font-black uppercase text-center mt-1">💰 {finance.bestDay}</p>}{finance.vel !== null && <p className="text-[8px] text-blue-400 font-black uppercase text-center">⚡ {finance.vel} days lead→paid</p>}</section>
          <div className="grid grid-cols-2 gap-3">{[{ l: 'Pending', v: isPrivate ? '***' : fmt$(finance.pending), c: 'border-orange-500', t: 'text-orange-400' }, { l: 'Avg Ticket', v: isPrivate ? '***' : fmt$(finance.avg), c: 'border-blue-500', t: 'text-blue-400' }, { l: 'MRR', v: isPrivate ? '***' : fmt$(finance.mrr), c: 'border-purple-500', t: 'text-purple-400' }, { l: 'Avg Rating', v: finance.avgRating || '—', c: 'border-amber-500', t: 'text-amber-400' }, { l: 'Avg LTV', v: isPrivate ? '***' : fmt$(finance.avgLTV), c: 'border-green-500', t: 'text-green-400' }, { l: 'Bonuses', v: fmt$(finance.bonuses), c: 'border-pink-500', t: 'text-pink-400' }].map(k => (<div key={k.l} className={`g p-5 border-b-4 ${k.c} text-center`}><p className="text-[8px] text-slate-500 mb-1 uppercase font-black">{k.l}</p><p className={`text-2xl font-black italic ${k.t}`}>{k.v}</p></div>))}</div>
          <div className="g p-5"><BarChart data={finance.wb} color="#22c55e" label="📊 Weekly Revenue" /></div>
          <div className="g p-5"><BarChart data={finance.mb2} color="#3b82f6" label="📈 6-Month Revenue" /></div>
          {finance.ltv.length > 0 && <div className="g p-5"><p className="text-[9px] font-black text-slate-500 uppercase mb-3">👑 Top Clients by LTV</p>{finance.ltv.slice(0, 5).map((c, i) => (<div key={c.name} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0"><div className="flex items-center gap-2"><span className="text-[8px] text-slate-600 font-black">#{i + 1}</span><span className="text-[10px] font-black text-white uppercase">{c.name}</span></div><div className="text-right"><p className="text-sm font-black text-green-400">{fmt$(c.total)}</p><p className="text-[7px] text-slate-500">{c.count} jobs</p></div></div>))}</div>}
          {finance.lostJ.length > 0 && <div className="g p-5"><p className="text-[9px] font-black text-slate-500 uppercase mb-3">📉 Lost Job Analysis</p>{Object.entries(finance.lostReasons).map(([r, n]) => (<div key={r} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0"><span className="text-[9px] font-black uppercase text-slate-400">{r}</span><span className="text-sm font-black text-red-400">{n}</span></div>))}</div>}
          <div className="g p-5"><p className="text-[9px] font-black text-slate-500 uppercase mb-3">Pipeline</p><div className="grid grid-cols-6 gap-1">{[{ k: 'lead', c: 'text-yellow-400', l: 'Lead' }, { k: 'scheduled', c: 'text-blue-400', l: 'Sched' }, { k: 'in_progress', c: 'text-green-400', l: 'Live' }, { k: 'completed', c: 'text-purple-400', l: 'Done' }, { k: 'paid', c: 'text-cyan-400', l: 'Paid' }, { k: 'lost', c: 'text-red-400', l: 'Lost' }].map(s => (<div key={s.k} className="text-center bg-white/5 p-2 rounded-xl"><p className={`text-xl font-black italic ${s.c}`}>{finance.byS[s.k] || 0}</p><p className="text-[6px] text-slate-500 uppercase font-black mt-0.5">{s.l}</p></div>))}</div></div>
          <div className="g p-5"><p className="text-[9px] font-black text-slate-500 uppercase mb-3">Revenue by Service</p>{Object.entries(finance.bySvc).map(([type, rev]) => (<div key={type} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0"><span className="text-[9px] font-black uppercase text-slate-400">{type} ({jobs.filter(j => j.service_type === type).length})</span><span className="text-sm font-black text-white">{isPrivate ? '***' : fmt$(rev)}</span></div>))}</div>
          <div className="flex gap-2"><button onClick={exportCSV} className="flex-1 g py-3 rounded-xl font-black uppercase text-[8px] text-slate-400 border border-white/5 active:scale-95">📊 Export CSV</button><button onClick={() => window.print()} className="flex-1 g py-3 rounded-xl font-black uppercase text-[8px] text-slate-400 border border-white/5 active:scale-95">🖨️ Print</button></div>
          {actLog.length > 0 && <div className="g p-5"><p className="text-[9px] font-black text-slate-500 uppercase mb-3">Activity Log</p>{actLog.slice(0, 8).map((l, i) => (<div key={i} className="flex justify-between py-1 border-b border-white/5 last:border-0"><span className="text-[8px] text-slate-400 font-black">{l.m}</span><span className="text-[7px] text-slate-600">{l.time}</span></div>))}</div>}
        </div>)}

        {view === 'agenda' && (<div className="space-y-4 animate-in slide-in-from-bottom-10 pb-24">
          <input className="inp" placeholder="🔍 Search..." value={sq} onChange={e => setSQ(e.target.value)} />
          <div className="flex gap-1.5 overflow-x-auto nsb pb-1">{['all', 'lead', 'scheduled', 'in_progress', 'completed', 'paid', 'lost'].map(s => (<button key={s} onClick={() => setFSt(s)} className={`px-3 py-1.5 rounded-xl text-[7px] font-black uppercase whitespace-nowrap active:scale-95 ${fSt === s ? 'bg-amber-500 text-black' : 'bg-white/5 text-slate-500'}`}>{s}</button>))}</div>
          {filtered.length === 0 && <div className="g p-10 text-center text-slate-500 font-black italic uppercase">No missions found.</div>}
          {filtered.map(job => {
            const isH = job.service_type === 'handyman';
            const bal = job.total_price - job.deposit_paid;
            const d = dna[job.client_name];
            const lv = lvl(d?.count || 0);
            const profit = realProfit(job);
            const bonus = calcBonus(job);
            return (
              <div key={job.id} className={`g p-5 border-l-[7px] shadow-xl hover:bg-white/[0.02] transition-all ${isH ? 'border-green-500' : job.status === 'paid' ? 'border-blue-500' : job.status === 'in_progress' ? 'border-green-400' : job.status === 'lead' ? 'border-yellow-500' : job.status === 'completed' ? 'border-purple-500' : job.status === 'lost' ? 'border-red-800' : 'border-amber-500'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <h3 className="text-base font-black uppercase italic text-white leading-none">{job.client_name}</h3>
                      <span className={`text-[6px] font-black px-1.5 py-0.5 rounded-full uppercase ${job.status === 'paid' ? 'bg-blue-600 text-white' : job.status === 'in_progress' ? 'bg-green-600 text-white' : job.status === 'lead' ? 'bg-yellow-500 text-black' : job.status === 'completed' ? 'bg-purple-600 text-white' : job.status === 'lost' ? 'bg-red-900 text-red-300' : 'bg-slate-700 text-slate-300'}`}>{job.status}</span>
                      {isH && <span className="text-[6px] bg-green-600 text-black font-black px-1.5 py-0.5 rounded-full">🛠️</span>}
                      {lv.name !== 'Bronze' && <span className="text-[6px] font-black px-1.5 py-0.5 rounded-full" style={{ background: lv.color, color: '#000' }}>{lv.name}</span>}
                      {job.approval_signature && <span className="text-[6px] bg-green-900 text-green-400 font-black px-1.5 py-0.5 rounded-full">✍️</span>}
                      {job.final_signature && <span className="text-[6px] bg-purple-900 text-purple-400 font-black px-1.5 py-0.5 rounded-full">🏁</span>}
                      {bonus > 0 && <span className="text-[6px] bg-amber-900 text-amber-400 font-black px-1.5 py-0.5 rounded-full">⭐+${bonus}</span>}
                      {job.client_rating > 0 && <span className="text-[6px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">{'⭐'.repeat(job.client_rating)}</span>}
                    </div>
                    <p className="text-[8px] text-slate-500 uppercase">{job.service_type} • {fmtD(job.scheduled_date)} • {job.team_assigned || 'No team'}</p>
                    {job.check_in_time && <p className="text-[7px] text-green-400 font-black uppercase">▶ {new Date(job.check_in_time).toLocaleTimeString()}{job.check_out_time && ` ⏹ ${new Date(job.check_out_time).toLocaleTimeString()}`}</p>}
                  </div>
                  <div className="dr border-2 ml-2" style={{ borderColor: lv.color, color: lv.color, width: 44, height: 44 }}><div className="text-center leading-none"><div style={{ fontSize: '0.5rem', fontWeight: 900 }}>{lv.name.slice(0, 3)}</div><div style={{ fontSize: '0.6rem', fontWeight: 900 }}>{d?.score || 0}</div></div></div>
                </div>
                <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-xl mb-2"><p className="text-[8px] text-slate-400 truncate w-44 italic">{job.address}</p><button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`)} className="text-green-500 text-[7px] font-black uppercase px-2 py-1 bg-green-600/10 rounded-lg active:scale-95">GPS</button></div>
                {!isPrivate && job.status === 'paid' && <div className="bg-green-900/20 border border-green-600/20 p-2 rounded-xl mb-2 flex justify-between items-center"><span className="text-[7px] font-black text-green-400 uppercase">Your pocket</span><span className="text-sm font-black text-green-400">{fmt$(profit)}</span></div>}
                <div className="grid grid-cols-3 gap-1 mb-2">{[['confirm', '✅'], ['reminder', '🔔'], ['review', '⭐'], ['quote', '📋'], ['referral', '🎁'], ['bundle', '🎯']].map(([tp, em]) => (<button key={tp} onClick={() => wa(job, tp)} className="py-1.5 bg-white/5 border border-white/5 rounded-xl text-[7px] font-black uppercase active:scale-95 text-slate-400">{em} {tp}</button>))}</div>
                {job.status === 'lead' && <div className="grid grid-cols-4 gap-1 mb-2"><button onClick={() => recordFollow(job, 'follow1')} className="py-1.5 bg-amber-500/10 text-amber-400 rounded-xl text-[7px] font-black uppercase active:scale-95">F1</button><button onClick={() => recordFollow(job, 'follow2')} className="py-1.5 bg-orange-500/10 text-orange-400 rounded-xl text-[7px] font-black uppercase active:scale-95">F2</button><button onClick={() => recordFollow(job, 'final')} className="py-1.5 bg-red-500/10 text-red-400 rounded-xl text-[7px] font-black uppercase active:scale-95">Final</button><button onClick={() => markLost(job)} className="py-1.5 bg-slate-800 text-slate-400 rounded-xl text-[7px] font-black uppercase active:scale-95">Lost</button></div>}
                {job.status === 'completed' && <div className="grid grid-cols-2 gap-1 mb-2"><button onClick={() => passQC(job)} className="py-1.5 bg-purple-500/10 text-purple-400 rounded-xl text-[7px] font-black uppercase active:scale-95">✅ QC Pass</button><button onClick={async () => { wa(job, 'qcfix'); await update(job, { specs: { ...(job.specs || {}), quality_issue: true } }, 'Fix sent'); }} className="py-1.5 bg-red-500/10 text-red-400 rounded-xl text-[7px] font-black uppercase active:scale-95">🔧 Fix</button></div>}
                {(job.status === 'paid' || job.specs?.quality_passed) && <div className="grid grid-cols-3 gap-1 mb-2"><button onClick={() => requestReview(job)} className="py-1.5 bg-blue-500/10 text-blue-400 rounded-xl text-[7px] font-black uppercase active:scale-95">⭐ Review</button><button onClick={() => rebook(job)} className="py-1.5 bg-green-500/10 text-green-400 rounded-xl text-[7px] font-black uppercase active:scale-95">🔄 Rebook</button><button onClick={() => offerMembership(job)} className="py-1.5 bg-yellow-500/10 text-yellow-400 rounded-xl text-[7px] font-black uppercase active:scale-95">💎 Member</button></div>}
                {(job.specs?.last_followup || job.specs?.quality_passed || job.specs?.review_requested_at || job.specs?.lost_reason || job.specs?.staff_issue) && <div className="bg-white/5 border border-white/5 rounded-xl p-2 mb-2 text-[7px] text-slate-500 font-black uppercase space-y-0.5">{job.specs?.last_followup && <p>Last: {job.specs.last_followup}</p>}{job.specs?.quality_passed && <p className="text-purple-400">QC ✓</p>}{job.specs?.review_requested_at && <p className="text-blue-400">Review ✓</p>}{job.specs?.lost_reason && <p className="text-red-400">Lost: {job.specs.lost_reason}</p>}{job.specs?.staff_issue && <p className="text-orange-400">Issue: {job.specs.staff_issue}</p>}</div>}
                <div className="flex justify-between items-end border-t border-white/5 pt-3">
                  <div>
                    <p className="text-[8px] text-slate-500 italic font-black uppercase">Balance</p>
                    <p className="text-4xl font-black italic tracking-tighter text-white leading-none">{fmt$(bal)}</p>
                    {job.next_visit && <p className="text-[7px] text-amber-500 font-black uppercase mt-0.5">↩ {job.next_visit}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => setChatJob(job)} className="p-2.5 bg-blue-900/30 text-blue-400 rounded-xl hover:bg-blue-600 transition-all"><Icon name="message-square" className="w-4 h-4" /></button>
                    <button onClick={() => printInvoice(job)} className="p-2.5 bg-slate-800 text-amber-500 rounded-xl hover:scale-110 transition-all"><Icon name="file-text" className="w-4 h-4" /></button>
                    <button onClick={() => { setEdit(job.id); setState({ ...job.specs, totalPrice: job.total_price }); setView('deploy'); setDtab('identity'); }} className="p-2.5 bg-slate-800 text-white rounded-xl hover:bg-blue-600 transition-all"><Icon name="edit-3" className="w-4 h-4" /></button>
                    <button onClick={() => { if (confirm('Archive?')) sb.from('elevore_missions').delete().eq('id', job.id).then(() => { tt('Archived ✓'); refresh(); }); }} className="p-2.5 bg-red-900/30 text-red-500 rounded-xl hover:bg-red-600 transition-all"><Icon name="trash-2" className="w-4 h-4" /></button>
                    <button onClick={() => window.open(`https://wa.me/${job.client_phone?.replace(/\D/g, '') || ''}`)} className="p-2.5 bg-green-600 text-white rounded-xl active:scale-90 transition-all"><Icon name="message-circle" className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>)}

        {view === 'clients' && (<div className="space-y-4 animate-in fade-in pb-24">
          <div className="g p-5 border-t-4 border-purple-500"><p className="text-[9px] font-black text-slate-500 uppercase mb-1">🧬 Client DNA</p></div>
          {clients.length === 0 && <div className="g p-10 text-center text-slate-500 font-black italic uppercase">No clients yet.</div>}
          {clients.sort((a, b) => (dna[b.name]?.score || 0) - (dna[a.name]?.score || 0)).map(client => {
            const d = dna[client.name] || { score: 0, count: 0, spent: 0 };
            const lv = lvl(d.count);
            const daysSince = dAgo(d.last);
            const lastJob = jobs.filter(j => j.client_name === client.name)[0];
            return (
              <div key={client.name} className="g p-5 hover:bg-white/[0.02] transition-all border-l-4" style={{ borderColor: lv.color }}>
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-base font-black uppercase italic text-white">{client.name}</h3>
                      <span className="text-[7px] font-black px-2 py-0.5 rounded-full" style={{ background: lv.color, color: '#000' }}>{lv.name}</span>
                      {daysSince >= 45 && <span className="text-[7px] bg-red-900/50 text-red-400 font-black px-2 py-0.5 rounded-full">⚠️ Churn Risk</span>}
                      {client.membership && client.membership !== 'none' && <span className="text-[7px] bg-blue-900/50 text-blue-400 font-black px-2 py-0.5 rounded-full">💎 {client.membership}</span>}
                    </div>
                    <p className="text-[8px] text-slate-500 uppercase">{client.phone}</p>
                    <div className="flex gap-3 mt-1 flex-wrap"><span className="text-[8px] font-black text-white">{d.count} jobs</span><span className="text-[8px] font-black text-green-400">{isPrivate ? '***' : fmt$(d.spent)}</span><span className="text-[8px] font-black text-slate-500">Last: {daysSince < 999 ? daysSince + 'd ago' : 'N/A'}</span></div>
                  </div>
                  <div className="dr border-2 ml-2 flex-shrink-0" style={{ borderColor: lv.color, color: lv.color, width: 44, height: 44 }}><div className="text-center leading-none"><div style={{ fontSize: '0.5rem', fontWeight: 900 }}>{lv.name.slice(0, 3)}</div><div style={{ fontSize: '0.6rem', fontWeight: 900 }}>{d.score}</div></div></div>
                </div>
                <div className="pb mt-2 mb-3"><div className="pf" style={{ width: `${d.score}%` }}></div></div>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => { const p = client.phone?.replace(/\D/g, '') || ''; const ph = p.length === 10 ? '1' + p : p; window.open(`https://wa.me/${ph}`); }} className="flex-1 py-2 bg-green-600/20 text-green-400 rounded-xl text-[7px] font-black uppercase active:scale-95">💬 WA</button>
                  <button onClick={() => lastJob ? wa(lastJob, 'referral') : tt('No previous job', 'red')} className="flex-1 py-2 bg-pink-600/20 text-pink-400 rounded-xl text-[7px] font-black uppercase active:scale-95">🎁 Ref</button>
                  <button onClick={() => lastJob ? wa(lastJob, 'bundle') : tt('No previous job', 'red')} className="flex-1 py-2 bg-blue-600/20 text-blue-400 rounded-xl text-[7px] font-black uppercase active:scale-95">🎯 Bundle</button>
                  <button onClick={() => lastJob ? wa(lastJob, 'birthday') : tt('No previous job', 'red')} className="flex-1 py-2 bg-amber-600/20 text-amber-400 rounded-xl text-[7px] font-black uppercase active:scale-95">🎂 B-day</button>
                  <button onClick={() => { setState({ ...INIT, ...client.specs, name: client.name, phone: client.phone, address: client.address }); setView('deploy'); setDtab('specs'); }} className="flex-1 py-2 bg-white/5 text-slate-400 rounded-xl text-[7px] font-black uppercase active:scale-95">+ Job</button>
                </div>
              </div>
            );
          })}
        </div>)}

        {view === 'members' && (<div className="space-y-5 animate-in fade-in pb-24">
          <div className="g p-5 border-t-4 border-yellow-500">
            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">💎 Memberships</p>
            <p className="text-[8px] text-slate-600 font-black italic">MRR Engine</p>
            <p className="text-2xl font-black italic text-white mt-2">{isPrivate ? '***' : fmt$(finance.mrr)}<span className="text-[9px] text-slate-500 font-black">/mo MRR</span></p>
          </div>
          {MBS.filter(m => m.id !== 'none').map(m => (
            <div key={m.id} className="g p-5 border-l-4" style={{ borderColor: m.color }}>
              <div className="flex justify-between items-center mb-3">
                <div><h3 className="text-lg font-black uppercase italic text-white">{m.name}</h3></div>
                <p className="text-2xl font-black" style={{ color: m.color }}>{fmt$(m.price)}<span className="text-[9px] text-slate-500">/mo</span></p>
              </div>
              <ul className="space-y-1 mb-3">{m.perks?.map((p, i) => (<li key={i} className="text-[9px] text-slate-400 font-black">✓ {p}</li>))}</ul>
              <div className="flex justify-between items-center pt-2 border-t border-white/5">
                <span className="text-[8px] text-slate-500 font-black uppercase">{clients.filter(c => c.membership === m.id).length} active</span>
                <button onClick={() => { const name = prompt('Client name to assign ' + m.name + ':'); if (name) sb.from('clients').update({ membership: m.id }).ilike('name', '%' + name + '%').then(() => { tt(name + ' → ' + m.name + ' ✓'); refresh(); }); }} className="px-4 py-2 bg-white/10 text-white rounded-xl text-[8px] font-black uppercase active:scale-95">+ Assign</button>
              </div>
            </div>
          ))}
        </div>)}

        {view === 'drive' && (<div className="space-y-4 animate-in fade-in pb-24">
          <div className="g p-5 border-t-4 border-blue-500"><p className="text-[9px] font-black text-slate-500 uppercase mb-1">📁 Photo Drive</p></div>
          {jobs.length === 0 && <div className="g p-10 text-center text-slate-500 font-black italic uppercase">No missions yet.</div>}
          {jobs.map(job => (
            <div key={job.id} className="g p-5 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black uppercase italic text-white">{job.client_name}</h3>
                  <p className="text-[8px] text-slate-500 uppercase">{job.service_type} • {fmtD(job.scheduled_date)}</p>
                </div>
                <QR url={`${location.origin}${location.pathname}?mision=${job.id}`} size={50} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="g p-3"><PhotoDrive photos={job.before_photos || []} label="📸 Before" onAdd={async u => { const c = job.before_photos || []; await sb.from('elevore_missions').update({ before_photos: [...c, u] }).eq('id', job.id); tt('Added ✓'); refresh(); }} /></div>
                <div className="g p-3"><PhotoDrive photos={job.after_photos || []} label="✨ After" onAdd={async u => { const c = job.after_photos || []; await sb.from('elevore_missions').update({ after_photos: [...c, u] }).eq('id', job.id); tt('Added ✓'); refresh(); }} /></div>
              </div>
            </div>
          ))}
        </div>)}

        {view === 'payroll' && (<div className="space-y-5 animate-in fade-in pb-24">
          <div className="g p-5 border-t-4 border-green-500">
            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">💰 Payroll</p>
            <p className="text-[8px] text-slate-600 font-black italic">40% + bonuses</p>
          </div>
          {Object.entries(finance.payroll).length === 0 && <div className="g p-10 text-center text-slate-500 font-black italic uppercase">No paid jobs yet.</div>}
          {Object.entries(finance.payroll).sort((a, b) => b[1] - a[1]).map(([name, amount]) => (
            <div key={name} className="g p-5 border-l-4 border-green-500">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black uppercase italic text-white">{name}</h3>
                  <p className="text-[8px] text-slate-500">{jobs.filter(j => j.team_assigned === name && j.status === 'paid').length} paid jobs</p>
                </div>
                <p className="text-2xl font-black italic text-green-400">{isPrivate ? '***' : fmt$(amount)}</p>
              </div>
            </div>
          ))}
          <div className="g p-5">
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-[9px] text-slate-400 font-black uppercase">Collected</span><span className="text-sm font-black text-white">{isPrivate ? '***' : fmt$(finance.col)}</span></div>
              <div className="flex justify-between"><span className="text-[9px] text-slate-400 font-black uppercase">Payroll (40%)</span><span className="text-sm font-black text-red-400">-{isPrivate ? '***' : fmt$(finance.col * DEFAULT_CFG.STAFF_PAY)}</span></div>
              <div className="flex justify-between"><span className="text-[9px] text-slate-400 font-black uppercase">Bonuses</span><span className="text-sm font-black text-amber-400">-{fmt$(finance.bonuses)}</span></div>
              <div className="flex justify-between border-t border-white/10 pt-2"><span className="text-[9px] text-white font-black uppercase">Your Net</span><span className="text-lg font-black text-green-400">{isPrivate ? '****' : fmt$(finance.net)}</span></div>
            </div>
          </div>
          <button onClick={exportCSV} className="w-full g py-4 rounded-xl font-black uppercase text-[9px] text-slate-400 border border-white/5 active:scale-95">📊 Export CSV</button>
        </div>)}

        {view === 'deploy' && (<div className="space-y-5 animate-in zoom-in-95 pb-32">
          <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-white/5">{['identity', 'specs', 'add-ons', 'money'].map(t => (<button key={t} onClick={() => setDtab(t)} className={`flex-1 py-2.5 rounded-xl text-[8px] uppercase font-black active:scale-95 ${dtab === t ? 'ton' : 'text-slate-500'}`}>{t}</button>))}</div>
          <div className="g p-6 space-y-5 shadow-xl">
            {dtab === 'identity' && (<div className="space-y-3 animate-in fade-in">
              <h3 className="text-[10px] uppercase text-amber-500 font-black italic tracking-widest border-b border-white/5 pb-2">Identity</h3>
              <input className="inp uppercase" placeholder="CLIENT FULL NAME" value={state.name} onChange={e => onName(e.target.value)} />
              <input className="inp" placeholder="PHONE" value={state.phone} onChange={e => setState({ ...state, phone: e.target.value })} />
              <input className="inp uppercase text-xs" placeholder="ADDRESS" value={state.address} onChange={e => setState({ ...state, address: e.target.value })} />
              <textarea className="inp text-sm resize-none h-16" placeholder="Notes..." value={state.notes} onChange={e => setState({ ...state, notes: e.target.value })} />
              <div className="grid grid-cols-3 gap-2">{['lead', 'scheduled', 'paid'].map(s => (<button key={s} onClick={() => setState({ ...state, status: s })} className={`py-3 rounded-xl text-[8px] uppercase font-black border-2 active:scale-95 ${state.status === s ? 'bg-amber-500 text-black border-amber-500' : 'bg-white/5 border-white/5 text-slate-500'}`}>{s}</button>))}</div>
              <div><p className="text-[8px] text-slate-500 uppercase font-black mb-2">Frequency</p><div className="grid grid-cols-4 gap-1">{[{ l: '1x', v: 'one-time' }, { l: 'Weekly', v: 'weekly' }, { l: 'Bi-W', v: 'bi-weekly' }, { l: 'Monthly', v: 'monthly' }].map(f => (<button key={f.v} onClick={() => setState({ ...state, frequency: f.v })} className={`py-2 rounded-xl text-[7px] font-black border-2 active:scale-95 ${state.frequency === f.v ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>{f.l}</button>))}</div></div>
              <div><p className="text-[8px] text-slate-500 uppercase font-black mb-2">Quote Urgency</p><div className="grid grid-cols-4 gap-1">{[{ l: '6h', v: 6 }, { l: '12h', v: 12 }, { l: '24h', v: 24 }, { l: '48h', v: 48 }].map(u => (<button key={u.v} onClick={() => setState({ ...state, urgencyHours: u.v })} className={`py-2 rounded-xl text-[7px] font-black border-2 active:scale-95 ${state.urgencyHours === u.v ? 'bg-red-600 border-red-600 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>{u.l}</button>))}</div></div>
              <div><p className="text-[8px] text-slate-500 uppercase font-black mb-2">Client Language</p><div className="grid grid-cols-2 gap-1">{[{ l: 'English', v: 'en' }, { l: 'Español', v: 'es' }].map(lg => (<button key={lg.v} onClick={() => setState({ ...state, lang: lg.v })} className={`py-2 rounded-xl text-[7px] font-black border-2 active:scale-95 ${state.lang === lg.v ? 'bg-amber-500 border-amber-500 text-black' : 'bg-white/5 border-white/5 text-slate-500'}`}>{lg.l}</button>))}</div></div>
            </div>)}
            {dtab === 'specs' && (<div className="space-y-4 animate-in fade-in text-center font-black uppercase">
              <div className="grid grid-cols-5 gap-1">{['regular', 'deep', 'moveout', 'postcon', 'handyman'].map(s => (<button key={s} onClick={() => setState({ ...state, svc: s, selectedQuickJobs: [] })} className={`py-3 rounded-xl font-black text-[7px] border-2 active:scale-95 ${state.svc === s ? 'bg-green-600 border-green-600 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-500'}`}>{s === 'handyman' ? '🛠️' : s}</button>))}</div>
              {state.svc === 'handyman' ? (<div className="space-y-4 text-left"><div className="bg-white/5 p-4 rounded-2xl border border-white/5"><p className="text-[9px] text-amber-500 uppercase font-black mb-2 text-center">Labor × $85/hr</p><div className="flex justify-between items-center max-w-[180px] mx-auto"><button onClick={() => setState({ ...state, laborHours: Math.max(1, state.laborHours - 1) })} className="w-10 h-10 bg-white/10 rounded-xl text-xl font-bold text-white active:scale-95">-</button><span className="text-3xl font-black italic text-white">{state.laborHours}h</span><button onClick={() => setState({ ...state, laborHours: state.laborHours + 1 })} className="w-10 h-10 bg-white/10 rounded-xl text-xl font-bold text-white active:scale-95">+</button></div></div><div><p className="text-[8px] text-slate-500 uppercase font-black mb-2">Quick Jobs</p><div className="grid grid-cols-2 gap-2">{QJOBS.map(q => { const sel = state.selectedQuickJobs.includes(q.id); return (<button key={q.id} onClick={() => setState(s => ({ ...s, selectedQuickJobs: sel ? s.selectedQuickJobs.filter(x => x !== q.id) : [...s.selectedQuickJobs, q.id] }))} className={`p-2.5 rounded-xl border text-[8px] font-black active:scale-95 flex justify-between ${sel ? 'bg-green-600 border-green-600 text-white' : 'bg-white/5 border-white/10 text-slate-400'}`}><span>{q.en}</span><span>{fmt$(q.p)}</span></button>); })}</div></div><div><p className="text-[8px] text-slate-500 uppercase font-black mb-2">Materials ($)</p><input type="number" value={state.materialCost || ''} className="inp text-blue-400 text-center" onChange={e => setState({ ...state, materialCost: parseFloat(e.target.value) || 0 })} /></div><div><p className="text-[8px] text-slate-500 uppercase font-black mb-2">Risk Margin</p><div className="grid grid-cols-4 gap-1">{RISK.map(r => (<button key={r.v} onClick={() => setState({ ...state, riskMargin: r.v })} className={`py-2 rounded-xl text-[7px] font-black border-2 active:scale-95 ${state.riskMargin === r.v ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>{r.l}{r.v > 0 ? ` +$${r.v}` : ''}</button>))}</div></div></div>) : state.svc === 'postcon' ? (<div className="p-5 bg-white/5 rounded-2xl border border-white/5"><p className="text-[9px] text-amber-500 uppercase font-black mb-2">SqFt</p><input type="number" value={state.sqft} className="bg-transparent text-6xl font-black text-center w-full text-white outline-none italic leading-none" onChange={e => setState({ ...state, sqft: parseInt(e.target.value) || 0 })} /></div>) : (<div className="space-y-3"><div className="grid grid-cols-2 gap-2">{[{ l: 'Beds', k: 'beds' }, { l: 'Baths', k: 'baths' }, { l: 'Living', k: 'living' }, { l: 'Laundry', k: 'laundryRoom' }].map(i => (<div key={i.k} className="bg-white/5 p-3 rounded-xl text-center border border-white/5"><span className="text-[8px] uppercase block mb-1.5 text-slate-400 font-black">{i.l}</span><div className="flex justify-between items-center"><button onClick={() => setState({ ...state, [i.k]: Math.max(0, state[i.k] - 1) })} className="w-8 h-8 bg-white/10 rounded-lg text-white font-bold active:scale-95">-</button><span className="text-xl font-black italic text-white">{state[i.k]}</span><button onClick={() => setState({ ...state, [i.k]: state[i.k] + 1 })} className="w-8 h-8 bg-white/10 rounded-lg text-white font-bold active:scale-95">+</button></div></div>))}</div><div className="grid grid-cols-4 gap-1 pt-1 border-t border-white/5">{[{ l: 'Tidy', v: 0.9 }, { l: 'Avg', v: 1 }, { l: 'Heavy', v: 1.5 }, { l: 'Ext', v: 2.1 }].map(c => (<button key={c.l} onClick={() => setState({ ...state, complexity: c.v })} className={`py-2 rounded-xl text-[7px] font-black border-2 active:scale-95 ${state.complexity === c.v ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>{c.l}</button>))}</div></div>)}
              <div className="space-y-2 text-left pt-2 border-t border-white/5"><p className="text-[8px] text-slate-500 uppercase font-black">Membership</p><div className="grid grid-cols-2 gap-2">{MBS.map(m => (<button key={m.id} onClick={() => setState({ ...state, membership: m.id })} className={`g p-3 text-left border-2 transition-all active:scale-95`} style={{ borderColor: state.membership === m.id ? m.color : 'rgba(255,255,255,0.08)' }}><div className="flex justify-between items-center"><span className="font-black uppercase text-[10px] text-white">{m.name}</span>{m.price > 0 && <span className="font-black text-xs" style={{ color: m.color }}>{fmt$(m.price)}</span>}</div></button>))}</div></div>
            </div>)}
            {dtab === 'add-ons' && (<div className="space-y-4 animate-in fade-in">{state.svc === 'handyman' ? (<div className="p-8 text-center text-slate-500 font-black italic border-2 border-dashed border-white/5 rounded-2xl">🛠️ Time & materials only.</div>) : (<><h3 className="text-[9px] uppercase text-amber-500 italic font-black text-center border-b border-white/5 pb-2">Premium Matrix</h3><div className="grid grid-cols-2 gap-2">{ADDONS.map(ex => (<button key={ex.id} onClick={() => setState({ ...state, [ex.id]: !state[ex.id] })} className={`p-3.5 rounded-xl flex justify-between items-center border active:scale-95 ${state[ex.id] ? 'bg-green-600 border-green-600 text-white font-black shadow-lg' : 'bg-white/5 border-white/5 text-slate-500'}`}><span className="text-[9px] uppercase font-black">{ex.en}</span><span className="text-[9px] font-black">+${ex.p}</span></button>))}</div><div className="bg-amber-500/10 p-5 rounded-2xl border border-amber-500/20 text-center space-y-3"><span className="text-[9px] uppercase italic text-amber-500 font-black tracking-widest">Laundry Loads</span><div className="flex justify-between items-center max-w-[140px] mx-auto"><button onClick={() => setState({ ...state, laundryLoads: Math.max(0, state.laundryLoads - 1) })} className="w-11 h-11 bg-amber-500 text-black rounded-xl text-xl font-bold active:scale-95">-</button><span className="text-3xl font-black italic text-white">{state.laundryLoads}</span><button onClick={() => setState({ ...state, laundryLoads: state.laundryLoads + 1 })} className="w-11 h-11 bg-amber-500 text-black rounded-xl text-xl font-bold active:scale-95">+</button></div></div></>)}</div>)}
            {dtab === 'money' && (<div className="space-y-4 animate-in fade-in"><div className="grid grid-cols-2 gap-3 text-center font-black uppercase"><div className="space-y-1"><p className="text-[8px] text-slate-500">Expenses</p><input type="number" value={state.expenses} className="inp text-orange-400 text-center" onChange={e => setState({ ...state, expenses: parseFloat(e.target.value) || 0 })} /></div><div className="space-y-1"><p className="text-[8px] text-slate-500">Discount</p><select value={state.discount} className="inp text-red-500 font-black text-center text-sm appearance-none" onChange={e => setState({ ...state, discount: parseInt(e.target.value) })}><option value="0">0%</option><option value="10">10%</option><option value="20">20%</option><option value="30">30%</option></select></div></div><div className="space-y-3 border-t border-white/5 pt-3"><select value={state.team} className="inp text-xs text-center" onChange={e => setState({ ...state, team: e.target.value })}><option value="">Team...</option><option value="Team Alpha">Team Alpha</option><option value="Team Beta">Team Beta</option><option value="Jose Mario">Jose Mario</option></select><div className="grid grid-cols-2 gap-3"><div className="space-y-1"><p className="text-[8px] text-slate-500 uppercase font-black">Date</p><input type="date" value={state.date} className="inp text-[10px] font-black" onChange={e => setState({ ...state, date: e.target.value })} /></div><div className="space-y-1"><p className="text-[8px] text-slate-500 uppercase font-black">Deposit</p><input type="number" value={state.deposit} className="inp text-blue-400 font-black text-center" onChange={e => setState({ ...state, deposit: parseFloat(e.target.value) || 0 })} /></div></div></div></div>)}
          </div>
          <div className="bg-white text-black p-8 rounded-[3rem] text-center shadow-2xl relative overflow-hidden active:scale-95 transition-all">
            <div className="absolute top-0 left-0 w-full h-2 bg-green-500 animate-pulse"></div>
            <div className="flex justify-between items-center mb-3"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Deployment Value</p><span className={`text-[8px] font-black px-3 py-1 rounded-lg border ${pricing.ac} border-current`}>{pricing.advice}</span></div>
            <h4 className="text-[6rem] font-black italic tracking-tighter leading-none mb-4 text-black"><span className="text-3xl align-top mr-1 font-light opacity-30">$</span>{state.totalPrice}</h4>
            <button onClick={deploy} className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-lg uppercase italic active:scale-90 transition-all shadow-xl shadow-green-500/20">{editId ? 'Update ⚡' : 'Execute Deploy 🚀'}</button>
          </div>
        </div>)}
      </main>

      <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[94%] max-w-sm g p-2 flex justify-around items-center border border-white/10 shadow-[0_30px_60px_rgba(0,0,0,1)] z-[1000]">{[['brief', 'sun', 'amber'], ['intel', 'bar-chart-2', 'green'], ['agenda', 'shield-check', 'blue'], ['clients', 'users', 'purple'], ['members', 'diamond', 'yellow'], ['drive', 'image', 'cyan'], ['payroll', 'wallet', 'green'], ['deploy', 'zap', 'amber']].map(([v, icon, c]) => (<button key={v} onClick={() => { if (v === 'deploy') { setEdit(null); setState(INIT); setView('deploy'); setDtab('identity'); } else setView(v); }} className={`p-2 rounded-xl flex-1 flex flex-col items-center gap-0.5 transition-all ${view === v ? `text-${c}-400 bg-white/5` : 'text-slate-600'}`}><Icon name={icon} className="w-3.5 h-3.5" /><span className="text-[5px] font-black uppercase">{v === 'deploy' ? 'New' : v === 'brief' ? 'AM' : v === 'members' ? 'VIP' : v === 'payroll' ? 'Pay' : v}</span></button>))}</nav>
    </div>
  );
}
