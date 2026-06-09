import { getBetProfit } from './math';

export function exportToCSV(apuestas, filename = 'betflow-apuestas.csv') {
  if (!apuestas || apuestas.length === 0) return

  const headers = [
    'Fecha', 'Deporte', 'Partido/Evento',
    'Mercado', 'Cuota', 'Stake (%)', 'Importe (€)', 'Resultado',
    'Beneficio/Pérdida (€)', 'Casa de Apuestas'
  ]

  const rows = apuestas.map(a => [
    a.date || '',
    a.sport || '',
    a.event || '',
    a.market || '',
    a.odds || '',
    a.stake_units || '',
    Number(a.stake || 0).toFixed(2),
    a.status === 'pending' ? 'Pendiente' : a.status === 'won' ? 'Ganada' : a.status === 'lost' ? 'Perdida' : 'Nula',
    Number(getBetProfit(a)).toFixed(2),
    a.bookmaker || ''
  ])

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
