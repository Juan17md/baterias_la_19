import { AppShell } from "@/components/layout/app-shell";

/** Layout del área privada: aplica el shell (sidebar + cabecera) a todos los módulos. */
export default function LayoutPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
