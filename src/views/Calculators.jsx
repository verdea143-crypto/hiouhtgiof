import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  HelpCircle, 
  ShieldAlert, 
  CheckCircle,
  Percent,
  Plus,
  Trash2
} from 'lucide-react';
import { useBetStore } from '../store/useBetStore';
import { 
  calculateSurebet, 
  calculateKelly, 
  calculateHedging, 
  calculateDutching,
  runMonteCarloSimulations
} from '../utils/math';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';

export const Calculators = () => {
  const bankrolls = useBetStore(state => state.bankrolls);
  const getBankrollBalance = useBetStore(state => state.getBankrollBalance);
  
  const [activeTab, setActiveTab] = useState('surebet'); // surebet, kelly, hedging, dutching, montecarlo

  // 5. MONTE CARLO STATE
  const [mcInitialCapital, setMcInitialCapital] = useState('1000');
  const [mcStakeType, setMcStakeType] = useState('percent'); // fixed, percent
  const [mcStakeValue, setMcStakeValue] = useState('2');
  const [mcOdds, setMcOdds] = useState('2.00');
  const [mcWinProb, setMcWinProb] = useState('55');
  const [mcNumBets, setMcNumBets] = useState('100');
  const [mcResults, setMcResults] = useState(null);

  const handleRunMonteCarlo = () => {
    const cap = Number(mcInitialCapital) || 1000;
    const sType = mcStakeType;
    const sVal = Number(mcStakeValue) || 2;
    const odds = Number(mcOdds) || 2.00;
    const prob = Number(mcWinProb) || 50;
    const betsCount = Math.min(250, Math.max(10, Number(mcNumBets) || 100));
    
    const results = runMonteCarloSimulations(cap, sType, sVal, odds, prob, betsCount);
    setMcResults(results);
  };

  // Run initial simulation on tab active
  useEffect(() => {
    if (activeTab === 'montecarlo' && !mcResults) {
      handleRunMonteCarlo();
    }
  }, [activeTab]);

  // 1. SUREBET STATE
  const [surebetOdds1, setSurebetOdds1] = useState('2.10');
  const [surebetOdds2, setSurebetOdds2] = useState('1.95');
  const [surebetOdds3, setSurebetOdds3] = useState('');
  const [surebetTotalStake, setSurebetTotalStake] = useState('100');
  const [surebetResults, setSurebetResults] = useState(null);

  // 2. KELLY STATE
  const [selectedBankroll, setSelectedBankroll] = useState('');
  const [kellyOdds, setKellyOdds] = useState('2.00');
  const [kellyProb, setKellyProb] = useState('55');
  const [kellyFraction, setKellyFraction] = useState('0.5'); // Half Kelly default
  const [kellyResults, setKellyResults] = useState(null);

  // 3. HEDGING STATE
  const [hedgeOrigStake, setHedgeOrigStake] = useState('50');
  const [hedgeOrigOdds, setHedgeOrigOdds] = useState('3.00');
  const [hedgeLiveOdds, setHedgeLiveOdds] = useState('1.80');
  const [hedgeResults, setHedgeResults] = useState(null);

  // 4. DUTCHING STATE
  const [dutchingMode, setDutchingMode] = useState('stake'); // stake, profit
  const [dutchingTarget, setDutchingTarget] = useState('100');
  const [dutchingRows, setDutchingRows] = useState([
    { id: '1', odds: '3.50' },
    { id: '2', odds: '4.00' }
  ]);
  const [dutchingResults, setDutchingResults] = useState(null);

  // Auto-select first bankroll for Kelly
  useEffect(() => {
    if (bankrolls.length > 0 && !selectedBankroll) {
      setSelectedBankroll(bankrolls[0].id);
    }
  }, [bankrolls, selectedBankroll]);

  // Recalculate Surebet
  useEffect(() => {
    const o1 = Number(surebetOdds1) || 0;
    const o2 = Number(surebetOdds2) || 0;
    const o3 = Number(surebetOdds3) || 0;
    const total = Number(surebetTotalStake) || 0;

    const oddsArray = o3 > 0 ? [o1, o2, o3] : [o1, o2];
    if (o1 > 0 && o2 > 0 && total > 0) {
      const results = calculateSurebet(oddsArray, total);
      setSurebetResults(results);
    } else {
      setSurebetResults(null);
    }
  }, [surebetOdds1, surebetOdds2, surebetOdds3, surebetTotalStake]);

  // Recalculate Kelly
  useEffect(() => {
    const odds = Number(kellyOdds) || 0;
    const prob = Number(kellyProb) || 0;
    const fraction = Number(kellyFraction) || 1;
    
    // Get bankroll value (fallback to 1000 if none)
    let bankrollValue = 1000;
    if (selectedBankroll) {
      bankrollValue = getBankrollBalance(selectedBankroll);
    }

    if (odds > 1 && prob > 0 && bankrollValue > 0) {
      const results = calculateKelly(odds, prob, bankrollValue, fraction);
      setKellyResults({ ...results, bankrollValue });
    } else {
      setKellyResults(null);
    }
  }, [selectedBankroll, kellyOdds, kellyProb, kellyFraction, bankrolls]);

  // Recalculate Hedging
  useEffect(() => {
    const stake = Number(hedgeOrigStake) || 0;
    const oOdds = Number(hedgeOrigOdds) || 0;
    const lOdds = Number(hedgeLiveOdds) || 0;

    if (stake > 0 && oOdds > 1 && lOdds > 1) {
      const results = calculateHedging(stake, oOdds, lOdds);
      setHedgeResults(results);
    } else {
      setHedgeResults(null);
    }
  }, [hedgeOrigStake, hedgeOrigOdds, hedgeLiveOdds]);

  // Recalculate Dutching
  useEffect(() => {
    const oddsArray = dutchingRows.map(r => Number(r.odds) || 0);
    const target = Number(dutchingTarget) || 0;

    if (oddsArray.filter(o => o > 1).length > 0 && target > 0) {
      const results = calculateDutching(oddsArray, target, dutchingMode);
      setDutchingResults(results);
    } else {
      setDutchingResults(null);
    }
  }, [dutchingRows, dutchingTarget, dutchingMode]);

  // Dutching Rows Handlers
  const handleAddDutchingRow = () => {
    if (dutchingRows.length < 6) {
      setDutchingRows([...dutchingRows, { id: Math.random().toString(), odds: '' }]);
    }
  };

  const handleRemoveDutchingRow = (id) => {
    if (dutchingRows.length > 2) {
      setDutchingRows(dutchingRows.filter(r => r.id !== id));
    }
  };

  const handleDutchingOddsChange = (id, val) => {
    setDutchingRows(dutchingRows.map(r => r.id === id ? { ...r, odds: val } : r));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '20px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800, letterSpacing: '-0.5px' }}>
          Calculadoras de Apuestas
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          Herramientas matemáticas para optimizar tus stakes y coberturas.
        </p>
      </div>

      {/* Tabs Selector */}
      <div className="glass-panel" style={{ padding: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { id: 'surebet', label: 'Arbitraje (Surebet)' },
          { id: 'kelly', label: 'Criterio de Kelly' },
          { id: 'hedging', label: 'Cobertura (Hedging)' },
          { id: 'dutching', label: 'Dutching' },
          { id: 'montecarlo', label: 'Simulador Monte Carlo' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="btn"
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '10px',
              backgroundColor: activeTab === tab.id ? 'var(--color-emerald)' : 'transparent',
              color: activeTab === tab.id ? '#030712' : 'var(--color-text-secondary)',
              fontWeight: 600,
              fontSize: '14px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Calculator Body Panels */}
      <div className="grid-cols-3" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '24px' }}>
        
        {/* 1. SUREBET PANEL */}
        {activeTab === 'surebet' && (
          <>
            {/* Inputs */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>Entradas</h3>
              
              <div className="form-group">
                <label className="form-label">Cuota Resultado 1</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={surebetOdds1} 
                  onChange={(e) => setSurebetOdds1(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cuota Resultado 2</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={surebetOdds2} 
                  onChange={(e) => setSurebetOdds2(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cuota Resultado 3 (Opcional)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="Sin tercer resultado"
                  value={surebetOdds3} 
                  onChange={(e) => setSurebetOdds3(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Importe Total a Invertir (€)</label>
                <input 
                  type="number" 
                  value={surebetTotalStake} 
                  onChange={(e) => setSurebetTotalStake(e.target.value)} 
                  className="form-input" 
                />
              </div>
            </div>

            {/* Outputs */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>Distribución de Arbitraje</h3>
              
              {surebetResults ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Status Indicator */}
                  <div style={{ 
                    padding: '16px', 
                    borderRadius: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    backgroundColor: surebetResults.isArbitrage ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: `1px solid ${surebetResults.isArbitrage ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                    color: surebetResults.isArbitrage ? 'var(--color-emerald)' : 'var(--color-crimson)'
                  }}>
                    {surebetResults.isArbitrage ? <CheckCircle size={20} /> : <ShieldAlert size={20} />}
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        {surebetResults.isArbitrage ? '¡Arbitraje Detectado (Surebet)!' : 'No hay arbitraje disponible'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        Retorno implícito: {surebetResults.profitPercent.toFixed(2)}% (Probabilidad total: {(surebetResults.totalImpliedProb * 100).toFixed(1)}%)
                      </div>
                    </div>
                  </div>

                  {/* Distribution Table */}
                  <div className="table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>Resultado</th>
                          <th>Cuota</th>
                          <th>Inversión</th>
                          <th>Retorno</th>
                          <th>Beneficio Neto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {surebetResults.stakes.map((stake, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600, color: '#f3f4f6' }}>Opción {idx + 1}</td>
                            <td>{idx === 0 ? surebetOdds1 : idx === 1 ? surebetOdds2 : surebetOdds3}</td>
                            <td style={{ fontWeight: 700 }}>{stake.toFixed(2)}€</td>
                            <td>{surebetResults.payouts[idx].toFixed(2)}€</td>
                            <td style={{ fontWeight: 700, color: surebetResults.profits[idx] >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)' }}>
                              {surebetResults.profits[idx] >= 0 ? '+' : ''}{surebetResults.profits[idx].toFixed(2)}€
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                    💡 <strong>Cómo funciona:</strong> Distribuyendo los importes de inversión exactamente como se indica arriba, tienes garantizado un retorno del <strong>{surebetResults.profitPercent.toFixed(2)}%</strong> del capital total apostado, sin importar cuál de las opciones resulte ganadora.
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                  Introduce cuotas válidas mayores a 1.0 para calcular los repartos.
                </div>
              )}
            </div>
          </>
        )}

        {/* 2. KELLY CRITERION PANEL */}
        {activeTab === 'kelly' && (
          <>
            {/* Inputs */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>Entradas</h3>
              
              <div className="form-group">
                <label className="form-label">Seleccionar Banca</label>
                {bankrolls.length > 0 ? (
                  <select 
                    className="form-input" 
                    value={selectedBankroll}
                    onChange={(e) => setSelectedBankroll(e.target.value)}
                  >
                    {bankrolls.map(br => (
                      <option key={br.id} value={br.id}>{br.name} ({getBankrollBalance(br.id).toFixed(1)}€)</option>
                    ))}
                  </select>
                ) : (
                  <span style={{ fontSize: '12px', color: 'var(--color-crimson)' }}>No tienes bancas creadas. Se simula una banca de 1000€.</span>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Cuota del Evento</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={kellyOdds} 
                  onChange={(e) => setKellyOdds(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Probabilidad Estimada (%)</label>
                <input 
                  type="number" 
                  max="99"
                  min="1"
                  value={kellyProb} 
                  onChange={(e) => setKellyProb(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Fracción de Kelly (Ajuste de Riesgo)</label>
                <select 
                  className="form-input" 
                  value={kellyFraction} 
                  onChange={(e) => setKellyFraction(e.target.value)}
                >
                  <option value="1">Kelly Completo (1.0) - Riesgo Máximo</option>
                  <option value="0.5">Medio Kelly (0.5) - Recomendado</option>
                  <option value="0.25">Un Cuarto Kelly (0.25) - Conservador</option>
                  <option value="0.1">Un Décimo Kelly (0.1) - Muy Conservador</option>
                </select>
              </div>
            </div>

            {/* Outputs */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>Apuesta Recomendada</h3>
              
              {kellyResults ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Results summary block */}
                  <div style={{ display: 'flex', gap: '16px' }}>
                    {/* Percentage */}
                    <div style={{ 
                      flex: 1, 
                      padding: '20px', 
                      background: 'rgba(16, 185, 129, 0.04)', 
                      border: '1px solid var(--border-glass)',
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>% de Banca</span>
                      <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-emerald)' }}>
                        {kellyResults.percentage.toFixed(2)}%
                      </div>
                    </div>
                    {/* Amount */}
                    <div style={{ 
                      flex: 1, 
                      padding: '20px', 
                      background: 'rgba(59, 130, 246, 0.04)', 
                      border: '1px solid var(--border-glass)',
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Importe Recomendado</span>
                      <div style={{ fontSize: '32px', fontWeight: 800, color: '#3b82f6' }}>
                        {kellyResults.recommendedStake.toFixed(2)}€
                      </div>
                    </div>
                  </div>

                  {/* Calculations details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '12px' }}>
                    <div className="flex-between" style={{ fontSize: '14px' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Banca de referencia:</span>
                      <span style={{ fontWeight: 600 }}>{kellyResults.bankrollValue.toFixed(2)}€</span>
                    </div>
                    <div className="flex-between" style={{ fontSize: '14px' }}>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Ventaja (Value) detectada:</span>
                      <span style={{ fontWeight: 600, color: (Number(kellyOdds) * (Number(kellyProb)/100) > 1) ? 'var(--color-emerald)' : 'var(--color-crimson)' }}>
                        {((Number(kellyOdds) * (Number(kellyProb)/100) - 1) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                    💡 <strong>Criterio de Kelly:</strong> Esta fórmula calcula la cantidad óptima a apostar basándose en tu ventaja sobre la cuota de la casa. Si la ventaja es negativa (el valor del suceso es menor a la cuota), Kelly recomendará apostar un <strong>0%</strong> (indica que la apuesta no tiene valor).
                  </div>

                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                  Introduce una cuota mayor a 1.0 y una probabilidad para ver la sugerencia de stake.
                </div>
              )}
            </div>
          </>
        )}

        {/* 3. HEDGING PANEL */}
        {activeTab === 'hedging' && (
          <>
            {/* Inputs */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>Entradas</h3>
              
              <div className="form-group">
                <label className="form-label">Importe Apuesta Original (€)</label>
                <input 
                  type="number" 
                  value={hedgeOrigStake} 
                  onChange={(e) => setHedgeOrigStake(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cuota Apuesta Original</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={hedgeOrigOdds} 
                  onChange={(e) => setHedgeOrigOdds(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cuota de Cobertura (En Vivo / Contra)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={hedgeLiveOdds} 
                  onChange={(e) => setHedgeLiveOdds(e.target.value)} 
                  className="form-input" 
                />
              </div>
            </div>

            {/* Outputs */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>Resultado de la Cobertura</h3>
              
              {hedgeResults ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Results box summary */}
                  <div style={{ 
                    padding: '16px', 
                    borderRadius: '12px', 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    border: '1px solid var(--border-glass)',
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Importe de Cobertura a Colocar</span>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--color-emerald)' }}>
                      {hedgeResults.hedgeStake.toFixed(2)}€
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      Total invertido: {hedgeResults.totalInvested.toFixed(2)}€ (Retorno garantizado: {hedgeResults.guaranteedPayout.toFixed(2)}€)
                    </span>
                  </div>

                  {/* Scenarios Comparison */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* Scenario 1 */}
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '12px', textAlign: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Si Gana la Orig.</span>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: hedgeResults.profitIfOriginalWins >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)', marginTop: '4px' }}>
                        {hedgeResults.profitIfOriginalWins >= 0 ? '+' : ''}{hedgeResults.profitIfOriginalWins.toFixed(2)}€
                      </div>
                    </div>
                    {/* Scenario 2 */}
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '12px', textAlign: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>Si Gana Cobertura</span>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: hedgeResults.profitIfHedgeWins >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)', marginTop: '4px' }}>
                        {hedgeResults.profitIfHedgeWins >= 0 ? '+' : ''}{hedgeResults.profitIfHedgeWins.toFixed(2)}€
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                    💡 <strong>Cómo funciona:</strong> Colocando el importe calculado en la contrapartida (Cobertura), aseguras el mismo retorno económico exacto pase lo que pase en el evento. Ideal para asegurar ganancias cuando la apuesta original está muy cerca de cumplirse o para mitigar pérdidas en apuestas en vivo.
                  </div>

                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                  Introduce importes y cuotas válidas para calcular la cobertura.
                </div>
              )}
            </div>
          </>
        )}

        {/* 4. DUTCHING PANEL */}
        {activeTab === 'dutching' && (
          <>
            {/* Inputs */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>Entradas</h3>
              
              <div className="form-group">
                <label className="form-label">Modo Dutching</label>
                <select className="form-input" value={dutchingMode} onChange={(e) => setDutchingMode(e.target.value)}>
                  <option value="stake">Total Stake (Repartir un importe total)</option>
                  <option value="profit">Target Profit (Ganar un importe objetivo neto)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {dutchingMode === 'stake' ? 'Importe Total a Repartir (€)' : 'Beneficio Objetivo a Ganar (€)'}
                </label>
                <input 
                  type="number" 
                  value={dutchingTarget} 
                  onChange={(e) => setDutchingTarget(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="flex-between">
                  <span className="form-label">Cuotas del Dutching</span>
                  <button 
                    onClick={handleAddDutchingRow}
                    disabled={dutchingRows.length >= 6}
                    className="btn btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '11px', gap: '4px' }}
                  >
                    <Plus size={12} /> Añadir opción
                  </button>
                </div>

                {/* Rows List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {dutchingRows.map((row, idx) => (
                    <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', width: '70px', fontWeight: 600 }}>Opción {idx + 1}:</span>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="Ej. 3.50" 
                        value={row.odds}
                        onChange={(e) => handleDutchingOddsChange(row.id, e.target.value)}
                        className="form-input"
                        style={{ flex: 1, padding: '6px 10px' }}
                      />
                      <button 
                        onClick={() => handleRemoveDutchingRow(row.id)}
                        disabled={dutchingRows.length <= 2}
                        className="btn-icon"
                        style={{ color: 'var(--color-crimson)', border: 'none', background: 'transparent' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Outputs */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>Reparto de Stakes</h3>
              
              {dutchingResults ? (
                dutchingResults.error ? (
                  <div style={{ 
                    padding: '16px', 
                    borderRadius: '12px', 
                    backgroundColor: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    color: 'var(--color-crimson)',
                    fontSize: '14px',
                    fontWeight: 600
                  }}>
                    ⚠️ {dutchingResults.error}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* General stats summary */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                      {/* Total investment required */}
                      <div style={{ 
                        flex: 1, 
                        padding: '16px', 
                        background: 'rgba(255, 255, 255, 0.02)', 
                        border: '1px solid var(--border-glass)',
                        borderRadius: '12px',
                        textAlign: 'center'
                      }}>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Inversión Total</span>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: '#f3f4f6' }}>
                          {dutchingResults.totalStake.toFixed(2)}€
                        </div>
                      </div>
                      {/* Profit */}
                      <div style={{ 
                        flex: 1, 
                        padding: '16px', 
                        background: 'rgba(16, 185, 129, 0.04)', 
                        border: '1px solid var(--border-glass)',
                        borderRadius: '12px',
                        textAlign: 'center'
                      }}>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ganancia Neta</span>
                        <div style={{ fontSize: '24px', fontWeight: 800, color: dutchingResults.profit >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)' }}>
                          +{dutchingResults.profit.toFixed(2)}€
                        </div>
                      </div>
                    </div>

                    {/* Result breakdown table */}
                    <div className="table-container">
                      <table className="premium-table">
                        <thead>
                          <tr>
                            <th>Resultado</th>
                            <th>Cuota</th>
                            <th>Stake Recomendado</th>
                            <th>Retorno bruto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dutchingRows.map((row, idx) => {
                            const stake = dutchingResults.stakes[idx] || 0;
                            return (
                              <tr key={row.id}>
                                <td style={{ fontWeight: 600, color: '#f3f4f6' }}>Opción {idx + 1}</td>
                                <td>{row.odds || '-'}</td>
                                <td style={{ fontWeight: 700, color: '#3b82f6' }}>{stake.toFixed(2)}€</td>
                                <td>{(stake * (Number(row.odds) || 0)).toFixed(2)}€</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px' }}>
                      💡 <strong>Dutching:</strong> Te permite apostar a múltiples opciones de un mismo evento de tal manera que si gana cualquiera de las opciones seleccionadas, obtienes el mismo beneficio neto. Útil en carreras de caballos, tenis (set correcto) o mercados de goleadores.
                    </div>

                  </div>
                )
              ) : (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                  Añade cuotas válidas para realizar los cálculos de dutching.
                </div>
              )}
            </div>
          </>
        )}

        {/* 5. MONTE CARLO PANEL */}
        {activeTab === 'montecarlo' && (
          <>
            {/* Inputs */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>Configuración</h3>
              
              <div className="form-group">
                <label className="form-label">Capital Inicial (€)</label>
                <input 
                  type="number" 
                  value={mcInitialCapital} 
                  onChange={(e) => setMcInitialCapital(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Stake</label>
                <select 
                  className="form-input" 
                  value={mcStakeType} 
                  onChange={(e) => setMcStakeType(e.target.value)}
                  style={{
                    backgroundColor: '#0f1420',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  <option value="percent">Porcentaje de Banca (%)</option>
                  <option value="fixed">Importe Fijo (€)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {mcStakeType === 'percent' ? 'Stake por Apuesta (%)' : 'Stake por Apuesta (€)'}
                </label>
                <input 
                  type="number" 
                  value={mcStakeValue} 
                  onChange={(e) => setMcStakeValue(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cuota Promedio</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={mcOdds} 
                  onChange={(e) => setMcOdds(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Probabilidad de Acierto (%)</label>
                <input 
                  type="number" 
                  min="1"
                  max="99"
                  value={mcWinProb} 
                  onChange={(e) => setMcWinProb(e.target.value)} 
                  className="form-input" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Apuestas a Simular</label>
                <select 
                  className="form-input" 
                  value={mcNumBets} 
                  onChange={(e) => setMcNumBets(e.target.value)}
                  style={{
                    backgroundColor: '#0f1420',
                    color: 'var(--color-text-primary)'
                  }}
                >
                  <option value="50">50 Apuestas</option>
                  <option value="100">100 Apuestas</option>
                  <option value="150">150 Apuestas</option>
                  <option value="250">250 Apuestas (Máx)</option>
                </select>
              </div>

              <button 
                onClick={handleRunMonteCarlo}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '10px' }}
              >
                Ejecutar Simulación (1,000 Corridas)
              </button>
            </div>

            {/* Outputs */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>Resultados de la Simulación</h3>
              
              {mcResults ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Results box summary grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                    {/* Ruin Probability */}
                    <div style={{ 
                      padding: '16px', 
                      background: mcResults.ruinProbability > 10 ? 'rgba(239, 68, 68, 0.04)' : 'rgba(16, 185, 129, 0.04)', 
                      border: `1px solid ${mcResults.ruinProbability > 10 ? 'rgba(239, 68, 68, 0.15)' : 'var(--border-glass)'}`,
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Riesgo de Ruina</span>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: mcResults.ruinProbability > 10 ? 'var(--color-crimson)' : 'var(--color-emerald)' }}>
                        {mcResults.ruinProbability.toFixed(1)}%
                      </div>
                    </div>
                    
                    {/* Profit Probability */}
                    <div style={{ 
                      padding: '16px', 
                      background: 'rgba(59, 130, 246, 0.04)', 
                      border: '1px solid var(--border-glass)',
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prob. Ganancia</span>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#3b82f6' }}>
                        {mcResults.profitProbability.toFixed(1)}%
                      </div>
                    </div>

                    {/* Median Final Capital */}
                    <div style={{ 
                      padding: '16px', 
                      background: 'rgba(139, 92, 246, 0.04)', 
                      border: '1px solid var(--border-glass)',
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Banca Final (P50)</span>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: '#8b5cf6' }}>
                        {mcResults.medianEndingCapital.toFixed(1)}€
                      </div>
                    </div>
                  </div>

                  {/* Graph */}
                  <div>
                    <span className="form-label" style={{ marginBottom: '10px', display: 'block' }}>Trayectorias de Banca Simuladas</span>
                    <div style={{ width: '100%', height: '240px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mcResults.chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                          <XAxis dataKey="betIndex" stroke="#4b5563" fontSize={10} tickLine={false} />
                          <YAxis stroke="#4b5563" fontSize={10} tickLine={false} />
                          <Tooltip 
                            isAnimationActive={false}
                            contentStyle={{ 
                              backgroundColor: '#161d2f', 
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '8px',
                              fontSize: '11px'
                            }}
                          />
                          {mcResults.pathsMetadata.map((p, idx) => {
                            const isSpecial = p.name.includes('Caso') || p.name.includes('Optimista') || p.name.includes('Pésimo') || p.name.includes('Mediano');
                            const strokeWidth = isSpecial ? 2 : 1;
                            const opacity = isSpecial ? 0.95 : 0.25;
                            const strokeColor = p.name.includes('Mejor') ? 'var(--color-emerald)' 
                                              : p.name.includes('Peor') ? 'var(--color-crimson)'
                                              : p.name.includes('Optimista') ? '#3b82f6'
                                              : p.name.includes('Pésimo') ? '#f59e0b'
                                              : p.name.includes('Mediano') ? '#8b5cf6'
                                              : '#9ca3af';
                            return (
                              <Line 
                                key={idx}
                                type="monotone" 
                                dataKey={p.name} 
                                stroke={strokeColor} 
                                strokeWidth={strokeWidth}
                                opacity={opacity}
                                dot={false}
                                isAnimationActive={false}
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Scenarios Comparison */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Peor Caso de la Corrida</span>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-crimson)', marginTop: '2px' }}>
                        {mcResults.worstEndingCapital.toFixed(2)}€
                      </div>
                    </div>
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-glass)', borderRadius: '10px', textAlign: 'center' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Mejor Caso de la Corrida</span>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-emerald)', marginTop: '2px' }}>
                        {mcResults.bestEndingCapital.toFixed(2)}€
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px' }}>
                    💡 <strong>Simulación Monte Carlo:</strong> Realiza 1.000 simulaciones de caminos independientes. La ruina se calcula como el porcentaje de corridas donde el balance final o intermedio cae por debajo del 1% del capital inicial. Ideal para verificar si tu stake es demasiado agresivo y arriesga la banca.
                  </div>

                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
                  Presiona el botón para ejecutar la simulación de Monte Carlo.
                </div>
              )}
            </div>
          </>
        )}

      </div>

      {/* Responsive columns layout */}
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 1024px) {
          .grid-cols-3 {
            grid-template-columns: 1fr !important;
          }
        }
      `}} />

    </div>
  );
};

export default Calculators;
