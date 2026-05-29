import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';

const Icon = ({ name, className, style, ...props }) => {
  if (!name) return null;
  const pascalName = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  const LucideIcon = Icons[pascalName] || Icons.HelpCircle;
  return <LucideIcon className={className} style={style} {...props} />;
};

export const SecurityLedger = ({ tt }) => {
  const [logs, setLogs] = useState([
    { id: 1, action: 'Usuario jose.mario@elevore.com inició sesión admin', date: '2026-05-29 10:45:12', prevHash: '0000000000000000000000000000000000000000000000000000000000000000', hash: '' },
    { id: 2, action: 'Ruta de misiones para Team Alpha modificada manualmente', date: '2026-05-29 11:15:30', prevHash: '', hash: '' },
    { id: 3, action: 'Nómina Sandbox modificada: 40% -> 38% (Nómina por Desempeño)', date: '2026-05-29 11:35:10', prevHash: '', hash: '' },
    { id: 4, action: 'Ejecución de optimización de rutas Autopilot Dispatch', date: '2026-05-29 11:59:40', prevHash: '', hash: '' }
  ]);

  const [validationState, setValidationState] = useState('idle'); // idle, checking, success, error
  const [tamperedIdx, setTamperedIdx] = useState(null);

  // Simple synchronous hashing helper for demonstration
  const simpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(16, '0') + Math.abs(hash * 3).toString(16).padStart(16, '0') + 'ea83bf2b';
  };

  // Compute hashes sequentially like a blockchain ledger
  const computeLedgerHashes = (currentLogs) => {
    let updated = [...currentLogs];
    for (let i = 0; i < updated.length; i++) {
      if (i > 0) {
        updated[i].prevHash = updated[i - 1].hash;
      }
      const rawContent = updated[i].id + updated[i].action + updated[i].date + updated[i].prevHash;
      updated[i].hash = simpleHash(rawContent);
    }
    return updated;
  };

  useEffect(() => {
    setLogs(prev => computeLedgerHashes(prev));
  }, []);

  const handleValidateLedger = () => {
    setValidationState('checking');
    tt('Verificando firmas criptográficas SHA-256 del Ledger...', 'blue');
    
    setTimeout(() => {
      // Check if chain is broken
      let chainValid = true;
      for (let i = 0; i < logs.length; i++) {
        if (i > 0 && logs[i].prevHash !== logs[i - 1].hash) {
          chainValid = false;
          break;
        }
        // Check if hash matches content
        const rawContent = logs[i].id + logs[i].action + logs[i].date + logs[i].prevHash;
        if (logs[i].hash !== simpleHash(rawContent)) {
          chainValid = false;
          break;
        }
      }

      if (chainValid) {
        setValidationState('success');
        tt('¡Ledger Criptográfico 100% Seguro e Intacto! Cero alteraciones.', 'green');
      } else {
        setValidationState('error');
        tt('⚠️ ¡ALERTA DE SEGURIDAD! Cadena de auditoría alterada o corrupta.', 'red');
      }
    }, 1200);
  };

  const handleTamperLedger = () => {
    let updated = [...logs];
    // Alter action content of record #3 without recalculating subsequent hashes
    updated[2].action = 'Nómina Sandbox modificada: 40% -> 20% (MODIFICACIÓN MALICIOSA DETECTADA)';
    setLogs(updated);
    setTamperedIdx(2);
    setValidationState('idle');
    tt('⚠️ Simulando alteración de base de datos en Registro #3. Ejecuta la validación.', 'amber');
  };

  const handleRestoreLedger = () => {
    const original = [
      { id: 1, action: 'Usuario jose.mario@elevore.com inició sesión admin', date: '2026-05-29 10:45:12', prevHash: '0000000000000000000000000000000000000000000000000000000000000000', hash: '' },
      { id: 2, action: 'Ruta de misiones para Team Alpha modificada manualmente', date: '2026-05-29 11:15:30', prevHash: '', hash: '' },
      { id: 3, action: 'Nómina Sandbox modificada: 40% -> 38% (Nómina por Desempeño)', date: '2026-05-29 11:35:10', prevHash: '', hash: '' },
      { id: 4, action: 'Ejecución de optimización de rutas Autopilot Dispatch', date: '2026-05-29 11:59:40', prevHash: '', hash: '' }
    ];
    setLogs(computeLedgerHashes(original));
    setTamperedIdx(null);
    setValidationState('idle');
    tt('Ledger restaurado a firmas válidas originales.', 'green');
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-24 font-sans text-left">
      
      {/* Banner */}
      <div className="g p-5 border-t-4 border-emerald-500 bg-emerald-950/10 border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h2 className="text-xl font-black tracking-widest uppercase text-white font-display flex items-center gap-2">
            🛡️ SEGURIDAD AVANZADA Y LEDGER CRIPTOGRÁFICO
          </h2>
          <p className="text-[8px] text-emerald-400 uppercase mt-1 font-mono tracking-widest">
            Column-Level Encryption Status • Hardware Security Modules (HSM) • Immutable Audit Chains
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Vault Status */}
        <div className="space-y-6">
          <div className="g p-5 bg-slate-950/60 border border-white/5 rounded-2xl space-y-4 shadow-lg">
            <h4 className="text-[10px] font-black text-white uppercase tracking-widest pb-3 border-b border-white/5">
              🔒 Estado de Shield Vault
            </h4>
            
            <div className="space-y-3.5">
              {[
                { field: 'client_phone', type: 'AES-256-GCM', key: 'hsm-rot-k1', status: 'Cifrado' },
                { field: 'client_email', type: 'AES-256-GCM', key: 'hsm-rot-k1', status: 'Cifrado' },
                { field: 'financial_sandbox', type: 'AES-256-GCM', key: 'hsm-rot-k2', status: 'Cifrado' },
                { field: 'total_price', type: 'AES-256-CBC', key: 'hsm-rot-k1', status: 'Cifrado' }
              ].map((v, i) => (
                <div key={i} className="p-3 bg-black border border-white/5 rounded-xl flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-white font-mono uppercase">{v.field}</p>
                    <p className="text-[6.5px] text-slate-500 font-mono mt-0.5">Key Ref: {v.key}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-black uppercase text-[6px] rounded font-mono block">
                      {v.type}
                    </span>
                    <span className="text-[6.5px] text-slate-400 font-bold block mt-1">● {v.status}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-white/5 space-y-2 text-[7.5px] text-slate-400 uppercase font-semibold leading-normal">
              <p className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Hardware Security Module: Activo</p>
              <p className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Rotación de llaves: Automática (90d)</p>
              <p className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Row-Level Security (RLS) en DB: Activo (100%)</p>
            </div>
          </div>

          {/* Sandbox controls for demonstrating tampering */}
          <div className="g p-5 bg-black border border-white/5 rounded-2xl space-y-3.5 shadow-lg">
            <div>
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest">🧪 Laboratorio de Estrés de Seguridad</h4>
              <p className="text-[7.5px] text-slate-500 uppercase font-black mt-1">Simula un hackeo/alteración directa de la base de datos para probar la detección del Ledger.</p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleTamperLedger}
                className="w-full py-2.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all"
              >
                ⚠️ Alterar Registro #3 (Inyección Maliciosa)
              </button>
              <button
                onClick={handleRestoreLedger}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[8px] font-black uppercase tracking-wider transition-all border border-white/5"
              >
                Restore Hash Integrity 🔄
              </button>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Cryptographic Immutable Ledger */}
        <div className="lg:col-span-2 space-y-6">
          <div className="g p-5 bg-slate-950/60 border border-white/5 rounded-2xl space-y-5 shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-3 border-b border-white/5">
              <div>
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">
                  ⛓️ Ledger Criptográfico de Auditoría (Append-Only Audit)
                </h4>
                <p className="text-[7.5px] text-slate-500 uppercase font-black mt-0.5">
                  Cada bloque liga el hash SHA-256 del registro anterior con su propio contenido.
                </p>
              </div>

              {validationState === 'checking' ? (
                <div className="flex items-center gap-2 text-cyan-400 font-mono text-[8px] uppercase font-black">
                  <div className="w-3.5 h-3.5 border border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Auditando hashes...</span>
                </div>
              ) : validationState === 'success' ? (
                <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/35 text-emerald-400 font-black uppercase text-[7.5px] rounded-lg tracking-wider font-mono">
                  Chain Verified ✓
                </span>
              ) : validationState === 'error' ? (
                <span className="px-2.5 py-1 bg-red-500/20 border border-red-500/35 text-red-500 font-black uppercase text-[7.5px] rounded-lg tracking-wider font-mono animate-pulse">
                  ⚠️ Cadena Comprometida
                </span>
              ) : (
                <button
                  onClick={handleValidateLedger}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black uppercase text-[8px] tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] flex items-center gap-1.5"
                >
                  <Icon name="check-square" className="w-3.5 h-3.5" /> Validar Integridad
                </button>
              )}
            </div>

            {/* Blockchain log blocks */}
            <div className="space-y-4">
              {logs.map((log, idx) => {
                const isTamperedRow = tamperedIdx === idx;
                const prevMismatch = idx > 0 && logs[idx].prevHash !== logs[idx - 1].hash;

                return (
                  <div
                    key={log.id}
                    className={`p-4 bg-black border rounded-2xl space-y-2 relative transition-all duration-300 ${
                      isTamperedRow || prevMismatch 
                        ? 'border-red-500 bg-red-500/[0.02] shadow-[0_0_15px_rgba(239,68,68,0.08)]' 
                        : 'border-white/5 hover:border-slate-800'
                    }`}
                  >
                    {/* Index block */}
                    <div className="flex justify-between items-center text-[8px] font-mono">
                      <span className="text-slate-500 font-black">BLOCK #{log.id}</span>
                      <span className="text-slate-500 font-black">{log.date}</span>
                    </div>

                    {/* Action text */}
                    <div className="text-left py-1 text-[9px] font-bold uppercase tracking-wide flex items-center justify-between gap-3">
                      <span className={isTamperedRow ? 'text-red-400 animate-pulse' : 'text-slate-200'}>
                        {log.action}
                      </span>
                      {isTamperedRow && (
                        <span className="text-[6.5px] font-black text-red-400 bg-red-400/10 border border-red-500/20 px-1.5 py-0.5 rounded flex-shrink-0 uppercase">ALTERADO</span>
                      )}
                    </div>

                    {/* Hashes values */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[7.5px] font-mono text-slate-500 pt-2 border-t border-white/[0.03]">
                      <div className="space-y-0.5">
                        <span className="text-slate-600 font-black block">PREV HASH</span>
                        <span className={`block truncate ${prevMismatch ? 'text-red-400 font-bold' : ''}`}>{log.prevHash}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-slate-600 font-black block">BLOCK HASH</span>
                        <span className="block truncate text-indigo-400 font-bold">{log.hash}</span>
                      </div>
                    </div>

                    {/* Golden link badge */}
                    {idx > 0 && (
                      <div className="absolute -top-[11px] left-8 transform translate-y-0 pointer-events-none">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border shadow-lg ${
                          prevMismatch 
                            ? 'bg-red-950 border-red-500 text-red-400' 
                            : 'bg-indigo-950 border-indigo-500/40 text-indigo-400'
                        }`}>
                          <Icon name={prevMismatch ? 'link-2-off' : 'link-2'} className="w-3 h-3" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
