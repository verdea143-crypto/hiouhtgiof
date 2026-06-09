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
  CheckCircle2,
  FileText,
  Printer
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { useBetStore } from '../store/useBetStore';
import { calculateStats } from '../utils/math';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899'];

// Validation Schema
const tipsterSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional().nullable(),
  monthly_cost: z.preprocess((val) => val === '' ? 0 : Number(val), z.number({ invalid_type_error: 'El coste mensual debe ser un número' }).min(0, 'El coste no puede ser negativo')).default(0)
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
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedTipsterForReport, setSelectedTipsterForReport] = useState(null);

  const handleOpenReport = (tipster) => {
    setSelectedTipsterForReport(tipster);
    setIsReportModalOpen(true);
    setGlobalModalOpen(true);
  };

  const handleExportJSON = (tipster, stats) => {
    const reportData = {
      tipster: {
        name: tipster.name,
        description: tipster.description,
        monthly_cost: tipster.monthly_cost
      },
      stats: {
        netProfit: stats.netProfit,
        yield: stats.yield,
        winRate: stats.winRate,
        wonCount: stats.wonCount,
        lostCount: stats.lostCount,
        voidCount: stats.voidCount,
        totalBets: stats.settledCount + stats.pendingCount
      },
      generated_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `informe-${tipster.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintReport = () => {
    window.print();
  };

  // React Hook Form
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(tipsterSchema),
    defaultValues: {
      name: '',
      description: '',
      monthly_cost: 0
    }
  });

  const handleOpenAdd = () => {
    setEditingTipster(null);
    reset({
      name: '',
      description: '',
      monthly_cost: 0
    });
    setIsModalOpen(true);
    setGlobalModalOpen(true);
  };

  const handleOpenEdit = (tipster) => {
    setEditingTipster(tipster);
    reset({
      name: tipster.name || '',
      description: tipster.description || '',
      monthly_cost: tipster.monthly_cost || 0
    });
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
                <th>Suscripción</th>
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
                    <td style={{ fontWeight: 600, color: '#f3f4f6' }}>
                      {t.monthly_cost ? `${Number(t.monthly_cost).toFixed(2)}€/mes` : 'Gratuito'}
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
                          onClick={() => handleOpenReport(t)}
                          className="btn-action-glass action-edit" 
                          title="Informe de Rendimiento"
                          aria-label="Informe de Rendimiento"
                          style={{ color: 'var(--color-accent)' }}
                        >
                          <BarChart3 size={14} />
                        </button>
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
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
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

              <div className="form-group">
                <label className="form-label">Coste Mensual de Suscripción (€)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  className="form-input"
                  {...register('monthly_cost')}
                />
                {errors.monthly_cost && <span className="form-error">{errors.monthly_cost.message}</span>}
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

      {/* Tipster Audit Report Modal */}
      {isReportModalOpen && selectedTipsterForReport && createPortal(
        <div className="modal-overlay">
          <div id="print-report-area" className="modal-content glass-panel" style={{ maxWidth: '650px', maxHeight: '95vh', overflowY: 'auto' }}>
            {/* Header */}
            <div className="flex-between no-print" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#f3f4f6' }}>
                Informe de Rendimiento: {selectedTipsterForReport.name}
              </h3>
              <button onClick={() => { setIsReportModalOpen(false); setGlobalModalOpen(false); }} className="btn-icon" style={{ border: 'none', background: 'transparent' }}>
                <X size={20} />
              </button>
            </div>

            {/* Print Title (Only shown in print layout) */}
            <div className="print-only" style={{ display: 'none', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 800 }}>Informe de Auditoría Deportiva — BetFlow</h2>
              <p style={{ fontSize: '14px', color: '#555' }}>Pronosticador: <strong>{selectedTipsterForReport.name}</strong></p>
              <p style={{ fontSize: '12px', color: '#777' }}>Generado el: {new Date().toLocaleDateString('es-ES')}</p>
            </div>

            {/* Stats Summary Cards */}
            {(() => {
              const tBets = bets.filter(b => b.tipster_id === selectedTipsterForReport.id);
              const stats = calculateStats(tBets);
              
              // Process Sports Data
              const sportsMap = {};
              tBets.forEach(b => {
                sportsMap[b.sport] = (sportsMap[b.sport] || 0) + 1;
              });
              const sportsData = Object.keys(sportsMap).map(name => ({ name, value: sportsMap[name] }));

              // Process Bookmaker Data
              const bookiesMap = {};
              tBets.forEach(b => {
                bookiesMap[b.bookmaker] = (bookiesMap[b.bookmaker] || 0) + 1;
              });
              const bookiesData = Object.keys(bookiesMap).map(name => ({ name, value: bookiesMap[name] }));

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* KPI Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-glass)', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Beneficio Neto</span>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: stats.netProfit >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)', marginTop: '4px' }}>
                        {stats.netProfit >= 0 ? '+' : ''}{stats.netProfit.toFixed(2)}€
                      </div>
                    </div>

                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-glass)', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Yield Promedio</span>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: stats.yield >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)', marginTop: '4px' }}>
                        {stats.yield.toFixed(1)}%
                      </div>
                    </div>

                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid var(--border-glass)', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Tasa de Acierto</span>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#f3f4f6', marginTop: '4px' }}>
                        {stats.winRate.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Secondary Details Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', fontSize: '13px', borderTop: '1px solid var(--border-glass)', paddingTop: '14px' }}>
                    <div>
                      <p style={{ color: 'var(--color-text-secondary)' }}>Apuestas Resueltas: <strong style={{ color: '#f3f4f6' }}>{stats.settledCount}</strong></p>
                      <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>Récord de Apuestas: <strong style={{ color: '#f3f4f6' }}>{stats.wonCount}G / {stats.lostCount}P / {stats.voidCount}N</strong></p>
                    </div>
                    <div>
                      <p style={{ color: 'var(--color-text-secondary)' }}>Coste Mensual: <strong style={{ color: '#f3f4f6' }}>{selectedTipsterForReport.monthly_cost ? `${selectedTipsterForReport.monthly_cost.toFixed(2)}€` : 'Gratuito'}</strong></p>
                      <p style={{ color: 'var(--color-text-secondary)', marginTop: '4px' }}>Descripción: <strong style={{ color: '#f3f4f6' }}>{selectedTipsterForReport.description || 'Sin descripción'}</strong></p>
                    </div>
                  </div>

                  {/* Charts Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', borderTop: '1px solid var(--border-glass)', paddingTop: '14px' }}>
                    
                    {/* Sport Pie */}
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Distribución por Deporte</span>
                      {sportsData.length > 0 ? (
                        <div style={{ height: '140px', marginTop: '10px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={sportsData} dataKey="value" cx="50%" cy="50%" outerRadius={50} fill="var(--color-accent)">
                                {sportsData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip formatter={(value, name) => [`${value} apuestas`, name]} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', fontSize: '9px', marginTop: '6px' }}>
                            {sportsData.map((entry, index) => (
                              <span key={entry.name} style={{ color: COLORS[index % COLORS.length], fontWeight: 600 }}>● {entry.name}</span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Sin datos de deportes</div>
                      )}
                    </div>

                    {/* Bookmaker Pie */}
                    <div style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)' }}>Distribución por Casas</span>
                      {bookiesData.length > 0 ? (
                        <div style={{ height: '140px', marginTop: '10px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={bookiesData} dataKey="value" cx="50%" cy="50%" outerRadius={50} fill="var(--color-accent)">
                                {bookiesData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip formatter={(value, name) => [`${value} apuestas`, name]} />
                            </PieChart>
                          </ResponsiveContainer>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', fontSize: '9px', marginTop: '6px' }}>
                            {bookiesData.map((entry, index) => (
                              <span key={entry.name} style={{ color: COLORS[index % COLORS.length], fontWeight: 600 }}>● {entry.name}</span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Sin datos de casas</div>
                      )}
                    </div>

                  </div>

                  {/* Actions Section */}
                  <div className="no-print" style={{ display: 'flex', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button type="button" onClick={() => handleExportJSON(selectedTipsterForReport, stats)} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <FileText size={14} />
                      Exportar JSON
                    </button>
                    <button type="button" onClick={handlePrintReport} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                      <Printer size={14} />
                      Imprimir / PDF
                    </button>
                  </div>

                </div>
              );
            })()}

          </div>
        </div>,
        document.body
      )}

      {/* Print Stylesheet */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-report-area, #print-report-area * {
            visibility: visible;
          }
          #print-report-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
        }
      `}} />

    </div>
  );
};

export default Tipsters;
