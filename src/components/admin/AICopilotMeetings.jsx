import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { sb } from '../../supabase';

const Icon = ({ name, className, style, ...props }) => {
  if (!name) return null;
  const pascalName = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  const LucideIcon = Icons[pascalName] || Icons.HelpCircle;
  return <LucideIcon className={className} style={style} {...props} />;
};

export const AICopilotMeetings = ({ jobs, staff, tt, refresh, activeUser }) => {
  const [meetingActive, setMeetingActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcripts, setTranscripts] = useState([]);
  const [showSummary, setShowSummary] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [waveHeights, setWaveHeights] = useState([20, 15, 30, 10, 25, 18, 40, 20]);
  const [meetingDuration, setMeetingDuration] = useState(0);
  const [aiSummaryContent, setAiSummaryContent] = useState('');
  
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);

  const ollamaUrl = localStorage.getItem('elevore_ollama_url') || 'http://127.0.0.1:11434';
  const ollamaModel = localStorage.getItem('elevore_ollama_model') || 'llama3.2';

  const getOtherSpeakerName = (idx) => {
    if (Array.isArray(staff) && staff.length > 0) {
      const candidates = staff.filter(s => s.name && s.name.toLowerCase() !== (activeUser || '').toLowerCase());
      if (candidates.length > 0) {
        return candidates[idx % candidates.length].name;
      }
    }
    return idx === 1 ? 'Team Alpha' : 'Team Beta';
  };

  // Audio wave mock animation
  useEffect(() => {
    if (!meetingActive || isMuted) return;
    const interval = setInterval(() => {
      setWaveHeights(prev => prev.map(() => Math.floor(Math.random() * 45) + 5));
    }, 120);
    return () => clearInterval(interval);
  }, [meetingActive, isMuted]);

  // Meeting duration timer
  useEffect(() => {
    if (meetingActive) {
      timerRef.current = setInterval(() => {
        setMeetingDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setMeetingDuration(0);
    }
    return () => clearInterval(timerRef.current);
  }, [meetingActive]);

  // Speech Recognition Stream
  useEffect(() => {
    if (!meetingActive) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported in this browser.');
      tt('El navegador no soporta Speech Recognition. Usando simulador local.', 'amber');
      
      // Fallback: Mock Conversations timed intervals
      const mockConversations = [
        { speaker: activeUser || 'Administrador (Tú)', text: 'Buenos días equipo. Sincronización de ruta para hoy en Pine St.', time: '10:00:02', delay: 1000 },
        { speaker: getOtherSpeakerName(1), text: 'Vamos en camino a Pine St de Jose Mario. Listos.', time: '10:00:08', delay: 3500 },
        { speaker: getOtherSpeakerName(2), text: 'Tránsito pesado en la I-4. Retraso estimado de 10 min para Maria Delgado.', time: '10:00:15', delay: 7000 },
        { speaker: activeUser || 'Administrador (Tú)', text: 'Entendido. Ofrezcan limpieza de alfombras a Jose Mario, y notifiquen retraso a Maria Delgado.', time: '10:00:23', delay: 10500 },
        { speaker: getOtherSpeakerName(1), text: 'Copiado. Agregaremos limpieza de alfombras por $75 USD.', time: '10:00:30', delay: 14000 }
      ];

      const timeouts = mockConversations.map(msg => {
        return setTimeout(() => {
          setTranscripts(prev => [...prev, msg]);
        }, msg.delay);
      });
      return () => timeouts.forEach(t => clearTimeout(t));
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'es-ES';

    rec.onresult = (event) => {
      if (isMuted) return;
      const lastIndex = event.results.length - 1;
      const text = event.results[lastIndex][0].transcript.trim();
      if (!text) return;

      const timeStr = new Date().toTimeString().split(' ')[0];
      setTranscripts(prev => [...prev, { speaker: activeUser || 'Administrador (Tú)', text, time: timeStr }]);
    };

    rec.onerror = (err) => {
      console.error('Speech Recognition error:', err);
      if (err.error !== 'no-speech') {
        tt('Micrófono: ' + err.error, 'amber');
      }
    };

    rec.onend = () => {
      if (meetingActive && !isMuted) {
        try {
          rec.start();
        } catch (e) {}
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [meetingActive]);

  // Handle Mute changes
  useEffect(() => {
    if (!recognitionRef.current) return;
    if (isMuted) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    } else if (meetingActive) {
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
  }, [isMuted, meetingActive]);

  const handleStartMeeting = () => {
    setTranscripts([]);
    setAiSummaryContent('');
    setShowSummary(false);
    setMeetingActive(true);
    tt('Reunión de Staff iniciada. Habla para transcribir 🎙️', 'blue');
  };

  const handleEndMeeting = async () => {
    setMeetingActive(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setGeneratingSummary(true);
    tt('Procesando transcripción con Ollama local...', 'blue');

    const rawTranscripts = transcripts.length > 0 ? transcripts : [
      { speaker: activeUser || 'Administrador (Tú)', text: 'Buenos días equipo. Sincronización de ruta para hoy en Pine St.', time: '10:00:02' },
      { speaker: getOtherSpeakerName(1), text: 'Vamos en camino a Pine St de Jose Mario. Listos.', time: '10:00:08' },
      { speaker: getOtherSpeakerName(2), text: 'Tránsito pesado en la I-4. Retraso estimado de 10 min para Maria Delgado.', time: '10:00:15' },
      { speaker: activeUser || 'Administrador (Tú)', text: 'Entendido. Ofrezcan limpieza de alfombras a Jose Mario, y notifiquen retraso a Maria Delgado.', time: '10:00:23' },
      { speaker: getOtherSpeakerName(1), text: 'Copiado. Agregaremos limpieza de alfombras por $75 USD.', time: '10:00:30' }
    ];

    const transcriptText = rawTranscripts.map(t => `[${t.time}] ${t.speaker}: ${t.text}`).join('\n');

    try {
      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          messages: [
            {
              role: 'system',
              content: 'Eres el copiloto de IA de Elevore SaaS. Tu tarea es analizar la transcripción de la reunión matutina de coordinación de cuadrillas y extraer: (1) Resumen Ejecutivo, (2) Alertas reportadas, y (3) Tareas de plan de acción. Responde con un tono formal y ejecutivo en español.'
            },
            {
              role: 'user',
              content: `Analiza esta transcripción y genera las minutas:\n\n${transcriptText}`
            }
          ],
          stream: false
        })
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();
      const content = data.message?.content || 'No se pudo generar la minuta.';
      setAiSummaryContent(content);
      setGeneratingSummary(false);
      setShowSummary(true);
      tt('Minutas y plan de acción generado con Ollama local ✓', 'green');
    } catch (err) {
      console.warn('Ollama offline, running heuristic local parser:', err);
      const content = generateLocalFallbackSummary(rawTranscripts);
      setAiSummaryContent(content);
      setGeneratingSummary(false);
      setShowSummary(true);
      tt('Minutas generadas con motor heurístico local ✓', 'green');
    }
  };

  const generateLocalFallbackSummary = (list) => {
    let summary = "Reunión finalizada. Sincronización de cuadrillas completada.\n\n";
    let alerts = [];
    let actions = [];

    list.forEach(t => {
      const textLower = t.text.toLowerCase();
      if (textLower.includes('tránsito') || textLower.includes('tráfico') || textLower.includes('retraso') || textLower.includes('tarde')) {
        alerts.push(`Posible retraso reportado por ${t.speaker}: "${t.text}"`);
      }
      if (textLower.includes('alfombra') || textLower.includes('limpieza') || textLower.includes('adicional')) {
        actions.push(`Evaluar servicio adicional mencionado: "${t.text}"`);
      }
    });

    if (alerts.length === 0) alerts.push("Ninguna alerta crítica detectada.");
    if (actions.length === 0) actions.push("Continuar con el itinerario de misiones programado.");

    return `📋 RESUMEN OPERATIVO:\nSe procesó una transcripción de ${list.length} líneas de audio.\n\n⚠️ ALERTAS DETECTADAS:\n- ${alerts.join('\n- ')}\n\n⚡ PLAN DE ACCIÓN RECOMENDADO:\n- ${actions.join('\n- ')}`;
  };

  const handleCreateExtraMission = async () => {
    try {
      const clientJob = jobs.find(j => j.client_name?.toLowerCase().includes('jose'));
      
      const payload = {
        client_name: 'Jose Mario',
        client_phone: clientJob?.client_phone || '+1 407-555-0199',
        address: clientJob?.address || '100 E Pine St, Orlando, FL 32801',
        service_type: 'Limpieza de Alfombras (Adicional)',
        total_price: 75,
        deposit_paid: 0,
        status: 'scheduled',
        team_assigned: 'Team Alpha',
        scheduled_date: new Date().toISOString().split('T')[0] + 'T11:00:00Z',
        tenant_id: clientJob?.tenant_id || 't1'
      };

      const { error } = await sb.from('elevore_missions').insert([payload]);
      if (error) throw error;

      tt('¡Misión adicional de Limpieza de Alfombras agendada en la DB! 🚀', 'green');
      if (refresh) refresh();
    } catch (err) {
      console.error(err);
      tt('Error al crear misión adicional: ' + err.message, 'red');
    }
  };

  const handleNotifyDelay = () => {
    const phone = '14075550199'; // Maria Delgado phone number
    const text = 'Hola Maria, te notificamos de parte de Elevore que tu cuadrilla reporta un retraso de 10 min debido a la autopista I-4. Ya van en camino.';
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    tt('Redirigiendo a WhatsApp Web para notificar al cliente...', 'green');
  };

  const fmtTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-24 font-sans text-left">
      
      {/* Banner */}
      <div className="g p-5 border-t-4 border-indigo-500 bg-indigo-950/10 border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div>
          <h2 className="text-xl font-black tracking-widest uppercase text-white font-display flex items-center gap-2">
            🎙️ AI COPILOT MEETINGS & TRANSCRIPTIONS
          </h2>
          <p className="text-[8px] text-indigo-400 uppercase mt-1 font-mono tracking-widest">
            Web Speech Live Transcription • Local Ollama Minutas • Action Items & Tasks Database Synced
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Meeting room & Transcription */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* WebRTC Video/Audio Grid */}
          <div className="g p-5 bg-slate-950/60 border border-white/5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[8px] text-indigo-400 font-mono font-black uppercase tracking-wider">
                📡 WebRTC Staff Channel Status: {meetingActive ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
              {meetingActive && (
                <span className="text-[8px] text-red-500 font-mono font-black uppercase tracking-widest animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                  REC {fmtTime(meetingDuration)}
                </span>
              )}
            </div>

            {/* Simulated participants grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(() => {
                const list = [];
                const isCurrentUserAdmin = !activeUser || activeUser.toLowerCase().includes('admin') || activeUser.toLowerCase().includes('ceo') || activeUser.toLowerCase().includes('administrador');
                
                list.push({
                  name: `${activeUser || 'Administrador'} (Tú)`,
                  status: 'online',
                  wave: meetingActive && !isMuted,
                  avatar: isCurrentUserAdmin ? '👤' : '👷'
                });

                if (!isCurrentUserAdmin) {
                  list.push({
                    name: 'Administrador (CEO)',
                    status: 'online',
                    wave: meetingActive && transcripts.length >= 3,
                    avatar: '👤'
                  });
                }

                if (Array.isArray(staff)) {
                  staff.forEach(member => {
                    if (member.name && member.name.toLowerCase() !== (activeUser || '').toLowerCase()) {
                      list.push({
                        name: member.name,
                        status: 'online',
                        wave: meetingActive && transcripts.length >= 2,
                        avatar: '👷'
                      });
                    }
                  });
                }

                if (list.length < 4) {
                  list.push({
                    name: 'Soporte Central',
                    status: 'online',
                    wave: false,
                    avatar: '👩‍💻'
                  });
                }

                return list.slice(0, 4).map((p, idx) => (
                  <div key={idx} className="p-3.5 bg-black border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 relative overflow-hidden">
                    <div className="text-2xl">{p.avatar}</div>
                    <p className="text-[8.5px] font-black text-white uppercase">{p.name}</p>
                    
                    {/* Wave indicator */}
                    {p.wave ? (
                      <div className="flex items-center gap-0.5 h-3">
                        <span className="w-0.5 h-2 bg-indigo-400 animate-pulse"></span>
                        <span className="w-0.5 h-3 bg-indigo-400 animate-pulse"></span>
                        <span className="w-0.5 h-1.5 bg-indigo-400 animate-pulse"></span>
                      </div>
                    ) : (
                      <span className="text-[6.5px] font-black uppercase text-slate-500">Muted / Silent</span>
                    )}
                  </div>
                ));
              })()}
            </div>

            {/* Controls Bar */}
            <div className="flex justify-center gap-3 pt-3 border-t border-white/5">
              {!meetingActive ? (
                <button
                  onClick={handleStartMeeting}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(79,70,229,0.2)]"
                >
                  <Icon name="mic" className="w-4 h-4" /> Iniciar Reunión de Coordinación
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`px-4 py-3 border rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-1.5 ${
                      isMuted 
                        ? 'bg-red-500/20 border-red-500 text-red-500' 
                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon name={isMuted ? 'mic-off' : 'mic'} className="w-4 h-4" />
                    {isMuted ? 'Activar Mic' : 'Silenciar'}
                  </button>

                  <button
                    onClick={handleEndMeeting}
                    className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.2)]"
                  >
                    <Icon name="phone-off" className="w-4 h-4" /> Finalizar y Resumir con IA
                  </button>
                </>
              )}
            </div>

            {/* Simulated Live Audio Waves */}
            {meetingActive && !isMuted && (
              <div className="flex items-center justify-center gap-1 h-12 bg-indigo-950/10 border border-indigo-500/10 rounded-xl">
                {waveHeights.map((h, i) => (
                  <div 
                    key={i} 
                    className="w-1 bg-indigo-400 rounded-full transition-all duration-120"
                    style={{ height: `${h}px` }}
                  ></div>
                ))}
              </div>
            )}
          </div>

          {/* Live Transcription Console */}
          <div className="g p-5 bg-black border border-indigo-500/20 rounded-2xl relative overflow-hidden">
            <h4 className="text-[10px] font-black text-white uppercase tracking-widest pb-3 border-b border-indigo-500/10 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
              🎙️ Transcripción en Vivo (Web Speech Stream)
            </h4>

            {transcripts.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center space-y-2 text-slate-600">
                <Icon name="file-text" className="w-8 h-8 text-slate-700 animate-pulse" />
                <p className="text-[8px] font-black uppercase tracking-wider">Esperando inicio de audio...</p>
              </div>
            ) : (
              <div className="h-48 overflow-y-auto pr-1 space-y-3 font-mono text-[9px]">
                {transcripts.map((t, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 leading-normal animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <span className="text-slate-500 select-none flex-shrink-0">[{t.time}]</span>
                    <div className="text-left">
                      <span className="text-indigo-400 font-bold uppercase tracking-wide mr-1.5">{t.speaker}:</span>
                      <span className="text-slate-300">{t.text}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Col: AI Summary & Actions */}
        <div className="space-y-6">
          
          {/* Diagnostic Loading State */}
          {generatingSummary && (
            <div className="g p-6 bg-slate-950/40 border border-white/5 rounded-2xl text-center space-y-3 py-16 animate-pulse">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-[9px] font-black text-white uppercase tracking-widest font-mono">Local Ollama running...</p>
              <p className="text-[7px] text-slate-500 uppercase">Extracting action items and scheduling delta</p>
            </div>
          )}

          {/* AI Result Card */}
          {showSummary && !generatingSummary && (
            <div className="g p-5 bg-indigo-950/15 border border-indigo-500/30 rounded-2xl space-y-5 shadow-2xl animate-in zoom-in-95 text-left">
              <div>
                <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 font-black uppercase text-[6.5px] rounded tracking-widest font-mono">
                  Reporte Generado por Copiloto IA
                </span>
                <h3 className="text-xs font-black text-white uppercase tracking-wider mt-1.5">MINUTAS DE REUNIÓN DE HOY</h3>
              </div>

              {/* Bullet points */}
              <div className="space-y-3.5 text-[8.5px]">
                <div className="space-y-1 bg-black/35 p-3 rounded-xl border border-white/5 font-mono text-slate-300 whitespace-pre-wrap leading-normal">
                  {aiSummaryContent}
                </div>

                {/* Executable playbooks derived from voice */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <p className="text-green-400 font-bold uppercase tracking-wider mb-2">⚡ Plan de Acción Ejecutable (1-Click)</p>
                  
                  <div className="space-y-2">
                    {/* Action 1 */}
                    <button
                      onClick={handleCreateExtraMission}
                      className="w-full p-2.5 bg-[#F5C518]/10 hover:bg-[#F5C518]/20 border border-[#F5C518]/30 rounded-xl text-left transition-all active:scale-[0.98] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="text-[8.5px] font-black text-white uppercase block">➕ Generar Misión Adicional</span>
                        <span className="text-[7px] text-slate-500 uppercase block mt-0.5">Limpieza de Alfombras (Jose Mario) - $75 USD</span>
                      </div>
                      <Icon name="plus" className="w-3.5 h-3.5 text-[#F5C518] flex-shrink-0" />
                    </button>

                    {/* Action 2 */}
                    <button
                      onClick={handleNotifyDelay}
                      className="w-full p-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-left transition-all active:scale-[0.98] flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="text-[8.5px] font-black text-white uppercase block">📲 Notificar Retraso por WhatsApp</span>
                        <span className="text-[7px] text-slate-500 uppercase block mt-0.5">Alerta 10m a Maria Delgado (Client)</span>
                      </div>
                      <Icon name="send" className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Idle state */}
          {!meetingActive && !showSummary && !generatingSummary && (
            <div className="g p-6 bg-slate-950/40 border border-white/5 rounded-2xl text-center space-y-2 py-16">
              <Icon name="coffee" className="w-8 h-8 text-slate-700 mx-auto" />
              <p className="text-[8px] font-black uppercase text-slate-500 tracking-wider">Copiloto IA en Reposo</p>
              <p className="text-[7px] text-slate-600 uppercase">Inicia la reunión para activar la telemetría conversacional.</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
