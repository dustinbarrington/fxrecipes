import { Route, Routes } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import IdeaBoardPage from './pages/IdeaBoardPage'
import LoginPage from './pages/LoginPage'
import NotFoundPage from './pages/NotFoundPage'
import ProfilePage from './pages/ProfilePage'
import RecipeBoxPage from './pages/RecipeBoxPage'
import RecipeViewPage from './pages/RecipeViewPage'
import SignupPage from './pages/SignupPage'

export default function App() {
  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/idea-board" element={<IdeaBoardPage />} />
          <Route path="/recipe/:id" element={<RecipeViewPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recipe-box" element={<ProtectedRoute><RecipeBoxPage /></ProtectedRoute>} />
          <Route path="/recipe-box/favorites" element={<ProtectedRoute><RecipeBoxPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  )
}
