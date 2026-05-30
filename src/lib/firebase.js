import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAir8OoteARhE-Q2G1P6rsxsJt7dO5yV6g",
  authDomain: "the-voice-81320.firebaseapp.com",
  projectId: "the-voice-81320",
  storageBucket: "the-voice-81320.firebasestorage.app",
  messagingSenderId: "411937490210",
  appId: "1:411937490210:web:5f25ee6d70aba5bb6cd17b"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

export const ADMIN_EMAIL = 'tisa.helpdesk@gmail.com'
export const CLOUDINARY_CLOUD = 'dt8zbihji'
export const CLOUDINARY_PRESET = 'the_voice_uploads'
