"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { listarUsuarios } from "@/lib/servicios/usuarios";
import type { Usuario } from "@/types";

/**
 * Usuarios disponibles para los filtros del historial. Las reglas solo
 * permiten listar usuarios al admin; un usuario normal puede filtrar
 * «solo las mías» usando su propio perfil.
 */
export function useUsuariosFiltro() {
  const { perfil } = useAuth();
  const esAdmin = perfil?.rol === "admin";
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      if (!esAdmin) {
        setUsuarios([]);
        setCargando(false);
        return;
      }
      setCargando(true);
      try {
        const lista = await listarUsuarios();
        if (!cancelado) setUsuarios(lista);
      } catch {
        if (!cancelado) setUsuarios([]);
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    void cargar();
    return () => {
      cancelado = true;
    };
  }, [esAdmin]);

  return { esAdmin, usuarios, cargando, perfil };
}
