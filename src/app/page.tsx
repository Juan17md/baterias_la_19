import { redirect } from "next/navigation";

/** La raíz redirige al panel; en la Fase 3 decidirá según la sesión activa. */
export default function Inicio() {
  redirect("/dashboard");
}
