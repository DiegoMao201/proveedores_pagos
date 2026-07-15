import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Default es 1MB -- una foto de celular del comprobante de
      // consignacion facilmente lo supera (Error: "Body exceeded 1 MB
      // limit.", digest 3010998687@E394 en produccion). El limite real de
      // tamano de archivo ya se valida en reportarSedeAbono (5MB), esto
      // solo evita que Next.js rechace la request antes de llegar ahi.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
