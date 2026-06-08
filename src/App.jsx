import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from './context/AuthContext'
import Header from './components/Header'
import LoadingScreen from './components/LoadingScreen'
import PWABanner from './components/PWABanner'
import BreakingBanner from './components/BreakingBanner'
import Footer from './components/Footer'

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
const LettersPage     = lazy(() => import('./pages/LettersPage'))
const AboutPage       = lazy(() => import('./pages/AboutPage'))
const OriginalsPage   = lazy(() => import('./pages/OriginalsPage'))
const ExplainedPage   = lazy(() => import('./pages/ExplainedPage'))
const BPlusPage       = lazy(() => import('./pages/BPlusPage'))
const EpaperPage      = lazy(() => import('./pages/EpaperPage'))
const NotFoundPage    = lazy(() => import('./pages/NotFoundPage'))

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" replace />
  if (adminOnly && profile?.role !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  const location = useLocation()
  const { loading } = useAuth()
  if (loading) return <LoadingScreen />
  return (
    <>
      <Header />
      <BreakingBanner />
      <PWABanner />
      <Suspense fallback={<LoadingScreen />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/"              element={<Home />} />
            <Route path="/auth"          element={<AuthPage />} />
            <Route path="/article/:id"   element={<ArticlePage />} />
            <Route path="/category/:cat" element={<CategoryPage />} />
            <Route path="/search"        element={<SearchPage />} />
            <Route path="/trending"      element={<TrendingPage />} />
            <Route path="/profile/:uid"  element={<ProfilePage />} />
            <Route path="/digest"        element={<DigestPage />} />
            <Route path="/tip"           element={<TipPage />} />
            <Route path="/apply"         element={<ApplyPage />} />
            <Route path="/letters"       element={<LettersPage />} />
            <Route path="/about"         element={<AboutPage />} />
            <Route path="/originals"     element={<OriginalsPage />} />
            <Route path="/explained"     element={<ExplainedPage />} />
            <Route path="/bplus"         element={<BPlusPage />} />
            <Route path="/epaper"        element={<EpaperPage />} />
            <Route path="/not-found"     element={<NotFoundPage />} />
            <Route path="/write"         element={<ProtectedRoute><WritePage /></ProtectedRoute>} />
            <Route path="/edit/:id"      element={<ProtectedRoute><WritePage /></ProtectedRoute>} />
            <Route path="/dashboard"     element={<ProtectedRoute><WriterDashboard /></ProtectedRoute>} />
            <Route path="/read-later"    element={<ProtectedRoute><ReadLaterPage /></ProtectedRoute>} />
            <Route path="/admin"         element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
            <Route path="*"              element={<NotFoundPage />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
      <Footer />
    </>
  )
}
