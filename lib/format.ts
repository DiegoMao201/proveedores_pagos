const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

export function formatCurrencyCompact(value: number): string {
  return compactCurrencyFormatter.format(value);
}

export function formatDateEs(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

// Rediseño provider-first, seccion F.1: formato compacto obligatorio en KPIs y
// tablas resumen, signo negativo siempre EMDASH (U+2212), nunca hyphen-minus.
export function formatCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "").replace(".", ",")} mil M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(1).replace(/\.?0+$/, "").replace(".", ",")} M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${Math.round(abs / 1_000)} K`;
  }
  return `${sign}$${abs.toLocaleString("es-CO")}`;
}

export function formatFull(value: number): string {
  const sign = value < 0 ? "−" : "";
  return `${sign}$${Math.abs(value).toLocaleString("es-CO")}`;
}

// Nombre normalizado (PINTUCOCOLOMBIASAS) nunca se muestra al usuario (seccion
// F.3) -- este helper es solo un fallback si por algun motivo no llega el
// "nombre" original de providers.provider.
export function humanizeProviderName(normalized: string): string {
  return normalized
    .toLowerCase()
    .split(/(?=[A-Z])|[\s._-]+/)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Fechas relativas para UI (seccion F.2): "hoy", "ayer", "hace N dias", o
// "18 jun" si esta mas lejos.
export function formatDateRelative(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "hoy";
  if (diffDays === 1) return "ayer";
  if (diffDays > 1 && diffDays <= 7) return `hace ${diffDays} días`;
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

export function documentTypeLabel(tipo: string | null | undefined): string {
  switch (tipo) {
    case "NOTA_CREDITO":
      return "Nota crédito";
    case "NOTA_DEBITO":
      return "Nota débito";
    default:
      return "Factura";
  }
}
