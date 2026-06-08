import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { supabase } from '../db/dbClient';
import { authService } from '../services/authService';

const generateId = (prefix) => `${prefix}_${Math.random().toString(36).substring(2, 11)}`;

export const useBetStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      bets: [],
      bankrolls: [],
      tipsters: [],
      transactions: [],
      isLoading: false,
      isInitialized: false,
      isModalOpen: false,
      themeAccent: 'emerald',

      // Helper Getters (Selectors)
      isCloudActive: () => supabase !== null,
      
      getBankrollBalance: (bankrollId) => {
        const { bankrolls, bets, transactions } = get();
        const bankroll = bankrolls.find(b => b.id === bankrollId);
        if (!bankroll) return 0;
        
        const initial = Number(bankroll.initial_balance) || 0;
        
        // Deposits & Withdrawals
        const transSum = transactions
          .filter(t => t.bankroll_id === bankrollId)
          .reduce((sum, t) => {
            const amt = Number(t.amount) || 0;
            return t.type === 'deposit' ? sum + amt : sum - amt;
          }, 0);
          
        // Bets
        const betSum = bets
          .filter(b => b.bankroll_id === bankrollId)
          .reduce((sum, b) => {
            const stake = Number(b.stake) || 0;
            const odds = Number(b.odds) || 0;
            
            // Stake is always deducted immediately on placement
            let netImpact = -stake;
            
            // Payout added back on win/void
            if (b.status === 'won') {
              netImpact += (stake * odds);
            } else if (b.status === 'void') {
              netImpact += stake;
            }
            
            return sum + netImpact;
          }, 0);
          
        return initial + transSum + betSum;
      },

      // Actions
      setIsModalOpen: (isOpen) => set({ isModalOpen: isOpen }),
      setThemeAccent: (accent) => set({ themeAccent: accent }),

      initStore: async () => {
        if (get().isInitialized) return;
        
        set({ isLoading: true });
        try {
          const currentUser = await authService.getCurrentUser();
          set({ user: currentUser });
          
          if (currentUser && supabase) {
            await get().fetchCloudData(currentUser.id);
          }
        } catch (e) {
          console.error('Error initializing store:', e);
          toast.error('Error al inicializar la sesión.');
        } finally {
          set({ isLoading: false, isInitialized: true });
        }
      },

      fetchCloudData: async (userId) => {
        if (!supabase) return;
        set({ isLoading: true });
        try {
          const [betsRes, bankrollsRes, tipstersRes, transactionsRes] = await Promise.all([
            supabase.from('bets').select('*').eq('user_id', userId),
            supabase.from('bankrolls').select('*').eq('user_id', userId),
            supabase.from('tipsters').select('*').eq('user_id', userId),
            supabase.from('transactions').select('*').eq('user_id', userId)
          ]);

          if (betsRes.error) throw betsRes.error;
          if (bankrollsRes.error) throw bankrollsRes.error;
          if (tipstersRes.error) throw tipstersRes.error;
          if (transactionsRes.error) throw transactionsRes.error;

          set({
            bets: betsRes.data || [],
            bankrolls: bankrollsRes.data || [],
            tipsters: tipstersRes.data || [],
            transactions: transactionsRes.data || []
          });
        } catch (e) {
          console.error('Error fetching data from Supabase:', e);
          toast.error('Error al descargar los datos de la nube.');
        } finally {
          set({ isLoading: false });
        }
      },

      setUser: async (user) => {
        set({ user });
        if (user && supabase) {
          await get().fetchCloudData(user.id);
        } else if (!user) {
          // If sign out, clear state
          set({
            bets: [],
            bankrolls: [],
            tipsters: [],
            transactions: []
          });
        }
      },

      // Seed mock data for quick testing
      seedMockData: async () => {
        const { user } = get();
        const userId = user ? user.id : 'local_user';
        
        const mockTipsters = [
          { id: generateId('tipster'), user_id: userId, name: 'VIP Football Tips', description: 'Especialista en ligas europeas' },
          { id: generateId('tipster'), user_id: userId, name: 'Tennis Master', description: 'Circuitos ATP y WTA' }
        ];

        const mockBankrolls = [
          { id: generateId('bankroll'), user_id: userId, name: 'Banca Principal', initial_balance: 1000, description: 'Bankroll para apuestas a largo plazo' },
          { id: generateId('bankroll'), user_id: userId, name: 'Reto 10-100', initial_balance: 100, description: 'Apuestas de alto riesgo' }
        ];

        const mockTransactions = [
          { id: generateId('trans'), user_id: userId, bankroll_id: mockBankrolls[0].id, type: 'deposit', amount: 200, date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], description: 'Aporte extraordinario' }
        ];

        const mockBets = [
          {
            id: generateId('bet'),
            user_id: userId,
            sport: 'Fútbol',
            event: 'Real Madrid vs Barcelona',
            market: 'Ganador Real Madrid',
            odds: 1.95,
            stake: 50,
            stake_units: 5,
            bookmaker: 'Bet365',
            date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'won',
            bankroll_id: mockBankrolls[0].id,
            tipster_id: mockTipsters[0].id
          },
          {
            id: generateId('bet'),
            user_id: userId,
            sport: 'Tenis',
            event: 'Nadal vs Alcaraz',
            market: 'Ganador Alcaraz',
            odds: 2.10,
            stake: 30,
            stake_units: 3,
            bookmaker: 'Bwin',
            date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'lost',
            bankroll_id: mockBankrolls[0].id,
            tipster_id: mockTipsters[1].id
          },
          {
            id: generateId('bet'),
            user_id: userId,
            sport: 'Fútbol',
            event: 'Manchester City vs Chelsea',
            market: 'Más de 2.5 goles',
            odds: 1.80,
            stake: 40,
            stake_units: 4,
            bookmaker: 'Betway',
            date: new Date().toISOString().split('T')[0],
            status: 'pending',
            bankroll_id: mockBankrolls[0].id,
            tipster_id: mockTipsters[0].id
          },
          {
            id: generateId('bet'),
            user_id: userId,
            sport: 'Baloncesto',
            event: 'Lakers vs Celtics',
            market: 'Ganador Lakers (Hándicap -3)',
            odds: 1.90,
            stake: 20,
            stake_units: 20,
            bookmaker: 'Codere',
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            status: 'void',
            bankroll_id: mockBankrolls[1].id,
            tipster_id: null
          }
        ];

        if (supabase && user) {
          set({ isLoading: true });
          try {
            // Delete old data first to avoid clutter
            await Promise.all([
              supabase.from('bets').delete().eq('user_id', userId),
              supabase.from('transactions').delete().eq('user_id', userId),
              supabase.from('bankrolls').delete().eq('user_id', userId),
              supabase.from('tipsters').delete().eq('user_id', userId)
            ]);

            // Confirmed inserts
            const tipstersRes = await supabase.from('tipsters').insert(mockTipsters).select();
            if (tipstersRes.error) throw tipstersRes.error;
            
            const bankrollsRes = await supabase.from('bankrolls').insert(mockBankrolls).select();
            if (bankrollsRes.error) throw bankrollsRes.error;
            
            const transRes = await supabase.from('transactions').insert(mockTransactions).select();
            if (transRes.error) throw transRes.error;

            const betsRes = await supabase.from('bets').insert(mockBets).select();
            if (betsRes.error) throw betsRes.error;

            set({
              tipsters: tipstersRes.data || [],
              bankrolls: bankrollsRes.data || [],
              transactions: transRes.data || [],
              bets: betsRes.data || []
            });
            toast.success('Datos de prueba cargados en la nube con éxito.');
          } catch (e) {
            console.error('Error seeding data to Supabase:', e);
            toast.error(`Error al cargar datos en la nube: ${e.message}`);
          } finally {
            set({ isLoading: false });
          }
        } else {
          // Local Mode
          set({
            tipsters: mockTipsters,
            bankrolls: mockBankrolls,
            transactions: mockTransactions,
            bets: mockBets
          });
          toast.success('Datos de prueba cargados localmente.');
        }
      },

      clearAllData: async () => {
        const { user } = get();
        if (supabase && user) {
          set({ isLoading: true });
          try {
            await Promise.all([
              supabase.from('bets').delete().eq('user_id', user.id),
              supabase.from('transactions').delete().eq('user_id', user.id),
              supabase.from('bankrolls').delete().eq('user_id', user.id),
              supabase.from('tipsters').delete().eq('user_id', user.id)
            ]);
            set({ bets: [], bankrolls: [], tipsters: [], transactions: [] });
            toast.success('Todos los datos han sido borrados de la nube.');
          } catch (e) {
            console.error('Error clearing data:', e);
            toast.error(`Error al borrar datos: ${e.message}`);
          } finally {
            set({ isLoading: false });
          }
        } else {
          // Local Mode
          set({ bets: [], bankrolls: [], tipsters: [], transactions: [] });
          toast.success('Todos los datos locales han sido borrados.');
        }
      },

      importBackupData: async (backup) => {
        const { user } = get();
        const userId = user ? user.id : 'local_user';
        
        // Re-assign user_ids for safety
        const bets = (backup.bets || []).map(b => ({ ...b, user_id: userId }));
        const bankrolls = (backup.bankrolls || []).map(b => ({ ...b, user_id: userId }));
        const tipsters = (backup.tipsters || []).map(t => ({ ...t, user_id: userId }));
        const transactions = (backup.transactions || []).map(t => ({ ...t, user_id: userId }));

        if (supabase && user) {
          set({ isLoading: true });
          try {
            // Delete current data first
            await Promise.all([
              supabase.from('bets').delete().eq('user_id', userId),
              supabase.from('transactions').delete().eq('user_id', userId),
              supabase.from('bankrolls').delete().eq('user_id', userId),
              supabase.from('tipsters').delete().eq('user_id', userId)
            ]);

            // Confirmed imports
            if (tipsters.length > 0) {
              const res = await supabase.from('tipsters').insert(tipsters);
              if (res.error) throw res.error;
            }
            if (bankrolls.length > 0) {
              const res = await supabase.from('bankrolls').insert(bankrolls);
              if (res.error) throw res.error;
            }
            if (transactions.length > 0) {
              const res = await supabase.from('transactions').insert(transactions);
              if (res.error) throw res.error;
            }
            if (bets.length > 0) {
              const res = await supabase.from('bets').insert(bets);
              if (res.error) throw res.error;
            }

            await get().fetchCloudData(userId);
            toast.success('Copia de seguridad importada con éxito.');
          } catch (e) {
            console.error('Error importing backup data to Supabase:', e);
            toast.error(`Error al importar copia de seguridad: ${e.message}`);
          } finally {
            set({ isLoading: false });
          }
        } else {
          // Local Mode
          set({ bets, bankrolls, tipsters, transactions });
          toast.success('Copia de seguridad importada localmente.');
        }
      },

      // Bets Mutations
      addBet: async (betData) => {
        const { user } = get();
        const userId = user ? user.id : 'local_user';
        
        const newBet = {
          ...betData,
          id: generateId('bet'),
          user_id: userId,
          date: betData.date || new Date().toISOString().split('T')[0],
          status: betData.status || 'pending'
        };

        if (supabase && user) {
          set({ isLoading: true });
          try {
            const { data, error } = await supabase.from('bets').insert([newBet]).select();
            if (error) throw error;
            
            const inserted = data[0];
            set(state => ({ bets: [inserted, ...state.bets] }));
            toast.success('Apuesta creada con éxito.');
          } catch (e) {
            console.error('Error adding bet to Supabase:', e);
            toast.error(`Error al crear apuesta: ${e.message}`);
            throw e; // Propagate for react-hook-form handles
          } finally {
            set({ isLoading: false });
          }
        } else {
          // Local Mode
          set(state => ({ bets: [newBet, ...state.bets] }));
          toast.success('Apuesta creada localmente.');
        }
      },

      updateBet: async (updatedBet) => {
        if (supabase && get().user) {
          set({ isLoading: true });
          try {
            const { error } = await supabase
              .from('bets')
              .update(updatedBet)
              .eq('id', updatedBet.id);
            if (error) throw error;
            
            set(state => ({
              bets: state.bets.map(b => b.id === updatedBet.id ? updatedBet : b)
            }));
            toast.success('Apuesta modificada con éxito.');
          } catch (e) {
            console.error('Error updating bet on Supabase:', e);
            toast.error(`Error al modificar apuesta: ${e.message}`);
            throw e;
          } finally {
            set({ isLoading: false });
          }
        } else {
          // Local Mode
          set(state => ({
            bets: state.bets.map(b => b.id === updatedBet.id ? updatedBet : b)
          }));
          toast.success('Apuesta modificada localmente.');
        }
      },

      deleteBet: async (id) => {
        if (supabase && get().user) {
          set({ isLoading: true });
          try {
            const { error } = await supabase.from('bets').delete().eq('id', id);
            if (error) throw error;
            
            set(state => ({ bets: state.bets.filter(b => b.id !== id) }));
            toast.success('Apuesta eliminada.');
          } catch (e) {
            console.error('Error deleting bet on Supabase:', e);
            toast.error(`Error al borrar apuesta: ${e.message}`);
            throw e;
          } finally {
            set({ isLoading: false });
          }
        } else {
          // Local Mode
          set(state => ({ bets: state.bets.filter(b => b.id !== id) }));
          toast.success('Apuesta eliminada localmente.');
        }
      },

      settleBet: async (id, status) => {
        const bet = get().bets.find(b => b.id === id);
        if (!bet) return;
        
        const updatedBet = { ...bet, status };
        
        if (supabase && get().user) {
          set({ isLoading: true });
          try {
            const { error } = await supabase
              .from('bets')
              .update({ status })
              .eq('id', id);
            if (error) throw error;
            
            set(state => ({
              bets: state.bets.map(b => b.id === id ? updatedBet : b)
            }));
            toast.success(`Apuesta liquidada como ${status.toUpperCase()}.`);
          } catch (e) {
            console.error('Error settling bet on Supabase:', e);
            toast.error(`Error al liquidar apuesta: ${e.message}`);
            throw e;
          } finally {
            set({ isLoading: false });
          }
        } else {
          // Local Mode
          set(state => ({
            bets: state.bets.map(b => b.id === id ? updatedBet : b)
          }));
          toast.success(`Apuesta liquidada como ${status.toUpperCase()} localmente.`);
        }
      },

      // Bankrolls Mutations
      addBankroll: async (bankrollData) => {
        const { user } = get();
        const userId = user ? user.id : 'local_user';
        
        const newBankroll = {
          ...bankrollData,
          id: generateId('bankroll'),
          user_id: userId,
          initial_balance: Number(bankrollData.initial_balance) || 0
        };

        if (supabase && user) {
          set({ isLoading: true });
          try {
            const { data, error } = await supabase.from('bankrolls').insert([newBankroll]).select();
            if (error) throw error;
            
            const inserted = data[0];
            set(state => ({ bankrolls: [...state.bankrolls, inserted] }));
            toast.success('Banca creada con éxito.');
          } catch (e) {
            console.error('Error adding bankroll to Supabase:', e);
            toast.error(`Error al crear banca: ${e.message}`);
            throw e;
          } finally {
            set({ isLoading: false });
          }
        } else {
          // Local Mode
          set(state => ({ bankrolls: [...state.bankrolls, newBankroll] }));
          toast.success('Banca creada localmente.');
        }
      },

      updateBankroll: async (updatedBankroll) => {
        const cleanBankroll = {
          ...updatedBankroll,
          initial_balance: Number(updatedBankroll.initial_balance) || 0
        };

        if (supabase && get().user) {
          set({ isLoading: true });
          try {
            const { error } = await supabase
              .from('bankrolls')
              .update(cleanBankroll)
              .eq('id', cleanBankroll.id);
            if (error) throw error;
            
            set(state => ({
              bankrolls: state.bankrolls.map(b => b.id === cleanBankroll.id ? cleanBankroll : b)
            }));
            toast.success('Banca modificada con éxito.');
          } catch (e) {
            console.error('Error updating bankroll on Supabase:', e);
            toast.error(`Error al modificar banca: ${e.message}`);
            throw e;
          } finally {
            set({ isLoading: false });
          }
        } else {
          // Local Mode
          set(state => ({
            bankrolls: state.bankrolls.map(b => b.id === cleanBankroll.id ? cleanBankroll : b)
          }));
          toast.success('Banca modificada localmente.');
        }
      },

      deleteBankroll: async (id) => {
        const associatedBets = get().bets.filter(b => b.bankroll_id === id);
        if (associatedBets.length > 0) {
          toast.error(`No puedes borrar una banca que contiene apuestas. (${associatedBets.length} registradas)`);
          return;
        }

        if (supabase && get().user) {
          set({ isLoading: true });
          try {
            // Delete associated transactions first
            await supabase.from('transactions').delete().eq('bankroll_id', id);
            
            const { error } = await supabase.from('bankrolls').delete().eq('id', id);
            if (error) throw error;
            
            set(state => ({
              bankrolls: state.bankrolls.filter(b => b.id !== id),
              transactions: state.transactions.filter(t => t.bankroll_id !== id)
            }));
            toast.success('Banca eliminada.');
          } catch (e) {
            console.error('Error deleting bankroll on Supabase:', e);
            toast.error(`Error al borrar banca: ${e.message}`);
            throw e;
          } finally {
            set({ isLoading: false });
          }
        } else {
          // Local Mode
          set(state => ({
            bankrolls: state.bankrolls.filter(b => b.id !== id),
            transactions: state.transactions.filter(t => t.bankroll_id !== id)
          }));
          toast.success('Banca eliminada localmente.');
        }
      },

      // Tipsters Mutations
      addTipster: async (tipsterData) => {
        const { user } = get();
        const userId = user ? user.id : 'local_user';
        
        const newTipster = {
          ...tipsterData,
          id: generateId('tipster'),
          user_id: userId
        };

        if (supabase && user) {
          set({ isLoading: true });
          try {
            const { data, error } = await supabase.from('tipsters').insert([newTipster]).select();
            if (error) throw error;
            
            const inserted = data[0];
            set(state => ({ tipsters: [...state.tipsters, inserted] }));
            toast.success('Tipster añadido con éxito.');
          } catch (e) {
            console.error('Error adding tipster to Supabase:', e);
            toast.error(`Error al añadir tipster: ${e.message}`);
            throw e;
          } finally {
            set({ isLoading: false });
          }
        } else {
          // Local Mode
          set(state => ({ tipsters: [...state.tipsters, newTipster] }));
          toast.success('Tipster añadido localmente.');
        }
      },

      updateTipster: async (updatedTipster) => {
        if (supabase && get().user) {
          set({ isLoading: true });
          try {
            const { error } = await supabase
              .from('tipsters')
              .update(updatedTipster)
              .eq('id', updatedTipster.id);
            if (error) throw error;
            
            set(state => ({
              tipsters: state.tipsters.map(t => t.id === updatedTipster.id ? updatedTipster : t)
            }));
            toast.success('Tipster modificado con éxito.');
          } catch (e) {
            console.error('Error updating tipster on Supabase:', e);
            toast.error(`Error al modificar tipster: ${e.message}`);
            throw e;
          } finally {
            set({ isLoading: false });
          }
        } else {
          // Local Mode
          set(state => ({
            tipsters: state.tipsters.map(t => t.id === updatedTipster.id ? updatedTipster : t)
          }));
          toast.success('Tipster modificado localmente.');
        }
      },

      deleteTipster: async (id) => {
        if (supabase && get().user) {
          set({ isLoading: true });
          try {
            // Nullify associated bets in cloud
            await supabase
              .from('bets')
              .update({ tipster_id: null })
              .eq('tipster_id', id);

            const { error } = await supabase.from('tipsters').delete().eq('id', id);
            if (error) throw error;
            
            set(state => ({
              tipsters: state.tipsters.filter(t => t.id !== id),
              bets: state.bets.map(b => b.tipster_id === id ? { ...b, tipster_id: null } : b)
            }));
            toast.success('Tipster eliminado (apuestas desvinculadas).');
          } catch (e) {
            console.error('Error deleting tipster on Supabase:', e);
            toast.error(`Error al eliminar tipster: ${e.message}`);
            throw e;
          } finally {
            set({ isLoading: false });
          }
        } else {
          // Local Mode
          set(state => ({
            tipsters: state.tipsters.filter(t => t.id !== id),
            bets: state.bets.map(b => b.tipster_id === id ? { ...b, tipster_id: null } : b)
          }));
          toast.success('Tipster eliminado localmente.');
        }
      },

      // Transactions (Deposits / Withdrawals) Mutations
      addTransaction: async (transData) => {
        const { user } = get();
        const userId = user ? user.id : 'local_user';
        
        const newTrans = {
          ...transData,
          id: generateId('trans'),
          user_id: userId,
          amount: Number(transData.amount) || 0,
          date: transData.date || new Date().toISOString().split('T')[0]
        };

        if (supabase && user) {
          set({ isLoading: true });
          try {
            const { data, error } = await supabase.from('transactions').insert([newTrans]).select();
            if (error) throw error;
            
            const inserted = data[0];
            set(state => ({ transactions: [...state.transactions, inserted] }));
            toast.success('Transacción registrada con éxito.');
          } catch (e) {
            console.error('Error adding transaction to Supabase:', e);
            toast.error(`Error al registrar transacción: ${e.message}`);
            throw e;
          } finally {
            set({ isLoading: false });
          }
        } else {
          // Local Mode
          set(state => ({ transactions: [...state.transactions, newTrans] }));
          toast.success('Transacción registrada localmente.');
        }
      }
    }),
    {
      name: 'betflow_store_data',
      partialize: (state) => ({
        bets: state.bets,
        bankrolls: state.bankrolls,
        tipsters: state.tipsters,
        transactions: state.transactions
      })
    }
  )
);
export default useBetStore;
