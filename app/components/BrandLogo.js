import Image from "next/image";

export default function BrandLogo({ size = "small" }) {
    // Si le decimos que sea grande, usa w-32 (128px). Si no, usa tamaño de icono (w-12/w-16).
    const sizeClasses = size === "large" ? "w-32 h-32" : "w-12 h-12 md:w-16 md:h-16";
    const imageSize = size === "large" ? 140 : 64;

    return (
        <div className="relative group cursor-default">
            {/* Efecto de resplandor trasero animado */}
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>

            {/* El Círculo Contenedor (Ahora con tamaño inteligente) */}
            <div className={`
                relative 
                flex items-center justify-center 
                ${sizeClasses} 
                bg-slate-950 
                rounded-full 
                border border-cyan-500/30
                shadow-[0_0_15px_rgba(6,182,212,0.15)]
                group-hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]
                group-hover:border-cyan-400/50
                transition-all duration-300
                overflow-hidden
            `}>
                {/* Tu imagen limpia (sin fondo) */}
                <Image
                    src="/logo.png"
                    alt="Arcade Logo"
                    width={imageSize}
                    height={imageSize}
                    className="object-contain drop-shadow-[0_0_5px_rgba(6,182,212,0.5)] transform hover:scale-110 transition-transform duration-300"
                    priority
                />
            </div>
        </div>
    );
}