import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AppLayout from './components/Layout/AppLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Wallets from './pages/Wallets'
import Reports from './pages/Reports'
import AIAssistant from './pages/AIAssistant'
import Profile from './pages/Profile'
import AdminDashboard from './pages/Admin/AdminDashboard'
import Categories from './pages/Categories'
import Budget from './pages/Budget'
import Forecast from './pages/Forecast'
import Debts from './pages/Debts'
import Recurring from './pages/Recurring'

function Spinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
    </div>
  )
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  return user ? <Navigate to="/" replace /> : children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />

      <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        <Route index                element={<Dashboard />} />
        <Route path="transactions"  element={<Transactions />} />
        <Route path="wallets"       element={<Wallets />} />
        <Route path="reports"       element={<Reports />} />
        <Route path="ai"            element={<AIAssistant />} />
        <Route path="categories"    element={<Categories />} />
        <Route path="budget"        element={<Budget />} />
        <Route path="forecast"      element={<Forecast />} />
        <Route path="debts"         element={<Debts />} />
        <Route path="recurring"     element={<Recurring />} />
        <Route path="profile"       element={<Profile />} />
        <Route path="admin"         element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
