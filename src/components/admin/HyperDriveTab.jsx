import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { sb } from '../../supabase';

// =====================================================================
// DYNAMIC ICON HELPER
// =====================================================================
const Icon = ({ name, className, style, ...props }) => {
  if (!name) return null;
  const pascalName = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  const LucideIcon = Icons[pascalName] || Icons.HelpCircle;
  return <LucideIcon className={className} style={style} {...props} />;
};

export const HyperDriveTab = ({ tt, refresh, jobs, staff }) => {
  // --- STATE FOR BOOKING PREVIEW ---
  const [bookingTheme, setBookingTheme] = useState('neon'); // neon, gold, emerald, velvet
  const [sqftSize, setSqftSize] = useState(2000);
  const [selectedAddons, setSelectedAddons] = useState(['oven', 'fridge']);
  const [selectedDay, setSelectedDay] = useState('monday'); // monday, wednesday, friday
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [isSimulatingBooking, setIsSimulatingBooking] = useState(false);
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState('');

  // --- STATE FOR AI COPY GENERATOR ---
  const [businessDesc, setBusinessDesc] = useState(
    'Somos Limpieza Elite Orlando, ofrecemos servicios premium de limpieza residencial profunda y desinfección de oficinas. Usamos productos biodegradables y contamos con personal de confianza certificado.'
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCopy, setGeneratedCopy] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // --- STATE FOR STRIPE LINK BUILDER ---
  const [priceAmt, setPriceAmt] = useState(150);
  const [chargeType, setChargeType] = useState('deposit'); // full, deposit, hold
  const [tipBooster, setTipBooster] = useState(true);
  const [isCopiedLink, setIsCopiedLink] = useState(false);

  // --- PRICING LOGIC ---
  const basePrice = Math.round(sqftSize * 0.08);
  const addonsMeta = {
    oven: { name: 'Horno Interior', price: 45, icon: 'flame' },
    fridge: { name: 'Refrigerador Interior', price: 35, icon: 'snowflake' },
    windows: { name: 'Lavado de Ventanas', price: 65, icon: 'square' },
    carpet: { name: 'Lavado de Alfombras', price: 95, icon: 'layers' },
    balcony: { name: 'Balcón / Patio', price: 50, icon: 'sun' }
  };

  const addonsTotal = selectedAddons.reduce((sum, key) => sum + (addonsMeta[key]?.price || 0), 0);
  const subtotal = basePrice + addonsTotal;
  const isGreenSlot = selectedDay === 'monday' || selectedDay === 'wednesday';
  const discountAmt = isGreenSlot ? Math.round(subtotal * 0.1) : 0;
  const netTotal = subtotal - discountAmt;

  const handleToggleAddon = (key) => {
    if (selectedAddons.includes(key)) {
      setSelectedAddons(selectedAddons.filter((k) => k !== key));
    } else {
      setSelectedAddons([...selectedAddons, key]);
    }
  };

  // --- THEME STYLING CONFIGS ---
  const themeClasses = {
    neon: {
      bg: 'bg-slate-950/90 border-indigo-500/20 text-white',
      accent: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      text: 'text-indigo-400',
      badge: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
      border: 'border-indigo-500/20',
      input: 'border-indigo-500/15 focus:border-indigo-400'
    },
    gold: {
      bg: 'bg-black/95 border-[#F5C518]/20 text-white',
      accent: 'bg-[#F5C518] hover:bg-amber-400 text-black',
      text: 'text-[#F5C518]',
      badge: 'bg-[#F5C518]/10 border-[#F5C518]/20 text-[#F5C518]',
      border: 'border-[#F5C518]/20',
      input: 'border-[#F5C518]/15 focus:border-[#F5C518]'
    },
    emerald: {
      bg: 'bg-zinc-950/90 border-emerald-500/20 text-white',
      accent: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      text: 'text-emerald-400',
      badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      border: 'border-emerald-500/20',
      input: 'border-emerald-500/15 focus:border-emerald-400'
    },
    velvet: {
      bg: 'bg-slate-950/90 border-purple-500/20 text-white',
      accent: 'bg-purple-600 hover:bg-purple-700 text-white',
      text: 'text-purple-400',
      badge: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
      border: 'border-purple-500/20',
      input: 'border-purple-500/15 focus:border-purple-400'
    }
  }[bookingTheme];

  // --- ACTIONS ---
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!clientName || !clientAddress || !clientPhone) {
      tt('Por favor rellena los datos del cliente para la simulación', 'amber');
      return;
    }
    setIsSimulatingBooking(true);
    setBookingSuccessMsg('');

    try {
      // Simulate booking delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Attempt to schedule dynamic booking in Supabase DB for instant testing
      const { data, error } = await sb
        .from('elevore_missions')
        .insert({
          client_name: clientName.toUpperCase(),
          client_phone: clientPhone,
          address: clientAddress,
          service_type: 'Limpieza Inteligente (HyperDrive)',
          status: 'scheduled',
          scheduled_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0] + 'T09:00:00',
          total_price: netTotal,
          team_assigned: staff.find((s) => s.role === 'staff')?.name || 'Equipo Alpha',
          specs: {
            sqft: sqftSize,
            addons: selectedAddons,
            source: 'HyperDrive Dynamic Widget',
            theme: bookingTheme,
            green_slot: isGreenSlot
          }
        })
        .select();

      if (error) throw error;

      setBookingSuccessMsg('¡Reserva creada exitosamente en la base de datos!');
      tt('¡Reserva creada! La misión aparecerá en tu agenda operacional.', 'green');
      if (refresh) refresh();

      // Clear input fields
      setClientName('');
      setClientPhone('');
      setClientAddress('');
    } catch (err) {
      console.error(err);
      tt('Error al crear reserva simulada en base de datos: ' + err.message, 'red');
    } finally {
      setIsSimulatingBooking(false);
    }
  };

  const handleGenerateCopy = () => {
    if (!businessDesc.trim()) {
      tt('Por favor ingresa una descripción del negocio', 'amber');
      return;
    }
    setIsGenerating(true);
    setGeneratedCopy(null);

    // Simulate premium AI copy writer generation
    setTimeout(() => {
      // Analyze business details and generate responses
      const tags = businessDesc.toLowerCase();
      const city = tags.includes('orlando') ? 'Orlando' : 'la ciudad';
      const eco = tags.includes('eco') || tags.includes('verde') || tags.includes('biodegradable');

      setGeneratedCopy({
        h1: `Limpieza de Casas en ${city} con un 99.6% de Satisfacción Garantizada`,
        sub: `Crezca su tiempo libre. Agende en 60 segundos con nuestro sistema de tarifas dinámicas en ${city}. ${
          eco ? 'Servicios ecológicos certificados y sin químicos agresivos.' : 'Personal bilingüe certificado y asegurado.'
        }`,
        ads: [
          {
            title: `Limpieza Premium en ${city} | Precios al Instante`,
            desc: `No más llamadas de cotización. Pruebe nuestro optimizador interactivo de precios y reserve hoy. 5★ Calificación.`
          },
          {
            title: eco ? 'Limpieza Ecológica Orlando | Reserva Segura' : 'Limpieza Profesional de Casas | Agende en 60s',
            desc: `Personal altamente verificado y con seguro completo. Elija horarios con descuento en rutas verdes.`
          }
        ],
        seoTitle: `Servicios de Limpieza de Casas Profesionales en ${city} | Elevore`,
        seoMeta: `Agende limpieza residencial profunda y comercial en ${city} en un clic. Ahorre hasta un 10% reservando en nuestras rutas de despacho eficientes.`
      });

      setIsGenerating(false);
      tt('Estructura de copia publicitaria generada con éxito', 'green');
    }, 1200);
  };

  const handleCopyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    tt('Copiado al portapapeles', 'green');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyStripeLink = () => {
    const mockUrl = `https://elevore.saas/checkout/session_9281?amount=${priceAmt}&type=${chargeType}&booster=${tipBooster}`;
    navigator.clipboard.writeText(mockUrl);
    setIsCopiedLink(true);
    tt('Link de Stripe Checkout copiado', 'green');
    setTimeout(() => setIsCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in pb-24 text-left font-sans">
      
      {/* 🚀 STEROID INTRO BANNER */}
      <div className="g p-6 border-t-4 border-[#F5C518] bg-amber-950/10 border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#F5C518]/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black italic tracking-widest uppercase text-white font-display flex items-center gap-2">
              ⚡ ELEVORE HYPERDRIVE LEAD DECK
            </h2>
            <p className="text-[9px] text-[#F5C518] uppercase mt-1.5 font-mono tracking-widest font-bold">
              Steroid Module • High-Converting Online Booking Widget • AI Landing Copy Generator • Payment Link Automator
            </p>
          </div>
          <span className="px-3 py-1 bg-[#F5C518]/15 border border-[#F5C518]/30 rounded-xl text-[8.5px] font-black text-[#F5C518] uppercase tracking-widest animate-pulse">
            CONVERSIÓN MAXIMIZADA
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
        
        {/* =====================================================================
            COL 1 & 2: WIDGET PREVIEW & BUILDER
            ===================================================================== */}
        <div className="xl:col-span-2 space-y-6">
          <div className="g p-6 bg-slate-950/60 border border-white/5 rounded-3xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className="text-[7.5px] text-slate-500 font-mono uppercase tracking-widest">
                Interactive Canvas Preview
              </span>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                🎨 Selector y Personalizador de Widget Público
              </h3>
              <p className="text-[8px] text-slate-400 mt-1 uppercase font-bold">
                Tus clientes usarán este optimizador digital en tu sitio web. Cambia el tema en tiempo real.
              </p>
            </div>

            {/* Controls Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Theme pickers */}
              <div className="p-4 bg-black/40 border border-white/5 rounded-2xl space-y-3">
                <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Tema del Widget</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'neon', name: 'Cyber Neon', color: 'bg-indigo-500' },
                    { id: 'gold', name: 'Elite Gold', color: 'bg-[#F5C518]' },
                    { id: 'emerald', name: 'Eco Emerald', color: 'bg-emerald-500' },
                    { id: 'velvet', name: 'Deep Velvet', color: 'bg-purple-500' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setBookingTheme(t.id)}
                      className={`p-2 rounded-xl border text-[7.5px] font-black uppercase tracking-wider text-center flex flex-col items-center gap-1.5 transition-all ${
                        bookingTheme === t.id
                          ? 'border-white bg-white/10 text-white'
                          : 'border-white/5 bg-transparent text-slate-400 hover:text-white'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${t.color} shadow-lg`} />
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day selection (Green Slot logic testing) */}
              <div className="p-4 bg-black/40 border border-white/5 rounded-2xl space-y-3">
                <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Día de Reserva Seleccionado</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'monday', label: 'Lunes', badge: 'Ruta Verde (-10%)', isGreen: true },
                    { id: 'wednesday', label: 'Miérc.', badge: 'Ruta Verde (-10%)', isGreen: true },
                    { id: 'friday', label: 'Viernes', badge: 'Regular', isGreen: false }
                  ].map((day) => (
                    <button
                      key={day.id}
                      onClick={() => setSelectedDay(day.id)}
                      className={`p-2 rounded-xl border text-[7.5px] font-black uppercase text-center flex flex-col justify-between h-14 transition-all ${
                        selectedDay === day.id
                          ? day.isGreen
                            ? 'border-green-500 bg-green-500/5 text-green-400'
                            : 'border-[#F5C518] bg-[#F5C518]/5 text-[#F5C518]'
                          : 'border-white/5 bg-transparent text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>{day.label}</span>
                      <span className={`text-[6px] tracking-tight px-1 rounded block ${day.isGreen ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-slate-500'}`}>
                        {day.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Widget Grid Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Slider & Addons Selection (6 cols) */}
              <div className="lg:col-span-7 space-y-5 p-5 bg-black/45 border border-white/5 rounded-3xl">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-mono text-[9px] uppercase font-black">
                    <span className="text-slate-400">Tamaño del Inmueble</span>
                    <span className="text-white">{sqftSize.toLocaleString()} SQFT</span>
                  </div>
                  <input
                    type="range"
                    min={1000}
                    max={6000}
                    step={100}
                    value={sqftSize}
                    onChange={(e) => setSqftSize(Number(e.target.value))}
                    className="w-full accent-[#F5C518]"
                  />
                  <div className="flex justify-between text-[7px] text-slate-600 font-bold uppercase tracking-wider">
                    <span>1,000 SQFT ($80)</span>
                    <span>6,000 SQFT ($480)</span>
                  </div>
                </div>

                {/* Addons Selection Grid */}
                <div className="space-y-2.5">
                  <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Servicios Adicionales (Add-ons)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(addonsMeta).map(([key, data]) => {
                      const isSel = selectedAddons.includes(key);
                      return (
                        <button
                          key={key}
                          onClick={() => handleToggleAddon(key)}
                          className={`p-2.5 border rounded-xl flex items-center justify-between text-[8px] transition-all text-left ${
                            isSel
                              ? 'bg-[#F5C518]/5 border-[#F5C518] text-white'
                              : 'bg-black/30 border-white/5 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 font-bold uppercase">
                            <Icon name={data.icon} className="w-3.5 h-3.5" />
                            {data.name}
                          </span>
                          <span className={`font-black ${isSel ? 'text-[#F5C518]' : 'text-slate-500'}`}>+${data.price}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Client Simulator Form */}
                <form onSubmit={handleBookingSubmit} className="space-y-2.5 pt-3 border-t border-white/5">
                  <label className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest block">Simulación de Checkout del Cliente</label>
                  <div className="space-y-2">
                    <input
                      className="inp text-xs w-full uppercase"
                      placeholder="Nombre del Cliente"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className="inp text-xs w-full"
                        placeholder="Teléfono (e.g. 4075550198)"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                      />
                      <input
                        className="inp text-xs w-full"
                        placeholder="Dirección del Servicio"
                        value={clientAddress}
                        onChange={(e) => setClientAddress(e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSimulatingBooking}
                    className={`w-full py-3.5 rounded-xl font-black uppercase text-[9px] tracking-wider transition-all flex items-center justify-center gap-1.5 active:scale-95 ${themeClasses.accent}`}
                  >
                    {isSimulatingBooking ? (
                      <>
                        <Icon name="loader-2" className="w-3.5 h-3.5 animate-spin" />
                        Procesando Reserva en Piloto Automático...
                      </>
                    ) : (
                      <>
                        <Icon name="zap" className="w-3.5 h-3.5" />
                        Reservar en 60 Segundos con Descuento Dinámico
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Right Visual Widget Screen View (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className={`p-5 rounded-3xl border ${themeClasses.bg} shadow-2xl transition-all duration-500 relative min-h-[380px] flex flex-col justify-between`}>
                  
                  {/* Header widget */}
                  <div className="text-center space-y-1">
                    <div className={`w-8 h-8 rounded-full bg-white/5 mx-auto flex items-center justify-center border ${themeClasses.border}`}>
                      <Icon name="sparkles" className={`w-4 h-4 ${themeClasses.text}`} />
                    </div>
                    <h4 className="text-xs font-black uppercase tracking-widest">Reserva Tu Limpieza</h4>
                    <p className="text-[7.5px] text-slate-400 uppercase tracking-wider">Orlando, Florida</p>
                  </div>

                  {/* Calculations breakdown */}
                  <div className="space-y-2.5 my-6 p-4 bg-black/45 border border-white/5 rounded-2xl">
                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase">
                      <span>Área Base ({sqftSize} sqft):</span>
                      <span className="text-white">${basePrice}</span>
                    </div>

                    {selectedAddons.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[7px] text-slate-500 uppercase font-black block">Servicios Extra Seleccionados:</span>
                        {selectedAddons.map((k) => (
                          <div key={k} className="flex justify-between items-center text-[8.5px] font-semibold text-slate-400 pl-2">
                            <span>• {addonsMeta[k]?.name}</span>
                            <span className="text-white">+${addonsMeta[k]?.price}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border-t border-white/5 pt-2.5 flex justify-between items-center text-[9.5px] font-black uppercase">
                      <span className="text-slate-400">Subtotal:</span>
                      <span className="text-white">${subtotal}</span>
                    </div>

                    {isGreenSlot && (
                      <div className="flex justify-between items-center text-[9.5px] font-black uppercase text-green-400 bg-green-500/5 p-1 rounded">
                        <span>Descuento de Ruta Verde (10%):</span>
                        <span>-${discountAmt}</span>
                      </div>
                    )}

                    <div className="border-t border-white/5 pt-2.5 flex justify-between items-center text-sm font-black uppercase">
                      <span className="text-white">Total Neto:</span>
                      <span className={themeClasses.text}>${netTotal}</span>
                    </div>
                  </div>

                  {/* Green route indicator */}
                  {isGreenSlot ? (
                    <div className="p-3 bg-green-500/10 border border-green-500/25 rounded-2xl flex items-center gap-2.5 text-green-400 text-left">
                      <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <Icon name="leaf" className="w-3 h-3 text-green-400" />
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-wider leading-none">Ruta Verde Activada</p>
                        <p className="text-[7px] text-green-500/80 uppercase font-semibold mt-0.5 leading-tight">
                          ¡Excelente! Hay un equipo de limpieza programado cerca de ti para este día. Ahorramos CO2 y te pasamos el descuento.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-2.5 text-slate-400 text-left">
                      <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                        <Icon name="calendar" className="w-3 h-3 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-wider leading-none">Ruta Regular</p>
                        <p className="text-[7px] text-slate-500 uppercase font-semibold mt-0.5 leading-tight">
                          Reservas en día regular. No se detectan equipos en la cercanía en este bloque.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Secure Booking stamp */}
                  <div className="mt-4 flex items-center justify-center gap-1.5 text-[7px] text-slate-500 uppercase font-black tracking-widest">
                    <Icon name="lock" className="w-3 h-3 text-slate-600" />
                    Secure SSL Encrypted Checkout • Stripe Powered
                  </div>

                  {bookingSuccessMsg && (
                    <div className="absolute inset-0 bg-black/95 rounded-3xl p-5 flex flex-col items-center justify-center text-center animate-in zoom-in-95 z-30">
                      <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mb-3">
                        <Icon name="check" className="w-6 h-6 text-green-400" />
                      </div>
                      <h5 className="text-sm font-black text-white uppercase tracking-wider mb-1">Reserva Exitosa</h5>
                      <p className="text-[8.5px] text-slate-400 uppercase font-bold leading-normal max-w-[200px] mb-4">
                        El sistema generó una misión en estado agendado por un valor de ${netTotal}.
                      </p>
                      <button
                        onClick={() => setBookingSuccessMsg('')}
                        className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-mono font-black uppercase text-[7.5px] rounded-lg tracking-wider"
                      >
                        Hacer Otra Reserva
                      </button>
                    </div>
                  )}

                </div>
              </div>

            </div>
          </div>
        </div>

        {/* =====================================================================
            COL 3: AI LANDING PAGE GENERATOR & STRIPE GENERATOR
            ===================================================================== */}
        <div className="space-y-6">
          {/* AI Copywriter */}
          <div className="g p-5 bg-slate-950/60 border border-white/5 rounded-3xl space-y-4 text-left">
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                🤖 AI Landing Page & Ad Writer
              </h3>
              <p className="text-[7.5px] text-slate-500 uppercase font-bold mt-0.5">
                Genera copias publicitarias de alta conversión optimizadas para Google y SEO local.
              </p>
            </div>

            <div className="space-y-2.5">
              <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block">Descripción del Negocio</label>
              <textarea
                value={businessDesc}
                onChange={(e) => setBusinessDesc(e.target.value)}
                rows={4}
                className="inp text-xs w-full leading-normal custom-scroll"
                placeholder="Escribe detalles del negocio..."
              />
            </div>

            <button
              onClick={handleGenerateCopy}
              disabled={isGenerating}
              className="w-full py-3 bg-[#F5C518] hover:bg-amber-400 text-black font-black uppercase text-[9px] tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              {isGenerating ? (
                <>
                  <Icon name="loader-2" className="w-3.5 h-3.5 animate-spin text-black" />
                  Redactando Copia Comercial...
                </>
              ) : (
                <>
                  <Icon name="sparkles" className="w-3.5 h-3.5 text-black" />
                  Escribir Anuncios y Estructura SEO
                </>
              )}
            </button>

            {generatedCopy && (
              <div className="space-y-3 pt-3 border-t border-white/5 animate-in slide-in-from-bottom-2">
                
                {/* SEO Headings */}
                <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-2 relative group">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopyText(generatedCopy.h1, 'h1')}
                      className="p-1 bg-white/5 border border-white/10 rounded text-slate-400 hover:text-white"
                    >
                      <Icon name={copiedKey === 'h1' ? 'check' : 'copy'} className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[7px] font-mono text-[#F5C518] uppercase tracking-widest font-black block">H1 Landing Headline</span>
                  <p className="text-[10px] font-black text-white">{generatedCopy.h1}</p>
                </div>

                {/* Subheadline */}
                <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-2 relative group">
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopyText(generatedCopy.sub, 'sub')}
                      className="p-1 bg-white/5 border border-white/10 rounded text-slate-400 hover:text-white"
                    >
                      <Icon name={copiedKey === 'sub' ? 'check' : 'copy'} className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[7px] font-mono text-[#F5C518] uppercase tracking-widest font-black block">Sub-headline</span>
                  <p className="text-[9px] font-medium text-slate-300 leading-normal">{generatedCopy.sub}</p>
                </div>

                {/* Google Ads Mock */}
                <div className="space-y-1.5">
                  <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block pl-1">Muestra de Anuncios de Google</span>
                  {generatedCopy.ads.map((ad, idx) => (
                    <div key={idx} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-1 text-left relative group">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopyText(`${ad.title}\n${ad.desc}`, `ad-${idx}`)}
                          className="p-1 bg-white/5 border border-white/10 rounded text-slate-400 hover:text-white"
                        >
                          <Icon name={copiedKey === `ad-${idx}` ? 'check' : 'copy'} className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-[6.5px] text-slate-500 font-bold uppercase block">Patrocinado • Google Search</span>
                      <p className="text-[9.5px] font-bold text-blue-400 hover:underline cursor-pointer leading-tight">{ad.title}</p>
                      <p className="text-[7px] text-green-500 font-mono">www.tu-empresa-de-limpieza.com</p>
                      <p className="text-[8.5px] text-slate-400 mt-1 leading-normal font-medium">{ad.desc}</p>
                    </div>
                  ))}
                </div>

                {/* SEO Metadata */}
                <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-2">
                  <span className="text-[7px] font-mono text-slate-500 uppercase tracking-widest font-black block">Google SEO Metadata</span>
                  <div className="space-y-1 text-[8.5px]">
                    <p className="text-white font-bold"><span className="text-slate-500 font-mono text-[7.5px]">TITLE:</span> {generatedCopy.seoTitle}</p>
                    <p className="text-slate-300 leading-normal font-medium"><span className="text-slate-500 font-mono text-[7.5px]">META:</span> {generatedCopy.seoMeta}</p>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Stripe Link Generator */}
          <div className="g p-5 bg-slate-950/60 border border-white/5 rounded-3xl space-y-4 text-left">
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                💳 Stripe Checkout Link Generator
              </h3>
              <p className="text-[7.5px] text-slate-500 uppercase font-bold mt-0.5">
                Genera links de cobro para enviar depósitos de reserva instantáneos a tus clientes.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block mb-1">Monto a Cobrar ($ USD)</label>
                <input
                  type="number"
                  className="inp text-xs w-full text-amber-500 font-bold"
                  value={priceAmt}
                  onChange={(e) => setPriceAmt(Number(e.target.value) || 0)}
                />
              </div>

              <div>
                <label className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block mb-1">Esquema de Pago</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'full', label: '100% Completo' },
                    { id: 'deposit', label: 'Depósito 20%' },
                    { id: 'hold', label: 'Hold Tarjeta' }
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setChargeType(s.id)}
                      className={`py-2 rounded-xl text-[7.5px] font-black uppercase text-center border transition-all ${
                        chargeType === s.id
                          ? 'border-[#F5C518] bg-[#F5C518]/10 text-white'
                          : 'border-white/5 bg-black/35 text-slate-400 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tip Booster Switch */}
              <div className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                <div className="space-y-0.5">
                  <span className="text-[8px] font-black text-white uppercase block">Activar Booster de Propinas</span>
                  <span className="text-[6.5px] text-slate-500 uppercase block font-semibold">Estimula propinas de 15%, 20% y 25%</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTipBooster(!tipBooster)}
                  className={`w-10 h-6 rounded-full p-1 transition-all ${tipBooster ? 'bg-green-600 flex justify-end' : 'bg-white/5 flex justify-start border border-white/10'}`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md block" />
                </button>
              </div>
            </div>

            <button
              onClick={handleCopyStripeLink}
              className="w-full py-3 bg-[#F5C518] hover:bg-amber-400 text-black font-black uppercase text-[9px] tracking-wider rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10"
            >
              <Icon name={isCopiedLink ? 'check' : 'link'} className="w-3.5 h-3.5 text-black" />
              {isCopiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace de Stripe Checkout'}
            </button>

            {/* Dynamic simulated URL block */}
            <div className="p-3 bg-black/45 border border-white/5 rounded-xl space-y-1.5 text-center">
              <span className="text-[7px] text-slate-500 font-mono uppercase font-black block">Simulated Payment Portal Session</span>
              <p className="text-[8px] font-mono text-cyan-400 truncate tracking-tight">
                {`https://elevore.saas/checkout/session_9281?amount=${priceAmt}&type=${chargeType}&booster=${tipBooster}`}
              </p>
              
              {/* Fake QR code visualization */}
              <div className="w-20 h-20 bg-white p-1 rounded-lg mx-auto flex items-center justify-center border border-white/10 mt-2">
                <div className="w-full h-full bg-[repeating-linear-gradient(45deg,#000,#000_3px,#fff_3px,#fff_6px)] opacity-85" />
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
