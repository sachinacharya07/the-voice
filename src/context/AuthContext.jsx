import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, ADMIN_EMAIL } from '../lib/firebase'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

// Cache profile in memory so re-renders don't re-fetch
let profileCache = null

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u)
        // Use cache if same user
        if (profileCache && profileCache.uid === u.uid) {
          setProfile(profileCache)
          setLoading(false)
          return
        }
        try {
          const ref  = doc(db, 'users', u.uid)
          const snap = await getDoc(ref)
          const isAdmin = u.email === ADMIN_EMAIL
          let data
          if (!snap.exists()) {
            data = {
              uid: u.uid,
              name: u.displayName || u.email.split('@')[0],
              email: u.email,
              photo: u.photoURL || null,
              role: isAdmin ? 'admin' : 'reader',
              createdAt: serverTimestamp()
            }
            await setDoc(ref, data)
          } else {
            data = snap.data()
            if (isAdmin && data.role !== 'admin') {
              await setDoc(ref, { role: 'admin' }, { merge: true })
              data = { ...data, role: 'admin' }
            }
          }
          profileCache = { ...data, uid: u.uid }
          setProfile(profileCache)
        } catch {
          // Offline fallback — use auth data only
          const fallback = { uid: u.uid, name: u.displayName, email: u.email, photo: u.photoURL, role: u.email === ADMIN_EMAIL ? 'admin' : 'reader' }
          profileCache = fallback
          setProfile(fallback)
        }
      } else {
        profileCache = null
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })
  }, [])

  const logout = () => { profileCache = null; signOut(auth) }
  const isAdmin  = profile?.role === 'admin'
  const isWriter = profile?.role === 'writer' || profile?.role === 'editor' || isAdmin

  return (
    <Ctx.Provider value={{ user, profile, loading, logout, isAdmin, isWriter }}>
      {children}
    </Ctx.Provider>
  )
}
