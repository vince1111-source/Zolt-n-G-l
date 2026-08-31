import { BejelentkezesForm } from "./BejelentkezesForm";

export default function Bejelentkezes() {
  return (
    <div className="min-h-full flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="font-extrabold text-2xl tracking-tight text-brand">
            CÉGEM<span className="text-cta bg-brand px-1 rounded">.AI</span>
          </div>
          <p className="text-muted mt-2 text-sm">
            Vállalkozói asszisztens kisvállalkozásoknak
          </p>
        </div>
        <div className="bg-surface border border-line rounded-xl p-6">
          <h1 className="font-bold text-lg mb-4">Bejelentkezés</h1>
          <BejelentkezesForm />
        </div>
      </div>
    </div>
  );
}
