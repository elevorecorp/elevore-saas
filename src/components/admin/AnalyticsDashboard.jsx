import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import * as Icons from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { sb } from '../../supabase';

import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// =====================================================================
// 🎨 CHART COLOR THEMING & CONTEXT
// =====================================================================
const ChartColorContext = createContext();

const INITIAL_COLORS = [
  { id: 'Blue', hex: '#3b82f6' },
  { id: 'Emerald', hex: '#10b981' },
  { id: 'Amber', hex: '#f59e0b' },
  { id: 'Red', hex: '#ef4444' },
  { id: 'Purple', hex: '#8b5cf6' },
  { id: 'Pink', hex: '#ec4899' },
  { id: 'Cyan', hex: '#06b6d4' },
  { id: 'Lime', hex: '#84cc16' },
  { id: 'Orange', hex: '#f97316' },
  { id: 'Indigo', hex: '#6366f1' }
];

export function ChartColorProvider({ children }) {
  const [colors, setColors] = useState(() => {
    const saved = localStorage.getItem('elevore_chart_colors');
    return saved ? JSON.parse(saved) : INITIAL_COLORS;
  });

  const saveColors = (newColors) => {
    setColors(newColors);
    localStorage.setItem('elevore_chart_colors', JSON.stringify(newColors));
  };

  const hexArray = useMemo(() => colors.map(c => c.hex), [colors]);

  return (
    <ChartColorContext.Provider value={{ colors, hexArray, saveColors }}>
      {children}
    </ChartColorContext.Provider>
  );
}

function SortableSwatch({ id, color }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : 'auto'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-2 p-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl cursor-grab active:cursor-grabbing hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 transition-all select-none"
    >
      <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[7.5px] font-mono text-zinc-500 dark:text-zinc-400 font-bold uppercase truncate">{id}</span>
      <Icons.GripVertical className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 ml-auto flex-shrink-0" />
    </div>
  );
}

function SwatchCustomizer() {
  const { colors, saveColors } = useContext(ChartColorContext);
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = colors.findIndex(c => c.id === active.id);
      const newIndex = colors.findIndex(c => c.id === over.id);
      saveColors(arrayMove(colors, oldIndex, newIndex));
    }
  };

  return (
    <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <span className="text-[8px] text-[#2563eb] dark:text-[#60a5fa] font-mono uppercase font-black block">Customizer</span>
          <h4 className="text-xs font-black text-zinc-950 dark:text-zinc-50 uppercase tracking-wider">Paleta de Colores de Gráficos</h4>
        </div>
        <button
          onClick={() => saveColors(INITIAL_COLORS)}
          className="px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[8px] font-black uppercase text-zinc-500 dark:text-zinc-400 transition-all active:scale-95"
        >
          Reestablecer
        </button>
      </div>
      <p className="text-[9px] text-zinc-500 dark:text-zinc-400 font-medium leading-normal">
        Arrastra y reordena los swatches para personalizar en tiempo real la combinación de colores usada en el dashboard.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={colors.map(c => c.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2">
            {colors.map((c) => (
              <SortableSwatch key={c.id} id={c.id} color={c.hex} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

// =====================================================================
// 📈 ANALYTICS DASHBOARD CONTAINER
// =====================================================================
export function AnalyticsDashboard({ jobs = [], clients = [], refresh, tt }) {
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isUpdatingClient, setIsUpdatingClient] = useState(false);
  const itemsPerPage = 8;

  // LTV Simulator state
  const [simRetentionRate, setSimRetentionRate] = useState(78);
  const [simAvgTicket, setSimAvgTicket] = useState(220);
  const [simAnnualFrequency, setSimAnnualFrequency] = useState(6);

  // Time range selection for chart data
  const [dateRange, setDateRange] = useState('6m'); // 1m, 3m, 6m, 12m

  const { hexArray } = useContext(ChartColorContext);

  // Historical data helper to make charts look robust and premium
  const mockMonthlyHistory = useMemo(() => [
    { month: 'Ene', rev: 8400, leads: 52, conversions: 21 },
    { month: 'Feb', rev: 9200, leads: 58, conversions: 26 },
    { month: 'Mar', rev: 11500, leads: 74, conversions: 35 },
    { month: 'Abr', rev: 10800, leads: 69, conversions: 31 },
    { month: 'May', rev: 13200, leads: 82, conversions: 40 },
    { month: 'Jun', rev: 14800, leads: 91, conversions: 46 }
  ], []);

  // 1. Process Database metrics
  const stats = useMemo(() => {
    const totalMissions = jobs.length;
    const leads = jobs.filter(j => j.status === 'lead' || j.status === 'estimate').length;
    const scheduled = jobs.filter(j => j.status === 'scheduled' || j.status === 'in_progress' || j.status === 'en_route').length;
    const completed = jobs.filter(j => j.status === 'completed' || j.status === 'paid').length;
    const paid = jobs.filter(j => j.status === 'paid').length;

    const rated = jobs.filter(j => j.client_rating && Number(j.client_rating) > 0);
    const avgRating = rated.length > 0 ? (rated.reduce((acc, curr) => acc + Number(curr.client_rating), 0) / rated.length).toFixed(2) : '0';

    const stars = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    rated.forEach(j => {
      const r = Math.round(Number(j.client_rating));
      if (stars[r] !== undefined) stars[r]++;
    });

    return { totalMissions, leads, scheduled, completed, paid, avgRating, stars, ratedCount: rated.length };
  }, [jobs]);

  // Client analytics list
  const clientAnalytics = useMemo(() => {
    return clients.map(client => {
      const clientJobs = jobs.filter(j => j.client_name === client.name);
      const completedJobs = clientJobs.filter(j => j.status === 'completed' || j.status === 'paid');
      
      const totalSpent = completedJobs.reduce((sum, j) => sum + (Number(j.total_price) || 0), 0);
      const avgSpent = completedJobs.length > 0 ? Math.round(totalSpent / completedJobs.length) : 0;
      
      const rated = completedJobs.filter(j => j.client_rating && Number(j.client_rating) > 0);
      const avgClientRating = rated.length > 0 ? (rated.reduce((sum, j) => sum + Number(j.client_rating), 0) / rated.length).toFixed(1) : 'N/A';

      // Churn risk calculation based on days since last visit
      let daysSinceLastVisit = 999;
      if (completedJobs.length > 0) {
        const lastJobDate = new Date(Math.max(...completedJobs.map(j => new Date(j.scheduled_date || j.created_at).getTime())));
        daysSinceLastVisit = Math.round((Date.now() - lastJobDate.getTime()) / 86400000);
      }

      let riskScore = 0;
      if (daysSinceLastVisit > 60) {
        riskScore = Math.min(100, 70 + Math.round(daysSinceLastVisit / 8));
      } else if (daysSinceLastVisit > 30) {
        riskScore = Math.round((daysSinceLastVisit - 30) * 1.5 + 20);
      } else if (daysSinceLastVisit <= 30) {
        riskScore = Math.max(5, Math.round(daysSinceLastVisit * 0.5));
      }

      return {
        ...client,
        jobsCount: completedJobs.length,
        totalSpent,
        avgSpent,
        avgRating: avgClientRating,
        daysSinceLastVisit,
        riskScore
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [clients, jobs]);

  // Filtering and Search for table
  const filteredClients = useMemo(() => {
    return clientAnalytics.filter(c => 
      c.name?.toLowerCase().includes(clientSearch.toLowerCase()) ||
      c.phone?.includes(clientSearch) ||
      c.email?.toLowerCase().includes(clientSearch.toLowerCase())
    );
  }, [clientAnalytics, clientSearch]);

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage) || 1;
  const paginatedClients = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredClients, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [clientSearch]);

  // 2. LTV Calculator outputs
  const calculatedLTV = Math.round((simAvgTicket * simAnnualFrequency) / (1 - (simRetentionRate / 100)));
  const currentAvgPrice = 220;
  const currentEstimatedFrequency = 5.2;
  const currentEstimatedRetention = 78;
  const currentEstimatedLTV = Math.round((currentAvgPrice * currentEstimatedFrequency) / (1 - (currentEstimatedRetention / 100)));

  // =====================================================================
  // 📊 ECHARTS OPTIONS
  // =====================================================================

  // A. Funnel Chart option
  const funnelOption = useMemo(() => {
    const totalLeads = mockMonthlyHistory.reduce((sum, item) => sum + item.leads, 0) + stats.leads;
    const totalConversions = mockMonthlyHistory.reduce((sum, item) => sum + item.conversions, 0) + stats.paid;

    return {
      color: hexArray,
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b} : {c}%'
      },
      legend: {
        data: ['Leads', 'Approved', 'Completed', 'Paid'],
        textStyle: { color: '#71717a', fontSize: 9 },
        bottom: 0
      },
      series: [
        {
          name: 'Embudo de Ventas',
          type: 'funnel',
          left: '10%',
          top: 20,
          bottom: 40,
          width: '80%',
          min: 0,
          max: 100,
          minSize: '0%',
          maxSize: '100%',
          sort: 'descending',
          gap: 2,
          label: {
            show: true,
            position: 'inside',
            formatter: '{b}: {c}%',
            textStyle: { fontFamily: 'Inter, sans-serif', fontWeight: 'bold' }
          },
          labelLine: {
            show: false
          },
          itemStyle: {
            borderColor: 'rgba(255, 255, 255, 0.05)',
            borderWidth: 1
          },
          data: [
            { value: 100, name: 'Leads' },
            { value: 78, name: 'Approved' },
            { value: 62, name: 'Completed' },
            { value: 45, name: 'Paid' }
          ]
        }
      ]
    };
  }, [hexArray, stats, mockMonthlyHistory]);

  // B. Sales Revenue Growth (Line)
  const salesOption = useMemo(() => {
    let months = mockMonthlyHistory.map(m => m.month);
    let revenues = mockMonthlyHistory.map(m => m.rev);

    // Filter data according to time selection
    if (dateRange === '1m') {
      months = months.slice(-2);
      revenues = revenues.slice(-2);
    } else if (dateRange === '3m') {
      months = months.slice(-3);
      revenues = revenues.slice(-3);
    }

    return {
      color: [hexArray[0]],
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(12, 12, 15, 0.95)',
        borderColor: '#1e1e24',
        borderWidth: 1,
        formatter: (params) => {
          const p = params[0];
          return `<div class="p-1"><span class="text-[9px] uppercase font-bold text-zinc-500">${p.name}</span><p class="text-xs font-mono font-black text-emerald-400 mt-0.5">$${p.value.toLocaleString()} USD</p></div>`;
        }
      },
      grid: { top: 20, bottom: 25, left: 45, right: 15 },
      xAxis: {
        type: 'category',
        data: months,
        axisLine: { lineStyle: { color: 'rgba(120, 120, 120, 0.15)' } },
        axisLabel: { color: '#71717a', fontSize: 9, fontFamily: 'Inter, sans-serif' }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(120, 120, 120, 0.08)' } },
        axisLabel: { color: '#71717a', fontSize: 9, fontFamily: 'Inter, sans-serif' }
      },
      series: [
        {
          name: 'Ventas',
          type: 'line',
          smooth: true,
          showSymbol: true,
          symbolSize: 6,
          lineStyle: { width: 3 },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: hexArray[0] + '40' },
                { offset: 1, color: hexArray[0] + '00' }
              ]
            }
          },
          data: revenues
        }
      ]
    };
  }, [hexArray, dateRange, mockMonthlyHistory]);

  // C. Loyalty Distribution (Pie)
  const loyaltyOption = useMemo(() => {
    const clientsData = clientAnalytics;
    const total = clientsData.length || 1;
    const occasional = clientsData.filter(c => c.jobsCount <= 1).length;
    const recurrent = clientsData.filter(c => c.jobsCount > 1 && c.jobsCount < 4).length;
    const vip = clientsData.filter(c => c.jobsCount >= 4).length;

    return {
      color: [hexArray[1], hexArray[2], hexArray[4]],
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(12, 12, 15, 0.95)',
        borderColor: '#1e1e24',
        borderWidth: 1,
        formatter: (p) => {
          return `<div class="p-1"><span class="text-[9px] uppercase font-bold text-zinc-500">${p.name}</span><p class="text-xs font-mono font-black text-white mt-0.5">${p.value} (${p.percent}%)</p></div>`;
        }
      },
      legend: {
        bottom: '0%',
        left: 'center',
        textStyle: { color: '#71717a', fontSize: 9, fontFamily: 'Inter, sans-serif' },
        itemWidth: 10,
        itemHeight: 10
      },
      series: [
        {
          name: 'Lealtad del Cliente',
          type: 'pie',
          radius: ['45%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: 'rgba(255, 255, 255, 0.05)',
            borderWidth: 1.5
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 10,
              fontWeight: 'bold',
              color: '#fafafa'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            { value: occasional || 5, name: 'Ocasionales (1)' },
            { value: recurrent || 3, name: 'Recurrentes (2-3)' },
            { value: vip || 2, name: 'VIP (4+)' }
          ]
        }
      ]
    };
  }, [hexArray, clientAnalytics]);

  // D. Satisfaction Rating (Horizontal Bar)
  const ratingOption = useMemo(() => {
    const stars = stats.stars;
    const yData = ['1★', '2★', '3★', '4★', '5★'];
    const xData = [stars[1] || 0, stars[2] || 0, stars[3] || 0, stars[4] || 0, stars[5] || 0];

    return {
      color: [hexArray[2]],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(12, 12, 15, 0.95)',
        borderColor: '#1e1e24',
        borderWidth: 1
      },
      grid: { top: 10, bottom: 20, left: 45, right: 15 },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: 'rgba(120, 120, 120, 0.08)' } },
        axisLabel: { color: '#71717a', fontSize: 9 }
      },
      yAxis: {
        type: 'category',
        data: yData,
        axisLine: { lineStyle: { color: 'rgba(120, 120, 120, 0.15)' } },
        axisLabel: { color: '#71717a', fontSize: 9, fontWeight: 'bold' }
      },
      series: [
        {
          name: 'Calificaciones',
          type: 'bar',
          barWidth: '60%',
          itemStyle: {
            borderRadius: [0, 4, 4, 0]
          },
          data: xData
        }
      ]
    };
  }, [hexArray, stats]);

  // =====================================================================
  // 🛠️ DRILL DOWN OPERATIONS
  // =====================================================================
  const handleClientAction = async (actionType) => {
    if (!selectedClient) return;
    setIsUpdatingClient(true);
    try {
      if (actionType === 'vip') {
        const isVIP = selectedClient.membership === 'vip';
        const newLevel = isVIP ? 'none' : 'vip';
        
        const { error } = await sb
          .from('clients')
          .update({ membership: newLevel })
          .eq('id', selectedClient.id);

        if (error) throw error;
        tt(`Cliente actualizado a estado ${newLevel.toUpperCase()} ✓`, 'green');
      } else if (actionType === 'winback') {
        // Mock email trigger or integration logic
        tt('Campaña de Win-back enviada al correo del cliente 📧', 'green');
      } else if (actionType === 'churn') {
        // Toggle custom churn flag in specs
        const currentSpecs = selectedClient.specs || {};
        const isChurn = currentSpecs.marked_churn === true;
        
        const { error } = await sb
          .from('clients')
          .update({ specs: { ...currentSpecs, marked_churn: !isChurn } })
          .eq('id', selectedClient.id);

        if (error) throw error;
        tt(isChurn ? 'Se removió la bandera de fuga ✓' : 'Marcado como alerta de fuga ✓', 'amber');
      }
      
      if (refresh) await refresh();
      
      // Update selected client preview locally
      setSelectedClient(prev => ({
        ...prev,
        membership: prev.membership === 'vip' ? 'none' : 'vip',
        specs: { ...prev.specs, marked_churn: prev.specs?.marked_churn !== true }
      }));
    } catch (e) {
      console.error(e);
      tt('Error al actualizar cliente: ' + e.message, 'red');
    } finally {
      setIsUpdatingClient(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* 🎨 INTERACTIVE COLOR CUSTOMIZER */}
      <SwatchCustomizer />

      {/* METRICS SUMMARY GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-bottom-2 duration-300">
        {[
          { label: 'Conversión de Embudo', val: `${stats.totalMissions > 0 ? Math.round((stats.paid / stats.totalMissions) * 100) : 0}%`, sub: `de leads a completados`, color: 'text-zinc-950 dark:text-zinc-50' },
          { label: 'Calificación Promedio', val: `${stats.avgRating} ⭐`, sub: `de ${stats.ratedCount} valoraciones`, color: 'text-[#F5C518]' },
          { label: 'Ingresos Históricos', val: `$${(mockMonthlyHistory.reduce((sum, item) => sum + item.rev, 0) + stats.paid * 150).toLocaleString()} USD`, sub: `estimado total`, color: 'text-emerald-500' },
          { label: 'LTV Promedio', val: `$${currentEstimatedLTV.toLocaleString()} USD`, sub: `frecuencia de retención`, color: 'text-indigo-400' }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
            <span className="text-[7.5px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">{stat.label}</span>
            <p className={`text-2xl font-black ${stat.color} tracking-tight mt-1.5`}>{stat.val}</p>
            <span className="text-[8px] text-zinc-400 dark:text-zinc-500 mt-1 uppercase font-bold block">{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* CHARTS CONTAINER GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Sales Revenue Line Chart */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <span className="text-[8px] text-[#2563eb] dark:text-[#60a5fa] font-mono uppercase font-black block">Crecimiento Mensual</span>
              <h4 className="text-xs font-black text-zinc-950 dark:text-zinc-50 uppercase tracking-wider">Histórico de Ventas</h4>
            </div>
            
            <div className="bg-zinc-100 dark:bg-[#09090b] p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 flex gap-1">
              {[
                { id: '3m', label: '3M' },
                { id: '6m', label: '6M' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setDateRange(opt.id)}
                  className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${dateRange === opt.id ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm' : 'text-zinc-400 dark:text-zinc-500'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <ReactECharts option={salesOption} style={{ height: '260px' }} />
        </div>

        {/* Funnel Conversion Chart */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div>
            <span className="text-[8px] text-[#2563eb] dark:text-[#60a5fa] font-mono uppercase font-black block">Fases de Conversión</span>
            <h4 className="text-xs font-black text-zinc-950 dark:text-zinc-50 uppercase tracking-wider">Rendimiento del Embudo</h4>
          </div>
          <ReactECharts option={funnelOption} style={{ height: '260px' }} />
        </div>

        {/* Loyalty Pie Chart */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div>
            <span className="text-[8px] text-[#2563eb] dark:text-[#60a5fa] font-mono uppercase font-black block">Segmento de Clientes</span>
            <h4 className="text-xs font-black text-zinc-950 dark:text-zinc-50 uppercase tracking-wider">Recurrencia & Lealtad</h4>
          </div>
          <ReactECharts option={loyaltyOption} style={{ height: '260px' }} />
        </div>

        {/* Rating satisfaction chart */}
        <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm space-y-4">
          <div>
            <span className="text-[8px] text-[#2563eb] dark:text-[#60a5fa] font-mono uppercase font-black block">Calificaciones Recibidas</span>
            <h4 className="text-xs font-black text-zinc-950 dark:text-zinc-50 uppercase tracking-wider">Distribución NPS</h4>
          </div>
          <ReactECharts option={ratingOption} style={{ height: '260px' }} />
        </div>

      </div>

      {/* LTV PREDICTIVE SIMULATOR */}
      <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div>
          <span className="text-[8px] text-[#2563eb] dark:text-[#60a5fa] font-mono uppercase font-black block">Simulación LTV</span>
          <h4 className="text-xs font-black text-zinc-950 dark:text-zinc-50 uppercase tracking-wider">Estimación del Valor del Ciclo de Vida del Cliente</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Sliders column */}
          <div className="md:col-span-2 space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[9px] font-black uppercase text-zinc-500">
                <span>Tasa de Retención Anual</span>
                <span className="font-mono bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-100 px-2 py-0.5 rounded">{simRetentionRate}%</span>
              </div>
              <input 
                type="range" min="50" max="99" step="1" 
                value={simRetentionRate} onChange={e => setSimRetentionRate(Number(e.target.value))}
                className="w-full accent-[#2563eb] bg-zinc-200 dark:bg-zinc-800 h-1 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[9px] font-black uppercase text-zinc-500">
                <span>Ticket Promedio</span>
                <span className="font-mono bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-100 px-2 py-0.5 rounded">${simAvgTicket} USD</span>
              </div>
              <input 
                type="range" min="100" max="500" step="10" 
                value={simAvgTicket} onChange={e => setSimAvgTicket(Number(e.target.value))}
                className="w-full accent-[#2563eb] bg-zinc-200 dark:bg-zinc-800 h-1 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-[9px] font-black uppercase text-zinc-500">
                <span>Frecuencia Anual de Visitas</span>
                <span className="font-mono bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-950 dark:text-zinc-100 px-2 py-0.5 rounded">{simAnnualFrequency} visitas</span>
              </div>
              <input 
                type="range" min="2" max="24" step="1" 
                value={simAnnualFrequency} onChange={e => setSimAnnualFrequency(Number(e.target.value))}
                className="w-full accent-[#2563eb] bg-zinc-200 dark:bg-zinc-800 h-1 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Results Summary Box */}
          <div className="p-4 bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-2xl flex flex-col justify-between text-[9px] uppercase font-bold text-left shadow-inner">
            <div className="space-y-2">
              <div className="flex justify-between text-zinc-500 border-b border-zinc-200 dark:border-zinc-800/80 pb-2">
                <span>LTV Promedio Actual (Est.):</span>
                <span className="text-zinc-950 dark:text-zinc-50 font-mono">${currentEstimatedLTV} USD</span>
              </div>
              <div className="flex justify-between text-zinc-500 border-b border-zinc-200 dark:border-zinc-800/80 pb-2">
                <span>LTV Proyectado (Simulado):</span>
                <span className="text-[#2563eb] dark:text-[#60a5fa] font-mono">${calculatedLTV} USD</span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-4 text-xs font-black">
              <span className="text-zinc-800 dark:text-zinc-300">Variación LTV:</span>
              <span className={`font-mono ${calculatedLTV >= currentEstimatedLTV ? 'text-emerald-500' : 'text-red-400'}`}>
                {calculatedLTV >= currentEstimatedLTV ? '+' : ''}{Math.round(((calculatedLTV - currentEstimatedLTV) / currentEstimatedLTV) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CUSTOMER RETENTION VIEW SPLIT */}
      <div className="flex flex-col lg:flex-row gap-6 items-stretch min-h-[500px]">
        
        {/* Left Column: Data Table */}
        <div className={`transition-all duration-300 ${selectedClient ? 'w-full lg:w-2/3' : 'w-full'} space-y-4`}>
          <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between h-full">
            
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-black text-zinc-950 dark:text-zinc-50 uppercase tracking-wider">Directorio de Retención de Clientes</h4>
                  <p className="text-[8px] text-zinc-500 dark:text-zinc-400 uppercase font-semibold mt-0.5">Control de Churn y Fidelidad VIP</p>
                </div>
                <div className="relative max-w-xs w-full">
                  <Icons.Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    className="w-full bg-zinc-50 dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-950 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#2563eb]"
                    placeholder="Buscar cliente..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto flex-1 custom-scroll">
              <table className="w-full text-[9px] text-zinc-600 dark:text-zinc-300">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 font-black uppercase text-left">
                    <th className="p-3.5 pl-6">Cliente</th>
                    <th className="p-3.5 text-center">Misiones</th>
                    <th className="p-3.5 text-right">Ticket Prom.</th>
                    <th className="p-3.5 text-center">Riesgo Churn</th>
                    <th className="p-3.5 text-center pr-6">Calificación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-semibold">
                  {paginatedClients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-zinc-400 dark:text-zinc-600 font-bold uppercase italic">
                        No se encontraron registros de clientes.
                      </td>
                    </tr>
                  ) : (
                    paginatedClients.map(c => {
                      const isSel = selectedClient?.id === c.id;
                      
                      // Determine risk track color
                      let riskColor = 'bg-emerald-500';
                      if (c.riskScore >= 70) riskColor = 'bg-rose-500';
                      else if (c.riskScore >= 30) riskColor = 'bg-orange-400';

                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedClient(isSel ? null : c)}
                          className={`hover:bg-zinc-50 dark:hover:bg-zinc-900/40 cursor-pointer transition-colors ${isSel ? 'bg-zinc-50 dark:bg-zinc-900/60 text-zinc-950 dark:text-white border-l-4 border-[#2563eb]' : ''}`}
                        >
                          <td className="p-3 pl-6 font-bold text-zinc-900 dark:text-zinc-100">
                            <span className="flex items-center gap-2">
                              {c.name}
                              {c.membership === 'vip' && (
                                <span className="bg-[#F5C518]/10 text-[#F5C518] text-[6.5px] px-1.5 py-0.5 rounded font-black border border-[#F5C518]/20">VIP</span>
                              )}
                              {c.specs?.marked_churn && (
                                <span className="bg-rose-500/10 text-rose-400 text-[6.5px] px-1.5 py-0.5 rounded font-black border border-rose-500/20">ALERT</span>
                              )}
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-zinc-800 dark:text-zinc-200">{c.jobsCount}</td>
                          <td className="p-3 text-right font-mono font-bold text-zinc-800 dark:text-zinc-200">${c.avgSpent} USD</td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-2 max-w-[100px] mx-auto">
                              <div className="flex-1 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                                <div className={`h-full ${riskColor}`} style={{ width: `${c.riskScore}%` }} />
                              </div>
                              <span className="text-[7.5px] font-mono text-zinc-500 dark:text-zinc-400">{c.riskScore}%</span>
                            </div>
                          </td>
                          <td className="p-3 text-center text-zinc-800 dark:text-zinc-200 font-mono font-bold pr-6">
                            {c.avgRating !== 'N/A' ? `${c.avgRating} ⭐` : '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center text-[9px] uppercase font-bold text-zinc-500">
              <span>Página {currentPage} de {totalPages} ({filteredClients.length} clientes)</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Icons.ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Icons.ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Icons.ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Icons.ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Customer side panel */}
        {selectedClient && (
          <div className="w-full lg:w-1/3 animate-in slide-in-from-right duration-300">
            <div className="bg-white dark:bg-[#0c0c0f] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 shadow-lg h-full flex flex-col justify-between relative overflow-hidden">
              
              {/* Card design overlay */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="space-y-4">
                <div className="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div>
                    <span className="text-[7.5px] text-[#2563eb] dark:text-[#60a5fa] font-mono uppercase font-black block">Detalle de Cliente</span>
                    <h4 className="text-sm font-black text-zinc-950 dark:text-zinc-50 uppercase tracking-wider mt-1">{selectedClient.name}</h4>
                  </div>
                  <button
                    onClick={() => setSelectedClient(null)}
                    className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors"
                  >
                    <Icons.X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Client Contact Info block */}
                  <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 text-[9px] uppercase font-bold text-zinc-500 space-y-2 leading-relaxed">
                    <div className="flex justify-between">
                      <span>Teléfono:</span>
                      <span className="text-zinc-950 dark:text-zinc-200 font-mono">{selectedClient.phone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Correo:</span>
                      <span className="text-zinc-950 dark:text-zinc-200 font-mono lowercase">{selectedClient.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-2">
                      <span>Última Visita:</span>
                      <span className="text-zinc-950 dark:text-zinc-200">{selectedClient.daysSinceLastVisit === 999 ? 'Ninguna' : `hace ${selectedClient.daysSinceLastVisit} días`}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Facturado:</span>
                      <span className="text-emerald-500 font-mono">${selectedClient.totalSpent.toLocaleString()} USD</span>
                    </div>
                  </div>

                  {/* Loyalty stats & flags block */}
                  <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 space-y-2">
                    <p className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block">Historial & Notas</p>
                    <p className="text-[9px] text-zinc-700 dark:text-zinc-400 font-medium leading-relaxed">
                      El cliente ha realizado un total de <strong className="text-zinc-950 dark:text-white">{selectedClient.jobsCount} servicios</strong> con una tarifa media de <strong className="text-zinc-950 dark:text-white">${selectedClient.avgSpent} USD</strong>.
                    </p>
                    {selectedClient.specs?.notes && (
                      <div className="p-2.5 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[8px] font-mono text-zinc-500 dark:text-zinc-400 italic">
                        "{selectedClient.specs.notes}"
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Section */}
              <div className="space-y-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block pl-1">Acciones de Fidelización</p>
                
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleClientAction('vip')}
                    disabled={isUpdatingClient}
                    className="w-full bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-black py-3 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1.5 transition-colors active:scale-95 shadow-sm"
                  >
                    <Icons.Award className="w-4 h-4 text-black" />
                    {selectedClient.membership === 'vip' ? 'Quitar VIP Status' : 'Marcar como VIP'}
                  </button>

                  <button
                    onClick={() => handleClientAction('churn')}
                    disabled={isUpdatingClient}
                    className="w-full bg-zinc-100 dark:bg-[#262626] hover:bg-[#f8fafc] dark:hover:bg-zinc-800 text-[#334155] dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 disabled:opacity-40 py-3 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1.5 transition-colors active:scale-95"
                  >
                    <Icons.AlertTriangle className="w-4 h-4" />
                    {selectedClient.specs?.marked_churn ? 'Quitar Alerta de Churn' : 'Activar Alerta de Churn'}
                  </button>

                  <button
                    onClick={() => handleClientAction('winback')}
                    disabled={isUpdatingClient}
                    className="w-full bg-[#e11d48] hover:bg-[#be123c] text-white py-3 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1.5 transition-colors active:scale-95 shadow-sm"
                  >
                    <Icons.Send className="w-4 h-4 text-white" />
                    Enviar Cupón Win-back (-10%)
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

    </div>
  );
}
