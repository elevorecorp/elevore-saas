import React from 'react';
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

export const RemindersTab = ({
  reminders,
  setReminders,
  newRem,
  setNewRem,
  jobs,
  remindersBadgeCount,
  operationsTab,
  setOperationsTab,
  tt,
}) => {
  const saveRem = (updated) => {
    setReminders(updated);
    localStorage.setItem('elevore_reminders', JSON.stringify(updated));
  };

  const addReminder = () => {
    if (!newRem.title.trim()) return;
    saveRem([...reminders, { ...newRem, id: Date.now(), done: false }]);
    setNewRem({ title: '', date: '', time: '', type: 'followup', jobId: '' });
    tt('Reminder saved ✓');
  };

  const toggleDone = (id) =>
    saveRem(reminders.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));

  const deleteRem = (id) => saveRem(reminders.filter((r) => r.id !== id));

  const upcoming = reminders
    .filter((r) => !r.done)
    .sort(
      (a, b) =>
        new Date(a.date + 'T' + (a.time || '00:00')) -
        new Date(b.date + 'T' + (b.time || '00:00'))
    );
  const done = reminders.filter((r) => r.done);

  // Auto-generated reminders from jobs
  const autoRem = jobs
    .filter((j) => j.scheduled_date && j.status === 'scheduled')
    .map((j) => {
      const d = new Date(j.scheduled_date);
      d.setDate(d.getDate() - 1);
      return {
        id: 'auto_' + j.id,
        title: `📅 Recordar a ${j.client_name} — servicio mañana`,
        date: d.toISOString().split('T')[0],
        type: 'auto',
        phone: j.client_phone,
        job: j,
        auto: true,
      };
    });

  const typeColors = {
    followup: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    payment: 'text-green-400 bg-green-500/10 border-green-500/20',
    review: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    call: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    auto: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };

  return (
    <div className="space-y-5 animate-in fade-in pb-24">
      {/* Operations Sub-tabs Switcher */}
      <div className="flex gap-2 bg-black/45 p-1.5 rounded-2xl border border-white/5 overflow-x-auto nsb">
        {[
          { id: 'calendar', name: '📅 Calendario de Misiones' },
          { id: 'reminders', name: `🔔 Recordatorios (${remindersBadgeCount})` },
          { id: 'drive', name: '📸 Photo Drive' },
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

      <div className="g p-5 border-t-4 border-amber-500 bg-[rgba(255,255,255,0.04)]">
        <h2 className="text-xl font-black tracking-widest uppercase text-white font-display">
          🔔 RECORDATORIOS & NOTIFICACIONES
        </h2>
        <p className="text-[8px] text-slate-500 uppercase mt-1">
          Smart alerts • Auto-generated from missions
        </p>
      </div>

      {/* Auto-generated from jobs */}
      {autoRem.length > 0 && (
        <div className="space-y-2">
          <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest px-1">
            ⚡ AUTO-GENERADOS — Servicios de Mañana
          </p>
          {autoRem.map((r) => (
            <div
              key={r.id}
              className="g p-4 border border-amber-500/20 bg-amber-500/5 flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] font-black text-white">{r.title}</p>
                <p className="text-[7px] text-slate-500 mt-0.5">Fecha: {r.date}</p>
              </div>
              <button
                onClick={() => {
                  const ph = (r.phone || '').replace(/\D/g, '');
                  const ph2 = ph.length === 10 ? '1' + ph : ph;
                  window.open(
                    `https://wa.me/${ph2}?text=${encodeURIComponent(
                      `Hi ${
                        r.job.client_name
                      }! 🔔 Recordatorio — mañana tenemos tu servicio de ${r.job.service_type?.toUpperCase()} con Elevore. ¿Tienes alguna pregunta?`
                    )}`,
                    '_blank'
                  );
                  tt('WA sent ✓');
                }}
                className="px-3 py-2 bg-amber-500 text-black text-[7px] font-black uppercase rounded-xl active:scale-95"
              >
                📱 WA
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Reminder */}
      <div className="g p-5 space-y-3 bg-[rgba(255,255,255,0.04)]">
        <p className="text-[9px] font-black text-[#F5C518] uppercase tracking-widest">
          + NUEVO RECORDATORIO
        </p>
        <input
          className="inp text-xs"
          placeholder="Título del recordatorio..."
          value={newRem.title}
          onChange={(e) => setNewRem({ ...newRem, title: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            className="inp text-xs"
            value={newRem.date}
            onChange={(e) => setNewRem({ ...newRem, date: e.target.value })}
          />
          <input
            type="time"
            className="inp text-xs"
            value={newRem.time}
            onChange={(e) => setNewRem({ ...newRem, time: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-4 gap-1">
          {['followup', 'payment', 'review', 'call'].map((t) => (
            <button
              key={t}
              onClick={() => setNewRem({ ...newRem, type: t })}
              className={`py-2 rounded-xl text-[7px] font-black uppercase border transition-all active:scale-95 ${
                newRem.type === t
                  ? 'bg-[#F5C518] text-black border-[#F5C518]'
                  : 'bg-white/5 border-white/5 text-slate-400'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={addReminder}
          className="w-full bg-[#F5C518] text-black py-3 rounded-xl font-black uppercase text-[9px] active:scale-95"
        >
          Guardar Recordatorio 🔔
        </button>
      </div>

      {/* Pending */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">
            ⏰ PENDIENTES ({upcoming.length})
          </p>
          {upcoming.map((r) => (
            <div
              key={r.id}
              className={`g p-4 border flex items-center gap-3 ${
                typeColors[r.type] || typeColors.followup
              }`}
            >
              <button
                onClick={() => toggleDone(r.id)}
                className="w-6 h-6 rounded-lg border-2 border-current flex items-center justify-center flex-shrink-0"
              >
                <Icon name="check" className="w-3.5 h-3.5 opacity-0" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-white truncate">
                  {r.title}
                </p>
                <p className="text-[7px] text-slate-500 mt-0.5">
                  {r.date} {r.time && `• ${r.time}`} • {r.type.toUpperCase()}
                </p>
              </div>
              <button
                onClick={() => deleteRem(r.id)}
                className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Done */}
      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest px-1">
            ✅ COMPLETADOS ({done.length})
          </p>
          {done.map((r) => (
            <div
              key={r.id}
              className="g p-3 border border-white/5 flex items-center gap-3 opacity-40"
            >
              <button
                onClick={() => toggleDone(r.id)}
                className="w-6 h-6 rounded-lg bg-green-600 flex items-center justify-center flex-shrink-0"
              >
                <Icon name="check" className="w-3.5 h-3.5 text-white" />
              </button>
              <p className="text-[9px] text-slate-500 line-through flex-1">
                {r.title}
              </p>
              <button
                onClick={() => deleteRem(r.id)}
                className="text-slate-700 hover:text-red-400"
              >
                <Icon name="x" className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
