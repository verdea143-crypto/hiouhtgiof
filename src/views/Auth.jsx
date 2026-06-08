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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const user = await authService.signInWithGoogle();
      toast.success('Sesión iniciada con Google.');
      await setUser(user);
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
      if (e.code !== 'auth/popup-closed-by-user') {
        toast.error(e.message || 'Error al iniciar sesión con Google.');
      }
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

        {isCloud && (
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="btn btn-secondary"
            style={{
              width: '100%',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginTop: '-8px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderColor: 'rgba(255, 255, 255, 0.08)'
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>
        )}

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
