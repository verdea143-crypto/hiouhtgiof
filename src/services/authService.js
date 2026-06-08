import { supabase } from '../db/dbClient';

export const authService = {
  /**
   * Signs up a new user.
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<Object>} User details
   */
  async signUp(email, password) {
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      return data.user;
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
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data.user;
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
   * Signs out the current user.
   * @returns {Promise<void>}
   */
  async signOut() {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
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
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data) return null;
        return data.user;
      } catch (e) {
        return null;
      }
    } else {
      // Local Mode
      const sessionUser = localStorage.getItem('local_session_user');
      return sessionUser ? JSON.parse(sessionUser) : null;
    }
  }
};
export default authService;
