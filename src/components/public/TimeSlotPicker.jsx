import React, { useState, useEffect } from 'react';
import { sb } from '../../supabase';
import { Calendar, Clock, Check, AlertTriangle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

export default function TimeSlotPicker({ 
  tenantId, 
  selectedDate, 
  selectedTime, 
  onChangeDate, 
  onChangeTime, 
  lang = 'es' 
}) {
  const [missions, setMissions] = useState([]);
  const [staffCount, setStaffCount] = useState(2);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState([]);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  // Time Slots Definition
  const SLOTS = [
    { time: '08:00', labelEn: '08:00 AM - 10:00 AM', labelEs: '08:00 AM - 10:00 AM' },
    { time: '10:00', labelEn: '10:00 AM - 12:00 PM', labelEs: '10:00 AM - 12:00 PM' },
    { time: '12:00', labelEn: '12:00 PM - 02:00 PM', labelEs: '12:00 PM - 02:00 PM' },
    { time: '14:00', labelEn: '02:00 PM - 04:00 PM', labelEs: '02:00 PM - 04:00 PM' },
    { time: '16:00', labelEn: '04:00 PM - 06:00 PM', labelEs: '04:00 PM - 06:00 PM' }
  ];

  // Generate next 14 days starting from today
  useEffect(() => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      
      const dayNum = d.getDay();
      const weekdayEs = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][dayNum];
      const weekdayEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayNum];
      
      list.push({
        dateStr,
        dayOfMonth: d.getDate(),
        monthLabelEs: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][d.getMonth()],
        monthLabelEn: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()],
        weekday: lang === 'es' ? weekdayEs : weekdayEn,
        isWeekend: dayNum === 0 || dayNum === 6
      });
    }
    setDays(list);

    // Auto-select first day if none selected
    if (!selectedDate && list.length > 0) {
      onChangeDate(list[0].dateStr);
    }
  }, [lang]);

  // Load tenant missions and staff count for availability calculations
  useEffect(() => {
    async function loadAvailabilityData() {
      if (!tenantId) return;
      setLoading(true);
      try {
        // Query missions in scheduled / in_progress state
        const { data: missionsData } = await sb
          .from('elevore_missions')
          .select('id, scheduled_date')
          .eq('tenant_id', tenantId)
          .in('status', ['scheduled', 'in_progress']);

        if (missionsData) {
          setMissions(missionsData);
        }

        // Query staff count
        const { data: staffData } = await sb
          .from('staff_profiles')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('role', 'staff');

        if (staffData && staffData.length > 0) {
          setStaffCount(staffData.length);
        }
      } catch (err) {
        console.warn('Error loading availability calendar logs:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAvailabilityData();
  }, [tenantId]);

  // Determine slot status for the currently selected date
  const getSlotStatus = (time) => {
    if (!selectedDate) return { status: 'available', bookedCount: 0 };
    
    // Count how many missions match the current date and time slot hour
    const dateMissions = missions.filter(m => {
      if (!m.scheduled_date) return false;
      // scheduled_date is YYYY-MM-DD or ISO string YYYY-MM-DDT10:00...
      const matchesDate = m.scheduled_date.startsWith(selectedDate);
      if (!matchesDate) return false;

      // Extract hour from scheduled_date
      let hour = '';
      if (m.scheduled_date.includes('T')) {
        hour = m.scheduled_date.split('T')[1].substring(0, 5); // HH:MM
      } else {
        // Fallback for simple date entries
        hour = '08:00';
      }
      
      // Match within the 2-hour window slot
      const mHour = parseInt(hour.split(':')[0]);
      const sHour = parseInt(time.split(':')[0]);
      return mHour >= sHour && mHour < sHour + 2;
    });

    const bookedCount = dateMissions.length;
    const capacity = Math.max(1, staffCount);

    if (bookedCount >= capacity) {
      return { status: 'full', bookedCount };
    } else if (bookedCount > 0) {
      return { status: 'limited', bookedCount };
    }
    return { status: 'available', bookedCount };
  };

  const handlePrevDayPage = () => {
    setActiveDayIndex(prev => Math.max(0, prev - 4));
  };

  const handleNextDayPage = () => {
    setActiveDayIndex(prev => Math.min(days.length - 4, prev + 4));
  };

  return (
    <div className="space-y-4 bg-slate-950/40 border border-white/5 p-4 rounded-2xl">
      {/* Date Carousel Header */}
      <div className="flex justify-between items-center border-b border-white/5 pb-3">
        <label className="text-[9px] font-black uppercase text-[#F5C518] tracking-widest flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {lang === 'es' ? '1. Elige una fecha' : '1. Select a Date'}
        </label>
        
        <div className="flex gap-1">
          <button 
            type="button" 
            onClick={() => setCalendarModalOpen(true)}
            className="px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all text-[7.5px] font-black uppercase text-slate-300 hover:text-white flex items-center gap-1 active:scale-95"
          >
            <Calendar className="w-3 h-3 text-[#F5C518]" />
            {lang === 'es' ? 'Calendario' : 'Calendar'}
          </button>
          <button 
            type="button" 
            onClick={handlePrevDayPage} 
            disabled={activeDayIndex === 0}
            className="p-1 hover:bg-white/5 rounded-lg disabled:opacity-30 transition-all text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            type="button" 
            onClick={handleNextDayPage} 
            disabled={activeDayIndex >= days.length - 4}
            className="p-1 hover:bg-white/5 rounded-lg disabled:opacity-30 transition-all text-slate-400 hover:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Days List */}
      <div className="grid grid-cols-4 gap-2">
        {days.slice(activeDayIndex, activeDayIndex + 4).map((d) => {
          const isSelected = selectedDate === d.dateStr;
          const monthLabel = lang === 'es' ? d.monthLabelEs : d.monthLabelEn;
          return (
            <button
              key={d.dateStr}
              type="button"
              onClick={() => onChangeDate(d.dateStr)}
              className={`p-3 rounded-xl flex flex-col items-center text-center transition-all cursor-pointer select-none border border-white/5 ${
                isSelected 
                  ? 'bg-[#F5C518]/10 border-[#F5C518] shadow-[0_0_15px_rgba(245,197,24,0.08)]' 
                  : 'bg-zinc-950/65 hover:bg-white/5'
              }`}
            >
              <span className={`text-[7px] font-black uppercase tracking-wider ${isSelected ? 'text-[#F5C518]' : 'text-slate-500'}`}>
                {d.weekday}
              </span>
              <span className="text-sm font-black text-white my-0.5">
                {d.dayOfMonth}
              </span>
              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">
                {monthLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Time Slots Header */}
      <div className="border-t border-white/5 pt-3">
        <label className="text-[9px] font-black uppercase text-[#F5C518] tracking-widest flex items-center gap-1.5 mb-3">
          <Clock className="w-3.5 h-3.5" />
          {lang === 'es' ? '2. Elige un bloque de horario' : '2. Select a Time Slot'}
        </label>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i} 
                className="w-full p-3 rounded-xl border border-white/5 bg-zinc-950/30 animate-pulse flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-zinc-900"></div>
                  <div className="h-3 w-28 bg-zinc-900 rounded"></div>
                </div>
                <div className="h-4.5 w-16 bg-zinc-900 rounded border border-white/5"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {SLOTS.map((s) => {
              const { status, bookedCount } = getSlotStatus(s.time);
              const isSelected = selectedTime === s.time;
              const slotLabel = lang === 'es' ? s.labelEs : s.labelEn;

              // Styles map
              let statusLabel = lang === 'es' ? 'Disponible' : 'Available';
              let statusColor = 'text-emerald-400 border-emerald-500/25';
              let statusDot = 'bg-emerald-500';
              let disabled = false;

              if (status === 'full') {
                statusLabel = lang === 'es' ? 'Completo' : 'Fully Booked';
                statusColor = 'text-red-400 border-red-500/25 opacity-40';
                statusDot = 'bg-red-500';
                disabled = true;
              } else if (status === 'limited') {
                statusLabel = lang === 'es' ? 'Pocos Cupos' : 'Limited Spots';
                statusColor = 'text-amber-400 border-amber-500/25';
                statusDot = 'bg-amber-500 animate-pulse';
              }

              return (
                <button
                  key={s.time}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChangeTime(s.time)}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    disabled 
                      ? 'bg-zinc-950/20 border-white/5 cursor-not-allowed' 
                      : isSelected 
                      ? 'bg-[#F5C518]/10 border-[#F5C518] shadow-[0_0_15px_rgba(245,197,24,0.06)]' 
                      : 'bg-zinc-950/65 border-white/5 hover:border-white/10 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] ${
                      isSelected ? 'bg-[#F5C518] text-black font-black' : 'bg-zinc-800'
                    }`}>
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </span>
                    <span className="text-[10px] font-black text-white tracking-wide uppercase">
                      {slotLabel}
                    </span>
                  </div>

                  <span className={`px-2 py-0.5 border rounded text-[7px] uppercase font-bold flex items-center gap-1 font-mono ${statusColor}`}>
                    <span className={`w-1 h-1 rounded-full ${statusDot}`}></span>
                    {statusLabel}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Monthly Calendar Modal */}
      {calendarModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-xs overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-black/40 flex justify-between items-center">
              <button 
                type="button"
                onClick={() => setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] font-black uppercase text-white tracking-widest font-mono">
                {currentMonthDate.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button 
                type="button"
                onClick={() => setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Grid */}
            <div className="p-4">
              <div className="grid grid-cols-7 gap-1 text-center text-[7.5px] font-black uppercase tracking-wider text-slate-500 mb-2 font-mono">
                {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((dayName, idx) => (
                  <div key={idx}>{dayName}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Blank days padding */}
                {Array.from({ length: new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1).getDay() }).map((_, idx) => (
                  <div key={`blank-${idx}`} className="p-2"></div>
                ))}

                {/* Days of month */}
                {Array.from({ length: new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0).getDate() }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dateStr = `${currentMonthDate.getFullYear()}-${String(currentMonthDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isSelected = selectedDate === dateStr;
                  const isPast = (() => {
                    const d = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), dayNum);
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    return d < today;
                  })();

                  return (
                    <button
                      key={`day-${dayNum}`}
                      type="button"
                      disabled={isPast}
                      onClick={() => {
                        onChangeDate(dateStr);
                        setCalendarModalOpen(false);
                      }}
                      className={`p-2 rounded-lg text-[9px] font-black font-mono transition-all select-none ${
                        isSelected 
                          ? 'bg-[#F5C518] text-black shadow-lg shadow-[#F5C518]/25 font-black scale-105' 
                          : isPast 
                          ? 'text-slate-700 cursor-not-allowed opacity-30'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 bg-black/20 border-t border-white/5 flex justify-end">
              <button 
                type="button"
                onClick={() => setCalendarModalOpen(false)}
                className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[8px] font-black uppercase border border-white/10 active:scale-95 transition-all"
              >
                {lang === 'es' ? 'Cerrar' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
