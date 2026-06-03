import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Sparkles, X, Check, CreditCard } from 'lucide-react';

export function FeatureGate({ children, requiredPlan = 'premium', currentPlan = 'free', onUpgradeSuccess }) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loadingUpgrade, setLoadingUpgrade] = useState(false);
  
  const planWeights = { free: 0, basic: 1, premium: 2, vip: 3 };
  const hasAccess = planWeights[currentPlan] >= planWeights[requiredPlan];

  if (hasAccess) {
    return <>{children}</>;
  }

  const handleMockUpgrade = () => {
    setLoadingUpgrade(true);
    setTimeout(() => {
      setLoadingUpgrade(false);
      setShowUpgradeModal(false);
      if (onUpgradeSuccess) {
        onUpgradeSuccess(requiredPlan);
      }
    }, 1500);
  };

  return (
    <div className="relative rounded-3xl border border-white/5 bg-black/40 overflow-hidden min-h-[300px] flex flex-col justify-center items-center text-center p-8 group">
      
      {/* Blurred background preview */}
      <div className="absolute inset-0 filter blur-[8px] opacity-15 pointer-events-none select-none transition-all duration-300 group-hover:blur-[12px] group-hover:opacity-10">
        {children}
      </div>

      {/* Golden Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-[#F5C518]/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Lock Card Container */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 space-y-5 max-w-sm"
      >
        <div className="w-14 h-14 rounded-full bg-[#F5C518]/10 border border-[#F5C518]/30 flex items-center justify-center mx-auto shadow-lg shadow-[#F5C518]/10 animate-pulse">
          <Lock className="w-6 h-6 text-[#F5C518]" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-[#F5C518]/10 border border-[#F5C518]/25 text-[#F5C518] text-[7.5px] font-black uppercase tracking-widest inline-flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> MÓDULO EXCLUSIVO EMPIRE
          </span>
          <h3 className="text-lg font-black uppercase tracking-wide text-white font-display italic">Herramienta Restringida</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed max-w-xs mx-auto">
            Habilita este módulo de tu Imperio para optimizar tus operaciones y escalar tu facturación mensual.
          </p>
        </div>

        <button
          onClick={() => setShowUpgradeModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-amber-500 to-[#F5C518] text-black text-[9.5px] font-black uppercase tracking-wider rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[#F5C518]/15 cursor-pointer font-sans"
        >
          Mejorar Plan Ahora
        </button>
      </motion.div>

      {/* Upgrade Modal overlay */}
      <AnimatePresence>
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUpgradeModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-md bg-gradient-to-br from-slate-950 via-zinc-900 to-black border border-white/10 rounded-3xl p-6 overflow-hidden shadow-2xl space-y-6"
            >
              {/* Golden highlight top border */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F5C518] to-transparent"></div>

              {/* Close Button */}
              <button 
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#F5C518]/10 border border-[#F5C518]/25 flex items-center justify-center mx-auto shadow-lg shadow-[#F5C518]/5">
                  <Sparkles className="w-5 h-5 text-[#F5C518]" />
                </div>
                <h4 className="text-base font-black uppercase text-white tracking-widest font-display italic">Upgrade a Plan EMPIRE</h4>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Lleva tu negocio de $8K a $31K/mes</p>
              </div>

              {/* Perks list */}
              <ul className="space-y-2.5 border-y border-white/5 py-4">
                <li className="flex gap-2.5 items-start text-[9.5px] uppercase font-bold text-slate-300">
                  <Check className="w-4 h-4 text-[#F5C518] flex-shrink-0" />
                  <span>GPS Tracking en Vivo & Mapa de Ruta en tiempo real</span>
                </li>
                <li className="flex gap-2.5 items-start text-[9.5px] uppercase font-bold text-slate-300">
                  <Check className="w-4 h-4 text-[#F5C518] flex-shrink-0" />
                  <span>AI Dispatch avanzado (Optimización Inteligente de Rutas)</span>
                </li>
                <li className="flex gap-2.5 items-start text-[9.5px] uppercase font-bold text-slate-300">
                  <Check className="w-4 h-4 text-[#F5C518] flex-shrink-0" />
                  <span>Pasarela Stripe (Asegura citas cobrando depósito del 20%)</span>
                </li>
                <li className="flex gap-2.5 items-start text-[9.5px] uppercase font-bold text-slate-300">
                  <Check className="w-4 h-4 text-[#F5C518] flex-shrink-0" />
                  <span>WhatsApp CRM con automatizaciones ilimitadas</span>
                </li>
              </ul>

              {/* Action Button */}
              <button
                onClick={handleMockUpgrade}
                disabled={loadingUpgrade}
                className="w-full py-4 bg-[#F5C518] hover:bg-amber-400 text-black text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-95 transition-all shadow-lg shadow-[#F5C518]/15 flex items-center justify-center gap-2 cursor-pointer"
              >
                {loadingUpgrade ? (
                  <span className="w-4 h-4 rounded-full border-2 border-black/25 border-t-black animate-spin"></span>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Comenzar Upgrade instantáneo ($99/mo)
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
