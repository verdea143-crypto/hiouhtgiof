/**
 * BetFlow Math Utilities
 */

/**
 * Calculates the net profit of a single bet.
 * @param {Object} bet 
 * @returns {number}
 */
export const getBetProfit = (bet) => {
  const stake = Number(bet.stake) || 0;
  const odds = Number(bet.odds) || 0;
  
  if (bet.status === 'won') {
    return stake * (odds - 1);
  } else if (bet.status === 'lost') {
    return -stake;
  }
  return 0; // pending or void
};

/**
 * Calculates the return/payout of a single bet.
 * @param {Object} bet 
 * @returns {number}
 */
export const getBetReturn = (bet) => {
  const stake = Number(bet.stake) || 0;
  const odds = Number(bet.odds) || 0;
  
  if (bet.status === 'won') {
    return stake * odds;
  } else if (bet.status === 'void') {
    return stake;
  }
  return 0; // pending or lost return nothing to bankroll (lost was already debited, pending is in play)
};

/**
 * Calculates aggregate stats for a list of bets and bankrolls.
 * @param {Array} bets 
 * @param {Array} bankrolls 
 * @returns {Object}
 */
export const calculateStats = (bets, bankrolls = []) => {
  // Filter out pending and void for turn-over statistics
  const settledBets = bets.filter(b => b.status === 'won' || b.status === 'lost');
  const allSettledIncludingVoid = bets.filter(b => b.status === 'won' || b.status === 'lost' || b.status === 'void');
  
  const netProfit = allSettledIncludingVoid.reduce((sum, b) => sum + getBetProfit(b), 0);
  const totalStaked = settledBets.reduce((sum, b) => sum + (Number(b.stake) || 0), 0);
  
  const yieldVal = totalStaked > 0 ? (netProfit / totalStaked) * 100 : 0;
  
  // ROI based on Bankroll initial capitals
  const initialCapital = bankrolls.reduce((sum, br) => sum + (Number(br.initialBalance) || 0), 0);
  const roiVal = initialCapital > 0 ? (netProfit / initialCapital) * 100 : 0;
  
  // Win rate
  const totalWon = settledBets.filter(b => b.status === 'won').length;
  const winRate = settledBets.length > 0 ? (totalWon / settledBets.length) * 100 : 0;
  
  return {
    netProfit,
    totalStaked,
    yield: yieldVal,
    roi: roiVal,
    winRate,
    settledCount: settledBets.length,
    wonCount: totalWon,
    lostCount: settledBets.filter(b => b.status === 'lost').length,
    voidCount: bets.filter(b => b.status === 'void').length,
    pendingCount: bets.filter(b => b.status === 'pending').length
  };
};

/**
 * Calculates Surebet / Arbitrage details.
 * @param {Array<number>} odds - Array of odds for outcomes (2 or 3)
 * @param {number} totalStake - Total money to distribute
 * @returns {Object}
 */
export const calculateSurebet = (odds, totalStake) => {
  const totalImpliedProb = odds.reduce((sum, o) => sum + (o > 0 ? 1 / o : 0), 0);
  const isArbitrage = totalImpliedProb < 1;
  const profitPercent = totalImpliedProb > 0 ? (1 / totalImpliedProb - 1) * 100 : 0;
  
  const stakes = odds.map(o => {
    if (o <= 0 || totalImpliedProb === 0) return 0;
    return (totalStake / (o * totalImpliedProb));
  });
  
  const payouts = stakes.map((s, i) => s * odds[i]);
  const profits = payouts.map(p => p - totalStake);
  
  return {
    isArbitrage,
    profitPercent,
    stakes,
    payouts,
    profits,
    totalImpliedProb
  };
};

/**
 * Calculates Kelly Criterion recommended stake percentage.
 * @param {number} odds - Bookmaker odds
 * @param {number} probability - Estimated probability (0-100)
 * @param {number} bankrollValue - Current bankroll value
 * @param {number} fraction - Kelly fraction (e.g., 0.5 for Half Kelly)
 * @returns {Object}
 */
export const calculateKelly = (odds, probability, bankrollValue, fraction = 1) => {
  const p = probability / 100;
  const q = 1 - p;
  const b = odds - 1;
  
  if (b <= 0) return { percentage: 0, recommendedStake: 0 };
  
  // Kelly Formula: f* = (bp - q) / b
  const rawPercentage = (b * p - q) / b;
  const adjustedPercentage = Math.max(0, rawPercentage * fraction * 100);
  const recommendedStake = (adjustedPercentage / 100) * bankrollValue;
  
  return {
    percentage: adjustedPercentage,
    recommendedStake
  };
};

/**
 * Calculates Hedging / Live coverage options.
 * @param {number} originalStake - Stake of the original bet
 * @param {number} originalOdds - Odds of the original bet
 * @param {number} currentCoverageOdds - Current live odds for the opposite outcome
 * @returns {Object}
 */
export const calculateHedging = (originalStake, originalOdds, currentCoverageOdds) => {
  if (originalOdds <= 0 || currentCoverageOdds <= 0) {
    return { hedgeStake: 0, guaranteedPayout: 0, profitIfOriginalWins: 0, profitIfHedgeWins: 0 };
  }
  
  const potentialPayout = originalStake * originalOdds;
  // Hedge Stake = potentialPayout / currentCoverageOdds
  const hedgeStake = potentialPayout / currentCoverageOdds;
  const totalInvested = originalStake + hedgeStake;
  
  const profitIfOriginalWins = potentialPayout - totalInvested;
  const profitIfHedgeWins = (hedgeStake * currentCoverageOdds) - totalInvested;
  
  return {
    hedgeStake,
    totalInvested,
    guaranteedPayout: potentialPayout,
    profitIfOriginalWins,
    profitIfHedgeWins
  };
};

/**
 * Calculates Dutching stakes distribution.
 * @param {Array<number>} odds - Array of odds selected
 * @param {number} targetProfitOrStake - Value for target
 * @param {string} mode - 'stake' (total stake is target) or 'profit' (payout/profit is target)
 * @returns {Object}
 */
export const calculateDutching = (odds, target, mode = 'stake') => {
  const validOdds = odds.filter(o => o > 0);
  if (validOdds.length === 0) return { stakes: [], totalStake: 0, totalReturn: 0, profit: 0 };
  
  const sumInverse = validOdds.reduce((sum, o) => sum + (1 / o), 0);
  
  let stakes = [];
  let totalStake = 0;
  let totalReturn = 0;
  let profit = 0;
  
  if (mode === 'stake') {
    totalStake = target;
    stakes = odds.map(o => {
      if (o <= 0) return 0;
      return (totalStake / o) / sumInverse;
    });
    totalReturn = sumInverse > 0 ? totalStake / sumInverse : 0;
    profit = totalReturn - totalStake;
  } else {
    // Mode is 'profit' - user wants a specific target net profit.
    // Payout = target + totalStake
    // totalStake = Target / ( (1 / sumInverse) - 1 ) -- wait, let's make it simpler:
    // We want Payout - TotalStake = Target.
    // Payout = s * o => s = Payout / o. TotalStake = Sum(s) = Payout * sumInverse.
    // So Payout - Payout * sumInverse = Target => Payout * (1 - sumInverse) = Target.
    // Payout = Target / (1 - sumInverse).
    if (sumInverse < 1) {
      totalReturn = target / (1 - sumInverse);
      totalStake = totalReturn * sumInverse;
      stakes = odds.map(o => {
        if (o <= 0) return 0;
        return totalReturn / o;
      });
      profit = target;
    } else {
      // Impossible to dutch for profit if sum of implied probabilities >= 1
      return { error: 'La probabilidad implícita total es >= 100%. Imposible dutching con beneficio.' };
    }
  }
  
  return {
    stakes,
    totalStake,
    totalReturn,
    profit
  };
};

/**
 * Simula un único trayecto de apuestas consecutivas.
 * @param {number} initialCapital 
 * @param {string} stakeType - 'fixed' o 'percent'
 * @param {number} stakeValue 
 * @param {number} odds 
 * @param {number} winProb - probabilidad decimal (0-1)
 * @param {number} numBets 
 * @returns {Array<number>} - Array de balances en cada paso
 */
export const runSingleMonteCarlo = (initialCapital, stakeType, stakeValue, odds, winProb, numBets) => {
  const balances = [initialCapital];
  let currentBalance = initialCapital;
  
  for (let i = 0; i < numBets; i++) {
    if (currentBalance < 1) {
      // Bancarrota
      balances.push(0);
      continue;
    }
    
    let stake = 0;
    if (stakeType === 'fixed') {
      stake = stakeValue;
    } else {
      stake = (stakeValue / 100) * currentBalance;
    }
    
    // Asegurar que no apostemos más de lo que tenemos
    if (stake > currentBalance) {
      stake = currentBalance;
    }
    
    const isWin = Math.random() < winProb;
    if (isWin) {
      currentBalance += stake * (odds - 1);
    } else {
      currentBalance -= stake;
    }
    
    // Control de precisión
    if (currentBalance < 0.01) {
      currentBalance = 0;
    }
    
    balances.push(Number(currentBalance.toFixed(2)));
  }
  
  return balances;
};

/**
 * Ejecuta múltiples simulaciones de Monte Carlo y calcula estadísticas agregadas.
 * @returns {Object}
 */
export const runMonteCarloSimulations = (initialCapital, stakeType, stakeValue, odds, winProbPercent, numBets, numRuns = 1000) => {
  const winProb = winProbPercent / 100;
  const runs = [];
  let bankruptCount = 0;
  let profitCount = 0;
  
  for (let i = 0; i < numRuns; i++) {
    const balances = runSingleMonteCarlo(initialCapital, stakeType, stakeValue, odds, winProb, numBets);
    runs.push(balances);
    
    const finalBalance = balances[balances.length - 1];
    if (finalBalance <= (initialCapital * 0.01) || finalBalance === 0) {
      bankruptCount++;
    }
    if (finalBalance > initialCapital) {
      profitCount++;
    }
  }
  
  // Ordenar corridas por balance final para calcular percentiles
  const sortedRuns = [...runs].sort((a, b) => a[a.length - 1] - b[b.length - 1]);
  
  const worstRun = sortedRuns[0];
  const bestRun = sortedRuns[sortedRuns.length - 1];
  const medianRun = sortedRuns[Math.floor(sortedRuns.length / 2)];
  const p10Run = sortedRuns[Math.floor(sortedRuns.length * 0.1)];
  const p90Run = sortedRuns[Math.floor(sortedRuns.length * 0.9)];
  
  // Seleccionar 5 trayectorias representativas para graficar
  const selectedPaths = [
    { name: 'Mejor Caso (Max)', path: bestRun },
    { name: 'Optimista (P90)', path: p90Run },
    { name: 'Mediano (P50)', path: medianRun },
    { name: 'Pésimo (P10)', path: p10Run },
    { name: 'Peor Caso (Min)', path: worstRun }
  ];
  
  // Agregar 3 trayectorias aleatorias para variedad visual
  for (let i = 0; i < 3; i++) {
    const idx = Math.floor(Math.random() * (sortedRuns.length - 10)) + 5;
    const run = sortedRuns[idx];
    selectedPaths.push({
      name: `Trayectoria ${i + 1}`,
      path: run,
      isRandom: true
    });
  }
  
  // Dar formato para Recharts LineChart
  const chartData = [];
  for (let step = 0; step <= numBets; step++) {
    const dataPoint = { betIndex: step };
    selectedPaths.forEach(p => {
      dataPoint[p.name] = p.path[step];
    });
    chartData.push(dataPoint);
  }
  
  return {
    ruinProbability: (bankruptCount / numRuns) * 100,
    profitProbability: (profitCount / numRuns) * 100,
    medianEndingCapital: medianRun[medianRun.length - 1],
    worstEndingCapital: worstRun[worstRun.length - 1],
    bestEndingCapital: bestRun[bestRun.length - 1],
    chartData,
    pathsMetadata: selectedPaths
  };
};

/**
 * Calculates the Max Drawdown retrospectively.
 * @param {Array} bets 
 * @param {number} initialBalance 
 * @returns {Object}
 */
export const calculateMaxDrawdown = (bets, initialBalance = 1000) => {
  const settledBets = bets
    .filter(b => b.status === 'won' || b.status === 'lost' || b.status === 'void')
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  let currentBalance = initialBalance;
  let runningPeak = initialBalance;
  let maxDDPercent = 0;
  let maxDDAbsolute = 0;

  const balanceHistory = [{ balance: currentBalance, ddPercent: 0, date: 'Inicio' }];

  settledBets.forEach(b => {
    const profit = getBetProfit(b);
    currentBalance += profit;

    if (currentBalance > runningPeak) {
      runningPeak = currentBalance;
    }

    const ddAbs = runningPeak - currentBalance;
    const ddPct = runningPeak > 0 ? (ddAbs / runningPeak) * 100 : 0;

    if (ddPct > maxDDPercent) {
      maxDDPercent = ddPct;
    }
    if (ddAbs > maxDDAbsolute) {
      maxDDAbsolute = ddAbs;
    }

    balanceHistory.push({
      balance: Number(currentBalance.toFixed(2)),
      ddPercent: Number(ddPct.toFixed(2)),
      date: b.date.split('-').slice(1).join('/')
    });
  });

  return {
    maxDDPercent: Number(maxDDPercent.toFixed(2)),
    maxDDAbsolute: Number(maxDDAbsolute.toFixed(2)),
    balanceHistory
  };
};

/**
 * Calculates the Sharpe Ratio of betting returns.
 * @param {Array} bets 
 * @returns {number}
 */
export const calculateSharpeRatio = (bets) => {
  const settledBets = bets.filter(b => b.status === 'won' || b.status === 'lost');
  if (settledBets.length < 5) return 0;

  const profits = settledBets.map(b => getBetProfit(b));
  const mean = profits.reduce((sum, p) => sum + p, 0) / profits.length;
  
  const variance = profits.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / profits.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;
  return Number((mean / stdDev).toFixed(2));
};

/**
 * Calculates the Value at Risk (95% confidence level).
 * @param {Array} bets 
 * @returns {number}
 */
export const calculateVaR95 = (bets) => {
  const settledBets = bets.filter(b => b.status === 'won' || b.status === 'lost');
  if (settledBets.length < 10) return 0;

  const profits = settledBets.map(b => getBetProfit(b)).sort((a, b) => a - b);
  const index = Math.floor(profits.length * 0.05);
  const varVal = profits[index];

  return varVal < 0 ? Number(Math.abs(varVal).toFixed(2)) : 0;
};

