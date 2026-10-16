"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useMontado } from "@/hooks/use-montado";
import { Button } from "@/components/ui/button";

/** Conmutador de tema claro/oscuro (06_Design_System §7). */
function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const montado = useMontado();

  const esOscuro = resolvedTheme === "dark";
  const etiqueta = montado
    ? esOscuro
      ? "Cambiar a tema claro"
      : "Cambiar a tema oscuro"
    : "Cambiar tema";

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={etiqueta}
      title={etiqueta}
      onClick={() => setTheme(esOscuro ? "light" : "dark")}
    >
      <Sun className="size-4 dark:hidden" aria-hidden="true" />
      <Moon className="hidden size-4 dark:block" aria-hidden="true" />
    </Button>
  );
}

export { ThemeToggle };
