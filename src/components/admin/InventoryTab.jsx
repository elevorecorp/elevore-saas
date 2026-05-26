import React from 'react';

export const InventoryTab = ({
  inventory,
  setInventory,
  newItem,
  setNewItem,
  financeTab,
  setFinanceTab,
  tt,
}) => {
  const saveInv = (updated) => {
    setInventory(updated);
    localStorage.setItem('elevore_inventory', JSON.stringify(updated));
  };

  const addItem = () => {
    if (!newItem.name.trim()) return;
    const updated = [...inventory, { ...newItem, id: Date.now() }];
    saveInv(updated);
    setNewItem({ name: '', qty: 0, unit: 'units', minQty: 2, cost: 0 });
    tt('Item added ✓');
  };

  const updateQty = (id, delta) => {
    const updated = inventory.map((i) =>
      i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i
    );
    saveInv(updated);
  };

  const removeItem = (id) => {
    if (confirm('Remove item?')) {
      saveInv(inventory.filter((i) => i.id !== id));
      tt('Removed ✓');
    }
  };

  const lowStock = inventory.filter((i) => i.qty <= i.minQty);
  const totalValue = inventory.reduce((s, i) => s + i.qty * i.cost, 0);

  return (
    <div className="space-y-5 animate-in fade-in pb-24">

      <div className="g p-5 border-t-4 border-purple-500 bg-[rgba(255,255,255,0.04)]">
        <h2 className="text-xl font-black tracking-widest uppercase text-white font-display">
          📦 INVENTARIO DE SUMINISTROS
        </h2>
        <p className="text-[8px] text-slate-500 uppercase mt-1">
          Supply tracking • Cost control per service
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Items', val: inventory.length, color: 'text-white' },
          { label: 'Stock Bajo', val: lowStock.length, color: 'text-red-400' },
          {
            label: 'Valor Total',
            val: `$${totalValue.toFixed(0)}`,
            color: 'text-green-400',
          },
        ].map((k) => (
          <div
            key={k.label}
            className="g p-4 text-center bg-[rgba(255,255,255,0.04)]"
          >
            <p className={`text-2xl font-black ${k.color}`}>{k.val}</p>
            <p className="text-[7px] text-slate-500 uppercase font-black mt-1">
              {k.label}
            </p>
          </div>
        ))}
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="g p-4 border border-red-500/30 bg-red-500/5">
          <p className="text-[8px] font-black text-red-400 uppercase tracking-widest mb-2">
            ⚠️ STOCK BAJO — Reponer pronto
          </p>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((i) => (
              <span
                key={i.id}
                className="text-[7px] bg-red-500/10 text-red-300 px-2 py-1 rounded-lg border border-red-500/20 font-black"
              >
                {i.name}: {i.qty} {i.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Add Item */}
      <div className="g p-5 space-y-3 bg-[rgba(255,255,255,0.04)]">
        <p className="text-[9px] font-black text-[#F5C518] uppercase tracking-widest">
          + AÑADIR ITEM
        </p>
        <div className="grid grid-cols-2 gap-2">
          <input
            className="inp text-xs uppercase"
            placeholder="Nombre del producto"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          />
          <input
            type="text"
            className="inp text-xs"
            placeholder="Unit (ej. bottles, units)"
            value={newItem.unit}
            onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
          />
          <input
            type="number"
            className="inp text-xs"
            placeholder="Cantidad"
            value={newItem.qty || ''}
            onChange={(e) =>
              setNewItem({ ...newItem, qty: parseInt(e.target.value) || 0 })
            }
          />
          <input
            type="number"
            className="inp text-xs"
            placeholder="Stock mínimo"
            value={newItem.minQty || ''}
            onChange={(e) =>
              setNewItem({ ...newItem, minQty: parseInt(e.target.value) || 0 })
            }
          />
          <input
            type="number"
            className="inp text-xs"
            placeholder="Costo unitario $"
            value={newItem.cost || ''}
            onChange={(e) =>
              setNewItem({ ...newItem, cost: parseFloat(e.target.value) || 0 })
            }
          />
        </div>
        <button
          onClick={addItem}
          className="w-full bg-[#F5C518] text-black py-3 rounded-xl font-black uppercase text-[9px] active:scale-95"
        >
          Agregar al Inventario ✓
        </button>
      </div>

      {/* Stock List */}
      <div className="space-y-2">
        {inventory.length === 0 && (
          <div className="g p-8 text-center text-slate-500 text-[9px] font-black uppercase">
            No hay items. Añade tu primer suministro ↑
          </div>
        )}
        {inventory.map((item) => (
          <div
            key={item.id}
            className={`g p-4 flex items-center justify-between border ${
              item.qty <= item.minQty
                ? 'border-red-500/30 bg-red-500/5'
                : 'border-white/5 bg-[rgba(255,255,255,0.03)]'
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-white uppercase">
                  {item.name}
                </h4>
                {item.qty <= item.minQty && (
                  <span className="text-[5px] bg-red-500/20 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-black uppercase">
                    LOW
                  </span>
                )}
              </div>
              <p className="text-[7px] text-slate-500 mt-0.5">
                Min: {item.minQty} {item.unit} • ${item.cost}/unit • Valor:{' '}
                ${(item.qty * item.cost).toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQty(item.id, -1)}
                className="w-8 h-8 bg-white/10 rounded-lg text-white font-bold active:scale-95 text-sm"
              >
                −
              </button>
              <span
                className={`text-lg font-black w-8 text-center ${
                  item.qty <= item.minQty ? 'text-red-400' : 'text-white'
                }`}
              >
                {item.qty}
              </span>
              <button
                onClick={() => updateQty(item.id, 1)}
                className="w-8 h-8 bg-white/10 rounded-lg text-white font-bold active:scale-95 text-sm"
              >
                +
              </button>
              <button
                onClick={() => removeItem(item.id)}
                className="w-8 h-8 bg-red-900/30 text-red-400 rounded-lg active:scale-95 ml-1 text-xs font-black"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
