import { DoorDashboard } from "../_components/door-dashboard";

/**
 * Door route wrapper (BP-005). The dashboard itself is a client component so
 * IndexedDB, the camera scanner, and connectivity events stay out of the server
 * bundle.
 */
export default function DoorPage() {
  return <DoorDashboard />;
}
