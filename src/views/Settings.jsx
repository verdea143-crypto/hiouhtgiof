import React, { useState, useEffect } from 'react';
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
  Palette
} from 'lucide-react';
import { useBetStore } from '../store/useBetStore';
import { toast } from 'sonner';

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

  // Supabase Inputs
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Load current config
  useEffect(() => {
    try {
      const configStr = localStorage.getItem('supabase_config');
      if (configStr) {
        const config = JSON.parse(configStr);
        if (config) {
          setSupabaseUrl(config.url || '');
          setSupabaseKey(config.anonKey || '');
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSaveConfig = () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      toast.error('Por favor, introduce una URL y Anon Key válidas.');
      return;
    }

    try {
      const config = { url: supabaseUrl.trim(), anonKey: supabaseKey.trim() };
      localStorage.setItem('supabase_config', JSON.stringify(config));
      toast.success('Configuración guardada. Reiniciando la app para conectar...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      toast.error('Error al guardar la configuración.');
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('¿Deseas desconectar la nube de Supabase? La aplicación volverá a operar únicamente en modo Local.')) {
      try {
        localStorage.removeItem('supabase_config');
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

  const sqlScript = `-- 1. TABLA DE TIPSTERS
CREATE TABLE tipsters (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT
);

-- Habilitar seguridad de nivel de fila (RLS)
ALTER TABLE tipsters ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad RLS
CREATE POLICY "Users can manage their own tipsters" ON tipsters
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 2. TABLA DE BANCAS (BANKROLLS)
CREATE TABLE bankrolls (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  initial_balance NUMERIC NOT NULL DEFAULT 0,
  description TEXT
);

-- Habilitar RLS
ALTER TABLE bankrolls ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad RLS
CREATE POLICY "Users can manage their own bankrolls" ON bankrolls
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 3. TABLA DE TRANSACCIONES (DEPÓSITOS/RETIROS)
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bankroll_id TEXT NOT NULL REFERENCES bankrolls(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount NUMERIC NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT
);

-- Habilitar RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad RLS
CREATE POLICY "Users can manage their own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- 4. TABLA DE APUESTAS (BETS)
CREATE TABLE bets (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport TEXT NOT NULL,
  event TEXT NOT NULL,
  market TEXT NOT NULL,
  odds NUMERIC NOT NULL,
  stake NUMERIC NOT NULL,
  stake_units NUMERIC,
  bookmaker TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'won', 'lost', 'void')),
  bankroll_id TEXT NOT NULL REFERENCES bankrolls(id) ON DELETE CASCADE,
  tipster_id TEXT REFERENCES tipsters(id) ON DELETE SET NULL
);

-- Habilitar RLS
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad RLS
CREATE POLICY "Users can manage their own bets" ON bets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    setIsCopied(true);
    toast.success('Script SQL copiado al portapapeles.');
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
          Configura tu base de datos Supabase, haz copias de seguridad e inyecta datos de prueba.
        </p>
      </div>

      {/* Grid panels */}
      <div className="grid-cols-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Supabase Config Card */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Key size={20} style={{ color: 'var(--color-emerald)' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>Conexión Supabase (Cloud)</h3>
          </div>
          
          <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Configura las claves de tu proyecto de Supabase para sincronizar tus apuestas y acceder desde cualquier dispositivo de forma segura.
          </div>

          <div className="form-group">
            <label className="form-label">SUPABASE_URL</label>
            <input 
              type="text" 
              placeholder="https://xxxx.supabase.co" 
              className="form-input"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">SUPABASE_ANON_KEY</label>
            <input 
              type="password" 
              placeholder="eyJhbGciOiJIUzI1NiIsIn..." 
              className="form-input"
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
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

      {/* Personalización del Tema Card */}
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
            { id: 'emerald', label: 'Verde Esmeralda', hex: '#10b981', glow: 'rgba(16, 185, 129, 0.2)' },
            { id: 'blue', label: 'Azul Eléctrico', hex: '#3b82f6', glow: 'rgba(59, 130, 246, 0.2)' },
            { id: 'violet', label: 'Violeta Amatista', hex: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.2)' },
            { id: 'orange', label: 'Naranja Fuego', hex: '#f59e0b', glow: 'rgba(245, 158, 11, 0.2)' },
            { id: 'red', label: 'Rojo Neón', hex: '#ef4444', glow: 'rgba(239, 68, 68, 0.2)' }
          ].map(theme => {
            const isActive = themeAccent === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => setThemeAccent(theme.id)}
                className="btn"
                style={{
                  padding: '12px 20px',
                  borderRadius: '12px',
                  backgroundColor: isActive ? theme.hex : 'rgba(255,255,255,0.02)',
                  color: isActive ? '#030712' : 'var(--color-text-primary)',
                  border: `1px solid ${isActive ? theme.hex : 'rgba(255,255,255,0.08)'}`,
                  boxShadow: isActive ? `0 0 15px ${theme.glow}` : 'none',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)',
                  flex: '1 1 150px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: isActive ? '#030712' : theme.hex }} />
                  {theme.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SQL Script Viewer Panel */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="flex-between">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={20} style={{ color: '#8b5cf6' }} />
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f3f4f6' }}>Supabase SQL Schema & RLS Script</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>Ejecuta este código en el editor SQL de Supabase para inicializar las tablas y políticas de seguridad.</p>
            </div>
          </div>
          <button 
            onClick={copyToClipboard}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '13px', gap: '6px' }}
          >
            {isCopied ? <Check size={14} style={{ color: 'var(--color-emerald)' }} /> : <Clipboard size={14} />}
            {isCopied ? 'Copiado' : 'Copiar Código'}
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
            {sqlScript}
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
