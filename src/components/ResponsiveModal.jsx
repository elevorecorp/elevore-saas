import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';

export function ResponsiveModal({ isOpen, onClose, title, children }) {
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000]"
          />
          
          {/* Mobile Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[2010] bg-[#0a0a0c] border-t border-white/10 rounded-t-3xl shadow-[0_-20px_60px_rgba(0,0,0,0.8)] md:hidden flex flex-col"
            style={{ maxHeight: '90vh' }}
          >
            <div className="w-full flex justify-center py-3 shrink-0" onClick={onClose}>
              <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
            </div>
            
            <div className="px-6 pb-2 shrink-0 flex justify-between items-center border-b border-white/5">
              {title && <h3 className="text-lg font-black uppercase tracking-widest text-white">{title}</h3>}
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-full transition-colors ml-auto">
                <Icon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {children}
            </div>
          </motion.div>

          {/* Desktop Centered Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: '-50%', x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: '-50%', x: '-50%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 z-[2010] bg-[#0a0a0c] border border-white/10 rounded-2xl shadow-2xl hidden md:flex flex-col w-full max-w-lg"
            style={{ maxHeight: '90vh' }}
          >
            <div className="px-6 py-4 shrink-0 flex justify-between items-center border-b border-white/5">
              {title && <h3 className="text-lg font-black uppercase tracking-widest text-white">{title}</h3>}
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-full transition-colors ml-auto">
                <Icon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
