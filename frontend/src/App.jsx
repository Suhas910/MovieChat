import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import GroupsList from './pages/GroupsList';
import GroupDetail from './pages/GroupDetail';

function App() {
  return (
    <>
      <Navbar />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route
          path="/groups"
          element={
            <ProtectedRoute>
              <GroupsList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/groups/:groupId"
          element={
            <ProtectedRoute>
              <GroupDetail />
            </ProtectedRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/groups" replace />} />
        <Route path="*" element={<Navigate to="/groups" replace />} />
      </Routes>
    </>
  );
}

export default App;