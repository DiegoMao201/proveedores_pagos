import { redirect } from "next/navigation";

// Analisis > Cartera reusa la vista global de cartera pendiente (agregada,
// solo lectura) mientras se separa una version explicitamente "panoramica"
// en un checkpoint posterior.
export default function AnalisisCarteraPage() {
  redirect("/cartera/pendiente");
}
