import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Award, 
  UserSquare2,
  BarChart3,
  TrendingUp,
  Percent,
  CheckCircle2
} from 'lucide-react';
import { useBetStore } from '../store/useBetStore';
import { calculateStats } from '../utils/math';

// Validation Schema
const tipsterSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional().nullable()
});

export const Tipsters = () => {
  const tipsters = useBetStore(state => state.tipsters);
  const bets = useBetStore(state => state.bets);
  
  const addTipster = useBetStore(state => state.addTipster);
  const updateTipster = useBetStore(state => state.updateTipster);
  const deleteTipster = useBetStore(state => state.deleteTipster);
  const setGlobalModalOpen = useBetStore(state => state.setIsModalOpen);

  // States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTipster, setEditingTipster] = useState(null);

  // React Hook Form
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(tipsterSchema),
    defaultValues: {
      name: '',
      description: ''
    }
  });

  const handleOpenAdd = () => {
    setEditingTipster(null);
    reset({
      name: '',
      description: ''
    });
    setIsModalOpen(true);
    setGlobalModalOpen(true);
  };

  const handleOpenEdit = (tipster) => {
    setEditingTipster(tipster);
    reset(tipster);
    setIsModalOpen(true);
    setGlobalModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingTipster) {
        await updateTipster({ ...editingTipster, ...data });
      } else {
        await addTipster(data);
      }
      setIsModalOpen(false);
      setGlobalModalOpen(false);
    } catch (e) {}
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este tipster? Sus apuestas asociadas no se borrarán, pero se desvincularán y pasarán a mostrarse como "Sin Tipster".')) {
      try {
        await deleteTipster(id);
      } catch (e) {}
    }
  };

  // Compile calculations for each tipster
  const tipsterStatsList = useMemo(() => {
    // Also compile bets without any tipster for comparison
    const noTipsterBets = bets.filter(b => !b.tipster_id);
    const noTipsterStats = calculateStats(noTipsterBets);

    const list = tipsters.map(t => {
      const tipsterBets = bets.filter(b => b.tipster_id === t.id);
      const stats = calculateStats(tipsterBets);
      
      return {
        ...t,
        stats
      };
    });

    // Sort by profit descending
    return {
      list: list.sort((a, b) => b.stats.netProfit - a.stats.netProfit),
      noTipsterStats
    };
  }, [tipsters, bets]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '20px' }}>
      
      {/* Header */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Seguimiento de Tipsters
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            Compara el rendimiento y rentabilidad de los pronosticadores que sigues.
          </p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="btn btn-primary"
          style={{ gap: '6px' }}
        >
          <Plus size={18} />
          Nuevo Tipster
        </button>
      </div>

      {/* Overview Cards (Best Tipster, Own bets profit, etc.) */}
      <div className="grid-cols-3">
        
        {/* Best Tipster Card */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--color-emerald)', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            color: 'var(--color-emerald)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Award size={22} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Mejor Tipster</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#f3f4f6' }}>
              {tipsterStatsList.list[0]?.stats.netProfit > 0 
                ? tipsterStatsList.list[0].name 
                : 'Ninguno con beneficios'
              }
            </div>
            {tipsterStatsList.list[0]?.stats.netProfit > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--color-emerald)', fontWeight: 600 }}>
                +{tipsterStatsList.list[0].stats.netProfit.toFixed(2)}€ ({tipsterStatsList.list[0].stats.yield.toFixed(1)}% Yield)
              </span>
            )}
          </div>
        </div>

        {/* Own Bets Performance */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #3b82f6', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'rgba(59, 130, 246, 0.08)',
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <UserSquare2 size={22} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Mis Apuestas Propias</span>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#f3f4f6' }}>
              {tipsterStatsList.noTipsterStats.netProfit >= 0 ? '+' : ''}
              {tipsterStatsList.noTipsterStats.netProfit.toFixed(2)}€
            </div>
            <span style={{ fontSize: '11px', color: tipsterStatsList.noTipsterStats.netProfit >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)', fontWeight: 600 }}>
              Yield: {tipsterStatsList.noTipsterStats.yield.toFixed(1)}% ({tipsterStatsList.noTipsterStats.settledCount} resueltas)
            </span>
          </div>
        </div>

        {/* Total Tipsters Active */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #f59e0b', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            color: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BarChart3 size={22} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Tipsters Activos</span>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#f3f4f6' }}>
              {tipsters.length}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Apuestas con tipster: {bets.filter(b => b.tipster_id).length}
            </span>
          </div>
        </div>

      </div>

      {/* Comparative Table */}
      <div className="glass-panel" style={{ padding: '8px' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Nombre / Descripción</th>
                <th>Beneficio Neto</th>
                <th>Yield %</th>
                <th>Aciertos %</th>
                <th>Récord (G/P/N)</th>
                <th>Total Apuestas</th>
                <th style={{ textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tipsterStatsList.list.length > 0 ? (
                tipsterStatsList.list.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#f3f4f6' }}>{t.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{t.description || 'Sin descripción'}</div>
                    </td>
                    <td style={{ fontWeight: 700, color: t.stats.netProfit >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)' }}>
                      {t.stats.netProfit >= 0 ? '+' : ''}{t.stats.netProfit.toFixed(2)}€
                    </td>
                    <td style={{ fontWeight: 700, color: t.stats.yield >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)' }}>
                      {t.stats.yield.toFixed(1)}%
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {t.stats.winRate.toFixed(1)}%
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                      {t.stats.wonCount} G / {t.stats.lostCount} P / {t.stats.voidCount} N
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.stats.settledCount + t.stats.pendingCount}</div>
                      {t.stats.pendingCount > 0 && (
                        <div style={{ fontSize: '10px', color: 'var(--color-amber)', fontWeight: 600 }}>
                          ({t.stats.pendingCount} pendientes)
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          onClick={() => handleOpenEdit(t)}
                          className="btn-action-glass action-edit" 
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(t.id)}
                          className="btn-action-glass action-delete" 
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                    No tienes tipsters registrados. Registra tu primer tipster haciendo clic en "Nuevo Tipster".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Tipster Modal */}
      {isModalOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            
            {/* Header */}
            <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#f3f4f6' }}>
                {editingTipster ? 'Editar Tipster' : 'Registrar Nuevo Tipster'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); setGlobalModalOpen(false); }} className="btn-icon" style={{ border: 'none', background: 'transparent' }}>
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="form-group">
                <label className="form-label">Nombre del Tipster</label>
                <input 
                  type="text" 
                  placeholder="Ej. VIP Tennis Analyst, Bet Master" 
                  className="form-input"
                  {...register('name')}
                />
                {errors.name && <span className="form-error">{errors.name.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Descripción / Canal</label>
                <textarea 
                  placeholder="Ej. Canal de Telegram, especialidad en fútbol mercados asiáticos..." 
                  className="form-input"
                  rows={3}
                  {...register('description')}
                  style={{ resize: 'none', fontFamily: 'inherit' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <button type="button" onClick={() => { setIsModalOpen(false); setGlobalModalOpen(false); }} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingTipster ? 'Guardar Cambios' : 'Registrar Tipster'}
                </button>
              </div>

            </form>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Tipsters;
