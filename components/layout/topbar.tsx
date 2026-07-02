import { LogOut } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  tesoreria: "Tesorería",
  contabilidad: "Contabilidad",
  gerencia: "Gerencia",
};

interface TopbarProps {
  email: string;
  role: string;
  onSignOut: () => Promise<void>;
}

export function Topbar({ email, role, onSignOut }: TopbarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-paper px-6 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-lg font-extrabold text-red">Ferreinox</span>
        <span className="text-lg font-semibold text-graphite">Pagos Proveedores</span>
      </div>

      <form action={onSignOut} className="flex items-center gap-4">
        <div className="text-right leading-tight">
          <p className="text-sm font-semibold text-ink">{email}</p>
          <p className="text-xs text-stone">{ROLE_LABELS[role] ?? role}</p>
        </div>
        <button
          type="submit"
          aria-label="Cerrar sesión"
          className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-graphite transition-colors duration-150 hover:bg-parchment focus-visible:outline-none focus-visible:shadow-glow-red"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </form>
    </header>
  );
}
