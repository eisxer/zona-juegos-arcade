"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, Zap, Heart, Clock, Trophy, ScanLine } from "lucide-react";
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
const LEVEL_MAP = {
    1: {
        isMultiPhase: true,
        phases: [
            { id: "1.1", duration: 15, forceShape: "circle", forceColor: null, speedMult: 1, label: "COLOR FOCUS" },
            { id: "1.2", duration: 15, forceShape: null, forceColor: "red", speedMult: 1, label: "SHAPE FOCUS" }, // Using 'red' as example fixed color
            { id: "1.3", duration: 15, forceShape: "circle", forceColor: null, speedMult: 2, label: "SPEED BURST" },
            { id: "1.4", duration: 15, forceShape: null, forceColor: null, speedMult: 1.2, label: "DISTRACTION" }
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
    const [gameState, setGameState] = useState("IDLE");
    const [level, setLevel] = useState(1);
    const [score, setScore] = useState(0);
    const [lives, setLives] = useState(3);
    const [timeLeft, setTimeLeft] = useState(60); // Total level time
    const [instruction, setInstruction] = useState(null);
    const [lastReactionTime, setLastReactionTime] = useState(null);
    const [shake, setShake] = useState(0);
    const [phaseIndex, setPhaseIndex] = useState(0);
    const [showingPhaseTitle, setShowingPhaseTitle] = useState(false);

    // Combo System
    const [combo, setCombo] = useState(0);

    // Objects
    const targets = useRef([]);
    const particles = useRef([]);
    const phaseTimerRef = useRef(null);

    // --- LOGIC ---

    const spawnTarget = useCallback(() => {
        const currentLevelConfig = LEVEL_MAP[level];
        let shape, color;
        let speedMult = 1;
        let movementType = false;

        if (level === 1) {
            const currentPhase = currentLevelConfig.phases[phaseIndex];
            if (!currentPhase) return; // Safety check

            shape = currentPhase.forceShape ? currentPhase.forceShape : SHAPES[Math.floor(Math.random() * SHAPES.length)];

            if (currentPhase.forceColor) {
                // Find the color object matching the forced color name or generic gray if not found
                color = COLORS.find(c => c.name === currentPhase.forceColor) || { name: "gray", hex: "#888888", glow: "rgba(136, 136, 136, 0.6)" };
            } else {
                color = COLORS[Math.floor(Math.random() * COLORS.length)];
            }
            speedMult = currentPhase.speedMult;
        } else {
            // Levels 2-5
            // Movement logic for L4/L5
            if (currentLevelConfig.movement) movementType = currentLevelConfig.movement;

            // Trap logic for L2-L5
            if (instruction && Math.random() < currentLevelConfig.trapChance) {
                // Generate TRAP (contradicts instruction)
                if (level === 3) { // Negative Logic: Trap is the target itself (since instruction is NO X)
                    // Actually for "NO X", a trap is X.
                    shape = instruction.type === "shape" ? instruction.value : SHAPES[Math.floor(Math.random() * SHAPES.length)];
                    color = instruction.type === "color"
                        ? COLORS.find(c => c.name === instruction.value)
                        : COLORS[Math.floor(Math.random() * COLORS.length)];
                } else { // Normal Logic: Trap is NOT the target
                    // This simple logic might need refinement for dual task
                    shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                    color = COLORS[Math.floor(Math.random() * COLORS.length)];
                    // Ensure it's NOT a match (simplified)
                }
            } else {
                // Generate VALID TARGET
                // Needs to match instruction
                if (instruction) {
                    if (instruction.type === 'color') {
                        color = COLORS.find(c => c.name === instruction.value);
                        shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                    } else if (instruction.type === 'shape') {
                        shape = instruction.value;
                        color = COLORS[Math.floor(Math.random() * COLORS.length)];
                    } else if (instruction.type === 'dual') {
                        // instruction.value is {color: 'red', shape: 'circle'}
                        color = COLORS.find(c => c.name === instruction.value.color);
                        shape = instruction.value.shape;
                    }

                    // Fallback for color if undefined (e.g. negative logic instruction doesn't enforce color)
                    if (!color) color = COLORS[Math.floor(Math.random() * COLORS.length)];
                    if (!shape) shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                } else {
                    shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                    color = COLORS[Math.floor(Math.random() * COLORS.length)];
                }
            }
        }

        const size = 35;
        const padding = 60;
        const x = Math.random() * (CANVAS_WIDTH - padding * 2) + padding;
        const y = Math.random() * (CANVAS_HEIGHT - padding * 2) + padding;

        // Velocity for Kinetic Levels
        let vx = 0, vy = 0;
        if (movementType === 'linear' || movementType === 'bouncing') {
            vx = (Math.random() - 0.5) * 4;
            vy = (Math.random() - 0.5) * 4;
        }

        targets.current.push({
            id: performance.now(),
            x, y, vx, vy,
            size,
            shape,
            color,
            createdAt: performance.now(),
            lifeTime: (TARGET_LIFETIME * (1 / speedMult)), // speedMult divides lifetime
            scale: 0,
            rotation: Math.random() * Math.PI * 2,
            movementType
        });
    }, [level, phaseIndex, instruction]);

    // Instruction Logic
    const updateInstruction = useCallback(() => {
        if (level === 1) {
            // Level 1: Static instructions per phase
            const phase = LEVEL_MAP[1].phases[phaseIndex];
            if (!phase) return;

            // 1.1 Color Focus
            if (phaseIndex === 0) {
                setInstruction({ type: "color", value: "blue", label: t.colors.blue, negative: false, colorHex: "#00f0ff" }); // Example: Always Blue for consistency? Or Random? Spec says "Color Focus", implies random instruction "COLOR".
                // Let's implement: Instruction says "RED", you click only RED.
                // The 'spawnTarget' is forcing shapes, but here we define the rule.
                // Wait, spec says: 1.1 "Instruction: COLOR".
                const targetColor = COLORS[Math.floor(Math.random() * COLORS.length)];
                setInstruction({ type: "color", value: targetColor.name, label: t.colors[targetColor.name], negative: false, colorHex: targetColor.hex });
            }
            // 1.2 Shape Focus
            else if (phaseIndex === 1) {
                const targetShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                setInstruction({ type: "shape", value: targetShape, label: t.shapes[targetShape], negative: false });
            }
            // 1.3 Speed Burst (Color)
            else if (phaseIndex === 2) {
                const targetColor = COLORS[Math.floor(Math.random() * COLORS.length)];
                setInstruction({ type: "color", value: targetColor.name, label: t.colors[targetColor.name], negative: false, colorHex: targetColor.hex });
            }
            // 1.4 Distraction (Shape)
            else if (phaseIndex === 3) {
                const targetShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                setInstruction({ type: "shape", value: targetShape, label: t.shapes[targetShape], negative: false });
            }

        } else {
            // Level 2-5 Dynamic Logic
            const isDual = level === 2 || level === 5;
            const isNegative = level === 3;
            const changeInterval = level === 5 ? 3000 : 5000;

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
                // "NO X"
                const isColor = Math.random() > 0.5;
                if (isColor) {
                    const tColor = COLORS[Math.floor(Math.random() * COLORS.length)];
                    setInstruction({ type: "color", value: tColor.name, label: `${t.game.not} ${t.colors[tColor.name]}`, negative: true, colorHex: tColor.hex });
                } else {
                    const tShape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
                    setInstruction({ type: "shape", value: tShape, label: `${t.game.not} ${t.shapes[tShape]}`, negative: true });
                }
            } else {
                // Level 4 (Kinetic) - Simple logic, hard movement
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

    // Draw Helper
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
        if (gameState !== "PLAYING") return;
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Fail Flash Effect
        if (shake > 0) {
            ctx.strokeStyle = `rgba(255, 0, 0, ${shake / 20})`;
            ctx.lineWidth = 10;
            ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        drawGrid(ctx);

        const now = performance.now();

        // Targets
        targets.current.forEach((t, i) => {
            // Lifetime check
            if (now - t.createdAt > t.lifeTime) {
                targets.current.splice(i, 1);
                return;
            }

            // Animation
            if (t.scale < 1) t.scale += 0.05;
            t.rotation += 0.01;

            // Movement (L4/L5)
            if (t.movementType === 'linear' || t.movementType === 'bouncing') {
                t.x += t.vx;
                t.y += t.vy;

                if (t.movementType === 'bouncing') {
                    if (t.x <= 0 || t.x >= CANVAS_WIDTH) t.vx *= -1;
                    if (t.y <= 0 || t.y >= CANVAS_HEIGHT) t.vy *= -1;
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
            p.life--;
            p.x += p.vx;
            p.y += p.vy;
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

    // Phase Management for Level 1
    useEffect(() => {
        if (gameState !== "PLAYING" || level !== 1) return;

        const currentPhase = LEVEL_MAP[1].phases[phaseIndex];
        if (!currentPhase) return;

        // Reset timer for new phase
        // Actually, we use one main timer? Spec says "4 sub-phases of 15 seconds".
        // Let's rely on a timeout to advance phase

        setShowingPhaseTitle(true);
        setTimeout(() => setShowingPhaseTitle(false), 2000);
        updateInstruction(); // Ensure instruction matches new phase

        const phaseDuration = currentPhase.duration * 1000;
        const phaseTimeout = setTimeout(() => {
            if (phaseIndex < LEVEL_MAP[1].phases.length - 1) {
                setPhaseIndex(prev => prev + 1);
            } else {
                // Level complete? Or loop? Assuming loop or end.
                // For arcades, usually loop or next level. Let's just loop for now or end logic?
                // Let's loop back to 0 for endless play until time runs out? 
                // Or time runs out.
                // Spec doesn't clarify what happens after 1.4. Let's loop instructions but keep time.
                setPhaseIndex(0);
            }
        }, phaseDuration);

        return () => clearTimeout(phaseTimeout);
    }, [gameState, level, phaseIndex, updateInstruction]);

    // Spawning Loop
    useEffect(() => {
        if (gameState !== "PLAYING") return;
        const targetSpawnRate = SPAWN_RATE; // Simplified for now, can add mods
        const interval = setInterval(spawnTarget, targetSpawnRate);
        return () => clearInterval(interval);
    }, [gameState, level, spawnTarget]);

    // Global Time
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

    // Auto Instruction Update for L2-L5
    useEffect(() => {
        if (gameState !== "PLAYING" || level === 1) return;
        updateInstruction();
        const intervalTime = level === 5 ? 3000 : 5000;
        const interval = setInterval(updateInstruction, intervalTime);
        return () => clearInterval(interval);
    }, [gameState, level, updateInstruction]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate]);

    const startGame = () => {
        setGameState("PLAYING");
        setScore(0);
        setLives(3);
        setTimeLeft(level === 1 ? 60 : 60); // 60s total for L1 (4 phases * 15s)
        setPhaseIndex(0);
        setCombo(0);
        targets.current = [];
        particles.current = [];
        updateInstruction();
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

            if (dist < t.size * 1.2) { // Hitbox precise
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

        // Combo Logic
        const newCombo = combo + 1;
        setCombo(newCombo);
        const multiplier = Math.floor(newCombo / 5) + 1;
        setScore(prev => prev + (10 * level * multiplier));
    };

    const handleMiss = (x, y) => {
        createExplosion(x, y, "#ffffff");
        setCombo(0); // Reset combo
        setLives(prev => {
            const newLives = prev - 1;
            if (newLives <= 0) endGame("GAME_OVER_LIVES");
            return newLives;
        });
        setScore(prev => Math.max(0, prev - 50));
        setShake(20);
        setTimeout(() => setShake(0), 500);
    };

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-8 font-mono px-4">

            {/* --- HUD HEADER --- */}
            <div className="w-full flex justify-between items-end">
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
                    {gameState === "PLAYING" && instruction ? (
                        <motion.div
                            key={instruction.label}
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 10, opacity: 0 }}
                            className={`relative px-10 py-3 rounded-xl border-2 backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.5)] ${instruction.negative ? 'border-red-500/50 bg-red-950/40 text-red-100' : 'border-cyan-500/50 bg-cyan-950/40 text-cyan-100'}`}
                        >
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-1 bg-current opacity-50 rounded-full"></div>
                            <div className="text-2xl md:text-3xl font-black italic tracking-widest text-center min-w-[300px] drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                                {instruction.label}
                            </div>
                            {/* Combo Badge */}
                            {combo > 4 && (
                                <motion.div
                                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                                    className="absolute -top-4 -right-4 bg-yellow-500 text-black text-xs font-black px-2 py-1 rounded-full border border-white"
                                >
                                    {Math.floor(combo / 5) + 1}x MULTIPLIER
                                </motion.div>
                            )}
                        </motion.div>
                    ) : (
                        <div className="text-slate-600 text-sm tracking-widest">{t.neural.waiting}</div>
                    )}
                </AnimatePresence>

                {/* Time Panel */}
                <div className="flex flex-col gap-1 w-64 items-end">
                    <div className="flex justify-between w-full text-cyan-400 text-xs tracking-[0.2em] font-bold">
                        <span>{timeLeft}s</span>
                        <span className="flex items-center gap-2">{t.neural.time} <Clock className="w-4 h-4" /></span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <motion.div
                            animate={{ width: `${(timeLeft / 60) * 100}%` }}
                            className={`h-full shadow-[0_0_10px_rgba(6,182,212,0.8)] ${timeLeft < 10 ? 'bg-red-500' : 'bg-cyan-500'}`}
                        ></motion.div>
                    </div>
                </div>
            </div>

            {/* --- GAME FRAME --- */}
            <motion.div
                animate={{ x: shake > 0 ? [0, -10, 10, -10, 10, 0] : 0 }}
                transition={{ duration: 0.4 }}
                className={`relative w-full aspect-[4/3] max-h-[600px] border border-cyan-500/30 bg-slate-950/50 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.1)] group ${shake > 0 ? 'border-red-500 shadow-red-500/50' : ''}`}
            >

                {/* Tech Corners (Decorative) */}
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

                {/* Phase Transition Overlay */}
                <AnimatePresence>
                    {gameState === "PLAYING" && showingPhaseTitle && level === 1 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 2 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
                        >
                            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-white drop-shadow-[0_0_10px_rgba(0,255,255,1)]">
                                {t.neural.next_phase}: {LEVEL_MAP[1].phases[phaseIndex].label}
                            </h2>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Screens */}
                <AnimatePresence>
                    {gameState === "IDLE" && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
                            <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={startGame}
                                className="relative group"
                            >
                                <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
                                <div className="relative bg-black border-2 border-cyan-400 px-12 py-6 rounded-lg flex items-center gap-4">
                                    <ScanLine className="w-8 h-8 text-cyan-400" />
                                    <span className="text-3xl font-black italic text-white tracking-widest">{t.neural.start}<span className="text-cyan-400">_</span></span>
                                </div>
                            </motion.button>
                            <div className="mt-8 flex gap-4">
                                {Object.keys(LEVEL_MAP).map(l => (
                                    <button
                                        key={l}
                                        onClick={() => setLevel(parseInt(l))}
                                        className={`px-4 py-2 border rounded text-xs font-bold uppercase tracking-widest transition-all ${level === parseInt(l) ? 'border-cyan-400 text-cyan-400 bg-cyan-950' : 'border-slate-700 text-slate-600 hover:border-slate-500'}`}
                                    >
                                        L{l}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {gameState === "GAME_OVER" && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md text-center">
                            <div className="text-6xl mb-4">💀</div>
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
