import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Arcade OS | Entrenamiento Mental",
  description: "Sistema de entrenamiento cognitivo gamificado.",
  manifest: "/manifest.json", // <--- 1. Conecta el archivo de instalación
  icons: {
    icon: "/logo.png",        // <--- 2. Icono para el navegador
    apple: "/logo.png",       // <--- 3. Icono para iPhone/iPad
  },
  themeColor: "#020617",      // <--- 4. Color de la barra de estado del móvil (oscuro)
};

export default function RootLayout({ children }) {
  return (
    // "suppressHydrationWarning" evita errores por extensiones del navegador
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}