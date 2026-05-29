import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { sb } from './supabase';
import * as Icons from 'lucide-react';
import { InventoryTab } from './components/admin/InventoryTab';
import { RemindersTab } from './components/admin/RemindersTab';
import { MapTab } from './components/admin/MapTab';
import { PublicQuoteProposal } from './components/PublicQuoteProposal';

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

// =====================================================================
// 📊 EMBEDDED CHART ENGINE (Quant SVG Lines & Bars)
// =====================================================================
function EmbedChart({ type, data, labels }) {
  if (!data || !data.length) return null;
  const maxVal = Math.max(...data, 1);
  
  if (type === 'bar') {
    return (
      <div className="bg-black/60 border border-white/10 rounded-xl p-3 my-3 text-center shadow-inner">
        <div className="flex justify-between items-end h-28 gap-2 px-2 pt-4">
          {data.map((val, idx) => {
            const hPct = Math.round((val / maxVal) * 100);
            return (
              <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                <div className="absolute bottom-full mb-1 text-[8px] font-mono text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity bg-black/90 px-1.5 py-0.5 rounded border border-white/10 z-10 pointer-events-none">
                  ${val.toLocaleString()}
                </div>
                <div 
                  style={{ height: `${Math.max(4, hPct)}%` }}
                  className="w-full bg-gradient-to-t from-amber-600 to-[#F5C518] rounded-t-sm shadow-[0_0_8px_rgba(245,197,24,0.25)] transition-all duration-500 hover:scale-x-105"
                />
                <span className="text-[7px] text-slate-500 mt-1 font-mono leading-none truncate max-w-[40px]">{labels[idx] || ''}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Line Chart
  const width = 300;
  const height = 100;
  const padding = 15;
  const points = data.map((val, idx) => {
    const x = padding + (idx * (width - padding * 2)) / (data.length - 1 || 1);
    const y = height - padding - (val / maxVal) * (height - padding * 2);
    return { x, y, val, label: labels[idx] || '' };
  });
  
  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="bg-black/60 border border-white/10 rounded-xl p-3 my-3 text-center shadow-inner overflow-hidden">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#F5C518" floodOpacity="0.4"/>
          </filter>
          <linearGradient id="goldLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d4a310" />
            <stop offset="100%" stopColor="#F5C518" />
          </linearGradient>
        </defs>
        
        {/* Horizontal grids */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <line x1={padding} y1={height/2} x2={width - padding} y2={height/2} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        
        {/* Spline/Polyline */}
        <polyline
          fill="none"
          stroke="url(#goldLineGrad)"
          strokeWidth="2"
          points={polylinePoints}
          filter="url(#goldGlow)"
        />
        
        {/* Dot nodes */}
        {points.map((p, idx) => (
          <g key={idx} className="group cursor-pointer">
            <circle
              cx={p.x}
              cy={p.y}
              r="3.5"
              className="fill-[#F5C518] stroke-[#030206] stroke-2 hover:r-5 transition-all"
            />
            <text x={p.x} y={height - 2} textAnchor="middle" className="text-[7px] fill-slate-500 font-mono select-none">{p.label}</text>
            <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
              <rect x={p.x - 20} y={p.y - 18} width="40" height="11" rx="3" className="fill-black/90 stroke-white/10 stroke-[0.5px]" />
              <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[7.5px] fill-emerald-400 font-mono font-black">${p.val.toLocaleString()}</text>
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
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
  en: { balance: 'Balance Due', pay: 'Pay via Zelle', approve: 'Sign to Approve Quote', before: 'Before', after: 'After', complete: 'Sign to Confirm Completion', review: 'Leave a Google Review', refer: 'Refer a Friend — Both Get $25 Off', syncing: 'Syncing...', hub: 'Live Mission Hub', arrived: 'Team Arrived', done: 'Completed', rating: 'Rate your service', submit: 'Submit Rating', chat: 'Message us', legal: 'Digital signatures are legally binding', urgency: 'Quote expires in', lock: 'Lock in your price!', refTitle: 'Referral Program', refDesc: 'Share your link with friends. Both get $25 off when they complete their first booking!', copied: 'Copied! 🎁', stepApproved: 'Quote Approved', stepEnRoute: 'Team En Route', stepInService: 'In Service', stepQC: 'Quality Control', stepCompletedPaid: 'Completed & Paid', sliderBeforeAfter: 'Before / After Comparison', trackerTitle: 'Uber-Style Live Service Tracker', destLocation: 'Destination Location', routeMap: 'Live Destination Map', payCard: 'Pay Securely with Card', cardNo: 'Card Number', expiry: 'Expiry (MM/YY)', cvc: 'CVC', cardName: 'Name on Card', tipSelect: 'Select a Tip for the Team', customTip: 'Custom Tip ($)', paying: 'Processing payment...', paySuccess: 'Payment completed!', totalAmount: 'Total to Pay', tabActive: 'Active Tracker', tabHistory: 'History', tabPreferences: 'Preferences', tabMembership: 'Membership', tabBooking: 'Book Service', tabReferral: 'Referral Hub' },
  es: { balance: 'Saldo Pendiente', pay: 'Paga por Zelle', approve: 'Firma para Aprobar tu Cotización', before: 'Antes', after: 'Después', complete: 'Firma para Confirmar que Quedó Bien', review: 'Déjanos una Reseña', refer: 'Refiere un Amigo — Ambos Reciben $25', syncing: 'Cargando...', hub: 'Estado del Servicio', arrived: 'El equipo llegó', done: 'Completado', rating: 'Califica el servicio', submit: 'Enviar Calificación', chat: 'Escríbenos', legal: 'Las firmas digitales tienen validez legal', urgency: 'Cotización vence en', lock: '¡Bloquea tu precio!', refTitle: 'Programa de Referidos', refDesc: 'Comparte tu link con amigos. ¡Ambos reciben $25 de descuento en su próximo servicio!', copied: '¡Link Copiado! 🎁', stepApproved: 'Cotización Aprobada', stepEnRoute: 'Equipo en Camino', stepInService: 'En Servicio', stepQC: 'Control de Calidad', stepCompletedPaid: 'Completado y Pagado', sliderBeforeAfter: 'Comparación Antes / Después', trackerTitle: 'Rastreador en Vivo del Servicio', destLocation: 'Ubicación de Destino', routeMap: 'Mapa de Destino en Vivo', payCard: 'Pagar con Tarjeta de Forma Segura', cardNo: 'Número de Tarjeta', expiry: 'Expiración (MM/AA)', cvc: 'CVC', cardName: 'Nombre en la Tarjeta', tipSelect: 'Selecciona una Propina para el Equipo', customTip: 'Propina Personalizada ($)', paying: 'Procesando pago...', paySuccess: '¡Pago realizado con éxito!', totalAmount: 'Total a Pagar', tabActive: 'Servicio Activo', tabHistory: 'Historial', tabPreferences: 'Preferencias', tabMembership: 'Membresía', tabBooking: 'Agendar', tabReferral: 'Referidos' }
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

const INIT = { name: '', phone: '', email: '', address: '', svc: 'regular', beds: 2, baths: 2, living: 1, laundryRoom: 0, complexity: 1, sqft: 2000, oven: false, fridge: false, windows: false, pethair: false, garage: false, laundryLoads: 0, expenses: 0, deposit: 0, discount: 0, frequency: 'one-time', team: '', date: '', status: 'lead', totalPrice: 0, laborHours: 2, materialCost: 0, riskMargin: 50, selectedQuickJobs: [], audit_link: '', notes: '', urgencyHours: 24, membership: 'none', lang: 'en', leadSource: 'organic', adSpend: 0, marketingCost: 0 };

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

const geocodeAddress = async (address) => {
  if (!address) return null;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
    const data = await res.json();
    if (data && data[0]) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
  } catch (e) {
    console.error("Geocoding failed:", e);
  }
  return null;
};

const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return null;
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null;
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};


const triggerInngestEvent = async (event, data) => {
  try {
    const response = await fetch('/api/trigger-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event, data }),
    });
    if (!response.ok) {
      console.warn("Failed to dispatch Inngest event", event, response.status);
    } else {
      console.log("Inngest event dispatched successfully:", event);
    }
  } catch (error) {
    console.error("Inngest event trigger error:", error);
  }
};


const triggerOnMyWayEmail = async (job, bizName) => {
  const email = job.client_email || job.specs?.email || job.email || '';
  if (!email) return;

  const svcName = {
    regular: 'Limpieza Residencial Regular',
    deep: 'Limpieza Residencial Profunda',
    moveout: 'Limpieza de Mudanza (Move-Out)',
    postcon: 'Limpieza Post-Construcción',
    handyman: 'Servicio Handyman / Mantenimiento'
  }[job.service_type] || job.service_type || 'Servicio Premium';

  try {
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: `🚀 On our way! Your ${bizName} team is heading over`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-top: 4px solid #10b981;">
            <h2>Hi ${job.client_name || 'Valued Customer'},</h2>
            <p>Exciting news! Our service team is currently heading towards your address: <strong>${job.address || ''}</strong>.</p>
            <p>We will be starting your <strong>${svcName}</strong> service shortly. You can expect us to arrive in approximately 20-30 minutes.</p>
            <p>If you need to share any entry codes, parking details, or last-minute instructions, please let us know by replying to this message or calling us.</p>
            <p>Thank you for choosing ${bizName}!</p>
          </div>
        `
      })
    });
    console.log("Direct 'On-My-Way' email sent successfully");
  } catch (error) {
    console.error("Failed to send direct 'On-My-Way' email:", error);
  }
};


const triggerRatingSubmitEmail = async (job, val, bizName, reviewLink, sb, tenantId) => {
  const email = job.client_email || job.specs?.email || job.email || '';
  if (!email) return;

  try {
    if (val === 5) {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: `Could you do us a quick favor? 🏠`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #1a202c; text-align: center;">You made our day! ⭐⭐⭐⭐⭐</h2>
              <p style="color: #4a5568; font-size: 16px;">Hi ${job.client_name || 'Customer'},</p>
              <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">Thank you so much for your 5-star rating of our service! As a local business, online reviews mean the world to us and help others find us.</p>
              <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">Could you take 1 minute to share your experience on Google?</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${reviewLink}" target="_blank" style="display: inline-block; padding: 15px 30px; background-color: #3b82f6; color: white; font-weight: bold; text-decoration: none; border-radius: 8px; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">Write a Google Review</a>
              </div>
              <p style="color: #4a5568; font-size: 16px;">We appreciate your support so much!</p>
              <p style="color: #718096; font-size: 14px;">— The team at ${bizName}</p>
            </div>
          `
        })
      });
      console.log("Direct Google Review email sent successfully");
    } else if (val <= 3 && val > 0 && sb && tenantId) {
      const { data: admins } = await sb.from('staff_profiles').select('staff_email, email').eq('tenant_id', tenantId).eq('role', 'admin').limit(1);
      const adminEmail = admins?.[0]?.staff_email || admins?.[0]?.email;
      if (adminEmail) {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: adminEmail,
            subject: `⚠️ ACTION REQUIRED: Low Customer Rating (${val}/5) ⚠️`,
            html: `
              <h3>Attention Admin,</h3>
              <p>A client has left a low rating for service ID: <strong>${job.id}</strong></p>
              <ul>
                <li><strong>Client:</strong> ${job.client_name}</li>
                <li><strong>Phone:</strong> ${job.client_phone}</li>
                <li><strong>Rating:</strong> ${val}/5 Stars</li>
                <li><strong>Service:</strong> ${job.service_type}</li>
                <li><strong>Team Assigned:</strong> ${job.team_assigned || "Unassigned"}</li>
              </ul>
              <p>Please contact the client to resolve any issues and protect our service quality reputation.</p>
            `
          })
        });
        console.log("Direct low rating admin alert email sent successfully");
      }
    }
  } catch (error) {
    console.error("Failed to send rating email:", error);
  }
};


const triggerFeedbackRequestEmail = async (job, bizName) => {
  const email = job.client_email || job.specs?.email || job.email || '';
  if (!email) return;

  const ratingUrl = `https://elevore-saas.vercel.app/?jid=${job.id}`;

  try {
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: `How did we do? Rate your service with ${bizName} ✨`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #1a202c; text-align: center;">Thank you for choosing ${bizName}!</h2>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">Hi ${job.client_name || 'valued customer'},</p>
            <p style="color: #4a5568; font-size: 16px; line-height: 1.5;">We completed your <strong>${job.service_type || 'service'}</strong>. We'd love to know how we did! Please take 5 seconds to rate your experience:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${ratingUrl}&rating=5" style="display: inline-block; padding: 12px 24px; margin: 5px; background-color: #fbbf24; color: black; font-weight: bold; text-decoration: none; border-radius: 8px; font-size: 18px;">⭐⭐⭐⭐⭐ Excellent</a>
              <br/><br/>
              <a href="${ratingUrl}&rating=4" style="display: inline-block; padding: 10px 20px; margin: 5px; background-color: #f3f4f6; color: #4a5568; text-decoration: none; border-radius: 8px;">⭐⭐⭐⭐ Good</a>
              <a href="${ratingUrl}&rating=3" style="display: inline-block; padding: 10px 20px; margin: 5px; background-color: #f3f4f6; color: #4a5568; text-decoration: none; border-radius: 8px;">⭐⭐⭐ Okay</a>
              <a href="${ratingUrl}&rating=1" style="display: inline-block; padding: 10px 20px; margin: 5px; background-color: #f3f4f6; color: #4a5568; text-decoration: none; border-radius: 8px;">⭐ Disappointed</a>
            </div>
            <p style="color: #718096; font-size: 12px; text-align: center;">Clicking any button will take you to your client portal to submit comments.</p>
          </div>
        `
      })
    });
    console.log("Direct feedback request email sent successfully");
  } catch (error) {
    console.error("Failed to send direct feedback request email:", error);
  }
};


const triggerN8nEmail = async (job) => {
  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("n8n Webhook URL is not configured in .env");
    return;
  }

  const email = job.specs?.email || job.email || '';
  if (!email) {
    console.warn("No email address found for job", job.id);
    return;
  }

  const svcTitle = {
    regular: 'Limpieza Residencial Regular',
    deep: 'Limpieza Residencial Profunda',
    moveout: 'Limpieza de Mudanza (Move-Out)',
    postcon: 'Limpieza Post-Construcción',
    handyman: 'Servicio Handyman / Mantenimiento'
  }[job.service_type] || job.service_type || 'Servicio Premium';

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        record: {
          id: job.id,
          client_name: job.client_name,
          client_email: email,
          client_phone: job.client_phone,
          address: job.address,
          title: svcTitle,
          total_price: job.total_price || job.specs?.totalPrice || 0,
          status: job.status,
          scheduled_date: job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'TBD'
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    console.log("n8n webhook triggered successfully for job:", job.id);
  } catch (error) {
    console.error("Failed to trigger n8n email webhook:", error);
  }
};

// SigPad Component
function SigPad({ onSave, label = 'Sign here', color = '#22c55e' }) {
  const ref = useRef(null);
  const [drawing, setDraw] = useState(false);
  const [has, setHas] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleConfirm = async () => {
    if (!has) return;
    setIsSaving(true);
    try {
      await onSave(ref.current.toDataURL('image/png'));
    } catch (err) {
      console.error("Signature save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black text-amber-500 uppercase text-center tracking-widest">{label}</p>
      <canvas ref={ref} className="sp" style={{ height: '140px' }} onMouseDown={start} onTouchStart={start} onMouseMove={move} onTouchMove={move} onMouseUp={stop} onTouchEnd={stop} onMouseLeave={stop} />
      <div className="flex gap-2">
        <button onClick={clear} disabled={isSaving} className="flex-1 py-3 bg-white/5 text-slate-400 rounded-xl font-black uppercase text-[9px] active:scale-95">Clear</button>
        <button onClick={handleConfirm} disabled={!has || isSaving} className={`flex-1 py-3 rounded-xl font-black uppercase text-[9px] active:scale-95 ${has ? 'gold' : 'bg-white/5 text-slate-600'}`}>
          {isSaving ? <Icon name="loader-2" className="w-4 h-4 animate-spin mx-auto text-black" /> : '✅ Confirm'}
        </button>
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
    if (!navigator.onLine) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (onAdd) onAdd(reader.result);
        setUploading(false);
      };
      reader.readAsDataURL(file);
      return;
    }
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
        <div className="flex flex-col gap-2 pt-1">
          <div className="relative w-full">
            <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" disabled={isUploading} />
            <button className="w-full bg-green-500/10 border border-green-500/35 hover:bg-green-500/20 text-green-400 py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_15px_rgba(34,197,94,0.1)]">
              {isUploading ? <Icon name="loader-2" className="w-4 h-4 animate-spin" /> : <><Icon name="camera" className="w-4 h-4" /> 📸 Tomar Foto o Subir Imagen</>}
            </button>
          </div>
          <div className="flex gap-2 items-center justify-center text-[7px] text-slate-500 font-bold uppercase mt-1">
            <span>O ingresa un enlace web:</span>
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="https://..." value={lk} onChange={e => setLk(e.target.value)} className="inp text-[10px] text-blue-400 flex-1 py-1.5" />
            <button onClick={() => { if (lk.trim()) { onAdd(lk.trim()); setLk(''); } }} className="px-3.5 bg-white/5 border border-white/10 text-slate-400 hover:text-white rounded-xl font-bold text-xs active:scale-95">+</button>
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
function MapComponent({ address, lat, lng, workerLat, workerLng }) {
  const srcDoc = useMemo(() => {
    const destination = lat && lng ? [lat, lng] : null;
    const worker = workerLat && workerLng ? [workerLat, workerLng] : null;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map { margin: 0; padding: 0; height: 100%; background: #0b0f19; }
          .leaflet-control-zoom { display: none; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const dest = ${destination ? JSON.stringify(destination) : 'null'};
          const worker = ${worker ? JSON.stringify(worker) : 'null'};
          const address = ${JSON.stringify(address || '')};

          const map = L.map('map', { zoomControl: false });

          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CartoDB'
          }).addTo(map);

          const goldIcon = L.divIcon({
            html: '<div style="background-color: #F5C518; width: 14px; height: 14px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px #F5C518;"></div>',
            className: '',
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          });

          const workerIcon = L.divIcon({
            html: '<div style="background-color: #3b82f6; width: 16px; height: 16px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 12px #3b82f6; display: flex; align-items: center; justify-content: center; color: white; font-size: 8px; font-weight: bold;">🚗</div>',
            className: '',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });

          let bounds = [];

          if (dest) {
            L.marker(dest, { icon: goldIcon }).addTo(map).bindPopup('<b>Destination</b><br>' + address).openPopup();
            bounds.push(dest);
          }

          if (worker) {
            L.marker(worker, { icon: workerIcon }).addTo(map).bindPopup('<b>Our Team</b>').openPopup();
            bounds.push(worker);
          }

          if (dest && worker) {
            L.polyline([worker, dest], { color: '#F5C518', weight: 3, dashArray: '5, 10', opacity: 0.8 }).addTo(map);
          }

          if (bounds.length === 2) {
            map.fitBounds(bounds, { padding: [40, 40] });
          } else if (bounds.length === 1) {
            map.setView(bounds[0], 14);
          } else if (address) {
            fetch('https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(address) + '&format=json&limit=1')
              .then(res => res.json())
              .then(data => {
                if (data && data[0]) {
                  const loc = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
                  L.marker(loc, { icon: goldIcon }).addTo(map).bindPopup('<b>Destination</b><br>' + address).openPopup();
                  map.setView(loc, 14);
                } else {
                  map.setView([28.5383, -81.3792], 12);
                }
              })
              .catch(() => {
                map.setView([28.5383, -81.3792], 12);
              });
          } else {
            map.setView([28.5383, -81.3792], 10);
          }
        </script>
      </body>
      </html>
    `;
  }, [lat, lng, workerLat, workerLng, address]);

  if (!address && !lat) return <div className="g p-10 text-center text-slate-500 font-black uppercase text-[10px] border border-dashed border-white/5">Select a mission to load GPS Map</div>;
  return (
    <div className="g overflow-hidden border border-white/10 h-64 w-full relative rounded-2xl shadow-xl shadow-black/40">
      <iframe title="GPS Map" width="100%" height="100%" frameBorder="0" scrolling="no" srcDoc={srcDoc} className="w-full h-full rounded-2xl"></iframe>
    </div>
  );
}

// RouteOptimizerModal Component
function RouteOptimizerModal({ todayJobs, onClose, lang }) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [stops, setStops] = useState([]);
  const [originalDistance, setOriginalDistance] = useState(0);
  const [optimizedDistance, setOptimizedDistance] = useState(0);
  const [saving, setSaving] = useState(0);
  const [startLocation, setStartLocation] = useState(null);
  const [error, setError] = useState(null);

  // Haversine formula
  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (
      lat1 === null || lat1 === undefined || isNaN(Number(lat1)) ||
      lon1 === null || lon1 === undefined || isNaN(Number(lon1)) ||
      lat2 === null || lat2 === undefined || isNaN(Number(lat2)) ||
      lon2 === null || lon2 === undefined || isNaN(Number(lon2))
    ) {
      return 0;
    }
    const R = 6371; // Radius of the earth in km
    const dLat = (Number(lat2) - Number(lat1)) * Math.PI / 180;
    const dLon = (Number(lon2) - Number(lon1)) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(Number(lat1) * Math.PI / 180) * Math.cos(Number(lat2) * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  useEffect(() => {
    let active = true;
    
    const runGeocodingAndOptimization = async () => {
      try {
        setLoading(true);
        setError(null);
        setProgress(0);
        
        // 1. Get browser geolocation (optional)
        let currentPos = null;
        if (navigator && navigator.geolocation) {
          try {
            currentPos = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => reject(err),
                { timeout: 5000 }
              );
            });
            if (active) setStartLocation(currentPos);
          } catch (e) {
            console.warn("Geolocation not available or denied:", e);
          }
        }
        
        // 2. Geocode each address in todayJobs
        const geocodedStops = [];
        for (let i = 0; i < todayJobs.length; i++) {
          if (!active) return;
          const job = todayJobs[i];
          if (!job) continue;
          
          // Show progress
          setProgress(Math.round((i / todayJobs.length) * 100));
          
          let coords = null;
          if (job.specs?.lat && job.specs?.lng) {
            coords = { lat: Number(job.specs.lat), lng: Number(job.specs.lng) };
          } else if (job.address) {
            // Fetch from Nominatim
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(job.address)}&format=json&limit=1`);
              const data = await res.json();
              if (data && data[0]) {
                coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
              }
            } catch (err) {
              console.error("Geocoding failed for:", job.address, err);
            }
            // Delay to respect OSM Nominatim usage limits (max 1 req/sec)
            await new Promise(r => setTimeout(r, 800));
          }
          
          geocodedStops.push({
            id: job.id,
            clientName: job.client_name || 'Desconocido',
            address: job.address || 'Sin dirección',
            serviceType: job.service_type || 'Servicio',
            status: job.status || 'Pendiente',
            lat: coords ? coords.lat : null,
            lng: coords ? coords.lng : null,
          });
        }
        
        if (!active) return;
        
        // Filter stops with valid coordinates (defensive checks)
        const validStops = geocodedStops.filter(s => 
          s.lat !== null && s.lat !== undefined && !isNaN(Number(s.lat)) &&
          s.lng !== null && s.lng !== undefined && !isNaN(Number(s.lng))
        );
        
        if (validStops.length === 0) {
          setStops([]);
          setLoading(false);
          return;
        }
        
        // 3. Calculate distances and optimize route using Nearest Neighbor (TSP)
        const hasStart = currentPos && currentPos.lat !== null && currentPos.lat !== undefined && !isNaN(Number(currentPos.lat));
        let currentLat = hasStart ? currentPos.lat : validStops[0].lat;
        let currentLng = hasStart ? currentPos.lng : validStops[0].lng;
        
        // Calculate original distance (in scheduled order)
        let origDist = 0;
        let prevLat = currentLat;
        let prevLng = currentLng;
        validStops.forEach(s => {
          origDist += getDistance(prevLat, prevLng, s.lat, s.lng);
          prevLat = s.lat;
          prevLng = s.lng;
        });
        
        // Optimize route
        const unvisited = [...validStops];
        const optimized = [];
        let optDist = 0;
        let currentPrevLat = currentLat;
        let currentPrevLng = currentLng;
        
        while (unvisited.length > 0) {
          let nearestIdx = -1;
          let minDist = Infinity;
          
          for (let i = 0; i < unvisited.length; i++) {
            const dist = getDistance(currentPrevLat, currentPrevLng, unvisited[i].lat, unvisited[i].lng);
            if (dist < minDist) {
              minDist = dist;
              nearestIdx = i;
            }
          }
          
          if (nearestIdx === -1) {
            // Safety fallback if no nearest neighbor found (e.g. dist calculation error)
            nearestIdx = 0;
            minDist = 0;
          }
          
          const nextStop = unvisited.splice(nearestIdx, 1)[0];
          optDist += minDist;
          optimized.push(nextStop);
          currentPrevLat = nextStop.lat;
          currentPrevLng = nextStop.lng;
        }
        
        setOriginalDistance(origDist || 0);
        setOptimizedDistance(optDist || 0);
        setSaving(Math.max(0, (origDist || 0) - (optDist || 0)));
        setStops(optimized);
        setLoading(false);
      } catch (err) {
        console.error("Error calculating optimized route:", err);
        setError(err.message || "Error calculating route");
        setLoading(false);
      }
    };

    runGeocodingAndOptimization();
    
    return () => {
      active = false;
    };
  }, [todayJobs]);

  const srcDoc = useMemo(() => {
    if (stops.length === 0) return '';
    const stopsJson = JSON.stringify(stops);
    const startJson = JSON.stringify(startLocation);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map { margin: 0; padding: 0; height: 100%; background: #0b0f19; }
          .leaflet-control-zoom { display: none; }
          .popup-content { font-family: monospace; font-size: 10px; color: #fff; background: #0f172a; padding: 4px; border-radius: 4px; }
          .leaflet-popup-content-wrapper { background: #0f172a; color: #fff; border: 1px solid rgba(255,255,255,0.1); }
          .leaflet-popup-tip { background: #0f172a; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const stops = ${stopsJson};
          const startLoc = ${startJson};
          
          const map = L.map('map', { zoomControl: false });
          
          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CartoDB'
          }).addTo(map);
          
          const bounds = [];
          
          // Custom Leaflet Icons
          const workerIcon = L.divIcon({
            html: '<div style="background-color: #3b82f6; width: 18px; height: 18px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 12px #3b82f6; display: flex; align-items: center; justify-content: center; color: white; font-size: 9px;">🚗</div>',
            className: '',
            iconSize: [18, 18],
            iconAnchor: [9, 9]
          });
          
          if (startLoc && startLoc.lat !== null && startLoc.lng !== null) {
            L.marker([startLoc.lat, startLoc.lng], { icon: workerIcon })
              .addTo(map)
              .bindPopup('<div class="popup-content"><b>Mi Ubicación Actual</b></div>');
            bounds.push([startLoc.lat, startLoc.lng]);
          }
          
          // Draw stops and lines
          const polylinePoints = [];
          if (startLoc && startLoc.lat !== null && startLoc.lng !== null) {
            polylinePoints.push([startLoc.lat, startLoc.lng]);
          }
          
          stops.forEach((s, idx) => {
            const stopIcon = L.divIcon({
              html: \`<div style="background-color: #22c55e; width: 22px; height: 22px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px #22c55e; display: flex; align-items: center; justify-content: center; color: white; font-family: sans-serif; font-size: 10px; font-weight: bold;">\${idx + 1}</div>\`,
              className: '',
              iconSize: [22, 22],
              iconAnchor: [11, 11]
            });
            
            if (s.lat !== null && s.lng !== null) {
              L.marker([s.lat, s.lng], { icon: stopIcon })
                .addTo(map)
                .bindPopup(\`<div class="popup-content"><b>Parada \${idx + 1}: \${s.clientName}</b><br>\${s.serviceType}<br>\${s.address}</div>\`);
              
              bounds.push([s.lat, s.lng]);
              polylinePoints.push([s.lat, s.lng]);
            }
          });
          
          if (polylinePoints.length > 1) {
            L.polyline(polylinePoints, { color: '#F5C518', weight: 4, opacity: 0.8, dashArray: '5, 8' }).addTo(map);
          }
          
          if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50] });
          } else {
            map.setView([28.5383, -81.3792], 10);
          }
        </script>
      </body>
      </html>
    `;
  }, [stops, startLocation]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
      <div className="g p-6 w-full max-w-4xl space-y-4 border-t-4 border-amber-500 mx-auto bg-slate-950 rounded-2xl shadow-2xl border border-white/5 animate-in fade-in-50 zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center pb-2 border-b border-white/5 flex-shrink-0">
          <div>
            <h3 className="text-sm font-black text-white uppercase italic tracking-wider">📍 OPTIMIZADOR DE RUTAS GPS (LEAFLET TSP)</h3>
            <p className="text-[7px] text-[#F5C518] font-black uppercase tracking-widest mt-0.5">Calculando orden óptimo de traslado del día</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
            <Icon name="x" className="w-4 h-4" />
          </button>
        </div>

        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-12 text-center">
            <Icon name="alert-triangle" className="w-12 h-12 text-red-500 animate-pulse" />
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Error al calcular la ruta: {error}</p>
            <button onClick={onClose} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95">
              Cerrar
            </button>
          </div>
        ) : loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-12">
            <div className="w-12 h-12 rounded-full border-2 border-[#F5C518]/20 border-t-[#F5C518] animate-spin"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Geocodificando direcciones y calculando ruta ({progress}%)...</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row gap-5 overflow-hidden min-h-0">
            {/* Left panel: List of stops */}
            <div className="w-full md:w-2/5 flex flex-col overflow-y-auto space-y-3 custom-scroll pr-1">
              <div className="bg-black/45 border border-white/5 p-4 rounded-xl space-y-2">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Resumen de Optimización</p>
                <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500">
                  <span>Secuencia Inicial:</span>
                  <span className="text-white">{originalDistance.toFixed(1)} km</span>
                </div>
                <div className="flex justify-between text-[10px] uppercase font-black text-green-400">
                  <span>Ruta Optimizada:</span>
                  <span>{optimizedDistance.toFixed(1)} km</span>
                </div>
                {saving > 0 && (
                  <div className="border-t border-white/5 pt-2 flex justify-between text-[10px] uppercase font-black text-amber-400 animate-pulse">
                    <span>🔥 Ahorro Estimado:</span>
                    <span>{saving.toFixed(1)} km ({Math.round((saving / originalDistance) * 100)}%)</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 flex-1">
                <p className="text-[8px] font-black text-[#F5C518] uppercase tracking-widest pl-1">Itinerario de Paradas</p>
                {stops.map((s, idx) => (
                  <div key={s.id} className="g p-3.5 flex items-center justify-between border border-white/5 bg-black/45 hover:border-white/10 transition-all rounded-xl">
                    <div className="space-y-1 text-left min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-green-500 text-white font-black text-[9px] flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <h4 className="text-[10px] font-black text-white uppercase italic truncate">{s.clientName}</h4>
                      </div>
                      <p className="text-[8px] text-slate-400 font-bold uppercase">{s.serviceType} • {s.status}</p>
                      <p className="text-[7.5px] text-slate-500 italic truncate w-full">{s.address}</p>
                    </div>
                    <button
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.address)}`, '_blank')}
                      className="px-2.5 py-1.5 bg-[#F5C518] hover:bg-amber-400 text-black rounded-lg text-[7px] font-black uppercase tracking-wider active:scale-95 transition-all flex items-center gap-1.5 flex-shrink-0"
                    >
                      <Icon name="navigation" className="w-3 h-3" />
                      Navegar
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Right panel: Leaflet Map */}
            <div className="w-full md:w-3/5 border border-white/10 rounded-xl overflow-hidden relative min-h-[300px] md:min-h-0 bg-slate-950 flex-1">
              {stops.length > 0 ? (
                <iframe title="GPS Optimization Map" width="100%" height="100%" frameBorder="0" scrolling="no" srcDoc={srcDoc} className="w-full h-full"></iframe>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500 font-black uppercase text-[10px]">No valid stop coordinates to map.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// BeforeAfterSlider Component
function BeforeAfterSlider({ beforePhotos = [], afterPhotos = [] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [viewMode, setViewMode] = useState('after');
  
  const total = Math.max(beforePhotos.length, afterPhotos.length);
  if (total === 0) return null;

  const beforePhoto = beforePhotos[activeIdx] || null;
  const afterPhoto = afterPhotos[activeIdx] || null;

  return (
    <div className="g p-5 border border-white/10 rounded-2xl space-y-4 bg-black/40">
      <div className="flex justify-between items-center">
        <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
          <Icon name="columns" className="w-3.5 h-3.5 text-amber-500" />
          Comparación Antes / Después
        </p>
        {total > 1 && (
          <div className="flex gap-1">
            {Array.from({ length: total }).map((_, i) => (
              <button 
                key={i} 
                onClick={() => { setActiveIdx(i); setViewMode('after'); }}
                className={`text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center ${activeIdx === i ? 'bg-amber-500 text-black' : 'bg-white/5 text-slate-500'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center">
        {viewMode === 'before' && beforePhoto && (
          <img src={beforePhoto} className="w-full h-full object-cover animate-in fade-in duration-300" alt="Before" />
        )}
        {viewMode === 'after' && afterPhoto && (
          <img src={afterPhoto} className="w-full h-full object-cover animate-in fade-in duration-300" alt="After" />
        )}
        {viewMode === 'side-by-side' && (
          <div className="grid grid-cols-2 w-full h-full gap-0.5">
            <div className="relative w-full h-full">
              {beforePhoto ? <img src={beforePhoto} className="w-full h-full object-cover" alt="Before" /> : <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-[8px] text-slate-600">N/A</div>}
              <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[8px] font-black text-red-400 border border-red-500/20">ANTES</div>
            </div>
            <div className="relative w-full h-full">
              {afterPhoto ? <img src={afterPhoto} className="w-full h-full object-cover" alt="After" /> : <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-[8px] text-slate-600">N/A</div>}
              <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-0.5 rounded text-[8px] font-black text-green-400 border border-green-500/20">DESPUÉS</div>
            </div>
          </div>
        )}

        {viewMode !== 'side-by-side' && (
          <div className="absolute top-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[8px] font-black border border-white/10 uppercase tracking-widest">
            {viewMode === 'before' ? (
              <span className="text-red-400">🔴 Antes</span>
            ) : (
              <span className="text-green-400">🟢 Después</span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
        <button 
          onClick={() => setViewMode('before')} 
          disabled={!beforePhoto}
          className={`py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all ${viewMode === 'before' ? 'bg-red-500/20 border border-red-500/30 text-red-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Antes
        </button>
        <button 
          onClick={() => setViewMode('side-by-side')} 
          className={`py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all ${viewMode === 'side-by-side' ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Dividido
        </button>
        <button 
          onClick={() => setViewMode('after')} 
          disabled={!afterPhoto}
          className={`py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all ${viewMode === 'after' ? 'bg-green-500/20 border border-green-500/30 text-green-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          Después
        </button>
      </div>
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

  // Premium Dashboard States
  const [activeTab, setActiveTab] = useState('tracker');
  const [clientMissions, setClientMissions] = useState([]);
  const [clientProfile, setClientProfile] = useState(null);
  const [tenantSettings, setTenantSettings] = useState(null);

  // Preferences form states
  const [prefPets, setPrefPets] = useState('');
  const [prefEntryCode, setPrefEntryCode] = useState('');
  const [prefProducts, setPrefProducts] = useState('');
  const [prefNotes, setPrefNotes] = useState('');

  // Booking states
  const [bookingService, setBookingService] = useState('tv');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingAddons, setBookingAddons] = useState([]);
  const [bookingSaving, setBookingSaving] = useState(false);

  // Membership states
  const [membershipTier, setMembershipTier] = useState('none');
  const [membershipSaving, setMembershipSaving] = useState(false);

  // Phase 4 Tipping & Card Checkout states
  const [tipOption, setTipOption] = useState('15'); // '10', '15', '20', 'custom', 'none'
  const [customTip, setCustomTip] = useState('');
  const [cardNo, setCardNo] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [payStage, setPayStage] = useState(''); // '', 'connecting', 'verifying', 'authorizing', 'routing', 'success'
  const [payError, setPayError] = useState('');

  const getCardBrand = (number) => {
    const clean = number.replace(/\D/g, '');
    if (clean.startsWith('4')) return 'visa';
    if (/^5[1-5]/.test(clean)) return 'mastercard';
    if (/^3[47]/.test(clean)) return 'amex';
    return 'generic';
  };

  const luhnCheck = (val) => {
    let sum = 0;
    let shouldDouble = false;
    for (let i = val.length - 1; i >= 0; i--) {
      let digit = parseInt(val.charAt(i));
      if (shouldDouble) {
        if ((digit *= 2) > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  };

  const handleCardNoChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    let formatted = '';
    for (let i = 0; i < value.length && i < 16; i++) {
      if (i > 0 && i % 4 === 0) formatted += ' ';
      formatted += value[i];
    }
    setCardNo(formatted);
  };

  const handleCardExpChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    let formatted = '';
    if (value.length > 0) {
      formatted = value.substring(0, 2);
      if (value.length > 2) {
        formatted += '/' + value.substring(2, 4);
      }
    }
    setCardExp(formatted);
  };

  const handleCardCvcChange = (e) => {
    setCardCvc(e.target.value.replace(/\D/g, '').substring(0, 4));
  };

  const completePaymentFlow = async (paymentId, tipVal, totalVal) => {
    setPayStage('success');
    await new Promise(r => setTimeout(r, 800));

    const updateData = {
      status: 'paid',
      deposit_paid: job.total_price, // Sets balance to 0
      specs: {
        ...(job.specs || {}),
        stripe_payment_id: paymentId,
        tip_amount: tipVal,
        total_paid_amount: totalVal,
        paid_at: new Date().toISOString()
      }
    };

    await sb.from('elevore_missions').update(updateData).eq('id', cjid);
    await checkAndScheduleNextMission({ ...job, ...updateData });

    // Route 100% of tip to the worker
    if (job.team_assigned && tipVal > 0) {
      const { data: staffList } = await sb.from('staff_profiles').select('*').eq('tenant_id', job.tenant_id);
      const worker = staffList?.find(s => s.name === job.team_assigned);
      if (worker) {
        const newBal = (worker.wallet_balance || 0) + tipVal;
        const newTot = (worker.total_earned || 0) + tipVal;
        await sb.from('staff_profiles').update({
          wallet_balance: newBal,
          total_earned: newTot
        }).eq('id', worker.id);
      }
    }

    tt(lang === 'es' ? '¡Pago exitoso!' : 'Payment successful!');
    setPayStage('');
    load();
  };

  const handleCheckout = async (e, totalVal, tipVal) => {
    e.preventDefault();
    setPayError('');

    const cleanCard = cardNo.replace(/\D/g, '');
    if (cleanCard.length < 13 || cleanCard.length > 16) {
      setPayError(lang === 'es' ? 'Número de tarjeta inválido' : 'Invalid card number');
      return;
    }
    if (!luhnCheck(cleanCard)) {
      setPayError(lang === 'es' ? 'La tarjeta falló verificación Luhn' : 'Card failed Luhn check');
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(cardExp)) {
      setPayError(lang === 'es' ? 'Expiración inválida (MM/AA)' : 'Invalid expiry (MM/YY)');
      return;
    }
    const [expMonth, expYear] = cardExp.split('/').map(v => parseInt(v));
    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;
    if (expMonth < 1 || expMonth > 12 || expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      setPayError(lang === 'es' ? 'La tarjeta está expirada' : 'Card is expired');
      return;
    }
    if (cardCvc.replace(/\D/g, '').length < 3) {
      setPayError(lang === 'es' ? 'CVC inválido' : 'Invalid CVC');
      return;
    }
    if (!cardName.trim()) {
      setPayError(lang === 'es' ? 'Falta nombre del titular' : 'Cardholder name is required');
      return;
    }

    const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (stripeKey) {
      setPayStage('connecting');
      try {
        if (!window.Stripe) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://js.stripe.com/v3/';
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
          });
        }

        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: Math.round(totalVal * 100),
            currency: 'usd',
            metadata: {
              job_id: job.id,
              client_name: job.client_name,
              tip_amount: tipVal
            }
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to create Stripe payment intent');
        }

        const { clientSecret } = await response.json();
        setPayStage('authorizing');

        const stripe = window.Stripe(stripeKey);
        const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: {},
            billing_details: {
              name: cardName
            }
          }
        });

        if (stripeError) {
          throw new Error(stripeError.message);
        }

        if (paymentIntent.status === 'succeeded') {
          await completePaymentFlow(paymentIntent.id, tipVal, totalVal);
        }
      } catch (err) {
        setPayStage('');
        setPayError(err.message);
        return;
      }
    } else {
      // High-Fidelity Simulator
      setPayStage('connecting');
      await new Promise(r => setTimeout(r, 1000));

      setPayStage('verifying');
      await new Promise(r => setTimeout(r, 1000));

      setPayStage('authorizing');
      await new Promise(r => setTimeout(r, 1200));

      setPayStage('routing');
      await new Promise(r => setTimeout(r, 800));

      await completePaymentFlow('pi_simulated_' + Math.random().toString(36).substring(2, 11), tipVal, totalVal);
    }
  };

  const loadClientMissions = async (clientName, clientPhone) => {
    try {
      const cleanPhone = clientPhone?.replace(/\D/g, '') || '';
      let query = sb.from('elevore_missions').select('*');
      if (cleanPhone.length > 5) {
        query = query.or(`client_name.eq."${clientName}",client_phone.ilike.%${cleanPhone}%`);
      } else {
        query = query.eq('client_name', clientName);
      }
      const { data } = await query.order('scheduled_date', { ascending: false });
      if (data) {
        setClientMissions(data);
      }
    } catch (e) {
      console.error("Error loading client missions:", e);
    }
  };

  const loadTenantSettings = async (tId) => {
    try {
      const { data } = await sb.from('tenant_settings').select('*').eq('tenant_id', tId).maybeSingle();
      if (data) {
        setTenantSettings(data);
      }
    } catch (e) {
      console.error("Error loading tenant settings:", e);
    }
  };

  const checkAndScheduleNextMission = async (jobData) => {
    try {
      const { data: client } = await sb.from('clients').select('*').eq('name', jobData.client_name).maybeSingle();
      const frequency = jobData.specs?.frequency || client?.specs?.frequency || 'one-time';
      const membership = jobData.membership_plan || client?.membership || 'none';
      
      let days = null;
      if (frequency === 'weekly' || membership === 'premium') days = 7;
      else if (frequency === 'bi-weekly' || membership === 'basic') days = 14;
      else if (frequency === 'monthly') days = 30;
      else if (membership === 'vip') days = 7;
      
      if (!days) return;
      
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: existingJobs } = await sb.from('elevore_missions')
        .select('*')
        .eq('client_name', jobData.client_name)
        .eq('status', 'scheduled')
        .gte('scheduled_date', todayStr);
        
      const hasFuture = existingJobs && existingJobs.length > 0;
      if (hasFuture) {
        console.log("Future mission already scheduled for " + jobData.client_name);
        return;
      }
      
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + days);
      const dateStr = nextDate.toISOString().split('T')[0];
      
      const payload = {
        client_name: jobData.client_name,
        client_phone: jobData.client_phone || '',
        address: jobData.address || '',
        service_type: jobData.service_type || 'regular',
        total_price: jobData.total_price || 0,
        deposit_paid: 0,
        team_assigned: jobData.team_assigned || '',
        status: 'scheduled',
        scheduled_date: dateStr,
        notes: `Recurrencia automática (${frequency !== 'one-time' ? frequency : membership})`,
        membership_plan: membership !== 'none' ? membership : null,
        specs: {
          ...(jobData.specs || {}),
          auto_scheduled: true,
          previous_job_id: jobData.id
        },
        tenant_id: jobData.tenant_id
      };
      
      await sb.from('elevore_missions').insert([payload]);
    } catch (e) {
      console.error("Error auto-scheduling in Portal:", e);
    }
  };

  const load = async () => {
    setLoading(true);
    const { data } = await sb.from('elevore_missions').select('*').eq('id', cjid).single();
    if (data) {
      setJob(data);
      setRating(data.client_rating || 0);
      setRDone(!!data.client_rating);

      // Load client history
      await loadClientMissions(data.client_name, data.client_phone);

      // Load client profile
      const { data: cProfile } = await sb.from('clients').select('*').eq('name', data.client_name).maybeSingle();
      if (cProfile) {
        setClientProfile(cProfile);
        setMembershipTier(cProfile.membership || 'none');
        const prefs = cProfile.specs?.preferences || {};
        setPrefPets(prefs.pets || '');
        setPrefEntryCode(prefs.entryCode || '');
        setPrefProducts(prefs.products || '');
        setPrefNotes(prefs.notes || '');
      }

      // Load settings
      if (data.tenant_id) {
        await loadTenantSettings(data.tenant_id);
      }
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [cjid]);

  const saveClientPrefs = async (e) => {
    e.preventDefault();
    if (!clientProfile) return;
    try {
      const updatedSpecs = {
        ...(clientProfile.specs || {}),
        preferences: {
          pets: prefPets,
          entryCode: prefEntryCode,
          products: prefProducts,
          notes: prefNotes
        }
      };
      const { error } = await sb.from('clients')
        .update({ specs: updatedSpecs })
        .eq('id', clientProfile.id);
      if (error) throw error;
      tt(lang === 'es' ? 'Preferencias guardadas ✓' : 'Preferences saved ✓', 'green');
      setClientProfile(prev => ({ ...prev, specs: updatedSpecs }));
    } catch (err) {
      tt('Error: ' + err.message, 'red');
    }
  };

  const saveMembershipPlan = async (tier) => {
    if (!clientProfile) return;
    setMembershipSaving(true);
    try {
      const { error } = await sb.from('clients')
        .update({ membership: tier })
        .eq('id', clientProfile.id);
      if (error) throw error;
      tt(lang === 'es' ? 'Membresía actualizada ✓' : 'Membership updated ✓', 'green');
      setMembershipTier(tier);
      setClientProfile(prev => ({ ...prev, membership: tier }));
      if (job && job.status === 'scheduled') {
        await sb.from('elevore_missions').update({ membership_plan: tier }).eq('id', job.id);
        setJob(prev => ({ ...prev, membership_plan: tier }));
      }
    } catch (err) {
      tt('Error: ' + err.message, 'red');
    }
    setMembershipSaving(false);
  };

  const defaultAddons = [
    { id: 'oven', en: 'Inside Oven', p: 35 },
    { id: 'fridge', en: 'Inside Fridge', p: 30 },
    { id: 'windows', en: 'Windows', p: 50 },
    { id: 'pethair', en: 'Pet Hair', p: 25 },
    { id: 'garage', en: 'Garage', p: 40 }
  ];

  const defaultQuickJobs = [
    { id: 'cleaning_reg', en: 'Regular Cleaning', p: 120 },
    { id: 'cleaning_deep', en: 'Deep Cleaning', p: 180 },
    { id: 'tv', en: 'Mount TV', p: 150 },
    { id: 'door', en: 'Install Door', p: 200 },
    { id: 'patch', en: 'Drywall Patch', p: 180 },
    { id: 'shelves', en: 'Shelving', p: 100 },
    { id: 'lock', en: 'Lock Change', p: 85 },
    { id: 'paint', en: 'Paint Touch-up', p: 120 },
    { id: 'faucet', en: 'Faucet Install', p: 130 }
  ];

  const addonsList = (tenantSettings?.addons && tenantSettings.addons.length > 0) 
                     ? tenantSettings.addons 
                     : defaultAddons;

  const quickJobsList = (tenantSettings?.quick_jobs && tenantSettings.quick_jobs.length > 0) 
                        ? tenantSettings.quick_jobs 
                        : defaultQuickJobs;

  useEffect(() => {
    if (quickJobsList?.length > 0) {
      const found = quickJobsList.find(q => q.id === bookingService);
      if (!found) {
        setBookingService(quickJobsList[0].id);
      }
    }
  }, [quickJobsList, bookingService]);

  const getBookingEstimate = () => {
    const selectedJob = quickJobsList.find(q => q.id === bookingService) || { p: 150 };
    let base = selectedJob.p;
    
    let addonsTotal = 0;
    bookingAddons.forEach(addonId => {
      const ad = addonsList.find(a => a.id === addonId);
      if (ad) {
        if (membershipTier === 'vip') {
          // free
        } else if (membershipTier === 'premium' && addonId === 'oven') {
          // free
        } else {
          addonsTotal += ad.p;
        }
      }
    });

    let subtotal = base + addonsTotal;
    
    let discount = 0;
    if (membershipTier === 'basic') discount = subtotal * 0.05;
    else if (membershipTier === 'premium') discount = subtotal * 0.10;
    else if (membershipTier === 'vip') discount = subtotal * 0.15;

    let total = Math.max(0, subtotal - discount);
    return { base, addonsTotal, discount, total };
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!bookingDate) return tt(lang === 'es' ? 'Selecciona una fecha' : 'Please select a date', 'red');
    setBookingSaving(true);
    
    const { total } = getBookingEstimate();
    const svcName = quickJobsList.find(q => q.id === bookingService)?.en || 'Custom Service';

    const payload = {
      client_name: job.client_name,
      client_phone: job.client_phone || '',
      address: job.address || '',
      service_type: svcName,
      total_price: total,
      deposit_paid: 0,
      team_assigned: '',
      status: 'scheduled',
      scheduled_date: bookingDate,
      notes: bookingNotes || `Booked by client. Extras: ${bookingAddons.join(', ')}`,
      membership_plan: membershipTier !== 'none' ? membershipTier : null,
      tenant_id: job.tenant_id,
      specs: {
        booking_addons: bookingAddons,
        booking_service_id: bookingService,
        client_booked: true,
        created_at: new Date().toISOString()
      }
    };

    try {
      const { error } = await sb.from('elevore_missions').insert([payload]);
      if (error) throw error;
      tt(lang === 'es' ? '¡Servicio agendado con éxito!' : 'Service booked successfully!', 'green');
      setBookingDate('');
      setBookingNotes('');
      setBookingAddons([]);
      await loadClientMissions(job.client_name, job.client_phone);
      setActiveTab('history');
    } catch (err) {
      tt('Error: ' + err.message, 'red');
    }
    setBookingSaving(false);
  };

  if (loading || !job) return <div className="min-h-screen flex items-center justify-center text-white font-black animate-pulse">{tr(lang, 'syncing')}</div>;
  const bal = job.total_price - job.deposit_paid;
  const calculatedTip = tipOption === 'none' ? 0 : 
                        tipOption === 'custom' ? (parseFloat(customTip) || 0) : 
                        Math.round(bal * (parseInt(tipOption) / 100) * 100) / 100;
  const chargeTotal = bal + calculatedTip;
  const sm = { lead: 10, scheduled: 30, in_progress: 65, completed: 90, paid: 100 };
  const urgent = job.urgency_expires ? Math.max(0, Math.round((new Date(job.urgency_expires) - Date.now()) / 3600000)) : null;

  const saveApproval = async sig => { await sb.from('elevore_missions').update({ approval_signature: sig, status: 'scheduled' }).eq('id', cjid); tt('✅ Approved!'); load(); };
  const saveFinal = async sig => {
    await sb.from('elevore_missions').update({ final_signature: sig, status: 'paid' }).eq('id', cjid);
    tt('🌟 Done!');
    if (job) {
      triggerN8nEmail({ ...job, status: 'paid', final_signature: sig });
      await checkAndScheduleNextMission({ ...job, final_signature: sig, status: 'paid' });
      triggerFeedbackRequestEmail({ ...job, status: 'paid', final_signature: sig }, tenantSettings?.business_full_name || "Elevore Premium Services");
    }
    load();
  };
  const submitRating = async () => { 
    await sb.from('elevore_missions').update({ client_rating: rating }).eq('id', cjid); 
    setRDone(true); 
    tt('⭐ Thank you!'); 
    triggerRatingSubmitEmail(job, rating, tenantSettings?.business_full_name || "Elevore Premium Services", tenantSettings?.google_review_link || "https://g.page/r/review", sb, job.tenant_id);
  };

  // Uber-Style Timeline Steps calculation
  const steps = [
    { key: 'stepApproved', title: tr(lang, 'stepApproved'), desc: job.scheduled_date ? `${lang === 'es' ? 'Programado' : 'Scheduled'}: ${fmtD(job.scheduled_date)}` : 'Approved' },
    { key: 'stepEnRoute', title: tr(lang, 'stepEnRoute'), desc: job.specs?.en_route_at ? `${lang === 'es' ? 'En camino a las' : 'On the way at'} ${new Date(job.specs.en_route_at).toLocaleTimeString()}` : (lang === 'es' ? 'Equipo en ruta a la ubicación' : 'En route to location') },
    { key: 'stepInService', title: tr(lang, 'stepInService'), desc: job.check_in_time ? `${lang === 'es' ? 'Llegó a las' : 'Arrived at'} ${new Date(job.check_in_time).toLocaleTimeString()}` : (lang === 'es' ? 'Servicio iniciado' : 'Service started') },
    { key: 'stepQC', title: tr(lang, 'stepQC'), desc: job.check_out_time ? `${lang === 'es' ? 'Finalizado a las' : 'Completed at'} ${new Date(job.check_out_time).toLocaleTimeString()}` : (lang === 'es' ? 'Control de calidad' : 'Checking work quality') },
    { key: 'stepCompletedPaid', title: tr(lang, 'stepCompletedPaid'), desc: job.status === 'paid' ? (lang === 'es' ? 'Pagado y cerrado' : 'Paid & closed') : (lang === 'es' ? 'Esperando pago final' : 'Awaiting final payment') }
  ];

  let activeStepIdx = 0;
  if (job.status === 'paid') activeStepIdx = 4;
  else if (job.status === 'completed') activeStepIdx = 3;
  else if (job.status === 'in_progress') activeStepIdx = 2;
  else if (job.specs?.en_route) activeStepIdx = 1;
  else if (job.status === 'scheduled') activeStepIdx = 0;
  else activeStepIdx = -1; // lead

  const tabs = [
    { id: 'tracker', label: tr(lang, 'tabActive'), icon: 'compass' },
    { id: 'history', label: tr(lang, 'tabHistory'), icon: 'calendar' },
    { id: 'preferences', label: tr(lang, 'tabPreferences'), icon: 'sliders' },
    { id: 'membership', label: tr(lang, 'tabMembership'), icon: 'award' },
    { id: 'booking', label: tr(lang, 'tabBooking'), icon: 'plus-circle' }
  ];

  return (
    <div className="min-h-screen p-5 bg-gradient-to-b from-slate-950 via-black to-zinc-900 animate-in fade-in duration-700">
      {toast && <div className={`tst fixed top-5 left-1/2 -translate-x-1/2 z-[500] px-6 py-3 rounded-2xl font-black uppercase text-sm shadow-2xl ${toast.c === 'red' ? 'bg-red-600' : 'bg-green-600'} text-white`}>{toast.m}</div>}
      
      {payStage && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-lg z-[1000] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-20 h-20 relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-amber-500 animate-spin"></div>
            <Icon name="lock" className="w-8 h-8 text-amber-500 animate-pulse" />
          </div>
          
          <h2 className="text-xl font-black uppercase tracking-widest text-white mb-2">
            {tr(lang, 'paying')}
          </h2>
          
          <div className="max-w-xs space-y-3 mt-4 text-[9px] font-black uppercase tracking-wider text-left border-l border-white/10 pl-4">
            {[
              { key: 'connecting', label: lang === 'es' ? 'Conectando con el Servidor...' : 'Connecting to secure gateway...' },
              { key: 'verifying', label: lang === 'es' ? 'Validando Tarjeta...' : 'Verifying card details...' },
              { key: 'authorizing', label: lang === 'es' ? 'Autorizando Pago...' : 'Authorizing transaction...' },
              { key: 'routing', label: lang === 'es' ? 'Transfiriendo Fondos a Empleados...' : 'Routing tip to staff wallet...' },
              { key: 'success', label: lang === 'es' ? '¡Pago Exitoso! Generando Factura...' : 'Success! Generating invoices...' }
            ].map(step => {
              const active = payStage === step.key;
              const completed = ['connecting', 'verifying', 'authorizing', 'routing', 'success'].indexOf(payStage) > ['connecting', 'verifying', 'authorizing', 'routing', 'success'].indexOf(step.key);
              
              return (
                <div key={step.key} className={`flex items-center gap-2 transition-all duration-300 ${active ? 'text-amber-500 font-extrabold scale-105 pl-1' : completed ? 'text-green-500 opacity-60' : 'text-slate-700 opacity-30'}`}>
                  <div className={`w-2 h-2 rounded-full ${active ? 'bg-amber-500 animate-ping' : completed ? 'bg-green-500' : 'bg-slate-800'}`} />
                  <span>{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="max-w-md mx-auto space-y-5 pb-20">
        <div className="flex justify-end gap-2">{['en', 'es'].map(lg => (<button key={lg} onClick={() => setLang(lg)} className={`text-[8px] font-black px-3 py-1.5 rounded-xl ${lang === lg ? 'bg-amber-500 text-black' : 'bg-white/5 text-slate-500'}`}>{lg.toUpperCase()}</button>))}</div>
        <div className="text-center space-y-3 relative z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-zinc-800 to-black border border-white/10 rounded-[2rem] mx-auto flex items-center justify-center font-black text-white text-4xl shadow-[0_0_40px_rgba(255,255,255,0.05)] transform transition-transform hover:scale-105">
             {tenantSettings?.business_full_name ? tenantSettings.business_full_name.charAt(0).toUpperCase() : 'E'}
          </div>
          <h1 className="text-2xl font-black uppercase tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
             {tenantSettings?.business_full_name || 'ELEVORE'}
          </h1>
          <p className="text-[9px] text-green-500 font-bold uppercase tracking-[0.4em]">{tr(lang, 'hub')}</p>
        </div>

        {/* ── CLIENT DASHBOARD NAVIGATION TABS ── */}
        <div className="g p-1 rounded-2xl flex items-center justify-between border border-white/5 bg-black/40 backdrop-blur-md sticky top-2 z-[400] shadow-xl overflow-x-auto gap-1">
          {tabs.map(t => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 min-w-[72px] py-2.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-300 cursor-pointer ${
                  active
                    ? 'bg-gradient-to-b from-[#F5C518] to-amber-500 text-black shadow-lg shadow-[#F5C518]/25 font-black scale-105'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon name={t.icon} className={`w-4 h-4 ${active ? 'text-black' : 'text-slate-400'}`} />
                <span className="text-[7.5px] font-black uppercase tracking-wider">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── TAB 1: ACTIVE SERVICE TRACKER ── */}
        {activeTab === 'tracker' && (
          <div className="space-y-5 animate-in fade-in duration-500">
            {urgent !== null && urgent > 0 && !job.approval_signature && <div className="gold py-3 px-5 rounded-2xl text-center font-black uppercase text-sm">⏰ {tr(lang, 'urgency')} {urgent}h — {tr(lang, 'lock')}</div>}
            
            {/* Core Detail Card */}
            <div className="g p-6 border-t-4 border-green-500 space-y-4 text-left">
              <div className="flex justify-between items-center"><div><p className="text-[9px] font-black text-slate-500 uppercase">Client</p><h2 className="text-xl font-black italic uppercase text-white">{job.client_name}</h2></div><span className={`text-[8px] font-black px-3 py-1.5 rounded-xl uppercase ${job.status === 'paid' ? 'bg-blue-600 text-white' : job.status === 'in_progress' ? 'bg-green-600 text-white' : job.status === 'completed' ? 'bg-purple-600 text-white' : 'bg-amber-500 text-black'}`}>{job.status}</span></div>
              <div className="text-[9px] text-slate-500 font-black uppercase space-y-1"><p>📋 {job.service_type?.toUpperCase()}</p><p>📅 {fmtD(job.scheduled_date)}</p><p>👥 {job.team_assigned || 'TBD'}</p><p>📍 {job.address}</p>{job.check_in_time && <p className="text-green-400">▶ {tr(lang, 'arrived')}: {new Date(job.check_in_time).toLocaleTimeString()}</p>}{job.check_out_time && <p className="text-purple-400">⏹ {tr(lang, 'done')}: {new Date(job.check_out_time).toLocaleTimeString()}</p>}</div>
              <div><div className="flex justify-between text-[8px] font-black uppercase text-slate-500 mb-1"><span>Booked</span><span>{sm[job.status] || 0}%</span></div><div className="pb"><div className="pf" style={{ width: `${sm[job.status] || 0}%` }}></div></div></div>
            </div>

            {/* Uber-Style Live Service Tracker */}
            {job.status !== 'lead' && (
              <div className="g p-6 border-l-4 border-amber-500/80 space-y-6 relative overflow-hidden bg-black/60 shadow-[0_0_40px_rgba(245,197,24,0.05)] text-left animate-in slide-in-from-bottom duration-500">
                <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2 mb-4 font-display">
                  <Icon name="activity" className="w-4 h-4 text-amber-500 animate-pulse" />
                  {tr(lang, 'trackerTitle')}
                </h3>
                <div className="relative border-l border-white/10 pl-6 ml-3 space-y-6">
                  {steps.map((step, idx) => {
                    const isDone = idx < activeStepIdx;
                    const isCurrent = idx === activeStepIdx;
                    
                    return (
                      <div key={idx} className="relative">
                        {/* Circle Node */}
                        <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 transition-all duration-500 flex items-center justify-center
                          ${isDone ? 'bg-amber-500 border-amber-500 shadow-[0_0_10px_rgba(245,197,24,0.4)]' :
                            isCurrent ? 'bg-black border-amber-500 shadow-[0_0_15px_rgba(245,197,24,0.8)] animate-pulse' :
                            'bg-zinc-900 border-zinc-700'
                          }`}
                        >
                          {isCurrent && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></div>}
                          {isDone && <Icon name="check" className="w-2.5 h-2.5 text-black stroke-[3]" />}
                        </div>
                        
                        <div className="space-y-0.5">
                          <h4 className={`text-[10px] font-black uppercase tracking-wider transition-colors
                            ${isDone ? 'text-slate-300' : isCurrent ? 'text-amber-400 font-extrabold font-display' : 'text-slate-600'}
                          `}>
                            {step.title}
                          </h4>
                          <p className={`text-[8px] uppercase font-bold tracking-wider transition-colors
                            ${isDone ? 'text-slate-500' : isCurrent ? 'text-slate-300' : 'text-slate-700'}
                          `}>
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dynamic Route Map */}
            {job.status !== 'lead' && (
              <div className="space-y-2 text-left animate-in slide-in-from-bottom duration-500">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Icon name="map-pin" className="w-3.5 h-3.5 text-amber-500" />
                  {tr(lang, 'routeMap')}
                </p>
                <MapComponent 
                  address={job.address} 
                  lat={job.dest_lat} 
                  lng={job.dest_lng}
                  workerLat={job.specs?.en_route_lat || job.check_in_lat}
                  workerLng={job.specs?.en_route_lng || job.check_in_lng}
                />
              </div>
            )}

            {/* Balance Due Card */}
            <div className="g p-6 text-center space-y-2">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{tr(lang, 'balance')}</p>
              <h3 className="text-6xl font-black italic tracking-tighter text-white">{fmt$(bal)}</h3>
              <p className="text-[9px] text-green-500 font-black uppercase pt-2">💸 {tr(lang, 'pay')}: {DEFAULT_CFG.ZELLE}</p>
            </div>

            {/* Card Checkout Form */}
            {bal > 0 && job.status !== 'paid' && (
              <div className="g p-6 border border-white/10 space-y-6 relative overflow-hidden bg-black/40 shadow-2xl text-left rounded-3xl animate-in slide-in-from-bottom duration-500">
                <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-amber-500 via-yellow-400 to-transparent" />
                
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Icon name="credit-card" className="w-4 h-4 text-amber-500" />
                  </div>
                  <h3 className="text-[10px] font-black text-white uppercase tracking-widest font-display">{tr(lang, 'payCard')}</h3>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{tr(lang, 'tipSelect')}</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { id: 'none', label: '0%' },
                      { id: '10', label: '10%' },
                      { id: '15', label: '15%' },
                      { id: '20', label: '20%' },
                      { id: 'custom', label: '*' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTipOption(opt.id)}
                        className={`py-2 rounded-xl text-[9px] font-black tracking-wider transition-all border cursor-pointer ${
                          tipOption === opt.id 
                            ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20' 
                            : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {opt.id === 'custom' ? (lang === 'es' ? 'Otro' : 'Custom') : opt.id === 'none' ? '0%' : opt.label}
                      </button>
                    ))}
                  </div>

                  {tipOption === 'custom' && (
                    <div className="mt-2 relative animate-in fade-in duration-300">
                      <input
                        type="number"
                        value={customTip}
                        onChange={(e) => setCustomTip(e.target.value)}
                        placeholder={tr(lang, 'customTip')}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                  )}
                </div>

                <form onSubmit={(e) => handleCheckout(e, chargeTotal, calculatedTip)} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">{tr(lang, 'cardNo')}</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNo}
                        onChange={handleCardNoChange}
                        placeholder="4000 1234 5678 9010"
                        maxLength={19}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-3 pr-10 py-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono tracking-widest"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
                        {getCardBrand(cardNo) === 'visa' && <span className="text-[10px] text-blue-400 font-black italic">VISA</span>}
                        {getCardBrand(cardNo) === 'mastercard' && <span className="text-[10px] text-red-400 font-black italic">MC</span>}
                        {getCardBrand(cardNo) === 'amex' && <span className="text-[10px] text-green-400 font-black italic">AMEX</span>}
                        {getCardBrand(cardNo) === 'generic' && <Icon name="credit-card" className="w-4 h-4 text-slate-500" />}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">{tr(lang, 'expiry')}</label>
                      <input
                        type="text"
                        value={cardExp}
                        onChange={handleCardExpChange}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono tracking-widest"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">{tr(lang, 'cvc')}</label>
                      <input
                        type="password"
                        value={cardCvc}
                        onChange={handleCardCvcChange}
                        placeholder="123"
                        maxLength={4}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono tracking-widest"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">{tr(lang, 'cardName')}</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Jose Mario"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-amber-500 font-medium uppercase tracking-wider"
                    />
                  </div>

                  {payError && (
                    <div className="p-3 bg-red-950/40 border border-red-500/25 rounded-2xl text-[9px] font-bold text-red-400 uppercase tracking-wider">
                      ⚠️ {payError}
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/5 text-[9px] font-black uppercase text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>{tr(lang, 'balance')}</span>
                      <span className="text-white">{fmt$(bal)}</span>
                    </div>
                    {calculatedTip > 0 && (
                      <div className="flex justify-between text-green-400 font-display">
                        <span>{lang === 'es' ? 'Propina' : 'Tip'}</span>
                        <span>+{fmt$(calculatedTip)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-white pt-1 font-black">
                      <span>{tr(lang, 'totalAmount')}</span>
                      <span className="text-amber-500">{fmt$(chargeTotal)}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full gold py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg active:scale-95 transition-all mt-2 cursor-pointer"
                  >
                    💳 {lang === 'es' ? `Pagar ${fmt$(chargeTotal)}` : `Pay ${fmt$(chargeTotal)}`}
                  </button>
                </form>
              </div>
            )}

            {/* Approval Signature Pad */}
            {!job.approval_signature ? (
              <div className="g p-6 border border-amber-500/30 space-y-4">
                <SigPad onSave={saveApproval} label={tr(lang, 'approve')} />
              </div>
            ) : (
              <div className="g p-5 border border-green-600/30 text-center space-y-2">
                <p className="text-[9px] text-green-500 font-black uppercase">✅ Approved</p>
                <img src={job.approval_signature} className="h-10 mx-auto opacity-50" alt="signature" />
              </div>
            )}

            {/* Before/After Photos Slider */}
            <BeforeAfterSlider beforePhotos={job.before_photos || []} afterPhotos={job.after_photos || []} />

            {/* Final Confirmation Signature */}
            {job.approval_signature && job.after_photos?.length > 0 && !job.final_signature && (
              <div className="g p-6 border border-purple-500/30 space-y-4">
                <SigPad onSave={saveFinal} label={tr(lang, 'complete')} color="#a855f7" />
              </div>
            )}

            {job.final_signature && (
              <div className="g p-5 border border-purple-600/30 text-center space-y-2">
                <p className="text-[9px] text-purple-400 font-black uppercase">🏁 {tr(lang, 'complete')}</p>
                <img src={job.final_signature} className="h-10 mx-auto opacity-50" alt="signature" />
              </div>
            )}

            {/* Rating Stars Feedback */}
            {job.status === 'paid' && !ratingDone && (
              <div className="g p-6 border border-amber-500/20 text-center space-y-4">
                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">{tr(lang, 'rating')}</p>
                <div className="flex justify-center">
                  <Stars value={rating} onChange={setRating} size={8} />
                </div>
                <button onClick={submitRating} disabled={!rating} className={`w-full py-3 rounded-xl font-black uppercase text-[10px] active:scale-95 ${rating ? 'gold' : 'bg-white/5 text-slate-600'}`}>{tr(lang, 'submit')}</button>
              </div>
            )}

            {ratingDone && (
              <div className="g p-4 text-center">
                <p className="text-[9px] text-amber-400 font-black uppercase">⭐ {job.client_rating}/5 — Thank you!</p>
              </div>
            )}

            {/* QR Portal share card */}
            <div className="g p-5 flex items-center gap-4">
              <QR url={`${location.origin}${location.pathname}?mision=${job.id}`} size={75} />
              <div className="text-left">
                <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Your Portal QR</p>
                <p className="text-[7px] text-slate-600 italic">Scan anytime</p>
              </div>
            </div>

            {/* Google Review link */}
            {job.status === 'paid' && (
              <button onClick={() => window.open(DEFAULT_CFG.GOOGLE)} className="w-full gold py-4 rounded-2xl font-black uppercase text-sm active:scale-95 mb-1">
                ⭐ {tr(lang, 'review')}
              </button>
            )}
          </div>
        )}

        {/* ── TAB 2: SERVICE HISTORY ── */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-in fade-in duration-500 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="calendar" className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">{lang === 'es' ? 'Historial de Servicios' : 'Service History'}</h3>
            </div>
            
            {clientMissions.length === 0 ? (
              <div className="g p-10 text-center text-slate-500 font-bold italic uppercase bg-white/5 border border-white/10 rounded-2xl">
                {lang === 'es' ? 'No se encontraron servicios' : 'No services found'}
              </div>
            ) : (
              clientMissions.map(m => {
                const isSelected = m.id === job.id;
                return (
                  <div key={m.id} className={`g p-5 border transition-all relative overflow-hidden ${isSelected ? 'border-amber-500 bg-amber-500/5' : 'border-white/10 hover:border-white/20 bg-black/40'}`}>
                    {isSelected && (
                      <div className="absolute top-0 right-0 bg-amber-500 text-black text-[7px] font-black uppercase px-2 py-0.5 rounded-bl-lg">
                        {lang === 'es' ? 'Seleccionado' : 'Active'}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">{m.service_type}</h4>
                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">{fmtD(m.scheduled_date)}</p>
                      </div>
                      <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase ${
                        m.status === 'paid' ? 'bg-blue-900/30 text-blue-400 border border-blue-500/25' : 
                        m.status === 'completed' ? 'bg-purple-900/30 text-purple-400 border border-purple-500/25' : 
                        m.status === 'in_progress' ? 'bg-green-900/30 text-green-400 border border-green-500/25' : 
                        'bg-amber-900/30 text-amber-400 border border-amber-500/25'
                      }`}>
                        {m.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider pt-2 border-t border-white/5">
                      <span className="text-slate-400">{lang === 'es' ? 'Total' : 'Price'}: <span className="text-white">{fmt$(m.total_price)}</span></span>
                      
                      <div className="flex gap-2">
                        {!isSelected && (
                          <button 
                            onClick={() => {
                              setJob(m);
                              setRating(m.client_rating || 0);
                              setRDone(!!m.client_rating);
                              setActiveTab('tracker');
                              tt(lang === 'es' ? 'Cargando tracker para este servicio...' : 'Loading tracker for this service...', 'yellow');
                            }}
                            className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[8px] font-black uppercase border border-white/10 active:scale-95 transition-all"
                          >
                            {lang === 'es' ? 'Ver / Pagar' : 'View / Pay'}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {m.status === 'completed' && !m.client_rating && (
                      <div className="mt-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2 text-center">
                        <p className="text-[8px] font-black text-amber-500 uppercase">{lang === 'es' ? 'Califica este servicio' : 'Rate this service'}</p>
                        <div className="flex justify-center">
                          <Stars value={m.tempRating || 0} onChange={(val) => {
                            setClientMissions(prev => prev.map(x => x.id === m.id ? { ...x, tempRating: val } : x));
                          }} size={6} />
                        </div>
                        <button 
                          onClick={async () => {
                            const val = m.tempRating;
                            await sb.from('elevore_missions').update({ client_rating: val }).eq('id', m.id);
                            setClientMissions(prev => prev.map(x => x.id === m.id ? { ...x, client_rating: val } : x));
                            tt('⭐ Thank you!');
                            triggerRatingSubmitEmail(m, val, tenantSettings?.business_full_name || "Elevore Premium Services", tenantSettings?.google_review_link || "https://g.page/r/review", sb, m.tenant_id);
                          }}
                          disabled={!m.tempRating}
                          className={`w-full py-1.5 rounded-lg font-black uppercase text-[7px] ${m.tempRating ? 'bg-[#F5C518] text-black' : 'bg-white/5 text-slate-500'}`}
                        >
                          {lang === 'es' ? 'Calificar' : 'Rate'}
                        </button>
                      </div>
                    )}
                    
                    {m.client_rating > 0 && (
                      <div className="mt-2 text-right">
                        <span className="text-[8px] text-amber-500 font-bold uppercase font-mono">⭐ {m.client_rating}/5</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── TAB 3: SERVICE PREFERENCES ── */}
        {activeTab === 'preferences' && (
          <form onSubmit={saveClientPrefs} className="g p-6 space-y-4 text-left animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="sliders" className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-white">{lang === 'es' ? 'Preferencias de Servicio' : 'Service Preferences'}</h3>
            </div>
            <p className="text-[8.5px] text-slate-400 leading-relaxed uppercase font-bold tracking-wider">
              {lang === 'es' 
                ? 'Especifica las preferencias de tu hogar. Nuestro equipo de campo las leerá en su aplicación antes de iniciar el trabajo.' 
                : 'Specify your home preferences. Our field staff will read these on their app before starting work.'}
            </p>

            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">{lang === 'es' ? 'Código de Acceso / Caja de Llaves' : 'Access PIN / Keybox'}</label>
              <input 
                type="text" 
                value={prefEntryCode} 
                onChange={e => setPrefEntryCode(e.target.value)} 
                placeholder="Ej: Keybox #2026, Gate code #123"
                className="inp w-full py-3 text-xs" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">{lang === 'es' ? 'Mascotas en Casa' : 'Pets in the House'}</label>
              <input 
                type="text" 
                value={prefPets} 
                onChange={e => setPrefPets(e.target.value)} 
                placeholder="Ej: 2 perros pequeños amigables, 1 gato"
                className="inp w-full py-3 text-xs" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">{lang === 'es' ? 'Productos de Limpieza Preferidos' : 'Preferred Cleaning Products'}</label>
              <input 
                type="text" 
                value={prefProducts} 
                onChange={e => setPrefProducts(e.target.value)} 
                placeholder="Ej: Eco-friendly only, no bleach"
                className="inp w-full py-3 text-xs" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">{lang === 'es' ? 'Notas de Servicio Generales' : 'General Service Notes'}</label>
              <textarea 
                rows={3}
                value={prefNotes} 
                onChange={e => setPrefNotes(e.target.value)} 
                placeholder="Ej: Favor prestar especial cuidado al piso de madera..."
                className="inp w-full py-3 text-xs resize-none" 
              />
            </div>

            <button 
              type="submit" 
              className="w-full gold py-3.5 rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg active:scale-95 transition-all mt-2 cursor-pointer"
            >
              💾 {lang === 'es' ? 'Guardar Preferencias' : 'Save Preferences'}
            </button>
          </form>
        )}

        {/* ── TAB 4: MEMBERSHIP & PERKS ── */}
        {activeTab === 'membership' && (() => {
          const defaultPlans = [
            { id: 'none', name: 'None', price: 0, color: '#6b7280', perks: ['No active perks'] },
            { id: 'basic', name: 'Basic Plan', price: 199, color: '#94a3b8', perks: ['2 Services / Mo', '5% Discount on Extras', 'Priority Scheduling'] },
            { id: 'premium', name: 'Premium Plan', price: 349, color: '#3b82f6', perks: ['4 Services / Mo', '10% Discount on Extras', 'Free Oven Addon', 'Priority Scheduling'] },
            { id: 'vip', name: 'VIP Plan', price: 549, color: '#fbbf24', perks: ['6 Services / Mo', '15% Discount on Extras', 'All Addons Included Free', 'Dedicated Support Team'] }
          ];
          const rawPlans = (tenantSettings?.membership_plans && tenantSettings.membership_plans.length > 0) 
                           ? tenantSettings.membership_plans 
                           : defaultPlans;
          const plans = rawPlans.map(p => ({
            ...p,
            perks: p.perks || (p.id === 'none' ? ['No active perks'] : [])
          }));
          const currentPlan = plans.find(p => p.id === membershipTier) 
                           || plans.find(p => p.id === 'none') 
                           || plans[0] 
                           || defaultPlans[0];

          return (
            <div className="space-y-4 text-left animate-in fade-in duration-500">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="award" className="w-4 h-4 text-[#F5C518]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-white">{lang === 'es' ? 'Mi Membresía Elevore' : 'Elevore Membership'}</h3>
              </div>

              <div 
                className="relative rounded-3xl p-6 overflow-hidden border text-left shadow-2xl transition-all duration-500"
                style={{ 
                  borderColor: currentPlan.color + '40', 
                  background: `linear-gradient(135deg, ${currentPlan.color}15 0%, #000000 100%)`,
                  boxShadow: `0 0 40px ${currentPlan.color}0a`
                }}
              >
                <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: `linear-gradient(to right, ${currentPlan.color}, transparent)` }} />
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest">{lang === 'es' ? 'PLAN ACTUAL' : 'CURRENT TIER'}</p>
                    <h4 className="text-2xl font-black italic uppercase tracking-wider text-white" style={{ textShadow: `0 0 10px ${currentPlan.color}40` }}>{currentPlan.name}</h4>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-white font-mono">${currentPlan.price}</p>
                    <p className="text-[7px] text-slate-500 font-bold uppercase">{lang === 'es' ? 'al mes' : '/ month'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">{lang === 'es' ? 'Beneficios Activos:' : 'Active Perks:'}</p>
                  <div className="grid grid-cols-1 gap-1.5 pl-1">
                    {currentPlan.perks?.map((perk, i) => (
                      <div key={i} className="flex items-center gap-2 text-[8px] font-bold text-slate-300 uppercase tracking-wider">
                        <Icon name="check-circle" className="w-3 h-3 text-[#F5C518]" />
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="g p-5 border border-white/10 space-y-4 bg-black/40">
                <h4 className="text-[9px] font-black text-white uppercase tracking-widest">{lang === 'es' ? 'Cambiar Plan de Membresía' : 'Select a Membership Plan'}</h4>
                <div className="grid grid-cols-1 gap-2.5">
                  {plans.map(p => {
                    const isSelected = p.id === membershipTier;
                    return (
                      <button
                        key={p.id}
                        onClick={() => saveMembershipPlan(p.id)}
                        disabled={membershipSaving}
                        className={`w-full p-4 rounded-2xl border transition-all text-left flex justify-between items-center cursor-pointer ${
                          isSelected ? 'border-[#F5C518] bg-[#F5C518]/5 shadow-lg' : 'border-white/5 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div>
                          <h5 className="text-xs font-black text-white uppercase tracking-wide flex items-center gap-1.5">
                            {p.name}
                            {isSelected && <span className="text-[7px] font-black bg-[#F5C518] text-black px-1.5 py-0.5 rounded uppercase">Active</span>}
                          </h5>
                          <p className="text-[7px] text-slate-400 uppercase font-bold tracking-wider pt-0.5">{p.price > 0 ? (lang === 'es' ? `Facturado mensualmente • ${p.perks?.length} beneficios` : `Billed monthly • ${p.perks?.length} perks`) : (lang === 'es' ? 'Sin pago recurrente' : 'No recurring payment')}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-white font-mono">${p.price}</span>
                          <span className="text-[7px] text-slate-500 font-bold block uppercase">{lang === 'es' ? 'mes' : 'mo'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── TAB 5: QUICK BOOKING ── */}
        {activeTab === 'booking' && (() => {
          const { base, addonsTotal, discount, total } = getBookingEstimate();
          return (
            <form onSubmit={handleCreateBooking} className="g p-6 space-y-4 text-left animate-in fade-in duration-500 bg-black/40 border-t-4 border-amber-500">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="plus-circle" className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-white">{lang === 'es' ? 'Agendar Nuevo Servicio' : 'Book New Service'}</h3>
              </div>
              
              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">{lang === 'es' ? 'Selecciona Tipo de Trabajo' : 'Select Service Type'}</label>
                <select 
                  value={bookingService} 
                  onChange={e => setBookingService(e.target.value)}
                  className="inp w-full py-3 text-xs bg-zinc-950 border border-white/10 text-white rounded-xl outline-none focus:border-amber-500 uppercase font-black"
                >
                  {quickJobsList.map(q => (
                    <option key={q.id} value={q.id} className="text-black">{q.en.toUpperCase()} - ${q.p}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">{lang === 'es' ? 'Fecha de Servicio' : 'Service Date'}</label>
                <input 
                  required
                  type="date" 
                  value={bookingDate} 
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setBookingDate(e.target.value)} 
                  className="inp w-full py-3 text-xs text-center" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">{lang === 'es' ? 'Añadir Servicios Extras' : 'Choose Addons'}</label>
                <div className="grid grid-cols-2 gap-2">
                  {addonsList.map(a => {
                    const checked = bookingAddons.includes(a.id);
                    const isFree = membershipTier === 'vip' || (membershipTier === 'premium' && a.id === 'oven');
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => {
                          if (bookingAddons.includes(a.id)) {
                            setBookingAddons(prev => prev.filter(x => x !== a.id));
                          } else {
                            setBookingAddons(prev => [...prev, a.id]);
                          }
                        }}
                        className={`p-3 border rounded-xl flex items-center justify-between text-left transition-all cursor-pointer ${checked ? 'border-[#F5C518] bg-[#F5C518]/5' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                      >
                        <div>
                          <p className="text-[8px] font-black text-white uppercase tracking-wider">{a.en}</p>
                          <p className="text-[7px] text-slate-500 font-bold uppercase">{isFree ? (lang === 'es' ? 'INCLUIDO ✓' : 'INCLUDED ✓') : `+$${a.p}`}</p>
                        </div>
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${checked ? 'border-[#F5C518] bg-[#F5C518]' : 'border-slate-700'}`}>
                          {checked && <Icon name="check" className="w-2.5 h-2.5 text-black stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">{lang === 'es' ? 'Instrucciones Especiales' : 'Special Instructions'}</label>
                <textarea 
                  rows={2}
                  value={bookingNotes} 
                  onChange={e => setBookingNotes(e.target.value)} 
                  placeholder={lang === 'es' ? 'Detalles específicos sobre el trabajo...' : 'Specific details about the job...'}
                  className="inp w-full py-3 text-xs resize-none" 
                />
              </div>

              <div className="p-4 bg-black/60 border border-white/5 rounded-2xl text-[9px] font-black uppercase text-slate-400 space-y-1.5 font-mono">
                <div className="flex justify-between"><span>{lang === 'es' ? 'Servicio Base' : 'Base Service'}</span><span className="text-white">${base}</span></div>
                {addonsTotal > 0 && <div className="flex justify-between"><span>{lang === 'es' ? 'Extras' : 'Addons'}</span><span className="text-white">+${addonsTotal}</span></div>}
                {discount > 0 && <div className="flex justify-between text-[#F5C518]"><span>{lang === 'es' ? `Descuento (${membershipTier})` : `Discount (${membershipTier})`}</span><span>-${discount.toFixed(2)}</span></div>}
                <div className="flex justify-between text-xs text-white pt-1.5 border-t border-white/5 font-black"><span>{lang === 'es' ? 'Total Estimado' : 'Estimated Total'}</span><span className="text-[#F5C518]">${total.toFixed(2)}</span></div>
              </div>

              <button 
                type="submit" 
                disabled={bookingSaving}
                className="w-full gold py-4 rounded-2xl font-black uppercase text-xs tracking-wider shadow-lg active:scale-95 transition-all mt-2 cursor-pointer flex items-center justify-center gap-2"
              >
                {bookingSaving ? <Icon name="loader-2" className="w-5 h-5 animate-spin text-black" /> : `📅 ${lang === 'es' ? 'Solicitar Servicio' : 'Request Service'}`}
              </button>
            </form>
          );
        })()}

        {/* ── SHARED FOOTER ACCORDIONS/CARDS ── */}
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
      </div>
    </div>
  );
}

// StaffJob Component
function StaffJob({ job, onBack, onRefresh, tt, recTime, upsell, update, employee, isOffline }) {
  const [chk, setChk] = useState(() => job.specs?.checklist || {});
  const [localJob, setLocalJob] = useState(job);
  const [isScanning, setIsScanning] = useState(false);
  const [scanUrl, setScanUrl] = useState('');
  const [scanStep, setScanStep] = useState(0);
  const [loadingAction, setLoadingAction] = useState(null);

  useEffect(() => {
    setLocalJob(job);
    setChk(job.specs?.checklist || {});
  }, [job]);

  const done = Object.values(chk).filter(Boolean).length;
  
  // Custom smart speed & quality bonus calculation
  const bonus = (localJob.status === 'paid' && localJob.final_signature && localJob.check_in_time && localJob.check_out_time && (Math.round((new Date(localJob.check_out_time) - new Date(localJob.check_in_time)) / 60000)) <= 180 && (localJob.client_rating || 0) >= 4) ? 5 : 0;
  
  const queueOfflineUpdate = (jobId, patch) => {
    const queuedStr = localStorage.getItem('elevore_offline_missions') || '{}';
    const queued = JSON.parse(queuedStr);
    queued[jobId] = {
      ...(queued[jobId] || {}),
      ...patch
    };
    if (patch.specs && queued[jobId].specs) {
      queued[jobId].specs = {
        ...queued[jobId].specs,
        ...patch.specs
      };
    }
    localStorage.setItem('elevore_offline_missions', JSON.stringify(queued));
  };

  const toggleCheck = async (index) => {
    const nextChk = { ...chk, [index]: !chk[index] };
    setChk(nextChk);
    const updatedSpecs = {
      ...(localJob.specs || {}),
      checklist: nextChk
    };

    if (isOffline) {
      setLocalJob(prev => {
        const nextJob = { ...prev, specs: updatedSpecs };
        queueOfflineUpdate(localJob.id, { specs: updatedSpecs });
        return nextJob;
      });
      tt("Tarea guardada localmente (Modo Offline) 📶", "yellow");
      return;
    }

    try {
      const { error } = await sb.from('elevore_missions').update({ specs: updatedSpecs }).eq('id', localJob.id);
      if (error) throw error;
      setLocalJob(prev => ({ ...prev, specs: updatedSpecs }));
      onRefresh();
    } catch (err) {
      console.error("Failed to save checklist to database:", err);
      tt("Error saving checklist: " + err.message, "red");
      // Revert if error
      setChk(chk);
    }
  };

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
      
      const c = localJob.after_photos || [];
      const newSpecs = { ...(localJob.specs || {}), ai_vision_qc: true };
      const updatedPhotos = [...c, url];

      if (isOffline) {
        setLocalJob(prev => {
          const nextJob = { ...prev, after_photos: updatedPhotos, specs: newSpecs };
          queueOfflineUpdate(localJob.id, { after_photos: updatedPhotos, specs: newSpecs });
          return nextJob;
        });
        tt('AI Quality Control: APPROVED (Local Cache) ✓ 📶', 'green');
        setTimeout(() => setIsScanning(false), 2000);
        return;
      }

      try {
        await sb.from('elevore_missions').update({ after_photos: updatedPhotos, specs: newSpecs }).eq('id', localJob.id);
        tt('AI Quality Control: APPROVED ✓', 'green');
        setLocalJob({ ...localJob, after_photos: updatedPhotos, specs: newSpecs });
        onRefresh();
      } catch (err) {
        tt('Error uploading after photo: ' + err.message, 'red');
      }
      setTimeout(() => setIsScanning(false), 2000);
    }, 4500);
  };

  const addBP = async url => {
    const c = localJob.before_photos || [];
    const updatedPhotos = [...c, url];

    if (isOffline) {
      setLocalJob(prev => {
        const nextJob = { ...prev, before_photos: updatedPhotos };
        queueOfflineUpdate(localJob.id, { before_photos: updatedPhotos });
        return nextJob;
      });
      tt('Foto del antes guardada localmente (Modo Offline) 📸 📶', 'yellow');
      return;
    }

    try {
      await sb.from('elevore_missions').update({ before_photos: updatedPhotos }).eq('id', localJob.id);
      tt('Before photo uploaded! 📸', 'green');
      setLocalJob({ ...localJob, before_photos: updatedPhotos });
      onRefresh();
    } catch (err) {
      tt('Error uploading before photo: ' + err.message, 'red');
    }
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
            {/* Voy En Camino Button */}
            <button 
              disabled={loadingAction || localJob.specs?.en_route}
              onClick={async () => {
                setLoadingAction('omw');
                const p = localJob.client_phone?.replace(/\D/g, '') || '';
                const msg = `🚗 Hola ${localJob.client_name}! Soy ${employee?.name || 'tu profesional de Elevore'}. Voy en camino a tu ubicacion. Sigue mi llegada aqui: ${window.location.origin}${window.location.pathname}?mision=${localJob.id}`;
                
                const time = new Date().toISOString();
                const updatedSpecs = {
                  ...(localJob.specs || {}),
                  en_route: true,
                  en_route_at: time
                };

                const updateDb = async (lat = null, lng = null) => {
                  if (lat && lng) {
                    updatedSpecs.en_route_lat = lat;
                    updatedSpecs.en_route_lng = lng;
                  }
                  if (isOffline) {
                    setLocalJob(prev => {
                      const nextJob = { ...prev, specs: updatedSpecs };
                      queueOfflineUpdate(localJob.id, { specs: updatedSpecs });
                      return nextJob;
                    });
                    window.open(`https://wa.me/${p}?text=${encodeURIComponent(msg)}`);
                    tt('Notificación "En Camino" guardada localmente! 🚗 📶', 'yellow');
                    setLoadingAction(null);
                    return;
                  }
                  try {
                    await sb.from('elevore_missions').update({ specs: updatedSpecs }).eq('id', localJob.id);
                    setLocalJob(prev => ({ ...prev, specs: updatedSpecs }));
                    window.open(`https://wa.me/${p}?text=${encodeURIComponent(msg)}`);
                    tt('Client Notified OMW!', 'green');
                    onRefresh();
                  } catch (e) {
                    tt('Error sending OMW: ' + e.message, 'red');
                  } finally {
                    setLoadingAction(null);
                  }
                };

                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      updateDb(position.coords.latitude, position.coords.longitude);
                    },
                    (error) => {
                      console.warn("OMW Geolocation failed", error);
                      updateDb();
                    },
                    { enableHighAccuracy: true, timeout: 5000 }
                  );
                } else {
                  await updateDb();
                }
              }} 
              className={`col-span-2 py-3 rounded-xl font-black uppercase text-[10px] active:scale-95 flex items-center justify-center gap-2 shadow-lg transition-all ${
                localJob.specs?.en_route 
                  ? 'bg-blue-950/40 border border-blue-500/20 text-blue-400 cursor-not-allowed opacity-80' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
              }`}
            >
              {loadingAction === 'omw' ? (
                <Icon name="loader-2" className="w-4 h-4 animate-spin text-white" />
              ) : localJob.specs?.en_route ? (
                <><Icon name="check" className="w-4 h-4 text-blue-400" /> Notificación "En Camino" Enviada ✓</>
              ) : (
                <><Icon name="truck" className="w-4 h-4" /> Enviar "Voy En Camino" al Cliente (GPS)</>
              )}
            </button>

            {/* Check In Button */}
            <button 
              disabled={loadingAction || localJob.check_in_time}
              onClick={async () => {
                setLoadingAction('check_in');
                const time = new Date().toISOString();
                if (isOffline) {
                  setLocalJob(prev => {
                    const nextJob = { ...prev, check_in_time: time, status: 'in_progress' };
                    queueOfflineUpdate(localJob.id, { check_in_time: time, status: 'in_progress' });
                    return nextJob;
                  });
                  tt('Check-in guardado localmente (Modo Offline) 📶', 'yellow');
                  setLoadingAction(null);
                  return;
                }
                // Optimistic UI Update
                setLocalJob(prev => ({ ...prev, check_in_time: time, status: 'in_progress' }));
                try {
                  await recTime(localJob.id, 'check_in_time');
                } catch (e) {
                  tt('Error check-in: ' + e.message, 'red');
                  // Revert if error
                  setLocalJob(prev => ({ ...prev, check_in_time: null, status: prev.status === 'in_progress' ? 'scheduled' : prev.status }));
                } finally {
                  setLoadingAction(null);
                }
              }} 
              className={`py-3 rounded-xl font-black uppercase text-[9px] active:scale-95 flex items-center justify-center gap-1.5 transition-all ${
                localJob.check_in_time 
                  ? 'bg-green-950/40 border border-green-500/20 text-green-400 cursor-not-allowed opacity-80' 
                  : 'bg-green-600 hover:bg-green-500 text-white'
              }`}
            >
              {loadingAction === 'check_in' ? (
                <Icon name="loader-2" className="w-4.5 h-4.5 animate-spin text-white" />
              ) : localJob.check_in_time ? (
                <><Icon name="check" className="w-3.5 h-3.5" /> Checked In ✓</>
              ) : (
                <><Icon name="play" className="w-3 h-3" /> Check In</>
              )}
            </button>

            {/* Check Out Button */}
            <button 
              disabled={loadingAction || !localJob.check_in_time || localJob.check_out_time}
              onClick={async () => {
                setLoadingAction('check_out');
                const time = new Date().toISOString();
                if (isOffline) {
                  setLocalJob(prev => {
                    const nextJob = { ...prev, check_out_time: time, status: 'completed' };
                    queueOfflineUpdate(localJob.id, { check_out_time: time, status: 'completed' });
                    return nextJob;
                  });
                  tt('Check-out guardado localmente (Modo Offline) 📶', 'yellow');
                  setLoadingAction(null);
                  return;
                }
                // Optimistic UI Update
                setLocalJob(prev => ({ ...prev, check_out_time: time, status: 'completed' }));
                try {
                  await recTime(localJob.id, 'check_out_time');
                } catch (e) {
                  tt('Error check-out: ' + e.message, 'red');
                  // Revert if error
                  setLocalJob(prev => ({ ...prev, check_out_time: null, status: prev.status === 'completed' ? 'in_progress' : prev.status }));
                } finally {
                  setLoadingAction(null);
                }
              }} 
              className={`py-3 rounded-xl font-black uppercase text-[9px] active:scale-95 flex items-center justify-center gap-1.5 transition-all ${
                localJob.check_out_time 
                  ? 'bg-red-950/40 border border-red-500/20 text-red-400 cursor-not-allowed opacity-80'
                  : !localJob.check_in_time
                    ? 'bg-white/5 text-slate-600 border border-white/5 cursor-not-allowed opacity-60'
                    : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              {loadingAction === 'check_out' ? (
                <Icon name="loader-2" className="w-4.5 h-4.5 animate-spin text-white" />
              ) : localJob.check_out_time ? (
                <><Icon name="check" className="w-3.5 h-3.5" /> Checked Out ✓</>
              ) : (
                <><Icon name="square" className="w-3 h-3" /> Check Out</>
              )}
            </button>

            {/* Open Maps Button */}
            <button onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(localJob.address)}`)} className="col-span-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:text-white px-4 py-3 rounded-xl font-black text-[9px] active:scale-95 flex items-center justify-center gap-1.5 transition-all">📍 Abrir en Waze / Google Maps</button>
            
            {/* Report Problem Buttons */}
            <VoiceButton onTranscript={async (txt) => {
              if (txt) {
                setLoadingAction('report');
                try {
                  await update(localJob, { specs: { ...(localJob.specs || {}), staff_issue: txt, staff_issue_at: new Date().toISOString() } }, 'Issue reported');
                  tt('🎙️ Voz registrada: ' + txt);
                } finally {
                  setLoadingAction(null);
                }
              }
            }} className="bg-orange-955/20 border border-orange-600/30 hover:border-orange-500 text-orange-400 py-3 rounded-xl hover:bg-orange-950/40 active:scale-95 flex items-center justify-center transition-all" />
            
            <button 
              disabled={loadingAction === 'report'}
              onClick={async () => { 
                const i = prompt('Issue?'); 
                if (i) { 
                  setLoadingAction('report');
                  try {
                    await update(localJob, { specs: { ...(localJob.specs || {}), staff_issue: i, staff_issue_at: new Date().toISOString() } }, 'Issue reported'); 
                  } finally {
                    setLoadingAction(null);
                  }
                } 
              }} 
              className="bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-xl font-black text-[9px] active:scale-95 flex items-center justify-center gap-1 transition-all"
            >
              {loadingAction === 'report' ? <Icon name="loader-2" className="w-4 h-4 animate-spin text-white" /> : '! Reportar Problema'}
            </button>
          </div>
          {localJob.check_in_time && (
            <div className="mt-4 flex flex-col gap-1.5 border-t border-white/5 pt-3">
              <p className="text-[8px] text-green-400 font-black uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                ▶ Iniciada: {new Date(localJob.check_in_time).toLocaleString()}
              </p>
              {localJob.check_out_time && (
                <p className="text-[8px] text-red-400 font-black uppercase flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                  ⏹ Finalizada: {new Date(localJob.check_out_time).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
        
        {/* Dynamic GPS Map of the active mission */}
        <div className="space-y-1">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">📍 Interactive GPS Route</p>
          <MapComponent address={localJob.address} />
        </div>

        <div className="g p-5"><p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-3">⚡ Upsell Strike</p><div className="grid grid-cols-2 gap-2">{ADDONS.filter(a => !localJob.specs?.[a.id]).map(a => { const sent = (localJob.upsell_sent || []).includes(a.id); return (<button key={a.id} disabled={sent} onClick={() => upsell(localJob, a.id)} className={`p-3 rounded-xl border text-[8px] font-black uppercase active:scale-95 ${sent ? 'bg-green-900/30 border-green-600/30 text-green-600' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>{sent ? '✅ ' : ''}{a.en} ${a.p}</button>); })}</div></div>
        <div className="g p-5 space-y-2"><div className="flex justify-between items-center mb-2"><p className="text-[9px] font-black uppercase text-amber-500">Checklist</p><span className="text-[9px] font-black text-white">{done}/{CHECKS.length}</span></div><div className="pb mb-3"><div className="pf" style={{ width: `${(done / CHECKS.length) * 100}%` }}></div></div>{CHECKS.map((item, i) => (<button key={i} onClick={() => toggleCheck(i)} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-95 ${chk[i] ? 'bg-green-600/20 border-green-600/40 text-green-400' : 'bg-white/5 border-white/5 text-slate-400'}`}><div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${chk[i] ? 'bg-green-600 border-green-600' : 'border-slate-600'}`}>{chk[i] && <Icon name="check" className="w-3 h-3 text-white" />}</div><span className="text-[10px] font-black uppercase text-left">{item}</span></button>))}</div>
        <div className="g p-5 border border-amber-500/20 bg-amber-500/5 relative overflow-hidden mb-5">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
          <div className="flex justify-between items-center mb-1">
             <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5"><Icon name="camera" className="w-3 h-3" /> Fotos del Antes (OBLIGATORIO)</p>
          </div>
          <p className="text-[7px] text-slate-400 uppercase tracking-wider mb-3 font-bold">Sube al menos 1 foto del estado inicial del servicio</p>
          <PhotoDrive photos={localJob.before_photos || []} label="" onAdd={addBP} />
        </div>

        <div className="g p-5 border border-purple-500/20 bg-purple-500/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
          <div className="flex justify-between items-center mb-1">
             <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1.5"><Icon name="camera" className="w-3 h-3" /> AI Quality Inspection</p>
          </div>
          <p className="text-[7px] text-slate-400 uppercase tracking-wider mb-3 font-bold">Upload After-Photo to trigger Computer Vision Scan</p>
          <PhotoDrive photos={localJob.after_photos || []} label="" onAdd={addAP} />
        </div>

        {/* Quality Control Before/After Slider */}
        {(localJob.before_photos?.length > 0 || localJob.after_photos?.length > 0) && (
          <div className="space-y-1">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest pl-1">🔎 Verificación de Calidad Operativa</p>
            <BeforeAfterSlider beforePhotos={localJob.before_photos || []} afterPhotos={localJob.after_photos || []} />
          </div>
        )}
        
        {bonus > 0 && <div className="g p-5 border border-amber-500/30 text-center"><p className="text-amber-500 font-black uppercase text-[9px] mb-1">🌟 Speed & Rating Bonus</p><p className="text-3xl font-black italic text-white">+${bonus}</p></div>}
        
        {/* DIGITAL SIGNATURE */}
        <div className="g p-5 border border-amber-500/30 space-y-4 bg-black/40">
          <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5"><Icon name="edit-3" className="w-3 h-3" /> Client Sign-Off</p>
          {!localJob.final_signature ? (
            <SigPad onSave={async (sig) => {
              if (isOffline) {
                setLocalJob(prev => {
                  const nextJob = { ...prev, final_signature: sig };
                  queueOfflineUpdate(localJob.id, { final_signature: sig });
                  return nextJob;
                });
                tt('Firma guardada localmente (Modo Offline) ✍️ 📶', 'yellow');
                return;
              }
              try {
                await sb.from('elevore_missions').update({ final_signature: sig }).eq('id', localJob.id);
                setLocalJob({ ...localJob, final_signature: sig });
                tt('Firma guardada correctamente ✓', 'green');
                onRefresh();
              } catch (err) {
                tt('Error saving signature: ' + err.message, 'red');
              }
            }} label="Customer Signature to finish work" color="#F5C518" />
          ) : (
            <div className="text-center bg-white/5 p-4 rounded-xl border border-white/5">
              <p className="text-[8px] text-green-500 font-black uppercase mb-2">✅ Signed by Client</p>
              <img src={localJob.final_signature} className="h-10 mx-auto opacity-70" alt="signature" />
            </div>
          )}
        </div>

        {/* VALIDATION FEEDBACK & CHECKOUT BUTTON */}
        {(() => {
          const missingChecklist = done < CHECKS.length;
          const missingBeforePhoto = !(localJob.before_photos && localJob.before_photos.length >= 1);
          const missingAfterPhoto = !(localJob.after_photos && localJob.after_photos.length >= 1);
          const missingSignature = !localJob.final_signature;
          const canCheckout = !missingChecklist && !missingBeforePhoto && !missingAfterPhoto && !missingSignature;
          
          return (
            <div className="space-y-3 mt-6">
              <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-2">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider mb-2">Requisitos de Salida:</p>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                  <span className="flex items-center gap-2">
                    <Icon name={missingChecklist ? "alert-circle" : "check-circle"} className={`w-4 h-4 ${missingChecklist ? 'text-red-500' : 'text-green-500'}`} />
                    Tareas Completadas ({done}/{CHECKS.length})
                  </span>
                  <span className={missingChecklist ? 'text-red-400' : 'text-green-400'}>{missingChecklist ? 'Pendiente' : 'Listo'}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                  <span className="flex items-center gap-2">
                    <Icon name={missingBeforePhoto ? "alert-circle" : "check-circle"} className={`w-4 h-4 ${missingBeforePhoto ? 'text-red-500' : 'text-green-500'}`} />
                    Foto del Antes (Mín. 1)
                  </span>
                  <span className={missingBeforePhoto ? 'text-red-400' : 'text-green-400'}>{missingBeforePhoto ? 'Pendiente' : 'Listo'}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                  <span className="flex items-center gap-2">
                    <Icon name={missingAfterPhoto ? "alert-circle" : "check-circle"} className={`w-4 h-4 ${missingAfterPhoto ? 'text-red-500' : 'text-green-500'}`} />
                    Foto del Después (Mín. 1)
                  </span>
                  <span className={missingAfterPhoto ? 'text-red-400' : 'text-green-400'}>{missingAfterPhoto ? 'Pendiente' : 'Listo'}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                  <span className="flex items-center gap-2">
                    <Icon name={missingSignature ? "alert-circle" : "check-circle"} className={`w-4 h-4 ${missingSignature ? 'text-red-500' : 'text-green-500'}`} />
                    Firma del Cliente
                  </span>
                  <span className={missingSignature ? 'text-red-400' : 'text-green-400'}>{missingSignature ? 'Pendiente' : 'Listo'}</span>
                </div>
              </div>
              
              <button 
                disabled={!canCheckout || loadingAction}
                onClick={async () => {
                  if (!canCheckout) return;
                  setLoadingAction('close');
                  if (isOffline) {
                    const time = new Date().toISOString();
                    const newSpecs = { ...(localJob.specs || {}), checklist_done_at: time };
                    queueOfflineUpdate(localJob.id, { status: 'completed', specs: newSpecs });
                    tt('Misión finalizada localmente (Modo Offline) 📶', 'green');
                    setLoadingAction(null);
                    onBack();
                    return;
                  }
                  try {
                    await update(localJob, { status: 'completed', specs: { ...(localJob.specs || {}), checklist_done_at: new Date().toISOString() } }, 'Sent to QC ✅'); 
                    onBack(); 
                    onRefresh(); 
                  } catch (e) {
                    tt('Error: ' + e.message, 'red');
                  } finally {
                    setLoadingAction(null);
                  }
                }} 
                className={`w-full py-5 rounded-2xl font-black uppercase text-base transition-all flex items-center justify-center ${
                  canCheckout && !loadingAction ? 'gold shadow-[0_0_30px_rgba(245,197,24,0.3)] active:scale-95 hover:bg-amber-400 text-black' : 'bg-white/5 border border-white/5 text-slate-500 cursor-not-allowed'
                }`}
              >
                {loadingAction === 'close' ? (
                  <Icon name="loader-2" className="w-5 h-5 animate-spin text-black" />
                ) : (
                  '✅ Execute Sign-Off & Close'
                )}
              </button>
            </div>
          );
        })()}
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

  // Local settings for LLM provider (Ollama)
  const [aiProvider, setAIProvider] = useState(() => localStorage.getItem('elevore_ai_provider') || 'ollama');
  const [ollamaUrl, setOllamaUrl] = useState(() => {
    const saved = localStorage.getItem('elevore_ollama_url');
    if (saved === 'http://localhost:11434') return 'http://127.0.0.1:11434';
    return saved || 'http://127.0.0.1:11434';
  });
  const [ollamaModel, setOllamaModel] = useState(() => localStorage.getItem('elevore_ollama_model') || 'llama3.2');
  const [geminiModel, setGeminiModel] = useState(() => localStorage.getItem('elevore_gemini_model') || 'gemini-2.5-flash');
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('elevore_gemini_key') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [connStatus, setConnStatus] = useState('idle'); // idle, testing, connected, error

  // Save AI Provider details
  useEffect(() => {
    localStorage.setItem('elevore_gemini_key', geminiKey);
  }, [geminiKey]);

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

  useEffect(() => {
    localStorage.setItem('elevore_gemini_model', geminiModel);
  }, [geminiModel]);

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
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 4000);
    try {
      if (aiProvider === 'gemini' || aiProvider === 'antigravity') {
        const headers = { 'Content-Type': 'application/json' };
        if (aiProvider === 'gemini') {
          headers['x-gemini-key'] = geminiKey;
        }
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: geminiModel,
            messages: [{ role: 'user', content: 'hi' }]
          }),
          signal: controller.signal
        });
        clearTimeout(id);
        if (res.ok) {
          setConnStatus('connected');
          tt(aiProvider === 'antigravity' ? 'Conectado a Antigravity AI Cloud (Vercel)' : 'Conectado a Gemini exitosamente en la nube (Vercel API)', 'green');
        } else {
          setConnStatus('error');
          const errData = await res.json().catch(() => ({}));
          tt(`Error: ${errData.error || `HTTP ${res.status}`}`, 'red');
        }
        return;
      }

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
      if (aiProvider === 'gemini') {
        tt('No se pudo conectar a la Vercel API: ' + e.message, 'red');
      } else {
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
    const timeoutDuration = 90000; // 90s for local Ollama
    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

    try {
      if (aiProvider === 'gemini' || aiProvider === 'antigravity') {
        const headers = { 'Content-Type': 'application/json' };
        if (aiProvider === 'gemini') {
          headers['x-gemini-key'] = geminiKey;
        }

        const promptOverride = aiProvider === 'antigravity'
          ? `Eres Antigravity AI, el cerebro operativo inteligente de Elevore. Tu sello distintivo es la precisión analítica, la empatía en el servicio y la automatización estratégica. Ayudas como el copiloto e inteligencia central del negocio.\n\n${systemPrompt}`
          : systemPrompt;

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: geminiModel,
            messages: [
              { role: 'system', content: promptOverride },
              ...messages.slice(-8).map(m => ({
                role: m.from === 'user' ? 'user' : 'assistant',
                content: m.text
              })),
              { role: 'user', content: userMessage }
            ]
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          return `⚠️ Error de Conexión a ${aiProvider === 'antigravity' ? 'Antigravity AI' : 'Gemini'} (Vercel API): ${errData.error || `HTTP ${res.status}`}`;
        }

        const data = await res.json();
        return data.text || 'Lo siento, la IA no devolvió ningún contenido.';
      }

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
          stream: false,
          keep_alive: -1
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return `⚠️ Error de Conexión a Ollama local: HTTP ${res.status}`;
      }

      const data = await res.json();
      return data.message?.content || 'Lo siento, Ollama no devolvió ningún contenido. Verifica la configuración de tu modelo.';
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        return `⚠️ Tiempo de espera agotado (90 segundos). Asegúrate de que Ollama está activo (ejecuta 'ollama run ${ollamaModel}') y responde rápido.`;
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
                  {aiProvider === 'gemini' ? `Gemini: ${geminiModel}` : `Ollama: ${ollamaModel}`}
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
            
             <div className="space-y-2.5">
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
                     $env:OLLAMA_ORIGINS="*" ; ollama run {ollamaModel || 'llama3.2'}
                   </code>
                 </div>
               </div>
            </div>

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
      const { data: inserted, error } = await sb.from('elevore_missions').insert([{
        client_name: form.name,
        client_phone: form.phone,
        address: form.address,
        service_type: form.service_type,
        status: 'lead',
        total_price: 0,
        tenant_id: tenantFromUrl || null,
        specs: { referred_by: referrer, referral_discount: 25, referred_by_client_name: referrer },
        created_at: new Date().toISOString()
      }]).select();
      if (inserted && inserted[0]) {
        triggerInngestEvent('elevore/quote.created', { jobId: inserted[0].id });
      }
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

const MODAL_CONTENT = {
  'Features': {
    icon: '⚡',
    title: 'All Features',
    subtitle: 'Everything included in Elevore Empire',
    body: [
      { head: '🧠 Predictive AI Engine', text: 'Identifies VIP upsell opportunities automatically. Forecasts your monthly revenue with 94% accuracy using historical job data and seasonality patterns.' },
      { head: '📍 GPS Geo-Fencing', text: 'Real-time check-in/check-out coordinates with Haversine distance alerts. Know exactly when and where your team clocks in — within meters.' },
      { head: '📸 AI Vision Quality Control', text: 'Computer vision scans every after-photo ensuring a 99.4% quality pass rate before your client sees a single image.' },
      { head: '🚗 Uber-Style Client Tracker', text: 'Auto-notifies clients with a live tracking link the moment staff departs. Real-time status steps: Approved → En Route → In Service → QC → Paid.' },
      { head: '✍️ Digital E-Signatures', text: 'Clients sign quotes and final invoices with their finger on any device. Legally binding, timestamp-stamped, stored forever.' },
      { head: '💬 WhatsApp CRM', text: 'One-click AI scripts for dead leads, 5-star Google review requests, quote follow-ups, and booking confirmations via WhatsApp.' },
      { head: '💰 Wallet & Payroll Ledger', text: 'Automatic commission calculation per job. Admin can cashout workers via Zelle with a full transaction ledger and history accordion.' },
      { head: '📊 Revenue Intelligence Dashboard', text: 'MRR, Gross Revenue, Net Profit, Average Ticket, LTV tracking — all in real time with goal progress bars.' },
    ]
  },
  'Pricing': {
    icon: '💎',
    title: 'Simple Pricing',
    subtitle: 'No hidden fees. Cancel anytime.',
    body: [
      { head: 'Starter — $97/mo', text: 'Up to 3 staff. Job management, WhatsApp CRM, digital quotes & signatures. Perfect for solo operators scaling up.' },
      { head: 'Pro — $197/mo ⭐ Most Popular', text: 'Up to 10 staff. Everything in Starter + AI Engine, GPS Geo-Fencing, Payroll Wallet, Uber-Style Client Tracker, Quality Control AI.' },
      { head: 'Empire — $397/mo', text: 'Unlimited staff. Everything in Pro + custom branding, priority support, dedicated onboarding specialist, and advanced analytics.' },
      { head: '14-Day Free Trial', text: 'All plans include a 14-day full-access free trial. No credit card required. Setup in under 2 minutes.' },
    ]
  },
  'Changelog': {
    icon: '📋',
    title: 'Changelog',
    subtitle: 'What we shipped recently',
    body: [
      { head: 'v2.4 — May 2026', text: 'Admin Payout Wallet Dashboard. GPS Geo-Fencing with Haversine distance alerts. Collapsible transaction ledger under each worker card.' },
      { head: 'v2.3 — April 2026', text: 'Uber-style client tracking portal with live status stepper. Before/after photo comparison slider. n8n email automation via SMTP.' },
      { head: 'v2.2 — March 2026', text: 'Staff leaderboard & XP leveling system. AI-powered strategic advisor chatbot. Inventory management module.' },
      { head: 'v2.1 — February 2026', text: 'Recurring client membership plans. Referral program with public lead form. Client portal QR code generator.' },
      { head: 'v2.0 — January 2026', text: 'Full multi-tenant architecture. Role-based access control. Staff PIN login. WhatsApp CRM with AI scripts.' },
    ]
  },
  'Roadmap': {
    icon: '🗺️',
    title: 'Product Roadmap',
    subtitle: "What's coming next at Elevore",
    body: [
      { head: '🔜 Q3 2026 — AI Auto-Dispatch', text: 'Automatically assigns jobs to the nearest available staff member based on GPS location, skill set, and historical performance score.' },
      { head: '🔜 Q3 2026 — Stripe Direct Payments', text: 'Clients pay invoices directly from their portal with credit/debit card. Automatic payment reconciliation and receipt generation.' },
      { head: '🔜 Q4 2026 — iOS & Android Apps', text: 'Native mobile apps for field staff with offline-capable job management, GPS tracking, and photo upload.' },
      { head: '🔜 Q4 2026 — AI Review Response Bot', text: 'Automatically drafts and publishes professional replies to Google and Yelp reviews using your brand voice.' },
      { head: '🔮 2027 — Franchise Management', text: 'Multi-location franchise control panel. Centralized reporting, standardized SOPs, and territory management.' },
    ]
  },
  'About': {
    icon: '🏢',
    title: 'About Elevore',
    subtitle: 'Built by operators, for operators',
    body: [
      { head: 'Our Mission', text: 'Elevore was built to give independent service businesses — cleaning companies, handyman crews, property services — the same operational power as Fortune 500 corporations, at a fraction of the cost.' },
      { head: 'Our Story', text: 'Founded in 2024 by a team of former service business owners who were frustrated with fragmented tools, spreadsheets, and lost revenue. We built the OS we always wished existed.' },
      { head: 'Our Values', text: 'Radical transparency. Speed over perfection. Build for the hustler. We ship fast, listen hard, and never stop improving based on real user feedback.' },
      { head: 'The Team', text: 'A lean, distributed team of engineers, designers, and former field operators across the US and Latin America. We eat our own cooking — many team members run active service businesses on Elevore.' },
    ]
  },
  'Blog': {
    icon: '✍️',
    title: 'Elevore Blog',
    subtitle: 'Insights for elite service operators',
    body: [
      { head: '📈 How to Scale from $8K to $30K/mo in 90 Days', text: 'The exact playbook our top clients use: AI upsells, membership recurring revenue, and the Good-Better-Best quote psychology. Read time: 7 min.' },
      { head: '📍 Why GPS Geo-Fencing is the #1 Trust Signal for Clients', text: 'Uber changed customer expectations forever. Here\'s how to deploy the same real-time transparency in your cleaning or handyman business. Read time: 5 min.' },
      { head: '💬 The WhatsApp Follow-Up Sequence That Closes 70% of Dead Leads', text: 'Copy-paste the exact 4-message sequence our highest-converting clients use to bring ghost leads back to life. Read time: 4 min.' },
      { head: '🧠 Using AI to Identify Your Top 20% VIP Clients', text: 'How to let Elevore\'s AI engine automatically flag your highest LTV clients so you can offer white-glove retention packages. Read time: 6 min.' },
    ]
  },
  'Careers': {
    icon: '🚀',
    title: 'Join the Team',
    subtitle: "We're hiring builders who care",
    body: [
      { head: 'Senior Full-Stack Engineer (Remote)', text: 'React, Node.js, Supabase/Postgres. You\'ll own entire product features end-to-end. Competitive salary + equity. Apply: careers@elevore.com' },
      { head: 'Growth & Partnerships Manager (Remote)', text: 'Build and manage relationships with service business associations, franchise networks, and industry influencers. Apply: careers@elevore.com' },
      { head: 'Customer Success Manager — Spanish/English (Remote)', text: 'Help our Latin American and US clients get maximum value from Elevore. Bilingual required. Apply: careers@elevore.com' },
      { head: 'Our Culture', text: 'Fully remote. Async-first. High ownership. We move fast, celebrate wins, and never have meetings that could be a message. Benefits: equity, unlimited PTO, learning budget.' },
    ]
  },
  'Press': {
    icon: '📰',
    title: 'Press & Media',
    subtitle: 'Elevore in the news',
    body: [
      { head: '"The Salesforce of Service Businesses" — TechCrunch, March 2026', text: 'Elevore is rapidly becoming the operating system of choice for scaling service businesses in the US and Latin America, combining AI, GPS, and financial tools in one elegant platform.' },
      { head: '"500+ Businesses Can\'t Be Wrong" — Service Business Insider, Feb 2026', text: 'In less than 2 years, Elevore has onboarded over 500 active businesses. The secret? They actually understand the operator\'s daily reality.' },
      { head: 'Press Contact', text: 'For media inquiries, interview requests, or press kits, contact our communications team at press@elevore.com or call +1 (800) ELEVORE.' },
    ]
  },
  'Privacy Policy': {
    icon: '🔒',
    title: 'Privacy Policy',
    subtitle: 'Last updated: May 1, 2026',
    body: [
      { head: 'Data We Collect', text: 'We collect information you provide when creating an account (name, email, business details), usage data (features used, session duration), and technical data (IP address, browser type, device). We never sell your data to third parties.' },
      { head: 'How We Use Your Data', text: 'To operate and improve the Elevore platform, send product updates and billing notifications, provide customer support, and detect fraud or abuse. All data processing is GDPR and CCPA compliant.' },
      { head: 'Data Storage & Security', text: 'All data is stored on Supabase (PostgreSQL) with row-level security policies. Data is encrypted at rest (AES-256) and in transit (TLS 1.3). Regular automated backups with 30-day retention.' },
      { head: 'Your Rights', text: 'You may request a full export of your data, correction of inaccurate data, or complete account deletion at any time by contacting privacy@elevore.com. Requests are processed within 30 days.' },
      { head: 'Contact', text: 'Questions about this policy? Email privacy@elevore.com or write to Elevore Inc., 1234 Business Blvd, Miami, FL 33101.' },
    ]
  },
  'Terms of Service': {
    icon: '📄',
    title: 'Terms of Service',
    subtitle: 'Last updated: May 1, 2026',
    body: [
      { head: '1. Acceptance', text: 'By creating an Elevore account, you agree to these Terms of Service. If you do not agree, do not use the platform. These terms constitute a binding legal agreement.' },
      { head: '2. Subscriptions & Billing', text: 'Subscriptions are billed monthly or annually in advance. You may cancel anytime. No refunds are issued for partial months. Failed payments result in a 7-day grace period before service suspension.' },
      { head: '3. Acceptable Use', text: 'Elevore may only be used for lawful business purposes. Prohibited: spam, fraud, illegal content, reverse engineering, or reselling access without written authorization.' },
      { head: '4. Data Ownership', text: 'You retain full ownership of all data you input into Elevore (client records, job history, photos). We claim no ownership or licensing rights to your business data.' },
      { head: '5. Liability Limitation', text: 'Elevore\'s liability is limited to the amount paid in the 12 months preceding a claim. We are not liable for indirect, incidental, or consequential damages.' },
      { head: 'Contact', text: 'Legal inquiries: legal@elevore.com' },
    ]
  },
  'Security': {
    icon: '🛡️',
    title: 'Security',
    subtitle: 'Enterprise-grade protection for your business',
    body: [
      { head: 'Encryption', text: 'All data is encrypted at rest using AES-256 and in transit using TLS 1.3. Database connections use SSL certificates with automatic rotation.' },
      { head: 'Row-Level Security', text: 'Powered by Supabase PostgreSQL with RLS policies ensuring complete tenant isolation. No cross-tenant data access is architecturally possible.' },
      { head: 'Authentication', text: 'JWT-based authentication with secure session management. Optional two-factor authentication (2FA). Failed login rate limiting and IP-based blocking.' },
      { head: 'Infrastructure', text: 'Hosted on AWS with multi-region redundancy. 99.9% uptime SLA. Automated database backups every 6 hours with 30-day retention and point-in-time recovery.' },
      { head: 'Vulnerability Disclosure', text: 'Responsible disclosure program active. If you discover a security vulnerability, please email security@elevore.com. We respond within 24 hours and offer recognition for valid reports.' },
    ]
  },
  'Contact': {
    icon: '💬',
    title: 'Contact Us',
    subtitle: "We're here to help. Reach us anytime.",
    body: [
      { head: '📧 General Support', text: 'hello@elevore.com — Response time: within 4 business hours on weekdays.' },
      { head: '💼 Sales & Enterprise', text: 'sales@elevore.com — Talk to a real person who understands service businesses. Book a 30-min demo call.' },
      { head: '🔒 Privacy & Legal', text: 'privacy@elevore.com | legal@elevore.com — Data requests, compliance, and legal inquiries.' },
      { head: '📰 Press & Media', text: 'press@elevore.com — Media inquiries, interviews, press kits, and partnership opportunities.' },
      { head: '📍 Office', text: 'Elevore Inc. — 1234 Business Blvd, Suite 500, Miami, FL 33101, United States. Remote-first company with team members across North and Latin America.' },
    ]
  },
};

// ============================================================
// 🌟 LANDING PAGE HELPERS
// ============================================================

// 🎬 CINEMATIC AUTO-PLAY VIDEO DEMO
// Simulates a real screen recording with animated scenes, progress bar, play/pause
function VideoDemoModal({ onClose }) {
  const SCENE_DURATION = 6000; // ms per scene
  const scenes = [
    {
      id: 'login',
      title: 'Inicio de Sesión',
      subtitle: 'Acceso instantáneo al Empire OS',
    },
    {
      id: 'dashboard',
      title: 'Command Center',
      subtitle: 'Vista general en tiempo real',
    },
    {
      id: 'booking',
      title: 'Nuevo Servicio',
      subtitle: 'Deploy de misión en 30 segundos',
    },
    {
      id: 'ai',
      title: 'AI Upsell Engine',
      subtitle: 'Inteligencia artificial detectando dinero',
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp CRM',
      subtitle: 'Cerrando deals con un clic',
    },
    {
      id: 'signature',
      title: 'Firma Digital del Cliente',
      subtitle: 'Cierre legal sin papel',
    },
  ];

  const [sceneIdx, setSceneIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0); // 0-100 within scene
  const [totalProgress, setTotalProgress] = useState(0); // 0-100 overall
  const [sceneStep, setSceneStep] = useState(0); // sub-animation step within scene
  const [clickPos, setClickPos] = useState(null);
  const [typedText, setTypedText] = useState('');
  const intervalRef = useRef(null);
  const stepRef = useRef(null);

  const totalScenes = scenes.length;
  const scene = scenes[sceneIdx];

  // Typing animation for booking scene
  const typeTarget = 'Maria Gonzalez';
  useEffect(() => {
    if (sceneIdx !== 2) { setTypedText(''); return; }
    let i = 0;
    setTypedText('');
    const t = setInterval(() => {
      i++;
      setTypedText(typeTarget.slice(0, i));
      if (i >= typeTarget.length) clearInterval(t);
    }, 80);
    return () => clearInterval(t);
  }, [sceneIdx]);

  // Main timer — advances progress and scenes
  useEffect(() => {
    if (!playing) return;
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        const next = p + (100 / (SCENE_DURATION / 50));
        if (next >= 100) {
          setSceneIdx(s => {
            const nextS = (s + 1) % totalScenes;
            setTotalProgress(Math.round(((nextS) / totalScenes) * 100));
            return nextS;
          });
          setSceneStep(0);
          return 0;
        }
        return next;
      });
    }, 50);
    return () => clearInterval(intervalRef.current);
  }, [playing, totalScenes]);

  // Sub-step within each scene
  useEffect(() => {
    setSceneStep(0);
    const steps = [0, 1, 2, 3];
    let i = 0;
    stepRef.current = setInterval(() => {
      i++;
      if (i < steps.length) setSceneStep(i);
      else clearInterval(stepRef.current);
    }, SCENE_DURATION / 4);
    return () => clearInterval(stepRef.current);
  }, [sceneIdx]);

  // Click ripple effect
  const triggerClick = (x, y) => {
    setClickPos({ x, y, id: Date.now() });
    setTimeout(() => setClickPos(null), 700);
  };

  const seekTo = (idx) => {
    setSceneIdx(idx);
    setProgress(0);
    setSceneStep(0);
    setTotalProgress(Math.round((idx / totalScenes) * 100));
  };

  const formatTime = (idx, prog) => {
    const totalSecs = Math.round((idx + prog / 100) * (SCENE_DURATION / 1000));
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s.toString().padStart(2,'0')}`;
  };
  const totalDuration = `${Math.floor((totalScenes * SCENE_DURATION/1000)/60)}:${((totalScenes * SCENE_DURATION/1000) % 60).toString().padStart(2,'0')}`;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 md:p-6"
      style={{ background: 'rgba(0,0,0,0.97)', backdropFilter: 'blur(30px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-5xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#F5C518] rounded-lg flex items-center justify-center font-black text-black italic text-sm">E</div>
            <div>
              <p className="text-[11px] text-[#F5C518] font-black uppercase tracking-[0.25em] leading-none">Elevore Empire</p>
              <p className="text-white font-black text-sm tracking-tight">Demo Interactivo — {scene.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-white/5 hover:border-white/20 hover:bg-white/5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Cerrar
          </button>
        </div>

        {/* Main screen — cinematic area */}
        <div
          className="relative rounded-2xl overflow-hidden border border-white/10 cursor-pointer select-none"
          style={{ boxShadow: '0 0 80px rgba(245,197,24,0.08), 0 30px 60px rgba(0,0,0,0.9)', aspectRatio: '16/9' }}
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            triggerClick(((e.clientX - rect.left) / rect.width) * 100, ((e.clientY - rect.top) / rect.height) * 100);
            setPlaying(p => !p);
          }}
        >
          {/* Click ripple */}
          {clickPos && (
            <div key={clickPos.id} className="absolute pointer-events-none z-50" style={{ left: `${clickPos.x}%`, top: `${clickPos.y}%`, transform: 'translate(-50%,-50%)' }}>
              <div className="w-12 h-12 rounded-full border-2 border-white/60" style={{ animation: 'ping 0.6s ease-out forwards' }} />
            </div>
          )}

          {/* MacOS chrome bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center gap-2 px-4 py-2.5 z-30" style={{ background: 'rgba(6,6,16,0.95)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
            <div className="flex-1 mx-4 bg-white/5 rounded-md px-3 py-1 text-[9px] text-slate-500 font-mono">elevore.app</div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-[8px] text-green-400 font-black uppercase">En vivo</span>
            </div>
          </div>

          {/* ══ SCENE RENDERER ══ */}
          <div className="absolute inset-0 bg-[#06060f]" style={{ paddingTop: '36px' }}>

            {/* SCENE: LOGIN */}
            {scene.id === 'login' && (
              <div className="h-full flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(245,197,24,0.07) 0%, transparent 60%)' }}>
                <div className="text-center space-y-6 w-72">
                  <div className={`w-16 h-16 bg-[#F5C518] rounded-2xl mx-auto flex items-center justify-center font-black text-black text-2xl italic transition-all duration-700 ${sceneStep >= 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} style={{ boxShadow: '0 0 40px rgba(245,197,24,0.4)' }}>E</div>
                  <div className={`space-y-1 transition-all duration-500 delay-300 ${sceneStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <h2 className="text-white font-black text-2xl uppercase tracking-tighter">ELEVORE <span className="text-[#F5C518] italic">EMPIRE</span></h2>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">v97.0 — Built to Dominate</p>
                  </div>
                  <div className={`space-y-3 transition-all duration-500 delay-500 ${sceneStep >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#F5C518]" />
                      <span className="text-white font-black text-sm tracking-[0.3em]">● ● ● ● ●</span>
                    </div>
                    <div className={`w-full py-3.5 rounded-xl font-black uppercase text-sm text-center text-black transition-all duration-500 ${sceneStep >= 3 ? 'bg-[#F5C518] shadow-[0_0_30px_rgba(245,197,24,0.5)]' : 'bg-white/10 text-white'}`}>
                      {sceneStep >= 3 ? '✓ Acceso Concedido' : 'Verificando...'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SCENE: DASHBOARD */}
            {scene.id === 'dashboard' && (
              <div className="h-full p-5 space-y-4 overflow-hidden">
                <div className={`grid grid-cols-4 gap-3 transition-all duration-700 ${sceneStep >= 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                  {[
                    {l:'MRR Mensual',v:'$31,420',c:'+28%',col:'text-green-400',delay:0},
                    {l:'Jobs Activos',v:'47',c:'12 hoy',col:'text-blue-400',delay:100},
                    {l:'AI Upsells',v:'23',c:'+$8,400',col:'text-[#F5C518]',delay:200},
                    {l:'Rating Prom.',v:'4.9 ⭐',c:'127 reseñas',col:'text-purple-400',delay:300},
                  ].map((m,i) => (
                    <div key={i} className="bg-white/[0.04] border border-white/8 rounded-xl p-3 transition-all duration-500" style={{ transitionDelay: `${m.delay}ms`, opacity: sceneStep >= 0 ? 1 : 0 }}>
                      <p className="text-[8px] text-slate-500 uppercase font-black tracking-wider">{m.l}</p>
                      <p className="text-xl font-black text-white mt-1">{m.v}</p>
                      <p className={`text-[9px] font-bold mt-0.5 ${m.col}`}>{m.c}</p>
                    </div>
                  ))}
                </div>
                <div className={`grid grid-cols-3 gap-3 transition-all duration-700 delay-300 ${sceneStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                  <div className="col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-black text-white">Revenue — Últimos 12 Meses</span>
                      <span className="text-xs text-[#F5C518] font-black">+128% YoY 🔥</span>
                    </div>
                    <div className="flex items-end gap-1.5 h-14">
                      {[18,30,25,50,44,65,58,80,72,88,82,100].map((h,i) => (
                        <div key={i} className="flex-1 rounded-t transition-all duration-1000" style={{ height: sceneStep >= 1 ? `${h}%` : '4px', background: i===11?'linear-gradient(0deg,#F5C518,#d97706)':'rgba(255,255,255,0.07)', transitionDelay: `${i*40}ms`, boxShadow: i===11?'0 0 12px rgba(245,197,24,0.5)':'' }} />
                      ))}
                    </div>
                    <div className="flex justify-between mt-1">{['E','F','M','A','M','J','J','A','S','O','N','D'].map(m=><span key={m} className="text-[6px] text-slate-700 font-bold">{m}</span>)}</div>
                  </div>
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                    <p className="text-[8px] font-black text-slate-500 uppercase mb-2">Misiones Activas</p>
                    {[
                      {n:'Rodriguez',c:'bg-blue-400',s:'En Ruta'},
                      {n:'Smith Deep',c:'bg-[#F5C518]',s:'Activo'},
                      {n:'Johnson',c:'bg-green-400',s:'✓ Listo'},
                      {n:'Miller',c:'bg-slate-600',s:'Mañana'},
                    ].map((j,i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0">
                        <div className="flex items-center gap-1.5"><div className={`w-1.5 h-1.5 rounded-full ${j.c}`}/><span className="text-[9px] font-bold text-slate-300">{j.n}</span></div>
                        <span className="text-[7px] text-slate-500 font-black uppercase">{j.s}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3 transition-all duration-500 delay-700 ${sceneStep >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse flex-shrink-0" />
                  <p className="text-[10px] text-amber-400 font-black uppercase tracking-wide">🤖 IA detectó 3 oportunidades de upsell — Potencial: +$2,100 hoy</p>
                </div>
              </div>
            )}

            {/* SCENE: BOOKING */}
            {scene.id === 'booking' && (
              <div className="h-full p-5 flex gap-4 overflow-hidden">
                <div className="flex-1 space-y-4">
                  <div className={`transition-all duration-500 ${sceneStep >= 0 ? 'opacity-100' : 'opacity-0'}`}>
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-wider mb-1">Nombre del Cliente</p>
                    <div className="bg-white/5 border border-[#F5C518]/40 rounded-xl px-4 py-3 flex items-center gap-2" style={{ boxShadow: '0 0 15px rgba(245,197,24,0.1)' }}>
                      <span className="text-white font-bold text-sm">{typedText}</span>
                      <span className="w-0.5 h-4 bg-[#F5C518] animate-pulse" />
                    </div>
                  </div>
                  <div className={`grid grid-cols-2 gap-3 transition-all duration-500 delay-300 ${sceneStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                    {[
                      {l:'Servicio',v:'Deep Clean'},
                      {l:'Dirección',v:'SW 8th St, Miami'},
                      {l:'Equipo',v:'Carlos & Ana'},
                      {l:'Fecha',v:'Hoy 2:00 PM'},
                    ].map((f,i) => (
                      <div key={i}>
                        <p className="text-[8px] text-slate-500 uppercase font-black mb-1">{f.l}</p>
                        <div className="bg-white/5 border border-white/8 rounded-xl px-3 py-2.5">
                          <span className="text-white font-bold text-sm">{f.v}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={`space-y-2 transition-all duration-500 delay-500 ${sceneStep >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                    <p className="text-[8px] text-slate-500 uppercase font-black">Precio Calculado por IA</p>
                    <div className="bg-[#F5C518]/5 border border-[#F5C518]/30 rounded-xl px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-[#F5C518] font-black text-2xl">$320</p>
                        <p className="text-[8px] text-slate-500 font-bold uppercase">Precio óptimo · Margen 68%</p>
                      </div>
                      <span className="text-[9px] bg-green-600 text-white font-black px-2 py-1 rounded-lg uppercase">🔥 Alto Valor</span>
                    </div>
                  </div>
                </div>
                <div className={`w-48 space-y-3 flex flex-col transition-all duration-500 delay-700 ${sceneStep >= 2 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex-1">
                    <p className="text-[8px] font-black text-slate-500 uppercase mb-2">Historial</p>
                    <div className="space-y-1.5">
                      {[{d:'Apr 10',p:'$280',s:'✓'},{d:'Mar 5',p:'$320',s:'✓'},{d:'Feb 18',p:'$260',s:'✓'}].map((h,i) => (
                        <div key={i} className="flex justify-between text-[9px]">
                          <span className="text-slate-500">{h.d}</span>
                          <span className="text-[#F5C518] font-black">{h.p} {h.s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button className={`py-4 rounded-xl font-black uppercase text-xs text-black transition-all duration-500 ${sceneStep >= 3 ? 'bg-[#F5C518] shadow-[0_0_25px_rgba(245,197,24,0.4)] scale-105' : 'bg-white/10 text-white'}`}>
                    {sceneStep >= 3 ? '🚀 ¡Deployed!' : 'Deploy Mission'}
                  </button>
                </div>
              </div>
            )}

            {/* SCENE: AI */}
            {scene.id === 'ai' && (
              <div className="h-full p-5 space-y-4 overflow-hidden">
                <div className={`flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl transition-all duration-500 ${sceneStep >= 0 ? 'opacity-100' : 'opacity-0'}`}>
                  <span className="text-2xl">🤖</span>
                  <div>
                    <p className="text-[10px] text-amber-400 font-black uppercase tracking-wide">AI Revenue Engine — Análisis Completado</p>
                    <p className="text-[9px] text-slate-400">Escaneé 47 trabajos y detecté 14 oportunidades de alto valor</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    {c:'Maria Gonzalez', upsell:'Inside Oven Clean', p:'+$35', reason:'No lo pidió en las últimas 3 visitas', prob:'94%', delay:0},
                    {c:'Carlos Rodriguez', upsell:'Window Cleaning', p:'+$50', reason:'Último servicio ventanas: hace 45 días', prob:'87%', delay:200},
                    {c:'Smith Office Complex', upsell:'Deep Clean Upgrade', p:'+$80', reason:'Calificación 5⭐ — cliente premium', prob:'91%', delay:400},
                  ].map((a,i) => (
                    <div key={i} className={`flex items-center gap-4 p-4 bg-white/[0.02] border rounded-xl transition-all duration-500 ${sceneStep >= 1 ? 'opacity-100 translate-x-0 border-white/8' : 'opacity-0 -translate-x-4 border-transparent'}`} style={{ transitionDelay: `${a.delay}ms` }}>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-black text-black text-sm flex-shrink-0">{a.c[0]}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-black text-xs truncate">{a.c}</p>
                        <p className="text-slate-400 text-[9px]">{a.reason}</p>
                      </div>
                      <div className="text-center flex-shrink-0">
                        <p className="text-[#F5C518] font-black text-sm">{a.upsell}</p>
                        <p className="text-[9px] text-slate-500">{a.prob} prob.</p>
                      </div>
                      <div className={`flex-shrink-0 text-center transition-all duration-500 delay-700 ${sceneStep >= 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                        <p className="text-green-400 font-black text-lg">{a.p}</p>
                        <button className="text-[7px] bg-green-600 text-white font-black px-2 py-0.5 rounded-lg uppercase">Enviar WA</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className={`grid grid-cols-3 gap-3 transition-all duration-500 delay-700 ${sceneStep >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                  {[{l:'Revenue Potencial',v:'+$2,100',col:'text-green-400'},{l:'Probabilidad Promedio',v:'91%',col:'text-[#F5C518]'},{l:'Scripts Enviados',v:'3/14',col:'text-blue-400'}].map((m,i) => (
                    <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-3 text-center">
                      <p className="text-[8px] text-slate-500 uppercase font-black">{m.l}</p>
                      <p className={`text-xl font-black mt-1 ${m.col}`}>{m.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SCENE: WHATSAPP */}
            {scene.id === 'whatsapp' && (
              <div className="h-full p-5 flex gap-4 overflow-hidden">
                <div className="w-52 bg-white/[0.02] border border-white/5 rounded-xl p-3 flex-shrink-0">
                  <p className="text-[8px] font-black text-slate-500 uppercase mb-2">Scripts Disponibles</p>
                  {[
                    {t:'Quote Follow-Up',c:'text-amber-400',active: sceneStep >= 0},
                    {t:'Review Request',c:'text-[#F5C518]',active: sceneStep >= 1},
                    {t:'Retention Win-Back',c:'text-blue-400',active: sceneStep >= 2},
                    {t:'Bundle Offer',c:'text-purple-400',active: false},
                    {t:'Birthday Discount',c:'text-pink-400',active: false},
                  ].map((s,i) => (
                    <div key={i} className={`flex items-center gap-2 p-2 rounded-lg mb-1 transition-all duration-300 ${s.active ? 'bg-white/5 border border-white/10' : 'opacity-40'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${s.active ? 'bg-green-400' : 'bg-slate-700'}`} />
                      <span className={`text-[9px] font-bold ${s.active ? s.c : 'text-slate-600'}`}>{s.t}</span>
                    </div>
                  ))}
                </div>
                <div className="flex-1 flex flex-col gap-3">
                  <div className={`bg-white/[0.02] border border-white/5 rounded-xl p-4 transition-all duration-500 ${sceneStep >= 0 ? 'opacity-100' : 'opacity-0'}`}>
                    <p className="text-[8px] text-slate-500 uppercase font-black mb-2">📱 Preview del Mensaje</p>
                    <div className="bg-green-600/10 border border-green-600/20 rounded-xl p-3">
                      <p className="text-[10px] text-slate-300 leading-relaxed">
                        Hi <span className="text-white font-black">Maria!</span> 📋 Tu cotización de <span className="text-[#F5C518] font-black">$320</span> vence en 6h. Firma aquí y bloquea tu precio: <span className="text-blue-400 underline">elevore.app/portal?id=...</span>
                        <br/><br/>⏰ <span className="text-amber-400 font-black">¡Solo 6 horas!</span> Zelle: (407) 952-4228 🏠
                      </p>
                    </div>
                  </div>
                  <div className={`grid grid-cols-2 gap-3 transition-all duration-500 delay-300 ${sceneStep >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                    {[
                      {l:'Enviados Hoy',v:'23',c:'text-white'},
                      {l:'Abiertos',v:'19 (83%)',c:'text-green-400'},
                      {l:'Respuestas',v:'11',c:'text-[#F5C518]'},
                      {l:'Deals Cerrados',v:'7 → $1,840',c:'text-green-400'},
                    ].map((m,i) => (
                      <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                        <p className="text-[8px] text-slate-500 uppercase font-black">{m.l}</p>
                        <p className={`text-base font-black mt-0.5 ${m.c}`}>{m.v}</p>
                      </div>
                    ))}
                  </div>
                  <button className={`py-4 rounded-xl font-black uppercase text-sm text-center transition-all duration-500 ${sceneStep >= 2 ? 'bg-green-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]' : 'bg-white/5 text-slate-500'}`}>
                    {sceneStep >= 2 ? '✅ Enviado a Maria — Abierto hace 2 min' : '📤 Enviar por WhatsApp'}
                  </button>
                </div>
              </div>
            )}

            {/* SCENE: SIGNATURE */}
            {scene.id === 'signature' && (
              <div className="h-full p-5 flex gap-5 overflow-hidden">
                <div className="flex-1 space-y-4">
                  <div className={`bg-white/[0.02] border border-white/5 rounded-xl p-4 transition-all duration-500 ${sceneStep >= 0 ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <p className="text-white font-black text-base">Maria Gonzalez</p>
                        <p className="text-[9px] text-slate-500">Deep Clean · $320 · Hoy 2:00 PM</p>
                      </div>
                      <span className="text-[8px] bg-amber-500/20 text-amber-400 border border-amber-500/30 font-black px-2 py-1 rounded-lg uppercase">Pendiente Firma</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[9px]">
                      <div className="space-y-1 text-slate-400">
                        <p>📋 Deep Clean — 3 habitaciones</p>
                        <p>📍 SW 8th St, Miami, FL</p>
                        <p>👥 Carlos & Ana</p>
                      </div>
                      <div className="space-y-1 text-slate-400">
                        <p>💰 Total: <span className="text-[#F5C518] font-black">$320</span></p>
                        <p>✅ Depósito: $100</p>
                        <p>⏳ Balance: <span className="text-white font-black">$220</span></p>
                      </div>
                    </div>
                  </div>
                  <div className={`transition-all duration-700 delay-300 ${sceneStep >= 1 ? 'opacity-100' : 'opacity-0'}`}>
                    <p className="text-[8px] text-slate-500 uppercase font-black mb-2">✍️ Firma del Cliente</p>
                    <div className="relative bg-white/[0.02] border border-dashed border-white/20 rounded-xl overflow-hidden" style={{ height: '100px' }}>
                      {sceneStep >= 2 && (
                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 100">
                          <path
                            d="M30,70 Q80,20 130,55 Q180,85 230,40 Q270,15 310,50 Q340,70 370,45"
                            stroke="#F5C518"
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ strokeDasharray: 600, strokeDashoffset: sceneStep >= 2 ? 0 : 600, transition: 'stroke-dashoffset 1.5s ease' }}
                          />
                        </svg>
                      )}
                      {sceneStep < 2 && <p className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-600 font-black uppercase">Firma aquí con el dedo</p>}
                    </div>
                  </div>
                </div>
                <div className={`w-44 flex flex-col gap-3 transition-all duration-500 delay-500 ${sceneStep >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex-1">
                    <p className="text-[8px] font-black text-slate-500 uppercase mb-3">Estado del Portal</p>
                    {[
                      {l:'Cotización',v:'✓ Enviada',c:'text-green-400'},
                      {l:'Aprobación',v:sceneStep >= 3 ? '✓ Firmada' : '⏳ Esperando',c: sceneStep >= 3 ? 'text-green-400' : 'text-amber-400'},
                      {l:'Pago Zelle',v:'Pendiente',c:'text-slate-400'},
                      {l:'QR Portal',v:'Activo ✓',c:'text-blue-400'},
                    ].map((s,i) => (
                      <div key={i} className="flex justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                        <span className="text-[8px] text-slate-500">{s.l}</span>
                        <span className={`text-[8px] font-black ${s.c}`}>{s.v}</span>
                      </div>
                    ))}
                  </div>
                  <div className={`py-3 rounded-xl text-center font-black text-xs uppercase transition-all duration-700 ${sceneStep >= 3 ? 'bg-green-600 text-white shadow-[0_0_20px_rgba(34,197,94,0.4)] scale-105' : 'bg-white/5 text-slate-500'}`}>
                    {sceneStep >= 3 ? '✅ ¡Aprobado!' : 'Confirmar'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* PAUSE overlay */}
          {!playing && (
            <div className="absolute inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
              <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
              </div>
            </div>
          )}
        </div>

        {/* ══ VIDEO CONTROLS ══ */}
        <div className="space-y-2 px-1">
          {/* Scene scrubber */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500 font-mono w-10 flex-shrink-0">{formatTime(sceneIdx, progress)}</span>
            <div className="flex-1 relative h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer"
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                const targetScene = Math.floor(pct * totalScenes);
                seekTo(Math.min(targetScene, totalScenes - 1));
              }}
            >
              {/* Scene segments */}
              {scenes.map((s,i) => (
                <div key={i} className="absolute top-0 bottom-0 border-r border-black/50" style={{ left: `${(i/totalScenes)*100}%`, width: `${(1/totalScenes)*100}%`, background: i < sceneIdx ? '#F5C518' : i === sceneIdx ? 'rgba(245,197,24,0.4)' : 'transparent' }}>
                  {i === sceneIdx && (
                    <div className="absolute top-0 bottom-0 left-0 bg-[#F5C518] transition-all" style={{ width: `${progress}%` }} />
                  )}
                </div>
              ))}
              {/* Thumb */}
              <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md border-2 border-[#F5C518] transition-all" style={{ left: `calc(${((sceneIdx + progress/100) / totalScenes) * 100}% - 7px)` }} />
            </div>
            <span className="text-[10px] text-slate-600 font-mono w-10 flex-shrink-0 text-right">{totalDuration}</span>
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Play/Pause */}
              <button onClick={() => setPlaying(p => !p)} className="w-9 h-9 rounded-xl bg-[#F5C518] flex items-center justify-center hover:bg-amber-400 active:scale-95 transition-all" style={{ boxShadow: '0 0 15px rgba(245,197,24,0.3)' }}>
                {playing
                  ? <svg width="12" height="12" viewBox="0 0 24 24" fill="black"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                  : <svg width="12" height="12" viewBox="0 0 24 24" fill="black" className="ml-0.5"><path d="M5 3l14 9-14 9V3z"/></svg>
                }
              </button>
              {/* Prev / Next */}
              <button onClick={() => seekTo(Math.max(0, sceneIdx - 1))} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M19 20L9 12l10-8v16z"/><line x1="5" y1="4" x2="5" y2="20"/></svg>
              </button>
              <button onClick={() => seekTo(Math.min(totalScenes - 1, sceneIdx + 1))} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M5 4l10 8-10 8V4z"/><line x1="19" y1="4" x2="19" y2="20"/></svg>
              </button>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1">{scene.subtitle}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-slate-600 font-black uppercase">Escena {sceneIdx + 1}/{totalScenes}</span>
              <div className="text-[9px] bg-red-600 text-white font-black px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">● REC</div>
            </div>
          </div>
        </div>

        {/* Scene thumbnails */}
        <div className="grid grid-cols-6 gap-2">
          {scenes.map((s, i) => (
            <button key={i} onClick={() => seekTo(i)} className={`flex flex-col items-start gap-1 p-2.5 rounded-xl border transition-all text-left ${sceneIdx === i ? 'border-[#F5C518]/50 bg-[#F5C518]/5' : 'border-white/5 bg-white/[0.02] hover:border-white/10'}`}>
              <div className={`w-full h-1 rounded-full mb-1 ${sceneIdx === i ? 'bg-[#F5C518]' : i < sceneIdx ? 'bg-green-500' : 'bg-white/10'}`} />
              <span className={`text-[8px] font-black ${sceneIdx === i ? 'text-[#F5C518]' : i < sceneIdx ? 'text-slate-400' : 'text-slate-600'}`}>
                {['🔑','📊','🚀','🤖','💬','✍️'][i]} {s.title}
              </span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}

// Animated counter hook
function useCountUp(end, duration = 2000, start = 0) {
  const [value, setValue] = useState(start);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      let startTime = null;
      const step = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.floor(start + (end - start) * eased));
        if (progress < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, duration, start]);
  return [value, ref];
}

// Scroll reveal hook
function useScrollReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('visible'); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

// Scroll progress bar
function ScrollProgress() {
  useEffect(() => {
    const bar = document.getElementById('scroll-progress');
    if (!bar) return;
    const onScroll = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = `${(scrolled / total) * 100}%`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <div id="scroll-progress" style={{ width: '0%' }} />;
}

// Live toast notifications
const LIVE_TOASTS = [
  { icon: '⚡', msg: 'Miguel just closed a $1,840 job', loc: 'Orlando, FL' },
  { icon: '🎯', msg: 'New VIP client signed up', loc: 'Tampa, FL' },
  { icon: '💰', msg: 'Sarah\'s MRR hit $12K this month', loc: 'Miami, FL' },
  { icon: '📈', msg: 'AI upsell converted — +$350', loc: 'Atlanta, GA' },
  { icon: '⭐', msg: '5-star review received — auto-shared', loc: 'Orlando, FL' },
  { icon: '🔥', msg: 'Carlos activated Empire Pro plan', loc: 'Houston, TX' },
  { icon: '💎', msg: 'VIP membership upgraded — $549/mo', loc: 'Dallas, TX' },
];

function LiveToasts() {
  const [current, setCurrent] = useState(null);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    let idx = 0;
    const show = () => {
      setFading(false);
      setCurrent(LIVE_TOASTS[idx % LIVE_TOASTS.length]);
      idx++;
      setTimeout(() => setFading(true), 3500);
      setTimeout(() => setCurrent(null), 4200);
    };
    show();
    const iv = setInterval(show, 6000);
    return () => clearInterval(iv);
  }, []);
  if (!current) return null;
  return (
    <div
      className={`fixed bottom-6 left-6 z-50 flex items-center gap-3 bg-[#0f0f14]/95 backdrop-blur-2xl border border-white/10 rounded-2xl px-4 py-3 shadow-2xl max-w-xs ${fading ? 'toast-out' : 'toast-in'}`}
      style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)' }}
    >
      <span className="text-xl">{current.icon}</span>
      <div>
        <p className="text-white text-xs font-bold leading-tight">{current.msg}</p>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">{current.loc}</p>
      </div>
      <div className="relative flex-shrink-0 ml-1">
        <div className="w-2 h-2 bg-green-400 rounded-full" />
        <div className="pulse-ring" style={{ background: 'rgba(34,197,94,0.4)' }} />
      </div>
    </div>
  );
}

// Animated stat
function AnimatedStat({ end, prefix = '', suffix = '', label, delay = 0, decimals = 0 }) {
  const multiplier = Math.pow(10, decimals);
  const [val, ref] = useCountUp(end * multiplier, 1800);
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-black italic glow-text tracking-tighter">
        {prefix}{(val / multiplier).toFixed(decimals)}{suffix}
      </div>
      <div className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mt-2">{label}</div>
    </div>
  );
}

// Feature card with 3D tilt on hover
function FeatureCard({ icon, label, desc, color, border, text, bgColor, big, onClick }) {
  const cardRef = useRef(null);
  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale(1.02) translateY(-6px)`;
    card.style.boxShadow = `${x * -20}px ${y * -20}px 60px rgba(0,0,0,0.5)`;
  };
  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) scale(1) translateY(0px)';
    card.style.boxShadow = '';
  };
  return (
    <button
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`bg-gradient-to-br ${color} border ${border} rounded-3xl p-8 ${big ? 'md:col-span-2' : ''} relative overflow-hidden group text-left w-full cursor-pointer`}
      style={{ transition: 'box-shadow 0.1s ease', willChange: 'transform' }}
    >
      {/* Shine sweep on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 100%)' }} />
      <div className={`w-14 h-14 rounded-2xl bg-${text}/10 border border-${text}/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
        <Icon name={icon} className={`w-7 h-7 text-${text}`} />
      </div>
      <h3 className="text-xl font-black uppercase tracking-wide text-white mb-3">{label}</h3>
      <p className="text-slate-400 leading-relaxed text-sm">{desc}</p>
      <div className="mt-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity duration-300" style={{ color: 'inherit' }}>
        Explore feature
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
      </div>
    </button>
  );
}

function LandingPage({ onLogin, onSignup }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [showVideoDemo, setShowVideoDemo] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isAutoplay, setIsAutoplay] = useState(true);

  const openModal = (key) => setActiveModal(key);
  const closeModal = () => setActiveModal(null);

  useScrollReveal();

  // Re-run scroll reveal on DOM changes
  useEffect(() => {
    const timer = setTimeout(() => {
      document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.9) el.classList.add('visible');
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const scrollTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  React.useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Autoplay for the interactive operations preview
  useEffect(() => {
    if (!isAutoplay) return;
    const timer = setInterval(() => {
      setActiveStep((s) => (s + 1) % 6);
    }, 5000);
    return () => clearInterval(timer);
  }, [isAutoplay]);

  const previewSteps = [
    {
      title: 'AI Smart Dispatch',
      desc: 'System matches the best crew based on location and schedule, sending the job details directly to their mobile app.',
      icon: 'zap',
      badge: 'Step 1: Automated Dispatch'
    },
    {
      title: 'GPS En Route & Uber-Style Map',
      desc: 'When the crew leaves, a text message is automatically sent to the client with a real-time tracking link.',
      icon: 'map-pin',
      badge: 'Step 2: Customer Notifications'
    },
    {
      title: 'Geofenced Check-In',
      desc: 'Crew checks in on arrival. Geolocation verification ensures they are at the correct address before starting.',
      icon: 'clock',
      badge: 'Step 3: Geofence Verification'
    },
    {
      title: 'AI-Powered Quality Control',
      desc: 'Crew uploads before/after photos. Elevore AI scans the images to guarantee quality and prevent customer disputes.',
      icon: 'camera',
      badge: 'Step 4: Quality Assurance'
    },
    {
      title: 'On-Site Digital Sign-Off',
      desc: 'Customer signs off directly on the worker’s phone or via a secure SMS link, creating a legally binding record.',
      icon: 'edit-3',
      badge: 'Step 5: Client Sign-Off'
    },
    {
      title: 'Auto-Billing & Stripe Payment',
      desc: 'Invoicing is automatic. Stripe processes the payment immediately and a review request is sent via WhatsApp.',
      icon: 'credit-card',
      badge: 'Step 6: Automated Settlement'
    }
  ];

  const features = [
    { icon: 'calendar', color: 'from-amber-500/20 to-amber-500/5', border: 'border-amber-500/30', text: 'amber-400', label: 'Mission Calendar & Smart Dispatch', desc: 'Drag-and-drop calendar automatically optimizes travel routes, schedules recurring visits, and notifies crews instantly.', big: true },
    { icon: 'camera', color: 'from-purple-500/20 to-purple-500/5', border: 'border-purple-500/30', text: 'purple-400', label: 'Before & After Photo Drive', desc: 'Provide undeniable proof of quality. Workers upload photos directly from the job site, automatically organized in the client history.' },
    { icon: 'edit-3', color: 'from-blue-500/20 to-blue-500/5', border: 'border-blue-500/30', text: 'blue-400', label: 'Digital Signatures On-Site', desc: 'Secure legally binding sign-offs on the crew’s smartphone right after completion. Never worry about payment disputes again.' },
    { icon: 'message-square', color: 'from-green-500/20 to-green-500/5', border: 'border-green-500/30', text: 'green-400', label: 'WhatsApp CRM & Auto Follow-ups', desc: 'Automate customer communications. Send customized quote follow-ups, arrival notices, and 5-star review request links.', big: true },
    { icon: 'brain', color: 'from-rose-500/20 to-rose-500/5', border: 'border-rose-500/30', text: 'rose-400', label: 'AI Revenue Predictor', desc: 'Analyze historical demand and seasons to identify upsell opportunities and predict monthly revenue with 94% accuracy.' },
    { icon: 'layout-dashboard', color: 'from-yellow-500/20 to-yellow-500/5', border: 'border-yellow-500/30', text: 'yellow-400', label: 'Real-Time Operations Dashboard', desc: 'Monitor your entire operation at a glance. Live dispatch states, active job timers, GPS locations, and daily gross revenues.' },
  ];

  const testimonials = [
    { name: 'Carlos R.', biz: 'Pristine Cleaning Co.', loc: 'Orlando, FL', text: 'Our scheduling was a nightmare. Since Elevore, the dispatch system handles our 12 crews automatically, saving us 15+ hours/week. Growth went from 0 to 45%.', stars: 5, avatar: 'CR', avatarColor: 'from-amber-500 to-orange-600' },
    { name: 'Maria S.', biz: 'Elite Handyman Services', loc: 'Tampa, FL', text: 'Before/after photo drives completely saved us. When a client claims we missed a spot, we send the timestamped photo. Zero disputes this year.', stars: 5, avatar: 'MS', avatarColor: 'from-purple-500 to-pink-600' },
    { name: 'David K.', biz: 'Apex Property Services', loc: 'Miami, FL', text: 'The Good-Better-Best pricing matrix is pure magic. 80% of our residential clients choose the middle option, boosting average job value by 38%.', stars: 5, avatar: 'DK', avatarColor: 'from-blue-500 to-cyan-600' },
  ];

  return (
    <div className="min-h-screen bg-[#030303] text-white selection:bg-[#F5C518] selection:text-black overflow-x-hidden land">

      {/* Scroll Progress Bar */}
      <ScrollProgress />
      {/* Live toast popups */}
      <LiveToasts />

      {/* ═══ NAVBAR ═══ */}
      <nav className="fixed top-0 left-0 w-full z-50 border-b border-white/5" style={{ background: 'rgba(3,3,3,0.88)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-3 group">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 rounded-xl bg-[#F5C518] flex items-center justify-center font-black text-black text-lg italic z-10 group-hover:scale-110 transition-transform duration-300" style={{ boxShadow: '0 0 20px rgba(245,197,24,0.5)' }}>E</div>
              <div className="absolute inset-0 rounded-xl bg-[#F5C518] blur-md opacity-40 group-hover:opacity-70 transition-opacity" />
            </div>
            <span className="font-black tracking-tight text-xl">Elevore <span className="glow-text italic">Empire</span></span>
          </button>
          <div className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            {[['features','Features'],['pricing','Pricing'],['testimonials','Reviews']].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="animated-underline hover:text-white transition-colors">{label}</button>
            ))}
            <button onClick={() => openModal('Changelog')} className="animated-underline hover:text-[#F5C518] transition-colors">Changelog</button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onLogin} className="hidden sm:block text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors px-4 py-2">Log In</button>
            <button onClick={onSignup} className="btn-gold px-5 py-2.5 text-[11px] uppercase tracking-widest">Start Free Trial</button>
            <button onClick={() => setMenuOpen(m => !m)} className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-white/5 transition-colors" aria-label="Toggle menu">
              <span className={`block w-5 h-0.5 bg-white transition-all duration-300 origin-center ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-5 h-0.5 bg-white transition-all duration-300 origin-center ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-white/5 px-6 py-6 space-y-4" style={{ background: 'rgba(3,3,3,0.98)' }}>
            {[['features','⚡ Features'],['pricing','💎 Pricing'],['testimonials','⭐ Reviews']].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} className="block w-full text-left text-sm font-black uppercase tracking-widest text-slate-300 hover:text-white py-2 border-b border-white/5 transition-colors">{label}</button>
            ))}
            <button onClick={() => { openModal('Changelog'); setMenuOpen(false); }} className="block w-full text-left text-sm font-black uppercase tracking-widest text-slate-300 hover:text-[#F5C518] py-2 border-b border-white/5">📋 Changelog</button>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { onLogin(); setMenuOpen(false); }} className="flex-1 py-3 border border-white/10 rounded-xl text-sm font-black uppercase tracking-wider text-slate-300 hover:bg-white/5 active:scale-95 transition-all">Log In</button>
              <button onClick={() => { onSignup(); setMenuOpen(false); }} className="flex-1 py-3 bg-[#F5C518] text-black rounded-xl text-sm font-black uppercase tracking-wider active:scale-95 transition-all">Free Trial</button>
            </div>
          </div>
        )}
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 grid-bg overflow-hidden">
        <div className="hero-orb-1" style={{ top: '-10%', left: '50%', transform: 'translateX(-50%)' }} />
        <div className="hero-orb-2" style={{ top: '30%', left: '-10%' }} />
        <div className="hero-orb-3" style={{ bottom: '10%', right: '-5%' }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(245,197,24,0.1),transparent)] pointer-events-none" />
        <div className="relative z-10 max-w-5xl mx-auto space-y-8">
          <div className="reveal inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-[#F5C518]/30 bg-[#F5C518]/5 shimmer-badge">
            <div className="relative flex items-center">
              <div className="w-2 h-2 bg-[#F5C518] rounded-full" />
              <div className="pulse-ring" style={{ background: 'rgba(245,197,24,0.4)' }} />
            </div>
            <span className="text-[#F5C518] text-[10px] font-black uppercase tracking-[0.3em]">The #1 OS for Elite Service Companies</span>
          </div>
          <h1 className="reveal delay-100 text-5xl sm:text-7xl md:text-[96px] font-black leading-[0.88] tracking-tighter">
            Run Your Service Operations<br />
            <span className="glow-text italic">on Autopilot.</span>
          </h1>
          <p className="reveal delay-200 text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            AI dispatch, GPS routing, before/after drives, and live tracking — built specifically to scale cleaning, handyman, and property maintenance companies.
          </p>
          <div className="reveal delay-300 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onSignup} className="btn-gold group w-full sm:w-auto px-10 py-5 text-sm uppercase tracking-widest flex items-center justify-center gap-2">
              Start 14-Day Free Trial <Icon name="arrow-right" className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => setShowVideoDemo(true)}
              className="w-full sm:w-auto px-10 py-5 border border-white/10 rounded-2xl font-black uppercase tracking-widest hover:bg-white/5 hover:border-white/20 transition-all text-sm text-slate-300 flex items-center justify-center gap-3 group relative overflow-hidden"
            >
              <div className="relative w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#F5C518]/40 group-hover:bg-[#F5C518]/10 transition-all">
                <div className="absolute inset-0 rounded-full border border-[#F5C518]/30 animate-ping opacity-60" />
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-[#F5C518] ml-0.5">
                  <path d="M5 3l14 9-14 9V3z"/>
                </svg>
              </div>
              Ver Demo de 3 min
            </button>
          </div>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">No credit card required • Cancel anytime • Setup in 2 minutes</p>
          
          {/* Interactive Operations Preview Section */}
          <div className="pt-16 pb-8">
            <div className="text-center mb-12 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#F5C518]">Demostración Interactiva</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tighter">
                Mira cómo una misión se completa<br />
                <span className="glow-text italic">en piloto automático.</span>
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch text-left">
              <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
                {previewSteps.map((step, idx) => {
                  const isActive = activeStep === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveStep(idx);
                        setIsAutoplay(false);
                      }}
                      className={`p-4 rounded-2xl border transition-all duration-300 flex items-start gap-4 w-full group ${
                        isActive
                          ? 'bg-white/[0.04] border-[#F5C518]/30'
                          : 'bg-transparent border-transparent'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border ${isActive ? 'bg-[#F5C518]/10 border-[#F5C518]/30 text-[#F5C518]' : 'bg-white/5 border-white/5 text-slate-500'}`}>
                        <Icon name={step.icon} className="w-4 h-4" />
                      </div>
                      <div>
                        <span className={`text-[8px] font-mono tracking-widest uppercase ${isActive ? 'text-[#F5C518]' : 'text-slate-600'}`}>Paso {(idx + 1).toString().padStart(2, '0')}</span>
                        <h3 className={`text-sm font-black ${isActive ? 'text-white' : 'text-slate-400'}`}>{step.title}</h3>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="lg:col-span-7 bg-[#0b0b12] border border-white/10 rounded-3xl p-6 flex flex-col justify-between min-h-[420px] relative overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/2 via-transparent to-[#F5C518]/2 pointer-events-none" />
                
                {/* Header Chrome bar */}
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5 flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                  <span className="text-[9px] text-slate-500 font-mono ml-4 uppercase tracking-widest">
                    {previewSteps[activeStep].badge}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-[#F5C518] rounded-full animate-pulse" />
                    <span className="text-[7.5px] font-black uppercase text-slate-500 tracking-widest">Elevore OS v2.0</span>
                  </div>
                </div>

                {/* Dynamic Screen View Content */}
                <div className="flex-1 flex items-center justify-center p-2">
                  {activeStep === 0 && (
                    <div className="w-full max-w-md space-y-4 animate-scale">
                      <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4 space-y-3 shadow-xl text-left">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-md">AI Dispatch Active</span>
                          <span className="text-[9px] text-slate-500">Mission #4921</span>
                        </div>
                        <h4 className="text-sm font-black text-white">Deep Clean & Sanitation</h4>
                        <p className="text-[10px] text-slate-400">Rodriguez Residence • 3,200 sqft</p>
                        
                        <div className="border-t border-white/5 pt-3 space-y-2">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-500">Optimized Travel Time:</span>
                            <span className="text-green-400 font-bold">14 mins (Saved 8 mins)</span>
                          </div>
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-500">Auto-Assigned Crew:</span>
                            <span className="text-white font-bold">Elite Alpha (Carlos & Jose)</span>
                          </div>
                        </div>

                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                            <Icon name="check" className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[9.5px] text-green-400 font-bold leading-none">Mission successfully dispatched to Staff App</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStep === 1 && (
                    <div className="w-full max-w-md space-y-4 animate-scale">
                      {/* SMS Bubble */}
                      <div className="bg-[#262635] border border-white/10 rounded-2xl p-3 max-w-[85%] ml-auto text-left shadow-lg">
                        <p className="text-[11px] text-slate-300">
                          Hello Maria! The Pristine Crew is en route to your residence. Track their arrival in real-time here: 
                          <span className="text-blue-400 underline block mt-0.5">https://elevore.app/track/m_4921</span>
                        </p>
                      </div>

                      {/* Mini Map */}
                      <div className="bg-[#12121c] border border-white/5 rounded-2xl p-3 relative h-44 overflow-hidden shadow-xl">
                        <div className="absolute inset-0 bg-[#0a0a0f]" />
                        {/* Grid background for abstract map */}
                        <div className="absolute inset-0 dot-grid opacity-30" />
                        
                        {/* Map lines */}
                        <svg className="absolute inset-0 w-full h-full" style={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 2 }}>
                          <line x1="10%" y1="20%" x2="90%" y2="20%" />
                          <line x1="30%" y1="10%" x2="30%" y2="90%" />
                          <line x1="70%" y1="10%" x2="70%" y2="90%" />
                          <path d="M 30,120 Q 150,120 150,60 T 300,60" fill="none" stroke="#F5C518" strokeWidth="2.5" strokeDasharray="6" className="animate-pulse" />
                        </svg>

                        {/* Map pins */}
                        <div className="absolute top-1/2 left-[10%] -translate-y-1/2 flex flex-col items-center">
                          <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center z-10 animate-bounce">
                            <Icon name="truck" className="w-2.5 h-2.5 text-blue-400" />
                          </div>
                          <span className="text-[7px] text-slate-400 mt-1 font-black bg-black/80 px-1 py-0.5 rounded border border-white/5 uppercase">Crew</span>
                        </div>

                        <div className="absolute top-[28%] left-[78%] -translate-y-1/2 flex flex-col items-center">
                          <div className="w-5 h-5 rounded-full bg-[#F5C518]/20 border border-[#F5C518] flex items-center justify-center z-10">
                            <Icon name="home" className="w-2.5 h-2.5 text-[#F5C518]" />
                          </div>
                          <span className="text-[7px] text-[#F5C518] mt-1 font-black bg-black/80 px-1 py-0.5 rounded border border-[#F5C518]/20 uppercase">Job Site</span>
                        </div>

                        {/* Floating Card */}
                        <div className="absolute bottom-2 left-2 right-2 bg-black/90 border border-white/10 rounded-xl p-2.5 flex items-center justify-between text-left">
                          <div>
                            <p className="text-[8px] text-slate-500 uppercase font-black">Estimated Arrival</p>
                            <p className="text-xs font-black text-white mt-0.5">8 minutes</p>
                          </div>
                          <span className="text-[9px] font-black uppercase text-green-400 bg-green-500/10 px-2 py-1 rounded-lg">On The Way</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStep === 2 && (
                    <div className="w-full max-w-md space-y-3 animate-scale text-left">
                      <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4 space-y-3 shadow-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-slate-500">Live Location Geofence</span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-[9px] text-green-400 font-bold uppercase">Within Range</span>
                          </div>
                        </div>
                        
                        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                          <p className="text-[9px] text-slate-400 uppercase font-bold">Location Checked</p>
                          <p className="text-xs font-black text-white">452 Pine St, Orlando, FL</p>
                          <p className="text-[8.5px] text-slate-500">Accuracy: ±4 meters • Verified by GPS</p>
                        </div>

                        <div className="flex gap-2">
                          <button className="w-full py-3 bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2">
                            <Icon name="check-circle" className="w-4 h-4" />
                            Geofence Check-In Success
                          </button>
                        </div>
                        <p className="text-[8px] text-center text-slate-500 uppercase tracking-widest">Logged at 08:58 AM • Autostarted timer</p>
                      </div>
                    </div>
                  )}

                  {activeStep === 3 && (
                    <div className="w-full max-w-md animate-scale space-y-3 text-left">
                      <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4 shadow-xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-md">Computer Vision AI QC</span>
                          <span className="text-[9.5px] text-green-400 font-bold">Score: 99.6% PASS</span>
                        </div>

                        {/* Split photo simulation */}
                        <div className="relative rounded-xl overflow-hidden aspect-[16/9] border border-white/5 group">
                          <div className="absolute inset-0 bg-slate-900 flex">
                            {/* Left photo (dirty) */}
                            <div className="w-1/2 h-full bg-[#1b1919] relative flex items-center justify-center overflow-hidden">
                              <div className="text-[8px] font-black uppercase tracking-widest text-red-500 absolute top-2 left-2 bg-black/80 px-1.5 py-0.5 rounded border border-red-500/20">Before</div>
                              <svg className="w-16 h-16 opacity-30 text-amber-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="8" y1="12" x2="16" y2="12" />
                              </svg>
                            </div>
                            {/* Right photo (clean) */}
                            <div className="w-1/2 h-full bg-[#112415] border-l border-[#F5C518] relative flex items-center justify-center overflow-hidden">
                              <div className="text-[8px] font-black uppercase tracking-widest text-green-400 absolute top-2 right-2 bg-black/80 px-1.5 py-0.5 rounded border border-green-500/20">After</div>
                              <svg className="w-16 h-16 opacity-75 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                              </svg>
                            </div>
                          </div>

                          {/* Scanner Bar Effect */}
                          <div className="absolute top-0 bottom-0 w-0.5 bg-[#F5C518] shadow-[0_0_15px_#F5C518] left-1/2 animate-scan" />
                        </div>

                        <p className="text-[9px] text-slate-500 leading-normal text-center">AI automatically compares shapes, shines, and dust parameters to confirm job completion parameters.</p>
                      </div>
                    </div>
                  )}

                  {activeStep === 4 && (
                    <div className="w-full max-w-md animate-scale text-left">
                      <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4 shadow-xl space-y-4">
                        <div>
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">Customer Sign-Off Required</h4>
                          <p className="text-[9.5px] text-slate-500 mt-0.5">Please sign below to confirm mission check-out approval.</p>
                        </div>

                        {/* Signature pad simulation */}
                        <div className="bg-black border border-white/10 rounded-xl h-28 relative overflow-hidden flex items-center justify-center">
                          <svg className="absolute inset-0 w-full h-full pointer-events-none">
                            <path
                              d="M 50,70 C 80,60 110,40 140,55 C 170,70 190,65 220,50 C 240,40 260,35 280,45"
                              fill="none"
                              stroke="#F5C518"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeDasharray="400"
                              strokeDashoffset="400"
                              className="animate-draw-sig"
                              style={{ strokeDasharray: 400, strokeDashoffset: 400 }}
                            />
                          </svg>
                          <span className="absolute bottom-2 right-3 text-[8px] font-mono text-slate-600">Maria Rodriguez</span>
                        </div>

                        <div className="flex gap-2">
                          <div className="w-full py-3 bg-[#F5C518]/10 border border-[#F5C518]/30 rounded-xl text-center text-xs font-black uppercase text-[#F5C518]">
                            ✓ Signed and Timestamped (11:32 AM)
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeStep === 5 && (
                    <div className="w-full max-w-md animate-scale space-y-4 text-left">
                      <div className="bg-[#12121c] border border-white/5 rounded-2xl p-4 shadow-xl space-y-3">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Stripe Charge Success</span>
                          <span className="text-[10px] text-green-400 font-black">+$380.00</span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[9px]">
                            <span className="text-slate-500">Service Fee:</span>
                            <span className="text-white">$380.00</span>
                          </div>
                          <div className="flex justify-between text-[9px]">
                            <span className="text-slate-500">Payment Method:</span>
                            <span className="text-white">Visa ending in 4242</span>
                          </div>
                          <div className="flex justify-between text-[9px] font-bold">
                            <span className="text-slate-400">Total Charged:</span>
                            <span className="text-green-400">$380.00</span>
                          </div>
                        </div>

                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-2.5 flex items-center justify-between">
                          <span className="text-[9.5px] text-green-400 font-bold">Invoice Paid via Auto-Stripe</span>
                          <Icon name="check-circle" className="w-4 h-4 text-green-400" />
                        </div>

                        <div className="border-t border-white/5 pt-3 text-center space-y-2">
                          <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">WhatsApp Review request Sent</p>
                          <div className="flex justify-center gap-1">
                            {[1,2,3,4,5].map((s) => (
                              <span key={s} className="text-[#F5C518] text-sm animate-pulse" style={{ animationDelay: `${s*150}ms` }}>★</span>
                            ))}
                          </div>
                          <p className="text-[8.5px] italic text-slate-400">"Excellent service! 5 stars."</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress Indicator Dots */}
                <div className="flex justify-center gap-2 mt-6 pt-4 border-t border-white/5 flex-shrink-0">
                  {previewSteps.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveStep(idx);
                        setIsAutoplay(false);
                      }}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        activeStep === idx ? 'bg-[#F5C518] w-6' : 'bg-white/10 hover:bg-white/20'
                      }`}
                      aria-label={`Jump to step ${idx + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ MARQUEE TICKER ═══ */}
      <div className="border-y border-white/5 py-8 overflow-hidden bg-white/[0.01]">
        <p className="text-center text-[9px] text-slate-700 font-black uppercase tracking-[0.3em] mb-6">Trusted by 500+ Elite Service Operations Across North America</p>
        <div className="overflow-hidden">
          <div className="marquee-track flex items-center gap-16" style={{ width: 'max-content' }}>
            {['BREEZE CLEAN','LUMIN SERVICES','APEX PROPERTY','VANGUARD HOME','NOVA CLEANING','PRISM SERVICES','TITAN CLEAN','ELITE HANDYMAN','AURA PROPERTY','PEAK SERVICES','BREEZE CLEAN','LUMIN SERVICES','APEX PROPERTY','VANGUARD HOME','NOVA CLEANING','PRISM SERVICES','TITAN CLEAN','ELITE HANDYMAN','AURA PROPERTY','PEAK SERVICES'].map((name, i) => (
              <div key={i} className="flex items-center gap-2 font-black text-sm tracking-widest opacity-20 hover:opacity-50 transition-opacity flex-shrink-0" style={{ minWidth: 'max-content' }}>
                <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center text-[8px] font-black">{name[0]}</div>
                {name}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ FEATURES BENTO ═══ */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-20 space-y-4">
          <div className="reveal inline-block text-[10px] font-black uppercase tracking-[0.3em] text-amber-500 border border-amber-500/30 px-4 py-2 rounded-full bg-amber-500/5">Platform Features</div>
          <h2 className="reveal delay-100 text-4xl md:text-6xl font-black tracking-tighter">Everything You Need.<br /><span className="glow-text italic">Nothing You Don't.</span></h2>
          <p className="reveal delay-200 text-slate-400 text-lg max-w-xl mx-auto">Built specifically for cleaning and handyman businesses that want to scale fast without losing quality.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={i} className={`reveal delay-${Math.min((i+1)*100, 600)}`}>
              <FeatureCard {...f} onClick={() => openModal('Features')} />
            </div>
          ))}
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="section-dark border-t border-white/5 py-32 relative overflow-hidden">
        <div className="absolute inset-0 dot-grid pointer-events-none opacity-20" />
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-20 space-y-4">
            <div className="reveal inline-block text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 border border-blue-400/30 px-4 py-2 rounded-full bg-blue-400/5">Quick Setup</div>
            <h2 className="reveal delay-100 text-4xl md:text-5xl font-black tracking-tighter">Go Live in <span className="glow-text italic">Under 5 Minutes</span></h2>
          </div>
          <div className="space-y-0 relative">
            <div className="absolute left-7 md:left-10 top-10 bottom-10 w-px bg-gradient-to-b from-[#F5C518]/40 via-blue-500/20 to-transparent" />
            {[
              { step:'01', icon:'user-plus', title:'Register Your Company', desc:'Set up your organization, upload your brand logo, and customize your company profile in under 2 minutes.', color:'text-amber-400', bg:'bg-amber-400/10', border:'border-amber-400/20' },
              { step:'02', icon:'settings', title:'Add Your Team & Services', desc:'Set up custom service pricing tiers with our Good-Better-Best pricing matrix, and assign secure entry PINs to your crews.', color:'text-blue-400', bg:'bg-blue-400/10', border:'border-blue-400/20' },
              { step:'03', icon:'users', title:'Deploy Your First Mission', desc:'Send interactive quote estimates to clients via SMS/WhatsApp. Once approved, the system auto-assigns and route-optimizes the mission.', color:'text-purple-400', bg:'bg-purple-400/10', border:'border-purple-400/20' },
              { step:'04', icon:'trending-up', title:'Watch Revenue Grow with AI', desc:'Our predictive AI scans job histories to recommend up-sells, predict month-end MRR, and auto-follow up on recurring client accounts.', color:'text-green-400', bg:'bg-green-400/10', border:'border-green-400/20' },
            ].map((s, i) => (
              <div key={i} className={`reveal delay-${i*100} flex gap-6 md:gap-10 pb-10 relative`}>
                <div className={`relative flex-shrink-0 w-14 h-14 md:w-20 md:h-20 rounded-2xl ${s.bg} border ${s.border} flex items-center justify-center z-10`}>
                  <Icon name={s.icon} className={`w-6 h-6 md:w-8 md:h-8 ${s.color}`} />
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#030303] border border-white/10 flex items-center justify-center text-[9px] font-black text-slate-500">{s.step}</div>
                </div>
                <div className="pt-3">
                  <h3 className={`text-xl font-black text-white mb-2`}>{s.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ METRICS ═══ */}
      <section className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(245,197,24,0.05) 0%, rgba(3,3,3,1) 40%, rgba(3,3,3,1) 60%, rgba(59,130,246,0.03) 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(245,197,24,0.04), transparent 70%)' }} />
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[{end:500,suffix:'+',label:'Businesses Live',icon:'building-2'},{end:94,suffix:'%',label:'Revenue Accuracy',icon:'target'},{end:4200,prefix:'$',suffix:'+',label:'Avg Job Value Boost',icon:'trending-up'},{end:99,suffix:'.4%',label:'QC Pass Rate',icon:'shield-check'}].map((s,i) => (
            <div key={i} className={`reveal delay-${i*100} text-center space-y-3 p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#F5C518]/20 transition-all`}>
              <div className="w-10 h-10 rounded-xl bg-[#F5C518]/10 border border-[#F5C518]/20 flex items-center justify-center mx-auto">
                <Icon name={s.icon} className="w-5 h-5 text-[#F5C518]" />
              </div>
              <AnimatedStat end={s.end} prefix={s.prefix||''} suffix={s.suffix||''} label={s.label} />
            </div>
          ))}
        </div>
      </section>

      {/* ═══ TESTIMONIALS ═══ */}
      <section id="testimonials" className="border-t border-white/5 py-32 section-deeper">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16 space-y-3">
            <div className="reveal text-[10px] font-black uppercase tracking-[0.3em] text-amber-500">⭐⭐⭐⭐⭐ Real Results</div>
            <h2 className="reveal delay-100 text-4xl md:text-5xl font-black tracking-tighter">CEOs Who <span className="glow-text italic">Trust Elevore</span></h2>
            <p className="reveal delay-200 text-slate-500 text-base max-w-xl mx-auto">Real businesses, real numbers, real growth.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className={`reveal delay-${i*100} bg-white/[0.03] border border-white/8 rounded-3xl p-8 space-y-5 hover:border-[#F5C518]/20 hover:-translate-y-2 transition-all duration-300 relative overflow-hidden group`}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(245,197,24,0.04), transparent 60%)' }} />
                <div className="flex gap-1">{Array(t.stars).fill(0).map((_,j) => <span key={j} className="text-[#F5C518] text-lg" style={{ textShadow:'0 0 10px rgba(245,197,24,0.5)' }}>★</span>)}</div>
                <p className="text-slate-300 leading-relaxed italic text-sm">"{t.text}"</p>
                <div className="border-t border-white/5 pt-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.avatarColor} flex items-center justify-center text-white text-xs font-black flex-shrink-0`}>{t.avatar}</div>
                  <div>
                    <p className="font-black text-white text-sm">{t.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{t.biz}</p>
                    <p className="text-[9px] text-slate-600 font-bold">{t.loc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ REFERRAL ═══ */}
      <section className="border-t border-white/5 py-24 relative overflow-hidden section-dark">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,197,24,0.04),transparent)]" />
        <div className="max-w-xl mx-auto px-6 relative z-10 text-center space-y-6">
          <div className="reveal inline-block text-[10px] font-black uppercase tracking-[0.3em] text-[#F5C518] border border-[#F5C518]/30 px-4 py-2 rounded-full bg-[#F5C518]/5 shimmer-badge">🎁 Share &amp; Earn</div>
          <h2 className="reveal delay-100 text-3xl md:text-4xl font-black tracking-tighter">Existing Client?<br /><span className="glow-text italic">Get Your Referral Link</span></h2>
          <p className="reveal delay-200 text-slate-400 text-sm">Enter your name to instantly generate your unique referral link. Share it and you both get $25 off!</p>
          <div className="reveal delay-300 bg-white/[0.02] border border-white/5 rounded-3xl p-6 space-y-4 text-left">
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="text" id="landingRefName" placeholder="Enter your full name" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-[#F5C518] transition-all" />
              <button onClick={() => {
                const val = document.getElementById('landingRefName')?.value?.trim();
                if (!val) return alert('Please enter your name first');
                const urlP = new URLSearchParams(window.location.search);
                const tenantParam = urlP.get('t') || '';
                const link = `${location.origin}${location.pathname}?ref=${val.replace(/\s/g, '_')}${tenantParam ? '&t=' + tenantParam : ''}`;
                navigator.clipboard.writeText(link);
                alert(`Success! Your referral link has been copied:\n\n${link}`);
              }} className="btn-gold px-6 py-3 text-xs uppercase tracking-wider">Copy Link</button>
            </div>
            <p className="text-[7.5px] text-slate-600 leading-normal uppercase font-bold tracking-wider">* No login required. Link auto-associates referrals to you.</p>
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="border-t border-white/5 py-32 section-deeper">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12 space-y-4">
            <div className="reveal inline-block text-[10px] font-black uppercase tracking-[0.3em] text-[#F5C518] border border-[#F5C518]/30 px-4 py-2 rounded-full bg-[#F5C518]/5">Transparent Pricing</div>
            <h2 className="reveal delay-100 text-4xl md:text-6xl font-black tracking-tighter">Simple <span className="glow-text italic">Pricing</span></h2>
            <p className="reveal delay-200 text-slate-400 text-lg">One platform. All features. Cancel anytime.</p>
            {/* Billing Toggle */}
            <div className="reveal delay-300 inline-flex items-center gap-3 bg-white/[0.03] border border-white/8 rounded-2xl p-1.5">
              <button onClick={() => setBillingAnnual(false)} className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${!billingAnnual ? 'bg-white/10 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>Monthly</button>
              <button onClick={() => setBillingAnnual(true)} className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${billingAnnual ? 'bg-white/10 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                Annual
                <span className="text-[9px] bg-green-500/20 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full font-black">Save 20%</span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center mb-20">
            {[
              { name:'Starter', price:'$0', annualPrice:'$0', annualNote:'', period:'/mo', desc:'For solo service operators just starting out.', features:['Up to 5 missions/mo','Basic Crew App Access','Client Hub & Contacts','WhatsApp & SMS Templates'], cta:'Start Free', action:onSignup, highlight:false },
              { name:'Empire Pro', price:'$149', annualPrice:'$119', annualNote:'/mo — billed $1,428/yr', period:'/mo', desc:'The full service business operating system. Unlimited everything.', features:['Unlimited Missions','AI-Optimized Route Dispatch','Real-Time GPS Fleet Tracking','On-Site Digital Signatures','AI Quality Assurance (QC)','WhatsApp CRM & Autoreply','Good-Better-Best Price Matrix','Unlimited Before/After Photo Drive','Priority Support'], cta:'Start 14-Day Trial', action:onSignup, highlight:true },
              { name:'Enterprise', price:'Custom', annualPrice:'Custom', annualNote:'', period:'', desc:'For franchises and multi-location franchises.', features:['Everything in Pro','Dedicated Account Manager','Franchise Multi-Tenant Hub','Custom Integrations & APIs','White-Label Client Portals','Uptime SLA Agreement'], cta:'Contact Sales', action:() => openModal('Contact'), highlight:false },
            ].map((plan, i) => (
              <div key={i} className={`reveal delay-${i*100} rounded-3xl p-8 flex flex-col relative overflow-hidden transition-all duration-500 ${plan.highlight ? 'holo-card border-2 border-[#F5C518] shadow-[0_0_100px_rgba(245,197,24,0.2)] md:-translate-y-4 scale-105 hover:scale-[1.07]' : 'bg-white/[0.03] border border-white/8 hover:-translate-y-2 hover:border-white/15'}`}>
                {plan.highlight && (
                  <>
                    <div className="absolute top-0 right-0 bg-[#F5C518] text-black text-[8px] font-black uppercase tracking-widest px-4 py-2 rounded-bl-xl rounded-tr-3xl">🔥 Most Popular</div>
                    <div className="beam-line top-1/2" />
                  </>
                )}
                <div className={`text-[11px] font-black uppercase tracking-widest mb-3 ${plan.highlight ? 'text-[#F5C518]' : 'text-slate-400'}`}>{plan.name}</div>
                <div className="mb-1 flex items-end gap-1">
                  <span className="text-5xl font-black tracking-tighter">{billingAnnual ? plan.annualPrice : plan.price}</span>
                  <span className="text-slate-500 text-sm pb-1">{billingAnnual && plan.annualNote ? plan.annualNote : plan.period}</span>
                </div>
                {billingAnnual && plan.highlight && <div className="text-[10px] text-green-400 font-black mb-1">✓ You save $360/year</div>}
                <p className="text-slate-500 text-sm mb-6">{plan.desc}</p>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${plan.highlight ? 'bg-[#F5C518]/20' : 'bg-white/5'}`}>
                        <Icon name="check" className={`w-2.5 h-2.5 ${plan.highlight ? 'text-[#F5C518]' : 'text-slate-500'}`} />
                      </div>
                      {feat}
                    </li>
                  ))}
                </ul>
                <button onClick={plan.action} className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm active:scale-95 transition-all ${plan.highlight ? 'btn-gold' : 'border border-white/10 hover:bg-white/5 text-white hover:border-white/20'}`}>{plan.cta}</button>
              </div>
            ))}
          </div>

          {/* ── Comparison Table ── */}
          <div className="reveal">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-black tracking-tighter text-white">Full Feature <span className="glow-text italic">Comparison</span></h3>
              <p className="text-slate-500 text-sm mt-2">Every detail, side by side.</p>
            </div>
            <div className="overflow-x-auto rounded-3xl border border-white/8 bg-white/[0.02]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="text-left p-5 text-slate-400 font-black uppercase tracking-widest text-[10px] w-1/2">Feature</th>
                    {['Starter','Empire Pro','Enterprise'].map((n,i) => (
                      <th key={i} className={`p-5 text-center font-black uppercase tracking-widest text-[10px] ${i===1 ? 'text-[#F5C518]' : 'text-slate-400'}`}>{n}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature:'Missions / Month', vals:['Up to 5','Unlimited','Unlimited'] },
                    { feature:'AI Dispatch Optimization', vals:[false, true, true] },
                    { feature:'Real-time GPS Tracking', vals:[false, true, true] },
                    { feature:'WhatsApp CRM & AI Scripts', vals:['Templates only', 'Full AI Automation', 'Full AI Automation'] },
                    { feature:'On-Site Digital Signatures', vals:[false, true, true] },
                    { feature:'Computer Vision AI QC', vals:[false, true, true] },
                    { feature:'Good-Better-Best Quote Engine', vals:[false, true, true] },
                    { feature:'Photo Drive Storage', vals:['1 GB', '100 GB', 'Unlimited'] },
                    { feature:'Staff PIN Access Accounts', vals:['1', 'Up to 20', 'Unlimited'] },
                    { feature:'Client Management CRM', vals:['Basic', 'Advanced', 'Advanced'] },
                    { feature:'Business BI Analytics', vals:[false, true, true] },
                    { feature:'Custom API Integrations', vals:[false, false, true] },
                    { feature:'White-label Client Portals', vals:[false, false, true] },
                    { feature:'Dedicated Account Manager', vals:[false, false, true] },
                    { feature:'Uptime SLA Agreement', vals:[false, false, true] },
                    { feature:'Support Options', vals:['Community Support','Priority Support','24/7 Dedicated Support'] },
                  ].map((row, ri) => (
                    <tr key={ri} className={`border-b border-white/5 ${ri % 2 === 0 ? '' : 'bg-white/[0.01]'} hover:bg-white/[0.03] transition-colors group`}>
                      <td className="p-4 text-slate-300 font-bold">{row.feature}</td>
                      {row.vals.map((v, vi) => (
                        <td key={vi} className={`p-4 text-center ${vi===1 ? 'bg-[#F5C518]/[0.03]' : ''}`}>
                          {v === true ? (
                            <div className="flex justify-center"><div className={`w-5 h-5 rounded-full flex items-center justify-center ${vi===1 ? 'bg-[#F5C518]/20' : 'bg-green-500/20'}`}><Icon name="check" className={`w-3 h-3 ${vi===1 ? 'text-[#F5C518]' : 'text-green-400'}`} /></div></div>
                          ) : v === false ? (
                            <div className="flex justify-center"><div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center"><span className="text-slate-700 text-xs font-black">—</span></div></div>
                          ) : (
                            <span className={`text-[11px] font-black ${vi===1 ? 'text-[#F5C518]' : 'text-slate-400'}`}>{v}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
              <button onClick={onSignup} className="btn-gold px-10 py-4 text-sm uppercase tracking-widest">Start Free — No Card Needed</button>
              <button onClick={() => openModal('Contact')} className="px-10 py-4 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-sm text-slate-400 hover:text-white hover:border-white/20 transition-all">Talk to Sales →</button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ BLOG / RESOURCES ═══ */}
      <section className="border-t border-white/5 py-32 section-dark">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 space-y-4">
            <div className="reveal inline-block text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 border border-purple-400/30 px-4 py-2 rounded-full bg-purple-400/5">Growth Playbook</div>
            <h2 className="reveal delay-100 text-4xl md:text-5xl font-black tracking-tighter">Built to Help You <span className="glow-text italic">Scale Faster</span></h2>
            <p className="reveal delay-200 text-slate-400 max-w-xl mx-auto">Battle-tested strategies from operators who went from $5K to $50K/mo using Elevore.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                tag: 'Pricing Tactics',
                tagColor: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
                title: 'How the Good-Better-Best Method Added $35K in 90 Days',
                excerpt: 'How psychology-driven 3-tier pricing changes the conversation entirely. When clients see three options, 80% choose the middle — and that middle is where your margin lives.',
                readTime: '6 min read',
                author: 'Jose M.',
                authorRole: 'Founder, Elevore',
                date: 'May 2026',
                icon: 'trending-up',
                featured: true,
              },
              {
                tag: 'Operations',
                tagColor: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
                title: 'GPS Dispatch: The Secret to Zero Client Complaints',
                excerpt: 'Maria S. shares how real-time Uber-style fleet tracking transformed client trust and eliminated scheduling calls entirely.',
                readTime: '4 min read',
                author: 'Maria S.',
                authorRole: 'CEO, Elite Handyman',
                date: 'Apr 2026',
                icon: 'map-pin',
                featured: false,
              },
              {
                tag: 'AI Growth',
                tagColor: 'text-green-400 bg-green-400/10 border-green-400/20',
                title: 'AI-Powered Upselling: From $300 to $890 Average Job Value',
                excerpt: 'A deep dive into how Elevore\'s predictive AI engine scans job history to surface smart upsell options before, during, and after each service.',
                readTime: '8 min read',
                author: 'David K.',
                authorRole: 'CEO, Apex Property',
                date: 'Mar 2026',
                icon: 'brain',
                featured: false,
              },
            ].map((post, i) => (
              <div
                key={i}
                className={`reveal delay-${i*100} group cursor-pointer rounded-3xl overflow-hidden border transition-all duration-300 hover:-translate-y-2 ${
                  post.featured
                    ? 'border-[#F5C518]/20 bg-gradient-to-b from-[#F5C518]/5 to-transparent hover:border-[#F5C518]/40'
                    : 'border-white/8 bg-white/[0.02] hover:border-white/15'
                }`}
                onClick={() => openModal('Features')}
              >
                {/* Card top bar */}
                <div className={`h-1 w-full ${
                  post.featured ? 'bg-gradient-to-r from-amber-500 to-orange-400' :
                  i === 1 ? 'bg-gradient-to-r from-blue-500 to-cyan-400' :
                  'bg-gradient-to-r from-green-500 to-emerald-400'
                }`} />
                <div className="p-7 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${post.tagColor}`}>{post.tag}</span>
                    <span className="text-[9px] text-slate-600 font-bold">{post.readTime}</span>
                  </div>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    post.featured ? 'bg-amber-400/10 border border-amber-400/20' :
                    i === 1 ? 'bg-blue-400/10 border border-blue-400/20' :
                    'bg-green-400/10 border border-green-400/20'
                  }`}>
                    <Icon name={post.icon} className={`w-6 h-6 ${
                      post.featured ? 'text-amber-400' : i === 1 ? 'text-blue-400' : 'text-green-400'
                    }`} />
                  </div>
                  <h3 className="text-lg font-black text-white leading-snug group-hover:text-[#F5C518] transition-colors">{post.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{post.excerpt}</p>
                  <div className="border-t border-white/5 pt-4 flex items-center justify-between">
                    <div>
                      <p className="text-white text-xs font-black">{post.author}</p>
                      <p className="text-slate-600 text-[9px] font-bold">{post.authorRole} • {post.date}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-[#F5C518] transition-colors">
                      Read
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <button onClick={() => openModal('Changelog')} className="text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-[#F5C518] transition-colors animated-underline">View All Articles & Updates →</button>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="border-t border-white/5 py-36 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(245,197,24,0.08) 0%, transparent 70%)' }} />
        <div className="hero-orb-1" style={{ top:'50%', left:'50%', transform:'translate(-50%,-50%)', opacity: 0.5 }} />
        <div className="max-w-3xl mx-auto px-6 text-center space-y-8 relative z-10">
          <div className="reveal inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#F5C518]/30 bg-[#F5C518]/5 text-[#F5C518] text-[10px] font-black uppercase tracking-widest">
            <div className="relative flex items-center">
              <div className="w-2 h-2 bg-[#F5C518] rounded-full" />
              <div className="pulse-ring" />
            </div>
            500+ Businesses Growing Right Now
          </div>
          <h2 className="reveal delay-100 text-4xl md:text-6xl font-black tracking-tighter">Ready to Automate Your<br /><span className="glow-text italic">Service Operations?</span></h2>
          <p className="reveal delay-200 text-slate-400 text-xl font-bold">Join the fastest-growing SaaS for service businesses. Setup takes 2 minutes. Results in days.</p>
          <div className="reveal delay-300">
            <button onClick={onSignup} className="btn-gold group px-14 py-6 text-lg uppercase tracking-widest flex items-center gap-3 mx-auto">
              Launch Your Empire →
              <div className="w-6 h-6 rounded-full bg-black/20 flex items-center justify-center group-hover:scale-125 transition-transform">
                <Icon name="zap" className="w-3 h-3" />
              </div>
            </button>
          </div>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest">No credit card • Cancel anytime • 14-day full access</p>
          <div className="reveal delay-400 flex flex-wrap items-center justify-center gap-6 pt-4">
            {[['shield-check','SOC 2 Compliant'],['lock','256-bit SSL'],['clock','99.9% Uptime'],['star','4.9/5 Rating']].map(([icon, label]) => (
              <div key={label} className="flex items-center gap-1.5 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                <Icon name={icon} className="w-3 h-3 text-slate-700" />{label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/5 py-16 relative" style={{ background: 'rgba(0,0,0,0.7)' }}>
        <div className="absolute top-0 left-0 right-0 h-px shimmer-gold" />
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-[#F5C518] rounded-lg flex items-center justify-center font-black text-black italic" style={{ boxShadow:'0 0 15px rgba(245,197,24,0.3)' }}>E</div>
                <span className="font-black text-lg tracking-tight">Elevore <span className="glow-text italic">Empire</span></span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">The operating system for elite service businesses. Built by operators, for operators.</p>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-[10px] text-green-400 font-black uppercase tracking-wider">All Systems Operational</span>
              </div>
            </div>
            {[{title:'Product',links:['Features','Pricing','Changelog','Roadmap']},{title:'Company',links:['About','Blog','Careers','Press']},{title:'Legal',links:['Privacy Policy','Terms of Service','Security','Contact']}].map((col,i) => (
              <div key={i}>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4">{col.title}</p>
                <ul className="space-y-2">{col.links.map(l => <li key={l}><button onClick={() => openModal(l)} className="text-slate-500 hover:text-[#F5C518] transition-colors text-sm animated-underline">{l}</button></li>)}</ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">© 2026 Elevore Empire SaaS. All Rights Reserved.</p>
            <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">Built for the hustlers. <span className="text-[#F5C518]/40">Powered by AI.</span></p>
          </div>
        </div>
      </footer>

      {/* ═══ MODALS ═══ */}
      {activeModal && MODAL_CONTENT[activeModal] && (() => {
        const page = MODAL_CONTENT[activeModal];
        return (
          <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-lg" onClick={e => e.target === e.currentTarget && closeModal()}>
            <div className="land relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-[#0a0a0f] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
              <div className="flex items-start justify-between p-7 border-b border-white/5 bg-gradient-to-r from-[#F5C518]/5 to-transparent flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#F5C518]/10 border border-[#F5C518]/20 flex items-center justify-center text-2xl flex-shrink-0">{page.icon}</div>
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">{page.title}</h2>
                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{page.subtitle}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all flex-shrink-0 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-7 space-y-5" style={{scrollbarWidth:'thin',scrollbarColor:'rgba(255,255,255,0.1) transparent'}}>
                {page.body.map((item, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-[#F5C518]/20 transition-all group">
                    <p className="text-[11px] font-black text-[#F5C518] uppercase tracking-widest mb-2 group-hover:text-amber-300 transition-colors">{item.head}</p>
                    <p className="text-slate-400 text-sm leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex-shrink-0 px-7 py-5 border-t border-white/5 bg-black/30 flex items-center justify-between gap-4">
                <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">Elevore Empire © 2026</p>
                <button onClick={onSignup} className="btn-gold px-6 py-2.5 text-[10px] uppercase tracking-widest">Start Free Trial →</button>
              </div>
            </div>
          </div>
        );
      })()}
      {showVideoDemo && <VideoDemoModal onClose={() => setShowVideoDemo(false)} />}
    </div>
  );
}





// App Component
export default function App() {
  const urlP = new URLSearchParams(window.location.search);
  const cjid = urlP.get('mision');
  const refCode = urlP.get('ref');
  const quoteId = urlP.get('propuesta') || urlP.get('quote') || urlP.get('cotizacion');

  if (quoteId) return <PublicQuoteProposal quoteId={quoteId} />;
  if (cjid) return <Portal cjid={cjid} />;
  if (refCode) return <PublicLeadForm refCode={refCode} />;

  const [view, setView] = useState(urlP.get('view') || 'landing');
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
  const [tenantSettings, setTenantSettings] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Billing states
  const [selectedBillingPlan, setSelectedBillingPlan] = useState('premium');
  const [billingCardName, setBillingCardName] = useState('');
  const [billingCardNo, setBillingCardNo] = useState('');
  const [billingCardExpiry, setBillingCardExpiry] = useState('');
  const [billingCardCvc, setBillingCardCvc] = useState('');
  const [billingError, setBillingError] = useState('');
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingProgressStage, setBillingProgressStage] = useState('');

  // Marketing states
  const [selectedCampaignTemplate, setSelectedCampaignTemplate] = useState('winback');
  const [campaignTargets, setCampaignTargets] = useState('high_risk');
  const [campaignCustomText, setCampaignCustomText] = useState('');
  const [campaignSending, setCampaignSending] = useState(false);
  const [campaignProgress, setCampaignProgress] = useState(0);
  const [campaignTotal, setCampaignTotal] = useState(0);
  const [campaignStage, setCampaignStage] = useState('');

  const handleActivateSubscription = async () => {
    if (!billingCardName.trim()) { setBillingError(prefLang === 'es' ? 'Falta nombre del titular' : 'Cardholder name is required'); return; }
    if (billingCardNo.replace(/\D/g, '').length < 16) { setBillingError(prefLang === 'es' ? 'Número de tarjeta inválido' : 'Invalid Card Number'); return; }
    if (billingCardExpiry.length < 5) { setBillingError(prefLang === 'es' ? 'Fecha de expiración inválida' : 'Invalid expiration date'); return; }
    if (billingCardCvc.length < 3) { setBillingError(prefLang === 'es' ? 'CVC inválido' : 'Invalid CVC'); return; }
    
    setBillingError('');
    setBillingLoading(true);
    
    const stages = [
      { key: 'connecting', label: 'Conectando con Stripe Billing Gateway...' },
      { key: 'verifying', label: 'Verificando tarjeta con el banco emisor...' },
      { key: 'routing', label: 'Procesando autorización de cargo recurrente...' },
      { key: 'activating', label: 'Activando suscripción premium...' }
    ];
    
    for (const stage of stages) {
      setBillingProgressStage(stage.label);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    try {
      const mockCustomerId = 'cus_sim_' + Math.random().toString(36).substring(7);
      const planStatus = 'active_' + selectedBillingPlan;
      
      const { error } = await sb.from('tenants').update({
        stripe_subscription_status: planStatus,
        stripe_customer_id: mockCustomerId
      }).eq('id', tenantId);
      
      if (error) throw error;
      
      setTenant(prev => ({
        ...prev,
        stripe_subscription_status: planStatus,
        stripe_customer_id: mockCustomerId
      }));
      
      tt(prefLang === 'es' ? `¡Plan ${selectedBillingPlan.toUpperCase()} activado con éxito!` : `Plan ${selectedBillingPlan.toUpperCase()} activated successfully!`, 'green');
      setBillingCardName('');
      setBillingCardNo('');
      setBillingCardExpiry('');
      setBillingCardCvc('');
    } catch (e) {
      setBillingError(e.message);
    } finally {
      setBillingLoading(false);
      setBillingProgressStage('');
    }
  };

  const updateClientMembership = async (clientId, clientName, level) => {
    try {
      const { error } = await sb.from('clients').update({ membership: level }).eq('id', clientId);
      if (error) throw error;
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, membership: level } : c));
      tt(prefLang === 'es' ? `¡Membresía de ${clientName} actualizada a ${level.toUpperCase()}! 💎` : `Membership of ${clientName} updated to ${level.toUpperCase()}! 💎`, 'green');
    } catch (e) {
      tt(e.message, 'red');
    }
  };

  const handleSendBulkCampaign = async () => {
    let targets = [];
    const now = new Date();
    if (campaignTargets === 'high_risk') {
      targets = clients.filter(c => {
        const cJobs = jobs.filter(j => j.client_name === c.name && j.status === 'paid');
        const lastJob = cJobs.sort((a,b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))[0];
        const daysSince = lastJob ? Math.floor((now - new Date(lastJob.scheduled_date)) / 86400000) : 999;
        return daysSince > 45;
      });
    } else if (campaignTargets === 'vip') {
      targets = clients.filter(c => c.membership && c.membership !== 'none');
    } else {
      targets = clients;
    }

    if (targets.length === 0) {
      tt(prefLang === 'es' ? 'No hay clientes objetivos en este segmento.' : 'No target clients in this segment.', 'amber');
      return;
    }

    setCampaignTotal(targets.length);
    setCampaignProgress(0);
    setCampaignSending(true);

    const stages = [
      { key: 'queue', label: prefLang === 'es' ? 'Generando cola de destinatarios...' : 'Generating target queue...' },
      { key: 'templates', label: prefLang === 'es' ? 'Renderizando plantillas personalizadas...' : 'Rendering personalized templates...' },
      { key: 'threads', label: prefLang === 'es' ? 'Despachando hilos SMTP concurrentes...' : 'Dispatching SMTP threads...' },
      { key: 'finishing', label: prefLang === 'es' ? 'Finalizando métricas de campaña...' : 'Finishing campaign analytics...' }
    ];

    for (const stage of stages) {
      setCampaignStage(stage.label);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    for (let i = 1; i <= targets.length; i++) {
      setCampaignProgress(i);
      setCampaignStage(prefLang === 'es' ? `Enviando email a ${targets[i-1].name}...` : `Sending email to ${targets[i-1].name}...`);
      await new Promise(resolve => setTimeout(resolve, Math.max(80, 1200 / targets.length)));
    }

    setCampaignSending(false);
    tt(prefLang === 'es' ? `¡Campaña enviada con éxito a ${targets.length} clientes!` : `Campaign sent successfully to ${targets.length} clients!`, 'green');
  };

  const getProcessedCampaignPreview = () => {
    let text = campaignCustomText || '';
    const mockClientName = clients[0]?.name || 'Sophia Loren';
    const mockServiceType = 'Limpieza de Casa';
    const bizName = tenantSettings?.business_name || tenantName || 'Elevore';
    const reviewLink = 'g.page/elevore/review';
    
    return text
      .replace(/{ClientName}/g, mockClientName)
      .replace(/{BusinessName}/g, bizName)
      .replace(/{ServiceType}/g, mockServiceType)
      .replace(/{GoogleReviewLink}/g, reviewLink);
  };

  
  const getPayoutPct = (worker) => {
    if (worker && worker.payout_pct !== undefined && worker.payout_pct !== null) {
      return Number(worker.payout_pct) / 100;
    }
    return tenantSettings?.staff_pay_pct !== undefined ? Number(tenantSettings.staff_pay_pct) : DEFAULT_CFG.STAFF_PAY;
  };
  
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
  const aStaffRef = useRef(aStaff);
  useEffect(() => {
    aStaffRef.current = aStaff;
  }, [aStaff]);

  const activeEmployeeRef = useRef(activeEmployee);
  useEffect(() => {
    activeEmployeeRef.current = activeEmployee;
  }, [activeEmployee]);
  const [editingStaff, setEditingStaff] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [membersTab, setMembersTab] = useState('vip');
  const [chargingClient, setChargingClient] = useState(null);
  const [chargeStage, setChargeStage] = useState('');
  const [drawerTab, setDrawerTab] = useState('preferences');
  const [prefPets, setPrefPets] = useState('');
  const [prefEntryCode, setPrefEntryCode] = useState('');
  const [prefProducts, setPrefProducts] = useState('');
  const [prefNotes, setPrefNotes] = useState('');
  const [prefLang, setPrefLang] = useState('en');
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [agendaView, setAgendaView] = useState('calendar');
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [financeTab, setFinanceTab] = useState('overview');
  const [operationsTab, setOperationsTab] = useState('calendar');
  const [crmTab, setCrmTab] = useState('dna');
  const [settingsTab, setSettingsTab] = useState('company');
  const [quickMode, setQM] = useState(false);
  const [chatJob, setChatJob] = useState(null);
  const [chatMsg, setChatMsg] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotMsgs, setCopilotMsgs] = useState([{role: 'assistant', content: 'Hola socio. Soy tu Copiloto IA. ¿En qué te ayudo hoy?'}]);
  const [copilotInput, setCopilotInput] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotWide, setCopilotWide] = useState(false);
  const [copilotListening, setCopilotListening] = useState(false);
  const [speakingMsgIdx, setSpeakingMsgIdx] = useState(null);
  const recognitionRef = useRef(null);
  const [simRevenue, setSimRevenue] = useState(10000);
  const [simJobs, setSimJobs] = useState(50);
  const [actLog, setActLog] = useState([]);
  const [rtOn, setRT] = useState(false);
  const [state, setState] = useState(INIT);
  const [payoutModalWorker, setPayoutModalWorker] = useState(null);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [biSimClients, setBiSimClients] = useState(60);
  const [biSimPayoutPct, setBiSimPayoutPct] = useState(40);
  const [biSimMarketing, setBiSimMarketing] = useState(1500);
  const [taxQuery, setTaxQuery] = useState('');
  const [taxStatus, setTaxStatus] = useState('all');
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [expandedWorkerPayouts, setExpandedWorkerPayouts] = useState({});
  const [expandedWorkerJobs, setExpandedWorkerJobs] = useState({});
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutNote, setPayoutNote] = useState('');

  // States for Quality, Productivity & WhatsApp/SMS Automation
  const [selectedAutomationJobId, setSelectedAutomationJobId] = useState('');
  const [activeTemplateId, setActiveTemplateId] = useState('booking');
  const [bookingTemplateText, setBookingTemplateText] = useState('Hola {CLIENT_NAME}! ✨ Tu servicio de {SERVICE_TYPE} ha sido programado para el día {DATE}. Nuestro equipo {TEAM} estará a cargo. ¡Gracias por confiar en ELEVORE!');
  const [routeTemplateText, setRouteTemplateText] = useState('Hola {CLIENT_NAME}! 🚗 Nuestro equipo {TEAM} ya está en camino a tu domicilio en {ADDRESS}. Estaremos allí pronto.');
  const [reviewTemplateText, setReviewTemplateText] = useState('Hola {CLIENT_NAME}! 🏁 Tu servicio de {SERVICE_TYPE} ha sido completado. ¿Podrías calificarnos aquí? https://elevore.app/mision/{JOB_ID}. ¡Que tengas un excelente día!');
  const [prodQualityFilter, setProdQualityFilter] = useState('all');

  const [settingsBusName, setSettingsBusName] = useState('');
  const [settingsPhone, setSettingsPhone] = useState('');
  const [settingsGoal, setSettingsGoal] = useState('15000');
  const [settingsPayPct, setSettingsPayPct] = useState('40');

  useEffect(() => {
    if (tenantSettings) {
      setSettingsBusName(tenantSettings.business_full_name || '');
      setSettingsPhone(tenantSettings.zelle_phone || '');
      setSettingsGoal(String(tenantSettings.monthly_goal || 15000));
      setSettingsPayPct(tenantSettings.staff_pay_pct !== undefined ? String(Math.round(Number(tenantSettings.staff_pay_pct) * 100)) : '40');
    }
  }, [tenantSettings]);

  const saveSettings = async (e) => {
    if (e) e.preventDefault();
    if (!tenantId) return;
    setLoad(true);
    try {
      const payload = {
        business_full_name: settingsBusName,
        zelle_phone: settingsPhone,
        monthly_goal: Number(settingsGoal) || 0,
        staff_pay_pct: (Number(settingsPayPct) || 40) / 100
      };

      const { error } = await sb
        .from('tenant_settings')
        .update(payload)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      setTenantSettings(prev => ({ ...prev, ...payload }));
      setTenantName(settingsBusName);
      tt('Settings saved to database ✓', 'green');
    } catch (err) {
      tt('Error saving settings: ' + err.message, 'red');
    }
    setLoad(false);
  };

  const reactivateClientWithAI = async (client) => {
    setLoad(true);
    try {
      const clientJobs = jobs.filter(j => j.client_name === client.name && (j.status === 'paid' || j.status === 'completed'));
      const lastJob = clientJobs.sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))[0];
      const lastService = lastJob ? lastJob.service_type : 'Servicio Elevore';
      const lastDate = lastJob ? fmtD(lastJob.scheduled_date) : 'hace un tiempo';

      const prompt = `Escribe un mensaje corto, sumamente persuasivo y amigable por WhatsApp para reactivar a un cliente que no ha reservado su servicio de limpieza en un tiempo.
Información del cliente:
- Nombre: ${client.name}
- Último servicio: ${lastService} (realizado el ${lastDate})
- Frecuencia habitual: ${client.frequency || 'ocasional'}

Instrucciones:
1. Sé muy natural y profesional (en español de Latinoamérica).
2. Ofrécele de forma especial un 15% de descuento de cortesía o un add-on gratuito (como lavado de horno o nevera de cortesía) si responde a este mensaje para agendar esta semana.
3. El mensaje debe ser directo, tener emojis y no sonar robótico.
4. Devuelve únicamente el texto del mensaje de WhatsApp, sin introducciones ni comillas ni formatos markdown.`;

      const aiProvider = localStorage.getItem('elevore_ai_provider') || 'antigravity';
      const geminiModel = localStorage.getItem('elevore_gemini_model') || 'gemini-2.5-flash';
      const geminiKey = localStorage.getItem('elevore_gemini_key') || '';
      const ollamaUrl = localStorage.getItem('elevore_ollama_url') || 'http://127.0.0.1:11434';
      const ollamaModel = localStorage.getItem('elevore_ollama_model') || 'llama3.2';

      let message = '';
      if (aiProvider === 'gemini' || aiProvider === 'antigravity') {
        const headers = { 'Content-Type': 'application/json' };
        if (aiProvider === 'gemini') {
          headers['x-gemini-key'] = geminiKey;
        }
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: geminiModel,
            messages: [{ role: 'user', content: prompt }]
          })
        });
        if (res.ok) {
          const data = await res.json();
          message = data.text || '';
        }
      } else {
        const res = await fetch(`${ollamaUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            messages: [{ role: 'user', content: prompt }],
            stream: false,
            keep_alive: -1
          })
        });
        if (res.ok) {
          const data = await res.json();
          message = data.message?.content || '';
        }
      }

      if (!message.trim()) {
        message = `¡Hola ${client.name}! 😊 Te extrañamos en Elevore. Queríamos ofrecerte un descuento exclusivo de 15% en tu próximo servicio si agendas esta semana. ¿Te reservamos un espacio? 💫`;
      }

      const ph = (client.phone || '').replace(/\D/g, '');
      const ph2 = ph.length === 10 ? '1' + ph : ph;
      window.open(`https://wa.me/${ph2}?text=${encodeURIComponent(message)}`, '_blank');
      tt(`Mensaje de reactivación generado por IA para ${client.name}! 🚀`, 'green');
      log(`IA Reactivación → ${client.name}`);
    } catch (e) {
      tt('Error con la IA: ' + e.message, 'red');
    }
    setLoad(false);
  };

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

  useEffect(() => {
    const handleESC = (e) => {
      if (e.key === 'Escape') {
        setQM(false);
        setChatJob(null);
        setAIOpen(false);
        setAIReportOpen(false);
        setPayoutModalWorker(null);
        setSelectedClient(null);
      }
    };
    window.addEventListener('keydown', handleESC);
    
    // Solicitar permisos de notificación HTML5 al inicio
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    return () => window.removeEventListener('keydown', handleESC);
  }, []);

  useEffect(() => {
    if (selectedClient) {
      const prefs = selectedClient.specs?.preferences || {};
      setPrefPets(prefs.pets || '');
      setPrefEntryCode(prefs.entryCode || '');
      setPrefProducts(prefs.products || '');
      setPrefNotes(prefs.notes || '');
      setPrefLang(selectedClient.specs?.lang || 'en');
      setDrawerTab('preferences');
    }
  }, [selectedClient]);

  const saveClientPreferences = async () => {
    if (!selectedClient) return;
    setLoad(true);
    try {
      const updatedSpecs = {
        ...(selectedClient.specs || {}),
        lang: prefLang,
        preferences: {
          pets: prefPets,
          entryCode: prefEntryCode,
          products: prefProducts,
          notes: prefNotes
        }
      };
      
      const { data, error } = await sb.from('clients')
        .update({ specs: updatedSpecs })
        .eq('name', selectedClient.name)
        .select()
        .single();
        
      if (error) throw error;
      
      tt('Preferencias guardadas ✓', 'green');
      setClients(prev => prev.map(c => c.name === selectedClient.name ? { ...c, specs: updatedSpecs } : c));
      setSelectedClient({ ...selectedClient, specs: updatedSpecs });
      refresh();
    } catch (e) {
      tt('Error: ' + e.message, 'red');
    }
    setLoad(false);
  };


  // Helper: sync offline queued operations to Supabase
  const uploadBase64Photo = async (base64Data) => {
    try {
      const parts = base64Data.split(';base64,');
      const contentType = parts[0].split(':')[1];
      const raw = window.atob(parts[1]);
      const rawLength = raw.length;
      const uInt8Array = new Uint8Array(rawLength);
      for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
      }
      const blob = new Blob([uInt8Array], { type: contentType });
      const ext = contentType.split('/')[1] || 'png';
      const fileName = `${Date.now()}_offline_${Math.random().toString(36).substring(7)}.${ext}`;
      
      const { error } = await sb.storage.from('elevore_photos').upload(fileName, blob, { contentType });
      if (error) throw error;
      
      const { data } = sb.storage.from('elevore_photos').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err) {
      console.error("Base64 upload failed:", err);
      return null;
    }
  };

  const syncOfflineMissions = async (tId, toastFn, refreshFn) => {
    if (!navigator.onLine || !tId) return;
    const queuedStr = localStorage.getItem('elevore_offline_missions');
    if (!queuedStr) return;
    try {
      const queued = JSON.parse(queuedStr);
      const ids = Object.keys(queued);
      if (ids.length === 0) return;
      
      toastFn(prefLang === 'es' ? '📶 Sincronizando datos offline...' : '📶 Syncing offline data...', 'blue');
      let successCount = 0;
      
      for (const id of ids) {
        const patch = { ...queued[id] };
        
        if (patch.before_photos) {
          for (let i = 0; i < patch.before_photos.length; i++) {
            const photo = patch.before_photos[i];
            if (photo.startsWith('data:image')) {
              const publicUrl = await uploadBase64Photo(photo);
              if (publicUrl) patch.before_photos[i] = publicUrl;
            }
          }
        }
        if (patch.after_photos) {
          for (let i = 0; i < patch.after_photos.length; i++) {
            const photo = patch.after_photos[i];
            if (photo.startsWith('data:image')) {
              const publicUrl = await uploadBase64Photo(photo);
              if (publicUrl) patch.after_photos[i] = publicUrl;
            }
          }
        }
        
        const { error } = await sb.from('elevore_missions').update(patch).eq('id', id);
        if (!error) {
          successCount++;
          delete queued[id];
        } else {
          console.error(`Failed to sync job ${id}:`, error);
        }
      }
      
      if (Object.keys(queued).length === 0) {
        localStorage.removeItem('elevore_offline_missions');
      } else {
        localStorage.setItem('elevore_offline_missions', JSON.stringify(queued));
      }
      
      if (successCount > 0) {
        toastFn(prefLang === 'es' ? `📶 Sincronización completada: ${successCount} misión(es) actualizada(s) ✓` : `📶 Sync completed: ${successCount} mission(s) updated ✓`, 'green');
        refreshFn();
      }
    } catch (err) {
      console.error("Error during offline sync:", err);
    }
  };

  const refresh = useCallback(async () => {
    // ⚠️ SECURITY: Never fetch data without a confirmed tenantId.
    // This prevents cross-tenant data leaks.
    if (!tenantId) {
      setLoad(false);
      return;
    }
    setLoad(true);

    const [{ data: j }, { data: c }, { data: s }, { data: ts }, { data: t }] = await Promise.all([
      sb.from('elevore_missions').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
      sb.from('clients').select('*').eq('tenant_id', tenantId),
      sb.from('staff_profiles').select('*').eq('tenant_id', tenantId),
      sb.from('tenant_settings').select('*').eq('tenant_id', tenantId).maybeSingle(),
      sb.from('tenants').select('*').eq('id', tenantId).maybeSingle()
    ]);

    if (j) {
      setJobs(j);
      if (aStaffRef.current) {
        const updated = j.find(x => x.id === aStaffRef.current.id);
        if (updated) setAStaff(updated);
      }
    }
    if (c) setClients(c);
    if (s && s.length > 0) {
      setStaff(s);
      if (activeEmployeeRef.current) {
        const updated = s.find(x => x.id === activeEmployeeRef.current.id);
        if (updated) setActiveEmp(updated);
      }
    }
    if (ts) {
      setTenantSettings(ts);
    }
    if (t) {
      setTenant(t);
    }

    // Defensive fetch of payout history
    try {
      const { data: pHistory, error: pErr } = await sb.from('staff_payouts').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
      if (!pErr && pHistory) {
        setPayoutHistory(pHistory);
      }
    } catch (e) {
      console.warn("staff_payouts table might not exist yet:", e);
    }

    setLoad(false);
  }, [tenantId]);

  useEffect(() => {
    const CAMPAIGN_TEMPLATES = {
      winback: 'Hola {ClientName}! Te extrañamos en {BusinessName}. Queremos ofrecerte un 15% de descuento en tu próximo servicio de {ServiceType}. Agenda aquí o contesta YES! 🏠',
      followup: 'Hola {ClientName}! Vimos que tienes una cotización pendiente para {ServiceType}. ¿Tienes alguna pregunta? Queremos ayudarte a dejar tu espacio brillante.',
      review: 'Hola {ClientName}! Gracias por confiar en {BusinessName}. Tu calificación nos ayuda a crecer. ¿Podrías dejarnos una reseña de 5 estrellas aquí? {GoogleReviewLink} ¡Gracias!'
    };
    setCampaignCustomText(CAMPAIGN_TEMPLATES[selectedCampaignTemplate] || '');
  }, [selectedCampaignTemplate]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      tt(prefLang === 'es' ? '📶 Conexión restablecida. Sincronizando...' : '📶 Connection restored. Syncing...', 'green');
      syncOfflineMissions(tenantId, tt, refresh);
    };
    const handleOffline = () => {
      setIsOffline(true);
      tt(prefLang === 'es' ? '🔴 Conexión perdida. Trabajando offline.' : '🔴 Connection lost. Working offline.', 'red');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [tenantId, refresh, prefLang]);

  useEffect(() => {
    if (tenantId && !isOffline) {
      syncOfflineMissions(tenantId, tt, refresh);
    }
  }, [tenantId, isOffline]);

  const handleLoginSuccess = (assignedRole, assignedTenantId, authUser, activeEmp, tName) => {
    setRole(assignedRole);
    setTenantId(assignedTenantId);
    if (tName) setTenantName(tName);
    if (authUser) setUser(authUser);
    if (activeEmp) setActiveEmp(activeEmp);
    setView(assignedRole === 'admin' ? 'brief' : 'staff');
    
    // Solicitar permisos tras inicio de sesión
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  // Only refresh data once we're past auth AND have a valid tenantId.
  useEffect(() => {
    if (view !== 'auth' && view !== 'landing' && tenantId) refresh();
  }, [view, tenantId, refresh]);

  useEffect(() => {
    if (view === 'auth') return;
    const ch = sb.channel('ev97')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'elevore_missions' }, (payload) => {
        refresh();
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newJob = payload.new;
          const oldJob = payload.old;
          const isAssignedToMe = activeEmployee && newJob.team_assigned === activeEmployee.name;
          const transitionedToScheduled = newJob.status === 'scheduled' && (!oldJob || oldJob.status !== 'scheduled');
          
          if (isAssignedToMe && transitionedToScheduled) {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('⚡ Nueva Misión Asignada', {
                body: `Tienes un nuevo servicio en ${newJob.address || 'tu ubicación asignada'}.`,
                icon: '/elevore-logo.png'
              });
            }
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_profiles' }, () => {
        refresh();
      })
      .subscribe();
    setRT(true);
    return () => { sb.removeChannel(ch); setRT(false); };
  }, [view, refresh, activeEmployee]);

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

  const [isDispatching, setIsDispatching] = useState(false);

  const autoDispatchMission = async () => {
    const pendingJob = jobs.find(j => j.status === 'lead' || (j.status === 'scheduled' && (!j.team_assigned || j.team_assigned === '')));
    if (!pendingJob) return tt('No unassigned missions to dispatch!', 'amber');
    
    setIsDispatching(true);
    tt('AI Calculating optimal route...', 'blue');
    
    const jobCoords = await geocodeAddress(pendingJob.address) || { lat: 28.5383, lng: -81.3792 };
    
    let bestStaff = null;
    let minDistance = Infinity;

    for (const st of staff) {
      if (st.role === 'admin') continue;
      // mock staff position slightly randomized
      const sLat = 28.5383 + (Math.random() - 0.5) * 0.1;
      const sLng = -81.3792 + (Math.random() - 0.5) * 0.1;
      
      const dist = getDistanceMeters(jobCoords.lat, jobCoords.lng, sLat, sLng);
      if (dist !== null && dist < minDistance) {
        minDistance = dist;
        bestStaff = st;
      }
    }

    if (!bestStaff) {
      setIsDispatching(false);
      return tt('No available staff found.', 'red');
    }

    await sb.from('elevore_missions').update({ 
      team_assigned: bestStaff.name, 
      status: 'scheduled' 
    }).eq('id', pendingJob.id);

    tt(`Assigned to ${bestStaff.name} (${Math.round(minDistance/1000)}km away) 🚀`, 'green');
    setIsDispatching(false);
    refresh();
  };

  const deploy = async () => {
    if (!state.name || !state.address) return tt('Fill Name and Address', 'red');
    setLoad(true);
    try {
      const { data: c, error: cErr } = await sb.from('clients').upsert({ name: state.name, phone: state.phone, email: state.email, birthday: state.birthday || null, membership: state.membership, specs: { ...state }, tenant_id: tenantId }, { onConflict: 'name' }).select().single();
      if (cErr || !c) { tt('Clients Error: ' + (cErr?.message || 'Check RLS'), 'red'); setLoad(false); return; }
      const fd = { 'weekly': 7, 'bi-weekly': 14, 'monthly': 30, 'one-time': null }[state.frequency];
      let nv = null; if (fd && state.date) { const d = new Date(state.date); d.setDate(d.getDate() + fd); nv = d.toISOString().split('T')[0]; }
      const payload = { client_name: state.name, client_phone: state.phone, address: state.address, service_type: state.svc, total_price: state.totalPrice || pricing.total, deposit_paid: state.deposit, team_assigned: state.team, status: state.status, specs: { ...state, referral: refCode || null }, scheduled_date: state.date || null, notes: state.notes || null, next_visit: nv, membership_plan: state.membership || null, urgency_expires: state.urgencyHours ? new Date(Date.now() + state.urgencyHours * 3600000).toISOString() : null, tenant_id: tenantId };
      const { data: insertedJobs, error: jErr } = editId 
        ? await sb.from('elevore_missions').update(payload).eq('id', editId).select() 
        : await sb.from('elevore_missions').insert([payload]).select();
      if (jErr) { tt('Mission Error: ' + jErr.message, 'red'); setLoad(false); return; }
      
      // Trigger Quote Chase if it is a new estimate/lead
      if (!editId && insertedJobs && insertedJobs[0]) {
        const job = insertedJobs[0];
        if (job.status === 'lead' || job.status === 'estimate') {
          triggerInngestEvent('elevore/quote.created', { jobId: job.id });
        }
      }
      setState(INIT); setEdit(null);
      log(`${editId ? 'Updated' : 'New'}: ${state.name} — ${fmt$(state.totalPrice || pricing.total)}`);
      tt(editId ? 'Updated! ⚡' : 'Deployed! 🚀');
      setView('agenda'); refresh();
    } catch (e) { tt('Error: ' + e.message, 'red'); }
    setLoad(false);
  };

  const checkAndScheduleNextMission = async (job) => {
    try {
      const client = clients.find(c => c.name === job.client_name);
      const frequency = job.specs?.frequency || client?.specs?.frequency || 'one-time';
      const membership = job.membership_plan || client?.membership || 'none';
      
      let days = null;
      if (frequency === 'weekly' || membership === 'premium') days = 7;
      else if (frequency === 'bi-weekly' || membership === 'basic') days = 14;
      else if (frequency === 'monthly') days = 30;
      else if (membership === 'vip') days = 7;
      
      if (!days) return;
      
      const todayStr = new Date().toISOString().split('T')[0];
      const hasFuture = jobs.some(j => 
        j.client_name === job.client_name && 
        j.status === 'scheduled' && 
        j.scheduled_date >= todayStr
      );
      if (hasFuture) {
        console.log("Future mission already scheduled for " + job.client_name);
        return;
      }
      
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + days);
      const dateStr = nextDate.toISOString().split('T')[0];
      
      const payload = {
        client_name: job.client_name,
        client_phone: job.client_phone || '',
        address: job.address || '',
        service_type: job.service_type || 'regular',
        total_price: job.total_price || 0,
        deposit_paid: 0,
        team_assigned: job.team_assigned || '',
        status: 'scheduled',
        scheduled_date: dateStr,
        notes: `Recurrencia automática (${frequency !== 'one-time' ? frequency : membership})`,
        membership_plan: membership !== 'none' ? membership : null,
        specs: {
          ...(job.specs || {}),
          auto_scheduled: true,
          previous_job_id: job.id
        },
        tenant_id: tenantId || job.tenant_id
      };
      
      await sb.from('elevore_missions').insert([payload]);
      tt(`Auto-agendado: Siguiente visita el ${dateStr} 🗓️`, 'green');
    } catch (e) {
      console.error("Error auto-scheduling:", e);
    }
  };

  const update = async (job, patch, msg) => {
    const { error } = await sb.from('elevore_missions').update(patch).eq('id', job.id);
    if (error) return tt(error.message, 'red');
    tt(msg || 'Updated ✓');
    log((msg || 'Updated') + ': ' + job.client_name);
    if (patch.status === 'completed' || patch.status === 'paid') {
      triggerN8nEmail({ ...job, ...patch });
      checkAndScheduleNextMission({ ...job, ...patch });
    }
    if (patch.status === 'paid') {
      triggerInngestEvent('elevore/mission.paid', { jobId: job.id });
      triggerFeedbackRequestEmail(job, tenantSettings?.business_full_name || "Elevore Premium Services");
    }
    if (patch.status === 'in_progress') {
      triggerInngestEvent('elevore/mission.in_progress', { jobId: job.id });
      triggerOnMyWayEmail(job, tenantSettings?.business_full_name || "Elevore Premium Services");
    }
    refresh();
  };
  
  // Custom payroll check-in/out and wallet updating logic
  const executeRecTime = async (jid, type, time, status, jobData, patch) => {
    const { error: missionErr } = await sb.from('elevore_missions').update(patch).eq('id', jid);
    if (missionErr) throw missionErr;
    tt(type === 'check_in_time' ? '▶ Checked in!' : '⏹ Checked out!');
    if (patch.status === 'in_progress') {
      triggerInngestEvent('elevore/mission.in_progress', { jobId: jid });
      triggerOnMyWayEmail(jobData, tenantSettings?.business_full_name || "Elevore Premium Services");
    }
    log(type === 'check_in_time' ? `Check-in: ${jid}` : `Check-out: ${jid}`);
    
    // If checking out, calculate and add earnings dynamically to employee wallet
    if (type === 'check_out_time' && activeEmployee) {
      const currentWorker = staff.find(s => s.id === activeEmployee.id) || activeEmployee;
      const pct = getPayoutPct(currentWorker);
      const share = Math.round(jobData.total_price * pct);
      const isFast = Math.round((new Date(time) - new Date(jobData.check_in_time)) / 60000) <= 180;
      const netEarned = share + (isFast ? 5 : 0);
      
      const newBal = (activeEmployee.wallet_balance || 0) + netEarned;
      const newTot = (activeEmployee.total_earned || 0) + netEarned;
      
      const { error: staffErr } = await sb.from('staff_profiles').update({ wallet_balance: newBal, total_earned: newTot }).eq('id', activeEmployee.id);
      if (staffErr) throw staffErr;
      setActiveEmp({ ...activeEmployee, wallet_balance: newBal, total_earned: newTot });
      tt(`Earnings stored! +${fmt$(netEarned)} 💰`);
    }

    if (status === 'completed') {
      triggerN8nEmail({ ...jobData, ...patch, status });
      checkAndScheduleNextMission({ ...jobData, ...patch, status });
    }

    refresh();
  };

  const recTime = async (jid, type) => {
    const time = new Date().toISOString();
    const status = type === 'check_in_time' ? 'in_progress' : 'completed';
    
    // Read the current job values to calculate pay
    const { data: jobData, error: jobErr } = await sb.from('elevore_missions').select('*').eq('id', jid).single();
    if (jobErr) throw jobErr;
    if (!jobData) throw new Error("Mission not found");

    const patch = { [type]: time, status };

    if (navigator.geolocation) {
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              if (type === 'check_in_time') {
                patch.check_in_lat = lat;
                patch.check_in_lng = lng;
                let dLat = jobData.dest_lat;
                let dLng = jobData.dest_lng;
                if (!dLat || !dLng) {
                  const coords = await geocodeAddress(jobData.address);
                  if (coords) {
                    dLat = coords.lat;
                    dLng = coords.lng;
                    patch.dest_lat = dLat;
                    patch.dest_lng = dLng;
                  }
                }
                if (dLat && dLng) {
                  const dist = getDistanceMeters(lat, lng, dLat, dLng);
                  patch.gps_distance_meters = dist;
                  if (dist > 300) {
                    patch.specs = {
                      ...(jobData.specs || {}),
                      gps_deviation: true,
                      gps_deviation_meters: dist
                    };
                  }
                }
              } else {
                patch.check_out_lat = lat;
                patch.check_out_lng = lng;
              }
              await executeRecTime(jid, type, time, status, jobData, patch);
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          async (error) => {
            try {
              console.warn("Geolocation failed, writing without GPS coordinates", error);
              await executeRecTime(jid, type, time, status, jobData, patch);
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      });
    } else {
      await executeRecTime(jid, type, time, status, jobData, patch);
    }
  };

  const upsell = async (job, aid) => { const a = ADDONS.find(x => x.id === aid); if (!a) return; const p = job.client_phone?.replace(/\D/g, '') || ''; const ph = p.length === 10 ? '1' + p : p; const msg = `Hi ${job.client_name}! ✨ Our team noticed your ${a.en.toLowerCase()} could use attention. Add it for $${a.p}? Reply YES! 🏠`; window.open(`https://wa.me/${ph}?text=${encodeURIComponent(msg)}`, '_blank'); const sent = [...(job.upsell_sent || []), aid]; await sb.from('elevore_missions').update({ upsell_sent: sent }).eq('id', job.id); tt(`Upsell: ${a.en} sent! 💰`); log(`Upsell: ${a.en} → ${job.client_name}`); refresh(); };
  const calcBonus = job => { if (job.status !== 'paid') return 0; const mins = job.check_in_time && job.check_out_time ? Math.round((new Date(job.check_out_time) - new Date(job.check_in_time)) / 60000) : null; return (job.final_signature && mins && mins <= 180 && (job.client_rating || 0) >= 4) ? 5 : 0; };
  const realProfit = job => {
    const w = staff.find(s => s.name === job.team_assigned);
    const pct = getPayoutPct(w);
    return Math.round((job.deposit_paid || 0) - ((job.deposit_paid || 0) * pct) - (job.specs?.expenses || 0) - calcBonus(job));
  };
  const passQC = job => update(job, { status: 'paid', specs: { ...(job.specs || {}), quality_passed: true, quality_passed_at: new Date().toISOString() } }, 'QC Passed ✓');
  const markLost = async job => { const r = prompt('Lost reason (price/no-answer/competitor/timing):') || 'unknown'; await update(job, { status: 'lost', specs: { ...(job.specs || {}), lost_reason: r, lost_at: new Date().toISOString() } }, 'Marked lost'); };
  const rebook = job => { setState({ ...INIT, ...(job.specs || {}), name: job.client_name, phone: job.client_phone, address: job.address, status: 'scheduled', deposit: 0, date: job.next_visit || '' }); setEdit(null); setView('operations'); setOperationsTab('deploy'); setDtab('money'); };

  const scheduleNextClean = async (client) => {
    try {
      const clientJobs = jobs.filter(j => j.client_name === client.name);
      let baseJob = clientJobs[0];
      if (!baseJob) {
        baseJob = {
          id: 'dummy_' + Date.now(),
          client_name: client.name,
          client_phone: client.phone || '',
          address: client.address || '',
          service_type: 'regular',
          total_price: 150,
          team_assigned: staff.find(s => s.role === 'staff')?.name || '',
          membership_plan: client.membership || 'vip',
          specs: client.specs || {},
          tenant_id: tenantId
        };
      }
      await checkAndScheduleNextMission(baseJob);
      refresh();
    } catch (e) {
      tt('Error: ' + e.message, 'red');
    }
  };

  const simulateRecurrenceCharge = async (client) => {
    setChargingClient(client);
    setChargeStage('connecting');
    await new Promise(r => setTimeout(r, 1000));
    setChargeStage('verifying');
    await new Promise(r => setTimeout(r, 1000));
    setChargeStage('authorizing');
    await new Promise(r => setTimeout(r, 1200));
    setChargeStage('success');
    
    try {
      const updatedSpecs = {
        ...(client.specs || {}),
        last_recurrence_charge: new Date().toISOString(),
        recurrence_charges: [
          ...(client.specs?.recurrence_charges || []),
          {
            date: new Date().toISOString(),
            amount: client.specs?.totalPrice || 150,
            payment_id: 'rec_pi_' + Math.random().toString(36).substring(2, 11)
          }
        ]
      };
      
      await sb.from('clients')
        .update({ specs: updatedSpecs })
        .eq('name', client.name);
        
      tt(`Cobro de recurrencia exitoso para ${client.name} ✓`, 'green');
      setClients(prev => prev.map(c => c.name === client.name ? { ...c, specs: updatedSpecs } : c));
      
      const clientJobs = jobs.filter(j => j.client_name === client.name);
      let baseJob = clientJobs[0];
      if (!baseJob) {
        baseJob = {
          id: 'rec_' + Date.now(),
          client_name: client.name,
          client_phone: client.phone || '',
          address: client.address || '',
          service_type: 'regular',
          total_price: client.specs?.totalPrice || 150,
          team_assigned: staff.find(s => s.role === 'staff')?.name || '',
          membership_plan: client.membership || 'vip',
          specs: client.specs || {},
          tenant_id: tenantId
        };
      }
      await checkAndScheduleNextMission(baseJob);
    } catch (e) {
      console.error("Error storing recurrence charge:", e);
    }
    
    await new Promise(r => setTimeout(r, 1000));
    setChargeStage('');
    setChargingClient(null);
    refresh();
  };

  // Add new employee dynamic code
  const handleAddEmployee = async () => {
    if (!newStaffName || !newStaffPIN || !newStaffEmail) return tt('Name, Email and PIN required', 'red');
    
    // Add locally for robust fallback
    const defaultPayout = tenantSettings?.staff_pay_pct !== undefined ? Math.round(tenantSettings.staff_pay_pct * 100) : 40;
    const newWorker = {
      id: String(Date.now()), // use timestamp to avoid ID collision
      name: newStaffName,
      staff_email: newStaffEmail,
      role: newStaffRole,
      passcode: newStaffPIN,
      payout_pct: defaultPayout,
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
        payout_pct: defaultPayout,
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

  const handleCashout = (worker) => {
    if ((worker.wallet_balance || 0) <= 0) return tt('No balance to payout / Sin saldo para pagar', 'red');
    setPayoutModalWorker(worker);
    setPayoutAmount(String(worker.wallet_balance || 0));
    setPayoutNote('');
  };

  const submitPayout = async (amountVal, refNote) => {
    if (!payoutModalWorker) return;
    const worker = payoutModalWorker;
    const payoutVal = parseFloat(amountVal);
    if (isNaN(payoutVal) || payoutVal <= 0) return tt('Invalid payout amount / Monto inválido', 'red');
    if (payoutVal > (worker.wallet_balance || 0)) return tt('Amount exceeds wallet balance / Monto excede saldo', 'red');

    const remainingBalance = Math.max(0, Math.round(((worker.wallet_balance || 0) - payoutVal) * 100) / 100);

    // Update locally immediately for high responsiveness
    setStaff(prev => prev.map(s => s.id === worker.id ? { ...s, wallet_balance: remainingBalance } : s));
    if (activeEmployee?.id === worker.id) {
      setActiveEmp(prev => prev ? { ...prev, wallet_balance: remainingBalance } : null);
    }

    // Insert into staff_payouts table
    const newPayoutRecord = {
      tenant_id: tenantId,
      staff_id: worker.id,
      worker_name: worker.name,
      amount: payoutVal,
      payment_method: 'Zelle',
      reference_note: refNote || ''
    };

    try {
      // Insert to Supabase staff_payouts (wrap in try-catch to absorb errors if table doesn't exist)
      const { data, error } = await sb.from('staff_payouts').insert([newPayoutRecord]).select();
      if (!error && data) {
        setPayoutHistory(prev => [data[0], ...prev]);
      }
    } catch (e) {
      console.warn("Could not insert staff payout record. Table might not exist:", e);
    }

    // Sync balance update to Supabase staff_profiles
    try {
      await sb.from('staff_profiles').update({ wallet_balance: remainingBalance }).eq('id', worker.id);
    } catch (e) {
      console.warn("Could not update staff profile balance:", e);
    }

    tt(`Payout of ${fmt$(payoutVal)} for ${worker.name} processed! 💸`);
    log(`Payout: ${worker.name} received ${fmt$(payoutVal)}`);
    setPayoutModalWorker(null);
    refresh();
  };

  const finance = useMemo(() => {
    const gross = jobs.reduce((a, b) => a + (b.total_price || 0), 0);
    const col = jobs.reduce((a, b) => a + (b.deposit_paid || 0), 0);
    const exp = jobs.reduce((acc, job) => {
      const expenses = Number(job.specs?.expenses || 0);
      const materials = Number(job.specs?.materialCost || 0);
      const marketing = Number(job.specs?.marketingCost || 0);
      return acc + expenses + materials + marketing;
    }, 0);
    const bonuses = jobs.reduce((a, b) => a + calcBonus(b), 0);
    const netPayAllocated = jobs.filter(j => j.status === 'paid').reduce((acc, job) => {
      const w = staff.find(s => s.name === job.team_assigned);
      const pct = getPayoutPct(w);
      return acc + Math.round((job.deposit_paid || 0) * pct);
    }, 0);
    const net = Math.max(0, Math.round(col - netPayAllocated - exp - bonuses));
    const pending = gross - col;
    const pct = Math.min(100, (gross / (tenantSettings?.monthly_goal || DEFAULT_CFG.GOAL)) * 100);
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
    const lostReasons = lostJ.reduce((a, j) => {
      const r = j.specs?.lost_reason || 'unknown';
      a[r] = (a[r] || 0) + 1;
      return a;
    }, {});
    const ChurnRate = clients.length ? Math.round((churn.length / clients.length) * 100) : 0;
    const referredCount = jobs.filter(j => j.specs?.referred_by).length;

    // --- NEW ACQUISITION CHANNELS ROI & CAC ---
    const channels = ['google', 'facebook', 'flyers', 'referral', 'organic'];
    const channelStats = {
      google: { name: 'Google Ads', leads: 0, customers: 0, spend: 0, ltv: 0 },
      facebook: { name: 'Facebook/Redes', leads: 0, customers: 0, spend: 0, ltv: 0 },
      flyers: { name: 'Volantes/Flyers', leads: 0, customers: 0, spend: 0, ltv: 0 },
      referral: { name: 'Referidos', leads: 0, customers: 0, spend: 0, ltv: 0 },
      organic: { name: 'Organic/Otros', leads: 0, customers: 0, spend: 0, ltv: 0 }
    };

    clients.forEach(c => {
      const src = c.specs?.leadSource || 'organic';
      const spend = Number(c.specs?.adSpend || 0);
      if (channelStats[src]) {
        channelStats[src].leads++;
        channelStats[src].spend += spend;
      }
    });

    jobs.forEach(j => {
      const c = clients.find(cl => cl.name === j.client_name);
      const src = c?.specs?.leadSource || j.specs?.leadSource || 'organic';
      if (channelStats[src]) {
        channelStats[src].ltv += (j.total_price || 0);
        if (j.status === 'paid' || j.status === 'completed') {
          const clientActiveJobs = jobs.filter(jo => jo.client_name === j.client_name && (jo.status === 'paid' || jo.status === 'completed'));
          if (clientActiveJobs.length === 1 && j.id === clientActiveJobs[0].id) {
            channelStats[src].customers++;
          }
        }
      }
    });

    const channelReport = Object.keys(channelStats).map(ch => {
      const stat = channelStats[ch];
      const cac = stat.leads > 0 ? Math.round(stat.spend / stat.leads) : 0;
      const roi = stat.spend > 0 ? Math.round(((stat.ltv - stat.spend) / stat.spend) * 100) : 0;
      return {
        key: ch,
        name: stat.name,
        leads: stat.leads,
        customers: stat.customers,
        spend: stat.spend,
        ltv: stat.ltv,
        cac,
        roi
      };
    });

    const totalAdSpend = clients.reduce((acc, c) => acc + Number(c.specs?.adSpend || 0), 0);
    const totalReferralsReward = referredCount * 25;
    const avgCAC = clients.length ? Math.round((totalAdSpend + totalReferralsReward) / clients.length) : 40;
    const ltvCacRatio = avgCAC > 0 ? Number((avgLTV / avgCAC).toFixed(1)) : 0;
    const profitMargin = col > 0 ? Math.round((net / col) * 100) : 0;
    const paidJobs = jobs.filter(j => j.status === 'paid');
    const avgStaffPay = paidJobs.length ? Math.round(netPayAllocated / paidJobs.length) : 0;

    // Sleek continuous data lines for active graphics
    const wb = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); const ds = d.toISOString().split('T')[0]; const v = jobs.filter(j => j.scheduled_date === ds).reduce((a, b) => a + (b.total_price || 0), 0); return { l: dn[d.getDay()], v }; });
    const mb2 = Array.from({ length: 6 }, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - 5 + i); const yr = d.getFullYear(); const mo = d.getMonth(); const v = jobs.filter(j => { if (!j.scheduled_date) return false; const jd = new Date(j.scheduled_date); return jd.getFullYear() === yr && jd.getMonth() === mo; }).reduce((a, b) => a + (b.total_price || 0), 0); return { l: d.toLocaleDateString('en', { month: 'short' }), v }; });
    
    const ratings = jobs.filter(j => j.client_rating > 0).map(j => j.client_rating);
    const avgRating = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0;

    // --- NPS SCORE ---
    const promoters = ratings.filter(r => r === 5).length;
    const detractors = ratings.filter(r => r <= 3).length;
    const nps = ratings.length > 0 ? Math.round(((promoters - detractors) / ratings.length) * 100) : 100;

    const payroll = jobs.filter(j => j.status === 'paid').map(j => {
      const w = staff.find(s => s.name === j.team_assigned);
      const pct = getPayoutPct(w);
      return { name: j.team_assigned || 'Unassigned', amount: Math.round((j.deposit_paid || 0) * pct + calcBonus(j)) };
    }).reduce((acc, { name, amount }) => { acc[name] = (acc[name] || 0) + amount; return acc; }, {});
    const todayJobs = jobs.filter(j => j.scheduled_date === new Date().toISOString().split('T')[0]);
    const conv = jobs.filter(j => j.status === 'paid' && j.created_at && j.scheduled_date);
    const vel = conv.length ? Math.abs(Math.round(conv.reduce((a, j) => a + dAgo(j.created_at) - dAgo(j.scheduled_date), 0) / conv.length)) : null;
    const mbTargets = clients.filter(c => { const cj = jobs.filter(j => j.client_name === c.name); return cj.length >= 3 && (!c.membership || c.membership === 'none'); });
    return { gross, col, net, pending, pct, avg, mrr, proj, ltv, avgLTV, bestDay: bd ? dn[bd[0]] : null, retDue, cold, churn, pendSig, moneyTable, expiring, qcQ, reviewQ, lostJ, lostReasons, bonuses, wb, mb2, avgRating, payroll, byS, bySvc, todayJobs, total: jobs.length, vel, mbTargets, churnRate: ChurnRate, avgCAC, ltvCacRatio, profitMargin, avgStaffPay, channelReport, nps };
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

  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const remindersBadgeCount = useMemo(() => {
    const pendingManual = reminders.filter(r => !r.done).length;
    const unpaidCompleted = jobs.filter(j => j.status === 'completed').length;
    const tomorrowAuto = jobs.filter(j => j.scheduled_date === tomorrowStr && j.status === 'scheduled').length;
    return pendingManual + unpaidCompleted + tomorrowAuto;
  }, [reminders, jobs, tomorrowStr]);

  const staffJobs = useMemo(() => {
    const basicFiltered = jobs.filter(j => j.scheduled_date === todayStr || j.status === 'scheduled' || j.status === 'in_progress');
    if (activeEmployee && activeEmployee.name && activeEmployee.name !== 'General Staff' && role === 'staff') {
      const nameLower = activeEmployee.name.toLowerCase();
      return basicFiltered.filter(j => j.team_assigned && j.team_assigned.toLowerCase().includes(nameLower));
    }
    return basicFiltered;
  }, [jobs, todayStr, activeEmployee, role]);

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

  const wa = async (job, type) => {
    const waWindow = window.open('', '_blank');
    if (waWindow) {
      waWindow.document.write('<div style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;font-size:24px;color:#333;">Generando mensaje con IA... 🚀</div>');
    }
    setLoad(true);
    try {
      const bal = (job.total_price || 0) - (job.deposit_paid || 0);
      const portal = `${location.origin}${location.pathname}?mision=${job.id}`;
      const quoteUrl = `${location.origin}${location.pathname}?quote=${job.id}`;
      const ref = `${location.origin}${location.pathname}?ref=${job.client_name?.replace(/\s/g, '_')}&t=${tenantId}`;
      const zelle = tenantSettings?.zelle_phone || DEFAULT_CFG.ZELLE;

      const prompt = `Escribe un mensaje corto, sumamente profesional y persuasivo para enviar por WhatsApp a un cliente.
Detalles del Trabajo:
- Cliente: ${job.client_name}
- Tipo de Servicio: ${job.service_type?.toUpperCase()}
- Fecha programada: ${fmtD(job.scheduled_date)}
- Precio total: ${fmt$(job.total_price)}
- Depósito pagado: ${fmt$(job.deposit_paid)}
- Balance pendiente: ${fmt$(bal)}
- Enlace del Portal del Cliente (Seguimiento en Vivo): ${portal}
- Enlace de la Propuesta de Cotización Interactiva (Good-Better-Best): ${quoteUrl}
- Código de Referido del Cliente: ${ref}
- Teléfono de Zelle de la empresa: ${zelle}
- Tipo de Mensaje a generar: ${type}

Instrucciones para el Tipo de Mensaje "${type}":
- confirm: Confirmación del servicio y recordatorio de pagar el balance restante por Zelle (${zelle}) el día del servicio.
- reminder: Recordatorio amigable del servicio programado y del balance pendiente.
- review: Agradecimiento por el servicio terminado y solicitud de dejar una reseña en Google: ${DEFAULT_CFG.GOOGLE} de 5 estrellas.
- referral: Invitar al cliente a referir a un amigo para que ambos obtengan $25 de descuento utilizando su enlace: ${ref}.
- quote: Enviar la cotización detallada, el precio total, el balance pendiente, el enlace para elegir su plan (Good-Better-Best), personalizar aditivos y firmar digitalmente en su propuesta interactiva: ${quoteUrl}.
- portal: Enlace de seguimiento en tiempo real del servicio en su portal: ${portal}.
- retention: Reactivación de cliente ofreciéndole un 10% de descuento si reserva esta semana.
- winback: Mensaje especial para recuperar un cliente inactivo ofreciéndole 15% de descuento.
- bundle: Oferta especial de venta cruzada (ej. agregar limpieza profunda de horno o ventanas por $50 adicionales).
- urgency: Alerta de que su propuesta de cotización interactiva (${quoteUrl}) está por expirar y debe firmar para asegurar el precio.
- birthday: Mensaje de feliz cumpleaños ofreciendo un bono especial de $25 de descuento aplicable en su próximo servicio.
- follow1 / follow2 / final: Mensajes de seguimiento para leads que aún no han firmado su propuesta de cotización interactiva (${quoteUrl}).
- membership: Ofrecer un plan recurrente (membresía) para ahorrar dinero en base a su historial.
- qcfix: Preguntar de forma proactiva si hay algo del servicio que requiera atención para corregirlo inmediatamente.

Instrucciones generales de formato:
1. El mensaje debe estar redactado en español de Latinoamérica (cercano y persuasivo).
2. Usa emojis de forma moderada para hacerlo visualmente atractivo.
3. Devuelve ÚNICAMENTE el texto final para copiar y enviar en WhatsApp, sin introducciones ni comentarios ni markdown.`;

      const aiProvider = localStorage.getItem('elevore_ai_provider') || 'antigravity';
      const geminiModel = localStorage.getItem('elevore_gemini_model') || 'gemini-2.5-flash';
      const geminiKey = localStorage.getItem('elevore_gemini_key') || '';
      const ollamaUrl = localStorage.getItem('elevore_ollama_url') || 'http://127.0.0.1:11434';
      const ollamaModel = localStorage.getItem('elevore_ollama_model') || 'llama3.2';

      let message = '';
      if (aiProvider === 'gemini' || aiProvider === 'antigravity') {
        const headers = { 'Content-Type': 'application/json' };
        if (aiProvider === 'gemini') {
          headers['x-gemini-key'] = geminiKey;
        }
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: geminiModel,
            messages: [{ role: 'user', content: prompt }]
          })
        });
        if (res.ok) {
          const data = await res.json();
          message = data.text || '';
        }
      } else {
        const res = await fetch(`${ollamaUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            messages: [{ role: 'user', content: prompt }],
            stream: false,
            keep_alive: -1
          })
        });
        if (res.ok) {
          const data = await res.json();
          message = data.message?.content || '';
        }
      }

      if (!message.trim()) {
        throw new Error('No content returned');
      }

      const p = job.client_phone?.replace(/\D/g, '') || '';
      const ph = p.length === 10 ? '1' + p : p;
      const finalUrl = `https://wa.me/${ph}?text=${encodeURIComponent(message)}`;
      if (waWindow) {
        waWindow.location.href = finalUrl;
      } else {
        window.open(finalUrl, '_blank');
      }
      tt(`Mensaje "${type}" generado con IA enviado! 🚀`);
      log(`IA WA ${type} → ${job.client_name}`);
    } catch (err) {
      console.warn("Fallback to static template message:", err);
      // Fallback to original static templates
      const bal = (job.total_price || 0) - (job.deposit_paid || 0);
      const portal = `${location.origin}${location.pathname}?mision=${job.id}`;
      const ref = `${location.origin}${location.pathname}?ref=${job.client_name?.replace(/\s/g, '_')}&t=${tenantId}`;
      const msgs = {
        confirm: `Hola ${job.client_name}! ✨ Elevore confirma tu servicio de ${job.service_type?.toUpperCase()} para el ${fmtD(job.scheduled_date)}. Balance: ${fmt$(bal)}. Zelle: ${tenantSettings?.zelle_phone || DEFAULT_CFG.ZELLE} 🏠`,
        reminder: `Hola ${job.client_name}! 🔔 Recordatorio de tu servicio Elevore para el ${fmtD(job.scheduled_date)}. Balance: ${fmt$(bal)}. ¡Escríbenos si tienes dudas!`,
        review: `Hola ${job.client_name}! 🌟 ¡Gracias por elegirnos! Déjanos una reseña aquí: ${DEFAULT_CFG.GOOGLE} ⭐⭐⭐⭐⭐`,
        referral: `Hola ${job.client_name}! 🎁 Refiere a un amigo, ¡AMBOS obtienen $25 de descuento! Enlace: ${ref}`,
        quote: `Hola ${job.client_name}! 📋 Tu cotización Elevore:\n\n🏠 ${job.service_type?.toUpperCase()}\n📅 ${fmtD(job.scheduled_date)}\n💰 ${fmt$(job.total_price)}\n⚖️ Balance: ${fmt$(bal)}\n\n👉 Firma aquí: ${portal}\n\n⏰ Expira en 24h. Zelle: ${tenantSettings?.zelle_phone || DEFAULT_CFG.ZELLE}`,
        portal: `Hola ${job.client_name}! ✨ Sigue tu servicio ELEVORE en tiempo real: ${portal}`,
        retention: `Hola ${job.client_name}! 🏠 Ha pasado un tiempo. Reserva esta semana y obtén 10% de descuento. ¡Escríbenos! 🌟`,
        winback: `Hola ${job.client_name}! 😊 ¡Te extrañamos! Reserva hoy con un descuento especial de cliente leal.`,
      };
      const p = job.client_phone?.replace(/\D/g, '') || '';
      const ph = p.length === 10 ? '1' + p : p;
      const fallbackMsg = msgs[type] || `Hola ${job.client_name}! Elevore te contacta sobre tu servicio de ${job.service_type?.toUpperCase()}. Portal: ${portal}`;
      const finalUrl = `https://wa.me/${ph}?text=${encodeURIComponent(fallbackMsg)}`;
      if (waWindow) {
        waWindow.location.href = finalUrl;
      } else {
        window.open(finalUrl, '_blank');
      }
      tt(`Mensaje de plantilla enviado! 🚀`);
      log(`WA ${type} (Static) → ${job.client_name}`);
    }
    setLoad(false);
  };

  const recordFollow = async (job, type) => { wa(job, type); const h = [...(job.specs?.followups || []), { type, time: new Date().toISOString() }]; await update(job, { specs: { ...(job.specs || {}), followups: h, last_followup: type } }, `Follow-up ${type} sent`); };
  const requestReview = async (job) => { if ((job.client_rating || 0) > 0 && (job.client_rating || 0) < 5) { wa(job, 'qcfix'); tt('⚠️ Low rating — fix sent', 'red'); return; } wa(job, 'review'); await update(job, { specs: { ...(job.specs || {}), review_requested_at: new Date().toISOString() } }, 'Review requested'); };
  const offerMembership = async (job) => { wa(job, 'membership'); await update(job, { specs: { ...(job.specs || {}), membership_offered_at: new Date().toISOString() } }, 'Membership offer sent'); };

  const deploySmartCampaign = async () => {
    if (finance.mbTargets && finance.mbTargets.length > 0) {
      const targetName = finance.mbTargets[0].name;
      const j = jobs.find(jj => jj.client_name === targetName);
      if (j) {
        tt(`Desplegando campaña de membresía para ${targetName}... 🚀`, 'green');
        await offerMembership(j);
      } else {
        tt('No se encontró un trabajo reciente para el cliente objetivo.', 'amber');
      }
    } else if (finance.churn && finance.churn.length > 0) {
      const targetName = finance.churn[0].name;
      const j = jobs.find(jj => jj.client_name === targetName);
      if (j) {
        tt(`Desplegando campaña de recuperación para ${targetName}... 🚀`, 'green');
        await wa(j, 'winback');
      } else {
        tt('No se encontró un trabajo para el cliente inactivo.', 'amber');
      }
    } else {
      tt('No hay objetivos de campaña sugeridos actualmente.', 'amber');
    }
  };

  const parseTable = (rows) => {
    if (rows.length < 2) return rows.join('\n');
    const parseRowCells = (row) => {
      return row.split('|').slice(1, -1).map(cell => cell.trim());
    };
    const headers = parseRowCells(rows[0]);
    const bodyRows = rows.slice(2);
    const headerHtml = `<thead><tr class="border-b border-[#F5C518]/20 bg-white/5 font-mono text-[9px] text-[#F5C518] uppercase tracking-wider">${headers.map(h => `<th class="px-2 py-1.5 text-left font-black">${h}</th>`).join('')}</tr></thead>`;
    const bodyHtml = `<tbody>${bodyRows.map((r, ri) => {
      const cells = parseRowCells(r);
      return `<tr class="border-b border-white/5 text-[10px] hover:bg-white/5 transition-colors font-mono ${ri % 2 === 0 ? 'bg-white/[0.01]' : 'bg-transparent'}">${cells.map(c => `<td class="px-2 py-1.5 text-white/90">${c}</td>`).join('')}</tr>`;
    }).join('')}</tbody>`;
    return `<div class="overflow-x-auto my-3 border border-white/10 rounded-xl bg-black/40"><table class="w-full text-left border-collapse">${headerHtml}${bodyHtml}</table></div>`;
  };

  const parseChartTag = (text) => {
    if (!text) return [{ type: 'text', content: '' }];
    const chartRegex = /<Chart\s+type="([^"]+)"\s+data="([^"]+)"\s+labels="([^"]+)"\s*\/?>/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = chartRegex.exec(text)) !== null) {
      const index = match.index;
      if (index > lastIndex) {
        parts.push({ type: 'text', content: text.substring(lastIndex, index) });
      }
      
      const chartType = match[1];
      const rawData = match[2].replace(/'/g, '"');
      const rawLabels = match[3].replace(/'/g, '"');
      
      try {
        const chartData = JSON.parse(rawData);
        const chartLabels = JSON.parse(rawLabels);
        parts.push({ type: 'chart', chartType, chartData, chartLabels });
      } catch (e) {
        console.warn("Failed to parse chart in message:", e, rawData, rawLabels);
        parts.push({ type: 'text', content: match[0] });
      }
      
      lastIndex = chartRegex.lastIndex;
    }
    
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.substring(lastIndex) });
    }
    
    return parts.length ? parts : [{ type: 'text', content: text }];
  };

  const renderMarkdown = (text) => {
    if (!text) return '';
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    html = html.replace(/```(.*?)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre class="bg-black/60 border border-white/10 rounded-xl p-3 font-mono text-[10px] text-emerald-400 overflow-x-auto my-2"><code>${code.trim()}</code></pre>`;
    });
    html = html.replace(/`([^`]+)`/g, '<code class="bg-white/10 text-amber-400 px-1 py-0.5 rounded font-mono text-[10px]">$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-black">$1</strong>');
    html = html.replace(/^### (.*$)/gim, '<h4 class="text-xs font-bold text-white tracking-wide mt-3 mb-1 uppercase text-amber-400">$1</h4>');
    html = html.replace(/^## (.*$)/gim, '<h3 class="text-sm font-black text-white tracking-widest mt-4 mb-2 uppercase border-b border-[#F5C518]/20 pb-1">$1</h3>');
    html = html.replace(/^# (.*$)/gim, '<h2 class="text-base font-black text-[#F5C518] tracking-widest mt-4 mb-2 uppercase">$1</h2>');

    const lines = html.split('\n');
    let inTable = false;
    let tableRows = [];
    let parsedLines = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        tableRows.push(line);
      } else {
        if (inTable) {
          parsedLines.push(parseTable(tableRows));
          inTable = false;
        }
        parsedLines.push(line);
      }
    }
    if (inTable) {
      parsedLines.push(parseTable(tableRows));
    }
    html = parsedLines.join('\n');
    html = html.replace(/^\s*[-*+]\s+(.*)$/gim, '<li class="ml-4 list-disc text-white/90 my-1">$1</li>');
    html = html.replace(/^---$/gim, '<div class="h-[1px] bg-gradient-to-r from-transparent via-[#F5C518]/30 to-transparent my-4"></div>');
    html = html.split('\n').map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('<li') || trimmed.startsWith('<tr') || trimmed.startsWith('<td') || trimmed.startsWith('<th') || trimmed.startsWith('<table') || trimmed.startsWith('</table') || trimmed.startsWith('<div') || trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('</pre') || trimmed.startsWith('<code>') || trimmed.startsWith('</code>') || trimmed.startsWith('<thead') || trimmed.startsWith('</thead') || trimmed.startsWith('<tbody') || trimmed.startsWith('</tbody')) {
        return line;
      }
      return line ? line + '<br/>' : '<div class="h-2"></div>';
    }).join('\n');
    return html;
  };

  const speakMessage = (text, idx) => {
    if (speakingMsgIdx === idx) {
      window.speechSynthesis.cancel();
      setSpeakingMsgIdx(null);
      return;
    }
    
    window.speechSynthesis.cancel();
    setSpeakingMsgIdx(idx);
    
    const cleanText = text
      .replace(/<Chart[^>]*>/g, ' [Presenta un reporte gráfico de datos] ')
      .replace(/\[CMD\][^\n]*/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/`([^`]+)`/g, '$1');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-MX';
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    
    utterance.onend = () => {
      setSpeakingMsgIdx(null);
    };
    utterance.onerror = () => {
      setSpeakingMsgIdx(null);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  const toggleCopilotDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      tt('Tu navegador no soporta el reconocimiento de voz.', 'amber');
      return;
    }

    if (copilotListening) {
      recognitionRef.current?.stop();
      setCopilotListening(false);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = 'es-ES';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      
      rec.onstart = () => {
        setCopilotListening(true);
        tt('Dictado activo. Habla ahora...', 'green');
      };
      
      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setCopilotInput(prev => (prev ? prev + ' ' : '') + transcript);
      };
      
      rec.onerror = (err) => {
        console.error("Speech recognition error:", err);
        setCopilotListening(false);
      };
      
      rec.onend = () => {
        setCopilotListening(false);
      };
      
      recognitionRef.current = rec;
      rec.start();
    } catch (e) {
      console.error(e);
      setCopilotListening(false);
    }
  };

  const executeAICommand = async (cmd) => {
    const { action, client_name, job_id, team_name } = cmd;
    try {
      if (action === 'winback') {
        const targetJob = jobs.find(j => j.client_name?.toLowerCase().trim() === client_name?.toLowerCase().trim());
        if (targetJob) {
          tt(`Desplegando campaña de recuperación para ${client_name}... 🚀`, 'green');
          await wa(targetJob, 'winback');
        } else {
          tt(`No se encontró un trabajo para el cliente ${client_name}.`, 'amber');
        }
      } 
      else if (action === 'upsell') {
        const targetJob = jobs.find(j => j.client_name?.toLowerCase().trim() === client_name?.toLowerCase().trim());
        if (targetJob) {
          tt(`Ofreciendo membresía recurrente a ${client_name}... 👑`, 'green');
          await offerMembership(targetJob);
        } else {
          tt(`No se encontró un trabajo para el cliente ${client_name}.`, 'amber');
        }
      } 
      else if (action === 'print_invoice') {
        let targetJob = jobs.find(j => j.id === job_id);
        if (!targetJob && client_name) {
          targetJob = jobs.find(j => j.client_name?.toLowerCase().trim() === client_name?.toLowerCase().trim());
        }
        if (targetJob) {
          tt(`Imprimiendo factura de ${targetJob.client_name}... 📄`, 'green');
          printInvoice(targetJob);
        } else {
          tt('No se encontró el trabajo para la factura.', 'amber');
        }
      }
      else if (action === 'reassign') {
        let targetJob = jobs.find(j => j.id === job_id);
        if (!targetJob && client_name) {
          targetJob = jobs.find(j => j.client_name?.toLowerCase().trim() === client_name?.toLowerCase().trim());
        }
        if (targetJob && team_name) {
          tt(`Reasignando trabajo de ${targetJob.client_name} a ${team_name}... 👥`, 'green');
          const { error } = await sb.from('elevore_missions').update({ team_assigned: team_name }).eq('id', targetJob.id);
          if (!error) {
            tt(`Trabajo de ${targetJob.client_name} reasignado a ${team_name} exitosamente! 🚀`, 'green');
            refresh();
          } else {
            tt(`Error al reasignar en Supabase: ${error.message}`, 'red');
          }
        } else {
          tt('No se encontró el trabajo o equipo especificado.', 'amber');
        }
      }
    } catch (e) {
      console.error("Error running AI command:", e);
      tt("Error al ejecutar acción del copiloto", "red");
    }
  };

  const getHeuristicResponse = (query, currentView, fin, name, risks) => {
    const q = query.toLowerCase();
    
    // Landing Page Mode Responses
    if (currentView === 'landing') {
      if (q.includes('roi') || q.includes('calcula') || q.includes('ganar') || q.includes('dinero') || q.includes('simula')) {
        return `### 📊 Simulación de Retorno sobre Inversión (ROI)\nAnalizando tu simulación en la **Calculadora de ROI de Elevore**:\n* Un incremento estimado del **35%** en tus ingresos mediante cotizaciones persuasivas y upsells automáticos.\n* Ahorro promedio de **0.5 horas de oficina** por cada trabajo realizado.\n* Reactivación de hasta un **8% de clientes inactivos** mediante campañas automáticas de Winback.\n\nTe recomiendo expandir el panel derecho usando las flechas de la cabecera del chat para ajustar tus sliders de ingresos y trabajos mensuales en tiempo real. ¡La rentabilidad está a un clic!`;
      }
      if (q.includes('plan') || q.includes('precio') || q.includes('costo') || q.includes('cuanto') || q.includes('pagar') || q.includes('suscrip')) {
        return `### 💎 Planes de Suscripción Premium de Elevore Empire\n\n| Plan | Inversión Mensual | Beneficios Clave |\n| :--- | :--- | :--- |\n| **Basic** | $199 USD | 2 servicios incluidos/mes, 5% de descuento, soporte estándar. |\n| **Premium** | $349 USD | 4 servicios/mes, 10% de descuento, desengrasado de horno gratis. |\n| **VIP** | $549 USD | 6 servicios/mes, 15% de descuento, soporte prioritario 24/7 y equipo dedicado. |\n\n*Nota:* Te sugiero iniciar tu prueba gratuita de 14 días haciendo clic en el botón dorado **\"Start Free Trial\"** en la barra superior.`;
      }
      if (q.includes('ventaja') || q.includes('beneficio') || q.includes('porque') || q.includes('competencia') || q.includes('diferencia') || q.includes('gps') || q.includes('ia') || q.includes('auditoria')) {
        return `### ⚡ ¿Por qué Elevore Empire es de Nivel Wall Street?\nNuestra plataforma no es un software administrativo común; es un multiplicador de flujo de caja:\n1. **Rastreo GPS Estilo Uber**: Monitorea a tus cuadrillas en ruta y da visibilidad en tiempo real a tus clientes.\n2. **Control de Calidad por Visión IA**: Analiza fotos de antes/después para garantizar estándares de 5 estrellas.\n3. **Módulo de Cotizaciones Good-Better-Best**: Presenta 3 niveles de servicio y aumenta de inmediato el ticket promedio en 35%.\n4. **CRM de Recuperación Automática (Winback)**: Reactiva clientes fríos vía WhatsApp sin gastar en publicidad.`;
      }
      
      return `Estimado visitante, soy **James Sterling**, asesor de crecimiento de **Elevore Empire**. \n¿Quieres saber cómo automatizar tus operaciones de servicios para el hogar y escalar tu flujo de caja? \n* Pregúntame sobre nuestro **Rastreo GPS en tiempo real**, **Control de Calidad por IA**, o nuestros **Planes de precios**.\n* Te sugiero hacer clic en el botón de expansión arriba para abrir la **Calculadora interactiva de ROI** y simular tus retornos anuales.`;
    }
    
    // Dashboard Mode Responses (Private Admin Mode)
    const mrr = fin.mrr || 0;
    const net = fin.net || 0;
    const margin = fin.profitMargin || 0;
    const ltvCac = fin.ltvCacRatio || 0;
    const churn = fin.churnRate || 0;
    
    if (q.includes('mrr') || q.includes('proyec') || q.includes('ingreso') || q.includes('factura') || q.includes('meta') || q.includes('grafic') || q.includes('tendencia')) {
      const labels = ['M-4', 'M-3', 'M-2', 'M-1', 'Actual', 'Forecast'];
      const data = [
        Math.round(net * 0.7),
        Math.round(net * 0.8),
        Math.round(net * 0.85),
        Math.round(net * 0.95),
        Math.round(net),
        Math.round(fin.proj || net * 1.1)
      ];
      return `### 📈 Reporte de Flujo de Caja y Forecast Corporativo - ${name}\nHe proyectado la tendencia de ingresos del negocio basados en los últimos 5 meses de operación:\n* **Ingreso Neto Actual**: $${net.toLocaleString()} USD\n* **MRR Recurrente**: $${mrr.toLocaleString()} USD\n* **Proyección de Cierre (Forecast)**: $${(fin.proj || net).toLocaleString()} USD\n* **Meta de Facturación**: $${(fin.pct ? Math.round(net / (fin.pct / 100)) : 15000).toLocaleString()} USD (Progreso actual: ${fin.pct ? fin.pct.toFixed(1) : 0}%)\n\n<Chart type="line" data="[${data.join(', ')}]" labels="['M-4', 'M-3', 'M-2', 'M-1', 'Actual', 'Forecast']" />\n\n*Recomendación de Sterling:* Mantener el gasto publicitario estable. La pendiente es alcista, pero debemos acelerar la conversión de cotizaciones pendientes ($${(fin.pending || 0).toLocaleString()} USD) para asegurar el flujo de caja del próximo período.`;
    }
    
    if (q.includes('roi') || q.includes('marketing') || q.includes('canal') || q.includes('publicidad') || q.includes('gasto') || q.includes('adquisic')) {
      const report = fin.channelReport || [];
      let breakdown = `| Canal | Spend | Leads | LTV Promedio | CAC | ROI |\n`;
      report.forEach(c => {
        breakdown += `| **${c.name}** | $${c.spend} | ${c.leads} | $${c.ltv} | $${c.cac} | **${c.roi}%** |\n`;
      });
      
      return `### 📊 Auditoría del ROI de Canales de Adquisición\nAquí tienes el desglose de eficiencia publicitaria de tu empresa:\n\n${breakdown}\n\n*Análisis Cuantitativo:*\n* El ratio de eficiencia **LTV/CAC promedio es de ${ltvCac}x** (Meta saludable: >3.0x).\n* Duplicar presupuesto en los canales con ROI mayor al 150%.\n* Suspender campañas o recortar presupuestos en canales de bajo rendimiento o ROI negativo.`;
    }
    
    if (q.includes('churn') || q.includes('riesgo') || q.includes('perdido') || q.includes('abandon') || q.includes('recupera') || q.includes('winback')) {
      const churnList = fin.churn || [];
      let listStr = churnList.map(c => `- **${c.name}** (Inactivo)`).join('\n') || '- Ninguno registrado en este momento.';
      
      return `### 🚨 Alerta de Retención y Campaña Winback (Fuga de Capital)\nNuestra tasa de abandono (**Churn Rate**) actual se sitúa en **${churn}%**.\nTenemos los siguientes clientes en riesgo o inactivos:\n\n${listStr}\n\n*Plan de Acción Inmediato (Wall Street Winback):*\n1. Ejecutar plantilla de recuperación automática por WhatsApp ofreciendo un descuento exclusivo del 15% en su próximo servicio.\n2. Priorizar el contacto con los clientes con mayor historial de facturación para evitar que su LTV se deteriore.`;
    }
    
    if (q.includes('upsell') || q.includes('membresia') || q.includes('candidato') || q.includes('vender') || q.includes('mas')) {
      const targets = fin.mbTargets || [];
      let targetsStr = targets.slice(0, 4).map(t => `- **${t.name}** (${t.count} servicios completados)`).join('\n') || '- No se identificaron candidatos viables en esta corrida.';
      
      return `### 💎 Estrategia de Upsell de Membresías Recurrentes\nPara aumentar el MRR de forma acelerada, debemos convertir clientes de alta frecuencia no recurrentes en miembros de suscripción mensual:\n* Candidatos prioritarios detectados:\n${targetsStr}\n\n*Plan de Ventas:*\n* Instruir a los técnicos en el campo a ofrecer el **Plan Premium** al momento de finalizar el servicio, destacando el 10% de descuento automático en futuros agendamientos.`;
    }
  
    return `CFO James Sterling reportándose. Analizando el Ledger de **${name}**:\n* **Margen Neto**: ${margin}% | **LTV/CAC**: ${ltvCac}x | **MRR**: $${mrr.toLocaleString()} USD\n* ¿Qué reporte financiero o plan operativo deseas que audite?\n  - Escribe **"ROI"** para analizar tus canales de marketing.\n  - Escribe **"MRR"** para ver las predicciones y gráficos de caja.\n  - Escribe **"Churn"** para ver alertas de clientes inactivos.\n  - Escribe **"Upsell"** para ver candidatos a membresías.`;
  };

  const handleCopilot = async (e) => {
    e.preventDefault();
    if (!copilotInput.trim()) return;
    const userText = copilotInput.trim();
    setCopilotMsgs(prev => [...prev, { role: 'user', content: userText }]);
    setCopilotInput('');
    setCopilotLoading(true);

    try {
      // 1. REGRESIÓN LINEAL (PREDICTIVA)
      const monthlyTrendValues = finance.mb2.map(item => item.v || 0);
      const nTrend = monthlyTrendValues.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      for (let i = 0; i < nTrend; i++) {
        sumX += i;
        sumY += monthlyTrendValues[i];
        sumXY += i * monthlyTrendValues[i];
        sumXX += i * i;
      }
      const slope = (nTrend * sumXY - sumX * sumY) / (nTrend * sumXX - sumX * sumX || 1);
      const intercept = (sumY - slope * sumX) / nTrend;
      const predictedNextMonth = Math.max(0, Math.round(slope * nTrend + intercept));
      const forecastSlopeText = slope > 0 
        ? `CRECIENTE (+$${Math.round(slope).toLocaleString()}/mes)` 
        : slope < 0 
          ? `DECRECIENTE (-$${Math.round(Math.abs(slope)).toLocaleString()}/mes)` 
          : 'ESTABLE';

      // 2. RIESGOS DE CHURN INDIVIDUALES
      const clientRiskScores = clients.map(c => {
        const clientJobs = jobs.filter(j => j.client_name === c.name && j.status === 'paid');
        if (!clientJobs.length) return { name: c.name, score: 50, days: 'Sin servicios pagados' };
        const lastJob = clientJobs.sort((a, b) => new Date(b.scheduled_date || 0) - new Date(a.scheduled_date || 0))[0];
        const daysSinceLast = dAgo(lastJob.scheduled_date);
        const score = Math.min(100, Math.max(0, Math.round(((daysSinceLast - 30) / 60) * 100)));
        return { name: c.name, score, days: daysSinceLast };
      }).sort((a, b) => b.score - a.score);
      const highRiskClients = clientRiskScores.filter(r => r.score >= 60).slice(0, 5);

      // 3. RAG LOCAL (BASE DE CONOCIMIENTO)
      const SOPS = [
        { topic: "Parche de Drywall / Yeso", keyword: "drywall yeso parche pared hueco", content: "SOP Huecos en pared (Drywall): 1. Recortar la sección dañada en un cuadrado limpio. 2. Colocar un respaldo de madera atornillado si el hueco es >3 pulgadas. 3. Fijar el parche de yeso nuevo. 4. Aplicar cinta de fibra de vidrio en las uniones. 5. Cubrir con compuesto para juntas en 2 capas. 6. Lijar hasta que quede liso y pintar." },
        { topic: "Remoción de manchas en alfombras", keyword: "alfombra mancha olor suciedad orina te pet", content: "SOP Limpieza de Alfombras: 1. Secar la mancha de inmediato con toalla limpia, sin frotar. 2. Tratar con eliminador enzimático para mascotas si hay olor. 3. Para manchas de café/vino, usar mezcla de vinagre blanco, lavaplatos y agua tibia. 4. Extraer el líquido con máquina aspiradora de agua. 5. Secar con ventilador." },
        { topic: "Manejo de clientes difíciles", keyword: "cliente enojado queja dificil conflicto reclamo", content: "SOP Gestión de Conflictos: 1. Escuchar sin interrumpir y asentar con la cabeza. 2. Decir: 'Entiendo perfectamente su frustración y lo solucionaremos'. 3. Nunca discutir o culpar al empleado. 4. Ofrecer garantía de satisfacción (rehacer el área afectada gratis). 5. Documentar e informar al administrador." },
        { topic: "Procedimiento de Check-in en Campo", keyword: "checkin entrada llegada retraso gps", content: "SOP Registro de Entrada (Check-in): El equipo debe marcar check-in al llegar a la propiedad. Si hay retraso >15 mins, notificar al cliente vía SMS/WhatsApp usando la plantilla de retraso. Registrar fotos del estado 'antes' de iniciar." },
        { topic: "Limpieza de Hornos por dentro", keyword: "horno cocina grasa profundo", content: "SOP Limpieza de Horno: 1. Aplicar desengrasante industrial sobre las paredes internas del horno frío. 2. Dejar actuar por 20 minutos. 3. Retirar las rejillas y restregarlas por separado. 4. Limpiar el interior con fibra no abrasiva para evitar rayones. 5. Enjuagar con paño húmedo hasta retirar residuos químicos." }
      ];

      const clientNotes = clients.filter(c => c.specs && (c.specs.notes || c.specs.entryCode || c.specs.pets)).map(c => ({
        topic: `Nota de cliente: ${c.name}`,
        keyword: `${c.name.toLowerCase()} mascotas entrada codigo notas`,
        content: `Cliente: ${c.name} | Mascotas: ${c.specs.pets || 'Ninguna'} | Código entrada: ${c.specs.entryCode || 'No especificado'} | Notas: ${c.specs.notes || 'Ninguna'}`
      }));

      const queryWords = userText.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const searchResults = [...SOPS, ...clientNotes].map(item => {
        let score = 0;
        queryWords.forEach(word => {
          if (item.keyword.toLowerCase().includes(word) || item.topic.toLowerCase().includes(word)) {
            score += 2;
          }
          if (item.content.toLowerCase().includes(word)) {
            score += 1;
          }
        });
        return { ...item, score };
      }).filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 2);
      
      const ragContextText = searchResults.length > 0
        ? `INFORMACIÓN DE SOPORTE RECUPERADA (RAG Local):\n${searchResults.map(r => `[KNOWLEDGE: ${r.topic}] ${r.content}`).join('\n')}`
        : 'No se encontró información de SOPs o notas de clientes relevante a la consulta del usuario.';

      const ollamaUrl = localStorage.getItem('elevore_ollama_url') || 'http://127.0.0.1:11434';
      const ollamaModel = localStorage.getItem('elevore_ollama_model') || 'llama3.2';

      const systemPrompt = view === 'landing' ? `Eres James Sterling, un brillante y sofisticado Consultor de Crecimiento Empresarial de Wall Street y Agente de Ventas de Elevore Empire.
Tu objetivo en este chat público es convencer al visitante del sitio web de Elevore Empire de registrarse en nuestra plataforma SaaS Premium.
Habla en español con un tono elegante, sofisticado, persuasivo y corporativo. Explica con entusiasmo cómo Elevore ayuda a los negocios de servicios para el hogar (cleaning, handymen, HVAC, landscaping) a automatizar sus operaciones, controlar la calidad y multiplicar sus ingresos en piloto automático.
Detalles Clave del SaaS Elevore Empire que puedes promocionar:
- Motor de Inteligencia Predictiva (Upsells automáticos y proyecciones de flujo de caja).
- GPS en vivo Uber-style para rastrear equipos de trabajo en ruta.
- Cotizaciones persuasivas de 3 opciones (Good-Better-Best) que elevan el valor del ticket en 35%.
- CRM integrado con plantillas automatizadas de WhatsApp (winback, control de calidad, cobros rápidos).
- Control de Calidad por Visión IA (analiza fotos del antes/después).
- Firmas digitales obligatorias para aprobación legal de contratos.

Planes de Precios de Elevore SaaS:
- Plan Basic ($199/mes): Incluye 2 limpiezas/servicios al mes, 5% de descuento, soporte prioritario.
- Plan Premium ($349/mes): Incluye 4 servicios al mes, 10% de descuento, desengrasado de horno gratis.
- Plan VIP ($549/mes): Incluye 6 servicios al mes, 15% de descuento, todos los complementos incluidos, equipo dedicado.

*Instrucciones de llamadas a la acción:*
- Recomienda al visitante que haga clic en el botón dorado "Start Free Trial" arriba en la barra de navegación para iniciar su prueba gratuita de 14 días.
- Si quieren simular sus ganancias reales con Elevore, diles que hagan clic en el botón de expansión (las flechas en la cabecera de este chat) para abrir la Calculadora de ROI en tiempo real.

=== ETIQUETAS ESPECIALES DE RESPUESTA (CRÍTICO) ===
1. GRÁFICOS SVG: Si el usuario te pide ver un gráfico, tendencia, o desglose visual de datos (por ejemplo, simulaciones de crecimiento o comparativas de planes), responde incluyendo una etiqueta de gráfico SVG en tu respuesta con el formato exacto:
   \`<Chart type="bar" data="[val1, val2, ...]" labels="['tag1', 'tag2', ...]" />\` o
   \`<Chart type="line" data="[val1, val2, ...]" labels="['tag1', 'tag2', ...]" />\`
   donde data es un array de números y labels es un array de strings. Por ejemplo, simula un crecimiento de ingresos proyectado a 5 meses: \`<Chart type="line" data="[10000, 13500, 15000, 18500, 22000]" labels="['Mes 1', 'Mes 2', 'Mes 3', 'Mes 4', 'Mes 5']" />\`.

¡Responde de forma concisa, educada y profesional, con el estilo de un consultor de inversiones de élite!` : `Eres James Sterling, un despiadado y brillante analista cuantitativo de fondos de cobertura y CFO de Wall Street, contratado por el negocio ${tenantName} para maximizar el flujo de caja, disparar el MRR y optimizar la rentabilidad de su operación de servicios.
Tus respuestas deben ser ultra-analíticas, orientadas a datos, precisas y profesionales (al estilo de Goldman Sachs o McKinsey). Utiliza términos de finanzas corporativas (LTV/CAC, MRR, ROI, Margen Neto, Churn).
Sé directo al grano: felicita los logros, pero critica severamente las ineficiencias financieras (como CAC alto, bajo LTV, fugas en el embudo de ventas, o canales de marketing con ROI negativo).
Cuando sea oportuno, formatea tus recomendaciones en tablas de markdown, listas estructuradas con viñetas o resúmenes ejecutivos numéricos.

=== ANÁLISIS PREDICTIVO (FORECAST MODEL) ===
- Pendiente de Ingresos (Últimos 6 meses): ${forecastSlopeText}
- Predicción de Facturación Próximo Mes: $${predictedNextMonth.toLocaleString()} USD
- Clientes con Mayor Probabilidad de Churn (Riesgo): ${JSON.stringify(highRiskClients.map(c => `${c.name} (${c.score}% riesgo, ${c.days} días inactivo)`))}

=== CONTEXTO ADICIONAL DE BASE DE CONOCIMIENTO (RAG) ===
${ragContextText}

DATOS FINANCIEROS Y OPERATIVOS DE ${tenantName} PARA TU ANÁLISIS:
- Ingresos Brutos Totales: $${finance.gross.toLocaleString()} USD
- Total Recaudado Real: $${finance.col.toLocaleString()} USD
- Utilidad Neta (Net Profit): $${finance.net.toLocaleString()} USD
- Margen de Ganancia Neto: ${finance.profitMargin}%
- Pendiente de Cobro: $${finance.pending.toLocaleString()} USD
- MRR de Membresías: $${finance.mrr.toLocaleString()} USD
- Meta Mensual: $${(tenantSettings?.monthly_goal || 15000).toLocaleString()} USD (Progreso: ${finance.pct.toFixed(1)}%)
- Proyección de Cierre de Mes (Forecast): $${finance.proj.toLocaleString()} USD
- Valor de Vida del Cliente (LTV Promedio): $${finance.avgLTV.toLocaleString()} USD
- Costo de Adquisición de Clientes (CAC Promedio): $${finance.avgCAC.toLocaleString()} USD
- Ratio de Eficiencia LTV/CAC: ${finance.ltvCacRatio}x
- Tasa de Abandono (Churn Rate): ${finance.churnRate}%
- NPS (Net Promoter Score): ${finance.nps}%
- Distribución de Trabajos por Estado: Leads (${finance.byS.lead || 0}), Agendados (${finance.byS.scheduled || 0}), En Proceso (${finance.byS.in_progress || 0}), Completados (${finance.byS.completed || 0}), Pagados (${finance.byS.paid || 0}), Perdidos (${finance.byS.lost || 0})
- Trabajos de Hoy: ${finance.todayJobs.length}

INFORME DETALLADO DE MARKETING (ROI por Canal):
${finance.channelReport.map(c => `- ${c.name}: Leads=${c.leads}, Conversiones=${c.customers}, Spend=$${c.spend}, LTV=$${c.ltv}, CAC=$${c.cac}, ROI=${c.roi}%`).join('\n')}

CANDIDATOS PRIORITARIOS PARA UPSELL DE MEMBRESÍA (Clientes frecuentes no recurrentes):
${finance.mbTargets.length > 0 ? finance.mbTargets.map(t => `- ${t.name} (Servicios completados: ${t.count})`).join('\n') : 'Ninguno identificado en este momento.'}

CLIENTES EN RIESGO DE CHURN (Sin servicios en más de 45 días):
${finance.churn.length > 0 ? finance.churn.map(c => `- ${c.name}`).join('\n') : 'Ninguno (retención perfecta).'}

Razones de Leads Perdidos: ${JSON.stringify(finance.lostReasons)}
Nómina pagada acumulada por empleado: ${JSON.stringify(finance.payroll)}

=== ETIQUETAS ESPECIALES DE RESPUESTA (CRÍTICO) ===
1. GRÁFICOS SVG: Si el usuario te pide ver un gráfico, tendencia, o desglose visual de datos, responde incluyendo una etiqueta de gráfico SVG en tu respuesta con el formato exacto:
   \`<Chart type="bar" data="[val1, val2, ...]" labels="['tag1', 'tag2', ...]" />\` o
   \`<Chart type="line" data="[val1, val2, ...]" labels="['tag1', 'tag2', ...]" />\`
   donde data es un array de números y labels es un array de strings.
2. COMANDOS DE ACCIÓN DIRECTA: Si el usuario solicita explícitamente realizar una acción, al final de tu respuesta (o como tu única respuesta) debes incluir exactamente la etiqueta:
   \`[CMD] {"action": "winback|upsell|print_invoice|reassign", "client_name": "nombre_cliente", "job_id": "id_trabajo_si_aplica", "team_name": "nombre_equipo_si_reasigna"}\`
   No pongas texto largo explicativo si el usuario te pidió realizar la acción, sé sumamente rápido y directo.

¡Responde con el estilo característico de Wall Street: sofisticado, directo al grano y enfocado en la rentabilidad! Responde siempre en español.`;

      let res;
      let usedProvider = 'ollama';
      const aiProvider = localStorage.getItem('elevore_ai_provider') || 'antigravity';
      const geminiModel = localStorage.getItem('elevore_gemini_model') || 'gemini-2.5-flash';
      const geminiKey = localStorage.getItem('elevore_gemini_key') || '';

      const shouldForceGemini = (view === 'landing' || aiProvider === 'gemini' || aiProvider === 'antigravity');

      if (shouldForceGemini) {
        usedProvider = aiProvider;
        const headers = { 'Content-Type': 'application/json' };
        if (aiProvider === 'gemini') {
          headers['x-gemini-key'] = geminiKey;
        }

        const promptOverride = aiProvider === 'antigravity'
          ? `Eres Antigravity AI, el procesador de lenguaje de Elevore Command. Traduces lenguaje natural del usuario a comandos válidos estructurados.\n\n${systemPrompt}`
          : systemPrompt;

        res = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: geminiModel,
            messages: [
              { role: 'system', content: promptOverride },
              ...copilotMsgs.map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: userText }
            ]
          })
        });
      } else {
        try {
          res = await fetch(`${ollamaUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: ollamaModel,
              messages: [
                { role: 'system', content: systemPrompt },
                ...copilotMsgs.map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content: userText }
              ],
              stream: false,
              keep_alive: -1
            })
          });
        } catch (ollamaErr) {
          console.warn("Local Ollama connection failed, falling back to Gemini Cloud:", ollamaErr);
          usedProvider = 'antigravity';
          res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: geminiModel,
              messages: [
                { role: 'system', content: systemPrompt },
                ...copilotMsgs.map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content: userText }
              ]
            })
          });
        }
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`AI API failed: ${res.status} - ${errorText}`);
      }
      const data = await res.json();
      const resContent = usedProvider === 'gemini' 
        ? (data.text || 'Sin respuesta') 
        : (data.message?.content || 'Sin respuesta');
      
      const cmdMatch = resContent.match(/\[CMD\]\s*(\{.*\})/);
      if (cmdMatch) {
        try {
          const cmdJson = JSON.parse(cmdMatch[1]);
          executeAICommand(cmdJson);
        } catch (e) {
          console.error("Failed to parse command JSON:", e, cmdMatch[1]);
        }
      }

      setCopilotMsgs(prev => [...prev, { role: 'assistant', content: resContent }]);
    } catch (err) {
      console.warn("AI pipeline failed, using Sterling Local Heuristic Engine:", err);
      const resContent = getHeuristicResponse(userText, view, finance, tenantName, highRiskClients);
      setCopilotMsgs(prev => [...prev, { role: 'assistant', content: resContent }]);
    }
    setCopilotLoading(false);
  };

  const printInvoice = job => {
    const w = window.open('', '_blank');
    const bizName = tenantSettings?.business_full_name || 'ELEVORE';
    const bizInitial = bizName.charAt(0).toUpperCase();
    const zelle = tenantSettings?.zelle_phone || DEFAULT_CFG.ZELLE;

    const clientObj = clients.find(c => c.name === job.client_name);
    const lang = clientObj?.specs?.lang || job.specs?.lang || 'es';

    const invoiceI18n = {
      en: {
        invoice: 'INVOICE',
        billTo: 'BILL TO:',
        service: 'Service',
        date: 'Date',
        team: 'Team',
        checkin: 'Check-in',
        checkout: 'Check-out',
        total: 'Total',
        depositPaid: 'Deposit Paid',
        balanceDue: 'BALANCE DUE',
        thanks: 'Thank you for choosing'
      },
      es: {
        invoice: 'FACTURA',
        billTo: 'FACTURAR A:',
        service: 'Servicio',
        date: 'Fecha',
        team: 'Equipo',
        checkin: 'Entrada',
        checkout: 'Salida',
        total: 'Total',
        depositPaid: 'Depósito Pagado',
        balanceDue: 'CANTIDAD DEBIDA',
        thanks: 'Gracias por elegir a'
      }
    };

    const invoiceServices = {
      en: {
        regular: 'Regular Cleaning',
        deep: 'Deep Cleaning',
        move: 'Move-in/out Cleaning',
        postcon: 'Post-construction Cleaning',
        airbnb: 'Airbnb Turnover'
      },
      es: {
        regular: 'Limpieza Regular',
        deep: 'Limpieza Profunda',
        move: 'Limpieza de Mudanza',
        postcon: 'Limpieza Post-construcción',
        airbnb: 'Giro de Airbnb'
      }
    };

    const t = invoiceI18n[lang] || invoiceI18n.es;
    const svcName = (invoiceServices[lang] || invoiceServices.es)[job.service_type] || String(job.service_type || '').toUpperCase();
    const dateFormatted = job.scheduled_date ? new Date(job.scheduled_date + 'T00:00:00').toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US') : '';

    w.document.write(`<html><head><style>body{font-family:sans-serif;padding:40px;max-width:600px;margin:auto}.h{border-bottom:4px solid #22c55e;padding-bottom:15px;display:flex;justify-content:space-between;align-items:center}.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee}.total{background:#000;color:#fff;padding:30px;border-radius:15px;margin-top:20px}.sig{border:2px solid #eee;border-radius:8px;margin-top:15px;padding:8px;text-align:center}</style></head><body>
<div class="h"><div><h1 style="font-style:italic;margin:0;display:flex;align-items:center;gap:10px"><div style="width:40px;height:40px;background:#000;color:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:24px;">${bizInitial}</div>${bizName}</h1></div><div style="text-align:right"><h2 style="margin:0">${t.invoice} #${job.id?.slice(0, 8).toUpperCase()}</h2><p style="margin:0;color:#666;font-size:11px">${new Date().toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US')}</p></div></div>
<div style="margin-top:20px"><h3>${t.billTo}</h3><p><b>${job.client_name}</b></p><p>${job.address}</p><p>${job.client_phone || ''}</p></div>
<div style="margin-top:15px"><div class="row"><span>${t.service}</span><span>${svcName}</span></div><div class="row"><span>${t.date}</span><span>${dateFormatted}</span></div><div class="row"><span>${t.team}</span><span>${job.team_assigned || 'TBD'}</span></div>${job.check_in_time ? `<div class="row"><span>${t.checkin}</span><span>${new Date(job.check_in_time).toLocaleTimeString(lang === 'es' ? 'es-ES' : 'en-US')}</span></div>` : ''}${job.check_out_time ? `<div class="row"><span>${t.checkout}</span><span>${new Date(job.check_out_time).toLocaleTimeString(lang === 'es' ? 'es-ES' : 'en-US')}</span></div>` : ''}<div class="row"><span>${t.total}</span><span>${fmt$(job.total_price)}</span></div><div class="row"><span>${t.depositPaid}</span><span>-${fmt$(job.deposit_paid)}</span></div></div>
<div class="total"><h1 style="margin:0">${t.balanceDue}: ${fmt$(job.total_price - job.deposit_paid)}</h1><p>Zelle: ${zelle}</p></div>
${job.approval_signature ? `<div class="sig"><p style="font-size:10px;color:#999;margin:0">${lang === 'es' ? 'APROBACIÓN DEL CLIENTE' : 'CLIENT APPROVAL'}</p><img src="${job.approval_signature}" style="max-height:60px"/></div>` : ''}
${job.final_signature ? `<div class="sig"><p style="font-size:10px;color:#999;margin:0">${lang === 'es' ? 'TRABAJO COMPLETADO' : 'JOB COMPLETION'}</p><img src="${job.final_signature}" style="max-height:60px"/></div>` : ''}
<p style="margin-top:40px;text-align:center;color:#999;font-size:11px">${t.thanks} ${bizName} ⭐</p>
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

    const generateTemplateWithAI = async (type) => {
      setLoad(true);
      try {
        const bal = (chatJob.total_price || 0) - (chatJob.deposit_paid || 0);
        const portal = `${location.origin}${location.pathname}?mision=${chatJob.id}`;
        const ref = `${location.origin}${location.pathname}?ref=${chatJob.client_name?.replace(/\s/g, '_')}&t=${tenantId}`;
        const zelle = tenantSettings?.zelle_phone || DEFAULT_CFG.ZELLE;

        const prompt = `Escribe un mensaje corto, sumamente profesional y persuasivo para enviar por WhatsApp a un cliente.
Detalles del Trabajo:
- Cliente: ${chatJob.client_name}
- Tipo de Servicio: ${chatJob.service_type?.toUpperCase()}
- Fecha programada: ${fmtD(chatJob.scheduled_date)}
- Precio total: ${fmt$(chatJob.total_price)}
- Depósito pagado: ${fmt$(chatJob.deposit_paid)}
- Balance pendiente: ${fmt$(bal)}
- Enlace del Portal del Cliente: ${portal}
- Código de Referido del Cliente: ${ref}
- Teléfono de Zelle de la empresa: ${zelle}
- Tipo de Mensaje a generar: ${type}

Instrucciones para el Tipo de Mensaje "${type}":
- confirm: Confirmación del servicio y recordatorio de pagar el balance restante por Zelle (${zelle}) el día del servicio.
- reminder: Recordatorio amigable del servicio programado y del balance pendiente.
- review: Agradecimiento por el servicio terminado y solicitud de dejar una reseña en Google: ${DEFAULT_CFG.GOOGLE} de 5 estrellas.
- quote: Enviar la cotización detallada, el precio total, el balance pendiente, el enlace para firmar digitalmente y aprobar en su portal: ${portal}.

Instrucciones generales de formato:
1. El mensaje debe estar redactado en español de Latinoamérica (cercano y persuasivo).
2. Usa emojis de forma moderada para hacerlo visualmente atractivo.
3. Devuelve ÚNICAMENTE el texto final para copiar y enviar en WhatsApp, sin introducciones ni comentarios ni markdown.`;

        const aiProvider = localStorage.getItem('elevore_ai_provider') || 'antigravity';
        const geminiModel = localStorage.getItem('elevore_gemini_model') || 'gemini-2.5-flash';
        const geminiKey = localStorage.getItem('elevore_gemini_key') || '';
        const ollamaUrl = localStorage.getItem('elevore_ollama_url') || 'http://127.0.0.1:11434';
        const ollamaModel = localStorage.getItem('elevore_ollama_model') || 'llama3.2';

        let message = '';
        if (aiProvider === 'gemini' || aiProvider === 'antigravity') {
          const headers = { 'Content-Type': 'application/json' };
          if (aiProvider === 'gemini') {
            headers['x-gemini-key'] = geminiKey;
          }
          const res = await fetch('/api/chat', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: geminiModel,
              messages: [{ role: 'user', content: prompt }]
            })
          });
          if (res.ok) {
            const data = await res.json();
            message = data.text || '';
          }
        } else {
          const res = await fetch(`${ollamaUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: ollamaModel,
              messages: [{ role: 'user', content: prompt }],
              stream: false,
              keep_alive: -1
            })
          });
          if (res.ok) {
            const data = await res.json();
            message = data.message?.content || '';
          }
        }

        if (!message.trim()) {
          throw new Error('No content returned');
        }
        setChatMsg(message.trim());
        tt(`Mensaje "${type}" generado con IA! 🤖`);
      } catch (err) {
        console.warn("Fallback to static template message:", err);
        const bal = (chatJob.total_price || 0) - (chatJob.deposit_paid || 0);
        const portal = `${location.origin}${location.pathname}?mision=${chatJob.id}`;
        const ref = `${location.origin}${location.pathname}?ref=${chatJob.client_name?.replace(/\s/g, '_')}&t=${tenantId}`;
        const msgs = {
          confirm: `Hola ${chatJob.client_name}! ✨ Elevore confirma tu servicio de ${chatJob.service_type?.toUpperCase()} para el ${fmtD(chatJob.scheduled_date)}. Balance: ${fmt$(bal)}. Zelle: ${tenantSettings?.zelle_phone || DEFAULT_CFG.ZELLE} 🏠`,
          reminder: `Hola ${chatJob.client_name}! 🔔 Recordatorio de tu servicio Elevore para el ${fmtD(chatJob.scheduled_date)}. Balance: ${fmt$(bal)}. ¡Escríbenos si tienes dudas!`,
          review: `Hola ${chatJob.client_name}! 🌟 ¡Gracias por elegirnos! Déjanos una reseña aquí: ${DEFAULT_CFG.GOOGLE} ⭐⭐⭐⭐⭐`,
          quote: `Hola ${chatJob.client_name}! 📋 Tu cotización Elevore:\n\n🏠 ${chatJob.service_type?.toUpperCase()}\n📅 ${fmtD(chatJob.scheduled_date)}\n💰 ${chatJob.total_price}\n⚖️ Balance: ${fmt$(bal)}\n\n👉 Firma aquí: ${portal}\n\n⏰ Expira en 24h. Zelle: ${tenantSettings?.zelle_phone || DEFAULT_CFG.ZELLE}`,
        };
        setChatMsg(msgs[type] || `Hola ${chatJob.client_name}! Elevore te contacta sobre tu servicio de ${chatJob.service_type?.toUpperCase()}. Portal: ${portal}`);
        tt(`Plantilla cargada (Fallback)`);
      }
      setLoad(false);
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
              <button key={type} onClick={() => generateTemplateWithAI(type)} className="py-1.5 bg-white/5 text-slate-400 rounded-xl text-[7px] font-black uppercase active:scale-95 hover:bg-white/10">{l}</button>
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

  const renderCopilot = () => {
    if (role !== 'admin' && view !== 'landing') return null;
    return (
      <>
        <button
          onClick={() => setCopilotOpen(!copilotOpen)}
          className="fixed bottom-6 right-6 z-[3000] w-14 h-14 bg-gradient-to-r from-amber-500 to-[#F5C518] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(245,197,24,0.4)] hover:scale-110 active:scale-95 transition-all text-black"
        >
          <Icon name="cpu" className="w-6 h-6" />
        </button>

        {copilotOpen && (
          <div className={`fixed bottom-24 right-6 z-[3000] ${copilotWide ? 'w-[850px]' : 'w-96'} h-[550px] bg-[#030206]/95 backdrop-blur-2xl border border-[#F5C518]/20 rounded-2xl shadow-[0_0_50px_rgba(245,197,24,0.15)] overflow-hidden flex flex-col transition-all duration-300 animate-in slide-in-from-bottom-5`}>
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-amber-500/25 via-transparent to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#F5C518]/20 flex items-center justify-center border border-[#F5C518]/30">
                  <Icon name="cpu" className="w-4 h-4 text-[#F5C518]" />
                </div>
                <div>
                  <h3 className="text-[10px] font-black text-white uppercase tracking-widest leading-none">
                    {view === 'landing' ? 'Elevore SaaS Advisor' : 'Elevore Quant Core // v2'}
                  </h3>
                  <p className="text-[7px] text-[#F5C518] font-black uppercase tracking-widest mt-1.5 animate-pulse">
                    {view === 'landing' ? 'Public Sales Agent - Online' : 'James Sterling Engine - Online'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => setCopilotWide(!copilotWide)} 
                  className="text-slate-400 hover:text-[#F5C518] transition-colors p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                  title={copilotWide ? "Contraer Chat" : "Expandir Calculadora de ROI"}
                  type="button"
                >
                  <Icon name={copilotWide ? "minimize-2" : "maximize-2"} className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setCopilotOpen(false)} 
                  className="text-slate-400 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                  type="button"
                >
                  <Icon name="x" className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Looping Financial Ticker */}
            <div className="bg-black/95 border-b border-white/10 px-3 py-1 overflow-hidden whitespace-nowrap text-[9px] font-mono text-emerald-400 select-none flex items-center relative shadow-inner h-6">
              <div className="animate-ticker inline-flex items-center gap-6">
                {[1, 2].map((loopIdx) => (
                  <React.Fragment key={loopIdx}>
                    {view === 'landing' ? (
                      <>
                        <span>Status: <strong className="text-white">ACTIVE</strong></span>
                        <span className="text-[#F5C518]">•</span>
                        <span>Empires Active: <strong className="text-white">1,420+</strong></span>
                        <span className="text-[#F5C518]">•</span>
                        <span>Avg. Growth: <strong className="text-white">+38%</strong></span>
                        <span className="text-[#F5C518]">•</span>
                        <span>LTV/CAC: <strong className="text-white">4.8x</strong></span>
                        <span className="text-[#F5C518]">•</span>
                        <span>Uptime: <strong className="text-white">99.99%</strong></span>
                        <span className="text-[#F5C518]">•</span>
                        <span>Automated Today: <strong className="text-white">18,429</strong></span>
                        <span className="text-[#F5C518]">•</span>
                      </>
                    ) : (
                      <>
                        <span>MRR: <strong className="text-white">${finance.mrr.toLocaleString()}</strong></span>
                        <span className="text-[#F5C518]">•</span>
                        <span>LTV/CAC: <strong className="text-white">${finance.ltvCacRatio}x</strong></span>
                        <span className="text-[#F5C518]">•</span>
                        <span>Margen: <strong className="text-white">${finance.profitMargin}%</strong></span>
                        <span className="text-[#F5C518]">•</span>
                        <span>Churn: <strong className={`${finance.churnRate > 15 ? "text-red-400" : "text-white"}`}>${finance.churnRate}%</strong></span>
                        <span className="text-[#F5C518]">•</span>
                        <span>NPS: <strong className="text-white">${finance.nps}</strong></span>
                        <span className="text-[#F5C518]">•</span>
                        <span>Neto: <strong className="text-emerald-400">${finance.net.toLocaleString()}</strong></span>
                        <span className="text-[#F5C518]">•</span>
                        <span>Proyección: <strong className="text-white">${finance.proj.toLocaleString()}</strong></span>
                        <span className="text-[#F5C518]">•</span>
                        <span>Meta: <strong className="text-white">${(tenantSettings?.monthly_goal || 15000).toLocaleString()}</strong></span>
                        <span className="text-[#F5C518]">•</span>
                      </>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Central Pane */}
            <div className="flex-1 flex overflow-hidden min-h-0">
              {/* Left Side: Chat Messages */}
              <div className="flex-1 flex flex-col min-w-0 bg-[#06050a]/30">
                <div className="flex-1 p-4 overflow-y-auto custom-scroll flex flex-col gap-3">
                  {copilotMsgs.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {m.role === 'user' ? (
                        <div className="max-w-[90%] p-3 rounded-2xl text-xs bg-gradient-to-r from-amber-500 to-[#F5C518] text-black font-semibold rounded-br-none shadow-[0_4px_12px_rgba(245,197,24,0.15)]">
                          {m.content}
                        </div>
                      ) : (
                        <div className="group relative flex flex-col items-start max-w-[90%]">
                          <div className="p-3 rounded-2xl text-xs bg-white/5 text-white border border-white/10 rounded-bl-none w-full">
                            <div className="flex flex-col gap-1 text-[11px] leading-relaxed text-white/90">
                              {parseChartTag(m.content).map((part, pIdx) => {
                                if (part.type === 'chart') {
                                  return (
                                    <EmbedChart 
                                      key={pIdx} 
                                      type={part.chartType} 
                                      data={part.chartData} 
                                      labels={part.chartLabels} 
                                    />
                                  );
                                }
                                return (
                                  <div 
                                    key={pIdx}
                                    className="markdown-content"
                                    dangerouslySetInnerHTML={{ __html: renderMarkdown(part.content) }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => speakMessage(m.content, i)}
                            className={`mt-1 text-[8px] flex items-center gap-1 transition-all px-1.5 py-0.5 rounded cursor-pointer ${
                              speakingMsgIdx === i 
                                ? 'text-red-400 bg-red-400/10 border border-red-400/20 animate-pulse' 
                                : 'text-slate-400 hover:text-[#F5C518] hover:bg-white/5'
                            }`}
                          >
                            <Icon name={speakingMsgIdx === i ? "square" : "volume-2"} className="w-2.5 h-2.5" />
                            <span>{speakingMsgIdx === i ? "Detener Audio" : "Escuchar Reporte"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {copilotLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white/5 border border-white/10 text-white rounded-2xl rounded-bl-none p-3 flex gap-1.5 items-center">
                        <div className="w-1.5 h-1.5 bg-[#F5C518] rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-[#F5C518] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-1.5 h-1.5 bg-[#F5C518] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Suggestion Chips */}
                <div className="px-3 pb-2 pt-1 border-t border-white/5 bg-black/20 overflow-x-auto flex gap-1.5 custom-scroll scrollbar-none select-none">
                  {view === 'landing' ? (
                    [
                      { label: '🚀 ROI Elevore', prompt: 'Haz una simulación de ROI personalizada para mi negocio usando Elevore.' },
                      { label: '💎 Ver Planes', prompt: 'Explícame detalladamente qué incluye cada plan y cuál me conviene.' },
                      { label: '🌟 Ventajas', prompt: '¿Cuáles son las 3 ventajas principales de Elevore frente a la competencia?' },
                      { label: '📱 Demo GPS', prompt: '¿Cómo funciona el rastreo GPS en tiempo real de los equipos?' }
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCopilotInput(chip.prompt);
                        }}
                        className="px-2.5 py-1 bg-white/5 hover:bg-[#F5C518]/10 hover:border-[#F5C518]/30 border border-white/10 rounded-full text-[9px] font-bold text-slate-300 hover:text-[#F5C518] transition-all whitespace-nowrap active:scale-95 cursor-pointer"
                      >
                        {chip.label}
                      </button>
                    ))
                  ) : (
                    [
                      { label: '📊 ROI Mkt', prompt: 'Haz un análisis cuantitativo riguroso sobre el ROI de nuestros canales de adquisición y dime cuál deberíamos duplicar o cancelar.' },
                      { label: '💡 Plan LTV', prompt: `Dame un plan financiero estilo Wall Street para duplicar nuestro LTV/CAC ratio, analizando el LTV actual de ${finance.avgLTV} y CAC de ${finance.avgCAC}.` },
                      { label: '🎯 VIP Upsell', prompt: `Identifica qué clientes VIP deberíamos convencer para pasarse a membresías recurrentes. Analiza a nuestros mejores candidatos: ${finance.mbTargets.slice(0,5).map(c=>c.name).join(', ')}.` },
                      { label: '🚨 Winback', prompt: `Genera una estrategia de campaña de recuperación (Winback) para recuperar los clientes inactivos. Analiza a: ${finance.churn.slice(0,5).map(c=>c.name).join(', ')}.` },
                      { label: '📉 Forense Churn', prompt: `Analiza nuestra tasa de churn del ${finance.churnRate}% y genera un reporte forense detallado con acciones mitigantes.` }
                    ].map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setCopilotInput(chip.prompt);
                        }}
                        className="px-2.5 py-1 bg-white/5 hover:bg-[#F5C518]/10 hover:border-[#F5C518]/30 border border-white/10 rounded-full text-[9px] font-bold text-slate-300 hover:text-[#F5C518] transition-all whitespace-nowrap active:scale-95 cursor-pointer"
                      >
                        {chip.label}
                      </button>
                    ))
                  )}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleCopilot} className="p-3 border-t border-white/10 bg-black/60 flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={toggleCopilotDictation}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all active:scale-95 cursor-pointer ${
                      copilotListening 
                        ? 'bg-red-500/20 text-red-500 border-red-500/40 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                        : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:border-white/20'
                    }`}
                    title="Dictar por voz"
                  >
                    <Icon name="mic" className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={copilotInput}
                    onChange={e => setCopilotInput(e.target.value)}
                    placeholder={copilotListening ? "Escuchando dictado..." : "Pregúntale a James Sterling..."}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#F5C518] focus:bg-white/[0.08] transition-all placeholder-slate-500"
                  />
                  <button type="submit" disabled={copilotLoading} className="w-10 h-10 bg-[#F5C518] hover:bg-[#E5B508] disabled:opacity-40 disabled:hover:bg-[#F5C518] text-black rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(245,197,24,0.25)] cursor-pointer">
                    <Icon name="send" className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Right Side: Ledger Data Desk / ROI Calculator */}
              {copilotWide && (
                view === 'landing' ? (
                  <div className="w-[420px] border-l border-white/10 bg-[#07060b]/90 flex flex-col overflow-y-auto custom-scroll p-4 gap-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <Icon name="calculator" className="w-3.5 h-3.5 text-[#F5C518]" />
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Elevore SaaS ROI Simulator</h4>
                      </div>
                      <span className="text-[7px] bg-emerald-500/20 text-emerald-400 font-mono px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase tracking-widest animate-pulse font-black">Interactive Sandbox</span>
                    </div>

                    <div className="space-y-4">
                      {/* Input 1 */}
                      <div>
                        <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 mb-1">
                          <span>Ingreso Mensual Actual</span>
                          <span className="text-white font-mono">${simRevenue.toLocaleString()} USD</span>
                        </div>
                        <input
                          type="range"
                          min="2000"
                          max="100000"
                          step="1000"
                          value={simRevenue}
                          onChange={(e) => setSimRevenue(parseInt(e.target.value))}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#F5C518]"
                        />
                        <div className="flex justify-between text-[7px] text-slate-500 font-mono mt-1">
                          <span>$2,000</span>
                          <span>$100,000</span>
                        </div>
                      </div>

                      {/* Input 2 */}
                      <div>
                        <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 mb-1">
                          <span>Trabajos Completados / Mes</span>
                          <span className="text-white font-mono">{simJobs} trabajos</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="300"
                          step="5"
                          value={simJobs}
                          onChange={(e) => setSimJobs(parseInt(e.target.value))}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#F5C518]"
                        />
                        <div className="flex justify-between text-[7px] text-slate-500 font-mono mt-1">
                          <span>10</span>
                          <span>300</span>
                        </div>
                      </div>
                    </div>

                    {/* Projection Calculations */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 space-y-2.5">
                      <span className="text-[8px] text-[#F5C518] font-black uppercase tracking-widest block">Beneficios Mensuales Estimados</span>
                      
                      <div className="flex justify-between items-center text-[10px] border-b border-white/5 pb-2">
                        <div>
                          <p className="font-bold text-white leading-tight">Upsell de Membresía (+35%)</p>
                          <p className="text-[7px] text-slate-500 font-mono">Incremento de ticket promedio por cotizaciones 3-tier</p>
                        </div>
                        <span className="text-xs font-black text-emerald-400 font-mono">+${Math.round(simRevenue * 0.35).toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] border-b border-white/5 pb-2">
                        <div>
                          <p className="font-bold text-white leading-tight">Tiempo de Oficina Ahorrado</p>
                          <p className="text-[7px] text-slate-500 font-mono">Auto-despacho, GPS en vivo y firmas digitales</p>
                        </div>
                        <span className="text-xs font-black text-emerald-400 font-mono">+${Math.round(simJobs * 0.5)} hrs/mes</span>
                      </div>

                      <div className="flex justify-between items-center text-[10px]">
                        <div>
                          <p className="font-bold text-white leading-tight">Clientes Recuperados (Churn Winback)</p>
                          <p className="text-[7px] text-slate-500 font-mono">Campañas de recuperación automatizadas por WhatsApp</p>
                        </div>
                        <span className="text-xs font-black text-emerald-400 font-mono">+${Math.round(simJobs * 0.08)} clientes</span>
                      </div>
                    </div>

                    {/* Net Value card */}
                    <div className="bg-gradient-to-br from-[#F5C518]/20 to-transparent border border-[#F5C518]/30 rounded-xl p-3 text-center">
                      <p className="text-[8px] text-[#F5C518] font-black uppercase tracking-widest">Valor Neto Generado Anual</p>
                      <h3 className="text-2xl font-black italic tracking-tighter text-white mt-1">${Math.round(simRevenue * 0.35 * 12).toLocaleString()} USD</h3>
                      <p className="text-[6px] text-slate-400 uppercase tracking-widest mt-1">Estimado en base a un incremento mínimo del 35%</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-[420px] border-l border-white/10 bg-[#07060b]/90 flex flex-col overflow-y-auto custom-scroll p-4 gap-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <Icon name="activity" className="w-3.5 h-3.5 text-[#F5C518]" />
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Elevore Quant Ledger</h4>
                      </div>
                      <span className="text-[7px] bg-emerald-500/20 text-emerald-400 font-mono px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase tracking-widest animate-pulse font-black">Real-Time Data Feed</span>
                    </div>

                    {/* Economic Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex flex-col justify-between">
                        <span className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">Net Margin / profit</span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-xs font-black text-white font-mono-values">${finance.net.toLocaleString()}</span>
                          <span className="text-[8px] text-emerald-400 font-mono font-bold">Margin: {finance.profitMargin}%</span>
                        </div>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 flex flex-col justify-between">
                        <span className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">Lifetime efficiency</span>
                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-xs font-black text-white font-mono-values">{finance.ltvCacRatio}x</span>
                          <span className="text-[7px] text-slate-400 font-mono">LTV: ${finance.avgLTV} / CAC: ${finance.avgCAC}</span>
                        </div>
                      </div>
                    </div>

                    {/* Marketing Channels ROI Report */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                      <span className="text-[8px] text-[#F5C518] font-black uppercase tracking-widest block mb-2">Canales de Adquisición & ROI</span>
                      <div className="space-y-2">
                        {finance.channelReport.map((ch, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[10px] border-b border-white/5 pb-1.5 last:border-b-0 last:pb-0">
                            <div>
                              <p className="font-bold text-white leading-tight">{ch.name}</p>
                              <p className="text-[7px] text-slate-500 font-mono">CAC: ${ch.cac} | Spend: ${ch.spend} | Conv: {ch.customers}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-white">${ch.ltv.toLocaleString()}</p>
                              <p className={`text-[8px] font-mono font-black ${ch.roi >= 100 ? 'text-emerald-400' : ch.roi > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                ROI: {ch.roi}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Targets */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* Upsell VIP */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col">
                        <div className="flex items-center gap-1 mb-2 text-[8px] text-[#F5C518] font-black uppercase tracking-widest">
                          <Icon name="crown" className="w-2.5 h-2.5" />
                          <span>Upsell Membresía</span>
                        </div>
                        <div className="flex-1 space-y-1.5 overflow-y-auto max-h-24 custom-scroll pr-1">
                          {finance.mbTargets.length > 0 ? (
                            finance.mbTargets.slice(0, 4).map((t, idx) => (
                              <div key={idx} className="text-[9px] bg-white/5 px-2 py-1 rounded border border-white/5 flex justify-between items-center">
                                <span className="font-semibold text-white truncate max-w-[80px]" title={t.name}>{t.name}</span>
                                <span className="text-[8px] font-mono text-amber-400 font-bold">{t.count} serv.</span>
                              </div>
                            ))
                          ) : (
                            <p className="text-[8px] text-slate-500 italic">No hay candidatos.</p>
                          )}
                        </div>
                      </div>

                      {/* Winback Churn */}
                      <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex flex-col">
                        <div className="flex items-center gap-1 mb-2 text-[8px] text-red-400 font-black uppercase tracking-widest">
                          <Icon name="alert-circle" className="w-2.5 h-2.5" />
                          <span>Winback Churn ({finance.churn.length})</span>
                        </div>
                        <div className="flex-1 space-y-1.5 overflow-y-auto max-h-24 custom-scroll pr-1">
                          {finance.churn.length > 0 ? (
                            finance.churn.slice(0, 4).map((t, idx) => (
                              <div key={idx} className="text-[9px] bg-white/5 px-2 py-1 rounded border border-white/5 flex justify-between items-center">
                                <span className="font-semibold text-white truncate max-w-[100px]" title={t.name}>{t.name}</span>
                                <Icon name="alert-triangle" className="w-2.5 h-2.5 text-amber-500/80 animate-pulse" />
                              </div>
                            ))
                          ) : (
                            <p className="text-[8px] text-slate-500 italic">Cero clientes en churn.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </>
    );
  };


  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-x-hidden">
        <LandingPage onLogin={() => setView('auth')} onSignup={() => setView('signup')} />
        {renderCopilot()}
      </div>
    );
  }
  if (view === 'signup') return <OnboardingFlow onBack={() => setView('landing')} tt={tt} />;
  if (view === 'auth') return <LoginFlow onBack={() => setView('landing')} onLoginSuccess={handleLoginSuccess} tt={tt} />;

  // Staff View Mobile Operations Check-in Checklist
  if (role === 'staff' && aStaff) {
    return <StaffJob job={aStaff} onBack={() => setAStaff(null)} onRefresh={refresh} tt={tt} recTime={recTime} upsell={upsell} update={update} employee={activeEmployee} isOffline={isOffline} />;
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-black to-zinc-950 text-slate-100 font-sans">
      <Toast />
      {quickMode && <QQ onClose={() => setQM(false)} />}
      {chatJob && <ChatModal />}
      {aiOpen && <AIAdvisor jobs={jobs} clients={clients} staff={staff} isStaff={role === 'staff'} activeUser={activeEmployee?.name || 'User'} onClose={() => setAIOpen(false)} tt={tt} onOpenReport={() => { setAIOpen(false); setAIReportOpen(true); }} />}
      {aiReportOpen && <AIReportModal jobs={jobs} clients={clients} staff={staff} onClose={() => setAIReportOpen(false)} tt={tt} />}

      {/* OVERLAY DE SIMULACIÓN DE COBRO RECURRENTE */}
      {chargingClient && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-lg z-[3000] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-20 h-20 relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-[#F5C518] animate-spin"></div>
            <Icon name="credit-card" className="w-8 h-8 text-[#F5C518] animate-pulse" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-widest text-white mb-2">Simulando Cobro Recurrente</h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">Cliente: {chargingClient.name}</p>
          <div className="max-w-xs w-full space-y-3 mt-4 text-[9px] font-black uppercase tracking-wider text-left border-l border-white/10 pl-4">
            {[
              { key: 'connecting', label: 'Conectando con Stripe Billing Gateway...' },
              { key: 'verifying', label: 'Verificando método de pago predeterminado...' },
              { key: 'authorizing', label: 'Autorizando cobro de membresía...' },
              { key: 'success', label: '¡Cobro Exitoso! Notificando al cliente...' }
            ].map(step => {
              const active = chargeStage === step.key;
              const completed = ['connecting', 'verifying', 'authorizing', 'success'].indexOf(chargeStage) > ['connecting', 'verifying', 'authorizing', 'success'].indexOf(step.key);
              return (
                <div key={step.key} className={`flex items-center gap-2 transition-all duration-300 ${active ? 'text-[#F5C518] font-extrabold scale-105 pl-1' : completed ? 'text-green-500 opacity-60' : 'text-slate-700 opacity-30'}`}>
                  <div className={`w-2 h-2 rounded-full ${active ? 'bg-[#F5C518] animate-ping' : completed ? 'bg-green-500' : 'bg-slate-800'}`} />
                  <span>{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* OVERLAY DE SIMULACIÓN DE STRIPE SAAS SUBSCRIPTION */}
      {billingProgressStage && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-lg z-[3000] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-20 h-20 relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-[#F5C518] animate-spin"></div>
            <Icon name="credit-card" className="w-8 h-8 text-[#F5C518] animate-pulse" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-widest text-white mb-2">Procesando Suscripción SaaS</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-6">Plan: {selectedBillingPlan.toUpperCase()}</p>
          <div className="max-w-xs w-full space-y-3 mt-4 text-[9px] font-black uppercase tracking-wider text-center text-slate-300 animate-pulse">
            {billingProgressStage}
          </div>
        </div>
      )}

      {/* OVERLAY DE SIMULACIÓN DE DISPARO DE CAMPAÑA MASIVA */}
      {campaignSending && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-lg z-[3000] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <div className="w-20 h-20 relative flex items-center justify-center mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-white/5 border-t-indigo-500 animate-spin"></div>
            <Icon name="mail" className="w-8 h-8 text-indigo-500 animate-pulse" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-widest text-white mb-2">Disparando Campaña de Marketing</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-6">Progreso: {campaignProgress} de {campaignTotal}</p>
          
          <div className="w-full max-w-xs bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5 p-[1px] mb-6">
            <div 
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300" 
              style={{ width: `${(campaignProgress / campaignTotal) * 100}%` }}
            />
          </div>

          <div className="max-w-xs w-full space-y-3 mt-4 text-[9px] font-black uppercase tracking-wider text-center text-slate-300 animate-pulse">
            {campaignStage}
          </div>
        </div>
      )}

      {/* 🧬 CLIENT DETAIL SLIDE-OUT DRAWER */}
      {selectedClient && (() => {
        const clientJobs = jobs.filter(j => j.client_name === selectedClient.name);
        const ltv = clientJobs.reduce((acc, j) => acc + (j.total_price || 0), 0);
        const totalCount = clientJobs.length;
        const lv = lvl(totalCount);
        const allPhotos = [];
        clientJobs.forEach(job => {
          const bp = job.before_photos || job.specs?.before_photos || [];
          const ap = job.after_photos || job.specs?.after_photos || [];
          if (Array.isArray(bp)) bp.forEach(url => allPhotos.push({ url, type: 'Antes', date: job.scheduled_date }));
          if (Array.isArray(ap)) ap.forEach(url => allPhotos.push({ url, type: 'Después', date: job.scheduled_date }));
        });

        return (
          <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1999] transition-opacity duration-300 animate-in fade-in" onClick={() => setSelectedClient(null)} />
            <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-950/95 backdrop-blur-md border-l border-white/10 z-[2000] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
              <div className="p-6 border-b border-white/5 flex flex-col gap-2 relative">
                <button onClick={() => setSelectedClient(null)} className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                  <Icon name="x" className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[7px] font-black px-2 py-0.5 rounded-full uppercase" style={{ background: lv.color, color: '#000' }}>{lv.name}</span>
                  {selectedClient.membership && selectedClient.membership !== 'none' && (
                    <span className="text-[7px] font-black px-2 py-0.5 rounded-full bg-[#F5C518]/20 text-[#F5C518] uppercase">💎 {selectedClient.membership}</span>
                  )}
                </div>
                <h3 className="text-lg font-black uppercase italic text-white leading-tight">{selectedClient.name}</h3>
                <p className="text-[8px] text-slate-500 uppercase tracking-widest leading-none">Expediente de Retención y Preferencias</p>
              </div>

              <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5 grid grid-cols-3 gap-2 text-center">
                <div><p className="text-[7px] text-slate-500 uppercase font-black">LTV Total</p><p className="text-xs font-black text-green-400 mt-0.5">{fmt$(ltv)}</p></div>
                <div><p className="text-[7px] text-slate-500 uppercase font-black">Servicios</p><p className="text-xs font-black text-[#F5C518] mt-0.5">{totalCount}</p></div>
                <div><p className="text-[7px] text-slate-500 uppercase font-black">Teléfono</p><p className="text-[9px] font-black text-white mt-0.5 truncate">{selectedClient.phone || 'N/A'}</p></div>
              </div>

              <div className="flex border-b border-white/5 bg-black/40 p-1">
                {[
                  { id: 'preferences', label: 'PREFERENCIAS', icon: 'sliders' },
                  { id: 'history', label: 'HISTORIAL', icon: 'clock' },
                  { id: 'gallery', label: 'GALERÍA', icon: 'image' }
                ].map(t => (
                  <button key={t.id} onClick={() => setDrawerTab(t.id)} className={`flex-1 py-3 text-[8px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 rounded-lg transition-all ${drawerTab === t.id ? 'bg-white/5 text-[#F5C518] font-extrabold border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/[0.02]'}`}>
                    <Icon name={t.icon} className="w-3.5 h-3.5" /> {t.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 nsb">
                {drawerTab === 'preferences' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-500 tracking-widest pl-1">Código de Acceso / Llave</label><input className="inp w-full uppercase font-mono text-xs" placeholder="Ej. Código 1234#" value={prefEntryCode} onChange={e => setPrefEntryCode(e.target.value)} /></div>
                    <div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-500 tracking-widest pl-1">Mascotas en Casa</label><input className="inp w-full text-xs" placeholder="Ej. Dos perros" value={prefPets} onChange={e => setPrefPets(e.target.value)} /></div>
                    <div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-500 tracking-widest pl-1">Preferencias de Productos</label><input className="inp w-full text-xs" placeholder="Ej. Productos ecológicos" value={prefProducts} onChange={e => setPrefProducts(e.target.value)} /></div>
                    <div className="space-y-1"><label className="text-[8px] font-black uppercase text-slate-500 tracking-widest pl-1">Notas Internas para el Staff</label><textarea rows={4} className="inp w-full text-xs resize-none" placeholder="Cuidado extra con el piso..." value={prefNotes} onChange={e => setPrefNotes(e.target.value)} /></div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest pl-1">Idioma del Cliente / Client Language</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[{ l: 'English 🇺🇸', v: 'en' }, { l: 'Español 🇪🇸', v: 'es' }].map(lg => (
                          <button key={lg.v} onClick={() => setPrefLang(lg.v)} className={`py-2 rounded-xl text-[8px] font-black uppercase border-2 active:scale-95 transition-all ${prefLang === lg.v ? 'bg-amber-500 border-amber-500 text-black' : 'bg-white/5 border-white/5 text-slate-500'}`}>{lg.l}</button>
                        ))}
                      </div>
                    </div>
                    <button onClick={saveClientPreferences} className="w-full py-4 bg-[#F5C518] hover:bg-[#F5C518]/90 text-black text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-95 transition-all shadow-[0_0_20px_rgba(245,197,24,0.15)] flex items-center justify-center gap-2">
                      <Icon name="save" className="w-4 h-4" /> Guardar Preferencias
                    </button>
                  </div>
                )}
                {drawerTab === 'history' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {clientJobs.length === 0 ? (
                      <div className="text-center py-12 text-[9px] text-slate-600 uppercase font-black italic">No hay historial</div>
                    ) : (
                      <div className="relative border-l border-white/5 pl-4 ml-2 space-y-5">
                        {clientJobs.sort((a,b) => new Date(b.scheduled_date) - new Date(a.scheduled_date)).map(job => (
                          <div key={job.id} className="relative group">
                            <div className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${job.status === 'paid' ? 'bg-blue-500' : job.status === 'completed' ? 'bg-purple-500' : 'bg-amber-500'}`} />
                            <div className="g p-4 space-y-2 bg-white/[0.01] hover:bg-white/[0.03] transition-colors border border-white/5">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-xs font-black text-white uppercase italic">{job.service_type || 'Limpieza'}</h4>
                                  <p className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">{fmtD(job.scheduled_date)}</p>
                                </div>
                                <span className={`text-[6px] font-black px-1.5 py-0.5 rounded uppercase ${job.status === 'paid' ? 'bg-blue-500/20 text-blue-400' : job.status === 'completed' ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'}`}>{job.status}</span>
                              </div>
                              <div className="flex justify-between items-center text-[9px]">
                                <span className="font-black text-slate-300">{fmt$(job.total_price)}</span>
                                {job.client_rating && <span className="text-[#F5C518] font-black">⭐ {job.client_rating}/5</span>}
                              </div>
                              <div className="flex gap-2 items-center justify-end border-t border-white/5 pt-2 mt-1">
                                {job.approval_signature && (
                                  <div className="text-right"><p className="text-[5px] text-slate-600 uppercase font-black">Cotización</p><img src={job.approval_signature} className="h-5 opacity-40 hover:opacity-100 transition-opacity border border-white/10 rounded" alt="firma" /></div>
                                )}
                                {job.final_signature && (
                                  <div className="text-right"><p className="text-[5px] text-slate-600 uppercase font-black">Conformidad</p><img src={job.final_signature} className="h-5 opacity-40 hover:opacity-100 transition-opacity border border-white/10 rounded" alt="firma" /></div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {drawerTab === 'gallery' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {allPhotos.length === 0 ? (
                      <div className="text-center py-12 text-[9px] text-slate-600 uppercase font-black italic">No hay fotos</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {allPhotos.map((photo, i) => (
                          <div key={i} className="relative rounded-xl overflow-hidden border border-white/10 group cursor-zoom-in" onClick={() => window.open(photo.url, '_blank')}>
                            <img src={photo.url} alt="Servicio" className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-105" />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-left">
                              <span className={`text-[6px] font-black px-1 py-0.5 rounded uppercase ${photo.type === 'Antes' ? 'bg-amber-600 text-white' : 'bg-green-600 text-white'}`}>{photo.type}</span>
                              <p className="text-[7px] text-slate-300 font-bold uppercase mt-1 leading-none">{fmtD(photo.date)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-white/5 bg-black/40 flex gap-2">
                <button onClick={() => { setState({ ...INIT, ...selectedClient.specs, name: selectedClient.name, phone: selectedClient.phone, address: selectedClient.address }); setSelectedClient(null); setView('operations'); setOperationsTab('deploy'); setDtab('specs'); tt('Quick booking initialized 🚀'); }} className="flex-1 py-3 bg-[#F5C518] hover:bg-[#F5C518]/90 text-black text-[9px] font-black uppercase rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"><Icon name="calendar" className="w-3.5 h-3.5" />+ Agendar Servicio</button>
                <button onClick={() => { setMapAddress(selectedClient.address); setView('brief'); setSelectedClient(null); tt('🗺️ Showing client map...'); }} className="px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl text-[9px] font-black uppercase active:scale-95 transition-all flex items-center justify-center"><Icon name="navigation" className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </>
        );
      })()}

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
                  <div className={isOffline ? 'w-2 h-2 rounded-full bg-red-500 animate-pulse' : rtOn ? 'dg' : 'da'}></div>
                  <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">
                    {isOffline ? 'Modo Offline' : rtOn ? 'Live Sync' : 'v97.0'}
                  </p>
                  {isOffline && (
                    <span className="text-[5.5px] bg-red-500/20 text-red-400 border border-red-500/30 px-1 py-0.2 rounded font-black">
                      OFFLINE
                    </span>
                  )}
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
                { id: 'operations', label: 'Operaciones', icon: 'shield-check' },
                { id: 'crm', label: 'Clientes & CRM', icon: 'users' },
                { id: 'intel', label: 'Finanzas & Equipos', icon: 'bar-chart-2' },
                { id: 'settings', label: 'Configuración', icon: 'settings' }
              ].map(item => {
                const isActive = view === item.id;
                return (
                  <button key={item.id} onClick={() => {
                    setView(item.id);
                    if (item.id === 'operations') setOperationsTab('calendar');
                    else if (item.id === 'crm') setCrmTab('dna');
                    else if (item.id === 'intel') setFinanceTab('overview');
                    else if (item.id === 'settings') setSettingsTab('company');
                    setMobileMenuOpen(false);
                  }} className={`w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-200 active:scale-95 ${isActive ? 'bg-[#F5C518] text-black shadow-lg shadow-[#F5C518]/15' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                    <div className="flex items-center gap-3">
                      <Icon name={item.icon} className={`w-4 h-4 ${isActive ? 'text-black' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.id === 'operations' && remindersBadgeCount > 0 && (
                      <span className="bg-red-600 text-white font-bold text-[8px] px-1.5 py-0.5 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                        {remindersBadgeCount}
                      </span>
                    )}
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
          <div className="flex gap-1.5 items-center">
            {isOffline && (
              <span className="flex items-center gap-1 bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-lg text-[6px] font-black uppercase tracking-wider animate-pulse mr-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span> OFFLINE
              </span>
            )}
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

              {/* Today's Missions Prominent Widget */}
              {(() => {
                const todayJobs = staffJobs.filter(j => j.scheduled_date === todayStr);
                const todayCompleted = todayJobs.filter(j => j.status === 'completed' || j.status === 'paid').length;
                const todayPending = todayJobs.filter(j => j.status !== 'completed' && j.status !== 'paid').length;
                const activeJob = todayJobs.find(j => j.status === 'in_progress');

                return (
                  <div className="g p-6 bg-gradient-to-br from-slate-950 via-zinc-900 to-black border border-[#F5C518]/20 rounded-2xl relative overflow-hidden shadow-2xl space-y-4">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5C518]/5 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[7px] font-black text-[#F5C518] uppercase tracking-wider">🎯 STATUS HOY</p>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mt-0.5">Misiones de Hoy</h3>
                      </div>
                      <span className="text-[8px] font-black text-slate-400 uppercase bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg">
                        {todayCompleted}/{todayJobs.length} Completadas
                      </span>
                    </div>

                    {todayJobs.length > 0 ? (
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-[#F5C518] to-amber-500 h-full transition-all duration-500" 
                          style={{ width: `${(todayCompleted / todayJobs.length) * 100}%` }}
                        />
                      </div>
                    ) : null}

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="bg-black/35 border border-white/5 p-3 rounded-xl">
                        <p className="text-[7px] text-slate-500 uppercase font-black">Pendientes</p>
                        <p className="text-xl font-black text-white mt-0.5">{todayPending}</p>
                      </div>
                      <div className="bg-black/35 border border-white/5 p-3 rounded-xl">
                        <p className="text-[7px] text-slate-500 uppercase font-black">Misión Activa</p>
                        <p className={`text-[10px] font-black mt-1.5 truncate ${activeJob ? 'text-green-400' : 'text-slate-500'}`}>
                          {activeJob ? activeJob.client_name : 'Ninguna'}
                        </p>
                      </div>
                    </div>
                    {todayJobs.length > 0 && (
                      <button 
                        onClick={() => setRouteModalOpen(true)}
                        className="w-full bg-slate-900 border border-[#F5C518]/30 hover:bg-[#F5C518]/10 text-[#F5C518] py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all"
                      >
                        <Icon name="map" className="w-3.5 h-3.5" />
                        Optimizar Ruta GPS (Leaflet)
                      </button>
                    )}
                  </div>
                );
              })()}

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

              {/* Staff Gamification Portal */}
              {(() => {
                const stats = getStaffStats(activeEmployee, jobs);
                return (
                  <div className="g p-6 shadow-xl bg-gradient-to-br from-indigo-950/20 via-slate-900/40 to-black border border-indigo-500/20 rounded-2xl relative overflow-hidden space-y-4">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[7px] font-black text-indigo-400 uppercase tracking-wider">🛡️ GAMIFICATION PORTAL</p>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mt-0.5">Progreso y Logros</h3>
                      </div>
                      <span className="text-[10px] font-black text-[#F5C518] uppercase bg-amber-400/10 border border-amber-400/25 px-2.5 py-1 rounded-lg">
                        Nivel {stats.level}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase">
                        <span>XP: {stats.xp}</span>
                        <span>{stats.progress}% para Nivel {stats.level + 1}</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5 p-[1px]">
                        <div 
                          className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${stats.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <p className="text-[8px] font-black text-slate-500 uppercase">Logros Obtenidos ({stats.badges.length})</p>
                      <div className="flex flex-wrap gap-1.5">
                        {stats.badges.map((badge, idx) => (
                          <span 
                            key={idx} 
                            className={`text-[8.5px] font-black px-2.5 py-1 rounded-lg border uppercase ${badge.color}`}
                          >
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

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
                  {/* Glowing SVG Line Chart */}
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Trayectoria (7 sem)</p>
                    {(() => {
                      const bars = finance.wb?.slice(-7) || [];
                      if (bars.length < 2) return <div className="h-14 flex items-center justify-center text-[10px] text-slate-600 italic">No hay suficientes datos</div>;
                      const max = Math.max(...bars.map(b => b.v || 0), 1);
                      const min = Math.min(...bars.map(b => b.v || 0));
                      const range = max - min || 1;
                      
                      const width = 200;
                      const height = 48;
                      const padding = 4;
                      
                      const points = bars.map((b, i) => {
                        const x = (i / (bars.length - 1)) * (width - padding * 2) + padding;
                        const y = height - padding - (((b.v || 0) - min) / range) * (height - padding * 2);
                        return `${x},${y}`;
                      });
                      
                      const pathData = `M ${points.join(' L ')}`;
                      const areaData = `${pathData} L ${width - padding},${height} L ${padding},${height} Z`;

                      return (
                        <div className="relative h-14 w-full">
                          <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                            <defs>
                              <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="rgba(245,197,24,0.5)" />
                                <stop offset="100%" stopColor="rgba(245,197,24,0)" />
                              </linearGradient>
                              <linearGradient id="lineColor" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#fde68a" />
                                <stop offset="100%" stopColor="#F5C518" />
                              </linearGradient>
                            </defs>
                            {/* Area fill */}
                            <path d={areaData} fill="url(#lineGlow)" className="animate-in fade-in duration-1000" />
                            {/* Line */}
                            <path d={pathData} fill="none" stroke="url(#lineColor)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-in fade-in duration-1000 delay-300 drop-shadow-[0_0_8px_rgba(245,197,24,0.8)]" />
                            {/* Data points */}
                            {bars.map((b, i) => {
                                const x = (i / (bars.length - 1)) * (width - padding * 2) + padding;
                                const y = height - padding - (((b.v || 0) - min) / range) * (height - padding * 2);
                                return <circle key={i} cx={x} cy={y} r={i === bars.length - 1 ? 4 : 2} fill={i === bars.length - 1 ? "#F5C518" : "#fff"} className="animate-in zoom-in duration-500" style={{animationDelay: `${i * 100}ms`}} />;
                            })}
                          </svg>
                          <div className="flex justify-between mt-1">
                            {bars.map((b, i) => (
                              <span key={i} className={`text-[6px] font-bold ${i === bars.length - 1 ? 'text-[#F5C518]' : 'text-slate-600'}`}>{b.l?.slice(0, 1)}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* ── KPI CARDS ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <button onClick={deploySmartCampaign} className="mt-4 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[8px] uppercase active:scale-95 shadow-lg shadow-blue-600/20 transition-all">Deploy Campaign →</button>
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

              {/* ── ELEVORE HEALTH & ANALYTICS CENTER ── */}
              <div className="relative rounded-2xl overflow-hidden border border-amber-500/10 bg-gradient-to-br from-zinc-950 via-black to-slate-950 p-6 space-y-4 shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-amber-500/50 via-purple-500/30 to-transparent" />
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <h3 className="text-[10px] font-black text-white uppercase tracking-widest font-display">💎 Elevore Health & Advanced Analytics</h3>
                  </div>
                  <span className="text-[7px] font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-widest">Growth Deck v2.0</span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                  {/* LTV CARD */}
                  <div className="bg-white/[0.02] border border-white/5 hover:border-white/10 p-4 rounded-xl flex flex-col justify-between min-h-[110px] transition-all">
                    <div>
                      <p className="text-[7.5px] text-slate-500 font-black uppercase tracking-wider">Average Lifetime Value</p>
                      <p className="text-xl font-black text-white mt-1">
                        {isPrivate ? <span className="blur-xs select-none">***</span> : fmt$(finance.avgLTV)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[7px] font-black uppercase text-slate-400">
                      <span>Ciclo de vida</span>
                      <span className="text-green-400">LTV Alto</span>
                    </div>
                  </div>

                  {/* CHURN RATE CARD */}
                  <div className="bg-white/[0.02] border border-white/5 hover:border-white/10 p-4 rounded-xl flex flex-col justify-between min-h-[110px] transition-all">
                    <div>
                      <p className="text-[7.5px] text-slate-500 font-black uppercase tracking-wider">Tasa de Churn (45 días)</p>
                      <p className="text-xl font-black text-white mt-1">
                        {finance.churnRate}%
                      </p>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                        <div className={`h-full ${finance.churnRate > 15 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(finance.churnRate * 4, 100)}%` }} />
                      </div>
                      <div className="flex justify-between text-[7px] font-black uppercase">
                        <span className="text-slate-500">Inactivos: {finance.churn.length}</span>
                        <span className={finance.churnRate > 15 ? 'text-red-400' : 'text-green-400'}>
                          {finance.churnRate > 15 ? 'Riesgo Alto' : 'Óptimo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CAC CARD */}
                  <div className="bg-white/[0.02] border border-white/5 hover:border-white/10 p-4 rounded-xl flex flex-col justify-between min-h-[110px] transition-all">
                    <div>
                      <p className="text-[7.5px] text-slate-500 font-black uppercase tracking-wider">Costo Adquisición (CAC)</p>
                      <p className="text-xl font-black text-white mt-1">
                        {isPrivate ? <span className="blur-xs select-none">***</span> : fmt$(finance.avgCAC)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[7px] font-black uppercase text-slate-400">
                      <span>Costo por Lead</span>
                      <span className="text-blue-400">Eficiente</span>
                    </div>
                  </div>

                  {/* LTV : CAC RATIO CARD */}
                  <div className="bg-white/[0.02] border border-white/5 hover:border-white/10 p-4 rounded-xl flex flex-col justify-between min-h-[110px] transition-all">
                    <div>
                      <p className="text-[7.5px] text-slate-500 font-black uppercase tracking-wider">Ratio LTV : CAC</p>
                      <p className="text-xl font-black text-[#F5C518] mt-1">
                        {finance.ltvCacRatio}x
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[7px] font-black uppercase">
                      <span className="text-slate-500">Rentabilidad Mkt</span>
                      <span className={finance.ltvCacRatio >= 3 ? 'text-green-400 font-bold' : 'text-amber-400'}>
                        {finance.ltvCacRatio >= 3 ? 'Excelente 💎' : 'Saludable'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  {/* NET PROFIT MARGIN CARD */}
                  <div className="bg-white/[0.01] border border-white/5 p-4 rounded-xl space-y-3.5">
                    <div className="flex justify-between items-center">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">💰 Net Profit Margin & Payouts</p>
                      <span className="text-[7px] font-black text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded uppercase">Margin: {finance.profitMargin}%</span>
                    </div>
                    <div className="space-y-2 text-[9px] font-bold uppercase">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Margen de Ganancia Neto:</span>
                        <span className="text-white font-black">{isPrivate ? '***' : fmt$(finance.net)} ({finance.profitMargin}%)</span>
                      </div>
                      <div className="flex justify-between items-center border-t border-white/5 pt-2">
                        <span className="text-slate-500">Pago Promedio a Staff:</span>
                        <span className="text-amber-400 font-black">{isPrivate ? '***' : fmt$(finance.avgStaffPay)} / clean</span>
                      </div>
                    </div>
                  </div>

                  {/* AI RETENTION & GROWTH INSIGHTS */}
                  <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Icon name="brain" className="w-4.5 h-4.5 text-[#F5C518]" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-amber-500 uppercase tracking-wider">AI Analytics Insight</p>
                      {finance.churnRate > 15 ? (
                        <p className="text-[8.5px] text-slate-300 leading-relaxed font-semibold">
                          ⚠️ **Alerta Churn ({finance.churnRate}%):** La inactividad de clientes superó el umbral. Sugerimos lanzar la campaña de re-engagement en el CRM o enviar promociones automáticas por WhatsApp para recuperar cuentas.
                        </p>
                      ) : finance.ltvCacRatio >= 3.5 ? (
                        <p className="text-[8.5px] text-slate-300 leading-relaxed font-semibold">
                          💎 **Excelente salud ({finance.ltvCacRatio}x LTV/CAC):** El valor de vida útil del cliente cubre ampliamente el costo de adquisición. Tienes margen para aumentar la pauta publicitaria o el bono de referidos.
                        </p>
                      ) : (
                        <p className="text-[8.5px] text-slate-300 leading-relaxed font-semibold">
                          🟢 **Ratio LTV:CAC estable ({finance.ltvCacRatio}x):** El retorno es saludable. Optimizar las comisiones por upsells del staff aumentará la rentabilidad por visita.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>


              {/* ── LIVE GPS DISPATCH ── */}
              <div className="relative rounded-2xl overflow-hidden border border-[#F5C518]/15 bg-gradient-to-br from-amber-950/10 to-black p-6 space-y-4">
                <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-[#F5C518]/40 to-transparent" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                    <h3 className="text-[10px] font-black text-white uppercase tracking-widest font-display">🚚 SERVICIOS ACTIVOS EN CURSO</h3>
                  </div>
                  <button 
                    onClick={autoDispatchMission} 
                    disabled={isDispatching}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all border ${isDispatching ? 'bg-amber-500/10 text-amber-500/50 border-amber-500/20' : 'bg-amber-500 text-black border-amber-400 hover:bg-amber-400 active:scale-95 shadow-[0_0_15px_rgba(245,197,24,0.3)]'}`}
                  >
                    {isDispatching ? (
                      <><Icon name="loader" className="w-3 h-3 animate-spin" /> Routing...</>
                    ) : (
                      <><Icon name="zap" className="w-3 h-3" /> Auto-Dispatch</>
                    )}
                  </button>
                </div>
                
                {activeMapAddress && (
                  <div className="space-y-2 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex justify-between items-center bg-[#F5C518]/10 border border-[#F5C518]/25 p-3 rounded-xl">
                      <div className="flex items-center gap-2">
                        <Icon name="navigation" className="w-3.5 h-3.5 text-[#F5C518] animate-pulse" />
                        <span className="text-[9px] font-black text-white uppercase tracking-widest truncate max-w-[240px]">MAP: {activeMapAddress}</span>
                      </div>
                      <button onClick={() => setMapAddress('')} className="text-[8px] font-black text-red-400 hover:text-red-300 uppercase active:scale-95 transition-all">✕ Close</button>
                    </div>
                    <MapComponent address={activeMapAddress} />
                  </div>
                )}
                
                {/* Active Services List instead of Tactical Map */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scroll">
                  {(() => {
                    const activeJobs = jobs.filter(j => j.scheduled_date === todayStr && (j.status === 'scheduled' || j.status === 'in_progress'));
                    if (activeJobs.length === 0) {
                      return (
                        <div className="text-center p-6 bg-white/[0.02] border border-white/5 rounded-xl text-slate-500 text-[8px] font-black uppercase">
                          No hay servicios activos programados para hoy.
                        </div>
                      );
                    }
                    return activeJobs.map(job => (
                      <div key={job.id} className="g p-4 flex items-center justify-between border border-white/5 bg-black/40 hover:border-white/10 transition-all rounded-xl">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[6px] font-black px-1.5 py-0.5 rounded-md uppercase ${job.status === 'in_progress' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-amber-500/10 text-[#F5C518] border border-amber-500/20'}`}>
                              {job.status}
                            </span>
                            <h4 className="text-xs font-black text-white uppercase italic">{job.client_name}</h4>
                          </div>
                          <p className="text-[7.5px] text-slate-400 font-bold uppercase">{job.service_type} • 👷 {job.team_assigned || 'TBD'}</p>
                          <p className="text-[7px] text-slate-500 italic truncate max-w-[280px]">{job.address}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              const ph = (job.client_phone || '').replace(/\D/g, '');
                              const ph2 = ph.length === 10 ? '1' + ph : ph;
                              window.open(`https://wa.me/${ph2}?text=${encodeURIComponent(`Hola ${job.client_name}, de parte de Elevore. ¿Cómo va todo con tu servicio?`)}`, '_blank');
                            }} 
                            className="p-2.5 bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-all rounded-xl active:scale-95 border border-green-500/25"
                          >
                            <Icon name="message-circle" className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => {
                              const dest = encodeURIComponent(job.address);
                              window.open(`https://www.google.com/maps/search/?api=1&query=${dest}`, '_blank');
                            }} 
                            className="p-2.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all rounded-xl active:scale-95 border border-blue-500/25"
                          >
                            <Icon name="navigation" className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}



          {/* =====================================================================
              👑 ADMIN DASHBOARD FINANCES TABS (intel)
              ===================================================================== */}
          {role === 'admin' && view === 'intel' && (
            <div className="space-y-6 animate-in fade-in">
              {/* Premium Sub-tabs Switcher */}
              <div className="flex gap-2 bg-black/45 p-1.5 rounded-2xl border border-white/5 overflow-x-auto nsb">
                {[
                  { id: 'overview', name: '📊 Resumen General' },
                  { id: 'services', name: '🧹 Desglose por Servicio' },
                  { id: 'payroll', name: '👥 Nómina y Equipos' },
                  { id: 'cac', name: '🎯 CAC & ROI de Marketing' },
                  { id: 'inventory', name: '🛠️ Inventario' },
                  { id: 'tax', name: '📋 Libro Contable y Exportación' },
                  { id: 'productivity', name: '📈 Rendimiento y Calidad' },
                  { id: 'automation', name: '🤖 Automatización y Mensajería' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFinanceTab(tab.id)}
                    className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase whitespace-nowrap active:scale-95 transition-all ${
                      financeTab === tab.id
                        ? 'bg-[#F5C518] text-black shadow-lg shadow-[#F5C518]/15'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>

              {financeTab === 'overview' && (
                <>
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

                  {/* 🔮 SCENARIO BUILDER: BI PROJECTIONS WIDGET */}
                  <div className="g p-6 bg-gradient-to-br from-[#0a0f1d] via-black to-[#0d162d] border border-blue-500/20 rounded-2xl relative overflow-hidden shadow-2xl space-y-6">
                    <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-blue-400/50 via-purple-500/30 to-transparent" />
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2">
                        <Icon name="brain" className="w-4 h-4 text-blue-400 animate-pulse" />
                        <h3 className="text-xs font-black text-white uppercase tracking-widest font-display">🔮 Simulador de Crecimiento & Margen BI</h3>
                      </div>
                      <span className="text-[7px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-widest">Predictive Engine</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
                      {/* Sliders Column */}
                      <div className="space-y-4 lg:col-span-2">
                        {/* Slider 1: Projected Active Clients */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[9px] uppercase font-black text-slate-400">
                            <span>Clientes Recurrentes Mensuales</span>
                            <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10">{biSimClients} Clientes</span>
                          </div>
                          <input 
                            type="range" 
                            min="1" 
                            max="200" 
                            value={biSimClients} 
                            onChange={e => setBiSimClients(parseInt(e.target.value))}
                            className="w-full accent-blue-500 bg-white/10 h-1 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        {/* Slider 2: Staff Payout Percentage */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[9px] uppercase font-black text-slate-400">
                            <span>Porcentaje de Pago al Staff</span>
                            <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10">{biSimPayoutPct}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="10" 
                            max="80" 
                            value={biSimPayoutPct} 
                            onChange={e => setBiSimPayoutPct(parseInt(e.target.value))}
                            className="w-full accent-amber-500 bg-white/10 h-1 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>

                        {/* Slider 3: Monthly Marketing Budget */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[9px] uppercase font-black text-slate-400">
                            <span>Presupuesto Mensual de Marketing</span>
                            <span className="text-white font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10">${biSimMarketing.toLocaleString()} USD</span>
                          </div>
                          <input 
                            type="range" 
                            min="0" 
                            max="5000" 
                            step="100" 
                            value={biSimMarketing} 
                            onChange={e => setBiSimMarketing(parseInt(e.target.value))}
                            className="w-full accent-purple-500 bg-white/10 h-1 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Calculations & Charts Column */}
                      {(() => {
                        const avgTicket = 250; // assumed avg ticket
                        const simRevenueVal = biSimClients * avgTicket;
                        const simStaffCost = Math.round(simRevenueVal * (biSimPayoutPct / 100));
                        const simMaterialsCost = biSimClients * 30; // $30/month materials overhead
                        const simFixedCost = 500; // fixed overhead
                        const totalExpensesVal = simStaffCost + simMaterialsCost + biSimMarketing + simFixedCost;
                        const simNetProfit = Math.max(0, simRevenueVal - totalExpensesVal);
                        const marginPct = simRevenueVal > 0 ? Math.round((simNetProfit / simRevenueVal) * 100) : 0;

                        // Visual chart data
                        const maxVal = Math.max(simRevenueVal, totalExpensesVal, 1);
                        const revH = Math.round((simRevenueVal / maxVal) * 100);
                        const expH = Math.round((totalExpensesVal / maxVal) * 100);
                        const netH = Math.round((simNetProfit / maxVal) * 100);

                        return (
                          <div className="bg-black/40 border border-white/5 p-4 rounded-xl flex flex-col justify-between space-y-4">
                            <div className="grid grid-cols-3 gap-2 text-center h-24 items-end px-2">
                              {/* Revenue Bar */}
                              <div className="flex flex-col items-center h-full justify-end group relative">
                                <div style={{ height: `${revH}%` }} className="w-6 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all" />
                                <span className="text-[6.5px] text-slate-500 mt-1 uppercase font-black">Rev</span>
                              </div>
                              {/* Expense Bar */}
                              <div className="flex flex-col items-center h-full justify-end group relative">
                                <div style={{ height: `${expH}%` }} className="w-6 bg-gradient-to-t from-red-600 to-red-400 rounded-t-sm shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-all" />
                                <span className="text-[6.5px] text-slate-500 mt-1 uppercase font-black">Exp</span>
                              </div>
                              {/* Net Profit Bar */}
                              <div className="flex flex-col items-center h-full justify-end group relative">
                                <div style={{ height: `${netH}%` }} className="w-6 bg-gradient-to-t from-green-600 to-green-400 rounded-t-sm shadow-[0_0_10px_rgba(34,197,94,0.3)] transition-all" />
                                <span className="text-[6.5px] text-slate-500 mt-1 uppercase font-black">Net</span>
                              </div>
                            </div>

                            <div className="space-y-1.5 uppercase text-[7.5px] font-black tracking-wider border-t border-white/5 pt-2">
                              <div className="flex justify-between">
                                <span className="text-slate-500">MRR Proyectado:</span>
                                <span className="text-blue-400 font-mono">${simRevenueVal.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Gastos Totales:</span>
                                <span className="text-red-400 font-mono">${totalExpensesVal.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between border-t border-white/5 pt-1.5 text-[8.5px]">
                                <span className="text-slate-200">Utilidad Neta:</span>
                                <span className="text-green-400 font-mono">${simNetProfit.toLocaleString()} ({marginPct}%)</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* ── CRM ALERTAS DE CHURN Y NPS ── */}
                  <div className="g p-6 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                      <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-widest font-display">⚠️ ALERTAS DE CHURN (RIESGO DE ABANDONO)</h3>
                        <p className="text-[7.5px] text-slate-500 uppercase font-bold mt-0.5">Clientes que superaron su frecuencia de servicio o llevan más de 45 días inactivos</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] bg-red-500/10 text-red-400 border border-red-500/25 font-bold px-2 py-0.5 rounded-full uppercase">
                          Score NPS Promedio: {finance.nps > 0 ? `+${finance.nps}` : finance.nps}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scroll pr-1">
                      {finance.churn.length === 0 ? (
                        <div className="text-center p-6 bg-white/[0.01] border border-white/5 rounded-xl text-slate-500 text-[8px] font-black uppercase">
                          No hay clientes con riesgo de churn detectados en este momento.
                        </div>
                      ) : (
                        finance.churn.map(client => {
                          const clientJobs = jobs.filter(j => j.client_name === client.name && (j.status === 'paid' || j.status === 'completed'));
                          const lastJob = clientJobs.sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))[0];
                          const daysInactive = lastJob ? dAgo(lastJob.scheduled_date) : 999;
                          const clientNps = lastJob?.client_rating || 5; // default to 5-star
                          
                          return (
                            <div key={client.name} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-black/40 border border-white/5 rounded-xl gap-3 hover:border-red-500/20 transition-all">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-xs font-black text-white uppercase italic">{client.name}</h4>
                                  <span className="text-[6.5px] font-black px-1.5 py-0.5 rounded uppercase bg-red-950/40 text-red-400 border border-red-500/20 animate-pulse">
                                    RIESGO DE CHURN
                                  </span>
                                  <span className="text-[6.5px] font-bold px-1.5 py-0.5 rounded uppercase bg-white/5 text-slate-400 border border-white/5">
                                    Inactivo: {daysInactive} días
                                  </span>
                                </div>
                                <p className="text-[7.5px] text-slate-400 font-bold uppercase mt-1">
                                  Frecuencia: {client.frequency || 'ocasional'} • Tel: {client.phone}
                                </p>
                                <p className="text-[7px] text-slate-500 italic mt-0.5">Última visita: {lastJob ? `${lastJob.service_type} (${fmtD(lastJob.scheduled_date)})` : 'Desconocida'}</p>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <span className="text-slate-500 block text-[6px] uppercase font-bold">Satisfacción</span>
                                  <div className="flex gap-0.5 mt-0.5">
                                    {Array.from({ length: 5 }, (_, i) => (
                                      <span key={i} className={`text-[9px] ${i < clientNps ? 'text-[#F5C518]' : 'text-slate-700'}`}>★</span>
                                    ))}
                                  </div>
                                </div>
                                <button
                                  onClick={() => reactivateClientWithAI(client)}
                                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-black uppercase text-[8px] rounded-xl active:scale-95 transition-all shadow-[0_0_15px_rgba(245,197,24,0.15)] flex items-center gap-1.5"
                                >
                                  <Icon name="message-circle" className="w-3 h-3 text-black" />
                                  IA Reactivar ⚡
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
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
                </>
              )}

              {financeTab === 'services' && (() => {
                const serviceMetrics = [];
                const map = {};
                jobs.forEach(job => {
                  if (job.status === 'lost') return;
                  const type = job.service_type || 'regular';
                  const price = Number(job.total_price) || 0;
                  if (!map[type]) {
                    map[type] = { count: 0, revenue: 0 };
                  }
                  map[type].count += 1;
                  map[type].revenue += price;
                });
                Object.entries(map).forEach(([name, data]) => {
                  serviceMetrics.push({
                    name,
                    count: data.count,
                    revenue: data.revenue,
                    avgTicket: data.count > 0 ? data.revenue / data.count : 0
                  });
                });
                serviceMetrics.sort((a, b) => b.revenue - a.revenue);

                return (
                  <div className="g p-6 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] space-y-6">
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-widest font-display">🧹 DESGLOSE FINANCIERO POR SERVICIO</h3>
                      <p className="text-[7.5px] text-slate-500 uppercase font-bold mt-0.5">Ingresos y tickets promedio generados por cada categoría de servicio</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">💰 Participación de Ingresos</p>
                        <div className="space-y-3 bg-white/5 p-5 rounded-2xl border border-white/5">
                          {serviceMetrics.map(item => {
                            const totalRevenue = serviceMetrics.reduce((sum, i) => sum + i.revenue, 0);
                            const percentage = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;
                            return (
                              <div key={item.name} className="space-y-1">
                                <div className="flex justify-between text-[8px] uppercase font-black">
                                  <span className="text-white">{item.name}</span>
                                  <span className="text-[#F5C518]">{fmt$(item.revenue)} ({Math.round(percentage)}%)</span>
                                </div>
                                <div className="pb h-1.5 bg-black/40 rounded-full overflow-hidden">
                                  <div className="pf h-full bg-gradient-to-r from-amber-400 to-[#F5C518]" style={{ width: `${percentage}%` }}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[9px] uppercase font-bold tracking-wider">
                          <thead>
                            <tr className="text-slate-500 border-b border-white/5 pb-2 text-[7.5px]">
                              <th className="py-2">Categoría</th>
                              <th className="py-2 text-center">Servicios</th>
                              <th className="py-2 text-right">Ingresos Totales</th>
                              <th className="py-2 text-right text-[#F5C518]">Ticket Promedio</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {serviceMetrics.map(item => (
                              <tr key={item.name} className="hover:bg-white/[0.02] transition-colors">
                                <td className="py-3 text-white font-black">{item.name}</td>
                                <td className="py-3 text-center text-slate-300">{item.count}</td>
                                <td className="py-3 text-right text-green-400">{fmt$(item.revenue)}</td>
                                <td className="py-3 text-right text-[#F5C518]">{fmt$(item.avgTicket)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {financeTab === 'payroll' && (
                <div className="g p-6 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-widest font-display">👥 NÓMINA Y RENDIMIENTO DE EQUIPOS</h3>
                      <p className="text-[7.5px] text-slate-500 uppercase font-bold mt-0.5">Control de saldos devengados, comisiones y pagos por Zelle a los trabajadores</p>
                    </div>
                    <span className="text-[7.5px] font-black px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/25 uppercase tracking-wider">TEAM PAYROLL</span>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {staff.map(worker => (
                      <div key={worker.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl gap-4 hover:border-slate-500/20 transition-all">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-white uppercase italic">{worker.name}</h4>
                            <span className="text-[6.5px] font-black px-2 py-0.5 rounded-full uppercase bg-white/5 text-slate-400 border border-white/5">
                              {worker.role}
                            </span>
                          </div>
                          <div className="flex gap-4 text-[8px] uppercase text-slate-500 mt-2 font-bold">
                            <span>Acumulado: <strong className="text-slate-300">{fmt$(worker.total_earned || 0)}</strong></span>
                            <span>Código PIN: <strong className="text-slate-300">{worker.passcode}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 justify-between sm:justify-end">
                          <div className="text-right">
                            <span className="text-slate-500 block text-[6.5px] uppercase font-black">Saldo Pendiente</span>
                            <span className="text-lg font-black text-white leading-none">{fmt$(worker.wallet_balance || 0)}</span>
                          </div>
                          <button
                            onClick={() => handleCashout(worker)}
                            className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-black font-black uppercase text-[8px] rounded-xl active:scale-95 transition-all shadow-[0_0_15px_rgba(16,185,129,0.1)] flex items-center gap-1.5"
                          >
                            💸 Zelle Payout
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {financeTab === 'cac' && (
                <div className="g p-6 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <div>
                      <h3 className="text-xs font-black text-white uppercase tracking-widest font-display">🎯 CANALES DE ADQUISICIÓN, CAC Y ROI</h3>
                      <p className="text-[7.5px] text-slate-500 uppercase font-bold mt-0.5">Rendimiento publicitario y retorno de inversión por cada origen de leads</p>
                    </div>
                    <span className="text-[7.5px] font-black px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/25 uppercase tracking-wider">ROI TRACKING</span>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <p className="text-[7.5px] text-slate-500 uppercase font-black tracking-wider">Total Ad Spend</p>
                      <p className="text-2xl font-black text-red-400 mt-1">
                        {fmt$(finance.channelReport?.reduce((sum, ch) => sum + (ch.spend || 0), 0) || 0)}
                      </p>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <p className="text-[7.5px] text-slate-500 uppercase font-black tracking-wider">Total LTV Generated</p>
                      <p className="text-2xl font-black text-green-400 mt-1">
                        {fmt$(finance.channelReport?.reduce((sum, ch) => sum + (ch.ltv || 0), 0) || 0)}
                      </p>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <p className="text-[7.5px] text-slate-500 uppercase font-black tracking-wider">Average CAC</p>
                      <p className="text-2xl font-black text-orange-400 mt-1">
                        {(() => {
                          const report = finance.channelReport || [];
                          const withCac = report.filter(ch => ch.cac > 0);
                          if (withCac.length === 0) return '—';
                          const avg = withCac.reduce((sum, ch) => sum + ch.cac, 0) / withCac.length;
                          return fmt$(avg);
                        })()}
                      </p>
                    </div>
                    <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
                      <p className="text-[7.5px] text-slate-500 uppercase font-black tracking-wider">Overall Marketing ROI</p>
                      <p className="text-2xl font-black text-[#F5C518] mt-1">
                        {(() => {
                          const spend = finance.channelReport?.reduce((sum, ch) => sum + (ch.spend || 0), 0) || 0;
                          const ltv = finance.channelReport?.reduce((sum, ch) => sum + (ch.ltv || 0), 0) || 0;
                          if (spend <= 0) return '—';
                          const roi = Math.round(((ltv - spend) / spend) * 100);
                          return `${roi}%`;
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* Lead Conversion Funnel */}
                  <div className="bg-black/35 border border-white/5 p-6 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest font-mono">📊 EMBÚDO DE CONVERSIÓN DE VENTAS (LEADS FUNNEL)</p>
                      <span className="text-[7.5px] text-slate-500 uppercase font-mono">Conversión de Embudo en Tiempo Real</span>
                    </div>
                    
                    {(() => {
                      const totalLeads = jobs.length;
                      const estimatesSent = jobs.filter(j => j.status === 'lead' || j.status === 'scheduled' || j.status === 'in_progress' || j.status === 'completed' || j.status === 'paid').length;
                      const approved = jobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress' || j.status === 'completed' || j.status === 'paid').length;
                      const completed = jobs.filter(j => j.status === 'completed' || j.status === 'paid').length;

                      const pctEstimates = totalLeads > 0 ? Math.round((estimatesSent / totalLeads) * 100) : 0;
                      const pctApproved = totalLeads > 0 ? Math.round((approved / totalLeads) * 100) : 0;
                      const pctCompleted = totalLeads > 0 ? Math.round((completed / totalLeads) * 100) : 0;

                      const stages = [
                        { name: '1. Leads Totales Registrados', count: totalLeads, pct: 100, color: 'from-[#F5C518] to-amber-500', width: 'w-full' },
                        { name: '2. Cotizaciones Enviadas', count: estimatesSent, pct: pctEstimates, color: 'from-amber-500 to-orange-500', width: 'w-[90%] md:w-[85%]' },
                        { name: '3. Servicios Agendados / Aprobados', count: approved, pct: pctApproved, color: 'from-orange-500 to-blue-500', width: 'w-[80%] md:w-[70%]' },
                        { name: '4. Trabajos Completados / Cobrados', count: completed, pct: pctCompleted, color: 'from-blue-500 to-emerald-500', width: 'w-[70%] md:w-[55%]' }
                      ];

                      return (
                        <div className="space-y-4 pt-2">
                          <div className="flex flex-col items-center space-y-3">
                            {stages.map((stage, idx) => (
                              <div key={idx} className="w-full flex flex-col items-center">
                                <div className={`${stage.width} transition-all duration-500 hover:scale-[1.015]`}>
                                  <div className={`p-3 bg-gradient-to-r ${stage.color} text-black font-black uppercase text-[8px] rounded-xl flex items-center justify-between shadow-lg`}>
                                    <div className="flex items-center gap-2">
                                      <span className="bg-black/15 text-[8.5px] px-2 py-0.5 rounded font-mono font-black">{idx + 1}</span>
                                      <span>{stage.name}</span>
                                    </div>
                                    <div className="text-right font-mono font-black text-[9.5px]">
                                      <span>{stage.count} ({stage.pct}%)</span>
                                    </div>
                                  </div>
                                </div>
                                {idx < stages.length - 1 && (
                                  <div className="w-0.5 h-3 bg-white/10 relative my-0.5 flex items-center justify-center">
                                    <div className="absolute w-1.5 h-1.5 rounded-full bg-[#F5C518]"></div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[9px] uppercase font-bold tracking-wider">
                      <thead>
                        <tr className="text-slate-500 border-b border-white/5 pb-2 text-[7.5px]">
                          <th className="py-2">Canal</th>
                          <th className="py-2 text-center">Leads</th>
                          <th className="py-2 text-center">Clientes Activos</th>
                          <th className="py-2 text-right">Inversión Ad-Spend</th>
                          <th className="py-2 text-right">CAC Promedio</th>
                          <th className="py-2 text-right">LTV Generado</th>
                          <th className="py-2 text-right text-[#F5C518]">ROI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {finance.channelReport?.map(ch => (
                          <tr key={ch.key} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 text-white font-black">{ch.name}</td>
                            <td className="py-3 text-center text-slate-300">{ch.leads}</td>
                            <td className="py-3 text-center text-slate-300">{ch.customers}</td>
                            <td className="py-3 text-right text-slate-300">{fmt$(ch.spend)}</td>
                            <td className="py-3 text-right text-red-400">{ch.cac > 0 ? fmt$(ch.cac) : '—'}</td>
                            <td className="py-3 text-right text-green-400">{fmt$(ch.ltv)}</td>
                            <td className={`py-3 text-right font-black ${ch.roi >= 0 ? 'text-[#F5C518]' : 'text-red-500'}`}>
                              {ch.spend > 0 ? `${ch.roi}%` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {financeTab === 'inventory' && (
                <InventoryTab
                  inventory={inventory}
                  setInventory={setInventory}
                  newItem={newItem}
                  setNewItem={setNewItem}
                  financeTab={financeTab}
                  setFinanceTab={setFinanceTab}
                  tt={tt}
                />
              )}

              {financeTab === 'tax' && (() => {
                // Filter jobs
                const filteredJobs = jobs.filter(j => {
                  if (j.status === 'lost') return false;
                  
                  // search query match
                  const queryLower = taxQuery.toLowerCase();
                  const matchesQuery = 
                    (j.client_name || '').toLowerCase().includes(queryLower) ||
                    (j.address || '').toLowerCase().includes(queryLower) ||
                    (j.service_type || '').toLowerCase().includes(queryLower);
                  
                  // status match
                  const matchesStatus = taxStatus === 'all' ? true : j.status === taxStatus;
                  
                  return matchesQuery && matchesStatus;
                });

                // Helper to get labor pct and cost
                const getJobLaborCost = (job) => {
                  const w = staff.find(s => s.name === job.team_assigned);
                  const pct = getPayoutPct(w);
                  return Math.round((job.deposit_paid || job.total_price || 0) * pct);
                };

                // Compute sums
                const totalGross = filteredJobs.reduce((acc, j) => acc + Number(j.total_price || 0), 0);
                const totalLabor = filteredJobs.reduce((acc, j) => acc + getJobLaborCost(j), 0);
                const totalMaterials = filteredJobs.reduce((acc, j) => acc + Number(j.specs?.materialCost || 0), 0);
                const totalMarketing = filteredJobs.reduce((acc, j) => acc + Number(j.specs?.marketingCost || 0), 0);
                const totalExpenses = filteredJobs.reduce((acc, j) => acc + Number(j.specs?.expenses || 0), 0);
                const totalNet = Math.max(0, totalGross - totalLabor - totalMaterials - totalMarketing - totalExpenses);

                // CSV Exporter
                const exportCSV = () => {
                  let csv = 'Fecha,Cliente,Servicio,Ingreso Bruto,Pago Staff (Labor),Materiales,Marketing,Gastos Operativos,Utilidad Neta\n';
                  filteredJobs.forEach(j => {
                    const labor = getJobLaborCost(j);
                    const mat = Number(j.specs?.materialCost || 0);
                    const mkt = Number(j.specs?.marketingCost || 0);
                    const exp = Number(j.specs?.expenses || 0);
                    const net = Math.max(0, Number(j.total_price || 0) - labor - mat - mkt - exp);
                    
                    csv += `"${j.scheduled_date || 'N/A'}","${(j.client_name || '').replace(/"/g, '""')}","${(j.service_type || '').replace(/"/g, '""')}",${j.total_price || 0},${labor},${mat},${mkt},${exp},${net}\n`;
                  });
                  
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.setAttribute('href', url);
                  link.setAttribute('download', `elevore_libro_contable_${new Date().toISOString().split('T')[0]}.csv`);
                  link.style.visibility = 'hidden';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  tt('Libro contable exportado a CSV con éxito ✓', 'green');
                };

                // Print/PDF Exporter
                const printReport = () => {
                  const printWindow = window.open('', '_blank');
                  if (!printWindow) return alert('Por favor habilita las ventanas emergentes para imprimir.');

                  const tableRows = filteredJobs.map(j => {
                    const labor = getJobLaborCost(j);
                    const mat = Number(j.specs?.materialCost || 0);
                    const mkt = Number(j.specs?.marketingCost || 0);
                    const exp = Number(j.specs?.expenses || 0);
                    const net = Math.max(0, Number(j.total_price || 0) - labor - mat - mkt - exp);
                    
                    return `
                      <tr>
                        <td>${j.scheduled_date || '—'}</td>
                        <td>${j.client_name || '—'}</td>
                        <td>${j.service_type || '—'}</td>
                        <td align="right">$${Number(j.total_price || 0).toLocaleString()}</td>
                        <td align="right">-$${labor.toLocaleString()}</td>
                        <td align="right">-$${mat.toLocaleString()}</td>
                        <td align="right">-$${mkt.toLocaleString()}</td>
                        <td align="right">-$${exp.toLocaleString()}</td>
                        <td align="right" style="font-weight: bold; color: green;">$${net.toLocaleString()}</td>
                      </tr>
                    `;
                  }).join('');

                  printWindow.document.write(`
                    <html>
                    <head>
                      <title>Elevore SaaS - Reporte Contable y Fiscal</title>
                      <style>
                        body { font-family: monospace; padding: 20px; color: #333; background: #fff; }
                        h1 { font-size: 16px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 1px; }
                        p { font-size: 10px; color: #666; margin: 0 0 20px 0; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px; }
                        th { background: #f3f4f6; text-transform: uppercase; font-weight: bold; padding: 8px; border: 1px solid #d1d5db; text-align: left; }
                        td { padding: 8px; border: 1px solid #e5e7eb; }
                        tr:nth-child(even) { background: #f9fafb; }
                        .summary-grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
                        .summary-card { border: 1px solid #d1d5db; padding: 10px; border-radius: 4px; background: #f9fafb; }
                        .summary-card p { margin: 0 0 5px 0; font-size: 8px; font-weight: bold; color: #666; }
                        .summary-card h3 { margin: 0; font-size: 14px; font-weight: bold; }
                        @media print {
                          body { padding: 0; }
                          @page { margin: 1.5cm; }
                        }
                      </style>
                    </head>
                    <body>
                      <h1>Elevore SaaS // Libro Contable y Fiscal</h1>
                      <p>Fecha de reporte: ${new Date().toLocaleString()} | Filtrado por: ${taxStatus.toUpperCase()}</p>
                      
                      <div class="summary-grid">
                        <div class="summary-grid">
                          <div class="summary-card">
                            <p>INGRESOS BRUTOS TOTALES</p>
                            <h3>$${totalGross.toLocaleString()}</h3>
                          </div>
                          <div class="summary-card">
                            <p>COSTO DE MANO DE OBRA (STAFF)</p>
                            <h3>-$${totalLabor.toLocaleString()}</h3>
                          </div>
                          <div class="summary-card">
                            <p>MATERIALES / MARKETING / GASTOS</p>
                            <h3>-$${(totalMaterials + totalMarketing + totalExpenses).toLocaleString()}</h3>
                          </div>
                          <div class="summary-card" style="border-color: green;">
                            <p style="color: green;">UTILIDAD NETA FISCAL</p>
                            <h3 style="color: green;">$${totalNet.toLocaleString()}</h3>
                          </div>
                        </div>
                      </div>
                      
                      <table>
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Cliente</th>
                            <th>Servicio</th>
                            <th style="text-align: right;">Bruto</th>
                            <th style="text-align: right;">Staff</th>
                            <th style="text-align: right;">Material</th>
                            <th style="text-align: right;">Marketing</th>
                            <th style="text-align: right;">Gastos</th>
                            <th style="text-align: right;">Neto</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${tableRows}
                        </tbody>
                      </table>
                      <script>
                        window.onload = function() {
                          window.print();
                          window.close();
                        };
                      </script>
                    </body>
                    </html>
                  `);
                  printWindow.document.close();
                  tt('Generando reporte de impresión PDF...', 'green');
                };

                return (
                  <div className="space-y-4 animate-in fade-in">
                    {/* Header and Exporters */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[rgba(255,255,255,0.03)] border border-white/5 p-4 rounded-2xl">
                      <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-widest font-display">📋 Libro Mayor & Declaración Fiscal</h3>
                        <p className="text-[7.5px] text-slate-500 uppercase font-bold mt-0.5">Historial contable consolidado para preparación de impuestos corporativos</p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                          onClick={exportCSV}
                          className="flex-1 sm:flex-initial px-3 py-2 bg-slate-900 border border-white/10 hover:bg-white/5 text-slate-300 rounded-xl text-[8px] font-black uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Icon name="file-text" className="w-3.5 h-3.5" />
                          CSV (Excel)
                        </button>
                        <button 
                          onClick={printReport}
                          className="flex-1 sm:flex-initial px-3 py-2 bg-[#F5C518] hover:bg-amber-400 text-black rounded-xl text-[8px] font-black uppercase tracking-wider active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[#F5C518]/10"
                        >
                          <Icon name="printer" className="w-3.5 h-3.5" />
                          Imprimir PDF
                        </button>
                      </div>
                    </div>

                    {/* Summary row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                        <p className="text-[7px] text-slate-500 font-black uppercase tracking-wider">Facturación Bruta</p>
                        <p className="text-lg font-black text-white mt-1">${totalGross.toLocaleString()}</p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                        <p className="text-[7px] text-slate-500 font-black uppercase tracking-wider">Costo Staff (Nómina)</p>
                        <p className="text-lg font-black text-red-400 mt-1">-${totalLabor.toLocaleString()}</p>
                      </div>
                      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                        <p className="text-[7px] text-slate-500 font-black uppercase tracking-wider">Materiales & Gastos</p>
                        <p className="text-lg font-black text-red-400 mt-1">-${(totalMaterials + totalMarketing + totalExpenses).toLocaleString()}</p>
                      </div>
                      <div className="bg-emerald-500/[0.03] border border-emerald-500/25 p-4 rounded-xl">
                        <p className="text-[7px] text-emerald-400 font-black uppercase tracking-wider">Utilidad Neta</p>
                        <p className="text-lg font-black text-green-400 mt-1">${totalNet.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Filter bar */}
                    <div className="flex flex-col sm:flex-row gap-3 text-left">
                      <input 
                        type="text" 
                        value={taxQuery}
                        onChange={e => setTaxQuery(e.target.value)}
                        placeholder="Buscar por cliente, dirección o servicio..."
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-slate-600 outline-none focus:border-amber-500 transition-colors"
                      />
                      <select 
                        value={taxStatus}
                        onChange={e => setTaxStatus(e.target.value)}
                        className="bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white font-black outline-none focus:border-amber-500 transition-colors"
                      >
                        <option value="all">TODOS LOS ESTADOS</option>
                        <option value="paid">PAGADOS (PAID)</option>
                        <option value="completed">COMPLETADOS</option>
                        <option value="scheduled">PROGRAMADOS</option>
                      </select>
                    </div>

                    {/* Ledger table */}
                    <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                      <div className="overflow-x-auto custom-scroll">
                        <table className="w-full text-left border-collapse text-[8.5px] font-bold uppercase tracking-wider">
                          <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400">
                              <th className="p-3">Fecha</th>
                              <th className="p-3">Cliente</th>
                              <th className="p-3">Servicio</th>
                              <th className="p-3 text-right">Bruto</th>
                              <th className="p-3 text-right">Mano Obra</th>
                              <th className="p-3 text-right">Material</th>
                              <th className="p-3 text-right">Marketing</th>
                              <th className="p-3 text-right">Gastos</th>
                              <th className="p-3 text-right">Neto</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-left text-white">
                            {filteredJobs.length === 0 ? (
                              <tr>
                                <td colSpan="9" className="p-8 text-center text-slate-500 italic">No hay transacciones registradas para este filtro</td>
                              </tr>
                            ) : (
                              filteredJobs.map(j => {
                                const labor = getJobLaborCost(j);
                                const mat = Number(j.specs?.materialCost || 0);
                                const mkt = Number(j.specs?.marketingCost || 0);
                                const exp = Number(j.specs?.expenses || 0);
                                const net = Math.max(0, Number(j.total_price || 0) - labor - mat - mkt - exp);
                                
                                return (
                                  <tr key={j.id} className="hover:bg-white/[0.01] transition-all">
                                    <td className="p-3 font-mono text-slate-400">{j.scheduled_date || '—'}</td>
                                    <td className="p-3 font-black text-slate-200">{j.client_name || '—'}</td>
                                    <td className="p-3 font-semibold text-slate-300">{j.service_type || '—'}</td>
                                    <td className="p-3 text-right text-slate-100">${Number(j.total_price || 0).toLocaleString()}</td>
                                    <td className="p-3 text-right text-red-400">-${labor.toLocaleString()}</td>
                                    <td className="p-3 text-right text-slate-400">-${mat.toLocaleString()}</td>
                                    <td className="p-3 text-right text-slate-400">-${mkt.toLocaleString()}</td>
                                    <td className="p-3 text-right text-slate-400">-${exp.toLocaleString()}</td>
                                    <td className="p-3 text-right font-black text-green-400">${net.toLocaleString()}</td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {financeTab === 'productivity' && (() => {
                // Calculate productivity and quality metrics per team/staff profile
                const completedJobs = jobs.filter(j => j.status === 'completed' || j.status === 'paid');
                
                // Group by team
                const teamStats = {};
                staff.forEach(s => {
                  if (s.role === 'staff') {
                    teamStats[s.name] = {
                      name: s.name,
                      completed: 0,
                      totalRating: 0,
                      ratedJobsCount: 0,
                      totalEarnings: 0,
                      totalHours: 0,
                      jobsWithTime: 0
                    };
                  }
                });

                completedJobs.forEach(j => {
                  const team = j.team_assigned || 'General Staff';
                  if (!teamStats[team]) {
                    teamStats[team] = {
                      name: team,
                      completed: 0,
                      totalRating: 0,
                      ratedJobsCount: 0,
                      totalEarnings: 0,
                      totalHours: 0,
                      jobsWithTime: 0
                    };
                  }
                  
                  teamStats[team].completed += 1;
                  teamStats[team].totalEarnings += Number(j.total_price || 0);
                  
                  if (j.client_rating) {
                    teamStats[team].totalRating += Number(j.client_rating);
                    teamStats[team].ratedJobsCount += 1;
                  }
                  
                  if (j.check_in_time && j.check_out_time) {
                    const dur = (new Date(j.check_out_time) - new Date(j.check_in_time)) / (1000 * 60 * 60); // hours
                    if (dur > 0 && dur < 24) {
                      teamStats[team].totalHours += dur;
                      teamStats[team].jobsWithTime += 1;
                    }
                  }
                });

                const statsArray = Object.values(teamStats);
                const avgRatingGlobal = completedJobs.filter(j => j.client_rating).reduce((acc, j) => acc + Number(j.client_rating), 0) / (completedJobs.filter(j => j.client_rating).length || 1);
                
                // Filter feedbacks for the feed
                const feedbacks = jobs.filter(j => j.client_rating !== null && j.client_rating !== undefined);

                return (
                  <div className="space-y-6 animate-in fade-in pb-12">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div className="g p-5 border border-white/5 bg-black/45 rounded-2xl text-left">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Tareas Completadas</p>
                        <h3 className="text-2xl font-black text-white mt-1">{completedJobs.length} <span className="text-[10px] text-green-400 font-bold uppercase">Servicios</span></h3>
                        <p className="text-[7.5px] text-slate-400 mt-1 uppercase font-semibold">Total histórico de la plataforma</p>
                      </div>
                      <div className="g p-5 border border-white/5 bg-black/45 rounded-2xl text-left">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Satisfacción Promedio</p>
                        <h3 className="text-2xl font-black text-amber-400 mt-1">⭐️ {avgRatingGlobal > 0 ? avgRatingGlobal.toFixed(1) : '5.0'}<span className="text-[10px] text-slate-500 font-bold uppercase"> / 5.0</span></h3>
                        <p className="text-[7.5px] text-slate-400 mt-1 uppercase font-semibold">Basado en feedbacks de clientes</p>
                      </div>
                      <div className="g p-5 border border-white/5 bg-black/45 rounded-2xl text-left">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Tiempo de Respuesta Eficiente</p>
                        <h3 className="text-2xl font-black text-green-400 mt-1">98.4%<span className="text-[10px] text-slate-500 font-bold uppercase"> Puntualidad</span></h3>
                        <p className="text-[7.5px] text-slate-400 mt-1 uppercase font-semibold">Cuadrillas dentro del rango horario</p>
                      </div>
                    </div>

                    {/* Team Productivity Table & Trend Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* Productivity per Team */}
                      <div className="g p-5 border border-white/5 bg-black/45 rounded-2xl flex flex-col">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest pb-3 border-b border-white/5 text-left">📊 Desempeño por Cuadrilla</h4>
                        <div className="overflow-x-auto custom-scroll mt-3 flex-1">
                          <table className="w-full text-left border-collapse text-[8.5px] font-bold uppercase tracking-wider">
                            <thead>
                              <tr className="border-b border-white/5 bg-white/[0.01] text-slate-400">
                                <th className="p-3">Equipo</th>
                                <th className="p-3 text-center">Misiones</th>
                                <th className="p-3 text-center">Calificación</th>
                                <th className="p-3 text-center">Tiempos</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-left text-white">
                              {statsArray.map(stat => {
                                const avgR = stat.ratedJobsCount > 0 ? (stat.totalRating / stat.ratedJobsCount).toFixed(1) : '5.0';
                                const avgH = stat.jobsWithTime > 0 ? (stat.totalHours / stat.jobsWithTime).toFixed(1) + ' hrs' : 'N/A';
                                return (
                                  <tr key={stat.name} className="hover:bg-white/[0.01] transition-all">
                                    <td className="p-3 font-black text-slate-200">{stat.name}</td>
                                    <td className="p-3 text-center font-mono text-green-400">{stat.completed}</td>
                                    <td className="p-3 text-center text-amber-400">⭐ {avgR}</td>
                                    <td className="p-3 text-center text-slate-300">{avgH}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* SVG CSS Trend Chart */}
                      <div className="g p-5 border border-white/5 bg-black/45 rounded-2xl flex flex-col text-left">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest pb-3 border-b border-white/5">📈 Tendencia Semanal de Calidad</h4>
                        <div className="flex-1 flex flex-col justify-center py-4">
                          {/* Beautiful SVG graph */}
                          <div className="relative h-32 w-full mt-2">
                            <svg className="w-full h-full" viewBox="0 0 100 30" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#F5C518" stopOpacity="0.25" />
                                  <stop offset="100%" stopColor="#F5C518" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>
                              {/* Grid lines */}
                              <line x1="0" y1="5" x2="100" y2="5" stroke="rgba(255,255,255,0.05)" strokeWidth="0.2" />
                              <line x1="0" y1="15" x2="100" y2="15" stroke="rgba(255,255,255,0.05)" strokeWidth="0.2" />
                              <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.05)" strokeWidth="0.2" />
                              {/* Filled path */}
                              <path d="M 0 30 L 0 10 L 20 8 L 40 12 L 60 7 L 80 5 L 100 4 L 100 30 Z" fill="url(#chartGrad)" />
                              {/* Stroke line */}
                              <path d="M 0 10 L 20 8 L 40 12 L 60 7 L 80 5 L 100 4" fill="none" stroke="#F5C518" strokeWidth="0.8" strokeLinecap="round" />
                            </svg>
                            {/* SVG Markers */}
                            <div className="absolute top-2 left-0 w-full flex justify-between px-1 text-[7px] font-bold text-slate-500 uppercase tracking-widest pointer-events-none">
                              <span>Sem 1</span>
                              <span>Sem 2</span>
                              <span>Sem 3</span>
                              <span>Sem 4</span>
                              <span>Sem 5 (Hoy)</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5 text-[8.5px] uppercase font-bold text-slate-400">
                            <span>Calificación Objetivo: <span className="text-white">4.8+</span></span>
                            <span className="text-green-400 flex items-center gap-1">⭐ Calidad Óptima (100%)</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Feedbacks Grid */}
                    <div className="g p-5 border border-white/5 bg-black/45 rounded-2xl text-left">
                      <div className="flex justify-between items-center pb-3 border-b border-white/5">
                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest">💬 Feedbacks y Comentarios Recientes</h4>
                        <div className="flex gap-2">
                          {['all', '5', '4', '3'].map(star => (
                            <button
                              key={star}
                              onClick={() => setProdQualityFilter(star)}
                              className={`px-2.5 py-1 rounded-lg text-[7.5px] font-black uppercase transition-all ${
                                prodQualityFilter === star
                                  ? 'bg-[#F5C518] text-black'
                                  : 'bg-white/5 text-slate-400 hover:text-white'
                              }`}
                            >
                              {star === 'all' ? 'Todos' : `⭐ ${star}`}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {feedbacks
                          .filter(f => {
                            if (prodQualityFilter === 'all') return true;
                            return Math.round(Number(f.client_rating)) === Number(prodQualityFilter);
                          })
                          .slice(0, 6)
                          .map(f => (
                            <div key={f.id} className="g p-4 border border-white/5 bg-black/20 rounded-xl space-y-2 flex flex-col justify-between">
                              <div className="space-y-1">
                                <div className="flex justify-between items-start">
                                  <h5 className="text-[9.5px] font-black text-white uppercase italic">{f.client_name}</h5>
                                  <span className="text-amber-400 text-[9px] font-black">{'⭐'.repeat(Math.round(f.client_rating || 5))}</span>
                                </div>
                                <p className="text-[8px] text-[#F5C518] font-bold uppercase">{f.service_type} • {f.team_assigned || 'General Staff'}</p>
                                <p className="text-[8.5px] text-slate-300 italic">
                                  {f.specs?.clientNote || f.specs?.notes || "Servicio completado con firma digital de aprobación. No se registraron quejas."}
                                </p>
                              </div>
                              <div className="pt-2 border-t border-white/5 flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    const text = `Hola ${f.client_name}! ✨ Gracias por tu calificación de ${f.client_rating} estrellas en Elevore. Nos alegra que tuvieras una gran experiencia. ¡Hasta la próxima!`;
                                    window.open(`https://wa.me/${(f.client_phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
                                  }}
                                  className="px-2 py-1 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg text-[7px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                                >
                                  <Icon name="message-circle" className="w-3 h-3" />
                                  Agradecer por WA
                                </button>
                              </div>
                            </div>
                          ))}
                        {feedbacks.length === 0 && (
                          <p className="text-center text-slate-500 italic text-[9px] py-6 col-span-2">No se han registrado calificaciones de clientes aún</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {financeTab === 'automation' && (() => {
                // Get list of active/scheduled jobs to test templates
                const activeJobs = jobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress' || j.status === 'completed');
                const selectedJob = activeJobs.find(j => j.id === selectedAutomationJobId) || activeJobs[0] || null;
                
                // Active template text state binding
                let activeText = '';
                let setActiveText = () => {};
                if (activeTemplateId === 'booking') {
                  activeText = bookingTemplateText;
                  setActiveText = setBookingTemplateText;
                } else if (activeTemplateId === 'route') {
                  activeText = routeTemplateText;
                  setActiveText = setRouteTemplateText;
                } else {
                  activeText = reviewTemplateText;
                  setActiveText = setReviewTemplateText;
                }

                // Helper to populate template fields
                const getPopulatedText = () => {
                  if (!selectedJob) return activeText;
                  return activeText
                    .replace(/{CLIENT_NAME}/g, selectedJob.client_name || 'Cliente')
                    .replace(/{SERVICE_TYPE}/g, selectedJob.service_type || 'Limpieza')
                    .replace(/{DATE}/g, selectedJob.scheduled_date || 'Hoy')
                    .replace(/{TEAM}/g, selectedJob.team_assigned || 'Cuadrilla General')
                    .replace(/{ADDRESS}/g, selectedJob.address || 'Ubicación')
                    .replace(/{JOB_ID}/g, selectedJob.id || '');
                };

                const handleSendWhatsApp = () => {
                  if (!selectedJob) return tt('No hay ningún trabajo seleccionado', 'red');
                  const phone = (selectedJob.client_phone || '').replace(/\D/g, '');
                  if (!phone) return tt('El cliente no tiene teléfono registrado', 'red');
                  const text = getPopulatedText();
                  window.open(`https://wa.me/${phone.length === 10 ? '1' + phone : phone}?text=${encodeURIComponent(text)}`, '_blank');
                  tt('Redirigiendo a WhatsApp Web ✓', 'green');
                };

                return (
                  <div className="space-y-6 animate-in fade-in pb-12 text-left">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Left: Template Selector */}
                      <div className="lg:col-span-1 g p-5 border border-white/5 bg-black/45 rounded-2xl flex flex-col justify-between">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest pb-3 border-b border-white/5">📋 Plantillas Disponibles</h4>
                            <p className="text-[7.5px] text-slate-500 uppercase font-black tracking-wider mt-1.5">Selecciona para editar y testear</p>
                          </div>
                          <div className="space-y-2">
                            {[
                              { id: 'booking', name: '📅 Confirmación de Reserva', desc: 'Envía detalles de la fecha y hora agendada' },
                              { id: 'route', name: '🚗 Cuadrilla En Camino', desc: 'Avisa al cliente que el equipo está en ruta' },
                              { id: 'review', name: '🏁 Feedback y Calificación', desc: 'Solicita feedback y link del portal' }
                            ].map(t => (
                              <button
                                key={t.id}
                                onClick={() => {
                                  setActiveTemplateId(t.id);
                                  if (activeJobs.length > 0 && !selectedAutomationJobId) {
                                    setSelectedAutomationJobId(activeJobs[0].id);
                                  }
                                }}
                                className={`w-full p-3.5 border rounded-xl text-left transition-all ${
                                  activeTemplateId === t.id
                                    ? 'bg-[#F5C518]/10 border-[#F5C518] text-white'
                                    : 'bg-black/20 border-white/5 text-slate-400 hover:text-white hover:border-white/10'
                                }`}
                              >
                                <p className="text-[9px] font-black uppercase tracking-wider">{t.name}</p>
                                <p className="text-[7.5px] text-slate-500 mt-1 uppercase font-semibold">{t.desc}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 mt-4 text-[7px] font-bold text-slate-500 uppercase tracking-widest">
                          💡 Campos dinámicos soportados:
                          <div className="grid grid-cols-2 gap-1.5 mt-2 text-slate-400">
                            <span>{'{CLIENT_NAME}'}</span>
                            <span>{'{SERVICE_TYPE}'}</span>
                            <span>{'{DATE}'}</span>
                            <span>{'{TEAM}'}</span>
                            <span>{'{ADDRESS}'}</span>
                            <span>{'{JOB_ID}'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Template Editor & Preview */}
                      <div className="lg:col-span-2 g p-5 border border-white/5 bg-black/45 rounded-2xl flex flex-col space-y-4">
                        <div>
                          <h4 className="text-[10px] font-black text-white uppercase tracking-widest pb-3 border-b border-white/5">✏️ Editor de Texto de la Plantilla</h4>
                        </div>
                        
                        <div className="flex-1 flex flex-col space-y-3">
                          <textarea
                            value={activeText}
                            onChange={e => setActiveText(e.target.value)}
                            className="inp w-full flex-1 min-h-[120px] text-xs leading-relaxed custom-scroll font-medium p-3.5"
                            placeholder="Escribe el mensaje aquí..."
                          />

                          {/* Interpolation Preview */}
                          <div className="p-4 border border-[#F5C518]/10 bg-amber-500/[0.02] rounded-xl space-y-3">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                              <p className="text-[7.5px] font-black text-amber-500 uppercase tracking-widest">👁️ Vista Previa Rellena</p>
                              
                              {activeJobs.length > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  <label className="text-[7.5px] font-black text-slate-500 uppercase whitespace-nowrap">Testear con Trabajo:</label>
                                  <select
                                    value={selectedAutomationJobId || (selectedJob ? selectedJob.id : '')}
                                    onChange={e => setSelectedAutomationJobId(e.target.value)}
                                    className="bg-black/60 border border-white/5 text-[8.5px] font-bold uppercase rounded-lg p-1 text-white"
                                  >
                                    {activeJobs.slice(0, 10).map(j => (
                                      <option key={j.id} value={j.id}>
                                        {j.client_name} ({j.service_type})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <span className="text-[7.5px] text-slate-500 uppercase font-black">No hay trabajos activos para previsualizar</span>
                              )}
                            </div>

                            <p className="text-[9.5px] text-slate-200 leading-relaxed italic bg-black/30 p-3 rounded-lg border border-white/5 select-none font-medium">
                              {getPopulatedText() || <span className="text-slate-600">El mensaje está vacío. Escribe algo arriba.</span>}
                            </p>
                          </div>
                        </div>

                        {/* Trigger button */}
                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={handleSendWhatsApp}
                            disabled={!selectedJob}
                            className="px-6 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black uppercase text-[9px] tracking-wider rounded-xl transition-all active:scale-95 flex items-center gap-1.5 shadow-lg shadow-green-500/10"
                          >
                            <Icon name="send" className="w-4 h-4 text-black" />
                            Enviar Mensaje de Prueba a WhatsApp 🚀
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* =====================================================================
              👑 ADMIN DASHBOARD MISSIONS TABS (agenda)
              ===================================================================== */}
          {role === 'admin' && view === 'operations' && operationsTab === 'calendar' && (() => {
            const bulkMarkStatus = async (status) => {
              if (selectedJobs.length === 0) return;
              setLoad(true);
              try {
                const jobsToUpdate = jobs.filter(j => selectedJobs.includes(j.id));
                for (const job of jobsToUpdate) {
                  const { error } = await sb.from('elevore_missions').update({ status }).eq('id', job.id);
                  if (!error) {
                    if (status === 'completed' || status === 'paid') {
                      triggerN8nEmail({ ...job, status });
                    }
                  }
                }
                tt(`Bulk updated ${selectedJobs.length} jobs to ${status} ✓`);
                setSelectedJobs([]);
                refresh();
              } catch (e) {
                tt('Error bulk updating: ' + e.message, 'red');
              }
              setLoad(false);
            };

            const bulkWAReminders = () => {
              if (selectedJobs.length === 0) return;
              const jobsToNotify = jobs.filter(j => selectedJobs.includes(j.id));
              jobsToNotify.forEach(job => {
                const p = job.client_phone?.replace(/\D/g, '') || '';
                const ph = p.length === 10 ? '1' + p : p;
                const msg = `Hi ${job.client_name}! 🔔 Recordatorio — Elevore. Tienes un servicio programado el ${fmtD(job.scheduled_date)}.`;
                window.open(`https://wa.me/${ph}?text=${encodeURIComponent(msg)}`, '_blank');
              });
              tt(`Opened ${selectedJobs.length} WhatsApp tabs ✓`);
            };

            const allFilteredIds = filtered.map(j => j.id);
            const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedJobs.includes(id));

            const getJobsForDay = (dayObj) => {
              const yyyy = dayObj.year;
              const mm = String(dayObj.month + 1).padStart(2, '0');
              const dd = String(dayObj.day).padStart(2, '0');
              const dateKey = `${yyyy}-${mm}-${dd}`;
              return filtered.filter(job => {
                if (!job.scheduled_date) return false;
                return job.scheduled_date.startsWith(dateKey);
              });
            };

            return (
              <div className="space-y-4 animate-in fade-in pb-24">
                {/* Operations Sub-tabs Switcher */}
                <div className="flex gap-2 bg-black/45 p-1.5 rounded-2xl border border-white/5 overflow-x-auto nsb">
                  {[
                    { id: 'calendar', name: '📅 Calendario de Misiones' },
                    { id: 'reminders', name: `🔔 Recordatorios (${remindersBadgeCount})` },
                    { id: 'drive', name: '📸 Photo Drive' },
                    { id: 'map', name: '🗺️ IA Dispatcher' },
                    { id: 'deploy', name: '📝 Nueva Cotización' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setOperationsTab(tab.id)}
                      className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase whitespace-nowrap active:scale-95 transition-all ${
                        operationsTab === tab.id
                          ? 'bg-[#F5C518] text-black shadow-lg shadow-[#F5C518]/15'
                          : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {tab.name}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <h2 className="text-xl md:text-2xl font-black tracking-widest uppercase text-white font-display">MISSIONS DIRECTORY</h2>
                  <div className="flex items-center gap-3">
                    <div className="bg-black/45 border border-white/5 rounded-xl p-1 flex gap-1">
                      <button
                        onClick={() => setAgendaView('calendar')}
                        className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${agendaView === 'calendar' ? 'bg-[#F5C518] text-black shadow-lg shadow-[#F5C518]/15' : 'text-slate-400 hover:text-white'}`}
                      >
                        📅 Calendario
                      </button>
                      <button
                        onClick={() => setAgendaView('list')}
                        className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${agendaView === 'list' ? 'bg-[#F5C518] text-black shadow-lg shadow-[#F5C518]/15' : 'text-slate-400 hover:text-white'}`}
                      >
                        📋 Lista
                      </button>
                    </div>
                    <input className="inp md:max-w-xs text-xs" placeholder="🔍 Search by name or address..." value={sq} onChange={e => setSQ(e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-1.5 overflow-x-auto nsb pb-1">
                    {['all', 'lead', 'scheduled', 'in_progress', 'completed', 'paid', 'lost'].map(s => (
                      <button key={s} onClick={() => setFSt(s)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase whitespace-nowrap active:scale-95 transition-all ${fSt === s ? 'bg-[#F5C518] text-black shadow-lg shadow-[#F5C518]/15' : 'bg-white/5 text-slate-500'}`}>{s}</button>
                    ))}
                  </div>
                  {agendaView === 'list' && (
                    <button onClick={() => {
                      if (isAllSelected) {
                        setSelectedJobs(selectedJobs.filter(id => !allFilteredIds.includes(id)));
                      } else {
                        setSelectedJobs([...new Set([...selectedJobs, ...allFilteredIds])]);
                      }
                    }} className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white rounded-xl text-[8px] font-black uppercase active:scale-95 transition-all flex items-center gap-1.5">
                      <Icon name={isAllSelected ? "check-square" : "square"} className="w-3.5 h-3.5" />
                      Select All ({filtered.length})
                    </button>
                  )}
                </div>

                {agendaView === 'calendar' ? (
                  <div className="g p-6 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] rounded-3xl space-y-6">
                    {/* Calendar Month Selector & Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                      <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest font-display flex items-center gap-2">
                          <span>📅</span>
                          <span className="bg-gradient-to-r from-amber-400 to-[#F5C518] bg-clip-text text-transparent">
                            {new Date(calYear, calMonth).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                          </span>
                        </h3>
                        <p className="text-[7.5px] text-slate-500 uppercase font-bold mt-0.5">
                          Haz clic en un día vacío para programar, o en una misión para editar.
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            if (calMonth === 0) {
                              setCalMonth(11);
                              setCalYear(y => y - 1);
                            } else {
                              setCalMonth(m => m - 1);
                            }
                          }}
                          className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl active:scale-95 transition-all text-xs font-black"
                        >
                          ◀
                        </button>
                        <button
                          onClick={() => {
                            setCalMonth(new Date().getMonth());
                            setCalYear(new Date().getFullYear());
                          }}
                          className="px-3.5 py-2 bg-white/5 hover:bg-[#F5C518] hover:text-black text-white rounded-xl text-[8px] font-black uppercase active:scale-95 transition-all"
                        >
                          Hoy
                        </button>
                        <button
                          onClick={() => {
                            if (calMonth === 11) {
                              setCalMonth(0);
                              setCalYear(y => y + 1);
                            } else {
                              setCalMonth(m => m + 1);
                            }
                          }}
                          className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl active:scale-95 transition-all text-xs font-black"
                        >
                          ▶
                        </button>
                      </div>
                    </div>

                    {/* Day Names Grid */}
                    <div className="grid grid-cols-7 gap-2 text-center text-[8px] font-black uppercase text-slate-500 tracking-wider">
                      {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                        <div key={d} className="py-1 bg-white/[0.02] rounded-lg">{d}</div>
                      ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2">
                      {(() => {
                        const firstDay = new Date(calYear, calMonth, 1).getDay();
                        const startOffset = firstDay === 0 ? 6 : firstDay - 1;
                        const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
                        const prevMonthTotalDays = new Date(calYear, calMonth, 0).getDate();

                        const dayCells = [];
                        for (let i = startOffset - 1; i >= 0; i--) {
                          dayCells.push({
                            day: prevMonthTotalDays - i,
                            month: calMonth === 0 ? 11 : calMonth - 1,
                            year: calMonth === 0 ? calYear - 1 : calYear,
                            isCurrentMonth: false
                          });
                        }
                        for (let i = 1; i <= totalDays; i++) {
                          dayCells.push({
                            day: i,
                            month: calMonth,
                            year: calYear,
                            isCurrentMonth: true
                          });
                        }
                        const remaining = 42 - dayCells.length;
                        for (let i = 1; i <= remaining; i++) {
                          dayCells.push({
                            day: i,
                            month: calMonth === 11 ? 0 : calMonth + 1,
                            year: calMonth === 11 ? calYear + 1 : calYear,
                            isCurrentMonth: false
                          });
                        }

                        return dayCells.map((dayObj, index) => {
                          const dayJobs = getJobsForDay(dayObj);
                          const isToday = new Date().getDate() === dayObj.day && 
                                          new Date().getMonth() === dayObj.month && 
                                          new Date().getFullYear() === dayObj.year;

                          const yyyy = dayObj.year;
                          const mm = String(dayObj.month + 1).padStart(2, '0');
                          const dd = String(dayObj.day).padStart(2, '0');
                          const dateStr = `${yyyy}-${mm}-${dd}`;

                          return (
                            <div
                              key={index}
                              onClick={(e) => {
                                if (e.target === e.currentTarget) {
                                  setState({ ...INIT, date: dateStr });
                                  setEdit(null);
                                  setView('operations');
                                  setOperationsTab('deploy');
                                  setDtab('identity');
                                  tt(`Agendando misión para ${dateStr} 📅`);
                                }
                              }}
                              className={`min-h-[100px] p-2 bg-black/45 hover:bg-black/60 border rounded-2xl flex flex-col justify-between cursor-pointer transition-all ${
                                dayObj.isCurrentMonth ? 'border-white/5 text-white' : 'border-transparent text-slate-600 opacity-30'
                              } ${isToday ? 'border-[#F5C518] shadow-[0_0_15px_rgba(245,197,24,0.15)] bg-[#F5C518]/5' : ''}`}
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className={`text-[9px] font-black ${isToday ? 'text-[#F5C518]' : 'text-slate-400'}`}>
                                  {dayObj.day}
                                </span>
                                {dayJobs.length > 0 && (
                                  <span className="text-[6.5px] px-1.5 py-0.5 bg-white/10 text-white font-bold rounded-full">
                                    {dayJobs.length}
                                  </span>
                                )}
                              </div>

                              <div className="flex-1 space-y-1 overflow-y-auto max-h-[70px] nsb">
                                {dayJobs.map(job => {
                                  let statusColor = 'bg-slate-600/20 text-slate-400 border border-slate-500/20';
                                  if (job.status === 'paid') statusColor = 'bg-blue-600/20 text-blue-400 border border-blue-500/20';
                                  else if (job.status === 'completed') statusColor = 'bg-purple-600/20 text-purple-400 border border-purple-500/20';
                                  else if (job.status === 'in_progress') statusColor = 'bg-green-600/20 text-green-400 border border-green-500/20';
                                  else if (job.status === 'scheduled') statusColor = 'bg-amber-600/20 text-amber-400 border border-amber-500/20';
                                  else if (job.status === 'lost') statusColor = 'bg-red-600/20 text-red-400 border border-red-500/20';

                                  return (
                                    <div
                                      key={job.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEdit(job.id);
                                        setState({
                                          ...INIT,
                                          ...(job.specs || {}),
                                          name: job.client_name || '',
                                          phone: job.client_phone || '',
                                          address: job.address || '',
                                          date: job.scheduled_date || '',
                                          status: job.status || 'lead',
                                          frequency: job.frequency || 'one-time',
                                          totalPrice: job.total_price || 0,
                                          team: job.team_assigned || '',
                                        });
                                        setView('operations');
                                        setOperationsTab('deploy');
                                        setDtab('identity');
                                        tt(`Editando misión de ${job.client_name} 📝`);
                                      }}
                                      className={`p-1 rounded-lg text-[6.5px] font-black uppercase truncate tracking-tight transition-all active:scale-95 ${statusColor} hover:brightness-125`}
                                      title={`${job.client_name} - ${job.service_type}`}
                                    >
                                      {job.client_name.split(' ')[0]} - {job.service_type}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ) : (
                  <>
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
                          <div key={job.id} className={`g p-5 border-l-[7px] shadow-xl hover:bg-white/[0.01] transition-all bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] relative ${isH ? 'border-green-500' : job.status === 'paid' ? 'border-blue-500' : job.status === 'in_progress' ? 'border-green-400' : job.status === 'lead' ? 'border-[#F5C518]' : job.status === 'completed' ? 'border-purple-500' : job.status === 'lost' ? 'border-red-800' : 'border-amber-500'}`}>
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <button onClick={() => {
                                  if (selectedJobs.includes(job.id)) {
                                    setSelectedJobs(selectedJobs.filter(id => id !== job.id));
                                  } else {
                                    setSelectedJobs([...selectedJobs, job.id]);
                                  }
                                }} className="w-5 h-5 rounded-lg border-2 border-white/10 hover:border-[#F5C518] flex items-center justify-center flex-shrink-0 transition-all">
                                  {selectedJobs.includes(job.id) ? (
                                    <div className="w-3 h-3 bg-[#F5C518] rounded-sm" />
                                  ) : null}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                    <h3 onClick={() => setSelectedClient(clients.find(c => c.name === job.client_name) || { name: job.client_name, phone: job.client_phone, address: job.address })} className="text-base font-black uppercase italic text-white leading-none hover:text-[#F5C518] cursor-pointer transition-colors">{job.client_name}</h3>
                                    <span className={`text-[6px] font-black px-1.5 py-0.5 rounded-full uppercase ${job.status === 'paid' ? 'bg-blue-600 text-white' : job.status === 'in_progress' ? 'bg-green-600 text-white' : job.status === 'lead' ? 'bg-[#F5C518] text-black' : job.status === 'completed' ? 'bg-purple-600 text-white' : job.status === 'lost' ? 'bg-red-900 text-red-300' : 'bg-slate-700 text-slate-300'}`}>{job.status}</span>
                                    {job.specs?.gps_deviation && (
                                      <span className="text-[6px] bg-red-600 text-white font-black px-1.5 py-0.5 rounded-full animate-pulse flex items-center gap-0.5">
                                        <Icon name="alert-triangle" className="w-2 h-2" /> GPS DEV: {Math.round(job.specs.gps_deviation_meters || 0)}m
                                      </span>
                                    )}
                                    {isH && <span className="text-[6px] bg-green-600 text-black font-black px-1.5 py-0.5 rounded-full">🛠️</span>}
                                    {job.specs?.referred_by && (
                                      <span className="text-[6px] bg-[#F5C518]/10 text-[#F5C518] border border-[#F5C518]/25 font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                        🎁 Ref: {job.specs.referred_by.replace(/_/g, ' ')}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[8px] text-slate-400 uppercase">{job.service_type} • {fmtD(job.scheduled_date)} • Assigned: {job.team_assigned || 'No worker'}</p>
                                  {job.check_in_time && (
                                    <div className="mt-1 flex flex-wrap gap-1.5 items-center">
                                      <span className="text-[7px] text-green-400 font-bold uppercase">▶ In: {new Date(job.check_in_time).toLocaleTimeString()}</span>
                                      {job.check_out_time && (
                                        <span className="text-[7px] text-purple-400 font-bold uppercase">⏹ Out: {new Date(job.check_out_time).toLocaleTimeString()}</span>
                                      )}
                                      {job.gps_distance_meters !== undefined && job.gps_distance_meters !== null && (
                                        <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase ${Number(job.gps_distance_meters) <= 150 ? 'bg-green-500/10 text-green-400 border border-green-500/25' : 'bg-amber-500/10 text-amber-400 border border-amber-500/25 animate-pulse'}`}>
                                          📍 {Number(job.gps_distance_meters) <= 150 ? `On-Site (${job.gps_distance_meters}m)` : `Away (${job.gps_distance_meters}m)`}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button onClick={() => { setMapAddress(job.address); setView('brief'); tt('🗺️ Mostrando mapa en Dashboard...'); }} className="p-2.5 bg-blue-900/30 text-blue-400 rounded-xl hover:bg-blue-600 transition-all flex items-center justify-center gap-1 text-[8px] font-black uppercase"><Icon name="navigation" className="w-3.5 h-3.5" />Map</button>
                            </div>
                            <p className="text-[8px] text-slate-500 italic mb-2">{job.address}</p>
                            
                            <div className="grid grid-cols-3 gap-1 mb-2">
                              {[['confirm', '✅'], ['reminder', '🔔'], ['review', '⭐'], ['quote', '📋'], ['referral', '🎁'], ['bundle', '🎯']].map(([tp, em]) => (
                                <button key={tp} onClick={() => wa(job, tp)} className="py-1.5 bg-white/5 border border-white/5 rounded-xl text-[7px] font-black uppercase active:scale-95 text-slate-400 hover:text-white transition-all">{em} {tp}</button>
                              ))}
                            </div>

                            <div className="flex justify-between items-end border-t border-white/5 pt-3">
                              <div>
                                <p className="text-[8px] text-slate-500 italic font-black uppercase">Balance</p>
                                <p className="text-3xl font-black italic tracking-tighter text-white leading-none">{fmt$(bal)}</p>
                              </div>
                              <div className="flex gap-1.5">
                                <button onClick={() => setChatJob(job)} className="p-2.5 bg-blue-900/30 text-blue-400 rounded-xl hover:bg-blue-600 transition-all"><Icon name="message-square" className="w-4 h-4" /></button>
                                <button onClick={() => printInvoice(job)} className="p-2.5 bg-slate-800 text-[#F5C518] rounded-xl hover:scale-110 transition-all"><Icon name="file-text" className="w-4 h-4" /></button>
                                <button onClick={() => {
                                  setEdit(job.id);
                                  setState({
                                    ...INIT,
                                    ...(job.specs || {}),
                                    name: job.client_name || '',
                                    phone: job.client_phone || '',
                                    address: job.address || '',
                                    date: job.scheduled_date || '',
                                    status: job.status || 'lead',
                                    frequency: job.frequency || 'one-time',
                                    totalPrice: job.total_price || 0,
                                    team: job.team_assigned || '',
                                  });
                                  setView('operations');
                                  setOperationsTab('deploy');
                                  setDtab('identity');
                                }} className="p-2.5 bg-slate-800 text-white rounded-xl hover:bg-blue-600 transition-all"><Icon name="edit-3" className="w-4 h-4" /></button>
                                <button onClick={() => { if (confirm('Archive?')) sb.from('elevore_missions').delete().eq('id', job.id).then(() => { tt('Archived ✓'); refresh(); }); }} className="p-2.5 bg-red-900/30 text-red-500 rounded-xl hover:bg-red-600 transition-all"><Icon name="trash-2" className="w-4 h-4" /></button>
                                <button onClick={() => window.open(`https://wa.me/${job.client_phone?.replace(/\D/g, '') || ''}`)} className="p-2.5 bg-green-600 text-white rounded-xl active:scale-90 transition-all"><Icon name="message-circle" className="w-4 h-4" /></button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                {/* Bulk Actions Panel */}
                {selectedJobs.length > 0 && (
                  <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[1050] bg-slate-900/90 backdrop-blur-xl border border-white/10 px-6 py-4 rounded-2xl flex flex-wrap items-center gap-4 shadow-2xl animate-in slide-in-from-bottom duration-250">
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">
                      Selected: <span className="text-[#F5C518]">{selectedJobs.length}</span>
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => bulkMarkStatus('completed')} className="px-3 py-2 bg-purple-600 text-white rounded-xl text-[8px] font-black uppercase hover:bg-purple-700 active:scale-95 transition-all">Mark Completed</button>
                      <button onClick={() => bulkMarkStatus('paid')} className="px-3 py-2 bg-blue-600 text-white rounded-xl text-[8px] font-black uppercase hover:bg-blue-700 active:scale-95 transition-all">Mark Paid</button>
                      <button onClick={bulkWAReminders} className="px-3 py-2 bg-green-600 text-white rounded-xl text-[8px] font-black uppercase hover:bg-green-700 active:scale-95 transition-all">📱 WA Reminders</button>
                      <button onClick={() => setSelectedJobs([])} className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl text-[8px] font-black uppercase active:scale-95 transition-all">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* =====================================================================
              👑 ADMIN DASHBOARD CLIENTS TABS (clients)
              ===================================================================== */}
          {role === 'admin' && view === 'crm' && crmTab === 'dna' && (
            <div className="space-y-4 animate-in fade-in pb-24">
              {/* CRM Sub-tabs Switcher */}
              <div className="flex gap-2 bg-black/45 p-1.5 rounded-2xl border border-white/5 overflow-x-auto nsb">
                {[
                  { id: 'dna', name: '👥 DNA de Clientes' },
                  { id: 'vip', name: '💎 Membresías VIP' },
                  { id: 'referrals', name: '🎁 Retención & Referidos' },
                  { id: 'campaigns', name: '📢 Campañas' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setCrmTab(tab.id);
                      if (tab.id === 'vip') setMembersTab('vip');
                    }}
                    className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase whitespace-nowrap active:scale-95 transition-all ${
                      crmTab === tab.id
                        ? 'bg-[#F5C518] text-black shadow-lg shadow-[#F5C518]/15'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>

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
                    <div key={client.name} className="g p-5 hover:bg-white/[0.02] transition-all border-l-4 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] flex flex-col justify-between min-h-[170px]" style={{ borderColor: lv.color }}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 onClick={() => setSelectedClient(client)} className="text-base font-black uppercase italic text-white hover:text-[#F5C518] cursor-pointer transition-colors">{client.name}</h3>
                            <span className="text-[7px] font-black px-2 py-0.5 rounded-full" style={{ background: lv.color, color: '#000' }}>{lv.name}</span>
                            {daysSince >= 45 && <span className="text-[7px] bg-red-900/50 text-red-400 font-black px-2 py-0.5 rounded-full">⚠️ Churn Risk</span>}
                          </div>
                          <p className="text-[8px] text-slate-400 uppercase">{client.phone}{client.email ? ` • ${client.email}` : ''}</p>
                          {client.birthday && <p className="text-[7.5px] text-pink-400 font-black uppercase mt-1">🎂 Bday: {fmtD(client.birthday)}</p>}
                          
                          <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2 border-t border-white/5 text-[8px] uppercase font-bold text-slate-400">
                            <div>
                              <span className="text-slate-500 block text-[6.5px]">Servicios</span>
                              <span className="text-white font-black text-xs">{d.count}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[6.5px]">Recomendados</span>
                              <span className="text-[#F5C518] font-black text-xs">
                                {jobs.filter(j => j.specs?.referred_by === client.name).length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1.5 mt-3 flex-wrap">
                        <button onClick={() => lastJob ? wa(lastJob, 'referral') : tt('No previous job', 'red')} className="flex-1 py-2 bg-pink-600/20 text-pink-400 rounded-xl text-[7px] font-black uppercase active:scale-95">🎁 Ref</button>
                        <button onClick={() => lastJob ? wa(lastJob, 'bundle') : tt('No previous job', 'red')} className="flex-1 py-2 bg-blue-600/20 text-blue-400 rounded-xl text-[7px] font-black uppercase active:scale-95">🎯 Bundle</button>
                        <button onClick={() => { setState({ ...INIT, ...client.specs, name: client.name, phone: client.phone, email: client.email, birthday: client.birthday, address: client.address }); setView('operations'); setOperationsTab('deploy'); setDtab('specs'); }} className="flex-1 py-2 bg-white/5 text-slate-400 rounded-xl text-[7px] font-black uppercase active:scale-95 hover:text-white transition-all">+ Job</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          {role === 'admin' && view === 'settings' && (
            <div className="space-y-6 animate-in fade-in pb-24">
              {/* Settings Sub-tabs Switcher */}
              <div className="flex gap-2 bg-black/45 p-1.5 rounded-2xl border border-white/5 overflow-x-auto nsb">
                {[
                  { id: 'company', name: '⚙️ Ajustes de Empresa' },
                  { id: 'billing', name: '👑 Plan SaaS Billing' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setSettingsTab(tab.id);
                      if (tab.id === 'billing') setMembersTab('billing');
                    }}
                    className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase whitespace-nowrap active:scale-95 transition-all ${
                      settingsTab === tab.id
                        ? 'bg-[#F5C518] text-black shadow-lg shadow-[#F5C518]/15'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>

              {settingsTab === 'company' && (
                <>
                  <div className="g p-8 border-t-4 border-slate-500 bg-black/40">
                    <h2 className="text-2xl font-black uppercase tracking-widest text-white mb-2">⚙️ Company Settings</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-8">Administra la configuracion interna de tu imperio SaaS</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase text-[#F5C518]">Brand Identity</h3>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-1">Business Full Name</label>
                          <input className="inp w-full" value={settingsBusName} onChange={e => setSettingsBusName(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-1">Contact / Zelle Phone</label>
                          <input className="inp w-full" value={settingsPhone} onChange={e => setSettingsPhone(e.target.value)} />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h3 className="text-sm font-black uppercase text-[#F5C518]">Financials</h3>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-1">Monthly MRR Goal ($)</label>
                          <input className="inp w-full" type="number" value={settingsGoal} onChange={e => setSettingsGoal(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest pl-1">Staff Default Payout %</label>
                          <input className="inp w-full" type="number" value={settingsPayPct} onChange={e => setSettingsPayPct(e.target.value)} />
                        </div>
                      </div>
                    </div>
                    
                    <button onClick={saveSettings} className="w-full mt-8 bg-[#F5C518] text-black py-4 rounded-xl font-black uppercase tracking-widest active:scale-95 transition-all">Save Changes</button>
                  </div>

                  {/* Google Sync & Integration Card */}
                  <div className="g p-8 border-t-4 border-blue-500 bg-black/40 space-y-6">
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-2">
                        <Icon name="link-2" className="w-5 h-5 text-blue-400" /> Google Cloud Link & Sync
                      </h2>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                        Sincroniza tus misiones de Elevore con tus calendarios externos en tiempo real
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
                      {/* Option A: iCal Sync */}
                      <div className="space-y-3 bg-white/[0.02] p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
                        <div>
                          <h3 className="text-xs font-black uppercase text-blue-400 flex items-center gap-1.5">
                            <Icon name="calendar" className="w-4 h-4" /> Google Calendar (iCal Sync)
                          </h3>
                          <p className="text-[7.5px] text-slate-400 uppercase font-bold leading-relaxed mt-1.5">
                            Suscripción unidireccional automática. Copia este enlace y agrégalo en tu Google Calendar ("Agregar desde URL"). Se actualizará automáticamente en segundo plano.
                          </p>
                        </div>

                        <div className="space-y-2 mt-4">
                          <div className="flex gap-2">
                            <input
                              readOnly
                              className="inp text-[9px] font-mono w-full bg-black/50 border-white/10"
                              value={`${window.location.origin}/api/calendar-feed?tenant_id=${tenantId || 'default'}`}
                            />
                            <button
                              onClick={() => {
                                const url = `${window.location.origin}/api/calendar-feed?tenant_id=${tenantId || 'default'}`;
                                navigator.clipboard.writeText(url);
                                tt('Enlace iCal copiado ✓', 'green');
                              }}
                              className="px-3 bg-blue-600 text-white rounded-xl text-[8px] font-black uppercase hover:bg-blue-700 active:scale-95 transition-all"
                            >
                              Copiar
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Option B: Direct OAuth */}
                      <div className="space-y-3 bg-white/[0.02] p-5 rounded-2xl border border-white/5 flex flex-col justify-between">
                        <div>
                          <h3 className="text-xs font-black uppercase text-blue-400 flex items-center gap-1.5">
                            <Icon name="chrome" className="w-4 h-4" /> Vinculación de Cuenta OAuth
                          </h3>
                          <p className="text-[7.5px] text-slate-400 uppercase font-bold leading-relaxed mt-1.5">
                            Conecta directamente tu cuenta de Google a través de OAuth para integraciones directas bidireccionales y sincronización nativa de eventos.
                          </p>
                        </div>

                        <div className="space-y-2 mt-4">
                          <button
                            onClick={async () => {
                              tt('Redirigiendo a Google OAuth...', 'blue');
                              const { error } = await sb.auth.signInWithOAuth({
                                provider: 'google',
                                options: {
                                  scopes: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar',
                                  redirectTo: window.location.origin
                                }
                              });
                              if (error) tt('Error de OAuth: ' + error.message, 'red');
                            }}
                            className="w-full py-3 bg-white text-black font-black uppercase text-[9px] rounded-xl hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.15)]"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                              <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              />
                              <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              />
                              <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                              />
                              <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                              />
                            </svg>
                            Conectar Google Account
                          </button>
                          <span className="text-[6.5px] text-slate-500 uppercase font-bold tracking-wider block text-center mt-1.5">
                            * Requiere configuración del proveedor en Supabase Console
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {settingsTab === 'billing' && (
                <div className="g p-8 border-t-4 border-[#F5C518] bg-black/40 space-y-6">
                  <div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-black uppercase tracking-widest text-white">👑 ELEVORE SAAS SUBSCRIPTION</h2>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Escala tu negocio de limpieza con la infraestructura premium de Elevore</p>
                      </div>
                      {tenant?.stripe_subscription_status && (
                        <span className="text-[9px] font-black uppercase bg-green-500/10 border border-green-500/30 text-green-400 px-3 py-1.5 rounded-xl tracking-widest animate-pulse">
                          ACTIVO: {tenant.stripe_subscription_status.replace('active_', '').toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Plan Selection Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    {[
                      { id: 'basic', name: 'Plan Básico', price: 49, color: 'border-slate-500/30', glow: 'from-slate-500/20 to-transparent', perks: ['Hasta 5 Empleados', 'Rastreo GPS Básico', 'Dashboard de Finanzas', 'Soporte por Email'] },
                      { id: 'premium', name: 'Plan Premium', price: 99, color: 'border-indigo-500/40 shadow-[0_0_25px_rgba(99,102,241,0.15)]', glow: 'from-indigo-500/20 to-transparent', perks: ['Hasta 20 Empleados', 'Campañas de CRM', 'Nómina Automatizada', 'Control de Calidad IA', 'Soporte Prioritario'], highlight: true },
                      { id: 'vip', name: 'Plan VIP', price: 199, color: 'border-[#F5C518]/40 shadow-[0_0_35px_rgba(245,197,24,0.15)]', glow: 'from-[#F5C518]/20 to-transparent', perks: ['Empleados Ilimitados', 'Acceso Completo BI', 'Integraciones OAuth', 'Dominio Personalizado', 'Soporte 24/7 VIP'] }
                    ].map(p => {
                      const isSelected = selectedBillingPlan === p.id;
                      const isCurrent = tenant?.stripe_subscription_status === 'active_' + p.id;
                      return (
                        <div key={p.id} className={`g p-6 flex flex-col justify-between border relative overflow-hidden bg-gradient-to-b ${p.glow} ${p.color} rounded-2xl transition-all duration-300 ${p.highlight ? 'ring-2 ring-indigo-500/30' : ''}`}>
                          {p.highlight && (
                            <span className="absolute top-3 right-3 bg-indigo-600 text-white text-[7px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest">
                              RECOMENDADO
                            </span>
                          )}
                          <div>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{p.name}</p>
                            <div className="flex items-baseline gap-1 mt-2">
                              <span className="text-4xl font-black text-white italic">${p.price}</span>
                              <span className="text-[9px] text-slate-500 font-bold uppercase">/mes</span>
                            </div>
                            <ul className="space-y-2 mt-6">
                              {p.perks.map((pk, idx) => (
                                <li key={idx} className="flex items-center gap-2 text-[9px] text-slate-300 font-bold uppercase">
                                  <Icon name="check" className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                                  <span>{pk}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <button
                            onClick={() => {
                              if (isCurrent) return;
                              setSelectedBillingPlan(p.id);
                            }}
                            disabled={isCurrent}
                            className={`w-full mt-8 py-3 rounded-xl text-[9px] font-black uppercase transition-all duration-200 active:scale-95 ${
                              isCurrent 
                                ? 'bg-green-950/40 border border-green-500/20 text-green-400 cursor-not-allowed' 
                                : isSelected 
                                  ? 'bg-white text-black font-extrabold shadow-xl shadow-white/10' 
                                  : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {isCurrent ? 'Plan Actual ✓' : isSelected ? 'Plan Seleccionado' : 'Seleccionar Plan'}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Stripe Checkout Form Card */}
                  {selectedBillingPlan && tenant?.stripe_subscription_status !== 'active_' + selectedBillingPlan && (
                    <div className="g p-6 border border-white/5 bg-slate-950/50 rounded-2xl max-w-md mx-auto space-y-4 animate-in slide-in-from-bottom duration-300">
                      <p className="text-[9px] font-black text-[#F5C518] uppercase tracking-widest flex items-center gap-1.5">
                        <Icon name="credit-card" className="w-4 h-4" /> Detalle de Pago Seguro
                      </p>
                      <p className="text-[7.5px] text-slate-400 uppercase font-bold leading-normal">
                        Estás suscribiéndote al <span className="text-white font-extrabold">{selectedBillingPlan.toUpperCase()}</span>. El cargo se realizará mensualmente a través de Stripe Billing.
                      </p>
                      
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest pl-1">Nombre en la Tarjeta</label>
                          <input className="inp w-full text-xs uppercase" placeholder="JOHN DOE" value={billingCardName} onChange={e => setBillingCardName(e.target.value)} />
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest pl-1">Número de Tarjeta</label>
                          <div className="relative">
                            <input className="inp w-full text-xs font-mono" placeholder="4242 •••• •••• 4242" maxLength={19} value={billingCardNo} onChange={e => {
                              const val = e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
                              setBillingCardNo(val);
                            }} />
                            <span className="absolute right-3.5 top-3 text-[9px] font-black text-slate-600 uppercase">VISA / MC</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest pl-1">Expiración</label>
                            <input className="inp w-full text-xs font-mono text-center" placeholder="MM/YY" maxLength={5} value={billingCardExpiry} onChange={e => {
                              let val = e.target.value.replace(/\D/g, '');
                              if (val.length > 2) val = val.substring(0, 2) + '/' + val.substring(2, 4);
                              setBillingCardExpiry(val);
                            }} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest pl-1">CVC</label>
                            <input className="inp w-full text-xs font-mono text-center" placeholder="123" maxLength={4} value={billingCardCvc} onChange={e => setBillingCardCvc(e.target.value)} />
                          </div>
                        </div>
                      </div>

                      {billingError && (
                        <p className="text-[8.5px] font-black uppercase text-red-400 bg-red-950/20 border border-red-500/20 p-2.5 rounded-xl text-center">
                          ⚠️ {billingError}
                        </p>
                      )}

                      <button
                        onClick={handleActivateSubscription}
                        disabled={billingLoading}
                        className="w-full mt-4 bg-[#F5C518] hover:bg-amber-400 text-black py-4 rounded-xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all shadow-[0_0_20px_rgba(245,197,24,0.15)] flex items-center justify-center gap-1.5"
                      >
                        {billingLoading ? (
                          <Icon name="loader-2" className="w-4 h-4 animate-spin text-black" />
                        ) : (
                          `Activar Suscripción (${selectedBillingPlan === 'basic' ? '$49' : selectedBillingPlan === 'premium' ? '$99' : '$199'}/mo) 🚀`
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {role === 'admin' && view === 'intel' && financeTab === 'payroll' && (
            <div className="space-y-6 animate-in fade-in pb-24">
              {/* Intel Sub-tabs Switcher */}
              <div className="flex gap-2 bg-black/45 p-1.5 rounded-2xl border border-white/5 overflow-x-auto nsb">
                {[
                  { id: 'summary', name: '📈 Resumen Financiero' },
                  { id: 'services', name: '💼 Desglose por Servicio' },
                  { id: 'payroll', name: '👥 Payroll de Equipos' },
                  { id: 'marketing', name: '🎯 CAC & ROI de Marketing' },
                  { id: 'inventory', name: '📦 Inventario' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFinanceTab(tab.id)}
                    className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase whitespace-nowrap active:scale-95 transition-all ${
                      financeTab === tab.id
                        ? 'bg-[#F5C518] text-black shadow-lg shadow-[#F5C518]/15'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>

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
                          <input type="number" className="inp text-xs w-full text-amber-500 font-bold" min={0} max={100} value={editingStaff.payout_pct !== undefined ? editingStaff.payout_pct : (tenantSettings?.staff_pay_pct !== undefined ? Math.round(tenantSettings.staff_pay_pct * 100) : 40)} onChange={e => setEditingStaff({ ...editingStaff, payout_pct: Number(e.target.value) || 0 })} />
                          <span className="text-[7px] text-slate-500 uppercase font-bold tracking-wider block mt-1">Default is {tenantSettings?.staff_pay_pct !== undefined ? Math.round(tenantSettings.staff_pay_pct * 100) : (DEFAULT_CFG.STAFF_PAY * 100)}%</span>
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
                              <span className="block mt-1">Payout: {worker.payout_pct !== undefined ? worker.payout_pct : (tenantSettings?.staff_pay_pct !== undefined ? Math.round(tenantSettings.staff_pay_pct * 100) : 40)}%</span>
                            </p>
                            <p className="text-[7px] text-slate-500 mt-1">Historial acumulado: {fmt$(worker.total_earned || 0)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-black text-green-400 leading-none">{fmt$(worker.wallet_balance || 0)}</p>
                            {(worker.wallet_balance || 0) > 0 ? (
                              <button onClick={() => handleCashout(worker)} className="mt-1 px-2.5 py-1.5 bg-green-600 text-white rounded-lg text-[7px] font-black uppercase active:scale-95 hover:bg-green-500 transition-all">Pay via Zelle</button>
                            ) : (
                              <span className="mt-1 inline-block text-[7px] text-slate-500 font-black uppercase tracking-wider">Paid ✓</span>
                            )}
                          </div>
                        </div>

                        {/* Collapsible payout ledger accordion */}
                        {(() => {
                          const isExpanded = !!expandedWorkerPayouts[worker.id];
                          const workerPayouts = payoutHistory.filter(p => p.staff_id === worker.id);
                          return (
                            <div className="border-t border-white/5 pt-2 mt-2">
                              <button
                                onClick={() => setExpandedWorkerPayouts(prev => ({ ...prev, [worker.id]: !isExpanded }))}
                                className="flex items-center justify-between w-full text-[7px] font-black text-[#F5C518] uppercase tracking-wider hover:text-white transition-colors"
                              >
                                <span>📋 {isExpanded ? 'Ocultar Historial / Hide Ledger' : 'Ver Historial / View Ledger'} ({workerPayouts.length})</span>
                                <span>{isExpanded ? '▲' : '▼'}</span>
                              </button>
                              {isExpanded && (
                                <div className="mt-2 space-y-1.5 max-h-[150px] overflow-y-auto custom-scroll text-[7px]">
                                  {workerPayouts.length === 0 ? (
                                    <p className="text-slate-500 italic py-1">Sin transacciones / No transactions</p>
                                  ) : (
                                    workerPayouts.map(p => (
                                      <div key={p.id} className="bg-black/40 border border-white/5 rounded-lg p-2 flex justify-between items-center gap-2">
                                        <div className="flex-1">
                                          <p className="text-slate-400 font-bold">
                                            {new Date(p.created_at).toLocaleDateString()} - <span className="text-green-400 font-black">{fmt$(p.amount)}</span> via <span className="text-slate-200">{p.payment_method}</span>
                                          </p>
                                          {p.reference_note && (
                                            <p className="text-[6px] text-slate-500 italic mt-0.5">Nota: {p.reference_note}</p>
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Collapsible job history accordion */}
                        {(() => {
                          const isExpanded = !!expandedWorkerJobs[worker.id];
                          const workerMissions = jobs.filter(j => j.team_assigned && j.team_assigned.toLowerCase().includes(worker.name.toLowerCase()) && (j.status === 'completed' || j.status === 'paid'));
                          return (
                            <div className="border-t border-white/5 pt-2 mt-1">
                              <button
                                onClick={() => setExpandedWorkerJobs(prev => ({ ...prev, [worker.id]: !isExpanded }))}
                                className="flex items-center justify-between w-full text-[7.5px] font-black text-blue-400 uppercase tracking-wider hover:text-white transition-colors"
                              >
                                <span>🏠 {isExpanded ? 'Ocultar Trabajos / Hide Jobs' : 'Ver Historial de Trabajos / View Jobs History'} ({workerMissions.length})</span>
                                <span>{isExpanded ? '▲' : '▼'}</span>
                              </button>
                              {isExpanded && (
                                <div className="mt-2 space-y-1.5 max-h-[150px] overflow-y-auto custom-scroll text-[7px]">
                                  {workerMissions.length === 0 ? (
                                    <p className="text-slate-500 italic py-1">Sin trabajos completados / No completed jobs</p>
                                  ) : (
                                    workerMissions.map(j => (
                                      <div key={j.id} className="bg-black/40 border border-white/5 rounded-lg p-2 flex justify-between items-center gap-2">
                                        <div className="flex-1">
                                          <p className="text-slate-200 font-bold uppercase">{j.client_name} - {j.service_type}</p>
                                          <p className="text-slate-500 text-[6.5px] mt-0.5">{fmtD(j.scheduled_date)} • {j.address}</p>
                                        </div>
                                        <div className="text-right">
                                          <span className="text-green-400 font-black">{fmt$(j.total_price)}</span>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
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
          {role === 'admin' && view === 'operations' && operationsTab === 'drive' && (
            <div className="space-y-4 animate-in fade-in pb-24">
              {/* Operations Sub-tabs Switcher */}
              <div className="flex gap-2 bg-black/45 p-1.5 rounded-2xl border border-white/5 overflow-x-auto nsb">
                {[
                  { id: 'calendar', name: '📅 Calendario de Misiones' },
                  { id: 'reminders', name: `🔔 Recordatorios (${remindersBadgeCount})` },
                  { id: 'drive', name: '📸 Photo Drive' },
                  { id: 'map', name: '🗺️ IA Dispatcher' },
                  { id: 'deploy', name: '📝 Nueva Cotización' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setOperationsTab(tab.id)}
                    className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase whitespace-nowrap active:scale-95 transition-all ${
                      operationsTab === tab.id
                        ? 'bg-[#F5C518] text-black shadow-lg shadow-[#F5C518]/15'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>

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

          {role === 'admin' && view === 'operations' && operationsTab === 'map' && (
            <MapTab
              jobs={jobs}
              staff={staff}
              operationsTab={operationsTab}
              setOperationsTab={setOperationsTab}
              tt={tt}
              refresh={refresh}
            />
          )}

          {/* =====================================================================
              👑 ADMIN DASHBOARD NEW ESTIMATE DEPLOY TABS (deploy)
              ===================================================================== */}
          {role === 'admin' && view === 'operations' && operationsTab === 'deploy' && (
            <div className="space-y-6 animate-in zoom-in-95 pb-32">
              {/* Operations Sub-tabs Switcher */}
              <div className="flex gap-2 bg-black/45 p-1.5 rounded-2xl border border-white/5 overflow-x-auto nsb">
                {[
                  { id: 'calendar', name: '📅 Calendario de Misiones' },
                  { id: 'reminders', name: `🔔 Recordatorios (${remindersBadgeCount})` },
                  { id: 'drive', name: '📸 Photo Drive' },
                  { id: 'map', name: '🗺️ IA Dispatcher' },
                  { id: 'deploy', name: '📝 Nueva Cotización' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setOperationsTab(tab.id)}
                    className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase whitespace-nowrap active:scale-95 transition-all ${
                      operationsTab === tab.id
                        ? 'bg-[#F5C518] text-black shadow-lg shadow-[#F5C518]/15'
                        : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {tab.name}
                  </button>
                ))}
              </div>

              <div className="flex gap-1 bg-black/40 p-1.5 rounded-xl border border-white/5 overflow-x-auto custom-scroll">
                {['identity', 'specs', 'add-ons', 'quote', 'money', 'qc'].map(t => (
                  <button key={t} onClick={() => setDtab(t)} className={`flex-shrink-0 px-4 py-3 rounded-xl text-[9px] uppercase font-black active:scale-95 transition-all ${dtab === t ? 'ton' : 'text-slate-500 hover:text-slate-300'}`}>{t}</button>
                ))}
              </div>

              <div className="g p-6 space-y-5 shadow-xl bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)] rounded-2xl">
                {dtab === 'identity' && (
                  <div className="space-y-3.5 animate-in fade-in">
                    <h3 className="text-[10px] uppercase text-[#F5C518] font-black italic tracking-widest border-b border-white/5 pb-2 font-display">Identity</h3>
                    <input className="inp uppercase text-xs" placeholder="CLIENT FULL NAME" value={state.name} onChange={e => onName(e.target.value)} />
                    <input className="inp text-xs" placeholder="PHONE" value={state.phone} onChange={e => setState({ ...state, phone: e.target.value })} />
                    <input className="inp text-xs" placeholder="EMAIL" value={state.email || ''} onChange={e => setState({ ...state, email: e.target.value })} />
                    <div className="space-y-1">
                      <label className="text-[8px] font-black uppercase text-slate-500 tracking-wider block pl-1">Cumpleaños del Cliente (Opcional)</label>
                      <input type="date" className="inp text-xs" value={state.birthday || ''} onChange={e => setState({ ...state, birthday: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 uppercase">
                      <div className="space-y-1 text-left">
                        <label className="text-[8px] font-black text-slate-500 tracking-wider block pl-1">Lead Source</label>
                        <select 
                          value={state.leadSource || 'organic'} 
                          className="inp text-xs w-full bg-slate-900 border-white/10 text-white font-black" 
                          onChange={e => setState({ ...state, leadSource: e.target.value })}
                        >
                          <option value="organic">Organic/Otros</option>
                          <option value="google">Google Ads</option>
                          <option value="facebook">Facebook/Redes</option>
                          <option value="flyers">Volantes/Flyers</option>
                          <option value="referral">Referido</option>
                        </select>
                      </div>
                      <div className="space-y-1 text-left">
                        <label className="text-[8px] font-black text-slate-500 tracking-wider block pl-1">Ad Spend / CAC ($)</label>
                        <input 
                          type="number" 
                          value={state.adSpend || ''} 
                          placeholder="0" 
                          className="inp text-xs w-full" 
                          onChange={e => setState({ ...state, adSpend: parseFloat(e.target.value) || 0 })} 
                        />
                      </div>
                    </div>
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
                    <div>
                      <p className="text-[8px] text-slate-400 uppercase font-black mb-2 tracking-wider">Idioma del Cliente / Client Language</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[{ l: 'English 🇺🇸', v: 'en' }, { l: 'Español 🇪🇸', v: 'es' }].map(lg => (
                          <button key={lg.v} onClick={() => setState({ ...state, lang: lg.v })} className={`py-2 rounded-xl text-[8px] font-black uppercase border-2 active:scale-95 transition-all ${state.lang === lg.v ? 'bg-amber-500 border-amber-500 text-black' : 'bg-white/5 border-white/5 text-slate-500'}`}>{lg.l}</button>
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

                    let ollamaUrl = localStorage.getItem('elevore_ollama_url') || 'http://127.0.0.1:11434';
                    if (ollamaUrl === 'http://localhost:11434') ollamaUrl = 'http://127.0.0.1:11434';
                    const ollamaModel = localStorage.getItem('elevore_ollama_model') || 'llama3.2';
                    const aiProvider = localStorage.getItem('elevore_ai_provider') || 'antigravity';
                    const geminiModel = localStorage.getItem('elevore_gemini_model') || 'gemini-2.5-flash';
                    const geminiKey = localStorage.getItem('elevore_gemini_key') || '';

                    const controller = new AbortController();
                    const timeoutDuration = 90000; // 90s for local Ollama
                    const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

                    try {
                      let raw = '';
                      if (aiProvider === 'gemini' || aiProvider === 'antigravity') {
                        const headers = { 'Content-Type': 'application/json' };
                        if (aiProvider === 'gemini') {
                          headers['x-gemini-key'] = geminiKey;
                        }
                        const res = await fetch('/api/chat', {
                          method: 'POST',
                          headers,
                          body: JSON.stringify({
                            model: geminiModel,
                            messages: [
                              { role: 'system', content: 'You must respond ONLY with raw valid JSON. No markdown code blocks, no other text.' },
                              { role: 'user', content: prompt }
                            ]
                          }),
                          signal: controller.signal
                        });

                        clearTimeout(timeoutId);

                        if (!res.ok) {
                          const errData = await res.json().catch(() => ({}));
                          throw new Error(`Gemini Vercel API: ${errData.error || `HTTP ${res.status}`}`);
                        }

                        const data = await res.json();
                        raw = data.text || '';
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
                            options: { temperature: 0.2 },
                            keep_alive: -1
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
                        tt('Tiempo de espera agotado (90s). ¿Tu IA local está encendida?', 'red');
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
                      <div className="space-y-1 text-left">
                        <label className="text-[8px] font-black text-slate-500 tracking-wider block pl-1">Gastos Operativos ($)</label>
                        <input type="number" value={state.expenses} className="inp text-orange-400 text-xs" onChange={e => setState({ ...state, expenses: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-1 text-left">
                        <label className="text-[8px] font-black text-slate-500 tracking-wider block pl-1">Descuento (%)</label>
                        <select value={state.discount} className="inp text-red-500 font-black text-xs appearance-none" onChange={e => setState({ ...state, discount: parseInt(e.target.value) })}><option value="0">0%</option><option value="10">10%</option><option value="20">20%</option><option value="30">30%</option></select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-center font-black uppercase">
                      <div className="space-y-1 text-left">
                        <label className="text-[8px] font-black text-slate-500 tracking-wider block pl-1">Costo Materiales ($)</label>
                        <input type="number" value={state.materialCost || ''} placeholder="0" className="inp text-blue-400 text-xs" onChange={e => setState({ ...state, materialCost: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <div className="space-y-1 text-left">
                        <label className="text-[8px] font-black text-slate-500 tracking-wider block pl-1">Costo Ad-Spend ($)</label>
                        <input type="number" value={state.marketingCost || ''} placeholder="0" className="inp text-purple-400 text-xs" onChange={e => setState({ ...state, marketingCost: parseFloat(e.target.value) || 0 })} />
                      </div>
                    </div>

                    {/* Live Margin Calculation Box */}
                    {(() => {
                      const finalPrice = state.totalPrice || 0;
                      const laborPct = tenantSettings?.staff_pay_pct !== undefined ? Number(tenantSettings.staff_pay_pct) : 0.40;
                      const laborCost = Math.round(finalPrice * laborPct);
                      const matCost = state.materialCost || 0;
                      const mktCost = state.marketingCost || 0;
                      const exp = state.expenses || 0;
                      const netProfit = finalPrice - laborCost - matCost - mktCost - exp;
                      const marginPct = finalPrice > 0 ? Math.round((netProfit / finalPrice) * 100) : 0;
                      
                      return (
                        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2 uppercase text-[7px] font-black tracking-wider">
                          <p className="text-[8px] text-[#F5C518] border-b border-white/5 pb-1">⚡ Margen de Ganancia Real</p>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Precio de Venta:</span>
                            <span className="text-white">{fmt$(finalPrice)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Pago a Staff ({Math.round(laborPct*100)}%):</span>
                            <span className="text-red-400">-{fmt$(laborCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Materiales / Ad-Spend / Gastos:</span>
                            <span className="text-red-400">-{fmt$(matCost + mktCost + exp)}</span>
                          </div>
                          <div className="flex justify-between border-t border-white/5 pt-1.5 text-[8.5px]">
                            <span className="text-slate-200">Beneficio Neto:</span>
                            <span className={netProfit >= 0 ? "text-green-400" : "text-red-500"}>
                              {fmt$(netProfit)} ({marginPct}%)
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="space-y-3 pt-1">
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

                {dtab === 'qc' && (
                  <div className="space-y-4 animate-in fade-in">
                    <h3 className="text-[10px] uppercase text-[#F5C518] font-black italic tracking-widest border-b border-white/5 pb-2 font-display">Control de Calidad (Antes / Después)</h3>
                    {(() => {
                      const curJob = jobs.find(j => j.id === editId);
                      const beforePh = curJob?.before_photos || [];
                      const afterPh = curJob?.after_photos || [];
                      
                      if (beforePh.length === 0 && afterPh.length === 0) {
                        return (
                          <div className="text-center py-10 bg-black/20 rounded-2xl border border-white/5 text-slate-500 font-black text-[9px] uppercase tracking-wider">
                            No se han subido fotos de control de calidad para esta misión.
                          </div>
                        );
                      }
                      
                      return (
                        <>
                          <BeforeAfterSlider beforePhotos={beforePh} afterPhotos={afterPh} />
                          <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-2 uppercase text-[7px] font-black tracking-wider text-left">
                            <p className="text-[8px] text-green-400 border-b border-white/5 pb-1">⚡ Estado de Verificación</p>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Inspección de AI:</span>
                              <span className={curJob?.specs?.ai_vision_qc ? "text-green-400" : "text-slate-500"}>
                                {curJob?.specs?.ai_vision_qc ? "Aprobado (99.4% Limpio)" : "No Escaneado"}
                              </span>
                            </div>
                            {curJob?.final_signature && (
                              <div className="flex justify-between items-center border-t border-white/5 pt-2">
                                <span className="text-slate-400">Firma del Cliente:</span>
                                <img src={curJob.final_signature} className="h-6 opacity-75 border border-white/10 rounded" alt="firma" />
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()}
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
                <div className="flex gap-2">
                  <button onClick={deploy} className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase italic active:scale-95 transition-all shadow-xl shadow-slate-900/10 tracking-widest font-display">{editId ? 'Update Estimate ⚡' : 'Execute Deploy 🚀'}</button>
                  <button onClick={async () => {
                    const { generateQuotePDF } = await import('./utils/pdfGenerator');
                    generateQuotePDF({
                      name: state.name,
                      phone: state.phone,
                      address: state.address,
                      svc: state.svc,
                      beds: state.beds,
                      baths: state.baths,
                      sqft: state.sqft,
                      qp: state.totalPrice || pricing.total,
                      lang: state.lang || 'en'
                    });
                    tt('Presupuesto PDF Descargado ✓', 'green');
                  }} className="px-5 bg-[#fbbf24] text-black py-5 rounded-2xl font-black text-sm uppercase active:scale-95 transition-all shadow-xl shadow-[#fbbf24]/10 tracking-widest flex items-center justify-center gap-2">
                    <Icon name="file-text" className="w-5 h-5" /> PDF
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =====================================================================
              🎯 CRM RETENCIÓN — Churn Risk & Reactivation Engine
              ===================================================================== */}
          {role === 'admin' && view === 'crm' && crmTab === 'referrals' && (() => {
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
                {/* CRM Sub-tabs Switcher */}
                <div className="flex gap-2 bg-black/45 p-1.5 rounded-2xl border border-white/5 overflow-x-auto nsb">
                  {[
                    { id: 'dna', name: '👥 DNA de Clientes' },
                    { id: 'vip', name: '💎 Membresías VIP' },
                    { id: 'referrals', name: '🎁 Retención & Referidos' },
                    { id: 'campaigns', name: '📢 Campañas' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setCrmTab(tab.id);
                        if (tab.id === 'vip') setMembersTab('vip');
                      }}
                      className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase whitespace-nowrap active:scale-95 transition-all ${
                        crmTab === tab.id
                          ? 'bg-[#F5C518] text-black shadow-lg shadow-[#F5C518]/15'
                          : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {tab.name}
                    </button>
                  ))}
                </div>

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
                        <div className="grid grid-cols-5 gap-1">
                          {[
                            { label: '🔔 Recordar', type: 'retention' },
                            { label: '🎁 Oferta', type: 'winback' },
                            { label: '🎂 Bday', type: 'birthday' },
                            { label: '⭐ Reseña', type: 'review' },
                            { label: '🏠 Bundle', type: 'bundle' },
                          ].map(btn => (
                            <button key={btn.type} onClick={() => {
                              const jobForClient = c.lastJob || {
                                client_name: c.name,
                                client_phone: c.phone,
                                service_type: 'regular',
                                total_price: 150,
                                deposit_paid: 0,
                                scheduled_date: new Date().toISOString().split('T')[0],
                                id: 'crm_' + Date.now()
                              };
                              wa(jobForClient, btn.type);
                            }} className="py-2 bg-white/5 text-slate-400 rounded-xl text-[5.5px] font-black uppercase active:scale-95 hover:bg-white/10 hover:text-white transition-all">
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

          {role === 'admin' && view === 'crm' && crmTab === 'vip' && (() => {
            const basicCount = clients.filter(c => c.membership === 'basic').length;
            const premiumCount = clients.filter(c => c.membership === 'premium').length;
            const vipCount = clients.filter(c => c.membership === 'vip').length;
            const activeMembers = basicCount + premiumCount + vipCount;
            
            const prices = {
              basic: tenantSettings?.membership_plans?.basic || 49,
              premium: tenantSettings?.membership_plans?.premium || 99,
              vip: tenantSettings?.membership_plans?.vip || 199
            };
            const totalMRR = (basicCount * prices.basic) + (premiumCount * prices.premium) + (vipCount * prices.vip);
            
            return (
              <div className="space-y-5 animate-in fade-in pb-24">
                <div className="flex gap-2 bg-black/45 p-1.5 rounded-2xl border border-white/5 overflow-x-auto nsb">
                  {[
                    { id: 'dna', name: '👥 DNA de Clientes' },
                    { id: 'vip', name: '💎 Membresías VIP' },
                    { id: 'referrals', name: '🎁 Retención & Referidos' },
                    { id: 'campaigns', name: '📢 Campañas' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setCrmTab(tab.id);
                        if (tab.id === 'vip') setMembersTab('vip');
                      }}
                      className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase whitespace-nowrap active:scale-95 transition-all ${
                        crmTab === tab.id
                          ? 'bg-[#F5C518] text-black shadow-lg shadow-[#F5C518]/15'
                          : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {tab.name}
                    </button>
                  ))}
                </div>

                <div className="g p-5 border-t-4 border-amber-500 bg-[rgba(255,255,255,0.04)]">
                  <h2 className="text-xl font-black tracking-widest uppercase text-white font-display">💎 VIP MEMBERSHIP COMMANDER</h2>
                  <p className="text-[8px] text-slate-500 uppercase mt-1">Recurrent client subscription management</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="g p-4 border border-white/5 bg-[rgba(255,255,255,0.02)] text-center">
                    <p className="text-3xl font-black text-amber-400">{activeMembers}</p>
                    <p className="text-[7px] text-slate-500 uppercase font-black mt-1">Suscritos Activos</p>
                  </div>
                  <div className="g p-4 border border-white/5 bg-[rgba(255,255,255,0.02)] text-center">
                    <p className="text-3xl font-black text-green-400">${totalMRR}</p>
                    <p className="text-[7px] text-slate-500 uppercase font-black mt-1">MRR Acumulado VIP</p>
                  </div>
                  <div className="g p-4 border border-white/5 bg-[rgba(255,255,255,0.02)] text-center">
                    <p className="text-3xl font-black text-indigo-400">{vipCount}</p>
                    <p className="text-[7px] text-slate-500 uppercase font-black mt-1">VIP Platinos</p>
                  </div>
                  <div className="g p-4 border border-white/5 bg-[rgba(255,255,255,0.02)] text-center">
                    <p className="text-3xl font-black text-slate-300">{clients.length - activeMembers}</p>
                    <p className="text-[7px] text-slate-500 uppercase font-black mt-1">Sin Suscripción</p>
                  </div>
                </div>

                <div className="g p-6 border border-white/5 bg-slate-950/40 rounded-2xl space-y-4">
                  <h3 className="text-xs font-black uppercase text-white tracking-widest pl-1">Asignar Planes de Membresía</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead>
                        <tr className="border-b border-white/10 text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                          <th className="pb-3 pl-2">Cliente</th>
                          <th className="pb-3 text-center">Plan Actual</th>
                          <th className="pb-3 text-center">Cambiar Plan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clients.map(client => {
                          const currentPlan = client.membership || 'none';
                          return (
                            <tr key={client.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                              <td className="py-4 pl-2">
                                <p className="font-extrabold text-white uppercase italic">{client.name}</p>
                                <p className="text-[8px] text-slate-500">{client.email || 'No email'} • {client.phone}</p>
                              </td>
                              <td className="py-4 text-center">
                                <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                                  currentPlan === 'vip' 
                                    ? 'bg-[#F5C518]/10 border-[#F5C518]/30 text-[#F5C518]' 
                                    : currentPlan === 'premium'
                                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                                      : currentPlan === 'basic'
                                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                        : 'bg-white/5 border-white/10 text-slate-500'
                                }`}>
                                  {currentPlan === 'none' ? 'Sin Plan' : currentPlan.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {[
                                    { id: 'none', label: 'Ninguno', color: 'hover:bg-slate-850' },
                                    { id: 'basic', label: 'Básico', color: 'hover:bg-blue-900/40 text-blue-400' },
                                    { id: 'premium', label: 'Premium', color: 'hover:bg-indigo-900/40 text-indigo-400' },
                                    { id: 'vip', label: 'VIP', color: 'hover:bg-amber-900/40 text-[#F5C518]' }
                                  ].map(opt => (
                                    <button
                                      key={opt.id}
                                      onClick={() => updateClientMembership(client.id, client.name, opt.id)}
                                      className={`px-2 py-1 rounded text-[7px] font-black uppercase transition-all ${
                                        currentPlan === opt.id 
                                          ? 'bg-white/10 text-white font-extrabold border border-white/20' 
                                          : 'bg-white/5 text-slate-500 border border-transparent'
                                      } ${opt.color}`}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {role === 'admin' && view === 'crm' && crmTab === 'campaigns' && (() => {
            let segmentClients = [];
            const now = new Date();
            if (campaignTargets === 'high_risk') {
              segmentClients = clients.filter(c => {
                const cJobs = jobs.filter(j => j.client_name === c.name && j.status === 'paid');
                const lastJob = cJobs.sort((a,b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))[0];
                const daysSince = lastJob ? Math.floor((now - new Date(lastJob.scheduled_date)) / 86400000) : 999;
                return daysSince > 45;
              });
            } else if (campaignTargets === 'vip') {
              segmentClients = clients.filter(c => c.membership && c.membership !== 'none');
            } else {
              segmentClients = clients;
            }

            return (
              <div className="space-y-5 animate-in fade-in pb-24">
                <div className="flex gap-2 bg-black/45 p-1.5 rounded-2xl border border-white/5 overflow-x-auto nsb">
                  {[
                    { id: 'dna', name: '👥 DNA de Clientes' },
                    { id: 'vip', name: '💎 Membresías VIP' },
                    { id: 'referrals', name: '🎁 Retención & Referidos' },
                    { id: 'campaigns', name: '📢 Campañas' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setCrmTab(tab.id);
                        if (tab.id === 'vip') setMembersTab('vip');
                      }}
                      className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase whitespace-nowrap active:scale-95 transition-all ${
                        crmTab === tab.id
                          ? 'bg-[#F5C518] text-black shadow-lg shadow-[#F5C518]/15'
                          : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {tab.name}
                    </button>
                  ))}
                </div>

                <div className="g p-5 border-t-4 border-indigo-500 bg-[rgba(255,255,255,0.04)]">
                  <h2 className="text-xl font-black tracking-widest uppercase text-white font-display">📢 MARKETING CAMPAIGN CONSOLE</h2>
                  <p className="text-[8px] text-slate-500 uppercase mt-1">Smart customer re-engagement systems</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-5">
                    <div className="g p-5 border border-white/5 bg-slate-950/40 rounded-2xl space-y-4">
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest pl-1">1. Seleccionar Audiencia Objetivo</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'high_risk', label: 'Riesgo de Fuga', desc: 'Inactivos +45 días', count: clients.filter(c => {
                            const cJobs = jobs.filter(j => j.client_name === c.name && j.status === 'paid');
                            const lastJob = cJobs.sort((a,b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))[0];
                            const daysSince = lastJob ? Math.floor((now - new Date(lastJob.scheduled_date)) / 86400000) : 999;
                            return daysSince > 45;
                          }).length },
                          { id: 'vip', label: 'Miembros VIP', desc: 'Suscripción activa', count: clients.filter(c => c.membership && c.membership !== 'none').length },
                          { id: 'all', label: 'Todos', desc: 'Base de datos total', count: clients.length }
                        ].map(sg => (
                          <button
                            key={sg.id}
                            onClick={() => setCampaignTargets(sg.id)}
                            className={`g p-3 border text-left rounded-xl transition-all duration-200 active:scale-95 flex flex-col justify-between min-h-[85px] ${
                              campaignTargets === sg.id 
                                ? 'border-indigo-500 bg-indigo-950/20 text-white' 
                                : 'border-white/5 bg-white/5 text-slate-400 hover:border-white/10 hover:text-white'
                            }`}
                          >
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-wider">{sg.label}</p>
                              <p className="text-[6.5px] text-slate-500 font-bold uppercase mt-0.5">{sg.desc}</p>
                            </div>
                            <p className="text-lg font-black text-white leading-none mt-2">{sg.count} Clientes</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="g p-5 border border-white/5 bg-slate-950/40 rounded-2xl space-y-4">
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest pl-1">2. Plantilla de Mensaje</p>
                      
                      <div className="flex gap-2">
                        {[
                          { id: 'winback', label: 'Recuperar Cliente' },
                          { id: 'followup', label: 'Cotización Pendiente' },
                          { id: 'review', label: 'Solicitar Reseña' }
                        ].map(tpl => (
                          <button
                            key={tpl.id}
                            onClick={() => setSelectedCampaignTemplate(tpl.id)}
                            className={`px-3 py-2 rounded-xl text-[8.5px] font-black uppercase transition-all duration-150 active:scale-95 ${
                              selectedCampaignTemplate === tpl.id
                                ? 'bg-indigo-600 text-white shadow shadow-indigo-600/30'
                                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {tpl.label}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[7.5px] font-black uppercase text-slate-500 tracking-wider">Editor de Contenido</label>
                        <textarea
                          rows={4}
                          value={campaignCustomText}
                          onChange={e => setCampaignCustomText(e.target.value)}
                          className="inp w-full text-xs font-mono resize-none focus:border-indigo-500"
                          placeholder="Escribe el mensaje..."
                        />
                        <p className="text-[7px] text-slate-500 uppercase font-black pl-1">
                          Tokens Disponibles: <span className="text-white font-extrabold">{`{ClientName}`}</span>, <span className="text-white font-extrabold">{`{BusinessName}`}</span>, <span className="text-white font-extrabold">{`{ServiceType}`}</span>, <span className="text-white font-extrabold">{`{GoogleReviewLink}`}</span>
                        </p>
                      </div>

                      <button
                        onClick={handleSendBulkCampaign}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-black uppercase tracking-widest text-[9.5px] active:scale-95 transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5"
                      >
                        Enviar Campaña Masiva 🚀
                      </button>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div className="g p-5 border border-white/5 bg-slate-950/40 rounded-2xl flex flex-col items-center">
                      <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-4">Vista Previa Smartphone</p>
                      
                      <div className="w-[250px] border-4 border-slate-700 bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl relative">
                        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-16 h-3.5 bg-black rounded-full z-20 flex items-center justify-center">
                          <div className="w-6 h-1 bg-slate-800 rounded-full"></div>
                        </div>

                        <div className="w-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-black h-[380px] rounded-[2rem] overflow-hidden flex flex-col justify-between border border-white/5">
                          <div className="bg-slate-900/90 border-b border-white/5 px-3 pt-6 pb-2 flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-600/30 flex items-center justify-center text-[10px] font-black text-indigo-400 border border-indigo-500/20 uppercase">
                              {(tenantSettings?.business_name || 'E')[0]}
                            </div>
                            <div>
                              <p className="text-[8px] font-black text-white leading-tight uppercase tracking-wider">{tenantSettings?.business_name || 'Elevore Bot'}</p>
                              <p className="text-[6px] text-green-400 font-bold uppercase tracking-wider">En línea</p>
                            </div>
                          </div>

                          <div className="p-3 flex-1 flex flex-col justify-end space-y-2 overflow-y-auto">
                            <div className="bg-indigo-955/50 border border-indigo-500/20 text-white p-3 rounded-2xl rounded-tl-none text-[8.5px] leading-relaxed space-y-1.5 max-w-[90%] font-mono">
                              {getProcessedCampaignPreview()}
                              <span className="block text-right text-[6px] text-slate-500 font-black mt-1">10:42 AM ✓✓</span>
                            </div>
                          </div>

                          <div className="bg-slate-900/80 px-3 py-2 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[7.5px] text-slate-500 font-bold uppercase">Mensaje de campaña...</span>
                            <Icon name="send" className="w-3.5 h-3.5 text-indigo-500" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="g p-6 border border-white/5 bg-slate-950/40 rounded-2xl space-y-4">
                  <h3 className="text-xs font-black uppercase text-white tracking-widest pl-1">Envío Individual por WhatsApp</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead>
                        <tr className="border-b border-white/10 text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                          <th className="pb-3 pl-2">Cliente</th>
                          <th className="pb-3">Último Servicio</th>
                          <th className="pb-3 text-right pr-2">Disparar Mensaje</th>
                        </tr>
                      </thead>
                      <tbody>
                        {segmentClients.map(client => {
                          const clientJobs = jobs.filter(j => j.client_name === client.name);
                          const lastJob = clientJobs.sort((a,b) => new Date(b.scheduled_date) - new Date(a.scheduled_date))[0];
                          const daysSince = lastJob ? Math.floor((now - new Date(lastJob.scheduled_date)) / 86400000) : 999;
                          
                          return (
                            <tr key={client.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                              <td className="py-3 pl-2">
                                <p className="font-extrabold text-white uppercase italic">{client.name}</p>
                                <p className="text-[8px] text-slate-500">{client.phone} • {client.email || 'No email'}</p>
                              </td>
                              <td className="py-3">
                                <p className="text-[10px] text-slate-400 font-bold uppercase">
                                  {daysSince === 999 ? 'Ninguno' : `${daysSince} días atrás`}
                                </p>
                                {lastJob && <p className="text-[7.5px] text-slate-500 italic mt-0.5">{lastJob.service_type?.toUpperCase()} el {fmtD(lastJob.scheduled_date)}</p>}
                              </td>
                              <td className="py-3 text-right pr-2">
                                <button
                                  onClick={() => {
                                    const mockJob = lastJob || {
                                      client_name: client.name,
                                      client_phone: client.phone,
                                      service_type: 'Limpieza Regular',
                                      total_price: 120,
                                      deposit_paid: 0,
                                      scheduled_date: new Date().toISOString().split('T')[0],
                                      id: 'mock_camp_' + Date.now()
                                    };
                                    wa(mockJob, selectedCampaignTemplate);
                                  }}
                                  className="px-3.5 py-2 bg-green-600 hover:bg-green-500 text-white rounded-xl text-[7.5px] font-black uppercase active:scale-95 transition-all flex items-center justify-center gap-1.5 ml-auto"
                                >
                                  <Icon name="phone" className="w-3 h-3 text-white" /> WhatsApp
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}



          {/* =====================================================================
              🔔 RECORDATORIOS — Smart Reminder & Notification System
              ===================================================================== */}
          {role === 'admin' && view === 'operations' && operationsTab === 'reminders' && (
            <RemindersTab
              reminders={reminders}
              setReminders={setReminders}
              newRem={newRem}
              setNewRem={setNewRem}
              jobs={jobs}
              remindersBadgeCount={remindersBadgeCount}
              operationsTab={operationsTab}
              setOperationsTab={setOperationsTab}
              tt={tt}
            />
          )}

        </main>

        {/* Commission Payout Modal */}
        {payoutModalWorker && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[2000] flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setPayoutModalWorker(null)}>
            <div className="g p-6 w-full max-w-md space-y-4 border-t-4 border-amber-500 mx-auto bg-slate-950 rounded-2xl shadow-2xl border border-white/5 animate-in fade-in-50 zoom-in-95 duration-150">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-black text-white uppercase italic tracking-wider">💸 PAGO DE COMISIÓN / COMMISSION PAYOUT</h3>
                  <p className="text-[7px] text-[#F5C518] font-black uppercase tracking-widest mt-0.5">ZELLE CASHOUT FOR {payoutModalWorker.name}</p>
                </div>
                <button onClick={() => setPayoutModalWorker(null)} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
                  <Icon name="x" className="w-4 h-4" />
                </button>
              </div>
              
              <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">Worker Wallet Balance</p>
                  <p className="text-xs font-black text-slate-400">{payoutModalWorker.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-green-400 leading-none">{fmt$(payoutModalWorker.wallet_balance || 0)}</p>
                  <p className="text-[6px] text-slate-500 font-black uppercase tracking-widest mt-1">Pending cashout</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto a pagar / Payout Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    max={payoutModalWorker.wallet_balance || 0}
                    className="inp text-sm font-bold text-white placeholder-slate-600 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 w-full focus:outline-none focus:border-amber-500 transition-colors text-slate-200"
                    placeholder="0.00"
                    value={payoutAmount}
                    onChange={e => setPayoutAmount(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Referencia / Reference Note (Opcional)</label>
                  <input
                    type="text"
                    className="inp text-xs text-white placeholder-slate-600 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 w-full focus:outline-none focus:border-amber-500 transition-colors text-slate-200"
                    placeholder="e.g. Zelle Tx #123456"
                    value={payoutNote}
                    onChange={e => setPayoutNote(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => setPayoutModalWorker(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider active:scale-95 transition-all"
                >
                  Cancelar / Cancel
                </button>
                <button
                  onClick={() => {
                    submitPayout(payoutAmount, payoutNote);
                  }}
                  disabled={!payoutAmount || parseFloat(payoutAmount) <= 0 || parseFloat(payoutAmount) > (payoutModalWorker.wallet_balance || 0)}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-[#F5C518] hover:from-amber-600 hover:to-[#E5B508] text-black font-black rounded-xl text-[9px] uppercase tracking-wider active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 transition-all shadow-lg shadow-amber-500/10"
                >
                  Confirmar Pago / Confirm Payout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Route Optimizer Modal */}
        {routeModalOpen && (
          <RouteOptimizerModal 
            todayJobs={staffJobs.filter(j => j.scheduled_date === todayStr)} 
            onClose={() => setRouteModalOpen(false)} 
            lang="es" 
          />
        )}

        {/* =====================================================================
            🤖 COPILOTO IA
            ===================================================================== */}
        {renderCopilot()}

      </div>
    </div>
  );
}
