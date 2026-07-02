"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Correo o contraseña incorrectos.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-parchment px-4">
      <div className="w-full max-w-[400px] rounded-lg border border-line bg-paper p-8 shadow-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="text-2xl font-extrabold text-red">Ferreinox</span>
          <h1 className="mt-3 text-xl font-semibold text-graphite">Pagos Proveedores</h1>
        </div>

        <hr className="mb-6 border-line" />

        {error && (
          <p className="mb-4 flex items-center gap-2 text-sm font-semibold text-red-deep">
            <AlertCircle size={16} />
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <label htmlFor="email" className="mb-1 block text-sm font-semibold text-graphite">
            Correo
          </label>
          <input
            ref={emailRef}
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mb-4 w-full rounded-md border border-line px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-stone/60 hover:border-stone focus:border-red focus:shadow-glow-red"
          />

          <label htmlFor="password" className="mb-1 block text-sm font-semibold text-graphite">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mb-6 w-full rounded-md border border-line px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-stone/60 hover:border-stone focus:border-red focus:shadow-glow-red"
          />

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Ingresando…" : "Ingresar"}
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-stone">
        Ferreinox S.A.S. BIC
        <br />
        Uso interno · v1.0
      </p>
    </main>
  );
}
