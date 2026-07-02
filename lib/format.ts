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

const CORPORATE_SUFFIXES = new Set(["SAS", "SA", "LTDA", "S.A.S", "S.A", "S.A.S.", "S.A."]);

// Nombre normalizado (PINTUCOCOLOMBIASAS) o crudo del ERP (ALL CAPS) nunca se
// muestra al usuario tal cual (seccion A.1 / F.3 del rediseno) -- este helper
// es el fallback cuando no llega el "nombre" humano ya guardado en
// providers.provider. Preferir siempre esa columna via JOIN; esto solo cubre
// el caso en que el proveedor todavia no esta en el catalogo.
export function humanizeProviderName(input: string): string {
  if (!input) return "—";

  // Ya viene humano (tiene minusculas mezcladas) -- pasar tal cual.
  if (/[a-z]/.test(input)) return input;

  // ALL CAPS con espacios (tipico del ERP: "ZULUAGA MONTES GONZALO") -- Title
  // Case respetando sufijos societarios.
  if (/^[A-Z0-9\s.&-]+$/.test(input) && /\s/.test(input)) {
    return input
      .split(" ")
      .map((word) => {
        const clean = word.replace(/\./g, "");
        if (CORPORATE_SUFFIXES.has(word) || CORPORATE_SUFFIXES.has(clean)) return word;
        if (!word) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");
  }

  // Normalizado sin espacios tipo PINTUCOCOLOMBIASAS -- split heuristico
  // separando el sufijo societario final si se reconoce.
  let base = input;
  let suffix = "";
  for (const s of ["SAS", "SA", "LTDA"]) {
    if (base.endsWith(s) && base.length > s.length) {
      base = base.slice(0, -s.length);
      suffix = ` ${s === "SAS" ? "S.A.S" : s === "SA" ? "S.A" : "Ltda"}`;
      break;
    }
  }
  const titled = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
  return titled + suffix;
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

// Bug real encontrado (seccion A.3/A.4 del rediseno): la clase Tailwind
// "capitalize" pone en mayuscula CADA palabra ("Hoy Es Jueves, 2 De Julio"),
// no solo la primera letra. En espanol los dias/meses van en minuscula (RAE)
// y sin el prefijo "Hoy es". Se construye la fecha en minusculas y se
// capitaliza a mano solo el primer caracter.
export function formatTodayEs(date: Date = new Date()): string {
  const raw = new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long",
    day: "numeric",
    month: "long",
  })
    .format(date)
    .toLowerCase();
  return raw.charAt(0).toUpperCase() + raw.slice(1);
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
