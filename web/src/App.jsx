import { lazy, Suspense } from 'react'
import { Navigate, Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import ScrollToTop from './components/ScrollToTop'

const Home = lazy(() => import('./pages/Home'))
const Destinations = lazy(() => import('./pages/Destinations'))
const DestinationDetail = lazy(() => import('./pages/DestinationDetail'))
const Carte = lazy(() => import('./pages/Carte'))
const Favoris = lazy(() => import('./pages/Favoris'))
const DataDashboard = lazy(() => import('./pages/DataDashboard'))
const Methodologie = lazy(() => import('./pages/Methodologie'))
const NotFound = lazy(() => import('./pages/NotFound'))
const AnalystLayout = lazy(() => import('./components/AnalystLayout'))
const AnalystOverview = lazy(() => import('./pages/analyste/Overview'))
const AnalystPipeline = lazy(() => import('./pages/analyste/Pipeline'))
const AnalystML = lazy(() => import('./pages/analyste/ML'))
const AnalystDecision = lazy(() => import('./pages/analyste/Decision'))

export default function App() {
  const location = useLocation()
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        {/* La cle force un remontage a chaque route -> animation d'entree */}
        <div key={location.pathname} className="animate-pagefade">
          <Suspense fallback={<div className="px-6 py-24 text-center text-sm text-muted">Chargement...</div>}>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/destinations" element={<Destinations />} />
              <Route path="/destinations/:nom" element={<DestinationDetail />} />
              <Route path="/carte" element={<Carte />} />
              <Route path="/favoris" element={<Favoris />} />
              <Route path="/data-dashboard" element={<DataDashboard />} />
              <Route path="/methodologie" element={<Methodologie />} />
              <Route path="/analyste" element={<AnalystLayout />}>
                <Route index element={<AnalystOverview />} />
                <Route path="dashboard" element={<Navigate to="/analyste" replace />} />
                <Route path="data-quality" element={<DataDashboard />} />
                <Route path="pipeline" element={<AnalystPipeline />} />
                <Route path="ml" element={<AnalystML />} />
                <Route path="decision" element={<AnalystDecision />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  )
}
