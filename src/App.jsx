import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import TopPage from './pages/TopPage';
import UserPage from './pages/user/UserPage';
import SupporterPage from './pages/supporter/SupporterPage';
import AdminPage from './pages/admin/AdminPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<TopPage />} />
          <Route path="/user" element={<UserPage />} />
          <Route path="/supporter" element={<SupporterPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
