import React, { useState, useEffect, useRef, useMemo } from 'react';
import { sb } from '../supabase';
import { 
  Check, 
  X, 
  Shield, 
  Award, 
  Sparkles, 
  MapPin, 
  Calendar, 
  Phone, 
  Mail, 
  CheckCircle, 
  Download,
  AlertTriangle,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';

// =====================================================================
// BILINGUAL TRANSLATIONS DICTIONARY
// =====================================================================
const t = {
  es: {
    title: "Propuesta de Servicio",
    subtitle: "Revisa, personaliza y aprueba tu plan de servicio en minutos",
    client: "Cliente",
    address: "Ubicación",
    date: "Fecha Programada",
    basePrice: "Precio Base",
    selectTier: "1. Selecciona tu Nivel de Experiencia",
    addons: "2. Personaliza con Servicios Adicionales",
    sign: "3. Firma Digital para Aceptar la Propuesta",
    clear: "Limpiar Firma",
    confirm: "Aceptar y Confirmar Servicio",
    successTitle: "¡Propuesta Aprobada con Éxito! 🎉",
    successSubtitle: "Tu servicio ha sido programado y confirmado.",
    details: "Detalles del Plan",
    addonsIncluded: "Aditivos Incluidos",
    totalPrice: "Precio Total del Servicio",
    depositRequired: "Depósito de Reserva (20%)",
    balanceDue: "Balance Restante el Día del Servicio",
    payZelle: "Puedes realizar tu depósito por Zelle al número:",
    viewTracker: "Ver Seguimiento en Vivo",
    regular: "Limpieza Regular",
    deep: "Limpieza Profunda",
    moveout: "Mudanza",
    postcon: "Post-Construcción",
    handyman: "Mantenimiento / Handyman",
    good: "Esencial",
    better: "Premium (Recomendado)",
    best: "Elite VIP",
    downloadQuote: "Descargar PDF / Comprobante",
    loading: "Cargando propuesta...",
    notFound: "Propuesta no encontrada",
    errorLoading: "Error al cargar la propuesta",
    signingPlaceholder: "Dibuja tu firma con tu dedo o mouse aquí",
    terms: "Al firmar, usted acepta los términos de servicio y autoriza la ejecución del trabajo.",
    recommended: "Recomendado",
    subtotal: "Subtotal",
    addonsCost: "Adicionales",
    specsTitle: "Detalles del Espacio",
    beds: "Habitaciones",
    baths: "Baños",
    living: "Salas",
    laundry: "Lavandería",
    sqft: "Pies Cuadrados",
    hours: "Horas de Labor"
  },
  en: {
    title: "Service Proposal",
    subtitle: "Review, customize, and approve your service plan in minutes",
    client: "Client",
    address: "Location",
    date: "Scheduled Date",
    basePrice: "Base Price",
    selectTier: "1. Select Your Experience Level",
    addons: "2. Customize with Add-ons",
    sign: "3. Digital Signature to Accept Proposal",
    clear: "Clear Signature",
    confirm: "Accept & Confirm Service",
    successTitle: "Proposal Approved Successfully! 🎉",
    successSubtitle: "Your service has been scheduled and confirmed.",
    details: "Plan Details",
    addonsIncluded: "Add-ons Included",
    totalPrice: "Total Service Price",
    depositRequired: "Booking Deposit (20%)",
    balanceDue: "Remaining Balance Due on Service Day",
    payZelle: "You can pay your booking deposit via Zelle to:",
    viewTracker: "View Live Tracker",
    regular: "Regular Cleaning",
    deep: "Deep Cleaning",
    moveout: "Move-Out/In",
    postcon: "Post-Construction",
    handyman: "Handyman Service",
    good: "Essential",
    better: "Premium (Recommended)",
    best: "Elite VIP",
    downloadQuote: "Download PDF / Receipt",
    loading: "Loading proposal...",
    notFound: "Proposal not found",
    errorLoading: "Error loading proposal",
    signingPlaceholder: "Draw your signature with your finger or mouse here",
    terms: "By signing, you agree to the terms of service and authorize execution of work.",
    recommended: "Recommended",
    subtotal: "Subtotal",
    addonsCost: "Add-ons",
    specsTitle: "Space Details",
    beds: "Bedrooms",
    baths: "Bathrooms",
    living: "Living Rooms",
    laundry: "Laundry Rooms",
    sqft: "Square Feet",
    hours: "Labor Hours"
  }
};

const ADDONS_LIST = [
  { id: 'oven', labelEs: 'Limpieza de Horno', labelEn: 'Oven Cleaning', price: 35 },
  { id: 'fridge', labelEs: 'Limpieza de Refri', labelEn: 'Fridge Cleaning', price: 35 },
  { id: 'windows', labelEs: 'Vidrios Interiores', labelEn: 'Interior Windows', price: 45 },
  { id: 'pethair', labelEs: 'Pelo de Mascota', labelEn: 'Pet Hair Sweep', price: 30 },
  { id: 'garage', labelEs: 'Barrer Garaje', labelEn: 'Garage Sweep', price: 40 }
];

export function PublicQuoteProposal({ quoteId }) {
  const [job, setJob] = useState(null);
  const [tenantSettings, setTenantSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lang, setLang] = useState('es');

  // GBB Options
  const [selectedTier, setSelectedTier] = useState('better');
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [isSuccess, setIsSuccess] = useState(false);

  // Drawing Pad States
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  // Fetch initial proposal data
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const { data: jobData, error: jobErr } = await sb
          .from('elevore_missions')
          .select('*')
          .eq('id', quoteId)
          .single();

        if (jobErr || !jobData) {
          throw new Error('Quote not found');
        }

        setJob(jobData);
        setLang(jobData.specs?.lang || 'es');
        
        // Auto-select tier if already selected in specs
        if (jobData.specs?.selected_tier) {
          setSelectedTier(jobData.specs.selected_tier);
        }
        
        // Auto-select add-ons if already saved
        if (jobData.specs?.accepted_addons) {
          setSelectedAddons(jobData.specs.accepted_addons);
        } else {
          // Pre-populate from job columns
          const initialAddons = [];
          if (jobData.specs?.oven) initialAddons.push('oven');
          if (jobData.specs?.fridge) initialAddons.push('fridge');
          if (jobData.specs?.windows) initialAddons.push('windows');
          if (jobData.specs?.pethair) initialAddons.push('pethair');
          if (jobData.specs?.garage) initialAddons.push('garage');
          setSelectedAddons(initialAddons);
        }

        if (jobData.status === 'scheduled' || jobData.status === 'in_progress' || jobData.status === 'completed' || jobData.status === 'paid') {
          setIsSuccess(true);
        }

        // Fetch company / tenant settings
        const { data: settingsData } = await sb
          .from('tenant_settings')
          .select('*')
          .eq('tenant_id', jobData.tenant_id)
          .maybeSingle();

        if (settingsData) {
          setTenantSettings(settingsData);
        }
      } catch (err) {
        console.error('Error fetching proposal:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    if (quoteId) {
      loadData();
    }
  }, [quoteId]);

  // Adjust canvas scale for high DPI
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
  }, [loading, isSuccess]);

  // Calculate pricing based on Selected Tier and Add-ons
  const priceCalculations = useMemo(() => {
    if (!job) return { subtotal: 0, addonsCost: 0, total: 0, deposit: 0, balance: 0 };
    
    const base = job.total_price || 150;
    
    // Tier multipliers
    let tierPrice = base;
    if (selectedTier === 'good') tierPrice = Math.round(base * 0.85);
    else if (selectedTier === 'best') tierPrice = Math.round(base * 1.3);

    // Addons Cost
    const addonsCost = selectedAddons.reduce((acc, addonId) => {
      const addon = ADDONS_LIST.find(a => a.id === addonId);
      return acc + (addon ? addon.price : 0);
    }, 0);

    const total = tierPrice + addonsCost;
    const depositPct = tenantSettings?.booking_deposit_pct !== undefined ? Number(tenantSettings.booking_deposit_pct) : 0.20;
    const deposit = Math.round(total * depositPct);
    const balance = total - deposit;

    return {
      subtotal: tierPrice,
      addonsCost,
      total,
      deposit,
      balance
    };
  }, [job, selectedTier, selectedAddons, tenantSettings]);

  // Canvas signature logic
  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#F5C518'; // Gold accent color
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
  };

  // Toggle addons
  const handleToggleAddon = (id) => {
    if (selectedAddons.includes(id)) {
      setSelectedAddons(selectedAddons.filter(a => a !== id));
    } else {
      setSelectedAddons([...selectedAddons, id]);
    }
  };

  // Accept Quote and Schedule the Job
  const handleAcceptProposal = async () => {
    if (!hasSigned) return alert(lang === 'es' ? 'Por favor firma el documento para continuar.' : 'Please sign the document to proceed.');
    
    const canvas = canvasRef.current;
    const sigDataUrl = canvas.toDataURL('image/png');

    setLoading(true);

    try {
      const updatedSpecs = {
        ...(job.specs || {}),
        selected_tier: selectedTier,
        accepted_addons: selectedAddons,
        quote_accepted: true,
        accepted_at: new Date().toISOString(),
        // Save addons flags
        oven: selectedAddons.includes('oven'),
        fridge: selectedAddons.includes('fridge'),
        windows: selectedAddons.includes('windows'),
        pethair: selectedAddons.includes('pethair'),
        garage: selectedAddons.includes('garage')
      };

      const updateData = {
        status: 'scheduled',
        total_price: priceCalculations.total,
        approval_signature: sigDataUrl,
        specs: updatedSpecs
      };

      const { error: updateErr } = await sb
        .from('elevore_missions')
        .update(updateData)
        .eq('id', quoteId);

      if (updateErr) throw updateErr;

      // Update local state to reflect success
      setJob({ ...job, ...updateData });
      setIsSuccess(true);
    } catch (err) {
      console.error('Error accepting proposal:', err);
      alert('Error updating status: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper translations shortcuts
  const ls = t[lang] || t.es;
  const fmt$ = (num) => `$${Number(num || 0).toLocaleString()}`;
  const fmtD = (dateStr) => {
    if (!dateStr) return 'TBD';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const date = new Date(parts[0], parts[1] - 1, parts[2]);
      return date.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return dateStr;
  };

  if (loading && !job) {
    return (
      <div className="min-h-screen bg-[#030303] text-white flex flex-col justify-center items-center font-sans">
        <div className="w-12 h-12 rounded-full border-4 border-[#F5C518]/25 border-t-[#F5C518] animate-spin"></div>
        <p className="mt-4 text-[10px] uppercase font-black tracking-widest text-slate-400">{ls.loading}</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-[#030303] text-white flex flex-col justify-center items-center font-sans p-6 text-center">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl max-w-sm">
          <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h2 className="text-sm font-black uppercase text-white">{ls.notFound}</h2>
          <p className="text-xs text-slate-400 mt-1">{error || ls.errorLoading}</p>
        </div>
      </div>
    );
  }

  const GBB_TIERS = [
    {
      id: 'good',
      name: ls.good,
      icon: Shield,
      color: 'border-slate-500/20 text-slate-400 bg-slate-950/40',
      activeColor: 'border-slate-500 text-white shadow-xl shadow-slate-500/5 bg-slate-950/80',
      price: Math.round((job.total_price || 150) * 0.85),
      features: lang === 'es' ? [
        "Limpieza esencial de áreas comunes",
        "Aspirado y trapeado profundo de pisos",
        "Sacudido de polvo superficial",
        "Limpieza básica de cocina y baños",
        "Recogida y cambio de bolsas de basura"
      ] : [
        "Essential cleaning of common areas",
        "Deep floor vacuuming & mopping",
        "Surface dusting & wiping",
        "Basic kitchen & bathrooms sanitize",
        "Garbage collection & bin replacement"
      ]
    },
    {
      id: 'better',
      name: ls.better,
      icon: Award,
      recommended: true,
      color: 'border-[#F5C518]/20 text-[#F5C518] bg-zinc-950/40',
      activeColor: 'border-[#F5C518] text-[#F5C518] shadow-2xl shadow-[#F5C518]/10 bg-zinc-950/80',
      price: job.total_price || 150,
      features: lang === 'es' ? [
        "Todo lo de Esencial +",
        "Desinfección profunda de baños e inodoros",
        "Limpieza detallada de zócalos (baseboards)",
        "Remoción profunda de grasa en estufa",
        "Abrillantado de gabinetes externos",
        "Prioridad de slot en el horario"
      ] : [
        "Everything in Essential +",
        "Deep sanitization of restrooms",
        "Detailed baseboard wiping",
        "Heavy kitchen stove degreasing",
        "Cabinet exterior polishing",
        "Priority scheduling window"
      ]
    },
    {
      id: 'best',
      name: ls.best,
      icon: Sparkles,
      color: 'border-purple-500/20 text-purple-400 bg-slate-950/40',
      activeColor: 'border-purple-500 text-purple-400 shadow-xl shadow-purple-500/5 bg-slate-950/80',
      price: Math.round((job.total_price || 150) * 1.30),
      features: lang === 'es' ? [
        "Todo lo de Premium +",
        "Dos aditivos premium incluidos gratis",
        "Limpieza profunda de vidrios interiores",
        "Desinfección de manijas y puntos de contacto",
        "Atención prioritaria 24/7",
        "Garantía de satisfacción extendida de 48 horas"
      ] : [
        "Everything in Premium +",
        "Two premium add-ons included free",
        "Deep interior glass scrubbing",
        "High-touchpoints sterilization",
        "24/7 dedicated support phone",
        "Extended 48h service guarantee"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#030303] text-slate-100 font-sans pb-16 print:bg-white print:text-black">
      {/* Printable Invoice Styles */}
      <style>{`
        @media print {
          body { background: white; color: black; }
          .no-print { display: none !important; }
          .print-card { border: 1px solid #ccc !important; background: white !important; color: black !important; }
          .print-text { color: black !important; }
        }
      `}</style>

      {/* TOP DECORATIVE HEADER */}
      <div className="bg-gradient-to-r from-slate-950 via-zinc-900 to-black border-b border-white/5 py-6 px-4 md:px-8 flex justify-between items-center shadow-lg relative overflow-hidden no-print">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#F5C518]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F5C518] flex items-center justify-center shadow-lg shadow-[#F5C518]/10">
            <span className="text-xl font-bold font-serif italic text-black">E</span>
          </div>
          <div>
            <h1 className="text-xs font-black uppercase tracking-widest text-[#F5C518] font-display">{tenantSettings?.business_name || tenantName}</h1>
            <p className="text-[7.5px] text-slate-400 uppercase font-bold tracking-wider">Premium Client Proposal Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
            className="px-2.5 py-1 text-[8px] font-black uppercase bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
          >
            {lang === 'es' ? '🇺🇸 EN' : '🇪🇸 ES'}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 md:px-8 mt-8">
        
        {/* SUCCESS OVERLAY SCREEN */}
        {isSuccess ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="g p-8 md:p-12 text-center bg-gradient-to-br from-slate-950 via-zinc-900 to-black border border-green-500/30 rounded-3xl relative overflow-hidden shadow-2xl space-y-6 max-w-2xl mx-auto"
          >
            <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto shadow-xl shadow-green-500/10">
              <Check className="w-10 h-10 text-green-400" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase italic text-white tracking-wide font-display">{ls.successTitle}</h2>
              <p className="text-xs text-slate-400">{ls.successSubtitle}</p>
            </div>

            <div className="bg-black/35 border border-white/5 rounded-2xl p-6 text-left space-y-3 print-card">
              <div className="flex justify-between items-center border-b border-white/5 pb-2 text-[10px] uppercase font-black text-slate-400">
                <span>{ls.details}</span>
                <span className="text-[#F5C518]">{job.service_type}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span>{ls.client}:</span>
                <span className="text-white">{job.client_name}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span>{ls.date}:</span>
                <span className="text-white">{fmtD(job.scheduled_date)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-slate-300">
                <span>{ls.address}:</span>
                <span className="text-white text-right truncate max-w-[200px]">{job.address}</span>
              </div>
              
              {/* Selected Addons */}
              {selectedAddons.length > 0 && (
                <div className="pt-2 border-t border-white/5">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1.5">{ls.addonsIncluded}</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedAddons.map(adId => {
                      const ad = ADDONS_LIST.find(a => a.id === adId);
                      return (
                        <span key={adId} className="text-[8px] font-black bg-[#F5C518]/10 text-[#F5C518] border border-[#F5C518]/25 px-2 py-0.5 rounded uppercase">
                          {lang === 'es' ? ad?.labelEs : ad?.labelEn}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Total Values */}
              <div className="pt-3 border-t border-white/5 space-y-1.5">
                <div className="flex justify-between text-xs text-slate-300 font-bold">
                  <span>{ls.totalPrice}:</span>
                  <span className="text-white font-black">{fmt$(priceCalculations.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-300 font-bold">
                  <span>{ls.depositRequired}:</span>
                  <span className="text-white font-black">{fmt$(priceCalculations.deposit)}</span>
                </div>
                <div className="flex justify-between text-xs text-green-400 font-bold pt-1.5 border-t border-white/5">
                  <span>{ls.balanceDue}:</span>
                  <span className="text-green-400 font-black">{fmt$(priceCalculations.balance)}</span>
                </div>
              </div>
            </div>

            {/* Zelle payment information */}
            {(tenantSettings?.zelle_phone || tenantSettings?.zelle_name) && (
              <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-5 text-center text-xs space-y-1 no-print">
                <p className="text-slate-400 uppercase font-black text-[9px] tracking-wider">{ls.payZelle}</p>
                {tenantSettings.zelle_phone && <p className="text-lg font-black text-white">{tenantSettings.zelle_phone}</p>}
                {tenantSettings.zelle_name && <p className="text-[10px] text-slate-500 uppercase font-bold">Titular: {tenantSettings.zelle_name}</p>}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2 no-print">
              <button 
                onClick={handlePrint}
                className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black uppercase text-[10px] py-4 rounded-xl active:scale-95 flex items-center justify-center gap-1.5 transition-all"
              >
                <Download className="w-4 h-4 text-[#F5C518]" />
                {ls.downloadQuote}
              </button>
              <button 
                onClick={() => {
                  window.location.search = `?mision=${quoteId}`;
                }}
                className="flex-1 bg-[#F5C518] hover:bg-[#F5C518]/90 text-black font-black uppercase text-[10px] py-4 rounded-xl active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-[#F5C518]/15 transition-all"
              >
                {ls.viewTracker}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT / CENTER SECTIONS: GBB SELECTOR & ADDONS */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Proposal Header Info */}
              <div className="g p-6 bg-gradient-to-br from-slate-950 via-zinc-900 to-black border border-white/5 rounded-3xl relative overflow-hidden shadow-xl space-y-4">
                <div className="absolute top-0 right-0 w-24 h-24 bg-[#F5C518]/5 rounded-full blur-2xl pointer-events-none"></div>
                
                <div className="space-y-1">
                  <span className="text-[8px] font-black bg-[#F5C518]/10 text-[#F5C518] border border-[#F5C518]/25 px-2.5 py-1 rounded-lg uppercase tracking-widest">
                    {ls.title}
                  </span>
                  <h2 className="text-xl font-black uppercase tracking-wide text-white mt-1 italic font-display">{ls.subtitle}</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/5 text-[9px] uppercase font-black text-slate-500">
                  <div className="space-y-1">
                    <p className="text-[7.5px] text-[#F5C518]">{ls.client}</p>
                    <p className="text-white text-[10px] mt-0.5">{job.client_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[7.5px] text-[#F5C518]">{ls.date}</p>
                    <p className="text-white text-[10px] mt-0.5">{fmtD(job.scheduled_date)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[7.5px] text-[#F5C518]">{ls.address}</p>
                    <p className="text-white text-[10px] mt-0.5 truncate" title={job.address}>{job.address}</p>
                  </div>
                </div>
                
                {/* Space Specs */}
                {(() => {
                  const s = job.specs || {};
                  const isHandyman = job.service_type === 'handyman';
                  const isPostCon = job.service_type === 'postcon';
                  
                  return (
                    <div className="bg-black/25 border border-white/5 rounded-2xl p-4 text-[8.5px] uppercase font-black text-slate-500 space-y-2">
                      <p className="text-[8px] text-slate-400 border-b border-white/5 pb-1">{ls.specsTitle}</p>
                      <div className="flex flex-wrap gap-4 text-white">
                        {isHandyman ? (
                          <span>🛠️ {s.laborHours || 2} {ls.hours}</span>
                        ) : isPostCon ? (
                          <span>📐 {s.sqft || 1500} {ls.sqft}</span>
                        ) : (
                          <>
                            {s.beds > 0 && <span>🛏️ {s.beds} {ls.beds}</span>}
                            {s.baths > 0 && <span>🚿 {s.baths} {ls.baths}</span>}
                            {s.living > 0 && <span>🛋️ {s.living} {ls.living}</span>}
                            {s.laundryRoom > 0 && <span>🧺 {s.laundryRoom} {ls.laundry}</span>}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* SECTION 1: GBB SELECTION */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#F5C518] font-display pl-2">{ls.selectTier}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {GBB_TIERS.map(tier => {
                    const isActive = selectedTier === tier.id;
                    const TierIcon = tier.icon;
                    return (
                      <div 
                        key={tier.id}
                        onClick={() => setSelectedTier(tier.id)}
                        className={`g p-5 border-2 rounded-2xl cursor-pointer transition-all flex flex-col justify-between min-h-[300px] hover:border-white/20 active:scale-[0.99] relative overflow-hidden ${isActive ? tier.activeColor : tier.color}`}
                      >
                        {tier.recommended && (
                          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-[#F5C518] text-black font-black uppercase text-[6px] tracking-widest px-2.5 py-1 rounded-bl-lg shadow-lg">
                            {ls.recommended}
                          </span>
                        )}
                        
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="p-2.5 bg-white/5 border border-white/10 rounded-xl">
                              <TierIcon className="w-5 h-5 text-white" />
                            </span>
                            <span className="text-xl font-black italic tracking-tighter text-white font-display">
                              {fmt$(tier.price)}
                            </span>
                          </div>
                          
                          <div className="space-y-1">
                            <h4 className="text-sm font-black uppercase text-white tracking-wide">{tier.name}</h4>
                            <p className="text-[7.5px] uppercase font-bold text-slate-500 tracking-wider">Plan del Servicio</p>
                          </div>

                          <ul className="space-y-2 border-t border-white/5 pt-3">
                            {tier.features.map((feat, i) => (
                              <li key={i} className="flex gap-2 items-start text-[8.5px] leading-tight text-slate-400 font-bold uppercase">
                                <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-4 border-t border-white/5 mt-4">
                          <div className={`w-full py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-wider text-center transition-all ${isActive ? 'bg-white text-black border-white' : 'bg-transparent border-white/10 text-slate-400 hover:text-white'}`}>
                            {isActive ? 'Seleccionado ✓' : 'Seleccionar'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: ADD-ONS */}
              {job.service_type !== 'handyman' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#F5C518] font-display pl-2">{ls.addons}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {ADDONS_LIST.map(addon => {
                      const isChecked = selectedAddons.includes(addon.id);
                      return (
                        <div 
                          key={addon.id}
                          onClick={() => handleToggleAddon(addon.id)}
                          className={`p-4 border-2 rounded-2xl cursor-pointer text-center select-none active:scale-95 transition-all flex flex-col justify-between min-h-[110px] ${isChecked ? 'border-green-500 bg-green-500/5 text-white font-black shadow-lg shadow-green-500/5' : 'border-white/5 bg-white/5 text-slate-400 hover:text-white'}`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-[14px]">
                              {addon.id === 'oven' ? '🍳' : addon.id === 'fridge' ? '🧊' : addon.id === 'windows' ? '🪟' : addon.id === 'pethair' ? '🐕' : '🚗'}
                            </span>
                            <div className={`w-3.5 h-3.5 border rounded-full flex items-center justify-center transition-colors ${isChecked ? 'bg-green-500 border-green-500 text-black' : 'border-white/20'}`}>
                              {isChecked && <Check className="w-2.5 h-2.5 stroke-[4px]" />}
                            </div>
                          </div>
                          
                          <div className="text-left mt-3">
                            <p className="text-[8px] font-black uppercase truncate tracking-tight">{lang === 'es' ? addon.labelEs : addon.labelEn}</p>
                            <p className="text-[9px] font-black text-slate-300 font-mono mt-0.5">+{fmt$(addon.price)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT SIDEBAR: RECEIPT & SIGNATURE */}
            <div className="space-y-6 lg:sticky lg:top-8">
              
              {/* Proposal Summary Checkout Box */}
              <div className="g p-6 bg-gradient-to-br from-slate-950 via-zinc-900 to-black border border-white/10 rounded-3xl shadow-2xl space-y-4">
                <div className="border-b border-white/5 pb-3">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">RESUMEN DE COTIZACIÓN</span>
                  <h3 className="text-sm font-black text-[#F5C518] uppercase tracking-widest mt-0.5 italic font-display">{GBB_TIERS.find(t => t.id === selectedTier)?.name}</h3>
                </div>

                <div className="space-y-2 border-b border-white/5 pb-3 text-xs font-bold text-slate-400 uppercase">
                  <div className="flex justify-between text-[10px]">
                    <span>{ls.subtotal}:</span>
                    <span className="text-white font-mono">{fmt$(priceCalculations.subtotal)}</span>
                  </div>
                  {priceCalculations.addonsCost > 0 && (
                    <div className="flex justify-between text-[10px]">
                      <span>{ls.addonsCost}:</span>
                      <span className="text-white font-mono">+{fmt$(priceCalculations.addonsCost)}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] font-black text-white uppercase">{ls.totalPrice}:</span>
                    <span className="text-2xl font-black text-[#F5C518] font-mono italic">{fmt$(priceCalculations.total)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                    <span>{ls.depositRequired} (20%):</span>
                    <span className="text-white font-mono">{fmt$(priceCalculations.deposit)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black text-green-400 uppercase pt-2 border-t border-white/5">
                    <span>{ls.balanceDue}:</span>
                    <span className="text-green-400 font-mono text-base">{fmt$(priceCalculations.balance)}</span>
                  </div>
                </div>

                {/* Zelle info if exists */}
                {tenantSettings?.zelle_phone && (
                  <div className="p-3.5 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between gap-3 text-[8.5px] uppercase font-black text-slate-400">
                    <div className="space-y-0.5">
                      <p className="text-[#F5C518]">Zelle deposit</p>
                      <p className="text-white mt-0.5">{tenantSettings.zelle_phone}</p>
                    </div>
                    <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-bounce" />
                  </div>
                )}
              </div>

              {/* SIGNATURE SECTION CARD */}
              <div className="g p-6 bg-gradient-to-br from-slate-950 via-zinc-900 to-black border border-white/10 rounded-3xl shadow-2xl space-y-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#F5C518] font-display">{ls.sign}</h3>
                  <p className="text-[8px] text-slate-500 uppercase font-bold mt-1 leading-normal">{ls.terms}</p>
                </div>

                {/* Draw Signature Canvas Element */}
                <div className="relative border border-white/10 bg-black/60 rounded-2xl overflow-hidden group h-32 shadow-inner">
                  {!hasSigned && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <p className="text-[8.5px] text-slate-500 font-black uppercase tracking-wider italic">{ls.signingPlaceholder}</p>
                    </div>
                  )}
                  <canvas 
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-full cursor-crosshair touch-none"
                  />
                  {hasSigned && (
                    <button 
                      onClick={clearCanvas}
                      className="absolute top-2.5 right-2.5 px-2.5 py-1.5 bg-black/80 hover:bg-black hover:text-red-400 text-slate-400 border border-white/10 hover:border-red-500/30 text-[7px] uppercase font-black rounded-lg transition-colors"
                    >
                      {ls.clear}
                    </button>
                  )}
                </div>

                {/* Confirm Accept Button */}
                <button 
                  onClick={handleAcceptProposal}
                  disabled={!hasSigned}
                  className={`w-full py-5 rounded-2xl font-black text-xs uppercase italic tracking-widest font-display transition-all shadow-xl active:scale-95 ${hasSigned ? 'bg-gradient-to-r from-amber-500 to-[#F5C518] text-black hover:brightness-110 shadow-[#F5C518]/10 cursor-pointer' : 'bg-white/5 border border-white/5 text-slate-600 cursor-not-allowed shadow-none'}`}
                >
                  {ls.confirm}
                </button>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
