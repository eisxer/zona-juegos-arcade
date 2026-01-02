"use client";

import { motion } from "framer-motion";
import { Calculator } from "lucide-react";

export default function MathGame() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center p-8 text-center"
        >
            <div className="w-24 h-24 bg-emerald-900/30 rounded-full flex items-center justify-center mb-6 border border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <Calculator className="w-12 h-12 text-emerald-400" />
            </div>
            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 mb-2 uppercase tracking-tight">Procesador Zen</h2>
            <p className="text-emerald-200/60 font-medium max-w-xs">
                Módulo de entrenamiento matemático en desarrollo. Próximamente disponible.
            </p>
        </motion.div>
    );
}
