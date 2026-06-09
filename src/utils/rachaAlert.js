export function detectarRachaNegativa(apuestas, umbral = 5) {
  if (!apuestas) return false;
  
  // Filter only settled bets (won or lost)
  const resueltas = apuestas
    .filter(a => a.status === 'won' || a.status === 'lost')
    .sort((a, b) => new Date(b.date) - new Date(a.date));
    
  if (resueltas.length < umbral) return false;
  
  const ultimas = resueltas.slice(0, umbral);
  return ultimas.every(a => a.status === 'lost');
}
