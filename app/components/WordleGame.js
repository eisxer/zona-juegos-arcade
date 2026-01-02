"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { HelpCircle, Delete, X } from "lucide-react";

export default function WordleGame({ onWinGame }) {
    // DICCIONARIO POR NIVELES
    const LEVELS = {
        1: { length: 4, points: 100, words: ["CASA", "VIDA", "LUNA", "AMOR", "SOLO", "GATO", "AZUL", "ROJO", "AIRE", "MARS"] },
        2: { length: 5, points: 200, words: ["EXITO", "PODER", "MENTE", "SUEÑO", "CREAR", "SABER", "VIVIR", "HACER", "LIDER", "FELIZ"] },
        3: { length: 6, points: 300, words: ["FUTURO", "TIEMPO", "GLORIA", "FUERZA", "CODIGO", "ACCION", "CAMBIO", "LOGROS", "MENTES"] }
    };

    const WINS_TO_LEVEL_UP = 3;

    const [level, setLevel] = useState(1);
    const [levelWins, setLevelWins] = useState(0);
    const [solution, setSolution] = useState("");
    const [guesses, setGuesses] = useState(Array(6).fill(null));
    const [currentGuess, setCurrentGuess] = useState("");
    const [gameOver, setGameOver] = useState(false);
    const [won, setWon] = useState(false);
    const [shakeRow, setShakeRow] = useState(-1);
    const [showHelp, setShowHelp] = useState(false);

    const startNewRound = (currentLevel) => {
        const wordList = LEVELS[currentLevel].words;
        const randomWord = wordList[Math.floor(Math.random() * wordList.length)];
        setSolution(randomWord);
        setGuesses(Array(6).fill(null));
        setCurrentGuess("");
        setGameOver(false);
        setWon(false);
    };

    useEffect(() => {
        startNewRound(1);
    }, []);

    const handleKeyup = (key) => {
        if (gameOver || showHelp) return;
        const currentLength = LEVELS[level].length;

        if (key === "ENTER") {
            if (currentGuess.length !== currentLength) {
                setShakeRow(guesses.findIndex(val => val === null));
                setTimeout(() => setShakeRow(-1), 500);
                return;
            }

            const newGuesses = [...guesses];
            const firstEmptyIndex = newGuesses.findIndex(val => val === null);
            newGuesses[firstEmptyIndex] = currentGuess;
            setGuesses(newGuesses);
            setCurrentGuess("");

            if (currentGuess === solution) {
                handleVictory();
            } else if (firstEmptyIndex === 5) {
                setGameOver(true);
            }
        } else if (key === "BACKSPACE") {
            setCurrentGuess(prev => prev.slice(0, -1));
        } else {
            if (currentGuess.length < currentLength && /^[A-ZÑ]$/.test(key)) {
                setCurrentGuess(prev => prev + key);
            }
        }
    };

    const handleVictory = () => {
        setWon(true);
        setGameOver(true);
        const newWins = levelWins + 1;
        const points = LEVELS[level].points;
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ['#06b6d4', '#d946ef'] });
        onWinGame(points);

        if (newWins >= WINS_TO_LEVEL_UP && level < 3) {
            setTimeout(() => {
                setLevel(prev => prev + 1);
                setLevelWins(0);
                startNewRound(level + 1);
            }, 3000);
        } else {
            setLevelWins(newWins);
        }
    };

    const getBgColor = (letter, index, rowWord) => {
        if (!rowWord) return "bg-slate-900/50 border-cyan-900/30";
        if (solution[index] === letter) return "bg-emerald-500 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]";
        if (solution.includes(letter)) return "bg-amber-500 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]";
        return "bg-slate-700 border-slate-600";
    };

    const gridColsClass = level === 1 ? "grid-cols-4" : level === 2 ? "grid-cols-5" : "grid-cols-6";

    return (
        <div className="flex flex-col items-center w-full max-w-md p-4 relative">
            <div className="mb-4 text-center w-full">
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-500 uppercase tracking-widest">NIVEL {level}</h2>
                        <p className="text-fuchsia-500/50 text-[10px] font-bold tracking-[0.3em]">
                            {level === 1 ? "NOVATO (4 LETRAS)" : level === 2 ? "HACKER (5 LETRAS)" : "MAESTRO (6 LETRAS)"}
                        </p>
                    </div>
                    <button onClick={() => setShowHelp(true)} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-fuchsia-400 border border-fuchsia-500/30">
                        <HelpCircle className="w-5 h-5" />
                    </button>
                </div>

                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden border border-white/5">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(levelWins / WINS_TO_LEVEL_UP) * 100}%` }}
                        className="h-full bg-gradient-to-r from-cyan-500 to-fuchsia-500"
                    />
                </div>
                <p className="text-right text-[10px] text-slate-400 mt-1">PROGRESO DE NIVEL: {levelWins}/{WINS_TO_LEVEL_UP}</p>
            </div>

            <div className={`grid ${gridColsClass} gap-2 mb-6 w-full max-w-[340px]`}>
                {guesses.map((guess, i) => {
                    const isCurrent = guesses.findIndex(val => val === null) === i;
                    const wordToShow = isCurrent ? currentGuess : (guess || "");
                    const isError = shakeRow === i;

                    return (
                        <motion.div
                            key={i}
                            animate={isError ? { x: [-10, 10, -10, 10, 0] } : {}}
                            className={`grid ${gridColsClass} gap-2 col-span-full`}
                        >
                            {Array.from({ length: LEVELS[level].length }).map((_, j) => (
                                <div key={j} className={`aspect-square border-2 rounded-lg flex items-center justify-center text-xl md:text-2xl font-black transition-all ${isCurrent ? 'border-fuchsia-500/50 text-white' : getBgColor(wordToShow[j], j, guess)}`}>
                                    {wordToShow[j]}
                                </div>
                            ))}
                        </motion.div>
                    );
                })}
            </div>

            <div className="w-full flex flex-col gap-2">
                {["QWERTYUIOP", "ASDFGHJKLÑ", "ZXCVBNM"].map((row, i) => (
                    <div key={i} className="flex justify-center gap-1">
                        {row.split("").map((char) => (
                            <button key={char} onClick={() => handleKeyup(char)} className="w-8 h-10 rounded bg-slate-800 text-slate-300 font-bold text-xs hover:bg-cyan-700 active:scale-95 transition-all shadow-sm border border-white/5">{char}</button>
                        ))}
                        {i === 2 && (
                            <button onClick={() => handleKeyup("BACKSPACE")} className="px-3 h-10 rounded bg-slate-800 text-red-400 hover:bg-red-900/30 border border-red-500/20"><Delete className="w-4 h-4" /></button>
                        )}
                    </div>
                ))}
                <button onClick={() => handleKeyup("ENTER")} className="w-full mt-2 py-3 bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-lg font-black tracking-widest hover:shadow-[0_0_20px_rgba(217,70,239,0.4)] active:scale-95 transition-all uppercase">
                    {gameOver ? (won ? "Siguiente Misión" : "Reintentar") : "Confirmar Código"}
                </button>
            </div>

            <AnimatePresence>
                {gameOver && !showHelp && (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute z-40 p-6 rounded-[2rem] bg-slate-900/95 border border-white/10 text-center shadow-[0_0_50px_rgba(217,70,239,0.3)] max-w-xs top-1/2 -translate-y-1/2 left-0 right-0 mx-auto">
                        <h3 className={`text-2xl font-black mb-2 ${won ? 'text-emerald-400' : 'text-red-400'}`}>
                            {won ? (levelWins + 1 >= WINS_TO_LEVEL_UP && level < 3 ? "¡NIVEL COMPLETADO!" : "¡CÓDIGO ACEPTADO!") : "FALLO DE SISTEMA"}
                        </h3>

                        <p className="text-white mb-4">La clave era: <span className="text-fuchsia-400 font-bold">{solution}</span></p>

                        {won ? (
                            <div className="space-y-2">
                                <div className="text-3xl font-black text-white drop-shadow-md">+{LEVELS[level].points} PTS</div>
                                {levelWins + 1 >= WINS_TO_LEVEL_UP && level < 3 && <p className="text-cyan-400 text-xs animate-pulse">ACCEDIENDO A NIVEL {level + 1}...</p>}
                            </div>
                        ) : (
                            <button onClick={() => startNewRound(level)} className="px-6 py-2 bg-white/10 rounded-full text-sm hover:bg-white/20">Reiniciar Nivel</button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showHelp && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm rounded-xl p-4">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900 border border-fuchsia-500/30 p-6 rounded-2xl max-w-sm w-full shadow-[0_0_40px_rgba(217,70,239,0.2)]">
                            <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-black text-fuchsia-400 uppercase tracking-wider">Protocolo</h3><button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-white"><X className="w-6 h-6" /></button></div>
                            <p className="text-sm text-slate-300 mb-4">Descifra palabras de {LEVELS[level].length} letras.</p>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded bg-emerald-500 flex items-center justify-center font-bold text-white border border-emerald-400">A</div><p className="text-xs text-slate-300">Posición Correcta</p></div>
                                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center font-bold text-white border border-amber-400">B</div><p className="text-xs text-slate-300">Letra Correcta, Sitio Mal</p></div>
                                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded bg-slate-700 flex items-center justify-center font-bold text-slate-400 border border-slate-600">C</div><p className="text-xs text-slate-300">No Existe</p></div>
                            </div>
                            <button onClick={() => setShowHelp(false)} className="w-full mt-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-bold">ENTENDIDO</button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
