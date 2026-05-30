import React, { useState, useEffect } from 'react';
import { sb } from '../../supabase';
import { 
  Sparkles, Calendar, Clock, MapPin, User, Phone, Mail, 
  Shield, Check, Info, Leaf, Loader2, Heart, Award
} from 'lucide-react';
import TimeSlotPicker from './TimeSlotPicker';


export default function PublicBookingWidget({ tenantId: propTenantId }) {
  // Read tenantId from URL query parameters if not passed directly
  const [tenantId, setTenantId] = useState(propTenantId || '');
  const [tenantInfo, setTenantInfo] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Form states
  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    address: '',
    serviceType: 'Limpieza Regular',
    sqft: 1500,
    bookingDate: '',
    bookingTime: '08:00',
    selectedAddons: [],
    customNotes: ''
  });

  // Load tenant ID from search query if not specified
  useEffect(() => {
    if (!tenantId) {
      const urlParams = new URLSearchParams(window.location.search);
      const t = urlParams.get('t') || urlParams.get('tenant') || '';
      setTenantId(t);
    }
  }, [tenantId]);

  // Fetch settings from Supabase
  useEffect(() => {
    async function loadSettings() {
      if (!tenantId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch tenant details
        const { data: tenantData, error: tenantErr } = await sb
          .from('tenants')
          .select('*')
          .eq('id', tenantId)
          .maybeSingle();

        if (tenantErr) throw tenantErr;

        if (tenantData) {
          setTenantInfo(tenantData);

          // Fetch tenant settings
          const { data: settingsData, error: settingsErr } = await sb
            .from('tenant_settings')
            .select('*')
            .eq('tenant_id', tenantId)
            .maybeSingle();

          if (settingsErr) throw settingsErr;

          if (settingsData) {
            setSettings(settingsData);
          }
        }
      } catch (err) {
        console.error('Error loading widget settings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [tenantId]);

  // Handle addon checkbox toggle
  const toggleAddon = (addonId) => {
    setForm(prev => {
      const active = prev.selectedAddons.includes(addonId);
      const nextAddons = active 
        ? prev.selectedAddons.filter(id => id !== addonId)
        : [...prev.selectedAddons, addonId];
      return { ...prev, selectedAddons: nextAddons };
    });
  };

  // Determine if selected date is a green slot (Monday or Wednesday)
  const isGreenSlot = () => {
    if (!form.bookingDate) return false;
    const dateObj = new Date(form.bookingDate + 'T00:00:00');
    const day = dateObj.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
    return day === 1 || day === 3;
  };

  // Calculate pricing
  const calculatePricing = () => {
    // Load custom pricing from settings with default fallbacks
    const baseFee = settings?.booking_base_price !== undefined && settings?.booking_base_price !== null ? Number(settings.booking_base_price) : 100;
    const perSqft = settings?.booking_price_per_sqft !== undefined && settings?.booking_price_per_sqft !== null ? Number(settings.booking_price_per_sqft) : 0.08;
    const multDeep = settings?.booking_multiplier_deep !== undefined && settings?.booking_multiplier_deep !== null ? Number(settings.booking_multiplier_deep) : 1.45;
    const multMoveout = settings?.booking_multiplier_moveout !== undefined && settings?.booking_multiplier_moveout !== null ? Number(settings.booking_multiplier_moveout) : 1.60;

    // Base price calculation based on SQFT
    let basePrice = baseFee + (form.sqft * perSqft);
    
    // Adjust base by service type multipliers
    if (form.serviceType === 'Limpieza Profunda') basePrice *= multDeep;
    if (form.serviceType === 'Mudanza (In/Out)') basePrice *= multMoveout;

    // Add selected addons
    const availableAddons = settings?.addons || [
      { id: 'oven', en: 'Inside Oven', p: 35 },
      { id: 'fridge', en: 'Inside Fridge', p: 30 },
      { id: 'windows', en: 'Windows', p: 50 },
      { id: 'pethair', en: 'Pet Hair', p: 25 },
      { id: 'garage', en: 'Garage', p: 40 }
    ];

    let addonTotal = 0;
    form.selectedAddons.forEach(addonId => {
      const add = availableAddons.find(a => a.id === addonId);
      if (add) addonTotal += Number(add.p);
    });

    const subtotal = basePrice + addonTotal;
    
    // Apply 10% Ruta Verde discount if date is Monday/Wednesday
    const discount = isGreenSlot() ? subtotal * 0.10 : 0;
    const total = subtotal - discount;

    return {
      subtotal: Math.round(subtotal),
      discount: Math.round(discount),
      total: Math.round(total)
    };
  };

  const pricing = calculatePricing();

  const handleBook = async (e) => {
    e.preventDefault();
    if (!form.clientName || !form.clientEmail || !form.clientPhone || !form.address) {
      alert('Por favor completa todos tus datos personales.');
      return;
    }
    if (!form.bookingDate) {
      alert('Por favor selecciona una fecha de servicio.');
      return;
    }

    setBookingLoading(true);
    try {
      // Calculate final pricing and build specs payload
      const pricing = calculatePricing();
      const selectedAddonDetails = (settings?.addons || []).filter(a => form.selectedAddons.includes(a.id));

      const specs = {
        sqft: form.sqft,
        addons: selectedAddonDetails,
        time: form.bookingTime,
        green_discount_applied: isGreenSlot(),
        notes: form.customNotes,
        date_booked: new Date().toISOString()
      };

      // Call checkout API session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'payment',
          tenant_id: tenantId,
          amount: pricing.total,
          currency: 'usd',
          client_name: form.clientName,
          client_email: form.clientEmail,
          client_phone: form.clientPhone,
          address: form.address,
          service_type: form.serviceType,
          specs
        })
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || 'Fallo en Stripe Checkout');
      }

      const resData = await response.json();
      if (resData.url) {
        // Redirect client to Stripe payment page (or simulation)
        window.location.href = resData.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (err) {
      alert('Error en reserva: ' + err.message);
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 animate-spin text-[#F5C518] mb-4" />
        <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Cargando Portal de Reservas...</p>
      </div>
    );
  }

  // Fallback state if no tenant ID is matched
  if (!tenantInfo) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-3xl p-8 space-y-4">
          <Info className="w-12 h-12 text-[#F5C518] mx-auto mb-2" />
          <h2 className="text-xl font-black uppercase tracking-widest italic">Portal de Reservas Elevore</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">
            Este enlace de reservas públicas requiere un identificador de inquilino válido para sincronizar la pasarela.
          </p>
          <p className="text-[9px] text-slate-600 font-mono">
            Uso: ?t=id-de-inquilino
          </p>
        </div>
      </div>
    );
  }

  const businessName = settings?.businessFullName || tenantInfo.business_name;
  const addonsList = settings?.addons || [
    { id: 'oven', en: 'Inside Oven', p: 35 },
    { id: 'fridge', en: 'Inside Fridge', p: 30 },
    { id: 'windows', en: 'Windows', p: 50 },
    { id: 'pethair', en: 'Pet Hair', p: 25 },
    { id: 'garage', en: 'Garage', p: 40 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-black to-zinc-950 text-white py-12 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[#F5C518] text-[8px] font-black uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" /> Portal de Reservas Oficial
          </div>
          <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-amber-400 uppercase">
            {businessName.toUpperCase()}
          </h1>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
            Cotiza, agenda y asegura tu servicio de limpieza premium al instante
          </p>
        </div>

        <form onSubmit={handleBook} className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Main Booking Form Column */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Step 1: Client Information */}
            <div className="g p-6 border border-white/5 bg-black/40 rounded-2xl space-y-4">
              <h2 className="text-[11px] font-black text-[#F5C518] uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
                <User className="w-4 h-4" /> 1. Información Personal
              </h2>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest pl-1">Nombre Completo</label>
                  <input 
                    required 
                    className="inp w-full text-xs" 
                    placeholder="Ej. Juan Pérez" 
                    value={form.clientName} 
                    onChange={e => setForm(prev => ({ ...prev, clientName: e.target.value }))}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest pl-1">Teléfono Móvil (WhatsApp)</label>
                    <input 
                      required 
                      type="tel"
                      className="inp w-full text-xs font-mono" 
                      placeholder="+1 (407) 555-0199" 
                      value={form.clientPhone} 
                      onChange={e => setForm(prev => ({ ...prev, clientPhone: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest pl-1">Correo Electrónico</label>
                    <input 
                      required 
                      type="email"
                      className="inp w-full text-xs" 
                      placeholder="juan@ejemplo.com" 
                      value={form.clientEmail} 
                      onChange={e => setForm(prev => ({ ...prev, clientEmail: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest pl-1">Dirección de la Propiedad</label>
                  <input 
                    required 
                    className="inp w-full text-xs" 
                    placeholder="100 E Pine St, Orlando, FL 32801" 
                    value={form.address} 
                    onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Service Specifications */}
            <div className="g p-6 border border-white/5 bg-black/40 rounded-2xl space-y-4">
              <h2 className="text-[11px] font-black text-[#F5C518] uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
                <Award className="w-4 h-4" /> 2. Detalles del Servicio
              </h2>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest pl-1">Tipo de Servicio</label>
                    <select 
                      className="inp w-full text-xs select-dark bg-zinc-950 text-white"
                      value={form.serviceType}
                      onChange={e => setForm(prev => ({ ...prev, serviceType: e.target.value }))}
                    >
                      <option value="Limpieza Regular">Limpieza Regular (Estándar)</option>
                      <option value="Limpieza Profunda">Limpieza Profunda (+45%)</option>
                      <option value="Mudanza (In/Out)">Mudanza In/Out (+60%)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center pr-1">
                      <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Tamaño de Propiedad</label>
                      <span className="text-[9px] font-black text-amber-400 font-mono">{form.sqft} SQFT</span>
                    </div>
                    <input 
                      type="range" 
                      min="500" 
                      max="6000" 
                      step="100" 
                      className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#F5C518] mt-2"
                      value={form.sqft} 
                      onChange={e => setForm(prev => ({ ...prev, sqft: Number(e.target.value) }))}
                    />
                    <div className="flex justify-between text-[7px] text-slate-600 font-bold uppercase mt-1">
                      <span>500 SQFT</span>
                      <span>3000 SQFT</span>
                      <span>6000 SQFT</span>
                    </div>
                  </div>
                </div>

                {/* Add-ons List */}
                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase text-slate-500 tracking-widest pl-1">Extras Adicionales (Opcional)</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {addonsList.map(addon => {
                      const active = form.selectedAddons.includes(addon.id);
                      return (
                        <button
                          type="button"
                          key={addon.id}
                          onClick={() => toggleAddon(addon.id)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${
                            active 
                              ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-extrabold'
                              : 'bg-zinc-950/40 border-white/5 text-slate-400 hover:border-white/10 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] ${active ? 'bg-amber-400 text-black' : 'bg-zinc-800'}`}>
                              {active && <Check className="w-2.5 h-2.5" />}
                            </span>
                            <span>{addon.en}</span>
                          </div>
                          <span className="font-mono text-[8px] text-slate-500">${addon.p}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Date and Time Schedule */}
            <div className="g p-6 border border-white/5 bg-black/40 rounded-2xl space-y-4">
              <h2 className="text-[11px] font-black text-[#F5C518] uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-2">
                <Calendar className="w-4 h-4" /> 3. Fecha & Hora de Preferencia
              </h2>
              
              <TimeSlotPicker 
                tenantId={tenantId}
                selectedDate={form.bookingDate}
                selectedTime={form.bookingTime}
                onChangeDate={date => setForm(prev => ({ ...prev, bookingDate: date }))}
                onChangeTime={time => setForm(prev => ({ ...prev, bookingTime: time }))}
                lang="es"
              />

              {/* Carbon Footprint & Green Slot Alert banner */}
              {isGreenSlot() && (
                <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex gap-3 items-center animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Leaf className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-emerald-400 tracking-widest">🍀 RUTA VERDE ACTIVA: ¡10% DE DESCUENTO APLICADO!</p>
                    <p className="text-[8px] text-slate-400 uppercase font-bold mt-0.5 leading-normal">
                      Has seleccionado lunes/miércoles. Consolidamos nuestras rutas locales este día, ahorrando combustible y reduciendo la huella de carbono.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pricing & Checkout Summary Sticky Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="sticky top-6 g p-6 border border-[#F5C518]/20 bg-[#F5C518]/5 rounded-3xl space-y-6 shadow-[0_0_50px_rgba(245,197,24,0.03)]">
              <div>
                <h3 className="text-[12px] font-black uppercase tracking-widest text-[#F5C518]">Resumen de la Cotización</h3>
                <p className="text-[7.5px] text-slate-400 uppercase font-bold mt-0.5">Revisa el desglose detallado de tu reserva</p>
              </div>

              <div className="space-y-2.5 border-y border-white/5 py-4">
                <div className="flex justify-between text-[9px] font-bold uppercase">
                  <span className="text-slate-400">Servicio Básico</span>
                  <span className="text-white font-mono">${Math.round(100 + (form.sqft * 0.08))}</span>
                </div>
                
                {form.serviceType !== 'Limpieza Regular' && (
                  <div className="flex justify-between text-[9px] font-bold uppercase">
                    <span className="text-slate-400">Multiplicador {form.serviceType}</span>
                    <span className="text-white font-mono">
                      {form.serviceType === 'Limpieza Profunda' ? 'x1.45' : 'x1.60'}
                    </span>
                  </div>
                )}

                {form.selectedAddons.length > 0 && (
                  <div className="flex justify-between text-[9px] font-bold uppercase">
                    <span className="text-slate-400">Servicios Adicionales ({form.selectedAddons.length})</span>
                    <span className="text-white font-mono">
                      +${addonsList.filter(a => form.selectedAddons.includes(a.id)).reduce((acc, curr) => acc + Number(curr.p), 0)}
                    </span>
                  </div>
                )}

                {isGreenSlot() && (
                  <div className="flex justify-between text-[9px] font-black uppercase text-emerald-400">
                    <span className="flex items-center gap-1">🍀 Descuento Ruta Verde</span>
                    <span className="font-mono">-${pricing.discount}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total a pagar:</span>
                <span className="text-4xl font-black italic text-[#F5C518] font-mono">${pricing.total} <span className="text-[8px] text-slate-500 uppercase font-bold not-italic">USD</span></span>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex gap-2 bg-black/40 border border-white/5 rounded-xl p-3">
                  <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[7.5px] text-slate-400 uppercase font-bold leading-normal">
                    Tus pagos son procesados de forma 100% cifrada y segura a través de **Stripe**. No guardamos los datos de tu tarjeta.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="w-full bg-[#F5C518] hover:bg-amber-400 text-black py-4 rounded-xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all shadow-[0_0_25px_rgba(245,197,24,0.15)] flex items-center justify-center gap-2"
                >
                  {bookingLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    <>🚀 Confirmar y Pagar en Stripe</>
                  )}
                </button>
              </div>

            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
