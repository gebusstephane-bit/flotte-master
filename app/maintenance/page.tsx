import { Suspense } from "react";
import MaintenanceClient from "./MaintenanceClient";

export default function MaintenancePage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Chargement…</div>}>
      <MaintenanceClient />
    </Suspense>
  );
}
