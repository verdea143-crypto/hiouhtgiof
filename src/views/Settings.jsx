import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Database, 
  Upload, 
  Download, 
  Trash2, 
  Key, 
  RefreshCw, 
  Clipboard,
  Check,
  AlertCircle,
  Palette,
  TrendingUp,
  X,
  ArrowRight
} from 'lucide-react';
import { useBetStore } from '../store/useBetStore';
import { toast } from 'sonner';
import { CustomSelect } from '../components/CustomSelect';

export const Settings = () => {
  const bets = useBetStore(state => state.bets);
  const bankrolls = useBetStore(state => state.bankrolls);
  const tipsters = useBetStore(state => state.tipsters);
  const transactions = useBetStore(state => state.transactions);
  
  const seedMockData = useBetStore(state => state.seedMockData);
  const clearAllData = useBetStore(state => state.clearAllData);
  const importBackupData = useBetStore(state => state.importBackupData);
  const isCloud = useBetStore(state => state.isCloudActive());
  const themeAccent = useBetStore(state => state.themeAccent);
  const setThemeAccent = useBetStore(state => state.setThemeAccent);
  const taxRate = useBetStore(state => state.taxRate || 0);
  const setTaxRate = useBetStore(state => state.setTaxRate);
  const importBets = useBetStore(state => state.importBets);
  const getBankrollBalance = useBetStore(state => state.getBankrollBalance);

  // CSV Importer States
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [csvMapping, setCsvMapping] = useState({
    date: -1, sport: -1, event: -1, market: -1, odds: -1,
    stake: -1, stake_units: -1, bookmaker: -1, status: -1
  });
  const [csvTargetBankroll, setCsvTargetBankroll] = useState('');
  const [csvTargetTipster, setCsvTargetTipster] = useState('none');
  const [csvStep, setCsvStep] = useState(1);

  // Initialize default bankroll when modal opens
  useEffect(() => {
    if (bankrolls.length > 0 && !csvTargetBankroll) {
      setCsvTargetBankroll(bankrolls[0].id);
    }
  }, [bankrolls, isCsvModalOpen, csvTargetBankroll]);

  // native CSV parser
  const parseCSV = (text) => {
    const lines = [];
    let row = [""];
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i+1];
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' || char === ';') {
        if (inQuotes) {
          row[row.length - 1] += char;
        } else {
          row.push("");
        }
      } else if (char === '\r' || char === '\n') {
        if (inQuotes) {
          row[row.length - 1] += char;
        } else {
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
          lines.push(row);
          row = [""];
        }
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }
    return lines;
  };

  const autoMapHeaders = (headers) => {
    const autoMap = {
      date: -1, sport: -1, event: -1, market: -1, odds: -1,
      stake: -1, stake_units: -1, bookmaker: -1, status: -1
    };
    headers.forEach((h, idx) => {
      const header = h.toLowerCase().trim();
      if (header.includes('fech') || header.includes('date') || header.includes('dia')) autoMap.date = idx;
      else if (header.includes('depor') || header.includes('sport') || header.includes('juego')) autoMap.sport = idx;
      else if (header.includes('partid') || header.includes('event') || header.includes('match') || header.includes('equipo') || header.includes('suceso')) autoMap.event = idx;
      else if (header.includes('merc') || header.includes('market') || header.includes('prono') || header.includes('pick') || header.includes('tipo')) autoMap.market = idx;
      else if (header.includes('cuot') || header.includes('odd') || header.includes('coef')) autoMap.odds = idx;
      else if (header.includes('importe') || header.includes('dinero') || header.includes('monto') || header.includes('cantidad') || header.includes('arriesg') || header.includes('stake_eur')) autoMap.stake = idx;
      else if (header.includes('stake') || header.includes('unidad') || header.includes('porcent') || header.startsWith('u')) {
        if (header.includes('eur') || header.includes('usd') || header.includes('val')) {
          autoMap.stake = idx;
        } else {
          autoMap.stake_units = idx;
        }
      }
      else if (header.includes('casa') || header.includes('book') || header.includes('maker') || header.includes('betting') || header.includes('operador')) autoMap.bookmaker = idx;
      else if (header.includes('est') || header.includes('status') || header.includes('res') || header.includes('won') || header.includes('perd')) autoMap.status = idx;
    });
    return autoMap;
  };

  const handleCSVSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const allLines = parseCSV(text);
        const cleanLines = allLines.filter(row => row.some(cell => cell.trim() !== ""));
        
        if (cleanLines.length < 2) {
          toast.error("El archivo CSV debe contener al menos una cabecera y una fila de datos.");
          return;
        }

        const headers = cleanLines[0];
        const rows = cleanLines.slice(1);

        setCsvHeaders(headers);
        setCsvRows(rows);
        setCsvMapping(autoMapHeaders(headers));
        setCsvStep(1);
        setIsCsvModalOpen(true);
      } catch (err) {
        console.error(err);
        toast.error("Error al parsear el archivo CSV: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const mapRowToBet = (row) => {
    const getValue = (fieldIndex) => {
      if (fieldIndex === -1 || fieldIndex >= row.length) return '';
      return row[fieldIndex]?.trim() || '';
    };

    const rawDate = getValue(csvMapping.date);
    const rawSport = getValue(csvMapping.sport) || 'Fútbol';
    const rawEvent = getValue(csvMapping.event) || 'Evento';
    const rawMarket = getValue(csvMapping.market) || 'Mercado';
    const rawOdds = parseFloat(getValue(csvMapping.odds));
    const rawStake = parseFloat(getValue(csvMapping.stake));
    const rawStakeUnits = parseFloat(getValue(csvMapping.stake_units));
    const rawBookmaker = getValue(csvMapping.bookmaker) || 'Desconocida';
    const rawStatus = getValue(csvMapping.status)?.toLowerCase() || '';

    let finalStatus = 'pending';
    if (rawStatus.includes('won') || rawStatus.includes('ganad') || rawStatus.includes('gano') || rawStatus.includes('acierto') || rawStatus === 'g' || rawStatus === 'w') {
      finalStatus = 'won';
    } else if (rawStatus.includes('lost') || rawStatus.includes('perdid') || rawStatus.includes('perdi') || rawStatus.includes('fallo') || rawStatus === 'p' || rawStatus === 'l') {
      finalStatus = 'lost';
    } else if (rawStatus.includes('void') || rawStatus.includes('nula') || rawStatus.includes('nulo') || rawStatus.includes('anul') || rawStatus === 'n') {
      finalStatus = 'void';
    }

    let finalDate = rawDate;
    if (!finalDate || isNaN(Date.parse(finalDate))) {
      finalDate = new Date().toISOString().split('T')[0];
    } else {
      try {
        finalDate = new Date(finalDate).toISOString().split('T')[0];
      } catch(e){}
    }

    const bankrollBalance = getBankrollBalance(csvTargetBankroll) || 1000;
    let finalStakeUnits = 2;
    let finalStakeAmt = 20;

    if (!isNaN(rawStakeUnits) && rawStakeUnits > 0) {
      finalStakeUnits = rawStakeUnits;
      finalStakeAmt = (finalStakeUnits / 100) * bankrollBalance;
    } else if (!isNaN(rawStake) && rawStake > 0) {
      finalStakeAmt = rawStake;
      finalStakeUnits = (rawStake / bankrollBalance) * 100;
    }

    const odds = isNaN(rawOdds) || rawOdds <= 1.0 ? 1.80 : rawOdds;

    return {
      date: finalDate,
      sport: rawSport,
      event: rawEvent,
      market: rawMarket,
      odds: Number(odds),
      stake: Number(finalStakeAmt),
      stake_units: Number(finalStakeUnits),
      bookmaker: rawBookmaker,
      status: finalStatus,
      bankroll_id: csvTargetBankroll,
      tipster_id: csvTargetTipster === 'none' ? null : csvTargetTipster
    };
  };

  // Firebase Config Input
  const [firebaseConfigStr, setFirebaseConfigStr] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Load current config
  useEffect(() => {
    try {
      const configStr = localStorage.getItem('firebase_config');
      if (configStr) {
        const parsed = JSON.parse(configStr);
        setFirebaseConfigStr(JSON.stringify(parsed, null, 2));
      } else {
        const fallback = {
          apiKey: "AIzaSyC0AQ1DaWuRcn7DUYbCkHPhqdSp14chcBs",
          authDomain: "betflow-fe16f.firebaseapp.com",
          projectId: "betflow-fe16f",
          storageBucket: "betflow-fe16f.firebasestorage.app",
          messagingSenderId: "967619664166",
          appId: "1:967619664166:web:dee34b0d840b496fdc89e7"
        };
        setFirebaseConfigStr(JSON.stringify(fallback, null, 2));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSaveConfig = () => {
    if (!firebaseConfigStr.trim()) {
      toast.error('Por favor, introduce una configuración de Firebase en formato JSON.');
      return;
    }

    try {
      const parsed = JSON.parse(firebaseConfigStr.trim());
      if (!parsed.apiKey || !parsed.projectId) {
        toast.error('Faltan campos mínimos obligatorios en la configuración (apiKey y projectId).');
        return;
      }
      localStorage.setItem('firebase_config', JSON.stringify(parsed));
      toast.success('Configuración de Firebase guardada. Reiniciando la app para conectar...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      toast.error('Formato JSON no válido. Por favor, revisa la sintaxis.');
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('¿Deseas desconectar la nube de Firebase? La aplicación volverá a operar únicamente en modo Local.')) {
      try {
        localStorage.removeItem('firebase_config');
        toast.success('Nube desconectada. Reiniciando la app...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (e) {
        toast.error('Error al desconectar.');
      }
    }
  };

  const handleExportJSON = () => {
    try {
      const backup = {
        bets,
        bankrolls,
        tipsters,
        transactions,
        version: '1.0.0',
        exportedAt: new Date().toISOString()
      };
      
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `betflow_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success('Copia de seguridad exportada con éxito.');
    } catch (e) {
      console.error(e);
      toast.error('Error al exportar datos.');
    }
  };

  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backup = JSON.parse(event.target.result);
        if (!backup.bets || !backup.bankrolls) {
          throw new Error('El archivo JSON no tiene el formato de BetFlow válido.');
        }

        if (window.confirm(`Se importarán ${backup.bets.length} apuestas y ${backup.bankrolls.length} bancas. Esto SOBREESCRIBIRÁ los datos del usuario actual. ¿Deseas continuar?`)) {
          await importBackupData(backup);
        }
      } catch (err) {
        console.error(err);
        toast.error('Error al importar: ' + err.message);
      }
    };
    reader.readAsText(file);
    
    // Clear input
    e.target.value = '';
  };

  const handleWipeData = async () => {
    if (window.confirm('¿ESTÁS ABSOLUTAMENTE SEGURO? Esta acción es irreversible y borrará permanentemente todas tus apuestas, bancas y transacciones.')) {
      const confirmText = window.prompt('Escribe "ELIMINAR" para confirmar la operación de borrado total:');
      if (confirmText === 'ELIMINAR') {
        await clearAllData();
      } else {
        toast.error('Borrado cancelado.');
      }
    }
  };

  const firestoreRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{collection}/{document} {
      allow create: if request.auth != null && request.resource.data.user_id == request.auth.uid;
      allow read, update, delete: if request.auth != null && resource.data.user_id == request.auth.uid;
    }
  }
}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(firestoreRules);
    setIsCopied(true);
    toast.success('Reglas de Seguridad de Firestore copiadas al portapapeles.');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '20px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: 800, letterSpacing: '-0.5px' }}>
          Configuración
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          Configura tu base de datos Firebase, haz copias de seguridad e inyecta datos de prueba.
        </p>
      </div>

      {/* Grid panels */}
      <div className="grid-cols-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Firebase Config Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Key size={20} style={{ color: 'var(--color-accent)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>Conexión Firebase (Cloud)</h3>
          </div>
          
          {/* Advertencia de Migración de Supabase */}
          <div style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.08)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            borderRadius: '10px', 
            padding: '12px 16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}>
            <AlertCircle size={20} style={{ color: 'var(--color-crimson)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', color: '#fca5a5', lineHeight: '1.5' }}>
              <strong style={{ display: 'block', marginBottom: '4px' }}>¡Atención usuarios de Supabase!</strong>
              Si tenías datos guardados en la nube anterior de Supabase, asegúrate de <strong>exportar una copia de seguridad (JSON) antes</strong> de guardar la configuración de Firebase. Luego podrás importarla en tu nueva base de datos cloud de Firebase.
            </div>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Pega el objeto de configuración JSON de tu proyecto de Firebase (SDK setup / Configuración Web) para habilitar la nube y sincronizar tus apuestas de forma segura.
          </div>

          <div className="form-group">
            <label className="form-label">FIREBASE CONFIGURATION (JSON)</label>
            <textarea 
              placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "...",\n  "projectId": "...",\n  "storageBucket": "...",\n  "messagingSenderId": "...",\n  "appId": "..."\n}`} 
              className="form-input"
              value={firebaseConfigStr}
              onChange={(e) => setFirebaseConfigStr(e.target.value)}
              rows={8}
              style={{
                fontFamily: 'Consolas, monospace',
                fontSize: '13px',
                lineHeight: '1.5',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
            <button 
              onClick={handleSaveConfig}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              Guardar y Conectar
            </button>
            
            {isCloud && (
              <button 
                onClick={handleDisconnect}
                className="btn btn-secondary"
                style={{ borderColor: 'var(--color-crimson)', color: 'var(--color-crimson)' }}
              >
                Desconectar
              </button>
            )}
          </div>
        </div>

        {/* Data Actions Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={20} style={{ color: '#3b82f6' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>Gestión de Datos</h3>
          </div>

          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Realiza copias de seguridad de tus apuestas o carga datos rápidos simulados para probar los gráficos.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
            
            {/* Backup Export */}
            <button 
              onClick={handleExportJSON}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', gap: '10px' }}
            >
              <Download size={16} />
              Exportar Copia de Seguridad (JSON)
            </button>

            {/* Backup Import */}
            <label 
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', gap: '10px', cursor: 'pointer' }}
            >
              <Upload size={16} />
              Importar Copia de Seguridad (JSON)
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportJSON} 
                style={{ display: 'none' }} 
              />
            </label>

            {/* Seed Mock */}
            <button 
              onClick={seedMockData}
              className="btn btn-secondary"
              style={{ justifyContent: 'flex-start', gap: '10px', borderColor: 'rgba(16, 185, 129, 0.4)', color: 'var(--color-emerald)', backgroundColor: 'rgba(16, 185, 129, 0.03)' }}
            >
              <RefreshCw size={16} />
              Cargar Historial de Datos de Prueba (Seed)
            </button>

            {/* Delete All */}
            <button 
              onClick={handleWipeData}
              className="btn btn-danger"
              style={{ justifyContent: 'flex-start', gap: '10px' }}
            >
              <Trash2 size={16} />
              Borrar Definitivamente Todos los Datos
            </button>

          </div>
        </div>
      </div>

      {/* Accent Theme, Taxes & CSV Importer Cards */}
      <div className="grid-cols-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Personalización e Impuestos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Theme Card */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Palette size={20} style={{ color: 'var(--color-accent)' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>Personalización del Tema</h3>
            </div>
            
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Selecciona tu color de acento favorito para iluminar la interfaz de BetFlow. El cambio se aplicará instantáneamente a botones, gráficos y luces de neón.
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
              {[
                { id: 'emerald', label: 'Verde', hex: '#10b981', glow: 'rgba(16, 185, 129, 0.2)' },
                { id: 'blue', label: 'Azul', hex: '#3b82f6', glow: 'rgba(59, 130, 246, 0.2)' },
                { id: 'violet', label: 'Violeta', hex: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.2)' },
                { id: 'orange', label: 'Naranja', hex: '#f59e0b', glow: 'rgba(245, 158, 11, 0.2)' },
                { id: 'red', label: 'Rojo', hex: '#ef4444', glow: 'rgba(239, 68, 68, 0.2)' }
              ].map(theme => {
                const isActive = themeAccent === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => setThemeAccent(theme.id)}
                    className="btn"
                    style={{
                      padding: '10px 16px',
                      borderRadius: '12px',
                      backgroundColor: isActive ? theme.hex : 'rgba(255,255,255,0.02)',
                      color: isActive ? '#030712' : 'var(--color-text-primary)',
                      border: `1px solid ${isActive ? theme.hex : 'rgba(255,255,255,0.08)'}`,
                      boxShadow: isActive ? `0 0 15px ${theme.glow}` : 'none',
                      fontWeight: 600,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'var(--transition-smooth)',
                      flex: '1 1 120px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isActive ? '#030712' : theme.hex }} />
                      {theme.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Taxes configuration Card */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <TrendingUp size={20} style={{ color: 'var(--color-accent)' }} />
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>Configuración de Impuestos</h3>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              Ajusta el porcentaje de retenciones tributarias sobre tus beneficios netos. Se descontará dinámicamente en el Dashboard.
            </div>
            <div className="form-group">
              <label htmlFor="tax-rate-input" className="form-label">TASA TRIBUTARIA (%)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  id="tax-rate-input"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  className="form-input"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                  style={{ width: '100px' }}
                />
                <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>% sobre beneficios</span>
              </div>
            </div>
          </div>

        </div>

        {/* CSV Importer Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Upload size={20} style={{ color: 'var(--color-accent)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>Importador Interactivo de CSV</h3>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Importa tus apuestas en bloque desde archivos Excel/CSV de forma guiada. Podrás relacionar cada columna de tu hoja con los campos de BetFlow.
          </div>

          {bankrolls.length === 0 ? (
            <div style={{ 
              padding: '12px', 
              backgroundColor: 'rgba(239, 68, 68, 0.08)', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              borderRadius: '10px', 
              color: '#fca5a5', 
              fontSize: '12px',
              fontWeight: 600
            }}>
              ⚠️ Debes crear al menos una banca en la sección de Bancas antes de poder realizar importaciones.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' }}>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>
                Asegúrate de que tu archivo CSV tenga una primera fila con cabeceras.
              </p>
              <label 
                className="btn btn-primary"
                style={{ justifyContent: 'center', gap: '10px', cursor: 'pointer', padding: '12px' }}
              >
                <Upload size={18} />
                Seleccionar Archivo CSV
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleCSVSelect} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>
          )}
        </div>

      </div>

      {/* CSV Import Modal Portal */}
      {isCsvModalOpen && createPortal(
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="modal-content glass-panel animate-fade-in" style={{ maxWidth: '640px', width: '95%', padding: '24px' }}>
            
            {/* Header */}
            <div className="flex-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '14px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Upload size={20} style={{ color: 'var(--color-accent)' }} />
                <span>Asistente de Importación CSV</span>
              </h3>
              <button 
                onClick={() => setIsCsvModalOpen(false)} 
                className="btn-icon" 
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
                aria-label="Cerrar importador"
              >
                <X size={20} />
              </button>
            </div>

            {csvStep === 1 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
                  Asocia las columnas de tu CSV con los campos de la base de datos de BetFlow. Los campos no asociados usarán valores por defecto.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', maxHeight: '300px', overflowY: 'auto', paddingRight: '6px' }}>
                  <div className="form-group">
                    <label className="form-label">Fecha del Suceso</label>
                    <CustomSelect
                      value={String(csvMapping.date)}
                      onChange={(val) => setCsvMapping(m => ({ ...m, date: Number(val) }))}
                      options={[{ value: '-1', label: 'Por defecto (Hoy)' }, ...csvHeaders.map((h, i) => ({ value: String(i), label: `Columna ${i}: ${h}` }))]}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Deporte</label>
                    <CustomSelect
                      value={String(csvMapping.sport)}
                      onChange={(val) => setCsvMapping(m => ({ ...m, sport: Number(val) }))}
                      options={[{ value: '-1', label: 'Por defecto (Fútbol)' }, ...csvHeaders.map((h, i) => ({ value: String(i), label: `Columna ${i}: ${h}` }))]}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Partido / Evento</label>
                    <CustomSelect
                      value={String(csvMapping.event)}
                      onChange={(val) => setCsvMapping(m => ({ ...m, event: Number(val) }))}
                      options={[{ value: '-1', label: 'Por defecto (Evento)' }, ...csvHeaders.map((h, i) => ({ value: String(i), label: `Columna ${i}: ${h}` }))]}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mercado / Pronóstico</label>
                    <CustomSelect
                      value={String(csvMapping.market)}
                      onChange={(val) => setCsvMapping(m => ({ ...m, market: Number(val) }))}
                      options={[{ value: '-1', label: 'Por defecto (Mercado)' }, ...csvHeaders.map((h, i) => ({ value: String(i), label: `Columna ${i}: ${h}` }))]}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Cuota (Ej: 1.95)</label>
                    <CustomSelect
                      value={String(csvMapping.odds)}
                      onChange={(val) => setCsvMapping(m => ({ ...m, odds: Number(val) }))}
                      options={[{ value: '-1', label: 'Por defecto (1.80)' }, ...csvHeaders.map((h, i) => ({ value: String(i), label: `Columna ${i}: ${h}` }))]}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Casa de Apuestas</label>
                    <CustomSelect
                      value={String(csvMapping.bookmaker)}
                      onChange={(val) => setCsvMapping(m => ({ ...m, bookmaker: Number(val) }))}
                      options={[{ value: '-1', label: 'Por defecto (Desconocida)' }, ...csvHeaders.map((h, i) => ({ value: String(i), label: `Columna ${i}: ${h}` }))]}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Stake % / Unidades</label>
                    <CustomSelect
                      value={String(csvMapping.stake_units)}
                      onChange={(val) => setCsvMapping(m => ({ ...m, stake_units: Number(val) }))}
                      options={[{ value: '-1', label: 'Calcular desde Importe' }, ...csvHeaders.map((h, i) => ({ value: String(i), label: `Columna ${i}: ${h}` }))]}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Stake Importe (€)</label>
                    <CustomSelect
                      value={String(csvMapping.stake)}
                      onChange={(val) => setCsvMapping(m => ({ ...m, stake: Number(val) }))}
                      options={[{ value: '-1', label: 'Calcular desde Unidades %' }, ...csvHeaders.map((h, i) => ({ value: String(i), label: `Columna ${i}: ${h}` }))]}
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Resultado (Estado)</label>
                    <CustomSelect
                      value={String(csvMapping.status)}
                      onChange={(val) => setCsvMapping(m => ({ ...m, status: Number(val) }))}
                      options={[{ value: '-1', label: 'Por defecto (Pendiente)' }, ...csvHeaders.map((h, i) => ({ value: String(i), label: `Columna ${i}: ${h}` }))]}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', marginTop: '8px' }}>
                  <div className="form-group">
                    <label className="form-label">Banca Destinataria</label>
                    <CustomSelect
                      value={csvTargetBankroll}
                      onChange={(val) => setCsvTargetBankroll(val)}
                      options={bankrolls.map(br => ({ value: br.id, label: br.name }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipster Asignado</label>
                    <CustomSelect
                      value={csvTargetTipster}
                      onChange={(val) => setCsvTargetTipster(val)}
                      options={[{ value: 'none', label: 'Ninguno' }, ...tipsters.map(t => ({ value: t.id, label: t.name }))]}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                  <button type="button" onClick={() => setIsCsvModalOpen(false)} className="btn btn-secondary">
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setCsvStep(2)} 
                    className="btn btn-primary"
                    style={{ gap: '6px', display: 'flex', alignItems: 'center' }}
                  >
                    <span>Siguiente: Previsualizar</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
                  Previsualización de los primeros 5 registros mapeados de tu archivo. Verifica que la información es correcta.
                </p>

                <div style={{ overflowX: 'auto', border: '1px solid var(--border-glass)', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <th style={{ padding: '10px', color: 'var(--color-text-secondary)' }}>Fecha</th>
                        <th style={{ padding: '10px', color: 'var(--color-text-secondary)' }}>Evento</th>
                        <th style={{ padding: '10px', color: 'var(--color-text-secondary)' }}>Cuota</th>
                        <th style={{ padding: '10px', color: 'var(--color-text-secondary)' }}>Stake</th>
                        <th style={{ padding: '10px', color: 'var(--color-text-secondary)' }}>Importe</th>
                        <th style={{ padding: '10px', color: 'var(--color-text-secondary)' }}>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.slice(0, 5).map((row, idx) => {
                        const bet = mapRowToBet(row);
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '10px', color: 'var(--color-text-secondary)' }}>{bet.date}</td>
                            <td style={{ padding: '10px' }}>
                              <div style={{ fontWeight: 600, color: '#f3f4f6' }}>{bet.event}</div>
                              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{bet.sport} • {bet.market}</div>
                            </td>
                            <td style={{ padding: '10px', fontWeight: 700, color: '#f3f4f6' }}>{bet.odds.toFixed(2)}</td>
                            <td style={{ padding: '10px', color: '#f3f4f6' }}>{bet.stake_units.toFixed(1)}%</td>
                            <td style={{ padding: '10px', fontWeight: 600, color: 'var(--color-emerald)' }}>{bet.stake.toFixed(2)}€</td>
                            <td style={{ padding: '10px' }}>
                              <span className={`badge badge-${bet.status}`}>
                                {bet.status === 'won' ? 'Ganada' : bet.status === 'lost' ? 'Perdida' : bet.status === 'void' ? 'Nula' : 'Pendiente'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ 
                  padding: '12px 16px', 
                  borderRadius: '10px', 
                  backgroundColor: 'rgba(16, 185, 129, 0.08)', 
                  border: '1px solid rgba(16, 185, 129, 0.15)', 
                  fontSize: '13px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  color: '#f3f4f6' 
                }}>
                  <AlertCircle size={18} style={{ color: 'var(--color-emerald)' }} />
                  <span>
                    Estás a punto de importar <strong>{csvRows.length} apuestas</strong> en la banca <strong>{bankrolls.find(b => b.id === csvTargetBankroll)?.name}</strong>.
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                  <button type="button" onClick={() => setCsvStep(1)} className="btn btn-secondary">
                    Atrás
                  </button>
                  <button 
                    type="button" 
                    onClick={async () => {
                      try {
                        const mappedBets = csvRows.map(row => mapRowToBet(row));
                        await importBets(mappedBets);
                        setIsCsvModalOpen(false);
                      } catch (err) {
                        toast.error("Error al importar apuestas.");
                      }
                    }} 
                    className="btn btn-primary"
                  >
                    Confirmar e Importar
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}

      {/* SQL / Rules Viewer Panel */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="flex-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={20} style={{ color: '#8b5cf6' }} />
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>Reglas de Seguridad de Firestore (Security Rules)</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>Publica estas reglas en tu consola de Firebase Firestore para proteger tus datos por cada usuario.</p>
            </div>
          </div>
          <button 
            onClick={copyToClipboard}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '13px', gap: '6px' }}
          >
            {isCopied ? <Check size={14} style={{ color: 'var(--color-emerald)' }} /> : <Clipboard size={14} />}
            {isCopied ? 'Copiado' : 'Copiar Reglas'}
          </button>
        </div>

        <div style={{ position: 'relative' }}>
          <pre style={{
            margin: 0,
            padding: '16px',
            backgroundColor: '#070a10',
            border: '1px solid var(--border-glass)',
            borderRadius: '10px',
            overflow: 'auto',
            maxHeight: '340px',
            fontSize: '13px',
            fontFamily: 'Consolas, monospace',
            color: '#a7b5cc',
            lineHeight: '1.5',
            textAlign: 'left'
          }}>
            {firestoreRules}
          </pre>
        </div>
      </div>

      {/* Responsive layout styles */}
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

export default Settings;
