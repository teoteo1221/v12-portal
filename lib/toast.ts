/**
 * toast.ts — Sistema de notificaciones global sin dependencias extra.
 * Patrón event-emitter simple: cualquier módulo puede llamar a
 * toast.success("...") y el <Toaster> del layout lo muestra.
 *
 * Uso:
 *   import { toast } from "@/lib/toast";
 *   toast.success("Lead guardado");
 *   toast.error("No se pudo guardar");
 *   toast.success("Lead eliminado", { action: { label: "Deshacer", onClick: () => ... } });
 */

export type ToastType = "success" | "error" | "info" | "warn";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  /** Acción opcional (ej. "Deshacer") */
  action?: { label: string; onClick: () => void };
  /** Duración en ms. 0 = no se cierra solo. Default: 4000 */
  duration?: number;
}

type Listener = (toasts: ToastItem[]) => void;

let _toasts: ToastItem[] = [];
const _listeners: Listener[] = [];

function _emit() {
  _listeners.forEach((l) => l([..._toasts]));
}

function _add(t: Omit<ToastItem, "id">) {
  const id = Math.random().toString(36).slice(2, 9);
  const duration = t.duration ?? 4000;
  _toasts = [..._toasts, { ...t, id, duration }];
  _emit();
  if (duration > 0) {
    setTimeout(() => toast.dismiss(id), duration);
  }
}

export const toast = {
  success(
    message: string,
    opts?: Partial<Pick<ToastItem, "action" | "duration">>,
  ) {
    _add({ type: "success", message, ...opts });
  },
  error(
    message: string,
    opts?: Partial<Pick<ToastItem, "action" | "duration">>,
  ) {
    _add({ type: "error", message, ...opts });
  },
  info(
    message: string,
    opts?: Partial<Pick<ToastItem, "action" | "duration">>,
  ) {
    _add({ type: "info", message, ...opts });
  },
  warn(
    message: string,
    opts?: Partial<Pick<ToastItem, "action" | "duration">>,
  ) {
    _add({ type: "warn", message, ...opts });
  },
  dismiss(id: string) {
    _toasts = _toasts.filter((t) => t.id !== id);
    _emit();
  },
  /** Suscribirse a cambios. Devuelve función de cleanup. */
  subscribe(listener: Listener): () => void {
    _listeners.push(listener);
    listener([..._toasts]); // sincroniza estado inicial
    return () => {
      const i = _listeners.indexOf(listener);
      if (i > -1) _listeners.splice(i, 1);
    };
  },
};
