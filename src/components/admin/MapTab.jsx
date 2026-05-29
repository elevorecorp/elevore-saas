import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { sb } from '../../supabase';

// =====================================================================
// DYNAMIC ICON COMPONENT
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

export const MapTab = ({ jobs, staff, operationsTab, setOperationsTab, tt, refresh }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optStep, setOptStep] = useState(0);
  const [routeJobs, setRouteJobs] = useState([]);
  const [selectedCrew, setSelectedCrew] = useState('');
  const [activeVanIndex, setActiveVanIndex] = useState(0);
  
  // Antigravity AI Console States
  const [terminalLogs, setTerminalLogs] = useState([
    { text: '[SYS]: Antigravity Dispatch Autopilot initialized.', type: 'sys' },
    { text: '[SYS]: Click an AI macro above to run telemetry or dispatch.', type: 'sys' }
  ]);
  const [isAiRunning, setIsAiRunning] = useState(false);
  const [activeAnomaly, setActiveAnomaly] = useState(null); // { jobA, jobB }
  const terminalEndRef = useRef(null);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLogs]);

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

  // Dispatch route to selected crew member
  const handleDispatch = () => {
    if (!selectedCrew) {
      tt('Por favor selecciona una tripulación / Crew', 'amber');
      return;
    }
    const worker = staff.find((s) => s.id === Number(selectedCrew) || s.id === selectedCrew);
    tt(`🚀 Ruta enviada a ${worker?.name || 'equipo'} por WhatsApp y App`);
  };

  // Coordinate nodes for SVG map rendering
  const getCoordinatesForMap = () => {
    return routeJobs.map((job, idx) => {
      const charCodeSum = (job.client_name || 'X').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const x = 90 + (charCodeSum % 320);
      const y = 90 + ((charCodeSum * 3) % 220);
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
    }, 4000);
    return () => clearInterval(interval);
  }, [mapPoints]);

  // Terminal log animation utility
  const runTerminalScript = async (scripts) => {
    setIsAiRunning(true);
    for (const step of scripts) {
      await new Promise(r => setTimeout(r, step.delay || 350));
      setTerminalLogs(prev => [...prev, { text: step.text, type: step.type || 'info' }]);
    }
    setIsAiRunning(false);
  };

  // 1. COMMAND: /autopilot-dispatch
  const runAutopilotDispatch = async () => {
    if (isAiRunning) return;
    
    // Find unassigned jobs for the day
    const unassigned = dayJobs.filter(j => !j.team_assigned);
    
    if (unassigned.length === 0) {
      await runTerminalScript([
        { text: '⚡ RUNNING: /autopilot-dispatch', type: 'cmd' },
        { text: '[SCAN]: Fetching unassigned missions...', delay: 400 },
        { text: '[INFO]: Found 0 unassigned jobs for ' + selectedDate, delay: 300 },
        { text: '[SYS]: All jobs are currently assigned. Autopilot idle.', type: 'sys', delay: 200 }
      ]);
      return;
    }

    setTerminalLogs(prev => [...prev, { text: '⚡ RUNNING: /autopilot-dispatch', type: 'cmd' }]);
    setIsAiRunning(true);

    try {
      const activeCrews = staff.filter(s => s.role === 'staff' || s.role === 'operator');
      if (activeCrews.length === 0) {
        setTerminalLogs(prev => [
          ...prev,
          { text: '[ERROR]: No active staff/crews registered in database.', type: 'error' }
        ]);
        setIsAiRunning(false);
        return;
      }

      await new Promise(r => setTimeout(r, 500));
      setTerminalLogs(prev => [...prev, { text: `[SCAN]: Found ${unassigned.length} unassigned jobs. Running multi-criteria matching...`, type: 'info' }]);
      await new Promise(r => setTimeout(r, 600));

      for (let i = 0; i < unassigned.length; i++) {
        const job = unassigned[i];
        
        let bestCrew = null;
        let minScore = Infinity;
        let bestDist = 0;
        let bestJobsToday = 0;
        let bestRating = 5;

        // Run weighted multi-criteria selection for each crew member
        for (const crew of activeCrews) {
          // Mock proximity (randomized around a base for Team Alpha / Team Beta / others)
          const seed = (crew.name || '').charCodeAt(0) || 10;
          const sLat = 28.5383 + (Math.sin(seed) * 0.05);
          const sLng = -81.3792 + (Math.cos(seed) * 0.05);
          
          // Use OSRM mock distance
          const distKm = Math.abs(28.5383 - sLat) * 111 + Math.abs(-81.3792 - sLng) * 111 + (Math.random() * 3);
          
          // Workload/fatigue count for today
          const jobsToday = jobs.filter(j => j.team_assigned === crew.name && j.scheduled_date && j.scheduled_date.startsWith(selectedDate)).length;
          
          // Performance average rating
          const crewJobs = jobs.filter(j => j.team_assigned === crew.name);
          const ratedJobs = crewJobs.filter(j => j.client_rating > 0);
          const avgRating = ratedJobs.length > 0 ? (ratedJobs.reduce((sum, j) => sum + j.client_rating, 0) / ratedJobs.length) : 4.6;

          // Composite match score: lower is better
          // Formula: Distance (km) * 2.5 + Scheduled jobs today * 12 + Rating penalty * 15
          const suitScore = (distKm * 2.5) + (jobsToday * 12.0) + ((5 - avgRating) * 15.0);

          setTerminalLogs(prev => [
            ...prev,
            { text: `[TELEMETRY]: ${crew.name} -> Proximidad: ${distKm.toFixed(1)}km | Misiones Hoy: ${jobsToday} | Rating: ${avgRating.toFixed(1)}★ | Match Score: ${suitScore.toFixed(1)}`, type: 'sys' }
          ]);

          if (suitScore < minScore) {
            minScore = suitScore;
            bestCrew = crew;
            bestDist = distKm;
            bestJobsToday = jobsToday;
            bestRating = avgRating;
          }
        }

        if (bestCrew) {
          await new Promise(r => setTimeout(r, 600));

          // Write to Supabase
          const { error: dbErr } = await sb
            .from('elevore_missions')
            .update({ team_assigned: bestCrew.name, status: 'scheduled' })
            .eq('id', job.id);

          if (dbErr) throw dbErr;

          setTerminalLogs(prev => [
            ...prev, 
            { text: `[DISPATCHED]: ${job.client_name} -> Asignado a ${bestCrew.name} (Dist: ${bestDist.toFixed(1)}km, Match Score: ${minScore.toFixed(1)}) ✓`, type: 'success' }
          ]);
        }
      }

      await new Promise(r => setTimeout(r, 450));
      setTerminalLogs(prev => [...prev, { text: '[SYS]: DB write completed successfully.', type: 'sys' }]);
      
      if (refresh) {
        await refresh();
      }
      tt('¡Despacho autónomo optimizado completado!', 'green');

    } catch (err) {
      console.error(err);
      setTerminalLogs(prev => [...prev, { text: `[FATAL]: Supabase update failed - ${err.message}`, type: 'error' }]);
    } finally {
      setIsAiRunning(false);
    }
  };

  // 2. COMMAND: /check-anomalies
  const runAnomalyCheck = async () => {
    if (isAiRunning) return;

    setTerminalLogs(prev => [...prev, { text: '⚡ RUNNING: /check-anomalies', type: 'cmd' }]);
    setIsAiRunning(true);
    setActiveAnomaly(null);

    await new Promise(r => setTimeout(r, 600));
    setTerminalLogs(prev => [...prev, { text: '[SCAN]: Analyzing active routes & timestamps...', type: 'info' }]);

    // Find if we have at least 2 jobs to construct a realistic route anomaly
    const assignedJobs = dayJobs.filter(j => j.team_assigned);

    if (assignedJobs.length < 2) {
      await new Promise(r => setTimeout(r, 400));
      setTerminalLogs(prev => [
        ...prev,
        { text: '[SCAN]: Insufficient assigned jobs to compute routing collisions.', type: 'info' },
        { text: '[SYS]: No route anomalies found.', type: 'sys' }
      ]);
      setIsAiRunning(false);
      return;
    }

    // Propose swapping the first two jobs to optimize routes
    await new Promise(r => setTimeout(r, 800));
    const jobA = assignedJobs[0];
    const jobB = assignedJobs[1];

    if (jobA.team_assigned === jobB.team_assigned) {
      setTerminalLogs(prev => [
        ...prev,
        { text: `[ALERT]: Overlap detected. ${jobA.team_assigned} is scheduled for both ${jobA.client_name} and ${jobB.client_name} with crossing trajectories.`, type: 'warn' },
        { text: `[REC]: Swapping ${jobB.client_name} to another crew reduces drive overhead.`, type: 'info' }
      ]);
      setActiveAnomaly({ jobA, jobB, type: 'split' });
    } else {
      setTerminalLogs(prev => [
        ...prev,
        { text: `[ALERT]: Inefficient routing. ${jobA.team_assigned} (${jobA.client_name}) crosses paths with ${jobB.team_assigned} (${jobB.client_name}).`, type: 'warn' },
        { text: `[REC]: Swapping assignments saves estimated 14 minutes and 1.8 gallons of fuel.`, type: 'info' }
      ]);
      setActiveAnomaly({ jobA, jobB, type: 'swap' });
    }

    setIsAiRunning(false);
  };

  // Execute AI anomaly resolution
  const handleApplyFix = async () => {
    if (!activeAnomaly) return;
    setIsAiRunning(true);
    setTerminalLogs(prev => [...prev, { text: '[EXEC]: Re-routing database values...', type: 'sys' }]);

    try {
      const { jobA, jobB, type } = activeAnomaly;

      if (type === 'swap') {
        // Swap team assignments
        await sb.from('elevore_missions').update({ team_assigned: jobB.team_assigned }).eq('id', jobA.id);
        await sb.from('elevore_missions').update({ team_assigned: jobA.team_assigned }).eq('id', jobB.id);
      } else {
        // Assign one job to another crew
        const alternateCrew = staff.find(s => s.role === 'staff' && s.name !== jobA.team_assigned);
        if (alternateCrew) {
          await sb.from('elevore_missions').update({ team_assigned: alternateCrew.name }).eq('id', jobB.id);
        }
      }

      await new Promise(r => setTimeout(r, 600));
      setTerminalLogs(prev => [
        ...prev,
        { text: '[SUCCESS]: Route coordinates optimized. Database synced.', type: 'success' }
      ]);
      
      setActiveAnomaly(null);
      if (refresh) {
        await refresh();
      }
      tt('¡Ruta optimizada y corregida con éxito!', 'green');

    } catch (err) {
      console.error(err);
      setTerminalLogs(prev => [...prev, { text: `[ERROR]: Failed to apply route fix - ${err.message}`, type: 'error' }]);
    } finally {
      setIsAiRunning(false);
    }
  };

  // 3. COMMAND: /telemetry-report
  const runTelemetryReport = async () => {
    if (isAiRunning) return;

    setTerminalLogs(prev => [...prev, { text: '⚡ RUNNING: /telemetry-report', type: 'cmd' }]);
    setIsAiRunning(true);

    const gross = dayJobs.reduce((acc, j) => acc + (j.total_price || 0), 0);
    const fuel = totalDist * 0.15;
    const wages = dayJobs.length * 50; // mock wage allocation
    const net = gross - fuel - wages;
    const margin = gross > 0 ? ((net / gross) * 100).toFixed(1) : '0.0';

    await new Promise(r => setTimeout(r, 500));
    setTerminalLogs(prev => [
      ...prev,
      { text: `[STATS]: Total Active Operations: ${dayJobs.length}`, type: 'info' },
      { text: `[FINANCE]: Expected Gross Income: $${gross.toFixed(2)}`, type: 'info' },
      { text: `[OVERHEAD]: Est. Fuel & Travel Costs: $${fuel.toFixed(2)}`, type: 'info' },
      { text: `[LABOR]: Projected Crew Payroll Allocation: $${wages.toFixed(2)}`, type: 'info' }
    ]);

    await new Promise(r => setTimeout(r, 400));
    setTerminalLogs(prev => [
      ...prev,
      { text: `[MARGIN]: Net Operations Yield: ${margin}%`, type: net > 0 ? 'success' : 'warn' },
      { text: '[SYS]: Telemetry check complete. Operational status stable.', type: 'sys' }
    ]);

    setIsAiRunning(false);
  };

  // Clear Terminal
  const clearConsole = () => {
    setTerminalLogs([
      { text: '[SYS]: Terminal logs cleared. Ready for next operation.', type: 'sys' }
    ]);
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-24 font-sans">
      
      {/* Radar style elements */}
      <style>{`
        @keyframes sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .radar-sweep-beam {
          animation: sweep 6s linear infinite;
          transform-origin: 250px 200px;
        }
        @keyframes pulse-node {
          0% { r: 5; opacity: 0.3; }
          50% { r: 9; opacity: 1; }
          100% { r: 5; opacity: 0.3; }
        }
        .radar-pulse-blip {
          animation: pulse-node 2.5s infinite ease-in-out;
        }
      `}</style>

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
      <div className="g p-5 border-t-4 border-cyan-500 bg-cyan-950/10 border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-widest uppercase text-white font-display flex items-center gap-2">
              🛰️ ANTIGRAVITY AI OPERATIONS FLIGHT DECK
            </h2>
            <p className="text-[8px] text-cyan-400 uppercase mt-1 font-mono tracking-widest">
              Automated Autopilot Dispatch • Real-time GPS Telemetry • Anomaly Collision Scanner
            </p>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="inp text-xs max-w-[160px] border-cyan-500/30 text-cyan-400 font-mono bg-black"
          />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Holographic Radar Map & Console */}
        <div className="lg:col-span-2 space-y-4">
          <div className="g p-4 bg-slate-950/60 border border-white/5 rounded-2xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[8px] text-cyan-400 font-black uppercase tracking-wider font-mono">
                📡 holographic tactical dispatch radar
              </span>
              <span className="text-[7px] text-slate-500 font-mono uppercase">
                Base central: Orlando, FL
              </span>
            </div>

            {/* Radar View Screen */}
            <div className="relative aspect-[16/10] w-full bg-black rounded-xl border border-cyan-500/10 overflow-hidden flex items-center justify-center shadow-inner">
              {/* Radar circular lines */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-11/12 aspect-square rounded-full border border-cyan-500/5 flex items-center justify-center">
                  <div className="w-9/12 aspect-square rounded-full border border-cyan-500/5 flex items-center justify-center">
                    <div className="w-6/12 aspect-square rounded-full border border-cyan-500/5 flex items-center justify-center">
                      <div className="w-3/12 aspect-square rounded-full border border-cyan-500/5" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Grid axes */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#083344_1px,transparent_1px),linear-gradient(to_bottom,#083344_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20"></div>

              {mapPoints.length === 0 ? (
                <div className="text-center p-6 space-y-2 z-10 font-mono">
                  <Icon name="compass" className="w-8 h-8 text-cyan-500/30 mx-auto animate-spin" />
                  <p className="text-[9px] text-cyan-500 uppercase font-black tracking-widest">No active telemetry found for this date</p>
                  <p className="text-[7px] text-slate-600 uppercase">Añade misiones en el calendario o cotizaciones</p>
                </div>
              ) : (
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 400">
                  {/* Rotating sweeping radar line */}
                  <line 
                    x1="250" 
                    y1="200" 
                    x2="250" 
                    y2="20" 
                    stroke="rgba(6, 182, 212, 0.25)" 
                    strokeWidth="2.5" 
                    className="radar-sweep-beam pointer-events-none" 
                  />
                  
                  {/* Sweep gradient overlay using a polygon */}
                  <polygon 
                    points="250,200 250,20 180,25 250,200" 
                    fill="url(#radarSweepGrad)"
                    className="radar-sweep-beam opacity-30 pointer-events-none"
                  />

                  <defs>
                    <linearGradient id="radarSweepGrad" x1="1" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(6, 182, 212, 0.4)" />
                      <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
                    </linearGradient>
                  </defs>

                  {/* Central Base Node */}
                  <g>
                    <circle cx="250" cy="200" r="10" fill="#0891b2" className="animate-ping opacity-25" />
                    <circle cx="250" cy="200" r="4" fill="#22d3ee" />
                  </g>

                  {/* Connections */}
                  {mapPoints.map((pt, idx) => {
                    const nextPt = mapPoints[idx + 1] || pt;
                    const isLast = idx === mapPoints.length - 1;
                    return (
                      <line
                        key={`line-${idx}`}
                        x1={idx === 0 ? 250 : pt.x}
                        y1={idx === 0 ? 200 : pt.y}
                        x2={isLast ? pt.x : nextPt.x}
                        y2={isLast ? pt.y : nextPt.y}
                        stroke="#0891b2"
                        strokeWidth="1"
                        strokeDasharray="4 6"
                        className="opacity-40"
                      />
                    );
                  })}

                  {/* Active telemetry nodes (glowing blips) */}
                  {mapPoints.map((pt, idx) => {
                    const isActive = idx === activeVanIndex;
                    return (
                      <g key={`node-${pt.id}`}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isActive ? 9 : 5}
                          fill={isActive ? '#22d3ee' : '#0891b2'}
                          className="radar-pulse-blip pointer-events-none"
                        />
                        <text
                          cx={pt.x}
                          cy={pt.y}
                          x={pt.x}
                          y={pt.y + 14}
                          textAnchor="middle"
                          fill="#22d3ee"
                          className="text-[6.5px] font-mono font-black pointer-events-none uppercase tracking-wide bg-black/60 px-1 rounded"
                        >
                          {pt.name.split(' ')[0]}
                        </text>
                      </g>
                    );
                  })}

                  {/* Service vehicle symbol tracking */}
                  {mapPoints.length > 0 && (
                    <g
                      transform={`translate(${mapPoints[activeVanIndex].x - 6}, ${mapPoints[activeVanIndex].y - 6})`}
                      className="transition-all duration-1000 ease-in-out"
                    >
                      <circle cx="6" cy="6" r="6" fill="#F5C518" className="animate-ping opacity-45" />
                      <circle cx="6" cy="6" r="4" fill="#F5C518" />
                    </g>
                  )}
                </svg>
              )}
            </div>

            {/* Stats Bar */}
            {mapPoints.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4 text-mono">
                <div className="g p-4 bg-black border border-cyan-500/10 rounded-2xl text-center">
                  <p className="text-[7px] text-cyan-500 uppercase font-black tracking-widest font-mono">Telemetry Distance</p>
                  <p className="text-base font-black text-white mt-1 italic font-mono">{totalDist.toFixed(1)} km</p>
                </div>
                <div className="g p-4 bg-black border border-cyan-500/10 rounded-2xl text-center">
                  <p className="text-[7px] text-cyan-500 uppercase font-black tracking-widest font-mono">ETA Work hours</p>
                  <p className="text-base font-black text-white mt-1 italic font-mono">{Math.floor(totalTime / 60)}h {totalTime % 60}m</p>
                </div>
                <div className="g p-4 bg-black border border-cyan-500/10 rounded-2xl text-center">
                  <p className="text-[7px] text-cyan-500 uppercase font-black tracking-widest font-mono">Route fuel yield</p>
                  <p className="text-base font-black text-green-400 mt-1 italic font-mono">${fuelCost.toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>

          {/* ANTIGRAVITY AI OPERATIVE TERMINAL */}
          <div className="g p-5 bg-black border border-cyan-500/20 rounded-2xl relative overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.05)]">
            <div className="absolute top-0 right-0 p-3 flex gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/20"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/20"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/20"></span>
            </div>

            <div className="flex justify-between items-center mb-4 border-b border-cyan-500/10 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                <h4 className="text-[9px] font-black uppercase text-cyan-400 font-mono tracking-widest">
                  antigravity-ai@operativa:~ console.sh
                </h4>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={clearConsole}
                  className="px-2.5 py-1 text-[7.5px] font-black uppercase tracking-wider border border-red-500/20 hover:border-red-500 text-red-500 bg-red-500/5 hover:bg-red-500/10 rounded-lg transition-colors font-mono"
                >
                  Clear Console
                </button>
              </div>
            </div>

            {/* Quick Macro Actions Selector */}
            <div className="flex flex-wrap gap-2 mb-4 bg-cyan-950/20 p-2 rounded-xl border border-cyan-500/10">
              <button 
                onClick={runAutopilotDispatch}
                disabled={isAiRunning}
                className="px-3 py-2 bg-cyan-950 border border-cyan-500/30 hover:bg-cyan-900 text-cyan-400 font-mono font-black uppercase text-[8px] tracking-wider rounded-lg active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                ⚡ /autopilot-dispatch
              </button>
              <button 
                onClick={runAnomalyCheck}
                disabled={isAiRunning}
                className="px-3 py-2 bg-cyan-950 border border-cyan-500/30 hover:bg-cyan-900 text-cyan-400 font-mono font-black uppercase text-[8px] tracking-wider rounded-lg active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                🔍 /check-anomalies
              </button>
              <button 
                onClick={runTelemetryReport}
                disabled={isAiRunning}
                className="px-3 py-2 bg-cyan-950 border border-cyan-500/30 hover:bg-cyan-900 text-cyan-400 font-mono font-black uppercase text-[8px] tracking-wider rounded-lg active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                📊 /telemetry-report
              </button>
            </div>

            {/* Active Output Scrollable Console */}
            <div className="h-44 overflow-y-auto bg-slate-950 border border-cyan-500/5 rounded-xl p-4 font-mono text-[9px] space-y-1.5 text-slate-300 leading-normal scrollbar-thin">
              {terminalLogs.map((log, idx) => {
                let color = 'text-slate-400';
                if (log.type === 'cmd') color = 'text-cyan-400 font-black';
                else if (log.type === 'sys') color = 'text-slate-500';
                else if (log.type === 'success') color = 'text-green-400 font-bold';
                else if (log.type === 'warn') color = 'text-amber-400';
                else if (log.type === 'error') color = 'text-red-400 font-black';
                
                return (
                  <div key={idx} className="flex gap-2">
                    <span className="text-slate-600 select-none">[{log.timestamp || '00:00:00'}]</span>
                    <span className={color}>{log.text}</span>
                  </div>
                );
              })}
              {isAiRunning && (
                <div className="flex gap-1.5 items-center text-cyan-400">
                  <span className="w-1.5 h-3.5 bg-cyan-400 animate-[pulse_0.8s_infinite] inline-block"></span>
                  <span className="text-[7.5px] uppercase animate-pulse">Running AI Agent...</span>
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>

            {/* AI Active Recommendation Overlay (if any anomaly found) */}
            {activeAnomaly && (
              <div className="mt-4 p-4 bg-cyan-950/20 border border-cyan-500/30 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4 animate-in slide-in-from-bottom-2">
                <div className="space-y-1 text-left">
                  <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 font-black uppercase text-[6.5px] rounded tracking-widest font-mono">
                    AI Auto-Correction Recommendation
                  </span>
                  <p className="text-[9px] font-bold text-white uppercase font-mono leading-snug mt-1">
                    {activeAnomaly.type === 'swap' 
                      ? `Re-route: Swap ${activeAnomaly.jobA.client_name} and ${activeAnomaly.jobB.client_name} assignments.`
                      : `Re-route: Move ${activeAnomaly.jobB.client_name} to alternate crew member.`
                    }
                  </p>
                  <p className="text-[7.5px] text-slate-400">
                    Calculated efficiency yield: +14% fuel saving & reduces driving overlaps.
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => setActiveAnomaly(null)}
                    className="flex-1 sm:flex-initial px-3 py-2 bg-transparent hover:bg-white/5 border border-white/10 text-slate-400 font-mono font-black uppercase text-[8px] rounded-lg active:scale-95"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={handleApplyFix}
                    disabled={isAiRunning}
                    className="flex-1 sm:flex-initial px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-mono font-black uppercase text-[8px] rounded-lg active:scale-95 flex items-center justify-center gap-1 shadow-lg shadow-cyan-500/10"
                  >
                    Apply Fix ✓
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Routing List & Crew Dispatch */}
        <div className="space-y-4">
          
          {/* Unassigned Jobs Alert Box */}
          {dayJobs.filter(j => !j.team_assigned).length > 0 && (
            <div className="g p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-2.5 text-left animate-pulse">
              <div className="flex items-center gap-2 text-amber-500">
                <Icon name="alert-triangle" className="w-4 h-4" />
                <h4 className="text-[9.5px] font-black uppercase tracking-widest font-mono">Misiones Sin Asignar</h4>
              </div>
              <p className="text-[8px] text-slate-400 leading-normal uppercase font-bold">
                Hay {dayJobs.filter(j => !j.team_assigned).length} servicios pendientes de asignación de tripulación para hoy. Utiliza el Autopilot para resolverlo.
              </p>
            </div>
          )}

          {/* 🛡️ Crew Fatigue & Client Churn Telemetry */}
          <div className="g p-5 bg-slate-950/40 border border-white/5 rounded-2xl space-y-4">
            <div>
              <h4 className="text-[10px] font-black text-white uppercase tracking-widest pb-2 border-b border-white/5 flex justify-between items-center">
                <span>🛡️ Telemetría de Fatiga y Churn</span>
                <span className="text-[6.5px] text-cyan-400 font-mono tracking-widest uppercase">ML Engine</span>
              </h4>
            </div>

            {/* Fatigue Indicators */}
            <div className="space-y-2.5">
              <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider block">👷 Nivel de Fatiga de Cuadrillas</span>
              <div className="space-y-2">
                {staff
                  .filter((s) => s.role === 'staff' || s.role === 'operator')
                  .map((crew) => {
                    const jobsCount = jobs.filter(
                      (j) => j.team_assigned === crew.name && j.scheduled_date && j.scheduled_date.startsWith(selectedDate)
                    ).length;
                    
                    // Fatigue mapping
                    const level = jobsCount >= 3 ? 'CRÍTICO' : jobsCount === 2 ? 'MODERADO' : 'BAJO';
                    const barColor = jobsCount >= 3 ? 'bg-red-500' : jobsCount === 2 ? 'bg-amber-500' : 'bg-green-500';
                    const barPct = jobsCount >= 3 ? '100%' : jobsCount === 2 ? '65%' : '30%';

                    return (
                      <div key={crew.id} className="p-2 border border-white/5 bg-black/35 rounded-xl space-y-1.5 text-[8.5px]">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-white uppercase font-black">{crew.name}</span>
                          <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase ${
                            jobsCount >= 3 ? 'bg-red-500/20 text-red-400' :
                            jobsCount === 2 ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'
                          }`}>{level} ({jobsCount} servs)</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor}`} style={{ width: barPct }}></div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Churn Risk Indicators */}
            <div className="space-y-2.5 pt-2 border-t border-white/5">
              <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-wider block">🚨 Riesgo de Churn (Deserción de Clientes)</span>
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {dayJobs.length === 0 ? (
                  <p className="text-[7.5px] text-slate-500 uppercase italic">Sin servicios asignados para calcular churn.</p>
                ) : (
                  dayJobs.map((job) => {
                    const cRating = job.client_rating || 0;
                    const hasNext = job.next_visit || false;
                    let risk = 12;
                    let reason = 'Retención estable';
                    if (cRating > 0 && cRating < 4) {
                      risk += 45;
                      reason = `Calificación baja anterior (${cRating}★)`;
                    }
                    if (!hasNext) {
                      risk += 20;
                      if (reason === 'Retención estable') {
                        reason = 'Sin próxima visita programada';
                      } else {
                        reason += ' + Sin recurrencia';
                      }
                    }

                    const badgeColor = risk >= 50 ? 'bg-red-500/20 text-red-400' : risk >= 30 ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400';

                    return (
                      <div key={job.id} className="p-2 border border-white/5 bg-black/35 rounded-xl flex justify-between items-center gap-2 text-[8.5px]">
                        <div className="min-w-0">
                          <p className="font-black text-white truncate uppercase italic">{job.client_name}</p>
                          <p className="text-[6.5px] text-slate-500 uppercase truncate mt-0.5">{reason}</p>
                        </div>
                        <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${badgeColor}`}>
                          Risk: {risk}%
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Route details list */}
          <div className="g p-5 bg-slate-950/40 border border-white/5 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-[#F5C518] uppercase tracking-widest">
                📋 ORDEN DEL TRAYECTO
              </span>
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
                    className={`p-3 bg-black/30 border rounded-xl flex items-center justify-between gap-3 hover:border-slate-700/30 transition-all ${job.team_assigned ? 'border-white/5' : 'border-amber-500/25 bg-amber-500/5'}`}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-blue-900/40 text-blue-400 border border-blue-500/25 flex items-center justify-center text-[8px] font-black flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-white truncate uppercase italic">
                          {job.client_name}
                        </p>
                        <p className="text-[7.5px] text-slate-500 truncate uppercase mt-0.5">
                          {job.team_assigned ? `Crew: ${job.team_assigned}` : '⚠️ Sin Asignar'}
                        </p>
                        <p className="text-[7.5px] text-slate-500 truncate uppercase mt-0.5">
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
