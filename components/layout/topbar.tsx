import { LogOut } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  tesoreria: "Tesorería",
  contabilidad: "Contabilidad",
  gerencia: "Gerencia",
};

interface TopbarProps {
  email: string;
  name?: string | null;
  role: string;
  onSignOut: () => Promise<void>;
}

export function Topbar({ email, name, role, onSignOut }: TopbarProps) {
  return (
    <header
      className="flex shrink-0 items-center justify-between border-b border-line bg-paper"
      style={{ height: 48, padding: "0 20px" }}
    >
      <div className="flex items-center gap-2">
        <span style={{ fontFamily: "var(--font-nunito)", fontWeight: 900, fontSize: 14 }} className="text-red">
          Ferreinox
        </span>
        <span style={{ fontWeight: 600, fontSize: 13 }} className="text-graphite">
          Pagos Proveedores
        </span>
      </div>

      <form action={onSignOut} className="flex items-center gap-3">
        <div className="text-right leading-tight">
          <p style={{ fontSize: 12, fontWeight: 700 }} className="text-ink">
            {name || email}
          </p>
          <p style={{ fontSize: 10 }} className="text-stone">
            {ROLE_LABELS[role] ?? role}
          </p>
        </div>
        <button
          type="submit"
          aria-label="Cerrar sesión"
          className="flex items-center gap-1.5 border border-line text-graphite transition-colors duration-150 hover:bg-parchment focus-visible:outline-none focus-visible:shadow-glow-red"
          style={{ borderRadius: 8, padding: "6px 10px", fontSize: 11, fontWeight: 700 }}
        >
          <LogOut size={13} />
          Salir
        </button>
      </form>
    </header>
  );
}
