"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Zap, Heart, Clock, Trophy, ScanLine, HeartCrack } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

// --- CONSTANTS & CONFIG ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const SPAWN_RATE = 1000;
const TARGET_LIFETIME = 3000;
const SHAPES = ["circle", "square", "triangle", "hexagon"];
const COLORS = [
    { name: "blue", hex: "#00f0ff", glow: "rgba(0, 240, 255, 0.6)" },
    { name: "red", hex: "#ff2a6d", glow: "rgba(255, 42, 109, 0.6)" },
    { name: "green", hex: "#05ffa1", glow: "rgba(5, 255, 161, 0.6)" },
    { name: "purple", hex: "#b967ff", glow: "rgba(185, 103, 255, 0.6)" }
];

// Difficulty Level Map
// Labels are now retrieved from translations via key (index + 1)
const LEVEL_MAP = {
    1: {
        isMultiPhase: true,
        phases: [
            { id: "1.1", duration: 15, forceShape: "circle", forceColor: null, speedMult: 1 }, // Phase 1
            { id: "1.2", duration: 15, forceShape: null, forceColor: "red", speedMult: 1 },    // Phase 2
            { id: "1.3", duration: 15, forceShape: "circle", forceColor: null, speedMult: 2 }, // Phase 3
            { id: "1.4", duration: 15, forceShape: null, forceColor: null, speedMult: 1.2 }   // Phase 4
        ]
    },
    2: { type: "intersection", movement: false, complexity: 2, trapChance: 0.3 },
    3: { type: "negative_logic", movement: false, complexity: 3, trapChance: 0.6 },
    4: { type: "simple", movement: "linear", complexity: 4, trapChance: 0.4 },
    5: { type: "dual", movement: "bouncing", complexity: 5, trapChance: 0.7 }
};

export default function NeuralFlashGame({ onWinGame }) {
    const { t } = useLanguage();
    const canvasRef = useRef(null);
    const requestRef = useRef();

    // Game State
    // States: IDLE, COUNTDOWN, PLAYING, PAUSED, PHASE_TRANSITION, GAME_OVER
    const [gameState, setGameState] = useState("IDLE");
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [timeLeft, setTimeLeft] = useState(60);
    const [instruction, setInstruction] = useState(null);
    const [lastReactionTime, setLastReactionTime] = useState(null);
    const [shake, setShake] = useState(0);
    const [phaseIndex, setPhaseIndex] = useState(0);
    const [countdown, setCountdown] = useState(3);

    // Combo System
    const [combo, setCombo] = useState(0);

    // Objects
    const targets = useRef([]);
    const particles = useRef([]);

    // Logic to resume game from pause/transition
    const resumeGame = () => {
        setCountdown(3);
        setGameState("COUNTDOWN");
    };

    const pauseGame = () => {
        if (gameState === "PLAYING") setGameState("PAUSED");
    };

    const startNextPhase = () => {
        let nextIndex = phaseIndex + 1;
        if (nextIndex >= LEVEL_MAP[1].phases.length) {
            nextIndex = 0;
        }
        setPhaseIndex(nextIndex);
        setCountdown(3);
        setGameState("COUNTDOWN");
    };

    // --- COLLISION ALGO ---
    const isValidPosition = (x, y) => {
        const MIN_DIST = 80; // Requested 80px minimum distance
        for (const t of targets.current) {
            const dist = Math.sqrt((x - t.x) ** 2 + (y - t.y) ** 2);
            if (dist < MIN_DIST) {
                return false;
            }
        }
        return true;
    };

    // --- SPAWNING LOGIC ---
    const spawnTarget = useCallback(() => {
        const currentLevelConfig = LEVEL_MAP[level];
        let shape, color;
        let speedMult = 1;
        let movementType = false;

        if (level === 1) {
            const currentPhase = currentLevelConfig.phases[phaseIndex];
            if (!currentPhase) return;

            shape = currentPhase.forceShape ? currentPhase.forceShape : SHAPES[Math.floor(Math.random() * SHAPES.length)];

            if (currentPhase.forceColor) {
                color = COLORS.find(c => c.name === currentPhase.forceColor) || { name: "gray", hex: "#888888", glow: "rgba(136, 136, 136, 0.6)" };
            } else {
                color = COLORS[Math.floor(Math.random() * COLORS.length)];
            }
            speedMult = currentPhase.speedMult;
        } else {
            if (currentLevelConfig.movement) movementType = currentLevelConfig.movement;

            if (instruction && Math.random() < currentLevelConfig.trapChance) {
                if (level === 3) {
                    shape = instruction.type === "shape" ? instruction.value : SHAPES[Math.floor(Math.random() * SHAPES.length)];
                    color = instruction.type === "color"
                        ? COLORS.find(c => c.name === instruction.value)
                        : COLORS[Math.floor(Math.random() * COLORS.length)];
                } else {
                    shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                    color = COLORS[Math.floor(Math.random() * COLORS.length)];
                }
            } else {
                if (instruction) {
                    if (instruction.type === 'color') {
                        color = COLORS.find(c => c.name === instruction.value);
                        shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                    } else if (instruction.type === 'shape') {
                        shape = instruction.value;
                        color = COLORS[Math.floor(Math.random() * COLORS.length)];
                    } else if (instruction.type === 'dual') {
                        color = COLORS.find(c => c.name === instruction.value.color);
                        shape = instruction.value.shape;
                    }
                    if (!color) color = COLORS[Math.floor(Math.random() * COLORS.length)];
                    if (!shape) shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                } else {
                    shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                    color = COLORS[Math.floor(Math.random() * COLORS.length)];
                }
            }
        }

        let x, y, safe;
        let attempts = 0;
        const padding = 60;

        // Overlap Check Loop
        do {
            x = Math.random() * (CANVAS_WIDTH - padding * 2) + padding;
            y = Math.random() * (CANVAS_HEIGHT - padding * 2) + padding;
            safe = isValidPosition(x, y);
            attempts++;
        } while (!safe && attempts < 15);

        if (!safe) return;

        let vx = 0, vy = 0;
        if (movementType === 'linear' || movementType === 'bouncing') {
            vx = (Math.random() - 0.5) * 4;
            vy = (Math.random() - 0.5) * 4;
        }

        const size = 35;
        targets.current.push({
            id: performance.now(),
            x, y, vx, vy,
            size,
            shape,
            color,
            createdAt: performance.now(),
            lifeTime: (TARGET_LIFETIME * (1 / speedMult)),
            scale: 0,
            rotation: Math.random() * Math.PI * 2,
            movementType
        });
    }, [level, phaseIndex, instruction]);

    // Instruction Update Logic
    const updateInstruction = useCallback(() => {
        if (level === 1) {
            const phase = LEVEL_MAP[1].phases[phaseIndex];
            if (!phase) return;

            if (phaseIndex === 0) {
                const targetColor = COLORS[Math.floor(Math.random() * COLORS.length)];
                setInstruction({ type: "color", value: targetColor.name, label: t.colors[targetColor.name], negative: false, colorHex: targetColor.hex });
            }
            else if (phaseIndex === 1) {
                const targetShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                setInstruction({ type: "shape", value: targetShape, label: t.shapes[targetShape], negative: false });
            }
            else if (phaseIndex === 2) {
                const targetColor = COLORS[Math.floor(Math.random() * COLORS.length)];
                setInstruction({ type: "color", value: targetColor.name, label: t.colors[targetColor.name], negative: false, colorHex: targetColor.hex });
            }
            else if (phaseIndex === 3) {
                const targetShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                setInstruction({ type: "shape", value: targetShape, label: t.shapes[targetShape], negative: false });
            }

        } else {
            const isDual = level === 2 || level === 5;
            const isNegative = level === 3;

            if (isDual) {
                const tColor = COLORS[Math.floor(Math.random() * COLORS.length)];
                const tShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                setInstruction({
                    type: "dual",
                    value: { color: tColor.name, shape: tShape },
                    label: `${t.shapes[tShape]} ${t.colors[tColor.name]}`,
                    negative: false,
                    colorHex: tColor.hex
                });
            } else if (isNegative) {
                const isColor = Math.random() > 0.5;
                if (isColor) {
                    const tColor = COLORS[Math.floor(Math.random() * COLORS.length)];
                    setInstruction({ type: "color", value: tColor.name, label: `${t.game.not} ${t.colors[tColor.name]}`, negative: true, colorHex: tColor.hex });
                } else {
                    const tShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                    setInstruction({ type: "shape", value: tShape, label: `${t.game.not} ${t.shapes[tShape]}`, negative: true });
                }
            } else {
                const isColor = Math.random() > 0.5;
                if (isColor) {
                    const tColor = COLORS[Math.floor(Math.random() * COLORS.length)];
                    setInstruction({ type: "color", value: tColor.name, label: t.colors[tColor.name], negative: false, colorHex: tColor.hex });
                } else {
                    const tShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                    setInstruction({ type: "shape", value: tShape, label: t.shapes[tShape], negative: false });
                }
            }
        }
    }, [level, phaseIndex, t]);

    // Canvas Helpers
    const drawPolygon = (ctx, x, y, radius, sides, rotation, color, fill = false) => {
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = rotation + (i * 2 * Math.PI) / sides;
            ctx.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
        }
        ctx.closePath();
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
        if (fill) {
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.2;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
        ctx.shadowBlur = 0;
    };

    const drawGrid = (ctx) => {
        ctx.strokeStyle = "rgba(6, 182, 212, 0.1)";
        ctx.lineWidth = 1;
        const gridSize = 50;
        for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
        }
        for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
        }
    };

    // Main Loop
    const animate = useCallback((time) => {
        if (gameState !== "PLAYING" && gameState !== "COUNTDOWN") return;

        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        if (shake > 0) {
            ctx.strokeStyle = `rgba(255, 0, 0, ${shake / 20})`;
            ctx.lineWidth = 10;
            ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        drawGrid(ctx);

        // Only update objects if PLAYING due to countdown freeze?
        // Actually, if we are in COUNTDOWN, we might want to freeze the game visually or just show grid
        // Let's hide objects or keep them frozen.
        const shouldUpdate = gameState === "PLAYING";

        const now = performance.now();

        // Targets
        targets.current.forEach((t, i) => {
            if (shouldUpdate) {
                if (now - t.createdAt > t.lifeTime) {
                    targets.current.splice(i, 1);
                    return;
                }
                if (t.scale < 1) t.scale += 0.05;
                t.rotation += 0.01;

                if (t.movementType === 'linear' || t.movementType === 'bouncing') {
                    t.x += t.vx;
                    t.y += t.vy;
                    if (t.movementType === 'bouncing') {
                        if (t.x <= 0 || t.x >= CANVAS_WIDTH) t.vx *= -1;
                        if (t.y <= 0 || t.y >= CANVAS_HEIGHT) t.vy *= -1;
                    }
                }
            }

            const size = t.size * t.scale;

            if (t.shape === "circle") {
                ctx.beginPath();
                ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
                ctx.strokeStyle = t.color.hex;
                ctx.lineWidth = 3;
                ctx.shadowBlur = 15;
                ctx.shadowColor = t.color.hex;
                ctx.stroke();
                ctx.fillStyle = t.color.hex;
                ctx.globalAlpha = 0.2;
                ctx.fill();
                ctx.globalAlpha = 1.0;
                ctx.shadowBlur = 0;
            } else if (t.shape === "square") {
                drawPolygon(ctx, t.x, t.y, size, 4, t.rotation + Math.PI / 4, t.color.hex, true);
            } else if (t.shape === "triangle") {
                drawPolygon(ctx, t.x, t.y, size, 3, t.rotation, t.color.hex, true);
            } else if (t.shape === "hexagon") {
                drawPolygon(ctx, t.x, t.y, size, 6, t.rotation, t.color.hex, true);
            }
        });

        // Particles
        particles.current.forEach((p, i) => {
            if (shouldUpdate) {
                p.life--;
                p.x += p.vx;
                p.y += p.vy;
            }
            if (!shouldUpdate) return; // Freeze particles too

            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / 25;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            if (p.life <= 0) particles.current.splice(i, 1);
        });

        requestRef.current = requestAnimationFrame(animate);
    }, [gameState, shake]);

    // Initial Instruction Set
    useEffect(() => {
        if (level === 1) updateInstruction();
    }, [level, phaseIndex, updateInstruction]);

    // --- EFFECT: Countdown ---
    useEffect(() => {
        if (gameState !== "COUNTDOWN") return;

        const timer = setInterval(() => {
            setCountdown(prev => {
                const next = prev - 1;
                if (next <= 0) {
                    setGameState("PLAYING");
                    clearInterval(timer);
                    return 0;
                }
                return next;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [gameState]);

    // --- EFFECT: Phase Timer (Level 1) ---
    useEffect(() => {
        if (gameState !== "PLAYING" || level !== 1) return;

        const currentPhase = LEVEL_MAP[1].phases[phaseIndex];
        if (!currentPhase) return;

        updateInstruction();

        const phaseDuration = currentPhase.duration * 1000;
        const phaseTimeout = setTimeout(() => {
            setGameState("PHASE_TRANSITION");
        }, phaseDuration);

        return () => clearTimeout(phaseTimeout);
    }, [gameState, level, phaseIndex, updateInstruction]);

    // --- EFFECT: Spawner ---
    useEffect(() => {
        if (gameState !== "PLAYING") return;
        const targetSpawnRate = SPAWN_RATE;
        const interval = setInterval(spawnTarget, targetSpawnRate);
        return () => clearInterval(interval);
    }, [gameState, level, spawnTarget]);

    // --- EFFECT: Timer ---
    useEffect(() => {
        if (gameState !== "PLAYING") return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    endGame("TIME_UP");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [gameState]);

    // --- EFFECT: Auto Instruction Update (L2-L5) ---
    useEffect(() => {
        if (gameState !== "PLAYING" || level === 1) return;
        updateInstruction();
        const intervalTime = level === 5 ? 3000 : 5000;
        const interval = setInterval(updateInstruction, intervalTime);
        return () => clearInterval(interval);
    }, [gameState, level, updateInstruction]);

    // --- EFFECT: Animation Loop ---
    useEffect(() => {
        if (gameState === "PLAYING" || gameState === "COUNTDOWN") {
            requestRef.current = requestAnimationFrame(animate);
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [gameState, animate]);

    const startGame = () => {
        setScore(0);
        setLives(3);
        setTimeLeft(60);
        setPhaseIndex(0);
        setCombo(0);
        targets.current = [];
        particles.current = [];
        updateInstruction();
        setCountdown(3);
        setGameState("COUNTDOWN"); // Start with countdown
    };

    const endGame = (reason) => {
        setGameState("GAME_OVER");
        if (score > 0 && onWinGame) {
            onWinGame(score);
        }
    };

    const createExplosion = (x, y, color) => {
        for (let i = 0; i < 15; i++) {
            particles.current.push({
                x, y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 25,
                color: color,
                size: Math.random() * 4
            });
        }
    };

    const handleCanvasClick = (e) => {
        if (gameState !== "PLAYING") return;

        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        const clickX = (e.clientX - rect.left) * scaleX;
        const clickY = (e.clientY - rect.top) * scaleY;

        let hit = false;
        for (let i = targets.current.length - 1; i >= 0; i--) {
            const t = targets.current[i];
            const dist = Math.sqrt((clickX - t.x) ** 2 + (clickY - t.y) ** 2);

            if (dist < t.size * 1.2) {
                const matches = checkCondition(t, instruction);
                if (matches) {
                    handleHit(t, i);
                } else {
                    handleMiss(t.x, t.y);
                }
                hit = true;
                break;
            }
        }
    };

    const checkCondition = (target, instr) => {
        if (!instr) return false;
        let isMatch = false;

        if (instr.type === 'dual') {
            isMatch = (target.color.name === instr.value.color && target.shape === instr.value.shape);
        } else {
            if (instr.type === "color") isMatch = target.color.name === instr.value;
            if (instr.type === "shape") isMatch = target.shape === instr.value;
        }

        return instr.negative ? !isMatch : isMatch;
    };

    const handleHit = (target, index) => {
        const reactionTime = performance.now() - target.createdAt;
        setLastReactionTime(reactionTime);
        targets.current.splice(index, 1);
        createExplosion(target.x, target.y, target.color.hex);
        const newCombo = combo + 1;
        setCombo(newCombo);
        const multiplier = Math.floor(newCombo / 5) + 1;
        setScore(prev => prev + (10 * level * multiplier));
    };

    const handleMiss = (x, y) => {
        createExplosion(x, y, "#ffffff");
        setCombo(0);
        setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) endGame("GAME_OVER_LIVES");
            return newLives;
        });
        setScore(prev => Math.max(0, prev - 50));
        setShake(20);
        setTimeout(() => setShake(0), 500);
    };

    // Helper to get translated phase title safe
    const getPhaseTitle = (idx) => {
        try {
            return t.neural.phase_titles[idx + 1] || "Phase " + (idx + 1);
        } catch (e) { return "Phase " + (idx + 1); }
    };

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col items-center gap-8 font-mono px-4">

            {/* --- HUD HEADER --- */}
            <div className="w-full flex justify-between items-end relative z-10 -mt-8">
                {/* Score Panel */}
                <div className="flex flex-col gap-1 w-64">
                    <div className="flex justify-between text-cyan-400 text-xs tracking-[0.2em] font-bold">
                        <span className="flex items-center gap-2"><Trophy className="w-4 h-4" /> {t.neural.score}</span>
                        <span>{score}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(score / 20, 100)}%` }}
                            className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                        ></motion.div>
                    </div>
                </div>

                {/* Main Instruction */}
                <AnimatePresence mode="wait">
                    {(gameState === "PLAYING" || gameState === "COUNTDOWN") && instruction ? (
                        <motion.div
                            key={instruction.label}
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 10, opacity: 0 }}
                            className={`relative mb-20 z-20 px-8 py-4 rounded-xl border-2 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.5)] ${instruction.negative ? 'border-red-500/50 bg-red-950/40 text-red-100' : 'border-cyan-500/50 bg-cyan-950/40 text-cyan-100'}`}
                        >
                            <div className="text-xl md:text-2xl font-black italic tracking-widest text-center min-w-[250px] drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                                {instruction.label}
                            </div>
                            {combo > 4 && (
                                <motion.div
                                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    className="absolute -top-3 -right-3 bg-yellow-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full border border-white"
                                >
                                    {Math.floor(combo / 5) + 1}x
                                </motion.div>
                            )}
                        </motion.div>
                    ) : (
                        <div className="text-slate-600 text-sm tracking-widest h-10 flex items-center">{t.neural.waiting}</div>
                    )}
                </AnimatePresence>

                {/* Time Panel */}
                <div className="flex flex-col gap-1 w-64 items-end">
                    <div className="flex justify-between w-full text-cyan-400 text-xs tracking-[0.2em] font-bold">
                        <span>{timeLeft}s</span>
                        <div className="flex items-center gap-4">
                            {/* Pause Button */}
                            {gameState === "PLAYING" && (
                                <button onClick={pauseGame} className="text-cyan-400 hover:text-white transition-colors">
                                    <Pause className="w-4 h-4" />
                                </button>
                            )}
                            {gameState === "PAUSED" && (
                                <button onClick={resumeGame} className="text-yellow-400 hover:text-white transition-colors animate-pulse">
                                    <Play className="w-4 h-4" />
                                </button>
                            )}
                            <span className="flex items-center gap-2">{t.neural.time} <Clock className="w-4 h-4" /></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- GAME FRAME --- */}
            <motion.div
                animate={{ x: shake > 0 ? [0, -10, 10, -10, 10, 0] : 0 }}
                transition={{ duration: 0.4 }}
                className={`relative w-full aspect-[4/3] max-h-[800px] border border-cyan-500/30 bg-slate-950/50 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.1)] group ${shake > 0 ? 'border-red-500 shadow-red-500/50' : ''}`}
            >
                {/* Tech Corners */}
                <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-cyan-500/50 rounded-tl-2xl"></div>
                <div className="absolute top-0 right-0 w-16 h-16 border-t-2 border-r-2 border-cyan-500/50 rounded-tr-2xl"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 border-b-2 border-l-2 border-cyan-500/50 rounded-bl-2xl"></div>
                <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-cyan-500/50 rounded-br-2xl"></div>

                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    onClick={handleCanvasClick}
                    className="w-full h-full cursor-crosshair relative z-10"
                />

                {/* MODALS & OVERLAYS */}
                <AnimatePresence>
                    {/* Countdown Overlay */}
                    {gameState === "COUNTDOWN" && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.5 }}
                            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/20 backdrop-blur-[2px]"
                        >
                            <motion.span
                                key={countdown}
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1.5, opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-9xl font-black text-cyan-400 drop-shadow-[0_0_50px_rgba(6,182,212,0.8)]"
                            >
                                {countdown}
                            </motion.span>
                        </motion.div>
                    )}

                    {/* Pause Overlay */}
                    {gameState === "PAUSED" && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 z-40 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center"
                        >
                            <h2 className="text-4xl font-black text-white italic tracking-widest mb-6">{t.neural.pause}</h2>
                            <button onClick={resumeGame} className="bg-cyan-500 text-black font-bold px-8 py-3 rounded-full hover:scale-105 transition-transform">
                                {t.neural.resume}
                            </button>
                        </motion.div>
                    )}

                    {/* Phase Transition Modal (Window) */}
                    {gameState === "PHASE_TRANSITION" && level === 1 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1 }}
                            className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md"
                        >
                            <div className="bg-slate-900 border border-cyan-500/50 p-8 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.3)] max-w-sm w-full text-center relative overflow-hidden">
                                {/* Decorative scanline */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>

                                <h3 className="text-cyan-400 text-xs font-bold uppercase tracking-[0.3em] mb-2">{t.neural.phase_completed}</h3>
                                <h2 className="text-3xl font-black text-white italic mb-6">
                                    {getPhaseTitle(phaseIndex)}
                                </h2>

                                <div className="flex flex-col gap-2 mb-8">
                                    <span className="text-slate-400 text-sm">Next Protocol:</span>
                                    <span className="text-xl font-bold text-yellow-400">
                                        {getPhaseTitle((phaseIndex + 1) % 4)}
                                    </span>
                                </div>

                                <button
                                    onClick={startNextPhase}
                                    className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-4 rounded-xl uppercase tracking-widest shadow-lg transition-all group"
                                >
                                    {t.neural.start_phase} <Play className="inline-block w-4 h-4 ml-2 fill-current group-hover:scale-125 transition-transform" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Game Start / Idle - COSMIC NEURAL UI */}
                    {gameState === "IDLE" && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0a0a16] text-cyan-400 overflow-hidden">

                            {/* Background Effects */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(120,50,255,0.15)_0%,_transparent_60%)]"></div>
                            <div className="absolute top-0 w-full h-full opacity-20" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

                            {/* Top HUD */}
                            <div className="absolute top-6 left-8 flex flex-col gap-1">
                                <span className="text-[10px] text-slate-300 tracking-widest font-mono">SCORE: 000000</span>
                                <span className="text-[10px] text-slate-300 tracking-widest font-mono">MULTIPLIER x1.0</span>
                                <div className="w-32 h-1 bg-slate-800 mt-1 relative overflow-hidden">
                                    <div className="absolute inset-y-0 left-0 w-1/3 bg-cyan-400"></div>
                                </div>
                            </div>

                            <div className="absolute top-6 right-8 flex flex-col items-end gap-2">
                                <span className="text-[10px] text-slate-300 tracking-widest font-mono">CHRONO OPS</span>
                                <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-cyan-400 animate-spin"></div>
                                <span className="text-[9px] text-slate-500 font-mono">READY: {new Date().toLocaleTimeString()}</span>
                            </div>

                            {/* Main Arc */}
                            <div className="absolute top-[15%] w-[80%] h-[70%] border-t-[6px] border-cyan-400/30 rounded-full shadow-[0_0_30px_rgba(34,211,238,0.2)]"></div>

                            {/* Central Portal Component */}
                            <div className="relative mb-8 mt-20">
                                {/* Orbiting Nodes */}
                                <div className="absolute inset-0 animate-spin-slow">
                                    {[0, 60, 120, 180, 240, 300].map((deg, i) => (
                                        <div
                                            key={i}
                                            className="absolute md:w-16 md:h-16 w-12 h-12 flex items-center justify-center border border-orange-500/30 bg-black/50 rounded-full backdrop-blur-sm"
                                            style={{
                                                top: '50%', left: '50%',
                                                transform: `rotate(${deg}deg) translate(140px) rotate(-${deg}deg)`
                                            }}
                                        >
                                            {i % 4 === 0 && <span className="w-4 h-4 border-2 border-red-500 rounded-full"></span>}
                                            {i % 4 === 1 && <span className="w-4 h-4 border-2 border-green-500 transform rotate-45"></span>}
                                            {i % 4 === 2 && <span className="w-4 h-4 border-2 border-blue-500"></span>}
                                            {i % 4 === 3 && <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent border-b-yellow-500"></div>}
                                        </div>
                                    ))}
                                </div>

                                {/* Core */}
                                <div className="relative z-10 w-40 h-40 md:w-56 md:h-56 rounded-full bg-black flex items-center justify-center shadow-[0_0_80px_rgba(168,85,247,0.4)]">
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-600 to-pink-500 opacity-20 animate-pulse"></div>
                                    <div className="absolute inset-4 rounded-full border border-purple-500/30"></div>
                                    <div className="w-24 h-24 md:w-32 md:h-32 bg-[conic-gradient(from_0deg,transparent_0_340deg,white_360deg)] rounded-full animate-spin opacity-50 blur-xl"></div>

                                    {/* Swirl Effect Simulation */}
                                    <div className="absolute inset-0 rounded-full overflow-hidden">
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle,_transparent_30%,_#d946ef_70%)] opacity-30 animate-spin-slow" style={{ animationDuration: '8s' }}></div>
                                    </div>
                                </div>

                                <div className="absolute top-1/2 -right-32 md:-right-48 -translate-y-1/2 text-xs font-mono text-cyan-200/70 tracking-widest hidden md:block">
                                    LEVEL {level} // {LEVEL_MAP[level]?.label || `PROTOCOL ${level}`}
                                </div>
                            </div>

                            {/* Main Action Button */}
                            <div className="relative z-30 flex flex-col items-center gap-2 mt-4">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={startGame}
                                    className="relative group "
                                >
                                    <div className="absolute inset-0 bg-cyan-500/20 blur-md rounded-lg group-hover:bg-cyan-500/40 transition-all"></div>
                                    <div className="relative px-8 py-3 border border-cyan-400 bg-black/60 backdrop-blur-sm flex items-center gap-3 rounded text-cyan-300 group-hover:text-white transition-colors">
                                        <span className="text-xl font-bold tracking-[0.2em]">[ ACTIVATE NEURAL LINK ]</span>
                                    </div>
                                </motion.button>
                                <span className="text-[10px] text-cyan-600 tracking-[0.3em] font-mono animate-pulse">
                                    [ AWAITING BIOMETRIC SCAN... ]
                                </span>
                            </div>

                            {/* Level Selectors - Reintegrated purely as visuals/buttons below */}
                            <div className="mt-8 flex gap-3 z-30">
                                {Object.keys(LEVEL_MAP).map(l => (
                                    <button
                                        key={l}
                                        onClick={() => setLevel(parseInt(l))}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${level === parseInt(l) ? 'border-cyan-400 bg-cyan-900/50 text-white shadow-[0_0_15px_cyan]' : 'border-slate-800 bg-slate-900 text-slate-600 hover:border-slate-600'}`}
                                    >
                                        L{l}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Game Over */}
                    {gameState === "GAME_OVER" && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md text-center">
                            <HeartCrack className="w-20 h-20 text-slate-700 mb-4 drop-shadow-[0_0_10px_rgba(255,0,0,0.2)]" />
                            <h2 className="text-4xl font-black text-red-500 tracking-[0.5em] mb-2 uppercase">{t.neural.game_over}</h2>
                            <p className="text-slate-400 mb-8 font-mono">{t.neural.final_score}: {score}</p>
                            <button
                                onClick={() => setGameState("IDLE")}
                                className="px-8 py-3 border border-red-500/50 text-red-400 hover:bg-red-950/30 rounded font-bold tracking-widest uppercase transition-colors"
                            >
                                {t.neural.retry}
                            </button>
                        </div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* --- BOTTOM HUD --- */}
            <div className="flex items-center gap-8 text-cyan-500/80">
                <div className="flex items-center gap-2 bg-slate-900 border border-cyan-900/50 px-6 py-2 rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t.neural.reaction}</span>
                    <span className="text-xl font-mono text-white">
                        {lastReactionTime ? `${(lastReactionTime / 1000).toFixed(3)}s` : '---'}
                    </span>
                </div>

                <div className="flex gap-2">
                    {[...Array(3)].map((_, i) => (
                        <Heart
                            key={i}
                            className={`w-6 h-6 transition-colors ${i < lives ? 'text-red-500 fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'text-slate-800 fill-slate-900'}`}
                        />
                    ))}
                </div>
            </div>

        </div>
    );
}
