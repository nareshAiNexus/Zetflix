import { create } from 'zustand';

const initialEmail = localStorage.getItem('userEmail') || '';
const initialName = localStorage.getItem('userName') || '';

const useAuthStore = create((set) => ({
  user: initialEmail ? { email: initialEmail, name: initialName } : null,
  login: (email, name) => {
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userName', name);
    set({ user: { email, name } });
  },
  logout: () => {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    set({ user: null });
  },
  updateName: (name) => {
    localStorage.setItem('userName', name);
    set((state) => ({ user: { ...state.user, name } }));
  }
}));

export default useAuthStore;
