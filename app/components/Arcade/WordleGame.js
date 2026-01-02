"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle } from "lucide-react";
import confetti from "canvas-confetti";

const LEVELS = {
    1: { length: 4, points: 100, name: "Novato (4L)" },
    2: { length: 5, points: 200, name: "Hacker (5L)" },
    3: { length: 6, points: 300, name: "Sistema (6L)" }
};

const WORDS = {
    4: ["CASA", "AUTO", "LUNA", "GATO", "PERO", "SINO", "TODO", "NADA", "AGUA", "AIRE", "FUEGO", "VIDA", "AMOR", "AZUL", "ROJO", "DATO", "WIFI", "JAVA", "HTML"],
    5: ["PODER", "SUEÑO", "MUNDO", "TIEMPO", "NUEVO", "MEJOR", "PERRO", "GATOS", "LIBRO", "PAPEL", "COLOR", "FELIZ", "ROBOT", "CABLE", "DATOS", "LINUX", "MOUSE"],
    6: ["CODIGO", "FUTURO", "TIEMPO", "CAMINO", "AMIGOS", "CIUDAD", "MUSICA", "DINERO", "CUERPO", "MENTE", "PYTHON", "SERVER", "SCRIPT", "ACCESO", "NUCLEO"]
};

export default function WordleGame({ onWinGame }) {
    const [level, setLevel] = useState(1);
    const [targetWord, setTargetWord] = useState("");
    const [guesses, setGuesses] = useState([]);
    const [currentGuess, setCurrentGuess] = useState("");
    const [gameState, setGameState] = useState("playing"); // playing, won, lost

    useEffect(() => {
        // Load level from localStorage
        const savedLevel = localStorage.getItem('wordle_level');
        if (savedLevel) setLevel(parseInt(savedLevel));
        startNewGame(parseInt(savedLevel) || 1);
    }, []);

    const startNewGame = (lvl) => {
        const wordList = WORDS[LEVELS[lvl].length];
        const randomWord = wordList[Math.floor(Math.random() * wordList.length)];
        setTargetWord(randomWord);
        setGuesses([]);
        setCurrentGuess("");
        setGameState("playing");
    };

    const handleLevelUp = () => {
        if (level < 3) {
            const nextLevel = level + 1;
            setLevel(nextLevel);
            localStorage.setItem('wordle_level', nextLevel);
            startNewGame(nextLevel);
        } else {
            // Already max level, just replay
            startNewGame(level);
        }
    };

    const submitGuess = () => {
        if (currentGuess.length !== LEVELS[level].length) return;

        const newGuesses = [...guesses, currentGuess];
        setGuesses(newGuesses);
        setCurrentGuess("");

        if (currentGuess === targetWord) {
            setGameState("won");
            confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
            onWinGame(LEVELS[level].points);
        } else if (newGuesses.length >= 6) {
            setGameState("lost");
        }
    };

    const handleKey = (key) => {
        if (gameState !== "playing") return;

        if (key === "ENTER") {
            submitGuess();
        } else if (key === "BACK") {
            setCurrentGuess(prev => prev.slice(0, -1));
        } else if (currentGuess.length < LEVELS[level].length && /^[A-ZÑ]$/.test(key)) {
            setCurrentGuess(prev => prev + key);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-sm mx-auto">
            <h2 className="text-2xl font-black text-fuchsia-400 mb-2 uppercase tracking-widest">{LEVELS[level].name}</h2>
            <div className="text-xs text-fuchsia-500/60 font-bold mb-6">Nivel {level}/3 • {LEVELS[level].length} Letras</div>

            {/* Grid */}
            <div className="flex flex-col gap-2 mb-8">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex gap-2 justify-center">
                        {Array.from({ length: LEVELS[level].length }).map((_, j) => {
                            const guess = guesses[i];
                            const letter = guess ? guess[j] : (i === guesses.length ? currentGuess[j] : "");

                            let status = "empty";
                            if (guess) {
                                if (letter === targetWord[j]) status = "correct";
                                else if (targetWord.includes(letter)) status = "present";
                                else status = "absent";
                            }

                            return (
                                <div key={j} className={`w-10 h-10 border-2 rounded-md flex items-center justify-center font-black text-xl transition-all
                                    ${status === 'correct' ? 'bg-emerald-500 border-emerald-500 text-black' :
                                        status === 'present' ? 'bg-yellow-500 border-yellow-500 text-black' :
                                            status === 'absent' ? 'bg-slate-800 border-slate-700 text-slate-500' :
                                                'border-slate-600 bg-slate-900/50 text-white'}`}
                                >
                                    {letter}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Keyboard (Minimal - Spanish) */}
            <div className="grid grid-cols-10 gap-1 w-full px-1">
                {["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"].map(char => (
                    <button key={char} onClick={() => handleKey(char)} className="py-3 bg-slate-800 rounded font-bold text-[10px] hover:bg-slate-700 text-slate-300">{char}</button>
                ))}
            </div>
            <div className="grid grid-cols-10 gap-1 w-full px-1 mt-1">
                {["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ñ"].map(char => (
                    <button key={char} onClick={() => handleKey(char)} className="py-3 bg-slate-800 rounded font-bold text-[10px] hover:bg-slate-700 text-slate-300">{char}</button>
                ))}
            </div>
            <div className="grid grid-cols-9 gap-1 w-full px-1 mt-1">
                <button onClick={() => handleKey("ENTER")} className="col-span-1.5 py-3 bg-emerald-900/50 text-emerald-300 rounded font-bold text-[10px]">OK</button>
                {["Z", "X", "C", "V", "B", "N", "M"].map(char => (
                    <button key={char} onClick={() => handleKey(char)} className="py-3 bg-slate-800 rounded font-bold text-[10px] hover:bg-slate-700 text-slate-300">{char}</button>
                ))}
                <button onClick={() => handleKey("BACK")} className="col-span-1.5 py-3 bg-red-900/50 text-red-300 rounded font-bold text-[10px]">DEL</button>
            </div>

            <AnimatePresence>
                {gameState !== "playing" && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-8 rounded-xl">
                        <div className="bg-slate-900 border border-white/10 p-6 rounded-2xl text-center shadow-2xl max-w-xs w-full">
                            {gameState === "won" ? (
                                <>
                                    <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                                    <h3 className="text-2xl font-black text-white mb-2">¡Desencriptado!</h3>
                                    <div className="text-emerald-400 font-bold mb-6">Palabra: {targetWord}</div>
                                    <div className="text-white/60 font-medium mb-6">+{LEVELS[level].points} PTS</div>
                                    <button onClick={handleLevelUp} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl uppercase tracking-widest">
                                        {level < 3 ? "Siguiente Nivel" : "Reintentar"}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                                    <h3 className="text-2xl font-black text-white mb-2">Acceso Denegado</h3>
                                    <div className="text-red-400 font-bold mb-6">Palabra: {targetWord}</div>
                                    <button onClick={() => startNewGame(level)} className="w-full py-3 bg-red-500 hover:bg-red-400 text-slate-950 font-black rounded-xl uppercase tracking-widest">
                                        Reintentar
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
