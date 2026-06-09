import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  Wallet,
  Calendar,
  DollarSign
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';
import { useBetStore } from '../store/useBetStore';
import { calculateStats } from '../utils/math';
import { CustomSelect } from '../components/CustomSelect';

// Schemas
const bankrollSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  initial_balance: z.preprocess((val) => val === '' ? undefined : Number(val), z.number({ invalid_type_error: 'El saldo inicial debe ser un número' }).min(1, 'El saldo inicial debe ser al menos 1.0€')),
  description: z.string().optional().nullable()
});

const transactionSchema = z.object({
  bankroll_id: z.string().min(1, 'La banca es requerida'),
  type: z.enum(['deposit', 'withdrawal']),
  amount: z.preprocess((val) => val === '' ? undefined : Number(val), z.number({ invalid_type_error: 'La cantidad debe ser un número' }).gt(0, 'La cantidad debe ser mayor a 0')),
  date: z.string().min(1, 'La fecha es requerida'),
  description: z.string().optional().nullable()
});

const goalSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  target_amount: z.preprocess((val) => val === '' ? undefined : Number(val), z.number({ invalid_type_error: 'El objetivo debe ser un número' }).gt(0, 'El objetivo debe ser mayor a 0€')),
  target_date: z.string().min(1, 'La fecha límite es requerida')
});

export const Bankrolls = () => {
  const bankrolls = useBetStore(state => state.bankrolls);
  const bets = useBetStore(state => state.bets);
  const transactions = useBetStore(state => state.transactions);
  const goals = useBetStore(state => state.goals || []);
  const addGoal = useBetStore(state => state.addGoal);
  const deleteGoal = useBetStore(state => state.deleteGoal);

  const getBankrollChartData = (bankrollId, initialBalance) => {
    const brBets = bets.filter(b => b.bankroll_id === bankrollId);
    const brTrans = transactions.filter(t => t.bankroll_id === bankrollId);

    const events = [];

    brTrans.forEach(t => {
      events.push({
        date: t.date,
        amount: t.type === 'deposit' ? Number(t.amount) : -Number(t.amount)
      });
    });

    brBets.forEach(b => {
      const stake = Number(b.stake) || 0;
      const odds = Number(b.odds) || 0;
      
      let profit = -stake;
      if (b.status === 'won') {
        profit += (stake * odds);
      } else if (b.status === 'void') {
        profit += stake;
      }
      events.push({
        date: b.date,
        amount: profit
      });
    });

    const dateMap = {};
    events.forEach(e => {
      if (!e.date) return;
      dateMap[e.date] = (dateMap[e.date] || 0) + e.amount;
    });

    const sortedDates = Object.keys(dateMap).sort((a, b) => new Date(a) - new Date(b));
    let runningBalance = Number(initialBalance) || 0;

    const data = [
      { date: 'Inicio', balance: runningBalance }
    ];

    sortedDates.forEach(date => {
      runningBalance += dateMap[date];
      data.push({
        date: date.split('-').slice(1).join('/'),
        balance: Number(runningBalance.toFixed(2))
      });
    });

    return data;
  };

  const getBankrollBalance = useBetStore(state => state.getBankrollBalance);
  const addBankroll = useBetStore(state => state.addBankroll);
  const updateBankroll = useBetStore(state => state.updateBankroll);
  const deleteBankroll = useBetStore(state => state.deleteBankroll);
  const addTransaction = useBetStore(state => state.addTransaction);
  const setIsModalOpen = useBetStore(state => state.setIsModalOpen);

  // React Hook Form for Goals
  const { register: regGoal, handleSubmit: handleSubGoal, reset: resetGoal, formState: { errors: errGoal } } = useForm({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: '',
      target_amount: '',
      target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  });

  const handleOpenGoalModal = (bankrollId) => {
    setSelectedBankrollForGoal(bankrollId);
    resetGoal({
      title: '',
      target_amount: '',
      target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    setIsGoalModalOpen(true);
    setIsModalOpen(true);
  };

  const handleGoalSubmitDetails = async (data) => {
    try {
      await addGoal({
        bankroll_id: selectedBankrollForGoal,
        title: data.title,
        target_amount: Number(data.target_amount),
        target_date: data.target_date
      });
      setIsGoalModalOpen(false);
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  // React Hook Form for Bankroll
  const { register: regBankroll, handleSubmit: handleSubBankroll, formState: { errors: errBankroll }, reset: resetBankroll } = useForm({
    resolver: zodResolver(bankrollSchema),
    defaultValues: {
      name: '',
      initial_balance: '',
      description: ''
    }
  });

  // React Hook Form for Transaction
  const { register: regTrans, handleSubmit: handleSubTrans, formState: { errors: errTrans }, reset: resetTrans, setValue: setValueTrans, watch: watchTrans } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      bankroll_id: '',
      type: 'deposit',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    }
  });

  useEffect(() => {
    regTrans('bankroll_id');
  }, [regTrans]);

  const handleOpenAddBankroll = () => {
    setEditingBankroll(null);
    resetBankroll({
      name: '',
      initial_balance: '',
      description: ''
    });
    setIsBankrollModalOpen(true);
    setIsModalOpen(true);
  };

  const handleOpenEditBankroll = (br) => {
    setEditingBankroll(br);
    resetBankroll(br);
    setIsBankrollModalOpen(true);
    setIsModalOpen(true);
  };

  const handleBankrollSubmit = async (data) => {
    try {
      if (editingBankroll) {
        await updateBankroll({ ...editingBankroll, ...data });
      } else {
        await addBankroll(data);
      }
      setIsBankrollModalOpen(false);
      setIsModalOpen(false);
    } catch (e) {}
  };

  const handleDeleteBankroll = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta banca? Se eliminarán todas sus transacciones. No se puede borrar si contiene apuestas.')) {
      try {
        await deleteBankroll(id);
      } catch (e) {}
    }
  };

  const handleOpenTransaction = (bankrollId) => {
    setSelectedBankrollForTrans(bankrollId);
    resetTrans({
      bankroll_id: bankrollId,
      type: 'deposit',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    });
    setIsTransModalOpen(true);
    setIsModalOpen(true);
  };

  const handleTransSubmit = async (data) => {
    try {
      await addTransaction(data);
      setIsTransModalOpen(false);
      setIsModalOpen(false);
    } catch (e) {}
  };

  // Compile calculations for each bankroll card
  const bankrollDataList = useMemo(() => {
    return bankrolls.map(br => {
      const currentBalance = getBankrollBalance(br.id);
      const brBets = bets.filter(b => b.bankroll_id === br.id);
      const stats = calculateStats(brBets, [br]);
      
      const profitPercent = br.initial_balance > 0 
        ? (stats.netProfit / br.initial_balance) * 100 
        : 0;

      return {
        ...br,
        currentBalance,
        stats,
        profitPercent
      };
    });
  }, [bankrolls, bets, transactions]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '20px' }}>
      
      {/* Header */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Mis Bancas
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            Gestiona tus carteras, registra depósitos y retiros de capital.
          </p>
        </div>
        <button 
          onClick={handleOpenAddBankroll}
          className="btn btn-primary"
          style={{ gap: '6px' }}
        >
          <Plus size={18} />
          Nueva Banca
        </button>
      </div>

      {/* Cards Grid */}
      {bankrollDataList.length > 0 ? (
        <div className="grid-cols-2 animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
          {bankrollDataList.map(br => {
            // Calculate Golden Streak for this bankroll
            const brBets = bets.filter(b => b.bankroll_id === br.id && b.status !== 'pending' && b.status !== 'void').sort((a,b) => new Date(a.date) - new Date(b.date));
            let maxStreak = 0;
            let currStreak = 0;
            brBets.forEach(b => {
              if (b.status === 'won') {
                currStreak++;
                if (currStreak > maxStreak) maxStreak = currStreak;
              } else {
                currStreak = 0;
              }
            });
            const hasGoldenStreak = maxStreak >= 5;

            // Calculate Yield Master
            const hasYieldMaster = br.stats.yield >= 15 && br.stats.settledCount >= 15;

            // Calculate Max Drawdown for Hitos
            const chartData = getBankrollChartData(br.id, br.initial_balance);
            let maxBal = 0;
            let maxDD = 0;
            chartData.forEach(pt => {
              const bal = pt.balance;
              if (bal > maxBal) maxBal = bal;
              if (maxBal > 0) {
                const dd = ((maxBal - bal) / maxBal) * 100;
                if (dd > maxDD) maxDD = dd;
              }
            });
            const hasRiskControl = br.stats.settledCount >= 10 && maxDD <= 5;

            // Active Goal
            const activeGoal = goals.find(g => g.bankroll_id === br.id);
            const progressPercent = activeGoal 
              ? Math.min(100, Math.max(0, (br.stats.netProfit / activeGoal.target_amount) * 100))
              : 0;

            const daysLeft = activeGoal 
              ? Math.ceil((new Date(activeGoal.target_date) - Date.now()) / (1000 * 60 * 60 * 24))
              : 0;
            const daysText = activeGoal
              ? (daysLeft > 0 ? `Quedan ${daysLeft} días` : (daysLeft === 0 ? 'Hoy vence' : 'Vencido'))
              : '';

            // Est days to goal
            const daysActive = activeGoal
              ? Math.max(1, Math.round((Date.now() - new Date(activeGoal.created_at || br.id.split('_')[1] || Date.now()).getTime()) / (1000 * 60 * 60 * 24)))
              : 1;
            const avgDailyProfit = activeGoal ? br.stats.netProfit / daysActive : 0;
            const remainingAmt = activeGoal ? activeGoal.target_amount - br.stats.netProfit : 0;
            const estDaysToGoal = activeGoal && avgDailyProfit > 0 && remainingAmt > 0 ? Math.ceil(remainingAmt / avgDailyProfit) : null;

            return (
              <div key={br.id} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px', position: 'relative' }}>
                
                {/* Card Header */}
                <div className="flex-between">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(16, 185, 129, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--color-accent)',
                      border: '1px solid var(--border-glass-active)'
                    }}>
                      <Wallet size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>{br.name}</h3>
                      <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{br.description || 'Sin descripción'}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => handleOpenEditBankroll(br)}
                      className="btn-action-glass action-edit" 
                      title="Editar Banca"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDeleteBankroll(br.id)}
                      className="btn-action-glass action-delete" 
                      title="Eliminar Banca"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Balances Display */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saldo Disponible</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: br.currentBalance >= br.initial_balance ? '#10b981' : '#ef4444' }}>
                      {br.currentBalance.toFixed(2)}€
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Saldo Inicial</span>
                    <div style={{ fontSize: '24px', fontWeight: 800, color: '#f3f4f6' }}>
                      {Number(br.initial_balance).toFixed(2)}€
                    </div>
                  </div>
                </div>

                {/* Evolution Chart */}
                <div style={{ height: '110px', width: '100%', margin: '4px 0' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <defs>
                        <linearGradient id={`colorBalance-${br.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" hide={true} />
                      <YAxis hide={true} domain={['dataMin - 50', 'dataMax + 50']} />
                      <Tooltip 
                        contentStyle={{ 
                          background: 'rgba(17, 24, 39, 0.85)', 
                          border: '1px solid var(--border-glass)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontSize: '11px',
                          padding: '6px 10px'
                        }}
                        formatter={(value) => [`${value.toFixed(2)}€`, 'Saldo']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="balance" 
                        stroke="var(--color-accent)" 
                        strokeWidth={1.5}
                        fillOpacity={1} 
                        fill={`url(#colorBalance-${br.id})`} 
                        isAnimationActive={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
                  <div style={{ padding: '8px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Rentabilidad</span>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: br.stats.netProfit >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)', display: 'flex', alignItems: 'center', justifySelf: 'center', gap: '4px' }}>
                      {br.stats.netProfit >= 0 ? <ArrowUpRight size={14} style={{ color: 'var(--color-emerald)' }} /> : <ArrowDownRight size={14} style={{ color: 'var(--color-crimson)' }} />}
                      {br.profitPercent.toFixed(1)}%
                    </div>
                  </div>

                  <div style={{ padding: '8px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Yield</span>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: br.stats.yield >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)' }}>
                      {br.stats.yield.toFixed(1)}%
                    </div>
                  </div>

                  <div style={{ padding: '8px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>Apuestas</span>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#f3f4f6' }}>
                      {br.stats.settledCount + br.stats.pendingCount}
                    </div>
                  </div>
                </div>

                {/* Active Goal or Define Goal Button */}
                {activeGoal ? (
                  <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.01)', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                    <div className="flex-between" style={{ marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        🎯 Meta: {activeGoal.title}
                      </span>
                      <button 
                        onClick={() => deleteGoal(activeGoal.id)}
                        title="Eliminar meta"
                        aria-label="Eliminar meta"
                        style={{ border: 'none', background: 'transparent', color: 'var(--color-crimson)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    
                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.03)', overflow: 'hidden', border: '1px solid var(--border-glass)', marginBottom: '6px' }}>
                      <div style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: 'var(--color-accent)', borderRadius: '4px', boxShadow: 'var(--shadow-glow)', transition: 'width 0.4s ease' }} />
                    </div>
                    
                    <div className="flex-between" style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      <span>{br.stats.netProfit.toFixed(2)}€ / {activeGoal.target_amount.toFixed(2)}€ ({progressPercent.toFixed(1)}%)</span>
                      <span style={{ fontWeight: 600, color: daysLeft > 0 ? 'var(--color-accent)' : 'var(--color-crimson)' }}>
                        {daysText} {estDaysToGoal !== null ? `(Est. ${estDaysToGoal}d)` : ''}
                      </span>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => handleOpenGoalModal(br.id)}
                    className="btn btn-secondary"
                    style={{ width: '100%', fontSize: '11px', padding: '8px', borderStyle: 'dashed', borderColor: 'var(--border-glass-active)', background: 'rgba(16, 185, 129, 0.02)', color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 600 }}
                  >
                    🎯 Definir Meta de Rendimiento
                  </button>
                )}

                {/* Milestones / Hitos Badge Grid */}
                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Hitos de Banca</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {/* Duplicada */}
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: '20px',
                      fontSize: '10px',
                      fontWeight: 600,
                      backgroundColor: br.stats.netProfit >= br.initial_balance && br.initial_balance > 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${br.stats.netProfit >= br.initial_balance && br.initial_balance > 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.04)'}`,
                      color: br.stats.netProfit >= br.initial_balance && br.initial_balance > 0 ? '#10b981' : 'var(--color-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      opacity: br.stats.netProfit >= br.initial_balance && br.initial_balance > 0 ? 1 : 0.4
                    }} title={br.stats.netProfit >= br.initial_balance && br.initial_balance > 0 ? '¡Has duplicado tu saldo inicial!' : 'Duplica tu saldo inicial para desbloquear'}>
                      <span>🏆</span> Duplicada
                    </div>

                    {/* Racha Dorada */}
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: '20px',
                      fontSize: '10px',
                      fontWeight: 600,
                      backgroundColor: hasGoldenStreak ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${hasGoldenStreak ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.04)'}`,
                      color: hasGoldenStreak ? '#f59e0b' : 'var(--color-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      opacity: hasGoldenStreak ? 1 : 0.4
                    }} title={hasGoldenStreak ? '¡5 o más victorias consecutivas en esta banca!' : 'Logra una racha de 5 victorias para desbloquear'}>
                      <span>🔥</span> Racha Dorada
                    </div>

                    {/* Yield Maestro */}
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: '20px',
                      fontSize: '10px',
                      fontWeight: 600,
                      backgroundColor: hasYieldMaster ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${hasYieldMaster ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255,255,255,0.04)'}`,
                      color: hasYieldMaster ? '#a78bfa' : 'var(--color-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      opacity: hasYieldMaster ? 1 : 0.4
                    }} title={hasYieldMaster ? '¡Yield superior al 15% con al menos 15 apuestas resueltas!' : 'Mantén un Yield > 15% con 15+ apuestas resueltas'}>
                      <span>💡</span> Yield Maestro
                    </div>

                    {/* Control de Riesgo */}
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: '20px',
                      fontSize: '10px',
                      fontWeight: 600,
                      backgroundColor: hasRiskControl ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${hasRiskControl ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.04)'}`,
                      color: hasRiskControl ? '#3b82f6' : 'var(--color-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      opacity: hasRiskControl ? 1 : 0.4
                    }} title={hasRiskControl ? '¡Mantuviste tu drawdown máximo inferior al 5% en 10+ apuestas!' : 'Mantén tu Drawdown Máximo <= 5% con 10+ apuestas resueltas'}>
                      <span>🛡️</span> Risk Control
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button 
                    onClick={() => handleOpenTransaction(br.id)}
                    className="btn btn-secondary"
                    style={{ width: '100%', fontSize: '13px', padding: '8px 12px' }}
                  >
                    Registrar Depósito / Retiro
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          No tienes bancas registradas. ¡Haz clic en "Nueva Banca" para empezar a gestionar tus capitales!
        </div>
      )}

      {/* Add / Edit Bankroll Modal */}
      {isBankrollModalOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            
            {/* Header */}
            <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#f3f4f6' }}>
                {editingBankroll ? 'Editar Banca' : 'Crear Nueva Banca'}
              </h3>
              <button onClick={() => { setIsBankrollModalOpen(false); setIsModalOpen(false); }} className="btn-icon" style={{ border: 'none', background: 'transparent' }}>
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubBankroll(handleBankrollSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="form-group">
                <label className="form-label">Nombre de la Banca</label>
                <input 
                  type="text" 
                  placeholder="Ej. Banca Principal, Retos NBA" 
                  className="form-input"
                  {...regBankroll('name')}
                />
                {errBankroll.name && <span className="form-error">{errBankroll.name.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Saldo Inicial (€)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="500.00" 
                  className="form-input"
                  disabled={!!editingBankroll}
                  {...regBankroll('initial_balance')}
                />
                {errBankroll.initial_balance && <span className="form-error">{errBankroll.initial_balance.message}</span>}
                {editingBankroll && <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>El saldo inicial no se puede modificar directamente. Realiza un Depósito o Retiro.</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <textarea 
                  placeholder="Describe la estrategia o el propósito de esta banca..." 
                  className="form-input"
                  rows={3}
                  {...regBankroll('description')}
                  style={{ resize: 'none', fontFamily: 'inherit' }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <button type="button" onClick={() => { setIsBankrollModalOpen(false); setIsModalOpen(false); }} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingBankroll ? 'Guardar Cambios' : 'Crear Banca'}
                </button>
              </div>

            </form>

          </div>
        </div>,
        document.body
      )}

      {/* Transaction Modal (Deposit/Withdrawal) */}
      {isTransModalOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            
            {/* Header */}
            <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#f3f4f6' }}>
                Registrar Transacción
              </h3>
              <button onClick={() => { setIsTransModalOpen(false); setIsModalOpen(false); }} className="btn-icon" style={{ border: 'none', background: 'transparent' }}>
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubTrans(handleTransSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="form-group">
                <label className="form-label">Banca</label>
                <CustomSelect
                  value={watchTrans('bankroll_id')}
                  onChange={(val) => setValueTrans('bankroll_id', val)}
                  disabled={true}
                  options={bankrolls.map(br => ({
                    value: br.id,
                    label: br.name
                  }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Transacción</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ 
                    flex: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    backgroundColor: 'rgba(255, 255, 255, 0.02)', 
                    border: '1px solid var(--border-glass)',
                    cursor: 'pointer' 
                  }}>
                    <input type="radio" value="deposit" {...regTrans('type')} style={{ accentColor: 'var(--color-emerald)' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-emerald)' }}>Depósito</span>
                  </label>
                  <label style={{ 
                    flex: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    backgroundColor: 'rgba(255, 255, 255, 0.02)', 
                    border: '1px solid var(--border-glass)',
                    cursor: 'pointer' 
                  }}>
                    <input type="radio" value="withdrawal" {...regTrans('type')} style={{ accentColor: 'var(--color-crimson)' }} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-crimson)' }}>Retiro</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Cantidad (€)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="100.00" 
                  className="form-input"
                  {...regTrans('amount')}
                />
                {errTrans.amount && <span className="form-error">{errTrans.amount.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input 
                  type="date" 
                  className="form-input"
                  {...regTrans('date')}
                />
                {errTrans.date && <span className="form-error">{errTrans.date.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Descripción</label>
                <input 
                  type="text" 
                  placeholder="Ej. Aporte de ganancias, Retiro para gastos" 
                  className="form-input"
                  {...regTrans('description')}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <button type="button" onClick={() => { setIsTransModalOpen(false); setIsModalOpen(false); }} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Registrar
                </button>
              </div>

            </form>

          </div>
        </div>,
        document.body
      )}

      {/* Add Goal Modal */}
      {isGoalModalOpen && createPortal(
        <div className="modal-overlay">
          <div className="modal-content glass-panel" style={{ maxWidth: '400px' }}>
            
            {/* Header */}
            <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#f3f4f6' }}>
                Definir Meta de Rendimiento
              </h3>
              <button onClick={() => { setIsGoalModalOpen(false); setIsModalOpen(false); }} className="btn-icon" style={{ border: 'none', background: 'transparent' }}>
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubGoal(handleGoalSubmitDetails)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div className="form-group">
                <label className="form-label" htmlFor="goal-title">Título de la Meta</label>
                <input 
                  id="goal-title"
                  type="text" 
                  placeholder="Ej. Doblar Banca, Meta de Verano" 
                  className="form-input"
                  {...regGoal('title')}
                />
                {errGoal.title && <span className="form-error">{errGoal.title.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="goal-target">Objetivo de Beneficio (€)</label>
                <input 
                  id="goal-target"
                  type="number" 
                  step="0.01" 
                  placeholder="500.00" 
                  className="form-input"
                  {...regGoal('target_amount')}
                />
                {errGoal.target_amount && <span className="form-error">{errGoal.target_amount.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="goal-date">Fecha Límite</label>
                <input 
                  id="goal-date"
                  type="date" 
                  className="form-input"
                  {...regGoal('target_date')}
                />
                {errGoal.target_date && <span className="form-error">{errGoal.target_date.message}</span>}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                <button type="button" onClick={() => { setIsGoalModalOpen(false); setIsModalOpen(false); }} className="btn btn-secondary">
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Crear Meta
                </button>
              </div>

            </form>

          </div>
        </div>,
        document.body
      )}

      {/* CSS adjustments for cards */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          .grid-cols-2 {
            grid-template-columns: 1fr !important;
          }
        }
      `}} />

    </div>
  );
};

export default Bankrolls;
