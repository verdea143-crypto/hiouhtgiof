import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useBetStore } from '../store/useBetStore';
import { authService } from '../services/authService';

// Zod validation schemas
const authSchema = z.object({
  email: z.string().min(1, 'El correo electrónico es requerido').email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

export const Auth = () => {
  const navigate = useNavigate();
  const setUser = useBetStore(state => state.setUser);
  const isCloud = useBetStore(state => state.isCloudActive());
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(authSchema)
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      let user;
      if (isRegister) {
        user = await authService.signUp(data.email, data.password);
        toast.success('Cuenta creada. ¡Bienvenido a BetFlow!');
      } else {
        user = await authService.signIn(data.email, data.password);
        toast.success('Sesión iniciada con éxito.');
      }
      await setUser(user);
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Ocurrió un error al autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalBypass = () => {
    const localUser = { id: 'local_guest', email: 'invitado@betflow.local' };
    localStorage.setItem('local_session_user', JSON.stringify(localUser));
    setUser(localUser);
    toast.success('Accediendo en modo Local.');
    navigate('/dashboard');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at center, #111827 0%, #080b11 100%)',
      padding: '20px'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '36px 30px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        {/* Title */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            backgroundColor: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#030712',
            fontWeight: 800,
            fontSize: '22px',
            margin: '0 auto 12px',
            boxShadow: '0 0 15px rgba(16,185,129,0.4)'
          }}>B</div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#f3f4f6', letterSpacing: '0.5px' }}>
            Bet<span style={{ color: '#10b981' }}>Flow</span>
          </h1>
          <p style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>
            {isCloud ? 'Sincronización Cloud' : 'Gestor Local de Apuestas'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <input
              type="email"
              placeholder="tu@correo.com"
              className="form-input"
              {...register('email')}
            />
            {errors.email && <span className="form-error">{errors.email.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              className="form-input"
              {...register('password')}
            />
            {errors.password && <span className="form-error">{errors.password.message}</span>}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: '8px' }}
          >
            {loading ? 'Procesando...' : isRegister ? 'Registrarse' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Divider */}
        <div style={{ position: 'relative', textAlign: 'center', margin: '8px 0' }}>
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }} />
          <span style={{ position: 'relative', background: '#111622', padding: '0 10px', fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>O BIEN</span>
        </div>

        {/* Local mode entry */}
        <button 
          onClick={handleLocalBypass}
          className="btn btn-secondary"
          style={{ width: '100%', padding: '12px' }}
        >
          Continuar en Modo Local
        </button>

        {/* Toggle */}
        <div style={{ textAlign: 'center', fontSize: '14px', color: '#9ca3af' }}>
          {isRegister ? '¿Ya tienes una cuenta?' : '¿No tienes una cuenta?'}{' '}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              reset();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#10b981',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            {isRegister ? 'Inicia Sesión' : 'Regístrate'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
