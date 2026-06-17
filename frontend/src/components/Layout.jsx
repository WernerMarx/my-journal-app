import { Outlet } from "react-router-dom";
import NavBar from "./NavBar";

/**
 * Shell for authenticated pages: the persistent nav bar above a centered
 * content column. Nested routes render into <Outlet />.
 */
export default function Layout() {
  return (
    <div>
      <NavBar />
      <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 20px" }}>
        <Outlet />
      </main>
    </div>
  );
}
