import { DokumentumForm } from "../DokumentumForm";
import { Card } from "@/components/ui/Card";

export default function UjDokumentum() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold tracking-tight">Új dokumentum</h1>
      <Card className="p-6">
        <DokumentumForm />
      </Card>
    </div>
  );
}
