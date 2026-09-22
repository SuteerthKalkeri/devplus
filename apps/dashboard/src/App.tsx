import { Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from './hooks/use-session';
import { Brand } from './components/Brand';
import { ErrorMessage } from './components/ErrorMessage';
import { AuthPage } from './pages/AuthPage';
import { DashboardLayout } from './layouts/DashboardLayout';

export default function App() {
  const { account, setAccount, loading, error, retry } = useSession();
  if (loading)
    return (
      <div className="loading-screen">
        <Brand />
        <p>Connecting to your workspace…</p>
      </div>
    );
  if (error)
    return (
      <div className="loading-screen">
        <Brand />
        <ErrorMessage message={error} />
        <button className="primary" onClick={retry}>
          Try again
        </button>
      </div>
    );
  return (
    <Routes>
      <Route
        path="/login"
        element={
          account ? (
            <Navigate to="/" replace />
          ) : (
            <AuthPage key="login" register={false} onLogin={setAccount} />
          )
        }
      />
      <Route
        path="/register"
        element={
          account ? (
            <Navigate to="/" replace />
          ) : (
            <AuthPage key="register" register onLogin={setAccount} />
          )
        }
      />
      <Route
        path="/*"
        element={
          account ? (
            <DashboardLayout account={account} onLogout={() => setAccount(null)} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}
