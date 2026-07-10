import { create } from 'zustand';

const initialToken = localStorage.getItem('userToken') || '';
const initialEmail = localStorage.getItem('userEmail') || '';
const initialName = localStorage.getItem('userName') || '';
const initialRole = localStorage.getItem('userRole') || '';

const useAuthStore = create((set) => ({
  token: initialToken,
  user: initialToken ? { email: initialEmail, name: initialName, role: initialRole } : null,
  
  login: (token, email, name, role) => {
    localStorage.setItem('userToken', token);
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userName', name);
    localStorage.setItem('userRole', role);
    set({
      token,
      user: { email, name, role }
    });
  },

  logout: () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    set({
      token: '',
      user: null
    });
  },

  updateProfileState: (name, role) => {
    localStorage.setItem('userName', name);
    if (role) localStorage.setItem('userRole', role);
    set((state) => ({
      user: state.user ? { ...state.user, name, role: role || state.user.role } : null
    }));
  }
}));

export default useAuthStore;
