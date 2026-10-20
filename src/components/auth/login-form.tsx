"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { iniciarSesion, mensajeDeErrorAuth } from "@/lib/firebase/auth";

/** Formulario de inicio de sesión con Firebase Auth y manejo de errores. */
function LoginForm() {
  const router = useRouter();
  const { usuario, perfil, cargando } = useAuth();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [contrasenaVisible, setContrasenaVisible] = useState(false);

  useEffect(() => {
    if (!cargando && usuario && perfil) {
      router.replace("/dashboard");
    }
  }, [cargando, usuario, perfil, router]);

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      await iniciarSesion(correo, contrasena);
      // La redirección ocurre cuando el AuthProvider confirma el perfil activo;
      // si el perfil no es válido, el provider cierra la sesión con un aviso.
    } catch (fallo) {
      setError(mensajeDeErrorAuth(fallo));
    } finally {
      setEnviando(false);
    }
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
        <h1 className="text-2xl font-semibold tracking-tight">
          Iniciar sesión
        </h1>
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
            value={correo}
            onChange={(evento) => setCorreo(evento.target.value)}
            disabled={enviando}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="contrasena" className="text-xs font-medium">
            Contraseña
          </label>
          <div className="relative">
            <Input
              id="contrasena"
              name="contrasena"
              type={contrasenaVisible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={contrasena}
              onChange={(evento) => setContrasena(evento.target.value)}
              disabled={enviando}
              required
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-1/2 right-0.5 size-8 -translate-y-1/2 text-muted-foreground"
              aria-label={
                contrasenaVisible ? "Ocultar contraseña" : "Mostrar contraseña"
              }
              aria-pressed={contrasenaVisible}
              disabled={enviando}
              onClick={() => setContrasenaVisible((visible) => !visible)}
            >
              {contrasenaVisible ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive-text"
          >
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="mt-1 w-full"
          disabled={enviando}
        >
          {enviando ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Ingresando…
            </>
          ) : (
            "Ingresar"
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        ¿Olvidaste tu contraseña? Contacta al administrador.
      </p>
    </div>
  );
}

export { LoginForm };
