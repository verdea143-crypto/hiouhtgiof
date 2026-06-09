import { auth } from '../db/firebaseClient';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';

export const authService = {
  /**
   * Signs up a new user.
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<Object>} User details
   */
  async signUp(email, password) {
    if (auth) {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      return credential.user;
    } else {
      // Local Mode
      const usersStr = localStorage.getItem('local_auth_db');
      const users = usersStr ? JSON.parse(usersStr) : [];
      
      if (users.find(u => u.email === email)) {
        throw new Error('El usuario ya existe en la base de datos local.');
      }
      
      const newUser = {
        id: 'local_' + Math.random().toString(36).substring(2, 11),
        email,
        password
      };
      
      users.push(newUser);
      localStorage.setItem('local_auth_db', JSON.stringify(users));
      
      // Auto login by creating local session
      const sessionUser = { id: newUser.id, email: newUser.email };
      localStorage.setItem('local_session_user', JSON.stringify(sessionUser));
      return sessionUser;
    }
  },

  /**
   * Signs in an existing user.
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<Object>} User details
   */
  async signIn(email, password) {
    if (auth) {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      return credential.user;
    } else {
      // Local Mode
      const usersStr = localStorage.getItem('local_auth_db');
      const users = usersStr ? JSON.parse(usersStr) : [];
      
      const user = users.find(u => u.email === email && u.password === password);
      if (!user) {
        throw new Error('Credenciales incorrectas en modo local.');
      }
      
      const sessionUser = { id: user.id, email: user.email };
      localStorage.setItem('local_session_user', JSON.stringify(sessionUser));
      return sessionUser;
    }
  },

  /**
   * Signs in using Google Sign-In.
   * @returns {Promise<Object>} User details
   */
  async signInWithGoogle() {
    if (auth) {
      if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        try {
          GoogleAuth.initialize({
            clientId: '967619664166-5fkarbptcmn857nusllmht248p5s4r16.apps.googleusercontent.com',
            scopes: ['profile', 'email']
          });
        } catch (e) {
          console.warn('GoogleAuth already initialized:', e);
        }
        const user = await GoogleAuth.signIn();
        const { GoogleAuthProvider, signInWithCredential } = await import('firebase/auth');
        const credential = GoogleAuthProvider.credential(user.authentication.idToken);
        const userCredential = await signInWithCredential(auth, credential);
        return userCredential.user;
      } else {
        const provider = new GoogleAuthProvider();
        const credential = await signInWithPopup(auth, provider);
        return credential.user;
      }
    } else {
      throw new Error('El inicio de sesión con Google no está disponible en Modo Local.');
    }
  },

  /**
   * Signs out the current user.
   * @returns {Promise<void>}
   */
  async signOut() {
    if (auth) {
      await firebaseSignOut(auth);
    } else {
      // Local Mode
      localStorage.removeItem('local_session_user');
    }
  },

  /**
   * Retrieves the current logged in user details.
   * @returns {Promise<Object|null>}
   */
  async getCurrentUser() {
    if (auth) {
      return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(user || null);
        }, () => {
          resolve(null);
        });
      });
    } else {
      // Local Mode
      const sessionUser = localStorage.getItem('local_session_user');
      return sessionUser ? JSON.parse(sessionUser) : null;
    }
  }
};
export default authService;
