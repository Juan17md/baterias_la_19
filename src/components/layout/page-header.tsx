import {
  Breadcrumbs,
  type ElementoRuta,
} from "@/components/layout/breadcrumbs";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  titulo: string;
  descripcion?: string;
  breadcrumbs?: ElementoRuta[];
  acciones?: React.ReactNode;
  className?: string;
};

/** Encabezado estándar de cada módulo: breadcrumbs, título, descripción y acciones. */
function PageHeader({
  titulo,
  descripcion,
  breadcrumbs,
  acciones,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {breadcrumbs ? <Breadcrumbs elementos={breadcrumbs} /> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
          {descripcion ? (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {descripcion}
            </p>
          ) : null}
        </div>
        {acciones ? (
          <div className="flex items-center gap-2">{acciones}</div>
        ) : null}
      </div>
    </div>
  );
}

export { PageHeader };
export type { PageHeaderProps };
