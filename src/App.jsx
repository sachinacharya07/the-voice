import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Header from './components/Header'
import Footer from './components/Footer'
import PWABanner from './components/PWABanner'
import LoadingScreen from './components/LoadingScreen'

const Home            = lazy(() => import('./pages/Home'))
const ArticlePage     = lazy(() => import('./pages/ArticlePage'))
const CategoryPage    = lazy(() => import('./pages/CategoryPage'))
const WritePage       = lazy(() => import('./pages/WritePage'))
const AdminPage       = lazy(() => import('./pages/AdminPage'))
const AuthPage        = lazy(() => import('./pages/AuthPage'))
const ProfilePage     = lazy(() => import('./pages/ProfilePage'))
const SearchPage      = lazy(() => import('./pages/SearchPage'))
const TrendingPage    = lazy(() => import('./pages/TrendingPage'))
const WriterDashboard = lazy(() => import('./pages/WriterDashboard'))
const ReadLaterPage   = lazy(() => import('./pages/ReadLaterPage'))
const DigestPage      = lazy(() => import('./pages/DigestPage'))
const TipPage         = lazy(() => import('./pages/TipPage'))
const ApplyPage       = lazy(() => import('./pages/ApplyPage'))
const AboutPage       = lazy(() => import('./pages/AboutPage'))
const LettersPage     = lazy(() => import('./pages/LettersPage'))

function PageLoader() {
  return (
    <div style={{minHeight:'60vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:'28px',height:'28px',border:'2px solid #e0ddd8',borderTopColor:'#0d0d0d',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" replace />
  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { loading } = useAuth()
  if (loading) return <LoadingScreen />

  return (
    <>
      <Header />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"              element={<Home />} />
          <Route path="/auth"          element={<AuthPage />} />
          <Route path="/about"         element={<AboutPage />} />
          <Route path="/letters"       element={<LettersPage />} />
          <Route path="/article/:id"   element={<ArticlePage />} />
          <Route path="/category/:cat" element={<CategoryPage />} />
          <Route path="/search"        element={<SearchPage />} />
          <Route path="/trending"      element={<TrendingPage />} />
          <Route path="/profile/:uid"  element={<ProfilePage />} />
          <Route path="/digest"        element={<DigestPage />} />
          <Route path="/tip"           element={<TipPage />} />
          <Route path="/apply"         element={<ApplyPage />} />
          <Route path="/write"         element={<ProtectedRoute><WritePage /></ProtectedRoute>} />
          <Route path="/edit/:id"      element={<ProtectedRoute><WritePage /></ProtectedRoute>} />
          <Route path="/dashboard"     element={<ProtectedRoute><WriterDashboard /></ProtectedRoute>} />
          <Route path="/read-later"    element={<ProtectedRoute><ReadLaterPage /></ProtectedRoute>} />
          <Route path="/admin"         element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Footer />
      <PWABanner />
    </>
  )
}
