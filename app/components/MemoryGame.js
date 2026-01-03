"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
    Heart, Star, Zap, Smile, Sun, Music, Cpu, AlertCircle, Brain, Eye,
    Gem, Rocket, Atom, Ghost, Anchor, Shield, Tablet, Wifi
} from "lucide-react";

export default function MemoryGame({ onWinGame }) {
    const [cards, setCards] = useState([]);
    const [flipped, setFlipped] = useState([]);
    const [solved, setSolved] = useState([]);
    const [mistakes, setMistakes] = useState(0);
    const [won, setWon] = useState(false);
    const [pointsEarned, setPointsEarned] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [level, setLevel] = useState(1);
    const [showLevelComplete, setShowLevelComplete] = useState(false);
    const [gameState, setGameState] = useState('ready'); // ready, memorizing, playing, finished, gameover
    const [timeLeft, setTimeLeft] = useState(7);
    const [gameTimeLeft, setGameTimeLeft] = useState(0);

    // Configuración de Niveles (6 Niveles)
    const LEVELS = {
        1: { pairs: 3, cols: 3, points: 100, name: "Novato", time: 7 }, // 6 cartas, 3x2
        2: { pairs: 8, cols: 4, points: 200, name: "Agente", time: 10 }, // 16 cartas, 4x4
        3: { pairs: 10, cols: 4, points: 300, name: "Ciborg", time: 15 }, // 20 cartas, 4x5
        4: { pairs: 8, cols: 4, points: 400, name: "Hacker", time: 10, maxTime: 45 }, // 16 cartas, Time Limit
        5: { pairs: 12, cols: 4, points: 500, name: "Maestro", time: 20 }, // 24 cartas, 4x6
        6: { pairs: 12, cols: 4, points: 600, name: "Leyenda", time: 20, maxTime: 60 }, // 24 cartas, Time Limit
    };

    // Iconos Expandidos
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
        { id: 13, icon: <Tablet className="text-lime-400 w-8 h-8" /> },
        { id: 14, icon: <Wifi className="text-sky-400 w-8 h-8" /> },
    ];

    useEffect(() => {
        const config = LEVELS[level];
        const selectedIcons = ALL_ICONS.slice(0, config.pairs);
        const shuffled = [...selectedIcons, ...selectedIcons].sort(() => Math.random() - 0.5).map((c) => ({ ...c, uniqueId: Math.random() }));
        setCards(shuffled);
    }, [level]);

    useEffect(() => {
        let timer;
        if (gameState === 'memorizing' && timeLeft > 0) {
            timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        } else if (gameState === 'memorizing' && timeLeft === 0) {
            setGameState('playing');
        }
        return () => clearTimeout(timer);
    }, [gameState, timeLeft]);

    useEffect(() => {
        let gameTimer;
        if (gameState === 'playing' && LEVELS[level].maxTime && gameTimeLeft > 0) {
            gameTimer = setTimeout(() => setGameTimeLeft(prev => prev - 1), 1000);
        } else if (gameState === 'playing' && LEVELS[level].maxTime && gameTimeLeft === 0) {
            setGameState('gameover');
            setProcessing(true);
        }
        return () => clearTimeout(gameTimer);
    }, [gameState, gameTimeLeft, level]);

    const startGame = () => {
        setGameState('memorizing');
        setTimeLeft(LEVELS[level].time);
        if (LEVELS[level].maxTime) {
            setGameTimeLeft(LEVELS[level].maxTime);
        }
    };

    const handleCardClick = (uniqueId, id) => {
        if (gameState !== 'playing' || processing || won || flipped.includes(uniqueId) || solved.includes(uniqueId)) return;
        const newFlipped = [...flipped, uniqueId];
        setFlipped(newFlipped);

        if (newFlipped.length === 2) {
            setProcessing(true);
            const [firstCardId, secondCardId] = newFlipped;
            const firstCard = cards.find((c) => c.uniqueId === firstCardId);
            const secondCard = cards.find((c) => c.uniqueId === secondCardId);

            if (firstCard.id === secondCard.id) {
                setSolved([...solved, firstCardId, secondCardId]);
                setFlipped([]);
                setProcessing(false);
            } else {
                setTimeout(() => {
                    setFlipped([]);
                    setMistakes((prev) => prev + 1);
                    setProcessing(false);
                }, 1000);
            }
        }
    };

    const gameWonRef = useRef(false);

    useEffect(() => {
        if (solved.length === cards.length && cards.length > 0 && !gameWonRef.current) {
            gameWonRef.current = true;
            const finalPoints = mistakes <= 1 ? 100 : 50;
            setPointsEarned(finalPoints);
            setWon(true);
            setGameState('finished');
            confetti({ particleCount: 30, spread: 50, origin: { y: 0.6 }, colors: ['#06b6d4', '#d946ef', '#facc15'], scalar: 0.7 });
            onWinGame(finalPoints);
        }
    }, [solved, cards, mistakes, onWinGame]);

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-md p-6 relative">
            <div className="flex justify-between w-full mb-8 items-center px-2">
                <div>
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500 uppercase tracking-wider">Memoria Neural</h2>
                    <p className="text-cyan-500/60 text-xs font-bold uppercase tracking-widest mt-1">Nivel {level}: {LEVELS[level].name}</p>
                </div>
                <div className="flex bg-slate-900/80 border border-cyan-900/50 px-4 py-2 rounded-lg text-sm items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-cyan-500/50" />
                    <div><span className="block text-[10px] text-slate-500 font-bold uppercase">Fallos</span><span className="font-black text-xl text-white">{mistakes}</span></div>
                </div>
                {LEVELS[level].maxTime && (
                    <div className={`bg-slate-900/80 border ${gameTimeLeft <= 10 ? 'border-red-500/50 animate-pulse' : 'border-cyan-900/50'} px-4 py-2 rounded-lg text-sm flex items-center gap-3 ml-2`}>
                        <div className={`font-black text-xl ${gameTimeLeft <= 10 ? 'text-red-400' : 'text-white'}`}>{gameTimeLeft}s</div>
                    </div>
                )}
            </div>
            <div className={`relative w-full ${level === 1 ? 'aspect-[3/2]' : 'aspect-[3/4]'}`}>
                {gameState === 'ready' && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-xl border border-cyan-500/30">
                        <button
                            onClick={startGame}
                            className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xl rounded-full shadow-[0_0_20px_rgba(6,182,212,0.5)] active:scale-95 transition-all uppercase tracking-widest flex items-center gap-2"
                        >
                            <Brain className="w-6 h-6" /> Iniciar
                        </button>
                        <p className="mt-4 text-cyan-300/70 text-sm font-bold uppercase tracking-wider">Memoriza en 7 segundos</p>
                    </div>
                )}
                {gameState === 'memorizing' && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20">
                        <div className="bg-slate-900/90 border border-yellow-500/50 px-6 py-2 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                            <span className="text-yellow-400 font-black text-xl flex items-center gap-2">
                                <span className="animate-pulse">👁️</span> {timeLeft}s
                            </span>
                        </div>
                    </div>
                )}

                <div className={`grid gap-2 w-full h-full ${level === 1 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                    {cards.map((card) => (
                        <div key={card.uniqueId} onClick={() => handleCardClick(card.uniqueId, card.id)} className="aspect-square relative cursor-pointer group perspective-1000">
                            <motion.div
                                className="w-full h-full rounded-xl transition-all shadow-lg"
                                initial={false}
                                animate={{ rotateY: flipped.includes(card.uniqueId) || solved.includes(card.uniqueId) || gameState === 'memorizing' ? 180 : 0 }}
                                style={{ transformStyle: "preserve-3d" }}
                            >
                                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md rounded-xl border border-cyan-900/40 flex items-center justify-center backface-hidden shadow-[inset_0_0_20px_rgba(0,255,255,0.05)]">
                                    <Cpu className="w-8 h-8 text-cyan-900/40 group-hover:text-cyan-500/50 transition-colors" />
                                </div>
                                <div className={`absolute inset-0 flex items-center justify-center rounded-xl border backface-hidden transition-all ${solved.includes(card.uniqueId) ? "bg-emerald-900/40 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "bg-slate-800 border-cyan-400/30 shadow-[0_0_15px_rgba(0,255,255,0.1)]"}`} style={{ transform: 'rotateY(180deg)' }}>{card.icon}</div>
                            </motion.div>
                        </div>
                    ))}
                </div>
            </div>

            <AnimatePresence>
                {won && (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute z-50 p-6 rounded-[2rem] bg-slate-900/95 border border-white/10 text-center shadow-[0_0_50px_rgba(234,179,8,0.3)] max-w-xs flex flex-col items-center gap-4">
                        <h3 className="text-3xl font-black text-yellow-400 mb-0 leading-none">
                            {level < 6 ? "¡Nivel Completado!" : "¡Sistema Hackeado!"}
                        </h3>
                        <div className="text-4xl font-black text-white drop-shadow-md">+{pointsEarned} PTS</div>
                        <button
                            onClick={() => {
                                setWon(false);
                                setGameState('ready');
                                setSolved([]);
                                setMistakes(0);
                                setFlipped([]);
                                gameWonRef.current = false;

                                if (level < 6) {
                                    setLevel(prev => prev + 1);
                                } else {
                                    setLevel(1); // Reiniciar campaña
                                }
                            }}
                            className="mt-2 px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full text-white font-bold text-sm shadow-lg hover:shadow-cyan-500/25 active:scale-95 transition-all w-full"
                        >
                            {level < 6 ? "Siguiente Nivel" : "Reiniciar Sistema"}
                        </button>
                    </motion.div>
                )}
                {gameState === 'gameover' && (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute z-50 p-6 rounded-[2rem] bg-red-950/95 border border-red-500/30 text-center shadow-[0_0_50px_rgba(239,68,68,0.3)] max-w-xs flex flex-col items-center gap-4">
                        <AlertCircle className="w-16 h-16 text-red-500 mb-2 animate-bounce" />
                        <h3 className="text-2xl font-black text-red-400 mb-0 leading-none">¡TIEMPO AGOTADO!</h3>
                        <p className="text-red-200/70 text-sm font-bold uppercase">El sistema detectó la intrusión.</p>
                        <button
                            onClick={() => {
                                setGameState('ready');
                                setSolved([]);
                                setMistakes(0);
                                setFlipped([]);
                                setProcessing(false);
                            }}
                            className="mt-2 px-6 py-2 bg-gradient-to-r from-red-600 to-orange-600 rounded-full text-white font-bold text-sm shadow-lg hover:shadow-red-500/25 active:scale-95 transition-all w-full"
                        >
                            Reintentar Nivel
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
