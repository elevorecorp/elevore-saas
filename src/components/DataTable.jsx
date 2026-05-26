import React, { useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import { ArrowUpDown, Search } from 'lucide-react';

export function DataTable({ data, columns, searchPlaceholder = "Buscar..." }) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center bg-black/40 border border-white/10 rounded-xl px-4 py-2 focus-within:border-[#F5C518]/50 transition-colors">
        <Search className="w-4 h-4 text-slate-400 mr-2" />
        <input
          value={globalFilter ?? ''}
          onChange={e => setGlobalFilter(e.target.value)}
          className="bg-transparent border-none outline-none text-sm text-white w-full placeholder-slate-500 font-mono"
          placeholder={searchPlaceholder}
        />
      </div>

      <div className="rounded-2xl border border-white/5 overflow-hidden bg-[#050505]/80 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 text-xs uppercase text-slate-400">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th 
                      key={header.id} 
                      className="px-6 py-4 font-black tracking-widest cursor-pointer hover:bg-white/5 transition-colors select-none"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-2">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: <ArrowUpDown className="w-3 h-3 text-[#F5C518]" />,
                          desc: <ArrowUpDown className="w-3 h-3 text-red-400" />,
                        }[header.column.getIsSorted()] ?? <ArrowUpDown className="w-3 h-3 opacity-20" />}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-white/5">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-white/5 transition-colors group">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-4 text-slate-300 font-medium">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-500 font-mono">
                    No hay resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
