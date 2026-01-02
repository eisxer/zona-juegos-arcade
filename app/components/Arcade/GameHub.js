"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Brain, Calculator, ArrowLeft, Cpu, Trophy } from "lucide-react";
import MemoryGame from "./MemoryGame";
import WordleGame from "./WordleGame";
import MathGame from "./MathGame";

const GAMES_MENU = [
    {
        id: "memory",
        title: "Memoria Neural",
        desc: "Sincroniza los pares",
        icon: <Brain className="w-8 h-8 text-cyan-300" />,
        colorFrom: "from-cyan-500",
        colorTo: "to-blue-600",
    },
    {
        id: "wordle",
        title: "Cripto-Palabra",
        desc: "Desencripta códigos",
        icon: <Cpu className="w-8 h-8 text-fuchsia-300" />,
        colorFrom: "from-fuchsia-500",
        colorTo: "to-purple-600",
    },
    {
        id: "math",
        title: "Procesador Zen",
        desc: "Cálculo mental",
        icon: <Calculator className="w-8 h-8 text-emerald-300" />,
        colorFrom: "from-emerald-500",
        colorTo: "to-teal-600",
    },
];

export default function GameHub() {
    const [activeGame, setActiveGame] = useState(null);
    const [familyScore, setFamilyScore] = useState(0);

    useEffect(() => {
        const storedScore = localStorage.getItem('familyScore');
        if (storedScore) setFamilyScore(parseInt(storedScore));
    }, []);

    const updateScore = (points) => {
        const newScore = familyScore + points;
        setFamilyScore(newScore);
        localStorage.setItem('familyScore', newScore);
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500/30 overflow-x-hidden relative">
            <div className="fixed inset-0 scanlines opacity-10 pointer-events-none z-50"></div>
            <div className="absolute inset-0 z-0 animate-grid-scroll bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_70%,transparent_110%)] pointer-events-none"></div>

            <AnimatePresence mode="wait">
                {!activeGame ? (
                    <motion.div
                        key="menu"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="max-w-md mx-auto p-6 min-h-screen flex flex-col items-center justify-center relative z-10"
                    >
                        <header className="flex justify-between items-end mb-10 mt-6">
                            <div>
                                <h1 className="glitch-text text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600">
                                    ARCADE_OS
                                </h1>
                                <p className="text-cyan-400/60 text-xs uppercase tracking-[0.2em] mt-1 font-bold">Familia Conectada v3.0</p>
                            </div>
                            <div className="bg-slate-900/80 border border-yellow-500/30 px-3 py-1 rounded-lg flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-yellow-500" />
                                <span className="font-black text-xl text-yellow-300">{familyScore}</span>
                            </div>
                        </header>

                        <div className="grid gap-4">
                            {GAMES_MENU.map(game => (
                                <motion.button
                                    key={game.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setActiveGame(game.id)}
                                    className="relative overflow-hidden w-full p-1 rounded-2xl text-left group"
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-r ${game.colorFrom} ${game.colorTo} opacity-20 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`}></div>
                                    <div className="relative bg-slate-900/90 backdrop-blur-xl rounded-xl p-5 border border-white/10 flex items-center gap-4 group-hover:bg-slate-900/40 transition-colors">
                                        <div className={`p-3 rounded-lg bg-gradient-to-br ${game.colorFrom}/20 ${game.colorTo}/20`}>
                                            {game.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-lg uppercase tracking-wide">{game.title}</h3>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{game.desc}</p>
                                        </div>
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="game"
                        initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}
                        className="min-h-screen flex flex-col relative z-20 bg-slate-950/95 backdrop-blur-xl"
                    >
                        <div className="p-4 flex items-center">
                            <button onClick={() => setActiveGame(null)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors">
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center p-4">
                            {activeGame === 'memory' && <MemoryGame onWin={updateScore} />}
                            {activeGame === 'wordle' && <WordleGame onWinGame={updateScore} />}
                            {activeGame === 'math' && <MathGame />}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
