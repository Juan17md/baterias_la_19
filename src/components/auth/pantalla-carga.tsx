import { Loader2 } from "lucide-react";

type PantallaCargaProps = {
  mensaje?: string;
};

/** Estado de carga a pantalla completa para las pantallas de acceso. */
export function PantallaCarga({
  mensaje = "Verificando sesión…",
}: PantallaCargaProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-svh items-center justify-center gap-2 text-sm text-muted-foreground"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {mensaje}
    </div>
  );
}
