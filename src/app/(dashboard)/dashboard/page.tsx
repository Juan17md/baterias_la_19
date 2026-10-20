import type { Metadata } from "next";
import { PanelDashboard } from "@/components/dashboard/panel-dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default function PaginaDashboard() {
  return <PanelDashboard />;
}
