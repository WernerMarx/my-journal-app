import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Route,
  RouterProvider,
} from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Write from "./pages/Write";
import Browse from "./pages/Browse";
import EntryDetail from "./pages/EntryDetail";
import ManageTrackers from "./pages/ManageTrackers";

/**
 * Auth-gated shell: waits for the initial silent refresh, redirects to /login
 * when signed out, otherwise renders the nav bar + page via <Layout>. Using a
 * data router (createBrowserRouter) is what enables the Write page's
 * useBlocker unsaved-changes guard.
 */
function PrivateLayout() {
  const { user, ready } = useAuth();
  if (!ready) return null; // wait for the initial silent-refresh attempt
  if (!user) return <Navigate to="/login" replace />;
  return <Layout />;
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      <Route path="/login" element={<Login />} />
      <Route element={<PrivateLayout />}>
        <Route path="/" element={<Navigate to="/write" replace />} />
        <Route path="/write" element={<Write />} />
        <Route path="/write/:date" element={<Write />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/entries/:date" element={<EntryDetail />} />
        <Route path="/trackers" element={<ManageTrackers />} />
      </Route>
    </Route>,
  ),
);

export default function App() {
  return <RouterProvider router={router} />;
}
