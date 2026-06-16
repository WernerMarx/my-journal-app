import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import ManageTrackers from "./pages/ManageTrackers";

function PrivateRoute({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return null; // wait for the initial silent-refresh attempt
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Home />
          </PrivateRoute>
        }
      />
      <Route
        path="/trackers"
        element={
          <PrivateRoute>
            <ManageTrackers />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
