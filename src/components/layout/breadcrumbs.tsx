import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ElementoRuta = {
  etiqueta: string;
  href?: string;
};

type BreadcrumbsProps = {
  elementos: ElementoRuta[];
  className?: string;
};

/** Ruta de navegación (breadcrumbs) accesible. */
function Breadcrumbs({ elementos, className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Ruta de navegación"
      className={cn("text-xs text-muted-foreground", className)}
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        {elementos.map((elemento, indice) => {
          const esUltimo = indice === elementos.length - 1;

          return (
            <li
              key={`${indice}-${elemento.etiqueta}`}
              className="flex items-center gap-1.5"
            >
              {indice > 0 ? (
                <ChevronRight
                  className="size-3.5 shrink-0"
                  aria-hidden="true"
                />
              ) : null}
              {elemento.href && !esUltimo ? (
                <Link
                  href={elemento.href}
                  className="transition-colors duration-150 hover:text-foreground"
                >
                  {elemento.etiqueta}
                </Link>
              ) : (
                <span
                  aria-current={esUltimo ? "page" : undefined}
                  className={cn(esUltimo && "font-medium text-foreground")}
                >
                  {elemento.etiqueta}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export { Breadcrumbs };
export type { ElementoRuta };
