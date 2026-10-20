"use client";

import { useEffect, useState } from "react";
import {
  KeyRound,
  ShieldAlert,
  TriangleAlert,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import {
  crearCuentaUsuario,
  enviarCorreoRestablecimiento,
  mensajeDeErrorAuth,
} from "@/lib/firebase/auth";
import {
  actualizarRolUsuario,
  cambiarActivoUsuario,
  crearPerfilUsuario,
  listarUsuarios,
} from "@/lib/servicios/usuarios";
import type { RolUsuario, Usuario } from "@/types";

const ETIQUETA_ROL: Record<RolUsuario, string> = {
  admin: "Administrador",
  usuario: "Usuario",
};

/** Módulo de gestión de usuarios: exclusivo del rol admin (doble capa: reglas). */
export function ModuloUsuarios() {
  const { perfil } = useAuth();
  const esAdmin = perfil?.rol === "admin";

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState(false);
  const [uidEnProceso, setUidEnProceso] = useState<string | null>(null);

  const [dialogoAltaAbierto, setDialogoAltaAbierto] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [correoNuevo, setCorreoNuevo] = useState("");
  const [contrasenaNueva, setContrasenaNueva] = useState("");
  const [rolNuevo, setRolNuevo] = useState<RolUsuario>("usuario");
  const [creando, setCreando] = useState(false);

  const [usuarioADesactivar, setUsuarioADesactivar] = useState<Usuario | null>(
    null,
  );

  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    if (!esAdmin) return;
    let cancelado = false;

    async function cargarUsuarios() {
      try {
        const lista = await listarUsuarios();
        if (cancelado) return;
        setUsuarios(lista);
        setErrorCarga(false);
      } catch {
        if (!cancelado) setErrorCarga(true);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    void cargarUsuarios();

    return () => {
      cancelado = true;
    };
  }, [esAdmin, recarga]);

  if (!esAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          titulo="Usuarios"
          descripcion="Gestión de usuarios del sistema: altas, roles y activación (solo administradores)."
        />
        <EmptyState
          icono={ShieldAlert}
          titulo="Acceso restringido"
          descripcion="Solo los administradores pueden gestionar los usuarios del sistema. Las reglas de seguridad también bloquean este acceso."
        />
      </div>
    );
  }

  async function manejarCambioRol(usuario: Usuario, rol: string) {
    if (rol === usuario.rol) return;
    setUidEnProceso(usuario.uid);
    try {
      await actualizarRolUsuario(usuario.uid, rol as RolUsuario);
      setUsuarios((lista) =>
        lista.map((elemento) =>
          elemento.uid === usuario.uid
            ? { ...elemento, rol: rol as RolUsuario }
            : elemento,
        ),
      );
      toast.success(`Rol de ${usuario.nombre} actualizado.`);
    } catch {
      toast.error("No se pudo actualizar el rol. Inténtalo de nuevo.");
    } finally {
      setUidEnProceso(null);
    }
  }

  async function manejarActivar(usuario: Usuario) {
    setUidEnProceso(usuario.uid);
    try {
      await cambiarActivoUsuario(usuario.uid, true);
      setUsuarios((lista) =>
        lista.map((elemento) =>
          elemento.uid === usuario.uid
            ? { ...elemento, activo: true }
            : elemento,
        ),
      );
      toast.success(`${usuario.nombre} fue reactivado.`);
    } catch {
      toast.error("No se pudo reactivar al usuario. Inténtalo de nuevo.");
    } finally {
      setUidEnProceso(null);
    }
  }

  async function manejarDesactivar() {
    if (!usuarioADesactivar) return;
    const usuario = usuarioADesactivar;
    setUidEnProceso(usuario.uid);
    try {
      await cambiarActivoUsuario(usuario.uid, false);
      setUsuarios((lista) =>
        lista.map((elemento) =>
          elemento.uid === usuario.uid
            ? { ...elemento, activo: false }
            : elemento,
        ),
      );
      toast.success(`${usuario.nombre} quedó desactivado.`);
      setUsuarioADesactivar(null);
    } catch {
      toast.error("No se pudo desactivar al usuario. Inténtalo de nuevo.");
    } finally {
      setUidEnProceso(null);
    }
  }

  async function manejarRestablecer(usuario: Usuario) {
    setUidEnProceso(usuario.uid);
    try {
      await enviarCorreoRestablecimiento(usuario.email);
      toast.success(
        `Se envió un correo de restablecimiento a ${usuario.email}.`,
      );
    } catch {
      toast.error("No se pudo enviar el correo de restablecimiento.");
    } finally {
      setUidEnProceso(null);
    }
  }

  async function manejarAlta(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nombre = nombreNuevo.trim();
    const correo = correoNuevo.trim().toLowerCase();

    if (!nombre || !correo || contrasenaNueva.length < 6) {
      toast.error(
        "Completa nombre, correo y una contraseña de al menos 6 caracteres.",
      );
      return;
    }

    setCreando(true);
    let uidCreado: string | null = null;
    try {
      uidCreado = await crearCuentaUsuario(correo, contrasenaNueva);
      await crearPerfilUsuario({
        uid: uidCreado,
        nombre,
        email: correo,
        rol: rolNuevo,
      });
      toast.success(
        `Usuario ${nombre} creado. Comparte su contraseña temporal con la persona.`,
      );
      setDialogoAltaAbierto(false);
      setNombreNuevo("");
      setCorreoNuevo("");
      setContrasenaNueva("");
      setRolNuevo("usuario");
      setRecarga((valor) => valor + 1);
    } catch (fallo) {
      if (uidCreado) {
        toast.error(
          "La cuenta se creó en Authentication, pero falló su perfil. Corrígela desde la consola de Firebase.",
        );
      } else {
        toast.error(mensajeDeErrorAuth(fallo));
      }
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        titulo="Usuarios"
        descripcion="Gestiona las cuentas del sistema: crea usuarios, asigna roles y controla su acceso."
        acciones={
          <Button onClick={() => setDialogoAltaAbierto(true)}>
            <UserPlus className="size-4" aria-hidden="true" />
            Nuevo usuario
          </Button>
        }
      />

      {cargando ? (
        <Card className="flex flex-col gap-3 p-4">
          {Array.from({ length: 4 }).map((_, indice) => (
            <Skeleton key={indice} className="h-12 w-full" />
          ))}
        </Card>
      ) : errorCarga ? (
        <EmptyState
          icono={TriangleAlert}
          titulo="No se pudieron cargar los usuarios"
          descripcion="Revisa tu conexión e inténtalo de nuevo."
          accion={
            <Button
              variant="outline"
              onClick={() => {
                setCargando(true);
                setRecarga((valor) => valor + 1);
              }}
            >
              Reintentar
            </Button>
          }
        />
      ) : usuarios.length === 0 ? (
        <EmptyState
          icono={Users}
          titulo="Aún no hay usuarios"
          descripcion="Crea el primer usuario con el botón «Nuevo usuario»."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Usuarios del sistema con su rol, estado y acciones disponibles
              </caption>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Usuario
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Rol
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usuario) => {
                  const esUnoMismo = usuario.uid === perfil?.uid;
                  const enProceso = uidEnProceso === usuario.uid;

                  return (
                    <tr
                      key={usuario.uid}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {usuario.nombre}
                            {esUnoMismo ? (
                              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                (tú)
                              </span>
                            ) : null}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {usuario.email}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {esUnoMismo ? (
                          <Badge
                            variant={
                              usuario.rol === "admin" ? "primary" : "neutral"
                            }
                          >
                            {ETIQUETA_ROL[usuario.rol]}
                          </Badge>
                        ) : (
                          <Select
                            value={usuario.rol}
                            onValueChange={(valor) =>
                              void manejarCambioRol(usuario, valor)
                            }
                            disabled={enProceso}
                          >
                            <SelectTrigger
                              className="h-8 w-36"
                              aria-label={`Rol de ${usuario.nombre}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">
                                Administrador
                              </SelectItem>
                              <SelectItem value="usuario">Usuario</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={usuario.activo ? "success" : "destructive"}
                        >
                          {usuario.activo ? "Activo" : "Desactivado"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title={`Enviar restablecimiento de contraseña a ${usuario.email}`}
                            aria-label={`Enviar restablecimiento de contraseña a ${usuario.email}`}
                            disabled={enProceso}
                            onClick={() => void manejarRestablecer(usuario)}
                          >
                            <KeyRound className="size-4" aria-hidden="true" />
                            <span className="hidden lg:inline">Contraseña</span>
                          </Button>
                          {usuario.activo ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              disabled={esUnoMismo || enProceso}
                              title={
                                esUnoMismo
                                  ? "No puedes desactivar tu propia cuenta"
                                  : `Desactivar a ${usuario.nombre}`
                              }
                              aria-label={
                                esUnoMismo
                                  ? "No puedes desactivar tu propia cuenta"
                                  : `Desactivar a ${usuario.nombre}`
                              }
                              onClick={() => setUsuarioADesactivar(usuario)}
                            >
                              <UserX className="size-4" aria-hidden="true" />
                              <span className="hidden lg:inline">
                                Desactivar
                              </span>
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={enProceso}
                              title={`Reactivar a ${usuario.nombre}`}
                              aria-label={`Reactivar a ${usuario.nombre}`}
                              onClick={() => void manejarActivar(usuario)}
                            >
                              <UserCheck
                                className="size-4"
                                aria-hidden="true"
                              />
                              <span className="hidden lg:inline">Activar</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={dialogoAltaAbierto} onOpenChange={setDialogoAltaAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>
              Se crea la cuenta con una contraseña temporal que deberás
              compartir con la persona; podrá cambiarla más adelante.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={manejarAlta} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="usuario-nombre" className="text-xs font-medium">
                Nombre completo
              </label>
              <Input
                id="usuario-nombre"
                name="nombre"
                autoComplete="name"
                value={nombreNuevo}
                onChange={(evento) => setNombreNuevo(evento.target.value)}
                placeholder="Ej. María Pérez"
                disabled={creando}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="usuario-correo" className="text-xs font-medium">
                Correo electrónico
              </label>
              <Input
                id="usuario-correo"
                name="correo"
                type="email"
                autoComplete="email"
                spellCheck={false}
                value={correoNuevo}
                onChange={(evento) => setCorreoNuevo(evento.target.value)}
                placeholder="persona@correo.com"
                disabled={creando}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="usuario-contrasena"
                className="text-xs font-medium"
              >
                Contraseña temporal
              </label>
              <Input
                id="usuario-contrasena"
                name="contrasena"
                type="text"
                autoComplete="new-password"
                spellCheck={false}
                value={contrasenaNueva}
                onChange={(evento) => setContrasenaNueva(evento.target.value)}
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                disabled={creando}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="usuario-rol" className="text-xs font-medium">
                Rol
              </label>
              <Select
                value={rolNuevo}
                onValueChange={(valor) => setRolNuevo(valor as RolUsuario)}
                disabled={creando}
              >
                <SelectTrigger id="usuario-rol" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usuario">Usuario</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogoAltaAbierto(false)}
                disabled={creando}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={creando}>
                {creando ? "Creando…" : "Crear usuario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(usuarioADesactivar)}
        onOpenChange={(abierto) => {
          if (!abierto) setUsuarioADesactivar(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Desactivar usuario</DialogTitle>
            <DialogDescription>
              {usuarioADesactivar?.nombre} no podrá iniciar sesión ni acceder a
              los datos hasta que se reactive. Su historial se conserva.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUsuarioADesactivar(null)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => void manejarDesactivar()}
            >
              Desactivar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
