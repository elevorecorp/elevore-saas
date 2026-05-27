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

export const MapTab = ({ jobs, staff, operationsTab, setOperationsTab, tt }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optStep, setOptStep] = useState(0);
  const [routeJobs, setRouteJobs] = useState([]);
  const [selectedCrew, setSelectedCrew] = useState('');
  const [activeVanIndex, setActiveVanIndex] = useState(0);

  // Filter jobs scheduled for selected date
  const dayJobs = jobs.filter(
    (j) => j.scheduled_date && j.scheduled_date.startsWith(selectedDate)
  );

  // Initialize route layout
  useEffect(() => {
    setRouteJobs(dayJobs);
  }, [selectedDate, jobs]);

  // Handle reordering up/down
  const moveJob = (index, direction) => {
    const updated = [...routeJobs];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= updated.length) return;
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setRouteJobs(updated);
    tt('Ruta modificada manualmente');
  };

  // Mock optimizer algorithm stages
  const runOptimizer = () => {
    if (dayJobs.length < 2) {
      tt('Se necesitan al menos 2 misiones para optimizar la ruta', 'amber');
      return;
    }
    setIsOptimizing(true);
    setOptStep(1);

    setTimeout(() => {
      setOptStep(2);
      setTimeout(() => {
        setOptStep(3);
        setTimeout(() => {
          // Perform a mock distance sort to simulate nearest-neighbor routing
          const sorted = [...dayJobs].sort((a, b) => {
            const sumA = (a.client_name || '').length;
            const sumB = (b.client_name || '').length;
            return sumA - sumB; // mock criteria
          });
          setRouteJobs(sorted);
          setIsOptimizing(false);
          setOptStep(0);
          tt('✨ ¡Ruta optimizada con Inteligencia Artificial!', 'green');
        }, 1200);
      }, 1000);
    }, 800);
  };

  // Dispatch route to selected crew member
  const handleDispatch = () => {
    if (!selectedCrew) {
      tt('Por favor selecciona una tripulación / Crew', 'amber');
      return;
    }
    const worker = staff.find((s) => s.id === Number(selectedCrew));
    tt(`🚀 Ruta enviada a ${worker?.name || 'equipo'} por WhatsApp y App`);
  };

  // Coordinate nodes for SVG map rendering
  const getCoordinatesForMap = () => {
    // Generate static spread of positions based on jobId
    return routeJobs.map((job, idx) => {
      const charCodeSum = (job.client_name || 'X').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const x = 80 + (charCodeSum % 340);
      const y = 80 + ((charCodeSum * 3) % 240);
      return { id: job.id, name: job.client_name, address: job.address, x, y };
    });
  };

  const mapPoints = getCoordinatesForMap();
  
  // Calculate total stats
  const totalJobs = routeJobs.length;
  const totalDist = totalJobs * 12.4 + (totalJobs > 0 ? 5.2 : 0); // km mock
  const totalTime = totalJobs * 24 + (totalJobs > 0 ? 15 : 0); // minutes mock
  const fuelCost = totalDist * 0.15; // mock cost

  // Animate van path
  useEffect(() => {
    if (mapPoints.length === 0) return;
    const interval = setInterval(() => {
      setActiveVanIndex((prev) => (prev + 1) % mapPoints.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [mapPoints]);

  return (
    <div className="space-y-6 animate-in fade-in pb-24">
      {/* Switcher Header */}
      <div className="flex gap-2 bg-black/45 p-1.5 rounded-2xl border border-white/5 overflow-x-auto nsb">
        {[
          { id: 'calendar', name: '📅 Calendario de Misiones' },
          { id: 'reminders', name: '🔔 Recordatorios' },
          { id: 'drive', name: '📸 Photo Drive' },
          { id: 'map', name: '🗺️ IA Dispatcher' },
          { id: 'deploy', name: '📝 Nueva Cotización' },
        ].map((tab) => (
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

      {/* Hero Banner */}
      <div className="g p-5 border-t-4 border-blue-500 bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-widest uppercase text-white font-display flex items-center gap-2">
              🗺️ PLANIFICADOR DE RUTAS & IA DISPATCHER
            </h2>
            <p className="text-[8px] text-slate-500 uppercase mt-1">
              Optimización GPS de trayectos • Asignación inteligente a tripulaciones
            </p>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="inp text-xs max-w-[160px]"
          />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left/Middle Column: Interactive SVG Map */}
        <div className="lg:col-span-2 space-y-4">
          <div className="g p-4 bg-slate-950/60 border border-white/5 rounded-2xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[8px] text-blue-400 font-black uppercase tracking-wider">
                🛰️ radar de operaciones gps en tiempo real
              </span>
              <span className="text-[7px] text-slate-500 font-bold uppercase">
                Base central: Orlando, FL
              </span>
            </div>

            {/* SVG Visual Map */}
            <div className="relative aspect-[16/10] w-full bg-slate-950 rounded-xl border border-white/5 overflow-hidden flex items-center justify-center">
              {/* Map grid lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40"></div>

              {mapPoints.length === 0 ? (
                <div className="text-center p-6 space-y-2 z-10">
                  <Icon name="navigation-off" className="w-8 h-8 text-slate-600 mx-auto animate-pulse" />
                  <p className="text-[10px] text-slate-400 uppercase font-black">No hay misiones programadas para este día</p>
                  <p className="text-[7px] text-slate-600 uppercase">Cambia la fecha o agrega cotizaciones</p>
                </div>
              ) : (
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 400">
                  {/* Base Station Node */}
                  <g>
                    <circle cx="50" cy="50" r="8" fill="#F5C518" className="animate-ping opacity-40" />
                    <circle cx="50" cy="50" r="5" fill="#F5C518" />
                    <text x="62" y="53" fill="#F5C518" className="text-[8px] font-black uppercase tracking-widest">BASE</text>
                  </g>

                  {/* Route Paths connecting nodes */}
                  {mapPoints.map((pt, idx) => {
                    const nextPt = mapPoints[idx + 1] || pt; // Loop or end at last
                    const isLast = idx === mapPoints.length - 1;
                    return (
                      <line
                        key={`line-${idx}`}
                        x1={idx === 0 ? 50 : pt.x}
                        y1={idx === 0 ? 50 : pt.y}
                        x2={isLast ? pt.x : nextPt.x}
                        y2={isLast ? pt.y : nextPt.y}
                        stroke="#3b82f6"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                        className="animate-[dash_2s_linear_infinite]"
                      />
                    );
                  })}

                  {/* Nodes */}
                  {mapPoints.map((pt, idx) => {
                    const isActive = idx === activeVanIndex;
                    return (
                      <g key={`node-${pt.id}`}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isActive ? 10 : 7}
                          fill={isActive ? '#3b82f6' : '#1e293b'}
                          stroke={isActive ? '#60a5fa' : '#334155'}
                          strokeWidth="2"
                          className="transition-all duration-300"
                        />
                        <text
                          cx={pt.x}
                          cy={pt.y}
                          x={pt.x}
                          y={pt.y + 4}
                          textAnchor="middle"
                          fill="white"
                          className="text-[8px] font-black pointer-events-none"
                        >
                          {idx + 1}
                        </text>
                        <text
                          x={pt.x}
                          y={pt.y - 12}
                          textAnchor="middle"
                          fill="#94a3b8"
                          className="text-[6.5px] font-bold uppercase tracking-wider pointer-events-none"
                        >
                          {pt.name.split(' ')[0]}
                        </text>
                      </g>
                    );
                  })}

                  {/* Animated Service Van icon moving along nodes */}
                  {mapPoints.length > 0 && (
                    <g
                      transform={`translate(${mapPoints[activeVanIndex].x - 10}, ${mapPoints[activeVanIndex].y - 25})`}
                      className="transition-all duration-1000 ease-in-out"
                    >
                      <rect width="20" height="12" rx="3" fill="#60a5fa" className="shadow-lg" />
                      <circle cx="5" cy="12" r="2" fill="white" />
                      <circle cx="15" cy="12" r="2" fill="white" />
                      <polygon points="12,3 18,3 18,7 12,7" fill="#0f172a" />
                      <text x="3" y="9" fill="white" className="text-[5.5px] font-black">E</text>
                    </g>
                  )}
                </svg>
              )}
            </div>

            {/* Multi-stage Optimization Overlay */}
            {isOptimizing && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 z-40">
                <div className="text-center space-y-4 max-w-sm">
                  <Icon name="loader-2" className="w-10 h-10 text-[#F5C518] animate-spin mx-auto" />
                  <div>
                    <h4 className="text-xs font-black uppercase text-white tracking-widest">
                      ⚙️ CALCULANDO RUTA ÓPTIMA
                    </h4>
                    <p className="text-[7.5px] text-[#F5C518] font-bold uppercase tracking-wider mt-1">
                      {optStep === 1 && '1. Agrupando por códigos postales y distancias...'}
                      {optStep === 2 && '2. Calculando matriz de tiempos de tráfico real...'}
                      {optStep === 3 && '3. Minimizando consumo de combustible y tiempos...'}
                    </p>
                  </div>
                  <div className="pb w-full bg-white/5"><div className="pf bg-[#F5C518]" style={{ width: `${(optStep / 3) * 100}%` }}></div></div>
                </div>
              </div>
            )}
          </div>

          {/* Stats Bar */}
          {mapPoints.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <div className="g p-4 bg-black/40 border border-white/5 rounded-2xl text-center">
                <p className="text-[7px] text-slate-500 uppercase font-black">Distancia Total</p>
                <p className="text-lg font-black text-white mt-1 italic">{totalDist.toFixed(1)} km</p>
              </div>
              <div className="g p-4 bg-black/40 border border-white/5 rounded-2xl text-center">
                <p className="text-[7px] text-slate-500 uppercase font-black">Tiempo de Viaje</p>
                <p className="text-lg font-black text-white mt-1 italic">{Math.floor(totalTime / 60)}h {totalTime % 60}m</p>
              </div>
              <div className="g p-4 bg-black/40 border border-white/5 rounded-2xl text-center">
                <p className="text-[7px] text-slate-500 uppercase font-black">Gasto de Gasolina</p>
                <p className="text-lg font-black text-green-400 mt-1 italic">${fuelCost.toFixed(2)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Routing List & Crew Dispatch */}
        <div className="space-y-4">
          <div className="g p-5 bg-slate-950/40 border border-white/5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-[#F5C518] uppercase tracking-widest">
                📋 ORDEN DEL TRAYECTO
              </span>
              {dayJobs.length >= 2 && (
                <button
                  onClick={runOptimizer}
                  disabled={isOptimizing}
                  className="px-2.5 py-1.5 bg-[#F5C518] hover:bg-amber-400 text-black text-[7.5px] font-black uppercase rounded-lg active:scale-95 transition-all"
                >
                  ⚡ Optimizar con IA
                </button>
              )}
            </div>

            {dayJobs.length === 0 ? (
              <p className="text-[8px] text-slate-500 uppercase italic py-4 text-center">
                No hay misiones programadas.
              </p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {routeJobs.map((job, idx) => (
                  <div
                    key={job.id}
                    className="p-3 bg-black/30 border border-white/5 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700/30 transition-all"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded bg-blue-900/40 text-blue-400 border border-blue-500/25 flex items-center justify-center text-[8px] font-black flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-white truncate uppercase italic">
                          {job.client_name}
                        </p>
                        <p className="text-[7.5px] text-slate-500 truncate uppercase">
                          {job.address}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => moveJob(idx, -1)}
                        disabled={idx === 0}
                        className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 disabled:opacity-30"
                      >
                        <Icon name="arrow-up" className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => moveJob(idx, 1)}
                        disabled={idx === routeJobs.length - 1}
                        className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 disabled:opacity-30"
                      >
                        <Icon name="arrow-down" className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Crew Assign and Dispatch */}
            {dayJobs.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-white/5">
                <div>
                  <label className="text-[7px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                    Seleccionar Tripulación / Crew
                  </label>
                  <select
                    className="inp text-xs"
                    value={selectedCrew}
                    onChange={(e) => setSelectedCrew(e.target.value)}
                  >
                    <option value="">-- Elige Operario --</option>
                    {staff
                      .filter((s) => s.role === 'staff' || s.role === 'operator')
                      .map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.role})
                        </option>
                      ))}
                  </select>
                </div>

                <button
                  onClick={handleDispatch}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-[0_0_20px_rgba(59,130,246,0.15)] flex items-center justify-center gap-1.5"
                >
                  <Icon name="send" className="w-3.5 h-3.5" /> Despachar Ruta 🚀
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
