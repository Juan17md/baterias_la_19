import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function PaginaLogin() {
  return (
    <div className="grid flex-1 lg:grid-cols-2">
      {/* Panel de marca (solo escritorio) */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-red p-10 text-white lg:flex">
        <Image
          src="/logo-sin-fondo.png"
          alt=""
          aria-hidden="true"
          width={480}
          height={480}
          priority
          className="pointer-events-none absolute -right-24 -bottom-24 size-[480px] opacity-10"
        />

        <div className="relative flex items-center gap-3">
          <span className="rounded-xl bg-white p-2">
            <Image
              src="/logo-sin-fondo.png"
              alt="Logo de Baterías La 19"
              width={40}
              height={40}
              className="size-10 object-contain"
            />
          </span>
          <span className="text-lg font-semibold">Baterías La 19</span>
        </div>

        <div className="relative flex max-w-md flex-col gap-3">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight">
            Gestión completa de tu tienda de baterías
          </h2>
          <p className="text-sm leading-relaxed text-white/80">
            Inventario, ventas en dólares con referencia en bolívares a tasa
            BCV, historial auditable y estadísticas — todo en un solo lugar.
          </p>
        </div>

        <p className="relative text-xs text-white/60">
          Venezuela · Precios en $ con tasa BCV del día
        </p>
      </div>

      {/* Formulario */}
      <div className="relative flex flex-1 items-center justify-center p-6">
        <ThemeToggle className="absolute top-4 right-4" />
        <LoginForm />
      </div>
    </div>
  );
}
