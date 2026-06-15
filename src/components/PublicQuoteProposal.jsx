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
  TrendingUp,
  MessageSquare
} from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchAIChat } from '../utils/ai';

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
  const [payMethod, setPayMethod] = useState('card'); // 'card' or 'zelle'

  // AI Sales Closer & Negotiator States
  const [negotiatedDiscountPercent, setNegotiatedDiscountPercent] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Direct Live Support/Inbox Chat States
  const [chatMode, setChatMode] = useState('ai'); // 'ai' | 'support'
  const [supportInputVal, setSupportInputVal] = useState('');
  const [sendingSupport, setSendingSupport] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, job?.specs?.chat_messages, chatMode]);

  // Real-time listener to keep proposal data in sync (e.g. support messages from CEO)
  useEffect(() => {
    if (!quoteId) return;
    const channel = sb
      .channel(`public_proposal_sync:${quoteId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'elevore_missions', filter: `id=eq.${quoteId}` },
        (payload) => {
          console.log('Real-time proposal update received:', payload.new);
          setJob(payload.new);
        }
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [quoteId]);

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

        const urlParams = new URLSearchParams(window.location.search);
        const paymentSuccess = urlParams.get('payment_success') === 'true';
        
        let jobDataToUse = jobData;
        if (paymentSuccess && jobData.status !== 'scheduled' && jobData.status !== 'paid') {
          // If return from successful Stripe checkout and status is still lead/pending,
          // update the database immediately to be scheduled (or paid depending on deposit vs full).
          // This is a client-side fallback/sync.
          const isMock = urlParams.get('mock') === 'true';
          const mockAmount = urlParams.get('amount') ? Number(urlParams.get('amount')) : null;
          
          const updatedSpecs = {
            ...(jobData.specs || {}),
            deposit_paid: true,
            payment_method: 'stripe',
            paid_at: new Date().toISOString(),
            stripe_session_id: urlParams.get('session_id') || 'cs_mock_sync'
          };
          
          const updateData = {
            status: 'scheduled',
            specs: updatedSpecs
          };
          if (mockAmount) {
            updateData.total_price = mockAmount;
          }
          
          const { error: updateErr } = await sb
            .from('elevore_missions')
            .update(updateData)
            .eq('id', quoteId);
            
          if (!updateErr) {
            jobDataToUse = { ...jobData, ...updateData };
          }
        }

        setJob(jobDataToUse);
        const activeLang = jobDataToUse.specs?.lang || 'es';
        setLang(activeLang);
        setChatMessages([
          {
            sender: 'closer',
            text: activeLang === 'es'
              ? '¡Hola! Soy tu Asistente de Cierre IA. Estoy autorizado para responder cualquier duda sobre tu servicio e incluso negociar un descuento exclusivo en tu cotización si confirmas hoy. ¿Tienes alguna pregunta o te gustaría una oferta especial?'
              : 'Hello! I am your AI Sales Closer. I am authorized to answer any questions about your service and even negotiate an exclusive discount if you book today. Do you have any questions or would you like a special offer?',
            time: new Date().toLocaleTimeString(activeLang === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        
        // Auto-select tier if already selected in specs
        if (jobDataToUse.specs?.selected_tier) {
          setSelectedTier(jobDataToUse.specs.selected_tier);
        }
        
        // Auto-select add-ons if already saved
        if (jobDataToUse.specs?.accepted_addons) {
          setSelectedAddons(jobDataToUse.specs.accepted_addons);
        } else {
          // Pre-populate from job columns
          const initialAddons = [];
          if (jobDataToUse.specs?.oven) initialAddons.push('oven');
          if (jobDataToUse.specs?.fridge) initialAddons.push('fridge');
          if (jobDataToUse.specs?.windows) initialAddons.push('windows');
          if (jobDataToUse.specs?.pethair) initialAddons.push('pethair');
          if (jobDataToUse.specs?.garage) initialAddons.push('garage');
          setSelectedAddons(initialAddons);
        }

        if (jobDataToUse.status === 'scheduled' || jobDataToUse.status === 'in_progress' || jobDataToUse.status === 'completed' || jobDataToUse.status === 'paid' || paymentSuccess) {
          setIsSuccess(true);
        }

        // Fetch company / tenant settings
        const { data: settingsData } = await sb
          .from('tenant_settings')
          .select('*')
          .eq('tenant_id', jobDataToUse.tenant_id)
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

    const subtotalAndAddons = tierPrice + addonsCost;
    const discountAmount = Math.round(subtotalAndAddons * (negotiatedDiscountPercent / 100));
    const total = subtotalAndAddons - discountAmount;
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
  }, [job, selectedTier, selectedAddons, tenantSettings, negotiatedDiscountPercent]);

  // Sync proposal choices (tier & addons) to Supabase in real-time
  useEffect(() => {
    if (!job || isSuccess) return;

    const savedTier = job.specs?.selected_tier || 'better';
    const savedAddons = job.specs?.accepted_addons || [];

    const isDifferent = selectedTier !== savedTier ||
      JSON.stringify(selectedAddons.sort()) !== JSON.stringify(savedAddons.sort());

    if (!isDifferent) return;

    setIsSyncing(true);

    const debounceTimer = setTimeout(async () => {
      try {
        const updatedSpecs = {
          ...(job.specs || {}),
          selected_tier: selectedTier,
          accepted_addons: selectedAddons,
          oven: selectedAddons.includes('oven'),
          fridge: selectedAddons.includes('fridge'),
          windows: selectedAddons.includes('windows'),
          pethair: selectedAddons.includes('pethair'),
          garage: selectedAddons.includes('garage')
        };

        const updatedPrice = priceCalculations.total;

        const { error } = await sb.from('elevore_missions')
          .update({
            total_price: updatedPrice,
            specs: updatedSpecs
          })
          .eq('id', quoteId);

        if (error) throw error;

        // Keep local job in sync to prevent refetch loops
        setJob(prev => ({
          ...prev,
          total_price: updatedPrice,
          specs: updatedSpecs
        }));
      } catch (err) {
        console.warn("Failed to sync choices to Supabase in real-time:", err);
      } finally {
        setIsSyncing(false);
      }
    }, 1000); // 1s debounce

    return () => clearTimeout(debounceTimer);
  }, [selectedTier, selectedAddons, quoteId, job, isSuccess, priceCalculations.total]);

  // Adjust canvas scale for high DPI
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
  }, [loading, isSuccess]);

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
        total_price: priceCalculations.total,
        approval_signature: sigDataUrl,
        specs: updatedSpecs
      };

      if (payMethod === 'zelle') {
        updateData.status = 'scheduled';
      }

      const { error: updateErr } = await sb
        .from('elevore_missions')
        .update(updateData)
        .eq('id', quoteId);

      if (updateErr) throw updateErr;

      if (payMethod === 'card') {
        // Redirigir a Stripe Checkout
        const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'payment',
            tenant_id: job.tenant_id,
            amount: priceCalculations.deposit,
            currency: 'usd',
            client_name: job.client_name,
            client_email: job.client_email,
            client_phone: job.client_phone,
            address: job.address,
            service_type: job.service_type,
            mission_id: quoteId,
            payment_type: 'deposit',
            specs: updatedSpecs
          })
        });

        if (!response.ok) {
          const errJson = await response.json();
          throw new Error(errJson.error || 'Fallo en Stripe Checkout');
        }

        const resData = await response.json();
        if (resData.url) {
          window.location.href = resData.url;
        } else {
          throw new Error('No checkout URL received');
        }
      } else {
        // Update local state to reflect success
        setJob({ ...job, ...updateData, status: 'scheduled' });
        setIsSuccess(true);
      }
    } catch (err) {
      console.error('Error accepting proposal:', err);
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userText = inputVal.trim();
    setInputVal('');

    const timeNow = new Date().toLocaleTimeString(lang === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    const updatedMessages = [...chatMessages, { sender: 'user', text: userText, time: timeNow }];
    setChatMessages(updatedMessages);
    setIsTyping(true);

    try {
      const bizName = tenantSettings?.business_full_name || 'Elevore Premium Services';
      
      // Dynamic system instructions telling Gemini details about the job and pricing
      const systemPrompt = `Eres el Agente IA de Cierre de Ventas y Negociación de ${bizName}. 
Tu objetivo es ayudar al cliente ${job.client_name || 'Cliente'} a aprobar y confirmar su propuesta de servicio de "${job.service_type || 'Limpieza'}" en la dirección "${job.address}".
El precio subtotal actual del servicio es de $${priceCalculations.subtotal} USD.
El costo de servicios adicionales seleccionados es de $${priceCalculations.addonsCost} USD.
El precio total actual es de $${priceCalculations.subtotal + priceCalculations.addonsCost} USD.

Reglas de Negociación:
1. Sé extremadamente educado, persuasivo, profesional y habla en español.
2. Si el cliente duda del precio o te pide un descuento, una oferta o una rebaja, ofrécele un descuento especial de cierre inmediato del 10% por reservar hoy.
3. Si el cliente acepta el descuento (o responde afirmativamente a la oferta del descuento), DEBES incluir exactamente la etiqueta "[APPLY_DISCOUNT: 10]" en tu respuesta. Esto es un disparador técnico interno.
4. No menciones la etiqueta [APPLY_DISCOUNT: 10] explícitamente en tu habla normal con el cliente; simplemente añádela de forma discreta al final del texto.
5. Si el descuento ya está activo (descuento actual: ${negotiatedDiscountPercent}%), recuérdale al cliente que ya cuenta con la mejor tarifa posible y motívalo a firmar en la parte inferior de la página para asegurar su reserva.
6. Responde dudas generales:
   - Garantía de Satisfacción: Reasegura al cliente que ofrecemos garantía del 100%. Si algo no queda impecable, regresamos gratis en 24 horas.
   - Seguridad: Todo nuestro personal está asegurado y ha pasado filtros estrictos de antecedentes.
   - Duración: Calculamos el tiempo necesario en base a las habitaciones y pies cuadrados.`;

      // Map roles for the Gemini endpoint handler
      const apiMessages = [
        { role: 'system', content: systemPrompt },
        ...updatedMessages.map(msg => ({
          role: msg.sender === 'closer' ? 'assistant' : 'user',
          content: msg.text
        }))
      ];

      const chatResult = await fetchAIChat(
        apiMessages,
        'gemini-1.5-flash',
        tenantSettings?.gemini_key || localStorage.getItem('elevore_gemini_key') || ''
      );

      if (!chatResult.ok) {
        throw new Error(chatResult.error || 'Error al conectar con la IA de cierre.');
      }

      let replyText = chatResult.text || '';

      // Check if the AI applied the discount trigger
      if (replyText.includes('[APPLY_DISCOUNT: 10]')) {
        // Strip the technical trigger from text displayed in the chat bubble
        replyText = replyText.replace(/\[APPLY_DISCOUNT:\s*10\]/g, '').trim();
        
        if (negotiatedDiscountPercent === 0) {
          setNegotiatedDiscountPercent(10);
          
          // Persist the updated specs & discount in Supabase
          try {
            const updatedSpecs = {
              ...(job.specs || {}),
              selected_tier: selectedTier,
              accepted_addons: selectedAddons,
              ai_discount_applied: true,
              discount_percent: 10
            };
            
            const newTotalPrice = Math.round((priceCalculations.subtotal + priceCalculations.addonsCost) * 0.90);
            
            await sb.from('elevore_missions')
              .update({
                total_price: newTotalPrice,
                specs: updatedSpecs
              })
              .eq('id', quoteId);
          } catch (dbErr) {
            console.error('Failed to sync discount to Supabase:', dbErr);
          }
        }
      }

      setIsTyping(false);
      setChatMessages(prev => [...prev, { sender: 'closer', text: replyText, time: timeNow }]);

    } catch (err) {
      console.error('AI Sales Closer chat exception:', err);
      setIsTyping(false);
      const fallbackReply = lang === 'es'
        ? 'Entendido. Por favor, si tienes alguna duda adicional o requieres programar directamente, contáctanos y con gusto te asistiremos.'
        : 'Understood. Please let us know if you have any questions or want to lock in your date directly.';
      setChatMessages(prev => [...prev, { sender: 'closer', text: fallbackReply, time: timeNow }]);
    }
  };

  const handleSendSupportMessage = async (e) => {
    e.preventDefault();
    if (!supportInputVal.trim()) return;

    const text = supportInputVal.trim();
    setSupportInputVal('');
    setSendingSupport(true);

    const newMsg = {
      id: Math.random().toString(36).substring(2, 9),
      sender: 'client',
      text,
      time: new Date().toISOString()
    };

    const updatedSpecs = {
      ...(job.specs || {}),
      chat_messages: [...(job.specs?.chat_messages || []), newMsg]
    };

    // Optimistically update local state
    setJob(prev => ({ ...prev, specs: updatedSpecs }));

    try {
      const { error } = await sb
        .from('elevore_missions')
        .update({ specs: updatedSpecs })
        .eq('id', quoteId);
      if (error) throw error;
    } catch (err) {
      console.error("Error sending support message:", err);
    } finally {
      setSendingSupport(false);
    }
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
            <h1 className="text-xs font-black uppercase tracking-widest text-[#F5C518] font-display">{tenantSettings?.business_name || 'Elevore'}</h1>
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
              {job?.specs?.deposit_paid || window.location.search.includes('payment_success=true') ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-emerald-400 text-[8px] font-black uppercase tracking-wider mx-auto">
                  💳 Depósito Asegurado vía Stripe
                </div>
              ) : (
                <p className="text-xs text-slate-400">{ls.successSubtitle}</p>
              )}
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
            {!(job?.specs?.deposit_paid || window.location.search.includes('payment_success=true')) && (tenantSettings?.zelle_phone || tenantSettings?.zelle_name) && (
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
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <span className="text-[8px] font-black bg-[#F5C518]/10 text-[#F5C518] border border-[#F5C518]/25 px-2.5 py-1 rounded-lg uppercase tracking-widest">
                      {ls.title}
                    </span>
                    <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                      <span className={`w-1.5 h-1.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-ping' : 'bg-green-500 animate-pulse'}`}></span>
                      {isSyncing 
                        ? (lang === 'es' ? 'Sincronizando elecciones...' : 'Syncing choices...') 
                        : (lang === 'es' ? 'Sincronizado en tiempo real' : 'Synced in real-time')}
                    </span>
                  </div>
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
                  {negotiatedDiscountPercent > 0 && (
                    <div className="flex justify-between text-[10px] text-green-400 font-bold border-t border-white/5 pt-2 mt-2">
                      <span>🤖 DESCUENTO IA CLOSE (-{negotiatedDiscountPercent}%):</span>
                      <span className="font-mono">-{fmt$(Math.round((priceCalculations.subtotal + priceCalculations.addonsCost) * (negotiatedDiscountPercent / 100)))}</span>
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

              {/* AI Negotiator / Live Support Chatbot Card */}
              <div className="g p-5 bg-gradient-to-br from-slate-950 via-zinc-900 to-black border border-white/10 rounded-3xl shadow-xl space-y-3.5 relative overflow-hidden no-print">
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#F5C518]/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1 font-display">
                      {chatMode === 'ai' ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-[#F5C518]" />
                          <span>AI Sales Closer</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                          <span>{lang === 'es' ? 'Bandeja de Entrada' : 'Support Inbox'}</span>
                        </>
                      )}
                    </h4>
                  </div>
                  <span className="text-[6.5px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
                    {chatMode === 'ai' ? 'Autopilot Active' : 'Human Support'}
                  </span>
                </div>

                {/* Mode Selector Toggle */}
                <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setChatMode('ai')}
                    className={`flex-1 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                      chatMode === 'ai' 
                        ? 'bg-gradient-to-b from-[#F5C518] to-amber-600 text-black shadow-md' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {lang === 'es' ? 'Asistente IA' : 'AI Agent'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatMode('support')}
                    className={`flex-1 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all cursor-pointer relative ${
                      chatMode === 'support' 
                        ? 'bg-gradient-to-b from-[#F5C518] to-amber-600 text-black shadow-md' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{lang === 'es' ? 'Soporte Humano' : 'Live Support'}</span>
                    {chatMode !== 'support' && (job?.specs?.chat_messages || []).some(m => m.sender !== 'client') && (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                    )}
                  </button>
                </div>

                {/* Messages Box */}
                <div className="space-y-2.5 h-[200px] overflow-y-auto pr-1 text-[9px] scrollbar-thin flex flex-col" style={{ scrollbarWidth: 'none' }}>
                  {chatMode === 'ai' ? (
                    <>
                      {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                          <div className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                            msg.sender === 'user' 
                              ? 'bg-[#F5C518]/10 text-white border border-[#F5C518]/25 rounded-tr-none' 
                              : 'bg-white/[0.03] text-slate-300 border border-white/5 rounded-tl-none'
                          }`}>
                            {msg.text}
                          </div>
                          <span className="text-[6px] text-slate-600 font-bold uppercase tracking-wider mt-0.5 px-1">{msg.time}</span>
                        </div>
                      ))}
                      {isTyping && (
                        <div className="flex gap-1 items-center pl-2 py-1">
                          <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {(job?.specs?.chat_messages || []).length === 0 ? (
                        <div className="h-full flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-500 space-y-2">
                          <CheckCircle className="w-7 h-7 text-slate-700 animate-pulse" />
                          <p className="text-[8px] font-black uppercase tracking-wider">{lang === 'es' ? 'Chat Directo con Soporte' : 'Direct Support Chat'}</p>
                          <p className="text-[7.5px] uppercase font-bold text-slate-600 leading-normal">{lang === 'es' ? 'Escribe tu consulta abajo. Tus respuestas irán al CEO de la empresa.' : 'Send a message below. Your inquiries will be routed to the CEO.'}</p>
                        </div>
                      ) : (
                        (job.specs.chat_messages).map((msg) => {
                          const isMe = msg.sender === 'client';
                          return (
                            <div key={msg.id} className={`flex flex-col max-w-[85%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                              <span className="text-[6px] text-slate-500 font-black uppercase mb-0.5 tracking-wider">
                                {isMe ? (lang === 'es' ? 'Tú' : 'You') : (msg.sender === 'admin' ? 'CEO Elevore' : (lang === 'es' ? 'Técnico Elevore' : 'Elevore Crew'))} • {new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <div className={`px-3 py-2 rounded-2xl text-[9px] font-medium leading-relaxed break-words shadow-md ${
                                isMe 
                                  ? 'bg-amber-500 text-black rounded-tr-none font-semibold' 
                                  : 'bg-zinc-800 text-white rounded-tl-none border border-white/5'
                              }`}>
                                {msg.text}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                {chatMode === 'ai' ? (
                  <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-white/5 pt-2">
                    <input
                      type="text"
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      placeholder={lang === 'es' ? 'Pregunta por servicios o negociar...' : 'Ask about services or negotiate...'}
                      className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-[9px] text-white focus:outline-none focus:border-[#F5C518]/50 placeholder-slate-700 uppercase font-semibold"
                    />
                    <button
                      type="submit"
                      className="px-3 bg-gradient-to-r from-amber-500 to-[#F5C518] hover:from-amber-600 hover:to-[#E5B508] text-black font-black uppercase text-[8px] tracking-wider rounded-xl active:scale-95 transition-all shadow-md flex items-center justify-center cursor-pointer"
                    >
                      Send
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSendSupportMessage} className="flex gap-2 border-t border-white/5 pt-2">
                    <input
                      type="text"
                      value={supportInputVal}
                      onChange={(e) => setSupportInputVal(e.target.value)}
                      disabled={sendingSupport}
                      placeholder={lang === 'es' ? 'Escribe al equipo de soporte...' : 'Type a message to support...'}
                      className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-[9px] text-white focus:outline-none focus:border-amber-500 placeholder-slate-700 uppercase font-semibold"
                    />
                    <button
                      type="submit"
                      disabled={sendingSupport || !supportInputVal.trim()}
                      className="px-4 bg-gradient-to-r from-amber-500 to-[#F5C518] hover:from-amber-600 hover:to-[#E5B508] disabled:opacity-45 text-black font-black uppercase text-[8px] tracking-wider rounded-xl active:scale-95 transition-all shadow-md flex items-center justify-center cursor-pointer"
                    >
                      {sendingSupport ? '...' : (lang === 'es' ? 'Enviar' : 'Send')}
                    </button>
                  </form>
                )}
              </div>

              {/* SIGNATURE & PAYMENT SECTION CARD */}
              <div className="g p-6 bg-gradient-to-br from-slate-950 via-zinc-900 to-black border border-white/10 rounded-3xl shadow-2xl space-y-4">
                
                {/* Selector de Método de Confirmación y Pago */}
                <div className="space-y-2">
                  <label className="text-[8.5px] font-black uppercase text-slate-500 tracking-widest pl-1">
                    {lang === 'es' ? 'Método de Confirmación y Pago' : 'Confirmation & Payment Method'}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPayMethod('card')}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all duration-200 ${
                        payMethod === 'card'
                          ? 'bg-amber-500/10 border-[#F5C518] text-[#F5C518] font-extrabold shadow-lg shadow-[#F5C518]/5'
                          : 'bg-black/40 border-white/5 text-slate-400 hover:border-white/10 hover:text-white'
                      }`}
                    >
                      <span className="text-base mb-1">💳</span>
                      <span className="text-[8.5px] font-black uppercase tracking-wider">
                        {lang === 'es' ? 'Tarjeta' : 'Card'}
                      </span>
                      <span className="text-[6.5px] uppercase text-slate-500 mt-0.5 font-bold">
                        {lang === 'es' ? '20% Depósito' : '20% Deposit'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPayMethod('zelle')}
                      className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all duration-200 ${
                        payMethod === 'zelle'
                          ? 'bg-blue-500/10 border-blue-500 text-blue-400 font-extrabold shadow-lg shadow-blue-500/5'
                          : 'bg-black/40 border-white/5 text-slate-400 hover:border-white/10 hover:text-white'
                      }`}
                    >
                      <span className="text-base mb-1">🏦</span>
                      <span className="text-[8.5px] font-black uppercase tracking-wider">
                        Zelle
                      </span>
                      <span className="text-[6.5px] uppercase text-slate-500 mt-0.5 font-bold">
                        {lang === 'es' ? 'Pago Manual' : 'Manual Pay'}
                      </span>
                    </button>
                  </div>
                </div>

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
                  {hasSigned 
                    ? (payMethod === 'card' 
                       ? `${lang === 'es' ? 'PAGAR DEPÓSITO Y CONFIRMAR' : 'PAY DEPOSIT & CONFIRM'} (${fmt$(priceCalculations.deposit)})`
                       : (lang === 'es' ? 'ACEPTAR Y CONFIRMAR' : 'ACCEPT & CONFIRM'))
                    : ls.confirm
                  }
                </button>
              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
