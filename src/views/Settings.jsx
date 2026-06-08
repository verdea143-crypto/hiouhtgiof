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
