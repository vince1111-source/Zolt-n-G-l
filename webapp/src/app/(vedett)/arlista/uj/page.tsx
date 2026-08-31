import { ArlistaForm } from "../ArlistaForm";
import { termekLetrehozasa } from "../actions";

export default function UjTermek() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Új árlistatétel</h1>
      <div className="bg-surface border border-line rounded-xl p-6">
        <ArlistaForm action={termekLetrehozasa} mentesCimke="Felveszem" />
      </div>
    </div>
  );
}
