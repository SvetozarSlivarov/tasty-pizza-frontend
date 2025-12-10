import { useEffect, useRef } from "react";

export default function SuccessCelebration({ onDone }) {
    const canvasRef = useRef(null);
    const rafRef = useRef(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        let w = (canvas.width = window.innerWidth);
        let h = (canvas.height = window.innerHeight);

        const onResize = () => {
            w = canvas.width = window.innerWidth;
            h = canvas.height = window.innerHeight;
        };
        window.addEventListener("resize", onResize);

        const colors = ["#22c55e", "#10b981", "#84cc16", "#06b6d4", "#f59e0b", "#ef4444", "#8b5cf6"];
        const N = 140;
        const G = 0.18;
        const FRICTION = 0.992;
        const particles = [];

        for (let i = 0; i < N; i++) {
            const angle = (Math.PI * 2 * i) / N + (Math.random() * Math.PI) / 6;
            const speed = 8 + Math.random() * 6;
            particles.push({
                x: w / 2,
                y: h / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 4,
                size: 4 + Math.random() * 3,
                rot: Math.random() * Math.PI,
                vr: (Math.random() - 0.5) * 0.3,
                color: colors[(Math.random() * colors.length) | 0],
                life: 0,
                maxLife: 70 + Math.random() * 40,
            });
        }

        const draw = () => {
            ctx.clearRect(0, 0, w, h);

            for (const p of particles) {
                p.life++;
                p.vx *= FRICTION;
                p.vy = p.vy * FRICTION + G;
                p.x += p.vx;
                p.y += p.vy;
                p.rot += p.vr;

                const fade =
                    p.life < 20 ? p.life / 20 :
                        p.life > p.maxLife - 25 ? Math.max(0, (p.maxLife - p.life) / 25) :
                            1;

                ctx.save();
                ctx.globalAlpha = fade;
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;

                const s = p.size;
                ctx.fillRect(-s, -s * 0.6, s * 2, s * 1.2);
                ctx.restore();
            }

            if (particles.every(p => p.life > p.maxLife)) {
                cancelAnimationFrame(rafRef.current);
            } else {
                rafRef.current = requestAnimationFrame(draw);
            }
        };

        rafRef.current = requestAnimationFrame(draw);

        const t = setTimeout(() => onDone?.(), 2200);

        return () => {
            window.removeEventListener("resize", onResize);
            cancelAnimationFrame(rafRef.current);
            clearTimeout(t);
        };
    }, [onDone]);

    return (
        <div className="celebrate-backdrop" role="alert" aria-live="polite">
            <canvas ref={canvasRef} className="celebrate-canvas" />
            <div className="celebrate-card" aria-hidden="true">
                <svg className="celebrate-check" viewBox="0 0 120 120">
                    <circle className="circle" cx="60" cy="60" r="48" />
                    <path
                        className="check"
                        d="M38 63 L54 78 L84 44"
                        fill="none"
                        strokeLinecap="round"
                    />
                </svg>
                <div className="celebrate-text">Order placed!</div>
            </div>
        </div>
    );
}