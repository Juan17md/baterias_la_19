import { ProteccionSesion } from "@/components/auth/proteccion-sesion";
import { AppShell } from "@/components/layout/app-shell";
import { TasaProvider } from "@/providers/tasa-provider";

/** Layout del área privada: exige sesión activa y provee la tasa BCV al panel. */
export default function LayoutPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProteccionSesion>
      <TasaProvider>
        <AppShell>{children}</AppShell>
      </TasaProvider>
    </ProteccionSesion>
  );
}
