import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Zap, Coins, TrendingUp, AlertTriangle } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import { useBetStore } from '../store/useBetStore';
import { LoadingSpinner } from '../components/LoadingSpinner';

// Mock Upcoming Sports Matches & Live Odds (Demo Mode Fallback)
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
      const offsetHours = 2 + idx * 6;
      const gameTime = new Date(baseTime + offsetHours * 60 * 60 * 1000);
      
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

  // Zustand Store config
  const oddsApiKey = useBetStore(state => state.oddsApiKey);
  const oddsApiEnabled = useBetStore(state => state.oddsApiEnabled);

  // States
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const demoMatches = useMemo(() => GENERATE_MOCK_MATCHES(), []);

  // Fetch real odds or use mock data based on settings
  useEffect(() => {
    if (!oddsApiEnabled) {
      setMatches(demoMatches);
      setError(null);
      setLoading(false);
      return;
    }

    if (!oddsApiKey) {
      setMatches([]);
      setError('Clave de API no configurada');
      return;
    }

    const fetchOdds = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `https://api.the-odds-api.com/v4/sports/upcoming/odds/?apiKey=${oddsApiKey}&regions=eu&markets=h2h&oddsFormat=decimal`
        );
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.message || `Error del servidor (Código ${response.status})`);
        }
        const data = await response.json();
        
        // Map data from The Odds API structure to our app structure
        const mapped = data.map((event, idx) => {
          const key = (event.sport_key || '').toLowerCase();
          let sportId = 'other';
          let sportName = event.sport_title || 'Otro';
          let sportIcon = '🏆';

          if (key.includes('soccer') || key.includes('football')) {
            sportId = 'football';
            sportName = 'Fútbol';
            sportIcon = '⚽';
          } else if (key.includes('basketball')) {
            sportId = 'basketball';
            sportName = 'Baloncesto';
            sportIcon = '🏀';
          } else if (key.includes('tennis')) {
            sportId = 'tennis';
            sportName = 'Tenis';
            sportIcon = '🎾';
          }

          const oddsObj = {
            bet365: { '1': null, X: null, '2': null },
            pinnacle: { '1': null, X: null, '2': null },
            bwin: { '1': null, X: null, '2': null }
          };

          // Helper to map a specific bookmaker market
          const mapBookmaker = (bmKey) => {
            const bm = event.bookmakers?.find(b => b.key === bmKey);
            if (!bm) return null;
            const market = bm.markets?.find(m => m.key === 'h2h');
            if (!market) return null;

            const homeOut = market.outcomes?.find(o => o.name === event.home_team);
            const awayOut = market.outcomes?.find(o => o.name === event.away_team);
            const drawOut = market.outcomes?.find(o => o.name === 'Draw' || o.name === 'Empate');

            return {
              '1': homeOut ? Number(homeOut.price) : null,
              X: drawOut ? Number(drawOut.price) : null,
              '2': awayOut ? Number(awayOut.price) : null
            };
          };

          const b365 = mapBookmaker('bet365');
          const pinn = mapBookmaker('pinnacle');
          const bwn = mapBookmaker('bwin');

          // Fallback logic if the preferred bookmaker is missing
          const getFallbackOdds = () => {
            const firstBm = event.bookmakers?.find(b => b.markets?.some(m => m.key === 'h2h'));
            if (!firstBm) return { '1': 1.00, X: null, '2': 1.00 };
            const market = firstBm.markets?.find(m => m.key === 'h2h');
            const homeOut = market.outcomes?.find(o => o.name === event.home_team);
            const awayOut = market.outcomes?.find(o => o.name === event.away_team);
            const drawOut = market.outcomes?.find(o => o.name === 'Draw' || o.name === 'Empate');
            return {
              '1': homeOut ? Number(homeOut.price) : 1.00,
              X: drawOut ? Number(drawOut.price) : null,
              '2': awayOut ? Number(awayOut.price) : 1.00
            };
          };

          const fallback = getFallbackOdds();

          oddsObj.bet365 = b365 || fallback;
          oddsObj.pinnacle = pinn || fallback;
          oddsObj.bwin = bwn || fallback;

          return {
            id: event.id || `event_${idx}`,
            sport: sportName,
            sportId: sportId,
            sportIcon: sportIcon,
            league: event.sport_title || 'Liga General',
            homeTeam: event.home_team || 'Equipo Local',
            awayTeam: event.away_team || 'Equipo Visitante',
            date: event.commence_time,
            odds: oddsObj
          };
        });

        setMatches(mapped);
      } catch (err) {
        console.error('Error fetching odds:', err);
        setError(err.message || 'Error al obtener las cuotas en tiempo real');
      } finally {
        setLoading(false);
      }
    };

    fetchOdds();
  }, [oddsApiEnabled, oddsApiKey, demoMatches]);

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
    if (!odd) return;
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
            Portal de <span style={{ color: 'var(--color-accent)' }}>Cuotas</span> {oddsApiEnabled ? 'en Vivo' : 'Demo'}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            {oddsApiEnabled 
              ? 'Comparando cuotas en tiempo real obtenidas desde The Odds API para casas de apuestas premium.'
              : 'Visualizando cuotas simuladas de prueba. Puedes activar cuotas reales desde la sección de Ajustes.'}
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

      {/* Grid of Matches / Loading / Error states */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <LoadingSpinner size="lg" text="Cargando partidos y cuotas en tiempo real..." />
        </div>
      ) : error ? (
        <div className="glass-card flex-column" style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--color-text-secondary)', maxWidth: '600px', margin: '0 auto', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <AlertTriangle size={40} style={{ color: error === 'Clave de API no configurada' ? 'var(--color-accent)' : '#ef4444' }} />
          </div>
          <p style={{ fontWeight: 700, color: '#f3f4f6', fontSize: '18px', margin: 0 }}>
            {error === 'Clave de API no configurada' ? 'Clave de API Requerida' : 'Error al obtener datos'}
          </p>
          <p style={{ fontSize: '14px', margin: 0, opacity: 0.8, lineHeight: 1.5 }}>
            {error === 'Clave de API no configurada' 
              ? 'Has activado la API en tiempo real pero aún no has configurado tu clave API (API Key) en los Ajustes.' 
              : `Ocurrió un error al conectar con The Odds API: ${error}`}
          </p>
          {error === 'Clave de API no configurada' ? (
            <button
              onClick={() => navigate('/settings')}
              className="btn btn-primary"
              style={{ marginTop: '12px', alignSelf: 'center' }}
            >
              Configurar en Ajustes
            </button>
          ) : (
            <button
              onClick={() => {
                setError(null);
                setMatches(demoMatches);
              }}
              className="btn btn-secondary"
              style={{ marginTop: '12px', alignSelf: 'center' }}
            >
              Volver a Modo Demo
            </button>
          )}
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="glass-card flex-column" style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <Zap size={40} style={{ color: 'var(--color-accent-glow)', marginBottom: '12px' }} />
          <p style={{ fontWeight: 600 }}>No se encontraron partidos próximos.</p>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>Prueba a cambiar tus filtros de búsqueda.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {filteredMatches.map((match) => {
            const bookmakerOdds = match.odds[selectedBookmaker] || { '1': null, X: null, '2': null };
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
                  <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 500, backgroundColor: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-glass)' }} title={match.league}>
                    {match.league.length > 20 ? `${match.league.substring(0, 18)}...` : match.league}
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
                      disabled={!bookmakerOdds['1']}
                      className="btn-action-glass"
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px', borderRadius: '10px', transition: 'var(--transition-smooth)', opacity: bookmakerOdds['1'] ? 1 : 0.4 }}
                    >
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>1</span>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-accent)', marginTop: '2px' }}>{bookmakerOdds['1'] || 'N/A'}</span>
                    </button>

                    {/* Odd X (Draw) */}
                    {hasDraw && (
                      <button
                        onClick={() => handleQuickBet(match, selectedBookmaker, 'X', bookmakerOdds.X)}
                        disabled={!bookmakerOdds.X}
                        className="btn-action-glass"
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px', borderRadius: '10px', transition: 'var(--transition-smooth)', opacity: bookmakerOdds.X ? 1 : 0.4 }}
                      >
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>X</span>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: '2px' }}>{bookmakerOdds.X || 'N/A'}</span>
                      </button>
                    )}

                    {/* Odd 2 */}
                    <button
                      onClick={() => handleQuickBet(match, selectedBookmaker, '2', bookmakerOdds['2'])}
                      disabled={!bookmakerOdds['2']}
                      className="btn-action-glass"
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 4px', borderRadius: '10px', transition: 'var(--transition-smooth)', opacity: bookmakerOdds['2'] ? 1 : 0.4 }}
                    >
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>2</span>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-accent)', marginTop: '2px' }}>{bookmakerOdds['2'] || 'N/A'}</span>
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
