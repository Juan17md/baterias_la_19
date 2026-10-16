"use client";

import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Formulario visual de inicio de sesión; la autenticación real llega en la Fase 3. */
function LoginForm() {
  function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    toast.info("La autenticación con Firebase se habilitará en la Fase 3.");
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex items-center justify-center rounded-xl dark:bg-white dark:p-1.5">
          <Image
            src="/logo-sin-fondo.png"
            alt="Logo de Baterías La 19"
            width={56}
            height={56}
            priority
            className="size-14 object-contain"
          />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Iniciar sesión
          </h1>
          <p className="text-sm text-muted-foreground">
            Accede con la cuenta que te asignó el administrador de la tienda.
          </p>
        </div>
      </div>

      <form onSubmit={manejarEnvio} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="correo" className="text-xs font-medium">
            Correo electrónico
          </label>
          <Input
            id="correo"
            name="correo"
            type="email"
            autoComplete="email"
            placeholder="tu@correo.com"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="contrasena" className="text-xs font-medium">
            Contraseña
          </label>
          <Input
            id="contrasena"
            name="contrasena"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </div>

        <Button type="submit" size="lg" className="mt-1 w-full">
          Ingresar
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        ¿Olvidaste tu contraseña? Contacta al administrador de la tienda.
      </p>
    </div>
  );
}

export { LoginForm };
