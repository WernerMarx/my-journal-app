import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * Persistent top navigation for authenticated pages. Primary destinations on
 * the left (active route highlighted via NavLink), the signed-in email and a
 * sign-out button on the right.
 */
export default function NavBar() {
  const { user, signOut } = useAuth();

  const bar = {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "10px 20px",
    borderBottom: "1px solid #ddd",
    background: "#fafafa",
  };

  const linkStyle = ({ isActive }) => ({
    padding: "6px 14px",
    borderRadius: 4,
    textDecoration: "none",
    color: isActive ? "#fff" : "#333",
    background: isActive ? "#3b6ea5" : "transparent",
    fontWeight: isActive ? 600 : 400,
  });

  return (
    <nav style={bar}>
      <NavLink to="/write" style={linkStyle}>
        Write
      </NavLink>
      <NavLink to="/browse" style={linkStyle}>
        Browse
      </NavLink>
      <NavLink to="/trackers" style={linkStyle}>
        Trackers
      </NavLink>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        {user && <span style={{ color: "#666", fontSize: 14 }}>{user.email}</span>}
        <button onClick={signOut} style={{ padding: "6px 14px" }}>
          Sign out
        </button>
      </div>
    </nav>
  );
}
