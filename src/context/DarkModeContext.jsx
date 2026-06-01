import { createContext, useContext, useEffect, useState } from 'react'

const Ctx = createContext(null)
export const useDarkMode = () => useContext(Ctx)

export function DarkModeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('voice_dark') === 'true' } catch { return false }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    try { localStorage.setItem('voice_dark', dark) } catch {}
  }, [dark])

  const toggleDark = () => setDark(d => !d)
  return <Ctx.Provider value={{ dark, toggleDark }}>{children}</Ctx.Provider>
}
