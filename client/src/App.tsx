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
import AuctionPage from './pages/AuctionPage'
import Payments from './pages/Payments'

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Routes>
        <Route path="/" element={<><Header /><Landing /></>} />
        <Route path="/home" element={<><Header /><div style={{ width: '100%', minHeight: 'calc(100vh - 80px)' }}><Home /></div></>} />
        <Route path="/login" element={<><Header /><div style={{ width: '100%', minHeight: 'calc(100vh - 80px)' }}><Login /></div></>} />
        <Route path="/signup" element={<><Header /><div style={{ width: '100%', minHeight: 'calc(100vh - 80px)' }}><Signup /></div></>} />
        <Route path="/reset-pin" element={<><Header /><div style={{ width: '100%', minHeight: 'calc(100vh - 80px)' }}><ResetPin /></div></>} />
        <Route path="/set-pin" element={<><Header /><div style={{ width: '100%', minHeight: 'calc(100vh - 80px)' }}><SetPin /></div></>} />
        <Route path="/dashboard" element={<><Header /><div style={{ width: '100%', minHeight: 'calc(100vh - 80px)' }}><Dashboard /></div></>} />
        <Route path="/profile" element={<><Header /><div style={{ width: '100%', minHeight: 'calc(100vh - 80px)' }}><Profile /></div></>} />
        <Route path="/payments" element={<><Header /><div style={{ width: '100%', minHeight: 'calc(100vh - 80px)' }}><Payments /></div></>} />
        <Route path="/verify" element={<><Header /><div style={{ width: '100%', minHeight: 'calc(100vh - 80px)' }}><Verify /></div></>} />
        <Route path="/groups/new" element={<><Header /><div style={{ width: '100%', minHeight: 'calc(100vh - 80px)' }}><CreateGroup /></div></>} />
        <Route path="/groups/:id/invite" element={<GroupInviteView />} />
        <Route path="/groups/:id/Addnew" element={<><Header /><div style={{ width: '100%', minHeight: 'calc(100vh - 80px)' }}><GroupDetail /></div></>} />
        <Route path="/groups/:id/auction" element={<><Header /><div style={{ width: '100%', minHeight: 'calc(100vh - 80px)' }}><AuctionPage /></div></>} />
        <Route path="/groups/:id/features" element={<><Header /><div style={{ width: '100%', minHeight: 'calc(100vh - 80px)' }}><GroupFeatures /></div></>} />
        <Route path="/groups/:id" element={<><Header /><div style={{ width: '100%', minHeight: 'calc(100vh - 80px)' }}><GroupDetail /></div></>} />
        <Route path="/admin/features" element={<><Header /><div style={{ width: '100%', minHeight: 'calc(100vh - 80px)' }}><AdminFeatures /></div></>} />
      </Routes>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
