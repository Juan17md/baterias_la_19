"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PantallaCarga } from "@/components/auth/pantalla-carga";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import {
  cambiarContrasena,
  mensajeDeErrorCambioContrasena,
} from "@/lib/firebase/auth";
import { marcarContrasenaCambiada } from "@/lib/servicios/usuarios";

const MINIMO_CARACTERES = 6;

type CampoContrasenaProps = {
  id: string;
  etiqueta: string;
  valor: string;
  autoComplete: "current-password" | "new-password";
  disabled: boolean;
  minLength?: number;
  ayuda?: string;
  onChange: (valor: string) => void;
};

/** Campo de contraseña con botón para mostrar u ocultar el texto. */
function CampoContrasena({
  id,
  etiqueta,
  valor,
  autoComplete,
  disabled,
  minLength,
  ayuda,
  onChange,
}: CampoContrasenaProps) {
  const [visible, setVisible] = useState(false);
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium">
        {etiqueta}
      </label>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          spellCheck={false}
          value={valor}
          onChange={(evento) => onChange(evento.target.value)}
          disabled={disabled}
          minLength={minLength}
          aria-describedby={idAyuda}
          required
          className="pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-1/2 right-0.5 size-8 -translate-y-1/2 text-muted-foreground"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          disabled={disabled}
          onClick={() => setVisible((estado) => !estado)}
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </Button>
      </div>
      {ayuda ? (
        <p id={idAyuda} className="text-xs text-muted-foreground">
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Cambio obligatorio de la contraseña temporal.
 * Bloquea el dashboard hasta que la cuenta reemplace la clave asignada por el
 * administrador (ver docs-obsidian/04_Arquitectura, flujo 5.11).
 */
export function FormularioCambioContrasena() {
  const router = useRouter();
  const { usuario, perfil, cargando, cerrarSesion, recargarPerfil } = useAuth();

  const [contrasenaActual, setContrasenaActual] = useState("");
  const [contrasenaNueva, setContrasenaNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (cargando) return;

    if (!usuario || !perfil) {
      router.replace("/login");
      return;
    }

    if (!perfil.debeCambiarContrasena) {
      router.replace("/dashboard");
    }
  }, [cargando, usuario, perfil, router]);

  if (cargando || !usuario || !perfil || !perfil.debeCambiarContrasena) {
    return <PantallaCarga mensaje="Verificando cuenta…" />;
  }

  const uidPerfil = perfil.uid;

  async function manejarEnvio(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);

    if (contrasenaNueva.length < MINIMO_CARACTERES) {
      setError(
        `La nueva contraseña debe tener al menos ${MINIMO_CARACTERES} caracteres.`,
      );
      return;
    }

    if (contrasenaNueva === contrasenaActual) {
      setError("La nueva contraseña debe ser diferente a la actual.");
      return;
    }

    if (contrasenaNueva !== confirmacion) {
      setError("La confirmación no coincide con la nueva contraseña.");
      return;
    }

    setEnviando(true);

    try {
      await cambiarContrasena(contrasenaActual, contrasenaNueva);
    } catch (fallo) {
      setError(mensajeDeErrorCambioContrasena(fallo));
      setEnviando(false);
      return;
    }

    try {
      await marcarContrasenaCambiada(uidPerfil);
      await recargarPerfil();

      toast.success("Contraseña actualizada correctamente.");
      router.replace("/dashboard");
    } catch {
      setError(
        "Tu contraseña se actualizó, pero no se pudo completar el registro. Cierra sesión y vuelve a entrar con la nueva contraseña.",
      );
    } finally {
      setEnviando(false);
    }
  }

  async function manejarCerrarSesion() {
    await cerrarSesion().catch(() => undefined);
    router.replace("/login");
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
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
            Cambia tu contraseña
          </h1>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">
            Hola, {perfil.nombre}. Tu cuenta usa una contraseña temporal:
            reemplázala por una personal para continuar.
          </p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={manejarEnvio} className="flex flex-col gap-5">
          <CampoContrasena
            id="contrasena-actual"
            etiqueta="Contraseña actual"
            valor={contrasenaActual}
            autoComplete="current-password"
            disabled={enviando}
            onChange={setContrasenaActual}
          />

          <CampoContrasena
            id="contrasena-nueva"
            etiqueta="Nueva contraseña"
            valor={contrasenaNueva}
            autoComplete="new-password"
            disabled={enviando}
            minLength={MINIMO_CARACTERES}
            ayuda={`Mínimo ${MINIMO_CARACTERES} caracteres.`}
            onChange={setContrasenaNueva}
          />

          <CampoContrasena
            id="contrasena-confirmacion"
            etiqueta="Confirmar nueva contraseña"
            valor={confirmacion}
            autoComplete="new-password"
            disabled={enviando}
            minLength={MINIMO_CARACTERES}
            onChange={setConfirmacion}
          />

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
            className="w-full"
            disabled={enviando}
          >
            {enviando ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Actualizando…
              </>
            ) : (
              <>
                <KeyRound className="size-4" aria-hidden="true" />
                Cambiar contraseña
              </>
            )}
          </Button>
        </form>
      </Card>

      <div className="mt-4 text-center">
        <Button
          variant="ghost"
          size="sm"
          disabled={enviando}
          onClick={() => void manejarCerrarSesion()}
        >
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
