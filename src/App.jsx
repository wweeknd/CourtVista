import { useState, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Search from './pages/Search';
import LawyerProfile from './pages/LawyerProfile';
import Compare from './pages/Compare';
import BookConsultation from './pages/BookConsultation';
import QnA from './pages/QnA';
import Login from './pages/Login';
import SelectRole from './pages/SelectRole';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import UserDashboard from './pages/UserDashboard';
import LawyerDashboard from './pages/LawyerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import EditProfile from './pages/EditProfile';
import ChatList from './pages/ChatList';
import ChatWindow from './pages/ChatWindow';
import './App.css';

function AppContent({ compareIds, handleCompareToggle, handleCompareRemove }) {
  const location = useLocation();

  const hideLayout = ["/login", "/register", "/select-role"].includes(location.pathname);

  return (
    <div id="app">
      {/* Hide Navbar on auth pages */}
      {!hideLayout && <Navbar />}

      <main className="app-main">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />

          <Route
            path="/search"
            element={
              <Search
                compareIds={compareIds}
                onCompareToggle={handleCompareToggle}
              />
            }
          />

          <Route path="/lawyer/:id" element={<LawyerProfile />} />

          <Route
            path="/compare"
            element={
              <Compare
                compareIds={compareIds}
                onRemove={handleCompareRemove}
              />
            }
          />

          <Route path="/book/:id" element={<BookConsultation />} />
          <Route path="/qna" element={<QnA />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/select-role" element={<SelectRole />} />

          {/* Protected routes */}
          <Route
            path="/dashboard/user"
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <UserDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/lawyer"
            element={
              <ProtectedRoute allowedRoles={['lawyer']}>
                <LawyerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Profile */}
          <Route
            path="/profile/edit"
            element={
              <ProtectedRoute allowedRoles={['user', 'lawyer', 'admin']}>
                <EditProfile />
              </ProtectedRoute>
            }
          />

          {/* Messaging */}
          <Route
            path="/messages"
            element={
              <ProtectedRoute allowedRoles={['user', 'lawyer']}>
                <ChatList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/messages/:conversationId"
            element={
              <ProtectedRoute allowedRoles={['user', 'lawyer']}>
                <ChatWindow />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      {/* Hide Footer on auth pages */}
      {!hideLayout && <Footer />}
    </div>
  );
}

export default function App() {
  const [compareIds, setCompareIds] = useState([]);

  const handleCompareToggle = useCallback((id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((cid) => cid !== id);
      }
      if (prev.length >= 3) {
        alert('You can compare up to 3 lawyers at a time.');
        return prev;
      }
      return [...prev, id];
    });
  }, []);

  const handleCompareRemove = useCallback((id) => {
    setCompareIds((prev) => prev.filter((cid) => cid !== id));
  }, []);

  return (
    <Router>
      <AuthProvider>
        <AppContent
          compareIds={compareIds}
          handleCompareToggle={handleCompareToggle}
          handleCompareRemove={handleCompareRemove}
        />
      </AuthProvider>
    </Router>
  );
}