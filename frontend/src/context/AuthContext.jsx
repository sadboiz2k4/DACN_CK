import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const defaultAuthValue = {
  user: null,
  login: () => {},
  logout: () => {},
  loading: true,
  isAdmin: false,
}

const AuthContext = createContext(defaultAuthValue)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (token && userData) {
      setUser(JSON.parse(userData))
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
    setLoading(false)
  }, [])

  const login = (authData) => {
    localStorage.setItem('token', authData.token)
    localStorage.setItem('user', JSON.stringify({
      id: authData.userId,
      email: authData.email,
      fullName: authData.fullName,
      role: authData.role,
    }))
    localStorage.removeItem('ai_chat_history')
    api.defaults.headers.common['Authorization'] = `Bearer ${authData.token}`
    setUser({ id: authData.userId, email: authData.email, fullName: authData.fullName, role: authData.role })
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('ai_chat_history')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin: user?.role === 'ADMIN' }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext) ?? defaultAuthValue
