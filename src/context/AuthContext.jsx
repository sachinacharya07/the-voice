import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, ADMIN_EMAIL } from '../lib/firebase'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u)
        const ref = doc(db, 'users', u.uid)
        const snap = await getDoc(ref)
        if (!snap.exists()) {
          const isAdmin = u.email === ADMIN_EMAIL
          const data = {
            uid: u.uid,
            name: u.displayName || u.email.split('@')[0],
            email: u.email,
            photo: u.photoURL || null,
            role: isAdmin ? 'admin' : 'reader',
            createdAt: serverTimestamp()
          }
          await setDoc(ref, data)
          setProfile(data)
        } else {
          const data = snap.data()
          if (u.email === ADMIN_EMAIL && data.role !== 'admin') {
            await setDoc(ref, { role: 'admin' }, { merge: true })
            setProfile({ ...data, role: 'admin' })
          } else {
            setProfile(data)
          }
        }
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })
  }, [])

  const logout = () => signOut(auth)
  const isAdmin = profile?.role === 'admin'
  const isWriter = profile?.role === 'writer' || isAdmin
  const canWrite = isWriter || isAdmin

  return (
    <Ctx.Provider value={{ user, profile, loading, logout, isAdmin, isWriter, canWrite }}>
      {children}
    </Ctx.Provider>
  )
}
