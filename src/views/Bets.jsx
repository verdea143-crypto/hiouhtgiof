import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  RotateCcw, 
  Search, 
  Filter,
  CheckCircle,
  XCircle,
  HelpCircle,
  MinusCircle,
  Download,
  Calculator
} from 'lucide-react';
import { useBetStore } from '../store/useBetStore';
import { CustomSelect } from '../components/CustomSelect';
import { exportToCSV } from '../utils/exportCSV';
import { calculateKelly, calculateHedging } from '../utils/math';
import { toast } from 'sonner';

// Validation Schema
const betSchema = z.object({
  sport: z.string().min(1, 'El deporte es requerido'),
  event: z.string().min(1, 'El evento es requerido'),
  market: z.string().min(1, 'El mercado es requerido'),
  odds: z.preprocess((val) => val === '' ? undefined : Number(val), z.number({ invalid_type_error: 'La cuota debe ser un número' }).gt(1, 'La cuota debe ser mayor a 1.0')),
  stake_percent: z.preprocess((val) => val === '' ? undefined : Number(val), z.number({ invalid_type_error: 'El stake (%) debe ser un número' }).gt(0, 'El stake (%) debe ser mayor a 0')),
  bookmaker: z.string().min(1, 'La casa de apuestas es requerida'),
  date: z.string().min(1, 'La fecha es requerida'),
  bankroll_id: z.string().min(1, 'Debes seleccionar una banca'),
  tipster_id: z.preprocess((val) => val === 'none' ? null : val, z.string().nullable().optional()),
  status: z.enum(['pending', 'won', 'lost', 'void']).default('pending')
});

export const Bets = () => {
  const bets = useBetStore(state => state.bets);
  const bankrolls = useBetStore(state => state.bankrolls);
  const tipsters = useBetStore(state => state.tipsters);
  const transactions = useBetStore(state => state.transactions);
  
  const addBet = useBetStore(state => state.addBet);
  const updateBet = useBetStore(state => state.updateBet);
  const deleteBet = useBetStore(state => state.deleteBet);
  const settleBet = useBetStore(state => state.settleBet);
  const setGlobalModalOpen = useBetStore(state => state.setIsModalOpen);
  const getBankrollBalance = useBetStore(state => state.getBankrollBalance);

  // States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBet, setEditingBet] = useState(null);

  // Quick Calculator States
  const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [calcTab, setCalcTab] = useState('kelly');
  const [calcKellyOdds, setCalcKellyOdds] = useState('2.00');
  const [calcKellyProb, setCalcKellyProb] = useState('50');
  const [calcKellyFraction, setCalcKellyFraction] = useState('0.5');
  const [calcHedgeStake, setCalcHedgeStake] = useState('10');
  const [calcHedgeOdds, setCalcHedgeOdds] = useState('3.00');
  const [calcHedgeLiveOdds, setCalcHedgeLiveOdds] = useState('1.80');

  const kellyResult = useMemo(() => {
    const o = parseFloat(calcKellyOdds) || 0;
    const p = parseFloat(calcKellyProb) || 0;
    const f = parseFloat(calcKellyFraction) || 0.5;
    const activeBankroll = watchBankrollId || bankrolls[0]?.id;
    const balance = activeBankroll ? getBankrollBalance(activeBankroll) : 1000;
    return calculateKelly(o, p, balance, f);
  }, [calcKellyOdds, calcKellyProb, calcKellyFraction, watchBankrollId, bankrolls, getBankrollBalance]);

  const hedgingResult = useMemo(() => {
    const s = parseFloat(calcHedgeStake) || 0;
    const o = parseFloat(calcHedgeOdds) || 0;
    const lo = parseFloat(calcHedgeLiveOdds) || 0;
    return calculateHedging(s, o, lo);
  }, [calcHedgeStake, calcHedgeOdds, calcHedgeLiveOdds]);

  const handleApplyKelly = () => {
    setValue('odds', calcKellyOdds, { shouldValidate: true });
    setValue('stake_percent', kellyResult.percentage.toFixed(1), { shouldValidate: true });
    setIsCalcOpen(false);
    toast.success("Valores de Kelly aplicados al formulario.");
  };

  const handleApplyHedge = () => {
    const activeBankroll = watchBankrollId || bankrolls[0]?.id;
    const balance = activeBankroll ? getBankrollBalance(activeBankroll) : 1000;
    const hedgePct = balance > 0 ? (hedgingResult.hedgeStake / balance) * 100 : 0;
    
    setValue('odds', calcHedgeLiveOdds, { shouldValidate: true });
    setValue('stake_percent', hedgePct.toFixed(1), { shouldValidate: true });
    setIsCalcOpen(false);
    toast.success("Valores de cobertura aplicados al formulario.");
  };
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSport, setFilterSport] = useState('all');
  const [filterBankroll, setFilterBankroll] = useState('all');
  const [filterTipster, setFilterTipster] = useState('all');

  // React Hook Form
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm({
    resolver: zodResolver(betSchema),
    defaultValues: {
      sport: '',
      event: '',
      market: '',
      odds: '',
      stake_percent: '',
      bookmaker: '',
      date: new Date().toISOString().split('T')[0],
      bankroll_id: '',
      tipster_id: 'none',
      status: 'pending'
    }
  });

  // Register manual fields for custom selects
  useEffect(() => {
    register('bankroll_id');
    register('tipster_id');
    register('status');
  }, [register]);

  // Watch bankroll and stake percent changes
  const watchBankrollId = watch('bankroll_id');
  const watchStakePercent = watch('stake_percent');

  const selectedBankrollBalance = useMemo(() => {
    if (!watchBankrollId) return 0;
    let balance = getBankrollBalance(watchBankrollId);
    if (editingBet && editingBet.bankroll_id === watchBankrollId) {
      const stake = Number(editingBet.stake) || 0;
      const odds = Number(editingBet.odds) || 0;
      let netImpact = -stake;
      if (editingBet.status === 'won') {
        netImpact += (stake * odds);
      } else if (editingBet.status === 'void') {
        netImpact += stake;
      }
      balance -= netImpact;
    }
    return balance;
  }, [getBankrollBalance, watchBankrollId, editingBet, bets, transactions]);

  const calculatedAmount = useMemo(() => {
    const pct = Number(watchStakePercent) || 0;
    if (pct <= 0 || selectedBankrollBalance <= 0) return 0;
    return (pct / 100) * selectedBankrollBalance;
  }, [watchStakePercent, selectedBankrollBalance]);

  // Unique sports lists for filter
  const sportsList = useMemo(() => {
    const sports = bets.map(b => b.sport).filter(Boolean);
    return ['all', ...new Set(sports)];
  }, [bets]);

  // Open modal for creation
  const handleOpenAdd = () => {
    setEditingBet(null);
    reset({
      sport: '',
      event: '',
      market: '',
      odds: '',
      stake_percent: '',
      bookmaker: '',
      date: new Date().toISOString().split('T')[0],
      bankroll_id: bankrolls[0]?.id || '',
      tipster_id: 'none',
      status: 'pending'
    });
    setIsModalOpen(true);
    setGlobalModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (bet) => {
    setEditingBet(bet);
    reset({
      ...bet,
      stake_percent: bet.stake_units || '',
      tipster_id: bet.tipster_id || 'none'
    });
    setIsModalOpen(true);
    setGlobalModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      const balance = selectedBankrollBalance;
      const finalStake = (Number(data.stake_percent) / 100) * balance;

      const betPayload = {
        sport: data.sport,
        event: data.event,
        market: data.market,
        odds: Number(data.odds),
        stake: finalStake,
        stake_units: Number(data.stake_percent),
        bookmaker: data.bookmaker,
        date: data.date,
        bankroll_id: data.bankroll_id,
        tipster_id: data.tipster_id === 'none' ? null : data.tipster_id,
        status: data.status
      };

      if (editingBet) {
        await updateBet({ ...editingBet, ...betPayload });
      } else {
        await addBet(betPayload);
      }
      setIsModalOpen(false);
      setGlobalModalOpen(false);
    } catch (e) {
      // toast is triggered inside store actions
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta apuesta? Esta acción afectará los saldos de la banca.')) {
      try {
        await deleteBet(id);
      } catch (e) {}
    }
  };

  // Filtered Bets
  const filteredBets = useMemo(() => {
    return bets.filter(bet => {
      const matchesSearch = 
        bet.event?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bet.market?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bet.bookmaker?.toLowerCase().includes(searchTerm.toLowerCase());
        
      const matchesStatus = filterStatus === 'all' || bet.status === filterStatus;
      const matchesSport = filterSport === 'all' || bet.sport === filterSport;
      const matchesBankroll = filterBankroll === 'all' || bet.bankroll_id === filterBankroll;
      
      const matchesTipster = filterTipster === 'all' || 
        (filterTipster === 'none' && !bet.tipster_id) || 
        bet.tipster_id === filterTipster;

      return matchesSearch && matchesStatus && matchesSport && matchesBankroll && matchesTipster;
    });
  }, [bets, searchTerm, filterStatus, filterSport, filterBankroll, filterTipster]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Title Header */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Registro de Apuestas
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            Lista detallada y gestión de tus posiciones.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {bets.length > 0 && (
            <button
              onClick={() => exportToCSV(bets)}
              className="btn btn-secondary"
              style={{ gap: '6px', display: 'flex', alignItems: 'center', borderColor: 'var(--border-glass)' }}
              aria-label="Exportar apuestas a CSV"
            >
              <Download size={18} />
              <span>Exportar CSV</span>
            </button>
          )}
          <button 
            onClick={handleOpenAdd}
            className="btn btn-primary"
            style={{ gap: '6px' }}
          >
            <Plus size={18} />
            Nueva Apuesta
          </button>
        </div>
      </div>

      {/* Warning if no bankrolls */}
      {bankrolls.length === 0 && (
        <div style={{ 
          padding: '16px', 
          backgroundColor: 'rgba(245, 158, 11, 0.1)', 
          border: '1px solid rgba(245, 158, 11, 0.3)', 
          borderRadius: '12px',
          color: 'var(--color-amber)',
          fontSize: '14px',
          fontWeight: 600
        }}>
          ⚠️ Debes crear al menos una banca en la sección de Bancas antes de poder registrar una apuesta.
        </div>
      )}

      {/* Filters Panel */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Search bar */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input 
              type="text" 
              placeholder="Buscar evento, mercado, casa..." 
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          {/* Status select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Estado:</span>
            <CustomSelect
              value={filterStatus}
              onChange={(val) => setFilterStatus(val)}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'pending', label: 'Pendientes' },
                { value: 'won', label: 'Ganadas' },
                { value: 'lost', label: 'Perdidas' },
                { value: 'void', label: 'Nulas' }
              ]}
              style={{ width: '130px' }}
            />
          </div>

          {/* Sport select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Deporte:</span>
            <CustomSelect
              value={filterSport}
              onChange={(val) => setFilterSport(val)}
              options={[
                { value: 'all', label: 'Todos' },
                ...sportsList.filter(s => s !== 'all').map(s => ({ value: s, label: s }))
              ]}
              style={{ width: '130px' }}
            />
          </div>

          {/* Bankroll select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Banca:</span>
            <CustomSelect
              value={filterBankroll}
              onChange={(val) => setFilterBankroll(val)}
              options={[
                { value: 'all', label: 'Todas' },
                ...bankrolls.map(br => ({ value: br.id, label: br.name }))
              ]}
              style={{ width: '140px' }}
            />
          </div>

          {/* Tipster select */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Tipster:</span>
            <CustomSelect
              value={filterTipster}
              onChange={(val) => setFilterTipster(val)}
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'none', label: 'Sin Tipster' },
                ...tipsters.map(t => ({ value: t.id, label: t.name }))
              ]}
              style={{ width: '140px' }}
            />
          </div>

        </div>
      </div>

      {/* Bets Table */}
      <div className="glass-panel" style={{ padding: '8px', overflow: 'hidden' }}>
        {filteredBets.length > 0 ? (
          <div className="table-container" style={{ border: 'none' }}>
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Evento / Mercado</th>
                  <th>Deporte</th>
                  <th>Cuota</th>
                  <th>Stake</th>
                  <th>Importe / Retorno</th>
                  <th>Banca / Tipster</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredBets.map(bet => {
                  const bName = bankrolls.find(br => br.id === bet.bankroll_id)?.name || 'Sin Banca';
                  const tName = tipsters.find(t => t.id === bet.tipster_id)?.name || 'Sin Tipster';
                  
                  return (
                    <tr key={bet.id} className="bet-row">
                      <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {bet.date}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#f3f4f6' }}>{bet.event}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{bet.market}</div>
                      </td>
                      <td style={{ fontSize: '14px' }}>{bet.sport}</td>
                      <td style={{ fontWeight: 600 }}>{Number(bet.odds).toFixed(2)}</td>
                      <td style={{ fontWeight: 600 }}>{bet.stake_units || '-'}</td>
                      <td style={{ fontWeight: 600 }}>
                        <div>{Number(bet.stake).toFixed(2)}€</div>
                        {bet.status === 'pending' && (
                          <div style={{ fontSize: '11px', color: 'var(--color-amber)', marginTop: '2px', fontWeight: 500 }} title="Retorno Potencial">
                            +{(Number(bet.stake) * Number(bet.odds)).toFixed(2)}€
                          </div>
                        )}
                        {bet.status === 'won' && (
                          <div style={{ fontSize: '11px', color: 'var(--color-emerald)', marginTop: '2px', fontWeight: 500 }} title="Retorno Realizado">
                            +{(Number(bet.stake) * Number(bet.odds)).toFixed(2)}€
                          </div>
                        )}
                        {bet.status === 'lost' && (
                          <div style={{ fontSize: '11px', color: 'var(--color-crimson)', marginTop: '2px', fontWeight: 500 }} title="Pérdida">
                            -{Number(bet.stake).toFixed(2)}€
                          </div>
                        )}
                        {bet.status === 'void' && (
                          <div style={{ fontSize: '11px', color: 'var(--color-slate)', marginTop: '2px', fontWeight: 500 }} title="Devolución">
                            {Number(bet.stake).toFixed(2)}€
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{bName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{tName}</div>
                      </td>
                      <td>
                        <span className={`badge badge-${bet.status}`}>
                          {bet.status === 'pending' ? 'Pendiente' : bet.status === 'won' ? 'Ganada' : bet.status === 'lost' ? 'Perdida' : 'Nula'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              {/* Quick Settle Options */}
                          {bet.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '4px', borderRight: '1px solid rgba(255,255,255,0.06)', paddingRight: '8px', marginRight: '4px' }}>
                              <button 
                                onClick={() => settleBet(bet.id, 'won')}
                                className="btn-action-glass action-won" 
                                title="Marcar como Ganada"
                                aria-label="Marcar como Ganada"
                              >
                                <Check size={14} />
                              </button>
                              <button 
                                onClick={() => settleBet(bet.id, 'lost')}
                                className="btn-action-glass action-lost" 
                                title="Marcar como Perdida"
                                aria-label="Marcar como Perdida"
                              >
                                <X size={14} />
                              </button>
                              <button 
                                onClick={() => settleBet(bet.id, 'void')}
                                className="btn-action-glass action-void" 
                                title="Marcar como Nula"
                                aria-label="Marcar como Nula"
                              >
                                <MinusCircle size={14} />
                              </button>
                            </div>
                          )}

                          {bet.status !== 'pending' && (
                            <button 
                              onClick={() => settleBet(bet.id, 'pending')}
                              className="btn-action-glass action-reopen" 
                              title="Reabrir (Pendiente)"
                              aria-label="Reabrir apuesta como Pendiente"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}

                          <button 
                            onClick={() => handleOpenEdit(bet)}
                            className="btn-action-glass action-edit" 
                            title="Editar"
                            aria-label="Editar apuesta"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(bet.id)}
                            className="btn-action-glass action-delete" 
                            title="Eliminar"
                            aria-label="Eliminar apuesta"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
            No se encontraron apuestas con los filtros seleccionados.
          </div>
        )}
      </div>

      {/* Add / Edit Bet Modal */}
      {isModalOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '540px' }}>
            
            {/* Modal Header */}
            <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#f3f4f6' }}>
                {editingBet ? 'Editar Apuesta' : 'Nueva Apuesta'}
              </h3>
              <button 
                onClick={() => { setIsModalOpen(false); setGlobalModalOpen(false); }}
                className="btn-icon"
                style={{ border: 'none', background: 'transparent' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div className="grid-cols-2" style={{ gap: '14px' }}>
                <div className="form-group">
                  <label htmlFor="sport" className="form-label">Deporte</label>
                  <input 
                    id="sport"
                    type="text" 
                    placeholder="Fútbol, Tenis, etc." 
                    className="form-input"
                    {...register('sport')}
                    list="sports-datalist"
                  />
                  <datalist id="sports-datalist">
                    {sportsList.filter(s => s !== 'all').map(s => <option key={s} value={s} />)}
                  </datalist>
                  {errors.sport && <span className="form-error">{errors.sport.message}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="bookmaker" className="form-label">Casa de Apuestas</label>
                  <input 
                    id="bookmaker"
                    type="text" 
                    placeholder="Bet365, Codere, etc." 
                    className="form-input"
                    {...register('bookmaker')}
                  />
                  {errors.bookmaker && <span className="form-error">{errors.bookmaker.message}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="event" className="form-label">Evento</label>
                <input 
                  id="event"
                  type="text" 
                  placeholder="Real Madrid vs Barcelona" 
                  className="form-input"
                  {...register('event')}
                />
                {errors.event && <span className="form-error">{errors.event.message}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="market" className="form-label">Mercado / Pronóstico</label>
                <input 
                  id="market"
                  type="text" 
                  placeholder="Ganador Real Madrid, Más de 2.5 goles" 
                  className="form-input"
                  {...register('market')}
                />
                {errors.market && <span className="form-error">{errors.market.message}</span>}
              </div>

              <div className="grid-cols-2" style={{ gap: '14px' }}>
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="odds" className="form-label">Cuota</label>
                    <button
                      type="button"
                      onClick={() => {
                        const currentOdds = watch('odds');
                        if (currentOdds && !isNaN(parseFloat(currentOdds))) {
                          setCalcKellyOdds(String(currentOdds));
                        }
                        setIsCalcOpen(true);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-accent)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: 0,
                        fontWeight: 600
                      }}
                      aria-label="Abrir calculadora rápida"
                    >
                      <Calculator size={12} />
                      Calculadora
                    </button>
                  </div>
                  <input 
                    id="odds"
                    type="number" 
                    step="0.01" 
                    placeholder="1.95" 
                    className="form-input"
                    {...register('odds')}
                  />
                  {errors.odds && <span className="form-error">{errors.odds.message}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="stake_percent" className="form-label">Stake (%)</label>
                  <input 
                    id="stake_percent"
                    type="number" 
                    step="0.1" 
                    placeholder="2" 
                    className="form-input"
                    {...register('stake_percent')}
                  />
                  {errors.stake_percent && <span className="form-error">{errors.stake_percent.message}</span>}
                </div>
              </div>

              {watchBankrollId && watchStakePercent && Number(watchStakePercent) > 0 && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.15)',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#f3f4f6',
                  marginTop: '-4px',
                  marginBottom: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Operación:</span>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      ({watchStakePercent}% / 100) × {selectedBankrollBalance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '4px', marginTop: '4px' }}>
                    <span>Stake {watchStakePercent}% de {selectedBankrollBalance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€ =</span>
                    <span style={{ color: 'var(--color-emerald)', fontSize: '15px', fontWeight: 800 }}>
                      {calculatedAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--color-text-muted)', borderTop: '1px dotted rgba(255, 255, 255, 0.04)', paddingTop: '4px' }}>
                    <span>→ Cantidad a apostar:</span>
                    <span>{calculatedAmount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€</span>
                  </div>
                </div>
              )}

              <div className="grid-cols-2" style={{ gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Banca</label>
                  <CustomSelect
                    value={watch('bankroll_id')}
                    onChange={(val) => setValue('bankroll_id', val, { shouldValidate: true })}
                    options={bankrolls.map(br => ({
                      value: br.id,
                      label: `${br.name} (${getBankrollBalance(br.id).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€)`
                    }))}
                    placeholder="Selecciona banca"
                  />
                  {errors.bankroll_id && <span className="form-error">{errors.bankroll_id.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Tipster</label>
                  <CustomSelect
                    value={watch('tipster_id') || 'none'}
                    onChange={(val) => setValue('tipster_id', val)}
                    options={[
                      { value: 'none', label: 'Ninguno (Apuesta propia)' },
                      ...tipsters.map(t => ({ value: t.id, label: t.name }))
                    ]}
                  />
                </div>
              </div>

              <div className="grid-cols-2" style={{ gap: '14px' }}>
                <div className="form-group">
                  <label htmlFor="date" className="form-label">Fecha</label>
                  <input 
                    id="date"
                    type="date" 
                    className="form-input"
                    {...register('date')}
                  />
                  {errors.date && <span className="form-error">{errors.date.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Estado Inicial</label>
                  <CustomSelect
                    value={watch('status') || 'pending'}
                    onChange={(val) => setValue('status', val)}
                    options={[
                      { value: 'pending', label: 'Pendiente' },
                      { value: 'won', label: 'Ganada' },
                      { value: 'lost', label: 'Perdida' },
                      { value: 'void', label: 'Nula' }
                    ]}
                  />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); setGlobalModalOpen(false); }}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={bankrolls.length === 0}
                  className="btn btn-primary"
                >
                  {editingBet ? 'Guardar Cambios' : 'Registrar Apuesta'}
                </button>
              </div>

            </form>

          </div>
        </div>,
        document.body
      )}

      {/* Quick Calculator Modal Portal */}
      {isCalcOpen && createPortal(
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '440px', width: '90%', padding: '20px' }}>
            
            {/* Header */}
            <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Calculator size={18} style={{ color: 'var(--color-accent)' }} />
                <span>Calculadora de Apuestas</span>
              </h3>
              <button 
                type="button"
                onClick={() => setIsCalcOpen(false)} 
                className="btn-icon" 
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
                aria-label="Cerrar calculadora"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="glass-panel" style={{ padding: '4px', display: 'flex', gap: '6px', marginBottom: '16px' }}>
              {[
                { id: 'kelly', label: 'Criterio Kelly' },
                { id: 'hedging', label: 'Cobertura (Hedge)' }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCalcTab(tab.id)}
                  className="btn"
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    borderRadius: '8px',
                    backgroundColor: calcTab === tab.id ? 'var(--color-accent)' : 'transparent',
                    color: calcTab === tab.id ? '#030712' : 'var(--color-text-secondary)',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                    border: 'none'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {calcTab === 'kelly' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Cuota</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="form-input" 
                      value={calcKellyOdds} 
                      onChange={(e) => setCalcKellyOdds(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Probabilidad (%)</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="99" 
                      className="form-input" 
                      value={calcKellyProb} 
                      onChange={(e) => setCalcKellyProb(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Fracción de Kelly</label>
                  <CustomSelect
                    value={calcKellyFraction}
                    onChange={(val) => setCalcKellyFraction(val)}
                    options={[
                      { value: '1.0', label: 'Full Kelly (1.0)' },
                      { value: '0.5', label: 'Half Kelly (0.5)' },
                      { value: '0.25', label: 'Quarter Kelly (0.25)' }
                    ]}
                  />
                </div>

                <div style={{ 
                  padding: '12px', 
                  borderRadius: '10px', 
                  backgroundColor: 'rgba(16, 185, 129, 0.06)', 
                  border: '1px solid rgba(16, 185, 129, 0.12)', 
                  fontSize: '12px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '6px',
                  color: '#f3f4f6',
                  marginTop: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Stake Kelly Sugerido:</span>
                    <span style={{ fontWeight: 800, color: 'var(--color-emerald)' }}>{kellyResult.percentage.toFixed(1)}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Importe Sugerido:</span>
                    <span style={{ fontWeight: 700 }}>{kellyResult.recommendedStake.toFixed(2)}€</span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px', borderTop: '1px dotted rgba(255,255,255,0.04)', paddingTop: '4px' }}>
                    Basado en saldo disponible de {selectedBankrollBalance.toFixed(2)}€
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={handleApplyKelly} 
                  disabled={kellyResult.percentage <= 0}
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  Aplicar al Formulario
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  <div className="form-group">
                    <label className="form-label">Stake Or.</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={calcHedgeStake} 
                      onChange={(e) => setCalcHedgeStake(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cuota Or.</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={calcHedgeOdds} 
                      onChange={(e) => setCalcHedgeOdds(e.target.value)} 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cuota Cob.</label>
                    <input 
                      type="number" 
                      className="form-input" 
                      value={calcHedgeLiveOdds} 
                      onChange={(e) => setCalcHedgeLiveOdds(e.target.value)} 
                    />
                  </div>
                </div>

                <div style={{ 
                  padding: '12px', 
                  borderRadius: '10px', 
                  backgroundColor: 'rgba(16, 185, 129, 0.06)', 
                  border: '1px solid rgba(16, 185, 129, 0.12)', 
                  fontSize: '12px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '6px',
                  color: '#f3f4f6',
                  marginTop: '4px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Stake de Cobertura:</span>
                    <span style={{ fontWeight: 800, color: 'var(--color-emerald)' }}>{hedgingResult.hedgeStake.toFixed(2)}€</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Ganancia Garantizada:</span>
                    <span style={{ fontWeight: 700, color: hedgingResult.profitIfHedgeWins >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)' }}>
                      {hedgingResult.profitIfHedgeWins.toFixed(2)}€
                    </span>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={handleApplyHedge} 
                  disabled={!hedgingResult.hedgeStake || hedgingResult.hedgeStake <= 0}
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '8px' }}
                >
                  Aplicar al Formulario
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Datalist helper memoized inside hook */}
      {(() => {
        // Simple helper to memoize list of sports
        return null;
      })()}

    </div>
  );
};

// UseMemo helper import since we used useMemo inside component
import { useMemo } from 'react';

export default Bets;
