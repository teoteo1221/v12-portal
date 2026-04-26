import Link from "next/link";
import {
  CalendarRange,
  ArrowRight,
  Users,
  Info,
  Layers,
} from "lucide-react";

/**
 * Stub de "Calendario del año" — placeholder mientras el editor anual
 * real está en construcción.
 *
 * El calendario del año es la vista macro: cada semana del año pintada
 * según su tipo (apertura, cierre, ventana abierta, pretemporada, etc.).
 * Las asignaciones se derivan actualmente de la tabla `cohorts` + las
 * funciones SQL del ciclo — editarlas en crudo es por ahí hoy.
 *
 * Este stub explica qué verá el usuario cuando llegue la vista completa
 * y lo empuja a los puntos de entrada que ya existen (cohortes para
 * cambiar fechas, calendario del plan para ver el mes actual).
 */
export function AnnualCalendarStub() {
  return (
    <div className="space-y-4">
      <section className="card-padded space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-v12-navy-soft text-v12-navy">
            <CalendarRange className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="eyebrow">Vista anual</div>
            <h3 className="text-lg font-black tracking-tight text-v12-ink">
              Mapa del año por ciclos
            </h3>
            <p className="mt-1 text-sm text-v12-muted">
              Cada semana del año pintada según su tipo (apertura, cierre,
              ventana abierta, pretemporada, temporada alta…). Desde acá vas a
              poder empujar un ciclo una semana adelante, marcar una semana
              como &ldquo;mitad de temporada&rdquo; sin tocar cohortes, y ver de
              un vistazo cómo se distribuye el año.
            </p>
          </div>
        </div>

        <div className="rounded-md border border-v12-line-soft bg-v12-bg/40 px-3 py-2.5 text-[11px] text-v12-muted">
          <div className="mb-1 flex items-center gap-1.5">
            <Info className="h-3 w-3" />
            <span className="font-black uppercase tracking-wider text-v12-ink">
              Mientras tanto
            </span>
          </div>
          <p>
            Los tipos de semana hoy se derivan de las fechas de{" "}
            <span className="font-bold text-v12-ink">cohortes</span>. Para
            ajustar cuándo arranca o cierra un ciclo, editá las fechas ahí.
          </p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/marketing/estrategia?tab=librerias&lib=cohortes"
          className="group card-padded flex items-start gap-3 transition hover:border-v12-navy/40 hover:bg-v12-navy-soft/30"
        >
          <Users className="mt-0.5 h-5 w-5 shrink-0 text-v12-navy" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-v12-ink">
              Editar cohortes
            </div>
            <div className="mt-0.5 text-[11px] text-v12-muted">
              Cambiá las fechas de apertura/cierre para correr todo el ciclo.
            </div>
          </div>
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-v12-muted-light transition group-hover:text-v12-navy" />
        </Link>
        <Link
          href="/marketing/plan?mode=calendario"
          className="group card-padded flex items-start gap-3 transition hover:border-v12-orange/40 hover:bg-v12-orange-light/20"
        >
          <Layers className="mt-0.5 h-5 w-5 shrink-0 text-v12-orange-dark" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-v12-ink">
              Ver mes actual en el plan
            </div>
            <div className="mt-0.5 text-[11px] text-v12-muted">
              El calendario del día-a-día ya pinta cada día con el tipo de
              semana vigente.
            </div>
          </div>
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-v12-muted-light transition group-hover:text-v12-orange-dark" />
        </Link>
      </div>
    </div>
  );
}
