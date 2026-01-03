"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
    Heart, Star, Zap, Smile, Sun, Music, Cpu, AlertCircle, Brain, Eye,
    Gem, Rocket, Atom, Ghost, Anchor, Shield, Tablet, Wifi, Check, Crown,
    MessageSquare, X, Send
} from "lucide-react";

export default function MemoryGame({ onWinGame }) {
    // --- ESTADOS DEL JUEGO ---
    const [progress, setProgress] = useState({});
    const [totalScore, setTotalScore] = useState(0);
    const [cards, setCards] = useState([]);
    const [flipped, setFlipped] = useState([]);
    const [solved, setSolved] = useState([]);
    const [mistakes, setMistakes] = useState(0);
    const [won, setWon] = useState(false);
    const [pointsEarned, setPointsEarned] = useState(0);
    const [processing, setProcessing] = useState(false);
    const [level, setLevel] = useState(1);
    const [playCount, setPlayCount] = useState(0);
    const [gameState, setGameState] = useState('ready');
    const [timeLeft, setTimeLeft] = useState(7);
    const [gameTimeLeft, setGameTimeLeft] = useState(0);

    // --- ESTADOS DEL FEEDBACK (Buzón de sugerencias) ---
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackType, setFeedbackType] = useState("sugerencia"); // sugerencia, error, otro
    const [feedbackText, setFeedbackText] = useState("");
    const [isSendingFeedback, setIsSendingFeedback] = useState(false);
    const [feedbackStatus, setFeedbackStatus] = useState(null); // success, error

    // --- CONFIGURACIÓN DE FORMSPREE (INTEGRADO) ---
    const FORMSPREE_ENDPOINT = "https://formspree.io/f/mzdzvnyw";

    const handleSendFeedback = async (e) => {
        e.preventDefault();
        if (!feedbackText.trim()) return;

        setIsSendingFeedback(true);

        try {
            const response = await fetch(FORMSPREE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: feedbackType,
                    message: feedbackText,
                    level_context: level,
                    score_context: totalScore,
                    loops_context: progress[level]?.loops || 0
                })
            });

            if (response.ok) {
                setFeedbackStatus('success');
                setFeedbackText("");
                setTimeout(() => {
                    setShowFeedback(false);
                    setFeedbackStatus(null);
                }, 2000);
            } else {
                setFeedbackStatus('error');
            }
        } catch (error) {
            setFeedbackStatus('error');
        } finally {
            setIsSendingFeedback(false);
        }
    };

    // Cargar datos al inicio
    useEffect(() => {
        const storedProgress = localStorage.getItem('arcade_memory_progress');
        if (storedProgress) {
            setProgress(JSON.parse(storedProgress));
        } else {
            const initialProgress = {};
            for (let i = 1; i <= 7; i++) initialProgress[i] = { wins: 0, loops: 0, unlocked: i === 1 };
            setProgress(initialProgress);
        }

        const storedScore = localStorage.getItem('arcade_memory_total_score');
        if (storedScore) setTotalScore(parseInt(storedScore));
    }, []);

    // Guardar progreso
    useEffect(() => {
        if (Object.keys(progress).length > 0) {
            localStorage.setItem('arcade_memory_progress', JSON.stringify(progress));
        }
    }, [progress]);

    // CONFIGURACIÓN DE NIVELES (1 al 7)
    const LEVELS = {
        1: { pairs: 3, cols: 3, basePoints: 100, bonus: 500, name: "Recluta", time: 7 },
        2: { pairs: 4, cols: 4, basePoints: 200, bonus: 750, name: "Aprendiz", time: 8 },
        3: { pairs: 5, cols: 4, basePoints: 300, bonus: 1000, name: "Agente", time: 10 },
        4: { pairs: 6, cols: 4, basePoints: 400, bonus: 1250, name: "Hacker", time: 12 },
        5: { pairs: 7, cols: 4, basePoints: 500, bonus: 1500, name: "Maestro", time: 15 },
        6: { pairs: 8, cols: 4, basePoints: 600, bonus: 1750, name: "Leyenda", time: 18 },
        7: { pairs: 9, cols: 5, basePoints: 700, bonus: 2000, name: "Omnisciente", time: 20 },
    };

    // Iconos
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
        { id: 15, icon: <Crown className="text-amber-400 w-8 h-8" /> },
        { id: 16, icon: <Cpu className="text-rose-400 w-8 h-8" /> },
        { id: 17, icon: <Brain className="text-purple-400 w-8 h-8" /> },
        { id: 18, icon: <Eye className="text-green-400 w-8 h-8" /> },
    ];

    useEffect(() => {
        if (!LEVELS[level]) return;
        const config = LEVELS[level];
        const selectedIcons = ALL_ICONS.slice(0, config.pairs);
        const shuffled = [...selectedIcons, ...selectedIcons]
            .sort(() => Math.random() - 0.5)
            .map((c) => ({ ...c, uniqueId: Math.random() }));
        setCards(shuffled);
    }, [level, playCount]);

    useEffect(() => {
        let timer;
        if (gameState === 'memorizing' && timeLeft > 0) {
            timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        } else if (gameState === 'memorizing' && timeLeft === 0) {
            setGameState('playing');
        }
        return () => clearTimeout(timer);
    }, [gameState, timeLeft]);

    const startGame = () => {
        setGameState('memorizing');
        setTimeLeft(LEVELS[level].time);
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
        if (cards.length > 0 && solved.length === cards.length && !gameWonRef.current) {
            gameWonRef.current = true;

            const currentLevelData = progress[level] || { wins: 0, loops: 0 };
            const isLooping = currentLevelData.loops > 0;
            const config = LEVELS[level];

            let calculatedPoints = 0;
            const stepPoints = isLooping ? Math.floor(config.basePoints * 0.5) : config.basePoints;
            calculatedPoints += stepPoints;

            if (currentLevelData.wins + 1 === 7) {
                const completionBonus = isLooping ? Math.floor(config.bonus * 0.5) : config.bonus;
                calculatedPoints += completionBonus;
            }

            const newTotalScore = totalScore + calculatedPoints;
            setTotalScore(newTotalScore);
            localStorage.setItem('arcade_memory_total_score', newTotalScore.toString());

            setPointsEarned(calculatedPoints);
            setWon(true);
            setGameState('finished');
            onWinGame(calculatedPoints);

            const isLevelComplete = (currentLevelData.wins + 1) === 7;
            if (isLevelComplete) {
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#FFD700', '#F472B6', '#22D3EE'], scalar: 1.2 });
            } else {
                confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 }, scalar: 0.8 });
            }
        }
    }, [solved, cards]);

    const handleKeepTraining = () => {
        setWon(false);
        setGameState('ready');
        setSolved([]);
        setMistakes(0);
        setFlipped([]);
        gameWonRef.current = false;

        const currentData = progress[level] || { wins: 0, loops: 0, unlocked: true };
        let newWins = currentData.wins + 1;
        let newLoops = currentData.loops;

        if (newWins >= 7) {
            newWins = 0;
            newLoops += 1;
        }

        const newProgress = {
            ...progress,
            [level]: { ...currentData, wins: newWins, loops: newLoops }
        };
        setProgress(newProgress);
        setPlayCount(prev => prev + 1);
    };

    const handleNextLevel = () => {
        setWon(false);
        setGameState('ready');
        setSolved([]);
        setMistakes(0);
        setFlipped([]);
        gameWonRef.current = false;

        const currentData = progress[level] || { wins: 0, loops: 0, unlocked: true };
        let newWins = currentData.wins + 1;
        let newLoops = currentData.loops;

        if (newWins >= 7) {
            newWins = 0;
            newLoops += 1;
        }

        const nextLevel = level + 1;
        const nextLevelData = progress[nextLevel] || { wins: 0, loops: 0, unlocked: false };

        const newProgress = {
            ...progress,
            [level]: { ...currentData, wins: newWins, loops: newLoops },
            [nextLevel]: { ...nextLevelData, unlocked: true }
        };

        setProgress(newProgress);

        if (level < 7) {
            setLevel(prev => prev + 1);
        } else {
            setLevel(1);
        }
    };

    const currentLevelInfo = progress[level] || { wins: 0, loops: 0 };
    const wins = currentLevelInfo.wins;
    const loops = currentLevelInfo.loops;

    const getGridClass = () => {
        const pairs = LEVELS[level].pairs;
        if (pairs <= 3) return "grid-cols-3";
        if (pairs <= 8) return "grid-cols-4";
        return "grid-cols-5";
    };

    return (
        <div className="flex flex-col items-center justify-center w-full max-w-md p-4 relative">

            {/* --- BOTÓN DE FEEDBACK (Top Right) --- */}
            <button
                onClick={() => setShowFeedback(true)}
                className="absolute -top-2 -right-2 z-40 w-10 h-10 bg-slate-800/80 border border-cyan-500/30 text-cyan-400 rounded-full flex items-center justify-center hover:bg-slate-700 hover:scale-105 transition-all shadow-lg"
                title="Enviar sugerencias o reportar errores"
            >
                <MessageSquare className="w-5 h-5" />
            </button>

            {/* Header Nivel */}
            <div className="flex flex-col w-full mb-6 items-center justify-center relative">

                {/* --- AQUI ESTÁ EL CAMBIO DE NOMBRE --- */}
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-500 uppercase tracking-wider">
                    MEMORIA NEURAL
                </h2>

                <div className="flex items-center gap-4 mt-2">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-cyan-500 blur-md opacity-20 group-hover:opacity-40 transition-opacity rounded-full"></div>
                        <div className="relative flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-900 border border-cyan-400/50">
                            <span className="text-cyan-500/70 text-[10px] font-black uppercase tracking-wider">
                                NIVEL {level}
                            </span>
                            <div className="w-px h-3 bg-cyan-500/30"></div>
                            <span className="text-cyan-300 text-xs font-black uppercase tracking-wider">
                                {LEVELS[level].name}
                            </span>
                        </div>
                    </div>

                    {loops > 0 && (
                        <div className="flex flex-col items-center animate-fade-in-left">
                            <span className="text-[8px] text-yellow-500/70 font-black uppercase tracking-wider leading-none mb-0.5">Rango</span>
                            <div className="flex items-center gap-1 bg-yellow-900/20 px-2 py-0.5 rounded-lg border border-yellow-500/30">
                                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                <span className="text-yellow-400 font-bold text-sm leading-none">{loops}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1 mt-4 animate-fade-in-up">
                    {[...Array(7)].map((_, i) => {
                        const step = i + 1;
                        const isCompleted = step <= wins;
                        const isCurrent = step === wins + 1;

                        return (
                            <div key={i} className="flex items-center">
                                <div className={`
                                    w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border transition-all
                                    ${isCompleted
                                        ? "bg-cyan-500 border-cyan-500 text-slate-950"
                                        : isCurrent
                                            ? "bg-slate-900 border-cyan-400 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] scale-110"
                                            : "bg-slate-900/50 border-cyan-900/30 text-slate-600"
                                    }
                                `}>
                                    {isCompleted ? <Check className="w-2.5 h-2.5 stroke-[4]" /> : step}
                                </div>
                                {step < 7 && (
                                    <div className={`w-2 h-0.5 ${step < wins + 1 ? "bg-cyan-500" : "bg-slate-800"}`}></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Área de Juego */}
            <div className={`relative w-full ${level === 1 ? 'aspect-[3/2]' : 'aspect-[4/5]'} transition-all duration-500`}>

                {gameState === 'ready' && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm rounded-xl border border-cyan-500/30">
                        <button
                            onClick={startGame}
                            className="px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xl rounded-full shadow-[0_0_20px_rgba(6,182,212,0.5)] active:scale-95 transition-all uppercase tracking-widest flex items-center gap-2"
                        >
                            <Brain className="w-6 h-6" /> Iniciar
                        </button>
                        <p className="mt-4 text-cyan-300/70 text-xs font-bold uppercase tracking-wider">
                            {wins === 0 && loops === 0 ? "Primera Misión" : `Ronda ${wins + 1}/7`}
                        </p>
                    </div>
                )}

                {gameState === 'memorizing' && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-20">
                        <div className="bg-slate-900/90 border border-yellow-500/50 px-4 py-1 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                            <span className="text-yellow-400 font-black text-lg flex items-center gap-2">
                                <span className="animate-pulse">👁️</span> {timeLeft}s
                            </span>
                        </div>
                    </div>
                )}

                <div className={`grid gap-2 w-full h-full ${getGridClass()}`}>
                    {cards.map((card) => (
                        <div key={card.uniqueId} onClick={() => handleCardClick(card.uniqueId, card.id)} className="relative cursor-pointer group perspective-1000">
                            <motion.div
                                className="w-full h-full rounded-lg transition-all shadow-lg"
                                initial={false}
                                animate={{ rotateY: flipped.includes(card.uniqueId) || solved.includes(card.uniqueId) || gameState === 'memorizing' ? 180 : 0 }}
                                style={{ transformStyle: "preserve-3d" }}
                            >
                                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md rounded-lg border border-cyan-900/40 flex items-center justify-center backface-hidden shadow-[inset_0_0_20px_rgba(0,255,255,0.05)]">
                                    <Cpu className="w-6 h-6 text-cyan-900/40 group-hover:text-cyan-500/50 transition-colors" />
                                </div>
                                <div className={`absolute inset-0 flex items-center justify-center rounded-lg border backface-hidden transition-all ${solved.includes(card.uniqueId) ? "bg-emerald-900/40 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "bg-slate-800 border-cyan-400/30 shadow-[0_0_15px_rgba(0,255,255,0.1)]"}`} style={{ transform: 'rotateY(180deg)' }}>
                                    <div className={`${cards.length > 12 ? 'scale-75' : 'scale-100'}`}>
                                        {card.icon}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-full mt-4 flex items-center justify-between px-4">
                <div className="bg-slate-900/80 border border-cyan-500/30 px-4 py-1 rounded-lg text-sm flex flex-col items-center shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                    <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-wider">Total</span>
                    <span className="font-black text-lg text-white leading-none">{totalScore}</span>
                </div>

                <div className="bg-slate-900/50 border border-slate-800/50 px-4 py-1 rounded-full flex items-center gap-2">
                    <AlertCircle className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Fallos:</span>
                    <span className={`font-bold text-sm ${mistakes > 0 ? "text-slate-300" : "text-slate-700"}`}>{mistakes}</span>
                </div>
            </div>

            <AnimatePresence>
                {/* --- MODAL DE FEEDBACK --- */}
                {showFeedback && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-sm bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl relative">
                            <button onClick={() => setShowFeedback(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>

                            <h3 className="text-xl font-black text-white mb-4 flex items-center gap-2">
                                <MessageSquare className="text-cyan-400" /> Comentarios
                            </h3>

                            {feedbackStatus === 'success' ? (
                                <div className="text-center py-8">
                                    <Check className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                                    <p className="text-white font-bold">¡Mensaje Enviado!</p>
                                    <p className="text-slate-400 text-sm">Gracias por tu aporte.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSendFeedback} className="flex flex-col gap-4">
                                    <div>
                                        <label className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-1 block">Tipo de Mensaje</label>
                                        <select
                                            value={feedbackType}
                                            onChange={(e) => setFeedbackType(e.target.value)}
                                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-cyan-500 outline-none"
                                        >
                                            <option value="sugerencia">💡 Sugerencia</option>
                                            <option value="error">🪲 Reportar Error (Bug)</option>
                                            <option value="otro">💬 Otro Comentario</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-cyan-400 font-bold uppercase tracking-wider mb-1 block">Tu Mensaje</label>
                                        <textarea
                                            value={feedbackText}
                                            onChange={(e) => setFeedbackText(e.target.value)}
                                            placeholder="Escribe aquí tus ideas, errores encontrados o comentarios para mejorar el juego..."
                                            className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm resize-none focus:border-cyan-500 outline-none"
                                            required
                                        ></textarea>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSendingFeedback}
                                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSendingFeedback ? 'Enviando...' : <><Send className="w-4 h-4" /> Enviar a Desarrollador</>}
                                    </button>
                                    {feedbackStatus === 'error' && (
                                        <p className="text-red-400 text-xs text-center mt-2">Error al enviar. Inténtalo de nuevo.</p>
                                    )}
                                    <p className="text-[10px] text-slate-500 text-center">
                                        Los mensajes se enviarán directamente a eisnerkb@gmail.com
                                    </p>
                                </form>
                            )}
                        </motion.div>
                    </motion.div>
                )}

                {/* --- MODAL VICTORIA --- */}
                {won && (
                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 z-50 flex items-center justify-center p-4">
                        <div className="bg-slate-900/95 border border-cyan-500/50 p-6 rounded-3xl text-center shadow-[0_0_50px_rgba(6,182,212,0.4)] max-w-sm w-full backdrop-blur-xl">
                            <h3 className="text-2xl font-black text-white mb-1 uppercase italic">
                                {(wins + 1) === 7 ? "¡Misión Cumplida!" : "¡Bien Hecho!"}
                            </h3>
                            <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-4">
                                {loops > 0 ? "Modo Prestigio (50%)" : "Primera Vuelta (100%)"}
                            </p>

                            <div className="bg-gradient-to-b from-slate-800 to-slate-900 p-4 rounded-2xl border border-white/10 mb-6">
                                <div className="text-4xl font-black text-yellow-400 drop-shadow-md">+{pointsEarned}</div>
                                <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Puntos Obtenidos</div>
                            </div>

                            <div className="flex flex-col gap-3 w-full">
                                {(loops > 0 || (wins + 1) === 7) && level < 7 && (
                                    <button
                                        onClick={handleNextLevel}
                                        className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl text-white font-black text-sm shadow-lg hover:shadow-orange-500/40 active:scale-95 transition-all w-full flex items-center justify-center gap-2 animate-pulse"
                                    >
                                        <Rocket className="w-5 h-5" />
                                        AVANZAR AL NIVEL {level + 1}
                                    </button>
                                )}

                                <button
                                    onClick={handleKeepTraining}
                                    className={`px-6 py-3 rounded-xl font-bold text-sm active:scale-95 transition-all w-full border
                                        ${(loops > 0 || (wins + 1) === 7)
                                            ? "bg-slate-800 border-cyan-500/30 text-cyan-400 hover:bg-slate-700"
                                            : "bg-gradient-to-r from-cyan-600 to-blue-600 border-transparent text-white shadow-lg hover:shadow-cyan-500/30"
                                        }`}
                                >
                                    {(wins + 1) === 7
                                        ? "Reiniciar Barra (Prestigio)"
                                        : `Siguiente Ronda (${wins + 1}/7)`
                                    }
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}