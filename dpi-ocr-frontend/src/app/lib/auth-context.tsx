import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react"
import {
  authApi,
  getToken,
  setToken,
  onUnauthorized,
  AuthUser,
  ApiError,
} from "./api"

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const USER_KEY = "keppler_user"

// Embedded inside the hospital's HMS, which already authenticated the user --
// there's no separate Keppler identity for them to sign in with, so this app
// signs itself in behind the scenes with a single shared service account
// instead of showing its own login screen.
const EMBED_USERNAME = "hms-embed"
const EMBED_PASSWORD = "HmsEmbed-2026!Keppler"

function loadStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() =>
    getToken() ? loadStoredUser() : null,
  )
  const [loading, setLoading] = useState(!user)

  const login = useCallback(async (username: string, password: string) => {
    const res = await authApi.login(username, password)
    setToken(res.access_token)
    const authUser = { user_id: res.user_id, username: res.username }
    localStorage.setItem(USER_KEY, JSON.stringify(authUser))
    setUser(authUser)
  }, [])

  const register = useCallback(async (username: string, password: string) => {
    await authApi.register(username, password)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  // Silently sign in as the shared embed account instead of showing a login
  // screen. The account may not exist yet on a fresh database, so a failed
  // login falls back to registering it once, then logging in for real --
  // registration itself failing (e.g. "already exists", from another tab/
  // iframe reload winning the same race) isn't fatal, so the final login is
  // always attempted rather than only on a successful register.
  const signInEmbed = useCallback(async () => {
    try {
      await login(EMBED_USERNAME, EMBED_PASSWORD)
    } catch {
      try {
        await register(EMBED_USERNAME, EMBED_PASSWORD)
      } catch {
        // ignore -- most likely the account already exists
      }
      try {
        await login(EMBED_USERNAME, EMBED_PASSWORD)
      } catch (err) {
        console.error("Keppler embed auto-login failed:", err)
      }
    } finally {
      setLoading(false)
    }
  }, [login, register])

  // A 401 from any API call means the stored token is dead (expired or
  // invalidated) -- clear it and immediately sign back in as the embed
  // account, since there's no login screen for a person to do that from.
  useEffect(() => {
    onUnauthorized(() => {
      logout()
      setLoading(true)
      void signInEmbed()
    })
  }, [logout, signInEmbed])

  useEffect(() => {
    if (user) return
    void signInEmbed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}

export { ApiError }
