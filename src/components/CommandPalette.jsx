import React, { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { Search, Zap, Calendar, Users, Settings, Briefcase, ChevronRight, BarChart2 } from 'lucide-react';
import './CommandPalette.css'; // We'll add some base CSS

export function CommandPalette({ open, setOpen, navigateTo }) {
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setOpen]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="cmdk-dialog"
    >
      <div className="cmdk-overlay" onClick={() => setOpen(false)}></div>
      <div className="cmdk-content animate-in fade-in zoom-in-95 duration-200">
        <Command.Input 
          placeholder="Busca comandos o clientes..." 
          className="cmdk-input"
          autoFocus
        />
        <Command.List className="cmdk-list nsb">
          <Command.Empty className="cmdk-empty">No se encontraron resultados.</Command.Empty>

          <Command.Group heading="Atajos Rápidos" className="cmdk-group">
            <Command.Item onSelect={() => { navigateTo('deploy'); setOpen(false); }} className="cmdk-item">
              <Zap className="cmdk-icon text-[#F5C518]" />
              <div className="flex-1">
                <span className="cmdk-label">Nueva Cotización Rápida</span>
                <span className="cmdk-description">Despliega un nuevo trabajo o cotización con IA</span>
              </div>
              <ChevronRight className="cmdk-arrow" />
            </Command.Item>
            <Command.Item onSelect={() => { navigateTo('settings'); setOpen(false); }} className="cmdk-item">
              <Settings className="cmdk-icon text-slate-400" />
              <div className="flex-1">
                <span className="cmdk-label">Configuración y Stripe</span>
                <span className="cmdk-description">Ajustes de la cuenta y pagos</span>
              </div>
              <ChevronRight className="cmdk-arrow" />
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Navegación del Imperio" className="cmdk-group">
            <Command.Item onSelect={() => { navigateTo('brief'); setOpen(false); }} className="cmdk-item">
              <BarChart2 className="cmdk-icon text-blue-400" />
              <span className="cmdk-label">Dashboard / Métricas</span>
            </Command.Item>
            <Command.Item onSelect={() => { navigateTo('agenda'); setOpen(false); }} className="cmdk-item">
              <Briefcase className="cmdk-icon text-purple-400" />
              <span className="cmdk-label">Misiones (Trabajos Activos)</span>
            </Command.Item>
            <Command.Item onSelect={() => { navigateTo('clients'); setOpen(false); }} className="cmdk-item">
              <Users className="cmdk-icon text-green-400" />
              <span className="cmdk-label">Directorio de Clientes</span>
            </Command.Item>
            <Command.Item onSelect={() => { navigateTo('intel'); setOpen(false); }} className="cmdk-item">
              <Calendar className="cmdk-icon text-red-400" />
              <span className="cmdk-label">Inteligencia Financiera</span>
            </Command.Item>
          </Command.Group>

        </Command.List>
      </div>
    </Command.Dialog>
  );
}
