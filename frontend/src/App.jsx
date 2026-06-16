import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";

function PrivateRoute({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return null; // wait for the initial silent-refresh attempt
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user, signOut } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <div style={{ fontFamily: "sans-serif", padding: 32 }}>
              <h1>Journal</h1>
              <p>Signed in as {user?.email}</p>
              <button onClick={signOut}>Sign out</button>
            </div>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
