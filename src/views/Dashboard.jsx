import React, { useState, useMemo, useRef } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Award, 
  BarChart3, 
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp as GainIcon,
  TrendingDown as LossIcon,
  AlertTriangle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { useBetStore } from '../store/useBetStore';
import { calculateStats, getBetProfit } from '../utils/math';
import { CustomSelect } from '../components/CustomSelect';
import { detectarRachaNegativa } from '../utils/rachaAlert';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#14b8a6'];

export const Dashboard = () => {
  const bets = useBetStore(state => state.bets);
  const bankrolls = useBetStore(state => state.bankrolls);
  const tipsters = useBetStore(state => state.tipsters);
  const themeAccent = useBetStore(state => state.themeAccent);
  const taxRate = useBetStore(state => state.taxRate || 0);

  const [activeTab, setActiveTab] = useState('summary'); // summary, analytics
  
  // Date Filters State
  const [dateRange, setDateRange] = useState('all'); // all, month, prev_month, 30days, year, custom
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Helper: check if date falls in range
  const filteredBets = useMemo(() => {
    const today = new Date();
    
    return bets.filter(bet => {
      if (!bet.date) return false;
      const betDate = new Date(bet.date);
      
      switch (dateRange) {
        case 'month': {
          return betDate.getMonth() === today.getMonth() && 
                 betDate.getFullYear() === today.getFullYear();
        }
        case 'prev_month': {
          const prevMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
          const prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
          return betDate.getMonth() === prevMonth && betDate.getFullYear() === prevYear;
        }
        case '30days': {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(today.getDate() - 30);
          return betDate >= thirtyDaysAgo;
        }
        case 'year': {
          return betDate.getFullYear() === today.getFullYear();
        }
        case 'custom': {
          if (!customStart && !customEnd) return true;
          if (customStart && !customEnd) return betDate >= new Date(customStart);
          if (!customStart && customEnd) return betDate <= new Date(customEnd);
          return betDate >= new Date(customStart) && betDate <= new Date(customEnd);
        }
        case 'all':
        default:
          return true;
      }
    });
  }, [bets, dateRange, customStart, customEnd]);

  // Calculations
  const stats = useMemo(() => {
    return calculateStats(filteredBets, bankrolls);
  }, [filteredBets, bankrolls]);

  const financialSummary = useMemo(() => {
    const grossProfit = stats.netProfit;
    
    const getMonthsInRange = (betsList) => {
      if (!betsList || betsList.length === 0) return 1;
      const dates = betsList.map(b => new Date(b.date)).filter(d => !isNaN(d));
      if (dates.length === 0) return 1;
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      const yearsDiff = maxDate.getFullYear() - minDate.getFullYear();
      const monthsDiff = maxDate.getMonth() - minDate.getMonth();
      const totalMonths = (yearsDiff * 12) + monthsDiff + 1;
      return Math.max(1, totalMonths);
    };

    let months = 1;
    if (dateRange === 'month' || dateRange === 'prev_month' || dateRange === '30days') {
      months = 1;
    } else if (dateRange === 'year') {
      months = new Date().getMonth() + 1;
    } else if (dateRange === 'custom') {
      const start = customStart ? new Date(customStart) : null;
      const end = customEnd ? new Date(customEnd) : new Date();
      if (start) {
        const yearsDiff = end.getFullYear() - start.getFullYear();
        const monthsDiff = end.getMonth() - start.getMonth();
        months = Math.max(1, (yearsDiff * 12) + monthsDiff + 1);
      } else {
        months = getMonthsInRange(filteredBets);
      }
    } else {
      months = getMonthsInRange(bets);
    }

    const totalTipsterMonthlyCost = tipsters.reduce((sum, t) => sum + (Number(t.monthly_cost) || 0), 0);
    const totalTipsterCosts = totalTipsterMonthlyCost * months;
    const taxAmount = grossProfit > 0 ? (grossProfit * (taxRate / 100)) : 0;
    const netProfitReal = grossProfit - taxAmount - totalTipsterCosts;

    return {
      grossProfit,
      months,
      totalTipsterCosts,
      taxAmount,
      netProfitReal
    };
  }, [bets, filteredBets, tipsters, taxRate, dateRange, customStart, customEnd, stats.netProfit]);

  // Chart Data: Cumulative Profit over time
  const areaChartData = useMemo(() => {
    // Group profits by date
    const profitByDate = {};
    
    // Include starting point of 0
    filteredBets
      .filter(b => b.status === 'won' || b.status === 'lost')
      .forEach(bet => {
        const profit = getBetProfit(bet);
        profitByDate[bet.date] = (profitByDate[bet.date] || 0) + profit;
      });
      
    const sortedDates = Object.keys(profitByDate).sort();
    let cumulative = 0;
    
    const data = sortedDates.map(date => {
      cumulative += profitByDate[date];
      return {
        fecha: date,
        Beneficio: Number(cumulative.toFixed(2))
      };
    });
    
    // Add baseline if empty
    return data.length > 0 ? [{ fecha: 'Inicio', Beneficio: 0 }, ...data] : [{ fecha: 'Inicio', Beneficio: 0 }];
  }, [filteredBets]);

  // Chart Data: Sports distribution
  const sportsData = useMemo(() => {
    const counts = {};
    filteredBets.forEach(b => {
      if (b.sport) {
        counts[b.sport] = (counts[b.sport] || 0) + 1;
      }
    });
    return Object.keys(counts).map(name => ({
      name,
      value: counts[name]
    })).sort((a,b) => b.value - a.value);
  }, [filteredBets]);

  // Chart Data: Bookmakers distribution
  const bookmakerData = useMemo(() => {
    const counts = {};
    filteredBets.forEach(b => {
      if (b.bookmaker) {
        counts[b.bookmaker] = (counts[b.bookmaker] || 0) + 1;
      }
    });
    return Object.keys(counts).map(name => ({
      name,
      value: counts[name]
    })).sort((a,b) => b.value - a.value);
  }, [filteredBets]);

  // Recent 5 bets
  const recentBets = useMemo(() => {
    return [...filteredBets]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [filteredBets]);

  // Generate Rolling 365 Days aligned by weeks (exactly 371 days = 53 weeks)
  const heatmapData = useMemo(() => {
    const days = [];
    const today = new Date();
    
    // Start from 364 days ago
    const startDate = new Date();
    startDate.setDate(today.getDate() - 364);
    
    // Align to Monday (0 is Sunday, 1 is Monday... in JS)
    const dayOfWeek = startDate.getDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(startDate.getDate() - diffToMonday);
    
    const currentDate = new Date(startDate);
    
    // 53 weeks * 7 days = 371 cells
    for (let i = 0; i < 371; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return days;
  }, []);

  // Calculate daily profit/loss and daily bets counts
  const dailyProfits = useMemo(() => {
    const profits = {};
    bets.forEach(bet => {
      if (bet.status === 'pending' || !bet.date) return;
      
      let profit = 0;
      const stake = Number(bet.stake) || 0;
      const odds = Number(bet.odds) || 0;
      
      if (bet.status === 'won') {
        profit = stake * (odds - 1);
      } else if (bet.status === 'lost') {
        profit = -stake;
      }
      
      profits[bet.date] = (profits[bet.date] || 0) + profit;
    });
    return profits;
  }, [bets]);

  const dailyBetsCount = useMemo(() => {
    const counts = {};
    bets.forEach(bet => {
      if (bet.status === 'pending' || !bet.date) return;
      counts[bet.date] = (counts[bet.date] || 0) + 1;
    });
    return counts;
  }, [bets]);

  // Find maximum absolute daily profit to dynamically adjust color scale
  const maxAbsoluteProfit = useMemo(() => {
    let maxVal = 0;
    heatmapData.forEach(day => {
      const year = day.getFullYear();
      const month = String(day.getMonth() + 1).padStart(2, '0');
      const date = String(day.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${date}`;
      const profit = Math.abs(dailyProfits[dateStr] || 0);
      if (profit > maxVal) {
        maxVal = profit;
      }
    });
    return maxVal || 10; // Avoid division by zero, default to 10
  }, [heatmapData, dailyProfits]);

  // Calculate month labels aligned to start of weeks
  const monthLabels = useMemo(() => {
    const labels = [];
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    heatmapData.forEach((day, idx) => {
      if (idx % 7 === 0) {
        const col = idx / 7;
        if (day.getDate() <= 7) {
          labels.push({
            col,
            text: months[day.getMonth()]
          });
        }
      }
    });
    return labels;
  }, [heatmapData]);

  const getCellColorClass = (dateStr) => {
    const count = dailyBetsCount[dateStr] || 0;
    if (count === 0) return 'level-empty';
    
    const profit = dailyProfits[dateStr] || 0;
    if (profit === 0) return 'level-zero';
    
    const absProfit = Math.abs(profit);
    const fraction = absProfit / maxAbsoluteProfit;
    
    let level = 1;
    if (fraction > 0.75) level = 4;
    else if (fraction > 0.5) level = 3;
    else if (fraction > 0.25) level = 2;
    
    return profit > 0 ? `level-won-${level}` : `level-lost-${level}`;
  };

  const getCellTooltip = (day, dateStr) => {
    const profit = dailyProfits[dateStr] || 0;
    const count = dailyBetsCount[dateStr] || 0;
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = day.toLocaleDateString('es-ES', options);
    
    if (count === 0) {
      return `${formattedDate}: Sin apuestas`;
    }
    
    const sign = profit > 0 ? '+' : '';
    const betText = count === 1 ? 'apuesta' : 'apuestas';
    return `${formattedDate} | Beneficio: ${sign}${profit.toFixed(2)}€ (${count} ${betText})`;
  };

  // Drag-to-scroll mouse handlers for the heatmap
  const scrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // multiplier for scrolling speed
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const accentHex = useMemo(() => {
    const colors = {
      emerald: '#10b981',
      blue: '#3b82f6',
      violet: '#8b5cf6',
      orange: '#f59e0b',
      red: '#ef4444'
    };
    return colors[themeAccent] || '#10b981';
  }, [themeAccent]);

  // Advanced Analytics: Streaks and Records
  const advancedStats = useMemo(() => {
    const settledBets = [...bets]
      .filter(b => b.status === 'won' || b.status === 'lost')
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    let currentStreakType = null;
    let currentStreakCount = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;

    let totalOddsWon = 0;
    let countOddsWon = 0;
    let totalOddsLost = 0;
    let countOddsLost = 0;

    let largestWin = 0;
    let largestLoss = 0;

    settledBets.forEach(bet => {
      const profit = getBetProfit(bet);
      const odds = Number(bet.odds) || 0;

      if (bet.status === 'won') {
        totalOddsWon += odds;
        countOddsWon++;
        if (profit > largestWin) largestWin = profit;

        if (currentStreakType === 'won') {
          currentStreakCount++;
        } else {
          currentStreakType = 'won';
          currentStreakCount = 1;
        }
        if (currentStreakCount > maxWinStreak) {
          maxWinStreak = currentStreakCount;
        }
      } else if (bet.status === 'lost') {
        totalOddsLost += odds;
        countOddsLost++;
        const absLoss = Math.abs(profit);
        if (absLoss > largestLoss) largestLoss = absLoss;

        if (currentStreakType === 'lost') {
          currentStreakCount++;
        } else {
          currentStreakType = 'lost';
          currentStreakCount = 1;
        }
        if (currentStreakCount > maxLossStreak) {
          maxLossStreak = currentStreakCount;
        }
      }
    });

    const averageWonOdds = countOddsWon > 0 ? totalOddsWon / countOddsWon : 0;
    const averageLostOdds = countOddsLost > 0 ? totalOddsLost / countOddsLost : 0;

    let activeStreakText = 'Sin apuestas';
    if (settledBets.length > 0) {
      const lastBet = settledBets[settledBets.length - 1];
      let activeCount = 0;
      let activeType = lastBet.status;
      
      for (let i = settledBets.length - 1; i >= 0; i--) {
        if (settledBets[i].status === activeType) {
          activeCount++;
        } else {
          break;
        }
      }
      activeStreakText = `${activeCount} ${activeType === 'won' ? 'Ganadas' : 'Perdidas'}`;
    }

    return {
      maxWinStreak,
      maxLossStreak,
      activeStreakText,
      averageWonOdds,
      averageLostOdds,
      largestWin,
      largestLoss
    };
  }, [bets]);

  // Groupings by Category
  const categoryStats = useMemo(() => {
    const sportsMap = {};
    const bookmakersMap = {};
    const tipstersMap = {};

    bets.forEach(bet => {
      const sport = bet.sport || 'Desconocido';
      const bookmaker = bet.bookmaker || 'Desconocida';
      
      let tipsterName = 'Sin Tipster';
      if (bet.tipster_id) {
        const found = tipsters.find(t => t.id === bet.tipster_id);
        if (found) {
          tipsterName = found.name;
        }
      }

      const initGroup = (groupMap, key) => {
        if (!groupMap[key]) {
          groupMap[key] = {
            name: key,
            totalBets: 0,
            settledBets: 0,
            wonBets: 0,
            lostBets: 0,
            voidBets: 0,
            pendingBets: 0,
            totalStaked: 0,
            netProfit: 0
          };
        }
      };

      initGroup(sportsMap, sport);
      initGroup(bookmakersMap, bookmaker);
      initGroup(tipstersMap, tipsterName);

      const increment = (group) => {
        group.totalBets++;
        const stake = Number(bet.stake) || 0;
        const profit = getBetProfit(bet);

        if (bet.status === 'pending') {
          group.pendingBets++;
        } else {
          if (bet.status === 'void') {
            group.voidBets++;
          } else {
            group.settledBets++;
            group.totalStaked += stake;
            if (bet.status === 'won') {
              group.wonBets++;
            } else if (bet.status === 'lost') {
              group.lostBets++;
            }
          }
          group.netProfit += profit;
        }
      };

      increment(sportsMap[sport]);
      increment(bookmakersMap[bookmaker]);
      increment(tipstersMap[tipsterName]);
    });

    const formatGroups = (groupMap) => {
      return Object.values(groupMap).map(g => {
        const winRate = g.settledBets > 0 ? (g.wonBets / g.settledBets) * 100 : 0;
        const yieldVal = g.totalStaked > 0 ? (g.netProfit / g.totalStaked) * 100 : 0;
        
        const initialCapital = bankrolls.reduce((sum, br) => sum + (Number(br.initialBalance) || 0), 0);
        const roiVal = initialCapital > 0 ? (g.netProfit / initialCapital) * 100 : 0;

        return {
          ...g,
          winRate,
          yield: yieldVal,
          roi: roiVal
        };
      });
    };

    return {
      sports: formatGroups(sportsMap),
      bookmakers: formatGroups(bookmakersMap),
      tipsters: formatGroups(tipstersMap)
    };
  }, [bets, tipsters, bankrolls]);

  // Sorting
  const [sportSort, setSportSort] = useState({ field: 'netProfit', direction: 'desc' });
  const [bookmakerSort, setBookmakerSort] = useState({ field: 'netProfit', direction: 'desc' });
  const [tipsterSort, setTipsterSort] = useState({ field: 'netProfit', direction: 'desc' });

  const sortData = (data, sortConfig) => {
    return [...data].sort((a, b) => {
      let aVal = a[sortConfig.field];
      let bVal = b[sortConfig.field];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const sortedSports = useMemo(() => sortData(categoryStats.sports, sportSort), [categoryStats.sports, sportSort]);
  const sortedBookmakers = useMemo(() => sortData(categoryStats.bookmakers, bookmakerSort), [categoryStats.bookmakers, bookmakerSort]);
  const sortedTipsters = useMemo(() => sortData(categoryStats.tipsters, tipsterSort), [categoryStats.tipsters, tipsterSort]);

  const handleSort = (table, field) => {
    const getNextConfig = (current) => {
      if (current.field === field) {
        return { field, direction: current.direction === 'desc' ? 'asc' : 'desc' };
      }
      return { field, direction: 'desc' };
    };

    if (table === 'sport') setSportSort(getNextConfig(sportSort));
    if (table === 'bookmaker') setBookmakerSort(getNextConfig(bookmakerSort));
    if (table === 'tipster') setTipsterSort(getNextConfig(tipsterSort));
  };

  const renderSortHeader = (table, field, label) => {
    const config = table === 'sport' ? sportSort : table === 'bookmaker' ? bookmakerSort : tipsterSort;
    const isActive = config.field === field;
    return (
      <th 
        onClick={() => handleSort(table, field)}
        style={{ 
          cursor: 'pointer', 
          userSelect: 'none', 
          color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
          transition: 'var(--transition-smooth)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {label}
          {isActive && (config.direction === 'desc' ? ' ▼' : ' ▲')}
        </div>
      </th>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '20px' }}>
      
      {/* Header and Time Filters */}
      <div className="flex-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Panel de Control
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            Estadísticas y resumen de rendimiento financiero.
          </p>
        </div>

        {/* Temporal Filters Dropdown & Custom Range Inputs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {dateRange === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
              <input 
                type="date" 
                className="form-input" 
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '13px', width: '135px' }}
              />
              <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>a</span>
              <input 
                type="date" 
                className="form-input" 
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{ padding: '6px 10px', fontSize: '13px', width: '135px' }}
              />
            </div>
          )}
          
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} style={{ color: 'var(--color-text-secondary)' }} />
            <CustomSelect
              value={dateRange}
              onChange={(val) => {
                setDateRange(val);
                setCustomStart('');
                setCustomEnd('');
              }}
              options={[
                { value: 'all', label: 'Histórico' },
                { value: 'month', label: 'Este Mes' },
                { value: 'prev_month', label: 'Mes Anterior' },
                { value: '30days', label: 'Últimos 30 días' },
                { value: 'year', label: 'Este Año' },
                { value: 'custom', label: 'Personalizado...' }
              ]}
              style={{ width: '160px' }}
            />
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="glass-panel" style={{ padding: '6px', display: 'flex', gap: '8px', maxWidth: '380px' }}>
        {[
          { id: 'summary', label: 'Resumen General' },
          { id: 'analytics', label: 'Analíticas Avanzadas' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="btn"
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: '10px',
              backgroundColor: activeTab === tab.id ? 'var(--color-accent)' : 'transparent',
              color: activeTab === tab.id ? '#030712' : 'var(--color-text-secondary)',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'summary' ? (
        <>
          {/* Alerta de Racha Negativa */}
          {detectarRachaNegativa(bets) && (
            <div className="animate-fade-in" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '16px', 
              backgroundColor: 'rgba(239, 68, 68, 0.1)', 
              border: '1px solid rgba(239, 68, 68, 0.3)', 
              borderRadius: '12px', 
              color: '#f87171',
              fontSize: '14px',
              marginBottom: '4px'
            }}>
              <AlertTriangle size={20} style={{ color: '#ef4444', flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: 700, margin: 0 }}>Racha negativa detectada</p>
                <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>Llevas 5 o más apuestas perdidas seguidas. Considera revisar tu estrategia.</p>
              </div>
            </div>
          )}

          {/* KPI Cards Grid */}
          <div className="grid-cols-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        
        {/* Beneficio Neto Card */}
        <div className="glass-panel" style={{ 
          padding: '20px', 
          borderLeft: `4px solid ${financialSummary.netProfitReal >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)'}`,
          boxShadow: financialSummary.netProfitReal >= 0 ? '0 10px 20px -10px rgba(16,185,129,0.1)' : '0 10px 20px -10px rgba(239,68,68,0.1)'
        }}>
          <div className="flex-between" style={{ marginBottom: '6px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Beneficio Neto (Real)</span>
            {financialSummary.netProfitReal >= 0 
              ? <GainIcon size={20} style={{ color: 'var(--color-emerald)' }} />
              : <LossIcon size={20} style={{ color: 'var(--color-crimson)' }} />
            }
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: financialSummary.netProfitReal >= 0 ? '#10b981' : '#ef4444', lineHeight: 1.2 }}>
            {financialSummary.netProfitReal >= 0 ? '+' : ''}{financialSummary.netProfitReal.toFixed(2)}€
          </div>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px' }}>
            Total apostado: {stats.totalStaked.toFixed(2)}€
          </span>

          {/* Desglose Breakdown */}
          <div style={{ 
            marginTop: '8px', 
            paddingTop: '8px', 
            borderTop: '1px solid rgba(255,255,255,0.06)', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '4px', 
            fontSize: '11px', 
            color: 'var(--color-text-secondary)' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Beneficio Bruto:</span>
              <span style={{ fontWeight: 600, color: '#f3f4f6' }}>{financialSummary.grossProfit >= 0 ? '+' : ''}{financialSummary.grossProfit.toFixed(2)}€</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Impuestos ({taxRate}%):</span>
              <span style={{ fontWeight: 600, color: financialSummary.taxAmount > 0 ? 'var(--color-crimson)' : 'var(--color-text-muted)' }}>-{financialSummary.taxAmount.toFixed(2)}€</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tipsters ({financialSummary.months} {financialSummary.months === 1 ? 'mes' : 'meses'}):</span>
              <span style={{ fontWeight: 600, color: financialSummary.totalTipsterCosts > 0 ? 'var(--color-crimson)' : 'var(--color-text-muted)' }}>-{financialSummary.totalTipsterCosts.toFixed(2)}€</span>
            </div>
          </div>
        </div>

        {/* Yield Card */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #3b82f6' }}>
          <div className="flex-between" style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Yield %</span>
            <BarChart3 size={20} style={{ color: '#3b82f6' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: stats.yield >= 0 ? '#10b981' : '#ef4444' }}>
            {stats.yield >= 0 ? '+' : ''}{stats.yield.toFixed(2)}%
          </div>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            Excluye apuestas nulas/pendientes
          </span>
        </div>

        {/* ROI Card */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #8b5cf6' }}>
          <div className="flex-between" style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>ROI %</span>
            <Layers size={20} style={{ color: '#8b5cf6' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: stats.roi >= 0 ? '#10b981' : '#ef4444' }}>
            {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(2)}%
          </div>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            Sobre capital inicial de bancas
          </span>
        </div>

        {/* Win Rate Card */}
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #f59e0b' }}>
          <div className="flex-between" style={{ marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Aciertos %</span>
            <Award size={20} style={{ color: '#f59e0b' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#f3f4f6' }}>
            {stats.winRate.toFixed(1)}%
          </div>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            {stats.wonCount} G / {stats.lostCount} P ({stats.settledCount} resueltas)
          </span>
        </div>

      </div>

      {/* Performance Heatmap Card */}
      <div className="glass-panel heatmap-card">
        <div className="heatmap-header">
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6', margin: 0 }}>Mapa de Calor de Rendimiento</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px', margin: '4px 0 0 0' }}>Beneficios y pérdidas diarias de los últimos 12 meses rodantes.</p>
          </div>
          <div className="heatmap-legend">
            <span>Pérdidas</span>
            <div className="heatmap-legend-cell level-lost-4" title="Pérdida Máxima"></div>
            <div className="heatmap-legend-cell level-lost-3"></div>
            <div className="heatmap-legend-cell level-lost-2"></div>
            <div className="heatmap-legend-cell level-lost-1"></div>
            <div className="heatmap-legend-cell level-empty" title="Sin apuestas"></div>
            <div className="heatmap-legend-cell level-zero" title="Neto 0.00€"></div>
            <div className="heatmap-legend-cell level-won-1"></div>
            <div className="heatmap-legend-cell level-won-2"></div>
            <div className="heatmap-legend-cell level-won-3"></div>
            <div className="heatmap-legend-cell level-won-4" title="Ganancia Máxima"></div>
            <span>Ganancias</span>
          </div>
        </div>

        <div className="heatmap-wrapper">
          {/* Day labels */}
          <div className="heatmap-labels-days">
            <span>Lun</span>
            <span></span>
            <span>Mié</span>
            <span></span>
            <span>Vie</span>
            <span></span>
            <span>Dom</span>
          </div>

          {/* Grid Scroll container */}
          <div 
            ref={scrollRef}
            className="heatmap-grid-scroll"
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            style={{ 
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none'
            }}
          >
            <div className="heatmap-grid-container">
              {/* Month names row */}
              <div className="heatmap-months-row">
                {monthLabels.map((lbl, idx) => (
                  <span 
                    key={idx} 
                    className="heatmap-month-label" 
                    style={{ left: `${lbl.col * 13}px` }}
                  >
                    {lbl.text}
                  </span>
                ))}
              </div>

              {/* Grid cells */}
              <div className="heatmap-grid">
                {heatmapData.map((day, idx) => {
                  const year = day.getFullYear();
                  const month = String(day.getMonth() + 1).padStart(2, '0');
                  const date = String(day.getDate()).padStart(2, '0');
                  const dateStr = `${year}-${month}-${date}`;
                  
                  const colorClass = getCellColorClass(dateStr);
                  const tooltip = getCellTooltip(day, dateStr);
                  
                  return (
                    <div 
                      key={idx}
                      className={`heatmap-cell ${colorClass}`}
                      data-tooltip={tooltip}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts area */}
      <div className="grid-cols-3" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Evolution Area Chart */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>Evolución del Beneficio</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>Curva de beneficio acumulado en apuestas liquidadas.</p>
          </div>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accentHex} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={accentHex} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="fecha" stroke="#4b5563" fontSize={11} tickLine={false} />
                <YAxis stroke="#4b5563" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#161d2f', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}
                  itemStyle={{ color: 'var(--color-accent)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="Beneficio" 
                  stroke={accentHex} 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorProfit)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Pie Charts */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>Distribución</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>Reparto de actividad por deporte.</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '200px' }}>
            {sportsData.length > 0 ? (
              <div style={{ width: '100%', height: '220px', position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sportsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {sportsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#161d2f', 
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Central total label */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#f3f4f6' }}>{filteredBets.length}</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Apuestas</div>
                </div>
              </div>
            ) : (
              <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Sin datos disponibles</span>
            )}

            {/* Custom Legend */}
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              justifyContent: 'center', 
              gap: '12px', 
              marginTop: '16px',
              width: '100%',
              maxHeight: '80px',
              overflowY: 'auto'
            }}>
              {sportsData.map((item, idx) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span style={{ color: 'var(--color-text-secondary)' }}>{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Recent Bets and Secondary Info */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div className="flex-between" style={{ marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>Apuestas Recientes</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>Últimas apuestas registradas en el período seleccionado.</p>
          </div>
        </div>

        {recentBets.length > 0 ? (
          <div className="table-container">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Evento / Mercado</th>
                  <th>Deporte</th>
                  <th>Cuota</th>
                  <th>Stake</th>
                  <th>Importe / Retorno</th>
                  <th>Banca</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {recentBets.map(bet => {
                  const bName = bankrolls.find(br => br.id === bet.bankroll_id)?.name || 'Sin Banca';
                  return (
                    <tr key={bet.id}>
                      <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{bet.date}</td>
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
                      <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{bName}</td>
                      <td>
                        <span className={`badge badge-${bet.status}`}>
                          {bet.status === 'pending' ? 'Pendiente' : bet.status === 'won' ? 'Ganada' : bet.status === 'lost' ? 'Perdida' : 'Nula'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
            No hay apuestas en este rango de fechas. ¡Carga datos de prueba en Ajustes o registra una apuesta!
          </div>
        )}
      </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
          {/* Rachas & Records Grid */}
          <div className="grid-cols-4">
            {/* Racha Activa */}
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--color-accent)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Racha Activa</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: advancedStats.activeStreakText.includes('Ganadas') ? 'var(--color-emerald)' : advancedStats.activeStreakText.includes('Perdidas') ? 'var(--color-crimson)' : 'var(--color-text-primary)', marginTop: '4px' }}>
                {advancedStats.activeStreakText}
              </div>
            </div>
            
            {/* Max Racha Ganadoras */}
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--color-emerald)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Max Racha de Ganadas</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-emerald)', marginTop: '4px' }}>
                {advancedStats.maxWinStreak} consecutivas
              </div>
            </div>

            {/* Max Racha Perdidas */}
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--color-crimson)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Max Racha de Perdidas</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-crimson)', marginTop: '4px' }}>
                {advancedStats.maxLossStreak} consecutivas
              </div>
            </div>

            {/* Cuotas Medias */}
            <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid var(--color-amber)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Cuotas Medias (G/P)</span>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6', marginTop: '4px' }}>
                G: {advancedStats.averageWonOdds.toFixed(2)} / P: {advancedStats.averageLostOdds.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Récords de Apuestas */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.15)', background: 'rgba(16, 185, 129, 0.01)' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Mayor Beneficio Neto en una Apuesta</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-emerald)', marginTop: '4px' }}>
                +{advancedStats.largestWin.toFixed(2)}€
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.15)', background: 'rgba(239, 68, 68, 0.01)' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>Mayor Pérdida en una Apuesta</span>
              <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-crimson)', marginTop: '4px' }}>
                -{advancedStats.largestLoss.toFixed(2)}€
              </div>
            </div>
          </div>

          {/* Deportes breakdown */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6', marginBottom: '16px' }}>Desglose por Deporte</h3>
            <div className="table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    {renderSortHeader('sport', 'name', 'Deporte')}
                    {renderSortHeader('sport', 'totalBets', 'Apuestas')}
                    {renderSortHeader('sport', 'winRate', 'Acierto %')}
                    {renderSortHeader('sport', 'totalStaked', 'Total Apostado')}
                    {renderSortHeader('sport', 'netProfit', 'Beneficio Neto')}
                    {renderSortHeader('sport', 'yield', 'Yield %')}
                    {renderSortHeader('sport', 'roi', 'ROI %')}
                  </tr>
                </thead>
                <tbody>
                  {sortedSports.length > 0 ? (
                    sortedSports.map(g => (
                      <tr key={g.name}>
                        <td style={{ fontWeight: 600, color: '#f3f4f6' }}>{g.name}</td>
                        <td>{g.totalBets} <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>({g.pendingBets} pend.)</span></td>
                        <td style={{ fontWeight: 600 }}>{g.winRate.toFixed(1)}%</td>
                        <td>{g.totalStaked.toFixed(2)}€</td>
                        <td style={{ fontWeight: 700, color: g.netProfit >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)' }}>
                          {g.netProfit >= 0 ? '+' : ''}{g.netProfit.toFixed(2)}€
                        </td>
                        <td style={{ fontWeight: 700, color: g.yield >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)' }}>
                          {g.yield >= 0 ? '+' : ''}{g.yield.toFixed(1)}%
                        </td>
                        <td style={{ fontWeight: 700, color: g.roi >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)' }}>
                          {g.roi >= 0 ? '+' : ''}{g.roi.toFixed(1)}%
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>Sin datos disponibles</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tipsters breakdown */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6', marginBottom: '16px' }}>Desglose por Tipster</h3>
            <div className="table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    {renderSortHeader('tipster', 'name', 'Tipster')}
                    {renderSortHeader('tipster', 'totalBets', 'Apuestas')}
                    {renderSortHeader('tipster', 'winRate', 'Acierto %')}
                    {renderSortHeader('tipster', 'totalStaked', 'Total Apostado')}
                    {renderSortHeader('tipster', 'netProfit', 'Beneficio Neto')}
                    {renderSortHeader('tipster', 'yield', 'Yield %')}
                    {renderSortHeader('tipster', 'roi', 'ROI %')}
                  </tr>
                </thead>
                <tbody>
                  {sortedTipsters.length > 0 ? (
                    sortedTipsters.map(g => (
                      <tr key={g.name}>
                        <td style={{ fontWeight: 600, color: '#f3f4f6' }}>{g.name}</td>
                        <td>{g.totalBets} <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>({g.pendingBets} pend.)</span></td>
                        <td style={{ fontWeight: 600 }}>{g.winRate.toFixed(1)}%</td>
                        <td>{g.totalStaked.toFixed(2)}€</td>
                        <td style={{ fontWeight: 700, color: g.netProfit >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)' }}>
                          {g.netProfit >= 0 ? '+' : ''}{g.netProfit.toFixed(2)}€
                        </td>
                        <td style={{ fontWeight: 700, color: g.yield >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)' }}>
                          {g.yield >= 0 ? '+' : ''}{g.yield.toFixed(1)}%
                        </td>
                        <td style={{ fontWeight: 700, color: g.roi >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)' }}>
                          {g.roi >= 0 ? '+' : ''}{g.roi.toFixed(1)}%
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>Sin datos disponibles</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bookmakers breakdown */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6', marginBottom: '16px' }}>Desglose por Casa de Apuestas</h3>
            <div className="table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    {renderSortHeader('bookmaker', 'name', 'Casa de Apuestas')}
                    {renderSortHeader('bookmaker', 'totalBets', 'Apuestas')}
                    {renderSortHeader('bookmaker', 'winRate', 'Acierto %')}
                    {renderSortHeader('bookmaker', 'totalStaked', 'Total Apostado')}
                    {renderSortHeader('bookmaker', 'netProfit', 'Beneficio Neto')}
                    {renderSortHeader('bookmaker', 'yield', 'Yield %')}
                    {renderSortHeader('bookmaker', 'roi', 'ROI %')}
                  </tr>
                </thead>
                <tbody>
                  {sortedBookmakers.length > 0 ? (
                    sortedBookmakers.map(g => (
                      <tr key={g.name}>
                        <td style={{ fontWeight: 600, color: '#f3f4f6' }}>{g.name}</td>
                        <td>{g.totalBets} <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>({g.pendingBets} pend.)</span></td>
                        <td style={{ fontWeight: 600 }}>{g.winRate.toFixed(1)}%</td>
                        <td>{g.totalStaked.toFixed(2)}€</td>
                        <td style={{ fontWeight: 700, color: g.netProfit >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)' }}>
                          {g.netProfit >= 0 ? '+' : ''}{g.netProfit.toFixed(2)}€
                        </td>
                        <td style={{ fontWeight: 700, color: g.yield >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)' }}>
                          {g.yield >= 0 ? '+' : ''}{g.yield.toFixed(1)}%
                        </td>
                        <td style={{ fontWeight: 700, color: g.roi >= 0 ? 'var(--color-emerald)' : 'var(--color-crimson)' }}>
                          {g.roi >= 0 ? '+' : ''}{g.roi.toFixed(1)}%
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px' }}>Sin datos disponibles</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

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

export default Dashboard;
