import { auth, signOut } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-slate-900">
        Hola {session?.user.email}, tu rol es {session?.user.role}
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Placeholder de la Fase 0 nucleo. Los dashboards reales (Tesoreria, Rebate, Planificador de
        Pagos) se construyen en la Fase 3.
      </p>

      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
        className="mt-6"
      >
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
