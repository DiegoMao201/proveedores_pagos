"use client";

import { useState } from "react";
import { Calculator } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatCompact, formatFull } from "@/lib/format";

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-stone" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="num rounded-md border border-line bg-paper px-2.5 py-1.5 text-ink"
        style={{ fontSize: 13, fontWeight: 700 }}
      />
    </label>
  );
}

function SimResult({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-1.5 last:border-0">
      <span className="text-stone" style={{ fontSize: 11 }}>
        {label}
      </span>
      <span className={highlight ? "num text-red-deep" : "num text-ink"} style={{ fontWeight: 700, fontSize: highlight ? 14 : 12 }}>
        {value}
      </span>
    </div>
  );
}

function SimulatorShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="!p-0 overflow-hidden">
      <div className="flex items-center gap-1.5 border-b border-line bg-parchment" style={{ padding: "8px 14px" }}>
        <Calculator size={13} className="text-red-deep" />
        <h2 className="text-graphite" style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {title}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 p-3.5 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

export function PintucoSimulator({
  escalaMensual1,
  escalaMensual2,
  escalaTrimestral1,
  escalaTrimestral2,
  ventaAcumuladaTrimestre,
}: {
  escalaMensual1: number;
  escalaMensual2: number;
  escalaTrimestral1: number;
  escalaTrimestral2: number;
  ventaAcumuladaTrimestre: number;
}) {
  const [compraNeta, setCompraNeta] = useState(escalaMensual2);
  const compraAplicable = compraNeta * 0.90;

  const tasaMensual = compraAplicable >= escalaMensual2 ? 0.015 : compraAplicable >= escalaMensual1 ? 0.01 : 0;
  const escalaMensualLabel = compraAplicable >= escalaMensual2 ? "Escala 2" : compraAplicable >= escalaMensual1 ? "Escala 1" : "Sin escala";
  const rebateMensual = compraAplicable * tasaMensual;

  const ventaTrimestreProyectada = ventaAcumuladaTrimestre + compraAplicable;
  const tasaTrimestral = ventaTrimestreProyectada >= escalaTrimestral2 ? 0.025 : ventaTrimestreProyectada >= escalaTrimestral1 ? 0.01 : 0;
  const escalaTrimestralLabel =
    ventaTrimestreProyectada >= escalaTrimestral2 ? "Escala 2" : ventaTrimestreProyectada >= escalaTrimestral1 ? "Escala 1" : "Sin escala";
  const rebateTrimestral = ventaTrimestreProyectada * tasaTrimestral;

  return (
    <SimulatorShell title="Simulador — ¿qué pasa si compro X este mes?">
      <div className="flex flex-col gap-3">
        <NumberField label="Compra neta proyectada del mes (antes del 10% excluido)" value={compraNeta} onChange={setCompraNeta} />
        <p className="text-stone" style={{ fontSize: 10 }}>
          Compra aplicable (90%): <span className="num font-semibold text-graphite">{formatFull(compraAplicable)}</span>
        </p>
      </div>
      <div className="flex flex-col">
        <SimResult label="Escala mensual alcanzada" value={escalaMensualLabel} />
        <SimResult label="Rebate mensual" value={formatCompact(rebateMensual)} highlight />
        <SimResult label="Venta trimestre proyectada" value={formatCompact(ventaTrimestreProyectada)} />
        <SimResult label="Escala trimestral alcanzada" value={escalaTrimestralLabel} />
        <SimResult label="Rebate trimestral (todo el trimestre)" value={formatCompact(rebateTrimestral)} highlight />
      </div>
    </SimulatorShell>
  );
}

export function AbracolSimulator({ metaBimestre }: { metaBimestre: number }) {
  const [ventaNeta, setVentaNeta] = useState(metaBimestre);
  const rebate = ventaNeta * 0.06;
  const iva = rebate * 0.19;
  const total = rebate + iva;
  const cumplimiento = metaBimestre > 0 ? (ventaNeta / metaBimestre) * 100 : 0;

  return (
    <SimulatorShell title="Simulador — ¿qué pasa si vendo X este bimestre?">
      <div className="flex flex-col gap-3">
        <NumberField label="Venta neta proyectada del bimestre" value={ventaNeta} onChange={setVentaNeta} />
        <p className="text-stone" style={{ fontSize: 10 }}>
          Cumplimiento de meta: <span className="num font-semibold text-graphite">{cumplimiento.toFixed(1)}%</span>
        </p>
      </div>
      <div className="flex flex-col">
        <SimResult label="Rebate bruto (6,0%)" value={formatCompact(rebate)} highlight />
        <SimResult label="IVA estimado" value={formatCompact(iva)} />
        <SimResult label="Total con IVA" value={formatCompact(total)} />
      </div>
    </SimulatorShell>
  );
}

export function GoyaSimulator({ base2025 }: { base2025: number }) {
  const [ventaNeta, setVentaNeta] = useState(base2025);
  const crecimiento = base2025 > 0 ? (ventaNeta / base2025 - 1) * 100 : 0;

  let escala = "Sin escala";
  let tasa = 0;
  if (crecimiento >= 50) {
    escala = "Escala 50%";
    tasa = 0.04;
  } else if (crecimiento >= 40) {
    escala = "Escala 40%";
    tasa = 0.035;
  } else if (crecimiento >= 30) {
    escala = "Escala 30%";
    tasa = 0.025;
  } else if (crecimiento >= 20) {
    escala = "Escala 20%";
    tasa = 0.02;
  }
  const rebate = ventaNeta * tasa;

  return (
    <SimulatorShell title="Simulador — ¿qué pasa si vendo X este semestre?">
      <div className="flex flex-col gap-3">
        <NumberField label="Venta neta proyectada del semestre" value={ventaNeta} onChange={setVentaNeta} />
        <p className="text-stone" style={{ fontSize: 10 }}>
          Base 2025: <span className="num font-semibold text-graphite">{formatFull(base2025)}</span> · Crecimiento:{" "}
          <span className="num font-semibold text-graphite">{crecimiento.toFixed(1)}%</span>
        </p>
      </div>
      <div className="flex flex-col">
        <SimResult label="Escala de crecimiento" value={escala} />
        <SimResult label="Tasa de rebate" value={`${(tasa * 100).toFixed(1)}%`} />
        <SimResult label="Rebate proyectado (sujeto a cartera al día)" value={formatCompact(rebate)} highlight />
      </div>
    </SimulatorShell>
  );
}
