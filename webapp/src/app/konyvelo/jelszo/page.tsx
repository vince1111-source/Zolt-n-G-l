import { redirect } from "next/navigation";
import { szerverKliens } from "@/lib/supabase/server";
import { JelszoForm } from "./JelszoForm";

export default async function KonyveloJelszo() {
  const supabase = await szerverKliens();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/bejelentkezes");

  const { data: felhasznalo } = await supabase
    .from("felhasznalok")
    .select("szerep")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (felhasznalo?.szerep !== "konyvelo") redirect("/");

  return (
    <div className="flex flex-col gap-6 max-w-sm">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Üdvözlünk!</h1>
        <p className="text-muted mt-1">
          Mielőtt tovább mennél, állítsd be a jelszavad és a neved.
        </p>
      </div>
      <JelszoForm />
    </div>
  );
}
