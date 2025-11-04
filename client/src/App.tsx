import './App.css'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './state/AuthContext'
import { LanguageProvider } from './state/LanguageContext'
import Login from './pages/Login'
import SetPin from './pages/SetPin'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import Landing from './pages/Landing'
import Signup from './pages/Signup'
import ResetPin from './pages/ResetPin'
import Header from './components/Header'
import Profile from './pages/Profile'
import Verify from './pages/Verify'
import CreateGroup from './pages/CreateGroup'
import AdminFeatures from './pages/AdminFeatures'
import GroupFeatures from './pages/GroupFeatures'
import GroupDetail from './pages/GroupDetail'
import GroupInviteView from './pages/GroupInviteView'

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Routes>
        <Route path="/" element={<><Header /><Landing /></>} />
        <Route path="/home" element={<><Header /><div style={{ padding: 16 }}><Home /></div></>} />
        <Route path="/login" element={<><Header /><div style={{ padding: 16 }}><Login /></div></>} />
        <Route path="/signup" element={<><Header /><div style={{ padding: 16 }}><Signup /></div></>} />
        <Route path="/reset-pin" element={<><Header /><div style={{ padding: 16 }}><ResetPin /></div></>} />
        <Route path="/set-pin" element={<><Header /><div style={{ padding: 16 }}><SetPin /></div></>} />
        <Route path="/dashboard" element={<><Header /><div style={{ padding: 16 }}><Dashboard /></div></>} />
        <Route path="/profile" element={<><Header /><div style={{ padding: 16 }}><Profile /></div></>} />
        <Route path="/verify" element={<><Header /><div style={{ padding: 16 }}><Verify /></div></>} />
        <Route path="/groups/new" element={<><Header /><div style={{ padding: 16 }}><CreateGroup /></div></>} />
        <Route path="/groups/:id/invite" element={<GroupInviteView />} />
        <Route path="/groups/:id/features" element={<><Header /><div style={{ padding: 16 }}><GroupFeatures /></div></>} />
        <Route path="/groups/:id" element={<><Header /><div style={{ padding: 16 }}><GroupDetail /></div></>} />
        <Route path="/admin/features" element={<><Header /><div style={{ padding: 16 }}><AdminFeatures /></div></>} />
      </Routes>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
