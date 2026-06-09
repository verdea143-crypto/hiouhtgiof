import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Zap, Coins, TrendingUp } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

// Mock Upcoming Sports Matches & Live Odds
const GENERATE_MOCK_MATCHES = () => {
  const sports = [
    { id: 'football', name: 'Fútbol', icon: '⚽' },
    { id: 'basketball', name: 'Baloncesto', icon: '🏀' },
    { id: 'tennis', name: 'Tenis', icon: '🎾' }
  ];

  const leagues = {
    football: ['La Liga', 'Champions League', 'Premier League', 'Serie A'],
    basketball: ['NBA', 'Euroleague', 'Liga ACB'],
    tennis: ['Roland Garros', 'Wimbledon', 'ATP Masters 1000']
  };

  const teams = {
    football: [
      ['Real Madrid', 'FC Barcelona', 'La Liga'],
      ['Manchester City', 'Liverpool FC', 'Premier League'],
      ['Bayern Munich', 'PSG', 'Champions League'],
      ['Juventus', 'AC Milan', 'Serie A'],
      ['Atletico Madrid', 'Sevilla FC', 'La Liga'],
      ['Chelsea FC', 'Arsenal FC', 'Premier League']
    ],
    basketball: [
      ['Los Angeles Lakers', 'Boston Celtics', 'NBA'],
      ['Golden State Warriors', 'Miami Heat', 'NBA'],
      ['Real Madrid Baloncesto', 'FC Barcelona Lassa', 'Liga ACB'],
      ['Anadolu Efes', 'Olimpia Milano', 'Euroleague'],
      ['Dallas Mavericks', 'Phoenix Suns', 'NBA']
    ],
    tennis: [
      ['Carlos Alcaraz', 'Novak Djokovic', 'ATP Masters 1000'],
      ['Jannik Sinner', 'Daniil Medvedev', 'Roland Garros'],
      ['Rafael Nadal', 'Alexander Zverev', 'Wimbledon'],
      ['Stefanos Tsitsipas', 'Holger Rune', 'ATP Masters 1000']
    ]
  };

  const matches = [];
  const baseTime = Date.now();

  sports.forEach(sport => {
    const pairs = teams[sport.id];
    pairs.forEach((pair, idx) => {
      // Schedule games between 1 hour to 48 hours in the future
      const offsetHours = 2 + idx * 6;
      const gameTime = new Date(baseTime + offsetHours * 60 * 60 * 1000);
      
      // Generate realistic odds
      const odd1 = Number((1.2 + Math.random() * 2.5).toFixed(2));
      const oddX = sport.id === 'football' ? Number((2.8 + Math.random() * 2.2).toFixed(2)) : null;
      const odd2 = Number((1.3 + Math.random() * 3.0).toFixed(2));

      matches.push({
        id: `match_${sport.id}_${idx}`,
        sport: sport.name,
        sportId: sport.id,
        sportIcon: sport.icon,
        league: pair[2] || leagues[sport.id][idx % leagues[sport.id].length],
        homeTeam: pair[0],
        awayTeam: pair[1],
        date: gameTime.toISOString(),
        odds: {
          bet365: { '1': odd1, X: oddX, '2': odd2 },
          pinnacle: { '1': Number((odd1 * 1.02).toFixed(2)), X: oddX ? Number((oddX * 1.01).toFixed(2)) : null, '2': Number((odd2 * 1.02).toFixed(2)) },
          bwin: { '1': Number((odd1 * 0.98).toFixed(2)), X: oddX ? Number((oddX * 0.99).toFixed(2)) : null, '2': Number((odd2 * 0.97).toFixed(2)) }
        }
      });
    });
  });

  return matches;
};

export default function OddsPortal() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSport, setSelectedSport] = useState('all');
  const [selectedBookmaker, setSelectedBookmaker] = useState('bet365');

  const matches = useMemo(() => GENERATE_MOCK_MATCHES(), []);

  // Filter matches based on search term & selected sport
  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      const matchText = `${match.homeTeam} ${match.awayTeam} ${match.league} ${match.sport}`.toLowerCase();
      const matchesSearch = matchText.includes(searchTerm.toLowerCase());
      const matchesSport = selectedSport === 'all' || match.sportId === selectedSport;
      return matchesSearch && matchesSport;
    });
  }, [matches, searchTerm, selectedSport]);

  const handleQuickBet = (match, bookmaker, label, odd) => {
    const prefillData = {
      partido: `${match.homeTeam} vs ${match.awayTeam}`,
      deporte: match.sport,
      odds: odd,
      casa: bookmaker.toUpperCase(),
      competicion: match.league,
      mercado: `Ganador del Partido (${label})`
    };

    // Redirect to bets route and pass prefill details in state
    navigate('/bets', { state: { prefill: prefillData } });
  };

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleString('es-ES', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', paddingBottom: '100px' }}>
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            Portal de <span style={{ color: 'var(--color-accent)' }}>Cuotas</span> en Vivo
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Compara cuotas en tiempo real de casas premium y genera apuestas al instante.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="Buscar equipos, ligas o deportes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '36px', height: '42px' }}
          />
        </div>

        {/* Sport filter */}
        <div style={{ width: '180px' }}>
          <CustomSelect
            value={selectedSport}
            onChange={setSelectedSport}
            options={[
              { value: 'all', label: 'Todos los Deportes' },
              { value: 'football', label: '⚽ Fútbol' },
              { value: 'basketball', label: '🏀 Baloncesto' },
              { value: 'tennis', label: '🎾 Tenis' }
            ]}
          />
        </div>

        {/* Bookmaker Selector */}
        <div style={{ width: '180px' }}>
          <CustomSelect
            value={selectedBookmaker}
            onChange={setSelectedBookmaker}
            options={[
              { value: 'bet365', label: '🟢 Bet365' },
              { value: 'pinnacle', label: '🔵 Pinnacle' },
              { value: 'bwin', label: '🟡 Bwin' }
            ]}
          />
        </div>
      </div>

      {/* Grid of Matches */}
      {filteredMatches.length === 0 ? (
        <div className="glass-card flex-column" style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <Zap size={40} style={{ color: 'var(--color-accent-glow)', marginBottom: '12px' }} />
          <p style={{ fontWeight: 600 }}>No se encontraron partidos próximos.</p>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>Prueba a cambiar tus filtros de búsqueda.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {filteredMatches.map((match) => {
            const bookmakerOdds = match.odds[selectedBookmaker];
            const hasDraw = bookmakerOdds.X !== null;
            
            return (
              <div key={match.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', overflow: 'hidden' }}>
                {/* Event Top bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>{match.sportIcon}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {match.sport}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 500, backgroundColor: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-glass)' }}>
                    {match.league}
                  </span>
                </div>

                {/* Event Teams */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '4px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'start', gap: '10px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-accent)' }} />
                    <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{match.homeTeam}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'start', gap: '10px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-text-muted)' }} />
                    <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{match.awayTeam}</span>
                  </div>
                </div>

                {/* Event Date */}
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingUp size={12} style={{ color: 'var(--color-accent)' }} />
                  <span>Empieza: {formatDate(match.date)}</span>
                </div>

                {/* Odds Selector Grid */}
                <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px', marginTop: 'auto' }}>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Coins size={12} />
                    <span>Mercado Ganador de Partido ({selectedBookmaker.toUpperCase()})</span>
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: hasDraw ? '1fr 1fr 1fr' : '1fr 1fr', gap: '10px' }}>
                    {/* Odd 1 */}
                    <button
                      onClick={() => handleQuickBet(match, selectedBookmaker, '1', bookmakerOdds['1'])}
                      className="btn-action-glass"
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px', borderRadius: '10px', transition: 'var(--transition-smooth)' }}
                    >
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>1</span>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-accent)', marginTop: '2px' }}>{bookmakerOdds['1']}</span>
                    </button>

                    {/* Odd X (Draw) */}
                    {hasDraw && (
                      <button
                        onClick={() => handleQuickBet(match, selectedBookmaker, 'X', bookmakerOdds.X)}
                        className="btn-action-glass"
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px', borderRadius: '10px', transition: 'var(--transition-smooth)' }}
                      >
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>X</span>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: '2px' }}>{bookmakerOdds.X}</span>
                      </button>
                    )}

                    {/* Odd 2 */}
                    <button
                      onClick={() => handleQuickBet(match, selectedBookmaker, '2', bookmakerOdds['2'])}
                      className="btn-action-glass"
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px', borderRadius: '10px', transition: 'var(--transition-smooth)' }}
                    >
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>2</span>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-accent)', marginTop: '2px' }}>{bookmakerOdds['2']}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
