"use client";

import { AlertCircle } from "lucide-react";

export default function MathGame() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <AlertCircle className="w-16 h-16 text-slate-600 mb-4" />
            <h2 className="text-2xl font-black text-slate-500 uppercase tracking-widest">Módulo en Desarrollo</h2>
            <p className="text-slate-600 mt-2">El procesador matemático no está disponible en esta versión.</p>
        </div>
    );
}
