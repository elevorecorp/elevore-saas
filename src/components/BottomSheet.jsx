import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

export function BottomSheet({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const Icon = Icons['X'] || Icons.X;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1100] md:hidden"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[1110] bg-[#0a0a0c] border-t border-white/10 rounded-t-3xl overflow-hidden md:hidden shadow-[0_-20px_60px_rgba(0,0,0,0.8)]"
            style={{ maxHeight: '90vh' }}
          >
            <div className="w-full flex justify-center py-3" onClick={onClose}>
              <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
            </div>
            
            <div className="px-6 pb-2 flex justify-between items-center border-b border-white/5">
              <h3 className="text-lg font-black uppercase tracking-widest text-white">{title}</h3>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-full transition-colors">
                <Icon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
