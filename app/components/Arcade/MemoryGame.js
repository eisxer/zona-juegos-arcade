"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
    Heart, Star, Zap, Smile, Sun, Music, Cpu, AlertCircle, Brain, Eye,
    Gem, Rocket, Atom, Ghost, Anchor, Shield, Tablet, Wifi
} from "lucide-react";

export default function MemoryGame({ onWin }) {
    // Config: 6 Levels
    // Level 1: 3x3 (9 cards) -> 4 Pairs + 1 Glitch.
    const LEVELS = {
        1: { pairs: 4, cols: 3, points: 50, name: "Entrenamiento", winsRequired: 6, time: 5, glitch: true }, // 9 cards
        2: { pairs: 6, cols: 3, points: 100, name: "Iniciado", winsRequired: 2, time: 7 }, // 12 cards
        3: { pairs: 8, cols: 4, points: 200, name: "Agente", winsRequired: 2, time: 10 }, // 16 cards
        4: { pairs: 8, cols: 4, points: 400, name: "Cortafuegos", time: 10, maxTime: 45 }, // 16 cards, Time Limit
        5: { pairs: 12, cols: 4, points: 500, name: "Maestro", winsRequired: 2, time: 15 }, // 24 cards
        6: { pairs: 12, cols: 4, points: 600, name: "Leyenda", time: 20, maxTime: 60 }, // 24 cards, Time Limit
    };

    const ALL_ICONS = [
        { id: 1, icon: <Heart className="text-fuchsia-400 w-8 h-8" /> },
        { id: 2, icon: <Star className="text-yellow-400 w-8 h-8" /> },
        { id: 3, icon: <Zap className="text-cyan-400 w-8 h-8" /> },
        { id: 4, icon: <Sun className="text-orange-400 w-8 h-8" /> },
        { id: 5, icon: <Music className="text-violet-400 w-8 h-8" /> },
        { id: 6, icon: <Smile className="text-emerald-400 w-8 h-8" /> },
        { id: 7, icon: <Gem className="text-pink-400 w-8 h-8" /> },
        { id: 8, icon: <Rocket className="text-red-400 w-8 h-8" /> },
        { id: 9, icon: <Atom className="text-blue-400 w-8 h-8" /> },
        { id: 10, icon: <Ghost className="text-gray-400 w-8 h-8" /> },
        { id: 11, icon: <Anchor className="text-indigo-400 w-8 h-8" /> },
        { id: 12, icon: <Shield className="text-teal-400 w-8 h-8" /> },
    ];

    const [level, setLevel] = useState(1);
    const [winsCurrentLevel, setWinsCurrentLevel] = useState(0);

    const [cards, setCards] = useState([]);
    const [flipped, setFlipped] = useState([]);
    const [solved, setSolved] = useState([]);
    const [mistakes, setMistakes] = useState(0);
    const [gameState, setGameState] = useState('ready'); // ready, memorizing, playing, finished, gameover
    const [timeLeft, setTimeLeft] = useState(0); // For memorizing
    const [gameTimeLeft, setGameTimeLeft] = useState(0); // For limit

    // Initial Load
    useEffect(() => {
        const savedLevel = parseInt(localStorage.getItem('memory_level') || '1');
        const savedWins = parseInt(localStorage.getItem(`memory_wins_l${savedLevel}`) || '0');
        setLevel(savedLevel);
        setWinsCurrentLevel(savedWins);
    }, []);

    // Setup Cards when level changes or game resets
    useEffect(() => {
        if (gameState === 'ready') {
            const config = LEVELS[level];
            const selectedIcons = ALL_ICONS.slice(0, config.pairs);
            let deck = [...selectedIcons, ...selectedIcons];

            // Add Glitch Card for Level 1
            if (config.glitch) {
                deck.push({ id: 999, icon: <AlertCircle className="text-red-500 w-8 h-8 animate-pulse" />, isGlitch: true });
            }

            const shuffled = deck
                .sort(() => Math.random() - 0.5)
                .map((c) => ({ ...c, uniqueId: Math.random() }));
            setCards(shuffled);
        }
    }, [level, gameState]);

    // Timers
    useEffect(() => {
        let timer;
        if (gameState === 'memorizing' && timeLeft > 0) {
            timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (gameState === 'memorizing' && timeLeft === 0) {
            setGameState('playing');
        }
        return () => clearTimeout(timer);
    }, [gameState, timeLeft]);

    useEffect(() => {
        let timer;
        if (gameState === 'playing' && LEVELS[level].maxTime && gameTimeLeft > 0) {
            timer = setTimeout(() => setGameTimeLeft(prev => prev - 1), 1000);
        } else if (gameState === 'playing' && LEVELS[level].maxTime && gameTimeLeft === 0) {
            setGameState('gameover');
        }
        return () => clearTimeout(timer);
    }, [gameState, gameTimeLeft, level]);

    const startGame = () => {
        setGameState('memorizing');
        setTimeLeft(LEVELS[level].time);
        if (LEVELS[level].maxTime) setGameTimeLeft(LEVELS[level].maxTime);
    };

    const handleCardClick = (uniqueId, id) => {
        if (gameState !== 'playing' || flipped.includes(uniqueId) || solved.includes(uniqueId)) return;

        // Glitch Card Logic
        const clickedCard = cards.find(c => c.uniqueId === uniqueId);
        if (clickedCard.isGlitch) {
            const newFlipped = [...flipped, uniqueId];
            setFlipped(newFlipped);

            // Visual feedback loop for glitch
            setTimeout(() => {
                setFlipped(prev => prev.filter(fid => fid !== uniqueId));
                setMistakes(prev => prev + 1);
            }, 500);
            return;
        }

        if (flipped.length >= 2) return; // Prevent >2 clicks

        const newFlipped = [...flipped, uniqueId];
        setFlipped(newFlipped);

        if (newFlipped.length === 2) {
            const [id1, id2] = newFlipped;
            const card1 = cards.find(c => c.uniqueId === id1);
            const card2 = cards.find(c => c.uniqueId === id2);

            if (card1.id === card2.id) {
                const newSolved = [...solved, id1, id2];
                setSolved(newSolved);
                setFlipped([]);

                // Win Check: Pairs * 2 = Total Solved cards needed
                if (newSolved.length === LEVELS[level].pairs * 2) {
                    handleWinRound();
                }
            } else {
                setTimeout(() => {
                    setFlipped([]);
                    setMistakes(prev => prev + 1);
                }, 1000);
            }
        }
    };

    // Reset progress: clear storage and restart at level 1
    const resetProgress = () => {
        // Clear stored level and wins for all levels
        localStorage.removeItem('memory_level');
        Object.keys(LEVELS).forEach(l => {
            localStorage.removeItem(`memory_wins_l${l}`);
        });
        // Force reload to ensure clean state and correct grid rendering
        window.location.reload();
    };



    // Remove duplicate resetGame definition later in file


    const resetGame = () => {
        // Reset game state for current level
        setCards([]);
        setFlipped([]);
        setSolved([]);
        setMistakes(0);
        setGameState('ready');
        setTimeLeft(0);
        setGameTimeLeft(0);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-sm mx-auto">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-black text-cyan-400 uppercase tracking-widest">{LEVELS[level].name}</h2>
                <div className="text-cyan-500/60 text-xs font-bold">Nivel {level}/6</div>
                {LEVELS[level].winsRequired && (
                    <div className="mt-2 w-full bg-slate-800 h-2 rounded-full overflow-hidden relative group">
                        <div
                            className="h-full bg-cyan-500 transition-all duration-500"
                            style={{ width: `${Math.min(100, (winsCurrentLevel / LEVELS[level].winsRequired) * 100)}%` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[9px] bg-black/80 px-2 rounded text-white font-bold">Progreso: {winsCurrentLevel}/{LEVELS[level].winsRequired} Victorias</span>
                        </div>
                    </div>
                )}
                {/* Reset button */}
                <button onClick={resetProgress} className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-400 text-white font-bold rounded">
                    Reiniciar Progreso
                </button>
            </div>

            {/* Timers & HUD */}
            <div className="flex justify-between w-full mb-4 px-2">
                {LEVELS[level].maxTime && gameState === 'playing' ? (
                    <div className={`font-black text-xl ${gameTimeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>TIME: {gameTimeLeft}s</div>
                ) : <div></div>}
                <div className="text-slate-400 font-bold text-sm">Fallos: {mistakes}</div>
            </div>

            {/* Grid */}
            <div className="relative w-full aspect-square">
                {gameState === 'ready' && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-xl">
                        <button onClick={startGame} className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-full shadow-lg active:scale-95 transition-all">INICIAR</button>
                    </div>
                )}

                {gameState === 'memorizing' && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                        <div className="text-6xl font-black text-yellow-400 animate-pulse">{timeLeft}</div>
                    </div>
                )}

                <div className="grid gap-3 w-full h-full" style={{ gridTemplateColumns: `repeat(${LEVELS[level].cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${Math.ceil((LEVELS[level].pairs * 2 + (LEVELS[level].glitch ? 1 : 0)) / LEVELS[level].cols)}, minmax(0, 1fr))` }}>
                    {cards.map(card => (
                        <div key={card.uniqueId} onClick={() => handleCardClick(card.uniqueId)} className="relative cursor-pointer group perspective-1000">
                            <motion.div
                                className="w-full h-full rounded-xl transition-all shadow-lg"
                                initial={false}
                                animate={{ rotateY: flipped.includes(card.uniqueId) || solved.includes(card.uniqueId) || gameState === 'memorizing' ? 180 : 0 }}
                                style={{ transformStyle: "preserve-3d" }}
                            >
                                {/* Back */}
                                <div className={`absolute inset-0 bg-slate-800 border ${card.isGlitch ? 'border-red-500/50' : 'border-cyan-500/30'} rounded-xl flex items-center justify-center backface-hidden`}>
                                    <Cpu className={`w-8 h-8 ${card.isGlitch ? 'text-red-900/50' : 'text-cyan-900/50'}`} />
                                </div>
                                {/* Front */}
                                <div className={`absolute inset-0 bg-slate-900 border ${card.isGlitch ? 'border-red-500 shadow-red-500/50' : 'border-cyan-400'} rounded-xl flex items-center justify-center backface-hidden`} style={{ transform: 'rotateY(180deg)' }}>
                                    {card.icon}
                                </div>
                            </motion.div>
                        </div>
                    ))}
                </div>
            </div>

            <AnimatePresence>
                {gameState === 'finished' && (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-6 backdrop-blur-md rounded-xl">
                        <div className="text-center w-full">
                            <h3 className="text-3xl font-black text-yellow-400 mb-4 tracking-tighter">VICTORIA</h3>
                            <div className="flex flex-col gap-3">
                                <button onClick={resetGame} className="w-full py-4 bg-slate-800 border border-white/20 hover:bg-slate-700 text-white font-bold rounded-xl uppercase tracking-widest transition-colors">
                                    Repetir (+Pts)
                                </button>
                                {canAdvance && level < 6 ? (
                                    <button onClick={advanceLevel} className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black rounded-xl uppercase shadow-lg hover:shadow-cyan-500/50 tracking-widest transition-all">
                                        Nivel {level + 1} &rarr;
                                    </button>
                                ) : (
                                    level < 6 && (
                                        <div className="w-full py-4 bg-slate-900/50 text-slate-500 font-bold rounded-xl uppercase border border-slate-800 flex flex-col items-center justify-center gap-1">
                                            <span className="text-xs tracking-widest">Bloqueado</span>
                                            <span className="text-cyan-500">{winsCurrentLevel}/{LEVELS[level].winsRequired || LEVELS[1].winsRequired} Victorias</span>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
                {gameState === 'gameover' && (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 z-50 flex items-center justify-center bg-red-950/95 p-6 backdrop-blur-md rounded-xl">
                        <div className="text-center">
                            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4 animate-bounce" />
                            <h3 className="text-3xl font-black text-red-400 mb-4 tracking-tighter">TIEMPO AGOTADO</h3>
                            <p className="text-red-200/50 text-sm mb-6 font-bold uppercase">Sistema bloqueado por inactividad</p>
                            <button onClick={resetGame} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl uppercase shadow-lg tracking-widest">
                                Reintentar
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
