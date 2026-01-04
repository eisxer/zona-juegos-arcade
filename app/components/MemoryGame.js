"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import {
    Heart, Star, Zap, Smile, Sun, Music, Cpu, Brain, Eye,
    Gem, Rocket, Atom, Ghost, Anchor, Shield, Tablet, Wifi, Check, Crown,
    MessageSquare, X, Send, HelpCircle, Lock, Trophy
} from "lucide-react";
// IMPORTAMOS EL HOOK CENTRAL DE PROGRESO
import useGameProgress from "../hooks/useGameProgress";

export default function MemoryGame({ onWinGame }) {
    // --- INTEGRACIÓN CON EL HOOK GLOBAL ---
    const { profile, addGlobalXP, saveGameProgress, getGameData } = useGameProgress();

    // Recuperamos los datos específicos de este juego ('memory')
    const memoryData = getGameData('memory');
    // Si es la primera vez, inicializamos el nivel 1 como desbloqueado
    const progress = memoryData.levels || { 1: { unlocked: true, wins: 0, loops: 0 } };

    // --- ESTADOS LOCALES DEL JUEGO ---
    const [totalScore, setTotalScore] = useState(0); // Puntos de la sesión actual
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

    // --- ESTADOS DE LA INTERFAZ (UI) ---
    const [showTutorial, setShowTutorial] = useState(false);
    const [tutorialStep, setTutorialStep] = useState(0);
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackType, setFeedbackType] = useState("sugerencia");
    const [feedbackText, setFeedbackText] = useState("");
    const [isSendingFeedback, setIsSendingFeedback] = useState(false);
    const [feedbackStatus, setFeedbackStatus] = useState(null);

    const FORMSPREE_ENDPOINT = "https://formspree.io/f/mzdzvnyw";

    // --- DATOS DEL TUTORIAL ---
    const TUTORIAL_STEPS = [
        { icon: <Brain className="w-12 h-12 text-cyan-400" />, title: "Objetivo", desc: "Sincroniza tu memoria neural encontrando todos los pares de iconos idénticos." },
        { icon: <Eye className="w-12 h-12 text-yellow-400" />, title: "Fase de Escaneo", desc: "Tendrás unos segundos iniciales para memorizar la red antes de que se oculte." },
        { icon: <Rocket className="w-12 h-12 text-orange-400" />, title: "Progresión", desc: "Supera los 7 niveles de dificultad. Completa la barra de cada nivel para ganar bonificaciones." },
        { icon: <Trophy className="w-12 h-12 text-purple-400" />, title: "XP Global", desc: "Cada punto que ganas aquí se suma a tu Nivel de Agente en toda la plataforma." }
    ];

    // --- EFECTOS DE INICIO ---
    useEffect(() => {
        // Mostrar tutorial si es la primera vez
        try {
            if (!localStorage.getItem('arcade_memory_tutorial_seen')) setShowTutorial(true);
        } catch { setShowTutorial(true); }

        // Restaurar el último nivel jugado si existe
        if (memoryData.currentLevel) setLevel(memoryData.currentLevel);
    }, [memoryData.currentLevel]);

    // --- CONFIGURACIÓN DE NIVELES ---
    const LEVELS = {
        1: { pairs: 3, cols: 3, basePoints: 100, bonus: 500, name: "Recluta", time: 7 },
        2: { pairs: 4, cols: 4, basePoints: 200, bonus: 750, name: "Aprendiz", time: 8 },
        3: { pairs: 5, cols: 4, basePoints: 300, bonus: 1000, name: "Agente", time: 10 },
        4: { pairs: 6, cols: 4, basePoints: 400, bonus: 1250, name: "Hacker", time: 12 },
        5: { pairs: 7, cols: 4, basePoints: 500, bonus: 1500, name: "Maestro", time: 15 },
        6: { pairs: 8, cols: 4, basePoints: 600, bonus: 1750, name: "Leyenda", time: 18 },
        7: { pairs: 9, cols: 5, basePoints: 700, bonus: 2000, name: "Omnisciente", time: 20 },
    };

    // --- ICONOS DEL JUEGO ---
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

    // --- PREPARACIÓN DEL TABLERO ---
    useEffect(() => {
        if (!LEVELS[level]) return;
        const config = LEVELS[level];
        const selectedIcons = ALL_ICONS.slice(0, config.pairs);
        // Duplicamos y barajamos las cartas
        const shuffled = [...selectedIcons, ...selectedIcons]
            .sort(() => Math.random() - 0.5)
            .map((c) => ({ ...c, uniqueId: Math.random() }));
        setCards(shuffled);
    }, [level, playCount]);

    // --- TEMPORIZADOR DE MEMORIZACIÓN ---
    useEffect(() => {
        let timer;
        if (gameState === 'memorizing' && timeLeft > 0) {
            timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        } else if (gameState === 'memorizing' && timeLeft === 0) {
            setGameState('playing');
        }
        return () => clearTimeout(timer);
    }, [gameState, timeLeft]);

    // --- FUNCIONES DE CONTROL DEL JUEGO ---
    const startGame = () => {
        setGameState('memorizing');
        setTimeLeft(LEVELS[level].time);
    };

    const handleCardClick = (uniqueId, id) => {
        // Validaciones para ignorar clics inválidos
        if (gameState !== 'playing' || processing || won || flipped.includes(uniqueId) || solved.includes(uniqueId)) return;

        const newFlipped = [...flipped, uniqueId];
        setFlipped(newFlipped);

        if (newFlipped.length === 2) {
            setProcessing(true);
            const [firstCardId, secondCardId] = newFlipped;
            const firstCard = cards.find((c) => c.uniqueId === firstCardId);
            const secondCard = cards.find((c) => c.uniqueId === secondCardId);

            if (firstCard.id === secondCard.id) {
                // ¡Pareja encontrada!
                setSolved([...solved, firstCardId, secondCardId]);
                setFlipped([]);
                setProcessing(false);
            } else {
                // Fallo: voltear de nuevo después de un segundo
                setTimeout(() => {
                    setFlipped([]);
                    setMistakes((prev) => prev + 1);
                    setProcessing(false);
                }, 1000);
            }
        }
    };

    // --- LÓGICA DE VICTORIA ---
    const gameWonRef = useRef(false);
    useEffect(() => {
        if (cards.length > 0 && solved.length === cards.length && !gameWonRef.current) {
            gameWonRef.current = true;

            // 1. CÁLCULO DE PUNTOS (Según reglas del juego)
            const currentLevelData = progress[level] || { wins: 0, loops: 0 };
            const isLooping = currentLevelData.loops > 0; // ¿Está en modo prestigio?
            const config = LEVELS[level];

            // Puntos base (50% si es prestigio)
            let pts = isLooping ? Math.floor(config.basePoints * 0.5) : config.basePoints;

            // Bonus por completar la barra (victoria 7)
            if (currentLevelData.wins + 1 === 7) {
                pts += isLooping ? Math.floor(config.bonus * 0.5) : config.bonus;
            }

            // 2. ACTUALIZAR ESTADO LOCAL
            setTotalScore(prev => prev + pts);
            setPointsEarned(pts);
            setWon(true);
            setGameState('finished');
            if (onWinGame) onWinGame(pts);

            // 3. PERSISTENCIA GLOBAL (Suma al XP del perfil)
            addGlobalXP(pts);

            // Efectos visuales (Confeti)
            const isLevelComplete = (currentLevelData.wins + 1) === 7;
            if (isLevelComplete) {
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#FFD700', '#F472B6', '#22D3EE'], scalar: 1.2 });
            } else {
                confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 }, scalar: 0.8 });
            }
        }
    }, [solved, cards]);

    // Función auxiliar para guardar el progreso del nivel en el hook
    const updateProgress = (newLevelData, nextLevelToUnlock = null) => {
        const newProgress = {
            ...progress,
            [level]: newLevelData,
            // Si hay un siguiente nivel, lo desbloqueamos
            ...(nextLevelToUnlock ? { [nextLevelToUnlock]: { ...(progress[nextLevelToUnlock] || { wins: 0, loops: 0 }), unlocked: true } } : {})
        };
        // Guardamos todo el objeto de niveles y el nivel actual
        saveGameProgress('memory', { levels: newProgress, currentLevel: nextLevelToUnlock || level });
    };

    // Botón "Siguiente Ronda" / "Reiniciar Barra"
    const handleKeepTraining = () => {
        resetGameState();
        const current = progress[level] || { wins: 0, loops: 0, unlocked: true };
        let w = current.wins + 1, l = current.loops;
        // Si completa las 7 victorias, reinicia wins y aumenta el loop (prestigio)
        if (w >= 7) { w = 0; l++; }
        updateProgress({ ...current, wins: w, loops: l });
    };

    // Botón "Siguiente Nivel"
    const handleNextLevel = () => {
        resetGameState();
        const current = progress[level] || { wins: 0, loops: 0, unlocked: true };
        let w = current.wins + 1, l = current.loops;
        if (w >= 7) { w = 0; l++; }

        const nextLvl = level + 1;
        if (level < 7) {
            // Avanzar al siguiente nivel
            updateProgress({ ...current, wins: w, loops: l }, nextLvl);
            setLevel(prev => prev + 1);
        } else {
            // Si era el último nivel, volver al 1 (o manejar fin del juego)
            updateProgress({ ...current, wins: w, loops: l });
            setLevel(1);
        }
    };

    // Selector manual de nivel
    const selectLevel = (lvl) => {
        // Solo permite seleccionar si está desbloqueado o es el nivel 1
        const isUnlocked = progress[lvl]?.unlocked || lvl === 1;
        if (isUnlocked) {
            setLevel(lvl);
            setPlayCount(p => p + 1); // Fuerza reinicio del tablero
            saveGameProgress('memory', { currentLevel: lvl });
        }
    };

    // Función auxiliar para reiniciar estados de la partida
    const resetGameState = () => {
        setWon(false);
        setGameState('ready');
        setSolved([]);
        setMistakes(0);
        setFlipped([]);
        gameWonRef.current = false;
        setPlayCount(p => p + 1);
    };

    // --- GESTIÓN DE FEEDBACK (Formspree) ---
    const handleSendFeedback = async (e) => {
        e.preventDefault(); if (!feedbackText.trim()) return;
        setIsSendingFeedback(true);
        try {
            const res = await fetch(FORMSPREE_ENDPOINT, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                // Enviamos datos de contexto útiles para depurar
                body: JSON.stringify({ type: feedbackType, message: feedbackText, level, score: totalScore, globalXP: profile.globalXP })
            });
            if (res.ok) {
                setFeedbackStatus('success'); setFeedbackText("");
                setTimeout(() => { setShowFeedback(false); setFeedbackStatus(null); }, 2000);
            } else { setFeedbackStatus('error'); }
        } catch { setFeedbackStatus('error'); } finally { setIsSendingFeedback(false); }
    };

    // --- CLASES DINÁMICAS ---
    const currentWins = progress[level]?.wins || 0;
    const currentLoops = progress[level]?.loops || 0;
    const getGridClass = () => {
        const pairs = LEVELS[level].pairs;
        if (pairs <= 3) return "grid-cols-3";
        if (pairs <= 8) return "grid-cols-4";
        return "grid-cols-5";
    };

    return (
        <div className="flex flex-col items-center w-full max-w-md mx-auto min-h-[600px] p-4 relative">

            {/* --- NUEVO: TÍTULO PRINCIPAL DEL JUEGO --- */}
            <div className="w-full text-center mb-4 relative z-30 animate-fade-in-down">
                <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 uppercase tracking-widest drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                    MEMORIA NEURAL
                </h1>
            </div>

            {/* --- BARRA SUPERIOR GLOBAL (HUD - Nivel y XP) --- */}
            {/* Esta es la ubicación ideal para los puntos globales: visible y no intrusiva */}
            <div className="w-full flex items-center justify-between mb-6 z-30 px-2">
                <div className="flex items-center gap-3 bg-slate-900/60 backdrop-blur-md p-2 rounded-2xl border border-slate-800/50 shadow-lg">
                    {/* Avatar con Nivel Global */}
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center shadow-inner">
                            <span className="text-sm font-black text-white">{profile.globalLevel}</span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-cyan-600 text-[7px] font-bold text-white px-1.5 py-0.5 rounded-full border border-slate-900 tracking-wider">
                            LVL
                        </div>
                    </div>

                    {/* XP Global Total */}
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-cyan-500/70 leading-none tracking-widest uppercase mb-0.5">AGENTE</span>
                        <div className="flex items-center gap-1">
                            <span className="text-sm font-black text-white leading-none tracking-wide tabular-nums">
                                {profile.globalXP.toLocaleString()}
                            </span>
                            <span className="text-[8px] text-slate-500 font-bold">XP</span>
                        </div>
                    </div>
                </div>

                {/* Botones de Acción (Ayuda y Feedback) */}
                <div className="flex items-center gap-2">
                    <button onClick={() => { setTutorialStep(0); setShowTutorial(true); }} className="w-9 h-9 rounded-full bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-yellow-400 hover:border-yellow-500/50 transition-all flex items-center justify-center shadow-sm active:scale-95">
                        <HelpCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => setShowFeedback(true)} className="w-9 h-9 rounded-full bg-slate-800/50 border border-slate-700 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 transition-all flex items-center justify-center shadow-sm active:scale-95">
                        <MessageSquare className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* --- BARRA DE INFORMACIÓN DEL NIVEL ACTUAL --- */}
            <div className="w-full bg-slate-900/40 border border-white/5 rounded-2xl p-3 mb-4 backdrop-blur-sm shadow-md">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-cyan-950 border border-cyan-500/30 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                            MISIÓN {level}
                        </span>
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">{LEVELS[level].name}</span>
                    </div>
                    {currentLoops > 0 && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-yellow-950/30 border border-yellow-500/20 animate-pulse">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-[10px] font-bold text-yellow-500 tracking-wider">Rango {currentLoops}</span>
                        </div>
                    )}
                </div>
                {/* Barra de Progreso de Victorias (7 pasos) */}
                <div className="flex justify-between items-center gap-1.5 p-0.5 bg-slate-950/30 rounded-full">
                    {[...Array(7)].map((_, i) => {
                        const active = i < currentWins;
                        const current = i === currentWins;
                        return (
                            <div key={i} className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden relative border border-slate-700/50">
                                {active && <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.6)]"></div>}
                                {current && <div className="absolute inset-0 bg-slate-600/50 animate-pulse"></div>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* --- ÁREA PRINCIPAL DE JUEGO --- */}
            <div className={`relative w-full ${level === 1 ? 'aspect-[3/2]' : 'aspect-[4/5]'} transition-all duration-500 mb-4`}>

                {/* --- PANTALLA DE INICIO (Selector de Nivel) --- */}
                <AnimatePresence>
                    {gameState === 'ready' && (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md rounded-2xl border border-cyan-500/10 p-6 shadow-2xl">

                            <div className="text-center mb-8">
                                <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-[0.3em] block mb-2 opacity-80">CONFIGURAR SIMULACIÓN</span>
                                <h2 className="text-xl font-black text-white uppercase tracking-wider">SELECCIONAR NIVEL</h2>
                            </div>

                            {/* Selector Horizontal de Niveles */}
                            <div className="flex items-center justify-center gap-2 mb-10 w-full flex-wrap max-w-[300px] p-3 bg-slate-900/50 rounded-xl border border-slate-800">
                                {[1, 2, 3, 4, 5, 6, 7].map((lvl) => {
                                    const isUnlocked = progress[lvl]?.unlocked || lvl === 1;
                                    const isCurrent = level === lvl;
                                    return (
                                        <button
                                            key={lvl}
                                            onClick={() => selectLevel(lvl)}
                                            disabled={!isUnlocked}
                                            className={`
                                                w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black transition-all border relative
                                                ${isCurrent
                                                    ? "bg-cyan-500 border-cyan-400 text-slate-950 scale-110 shadow-[0_0_15px_rgba(6,182,212,0.5)] z-10"
                                                    : isUnlocked
                                                        ? "bg-slate-800 border-slate-700 text-slate-300 hover:border-cyan-500/50 hover:text-white hover:scale-105"
                                                        : "bg-slate-900/50 border-slate-800 text-slate-700 cursor-not-allowed opacity-50"
                                                }
                                            `}
                                        >
                                            {isUnlocked ? lvl : <Lock className="w-3.5 h-3.5 opacity-70" />}
                                            {isCurrent && <div className="absolute inset-0 bg-white/20 animate-pulse rounded-lg"></div>}
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Botón Principal de Iniciar */}
                            <button onClick={startGame} className="group relative px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black text-xl rounded-full shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-105 active:scale-95 transition-all overflow-hidden w-full max-w-[220px] tracking-widest border border-cyan-400/50">
                                <div className="absolute inset-0 bg-white/30 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                <span className="relative flex items-center justify-center gap-3"><Brain className="w-6 h-6" /> INICIAR</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* --- TEMPORIZADOR DE MEMORIZACIÓN --- */}
                <AnimatePresence>
                    {gameState === 'memorizing' && (
                        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="absolute -top-14 left-0 right-0 flex justify-center z-20 pointer-events-none">
                            <div className="px-5 py-1.5 rounded-full bg-slate-900/90 border border-yellow-500/40 text-yellow-400 font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.2)] backdrop-blur-sm">
                                <Eye className="w-4 h-4 animate-pulse" />
                                <span className="tracking-wide">Memoriza: <span className="font-black text-lg">{timeLeft}</span>s</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* --- GRID DE CARTAS --- */}
                <div className={`grid gap-2 w-full h-full ${getGridClass()} p-1`}>
                    {cards.map((card) => (
                        <div key={card.uniqueId} onClick={() => handleCardClick(card.uniqueId, card.id)} className="relative cursor-pointer group perspective-1000">
                            <motion.div className="w-full h-full rounded-xl transition-all shadow-sm hover:shadow-md" initial={false} animate={{ rotateY: flipped.includes(card.uniqueId) || solved.includes(card.uniqueId) || gameState === 'memorizing' ? 180 : 0 }} style={{ transformStyle: "preserve-3d" }}>
                                {/* Dorso de la carta */}
                                <div className="absolute inset-0 bg-slate-800/90 rounded-xl border border-white/10 flex items-center justify-center backface-hidden shadow-inner">
                                    <Cpu className="w-6 h-6 text-slate-600 group-hover:text-cyan-500/60 transition-colors duration-300" strokeWidth={1.5} />
                                </div>
                                {/* Cara de la carta (Icono) */}
                                <div className={`absolute inset-0 flex items-center justify-center rounded-xl border backface-hidden transition-all duration-300 ${solved.includes(card.uniqueId) ? "bg-emerald-500/10 border-emerald-500/40 shadow-[inset_0_0_10px_rgba(16,185,129,0.2)]" : "bg-slate-800/95 border-cyan-400/30 shadow-[0_0_10px_rgba(6,182,212,0.1)]"}`} style={{ transform: 'rotateY(180deg)' }}>
                                    <div className={`${cards.length > 12 ? 'scale-75' : 'scale-90'} filter drop-shadow-md`}>{card.icon}</div>
                                </div>
                            </motion.div>
                        </div>
                    ))}
                </div>
            </div>

            {/* --- FOOTER: ESTADÍSTICAS DE LA SESIÓN --- */}
            <div className="w-full grid grid-cols-2 gap-3">
                <div className="bg-slate-900/40 border border-slate-800/60 p-3 rounded-2xl flex flex-col items-center justify-center backdrop-blur-sm">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Puntos Sesión</span>
                    <span className="text-xl font-black text-white tabular-nums tracking-tight">{totalScore}</span>
                </div>
                <div className="bg-slate-900/40 border border-slate-800/60 p-3 rounded-2xl flex flex-col items-center justify-center backdrop-blur-sm">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Fallos</span>
                    <span className={`text-xl font-black tabular-nums tracking-tight ${mistakes > 0 ? "text-red-400/90" : "text-slate-400"}`}>{mistakes}</span>
                </div>
            </div>

            {/* --- MODALES (Overlay) --- */}
            <AnimatePresence>
                {/* Modal de Feedback */}
                {showFeedback && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl p-6 relative shadow-2xl">
                            <button onClick={() => setShowFeedback(false)} className="absolute top-4 right-4 p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"><X className="w-5 h-5" /></button>
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-cyan-400" /> Enviar Comentarios</h3>
                            {feedbackStatus === 'success' ? (
                                <div className="text-center py-8 flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 border border-emerald-500/30">
                                        <Check className="w-8 h-8 text-emerald-400" />
                                    </div>
                                    <p className="text-white font-bold text-lg mb-1">¡Mensaje Enviado!</p>
                                    <p className="text-slate-400 text-sm">Gracias por tu feedback.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSendFeedback} className="flex flex-col gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo</label>
                                        <select value={feedbackType} onChange={e => setFeedbackType(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-cyan-500 outline-none transition-colors appearance-none"><option value="sugerencia">💡 Sugerencia</option><option value="error">🪲 Reportar Error</option></select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mensaje</label>
                                        <textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Escribe aquí tus comentarios..." className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white h-28 resize-none focus:border-cyan-500 outline-none transition-colors" required></textarea>
                                    </div>
                                    <button type="submit" disabled={isSendingFeedback} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                                        {isSendingFeedback ? 'Enviando...' : <><Send className="w-4 h-4" /> Enviar</>}
                                    </button>
                                </form>
                            )}
                        </motion.div>
                    </motion.div>
                )}

                {/* Modal de Tutorial */}
                {showTutorial && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} className="w-full max-w-sm bg-slate-900 border border-cyan-500/30 rounded-3xl p-8 relative text-center shadow-[0_0_40px_rgba(6,182,212,0.15)]">
                            <div className="mb-6 flex justify-center">
                                <div className="p-5 bg-slate-800 rounded-2xl border border-cyan-500/20 shadow-inner relative overflow-hidden">
                                    <div className="absolute inset-0 bg-cyan-500/10 blur-xl rounded-full scale-150 animate-pulse-slow"></div>
                                    <div className="relative z-10">{TUTORIAL_STEPS[tutorialStep].icon}</div>
                                </div>
                            </div>
                            <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-wide">{TUTORIAL_STEPS[tutorialStep].title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed mb-10 px-2">{TUTORIAL_STEPS[tutorialStep].desc}</p>
                            <div className="flex items-center justify-between bg-slate-950/50 p-2 rounded-full border border-slate-800">
                                <button onClick={() => { localStorage.setItem('arcade_memory_tutorial_seen', 'true'); setShowTutorial(false); }} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-white uppercase tracking-wider transition-colors">Saltar</button>
                                <div className="flex gap-1.5 items-center">{TUTORIAL_STEPS.map((_, i) => <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === tutorialStep ? "bg-cyan-400 w-6" : "bg-slate-700 w-1.5"}`} />)}</div>
                                <button onClick={() => { if (tutorialStep < TUTORIAL_STEPS.length - 1) setTutorialStep(p => p + 1); else { localStorage.setItem('arcade_memory_tutorial_seen', 'true'); setShowTutorial(false); } }} className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold rounded-full text-sm transition-all shadow-md flex items-center gap-1">
                                    {tutorialStep === TUTORIAL_STEPS.length - 1 ? "Empezar" : "Siguiente"} <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* Modal de Victoria */}
                {won && (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                        <div className="w-full bg-slate-900 border border-cyan-500/50 p-8 rounded-3xl text-center shadow-[0_0_50px_rgba(6,182,212,0.25)] max-w-xs relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-radial from-cyan-500/10 to-transparent opacity-50 pointer-events-none"></div>
                            <h3 className="text-2xl font-black text-white mb-2 italic uppercase tracking-wider relative z-10">
                                {(currentWins + 1) === 7 ? "¡MISIÓN CUMPLIDA!" : "¡SISTEMA HACKEADO!"}
                            </h3>
                            <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-6 relative z-10 opacity-80">
                                {currentLoops > 0 ? "Modo Prestigio (50%)" : "Primera Vuelta (100%)"}
                            </p>

                            <div className="my-6 py-5 bg-slate-800/80 rounded-2xl border border-cyan-500/20 relative z-10 shadow-inner">
                                <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-500 block drop-shadow-sm">+{pointsEarned}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 block">XP Global Obtenida</span>
                            </div>

                            <div className="space-y-3 relative z-10">
                                {(currentLoops > 0 || (currentWins + 1) === 7) && level < 7 && (
                                    <button onClick={handleNextLevel} className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl text-white font-bold text-sm shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform animate-pulse-slow border border-orange-400/50">
                                        <Rocket className="w-4 h-4" /> AVANZAR AL NIVEL {level + 1}
                                    </button>
                                )}
                                <button onClick={handleKeepTraining} className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 hover:border-cyan-400/60">
                                    {(currentWins + 1) === 7 ? <><Crown className="w-4 h-4" /> Reiniciar (Prestigio)</> : "Siguiente Ronda"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}