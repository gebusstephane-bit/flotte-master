import { Suspense } from "react";
import ParcClient from "./ParcClient";

export default function ParcPage() {
  return (
    <Suspense fallback={<div className="p-6 text-slate-500">Chargement…</div>}>
      <ParcClient />
    </Suspense>
  );
}
