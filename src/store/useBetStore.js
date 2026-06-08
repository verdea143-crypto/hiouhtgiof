import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';
import { db } from '../db/firebaseClient';
import { authService } from '../services/authService';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  updateDoc
} from 'firebase/firestore';

const generateId = (prefix) => `${prefix}_${Math.random().toString(36).substring(2, 11)}`;

// Helper to delete user data in chunks of 500
const deleteUserCollections = async (db, userId, collections) => {
  const allDeletes = [];
  
  for (const colName of collections) {
    const colRef = collection(db, colName);
    const q = query(colRef, where('user_id', '==', userId));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((docSnap) => {
      allDeletes.push(docSnap.ref);
    });
  }
  
  const CHUNK_SIZE = 500;
  for (let i = 0; i < allDeletes.length; i += CHUNK_SIZE) {
    const chunk = allDeletes.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((ref) => {
      batch.delete(ref);
    });
    await batch.commit();
  }
};

// Helper to batch insert docs in chunks of 500
const batchInsertDocs = async (db, colName, docs) => {
  if (!docs || docs.length === 0) return;
  const CHUNK_SIZE = 500;
  for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
    const chunk = docs.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((item) => {
      const docRef = item.id ? doc(db, colName, item.id) : doc(collection(db, colName));
      batch.set(docRef, item);
    });
    await batch.commit();
  }
};

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
      isCloudActive: () => db !== null,
      
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
          
          if (currentUser && db) {
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
        if (!db) return;
        set({ isLoading: true });
        try {
          const collections = ['bets', 'bankrolls', 'tipsters', 'transactions'];
          const fetchPromises = collections.map(async (colName) => {
            const colRef = collection(db, colName);
            const q = query(colRef, where('user_id', '==', userId));
            const querySnapshot = await getDocs(q);
            const data = [];
            querySnapshot.forEach((docSnap) => {
              data.push({ ...docSnap.data(), id: docSnap.id });
            });
            return { colName, data };
          });

          const results = await Promise.all(fetchPromises);
          const stateUpdate = {};
          results.forEach(({ colName, data }) => {
            stateUpdate[colName] = data;
          });

          set(stateUpdate);
        } catch (e) {
          console.error('Error fetching data from Firestore:', e);
          toast.error('Error al descargar los datos de la nube.');
        } finally {
          set({ isLoading: false });
        }
      },

      setUser: async (user) => {
        set({ user });
        if (user && db) {
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

        if (db && user) {
          set({ isLoading: true });
          try {
            // Delete old data first to avoid clutter
            await deleteUserCollections(db, userId, ['bets', 'transactions', 'bankrolls', 'tipsters']);

            // Batch insert new mock data using 500-safe helper
            await batchInsertDocs(db, 'tipsters', mockTipsters);
            await batchInsertDocs(db, 'bankrolls', mockBankrolls);
            await batchInsertDocs(db, 'transactions', mockTransactions);
            await batchInsertDocs(db, 'bets', mockBets);

            set({
              tipsters: mockTipsters,
              bankrolls: mockBankrolls,
              transactions: mockTransactions,
              bets: mockBets
            });
            toast.success('Datos de prueba cargados en la nube con éxito.');
          } catch (e) {
            console.error('Error seeding data to Firestore:', e);
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
        if (db && user) {
          set({ isLoading: true });
          try {
            await deleteUserCollections(db, user.id, ['bets', 'transactions', 'bankrolls', 'tipsters']);
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

        if (db && user) {
          set({ isLoading: true });
          try {
            // Delete current data first
            await deleteUserCollections(db, userId, ['bets', 'transactions', 'bankrolls', 'tipsters']);

            // Confirmed batch imports
            await batchInsertDocs(db, 'tipsters', tipsters);
            await batchInsertDocs(db, 'bankrolls', bankrolls);
            await batchInsertDocs(db, 'transactions', transactions);
            await batchInsertDocs(db, 'bets', bets);

            await get().fetchCloudData(userId);
            toast.success('Copia de seguridad importada con éxito.');
          } catch (e) {
            console.error('Error importing backup data to Firestore:', e);
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

        if (db && user) {
          set({ isLoading: true });
          try {
            await setDoc(doc(db, 'bets', newBet.id), newBet);
            set(state => ({ bets: [newBet, ...state.bets] }));
            toast.success('Apuesta creada con éxito.');
          } catch (e) {
            console.error('Error adding bet to Firestore:', e);
            toast.error(`Error al crear apuesta: ${e.message}`);
            throw e;
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
        if (db && get().user) {
          set({ isLoading: true });
          try {
            await setDoc(doc(db, 'bets', updatedBet.id), updatedBet);
            set(state => ({
              bets: state.bets.map(b => b.id === updatedBet.id ? updatedBet : b)
            }));
            toast.success('Apuesta modificada con éxito.');
          } catch (e) {
            console.error('Error updating bet on Firestore:', e);
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
        if (db && get().user) {
          set({ isLoading: true });
          try {
            await deleteDoc(doc(db, 'bets', id));
            set(state => ({ bets: state.bets.filter(b => b.id !== id) }));
            toast.success('Apuesta eliminada.');
          } catch (e) {
            console.error('Error deleting bet on Firestore:', e);
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
        
        if (db && get().user) {
          set({ isLoading: true });
          try {
            await updateDoc(doc(db, 'bets', id), { status });
            set(state => ({
              bets: state.bets.map(b => b.id === id ? updatedBet : b)
            }));
            toast.success(`Apuesta liquidada como ${status.toUpperCase()}.`);
          } catch (e) {
            console.error('Error settling bet on Firestore:', e);
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

        if (db && user) {
          set({ isLoading: true });
          try {
            await setDoc(doc(db, 'bankrolls', newBankroll.id), newBankroll);
            set(state => ({ bankrolls: [...state.bankrolls, newBankroll] }));
            toast.success('Banca creada con éxito.');
          } catch (e) {
            console.error('Error adding bankroll to Firestore:', e);
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

        if (db && get().user) {
          set({ isLoading: true });
          try {
            await setDoc(doc(db, 'bankrolls', cleanBankroll.id), cleanBankroll);
            set(state => ({
              bankrolls: state.bankrolls.map(b => b.id === cleanBankroll.id ? cleanBankroll : b)
            }));
            toast.success('Banca modificada con éxito.');
          } catch (e) {
            console.error('Error updating bankroll on Firestore:', e);
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

        if (db && get().user) {
          set({ isLoading: true });
          try {
            // Delete associated transactions first
            const transRef = collection(db, 'transactions');
            const q = query(transRef, where('bankroll_id', '==', id));
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);
            querySnapshot.forEach((docSnap) => {
              batch.delete(docSnap.ref);
            });
            await batch.commit();
            
            // Delete the bankroll
            await deleteDoc(doc(db, 'bankrolls', id));
            
            set(state => ({
              bankrolls: state.bankrolls.filter(b => b.id !== id),
              transactions: state.transactions.filter(t => t.bankroll_id !== id)
            }));
            toast.success('Banca eliminada.');
          } catch (e) {
            console.error('Error deleting bankroll on Firestore:', e);
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

        if (db && user) {
          set({ isLoading: true });
          try {
            await setDoc(doc(db, 'tipsters', newTipster.id), newTipster);
            set(state => ({ tipsters: [...state.tipsters, newTipster] }));
            toast.success('Tipster añadido con éxito.');
          } catch (e) {
            console.error('Error adding tipster to Firestore:', e);
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
        if (db && get().user) {
          set({ isLoading: true });
          try {
            await setDoc(doc(db, 'tipsters', updatedTipster.id), updatedTipster);
            set(state => ({
              tipsters: state.tipsters.map(t => t.id === updatedTipster.id ? updatedTipster : t)
            }));
            toast.success('Tipster modificado con éxito.');
          } catch (e) {
            console.error('Error updating tipster on Firestore:', e);
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
        if (db && get().user) {
          set({ isLoading: true });
          try {
            // Nullify associated bets in cloud
            const betsRef = collection(db, 'bets');
            const q = query(betsRef, where('tipster_id', '==', id));
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);
            querySnapshot.forEach((docSnap) => {
              batch.update(docSnap.ref, { tipster_id: null });
            });
            await batch.commit();

            // Delete the tipster
            await deleteDoc(doc(db, 'tipsters', id));
            
            set(state => ({
              tipsters: state.tipsters.filter(t => t.id !== id),
              bets: state.bets.map(b => b.tipster_id === id ? { ...b, tipster_id: null } : b)
            }));
            toast.success('Tipster eliminado (apuestas desvinculadas).');
          } catch (e) {
            console.error('Error deleting tipster on Firestore:', e);
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

        if (db && user) {
          set({ isLoading: true });
          try {
            await setDoc(doc(db, 'transactions', newTrans.id), newTrans);
            set(state => ({ transactions: [...state.transactions, newTrans] }));
            toast.success('Transacción registrada con éxito.');
          } catch (e) {
            console.error('Error adding transaction to Firestore:', e);
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
