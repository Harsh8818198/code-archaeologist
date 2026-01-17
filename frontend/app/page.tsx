'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, MeshDistortMaterial, Environment, Sparkles as ThreeSparkles, PerspectiveCamera, Text3D, Center } from '@react-three/drei';
import { ArrowRight, Github, Sparkles, Scroll, Map, Brain, Zap, Database, Search, Code, ShieldCheck, Share2 } from 'lucide-react';
import * as THREE from 'three';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- 3D ARTIFACTS ---

function AncientArtifacts({ mouse }: { mouse: { x: number; y: number } }) {
  const scrollRef = useRef<THREE.Group>(null);
  const orbRef = useRef<THREE.Group>(null);
  const tabletRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Rotate artifacts based on mouse and time
    if (scrollRef.current) {
      scrollRef.current.rotation.x = Math.sin(t * 0.2) * 0.2 + mouse.y * 0.5;
      scrollRef.current.rotation.y = Math.cos(t * 0.3) * 0.2 + mouse.x * 0.5;
    }
    if (orbRef.current) {
      orbRef.current.rotation.x = Math.cos(t * 0.25) * 0.2 - mouse.y * 0.3;
      orbRef.current.rotation.y = Math.sin(t * 0.15) * 0.2 - mouse.x * 0.3;
    }
    if (tabletRef.current) {
      tabletRef.current.rotation.x = Math.sin(t * 0.1) * 0.1 + mouse.y * 0.2;
      tabletRef.current.rotation.y = Math.cos(t * 0.2) * 0.1 + mouse.x * 0.2;
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 12]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#f59e0b" /> {/* Gold light */}
      <pointLight position={[-10, -5, -5]} intensity={0.5} color="#7c3aed" /> {/* Purple light */}
      <spotLight position={[0, 5, 0]} intensity={1} color="#fbbf24" penumbra={1} angle={0.5} />

      {/* The Ancient Scroll (Git History) - Represented by TorusKnot */}
      <Float speed={2} rotationIntensity={1} floatIntensity={2}>
        <group ref={scrollRef} position={[-4, 1, 0]}>
          <mesh>
            <torusKnotGeometry args={[0.8, 0.25, 128, 32]} />
            <MeshDistortMaterial
              color="#fbbf24"
              emissive="#d97706"
              emissiveIntensity={0.2}
              roughness={0.1}
              metalness={1}
              distort={0.3}
              speed={2}
            />
          </mesh>
        </group>
      </Float>

      {/* The Crystal Orb (AI) - Represented by Icosahedron */}
      <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
        <group ref={orbRef} position={[4, -1, -2]}>
          <mesh>
            <icosahedronGeometry args={[1, 0]} />
            <MeshDistortMaterial
              color="#7c3aed"
              emissive="#4c1d95"
              emissiveIntensity={0.5}
              roughness={0}
              metalness={0.8}
              distort={0.5}
              speed={3}
              transparent
              opacity={0.8}
            />
          </mesh>
        </group>
      </Float>

      {/* The Stone Tablet (Knowledge Graph) - Represented by Box */}
      <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
        <group ref={tabletRef} position={[0, -3, -1]}>
          <mesh rotation={[0.5, 0.5, 0]}>
            <boxGeometry args={[2, 2.5, 0.2]} />
            <meshStandardMaterial
              color="#1c1917"
              roughness={0.9}
              metalness={0.1}
              bumpScale={0.1}
            />
          </mesh>
          {/* Glowing Rune on Tablet */}
          <mesh position={[0, -3, -0.8]} rotation={[0.5, 0.5, 0]}>
             <planeGeometry args={[1.5, 2]} />
             <meshBasicMaterial color="#10b981" transparent opacity={0.1} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </Float>

      {/* Golden Dust Particles */}
      <ThreeSparkles count={200} scale={15} size={2} speed={0.4} opacity={0.6} color="#fbbf24" />

      <Environment preset="city" />
    </>
  );
}

// --- UI COMPONENTS ---

const FeatureCard = ({ title, description, icon: Icon, color, delay }: { title: string; description: string; icon: any; color: string; delay: number }) => {
  const colors = {
    blue: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 hover:border-blue-400",
    purple: "from-purple-500/20 to-fuchsia-500/20 border-purple-500/30 hover:border-purple-400",
    green: "from-emerald-500/20 to-green-500/20 border-emerald-500/30 hover:border-emerald-400",
  };

  const iconColors = {
    blue: "text-blue-400",
    purple: "text-purple-400",
    green: "text-emerald-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.8 }}
      whileHover={{ y: -10, scale: 1.02 }}
      className={cn(
        "relative p-8 rounded-2xl backdrop-blur-xl border transition-all duration-500 group overflow-hidden bg-gradient-to-br",
        colors[color as keyof typeof colors]
      )}
    >
      <div className="absolute inset-0 bg-stone-texture opacity-30 mix-blend-overlay pointer-events-none" />
      <div className="relative z-10">
        <div className={`mb-6 p-4 rounded-xl bg-slate-900/50 w-fit backdrop-blur border border-white/10 shadow-lg group-hover:scale-110 transition-transform duration-300 ${iconColors[color as keyof typeof iconColors]}`}>
          <Icon size={32} />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3 font-serif tracking-wide group-hover:text-gold-gradient transition-colors">
          {title}
        </h3>
        <p className="text-slate-400 leading-relaxed group-hover:text-slate-200 transition-colors">
          {description}
        </p>
      </div>
      {/* Glow Effect on Hover */}
      <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 group-hover:animate-shine pointer-events-none rotate-45 transform transition-opacity duration-500" />
    </motion.div>
  );
};

const StoneBadge = ({ name, icon, color, delay }: { name: string; icon: string; color: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5, type: "spring" }}
    whileHover={{ y: -10 }}
    className="group relative flex flex-col items-center"
  >
    <div className={`
      w-24 h-24 rounded-2xl flex items-center justify-center text-4xl shadow-2xl
      bg-gradient-to-br ${color} relative z-10
      border border-white/10 backdrop-blur-sm
      group-hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-500
    `}>
      <span className="filter drop-shadow-lg transform group-hover:scale-125 transition-transform duration-300">
        {icon}
      </span>
      {/* Inner Glow */}
      <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>

    {/* Pedestal Base */}
    <div className="w-20 h-4 bg-slate-800/80 mt-2 rounded-full blur-sm" />

    <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute top-full pt-2">
      <div className="px-4 py-2 bg-slate-900/90 border border-slate-700 rounded-lg text-sm font-bold text-white whitespace-nowrap">
        {name}
      </div>
    </div>
  </motion.div>
);

const StatTablet = ({ value, label, delay }: { value: string; label: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.8 }}
    className="relative p-8 rounded-lg bg-[#1c1917] border border-[#44403c] text-center group"
  >
    {/* Stone Texture Overlay */}
    <div className="absolute inset-0 bg-stone-texture opacity-50 mix-blend-overlay rounded-lg pointer-events-none" />

    {/* Engraved Effect */}
    <div className="relative z-10">
      <h4 className="text-5xl md:text-6xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-b from-[#fbbf24] to-[#d97706] drop-shadow-sm filter">
        {value}
      </h4>
      <p className="text-slate-400 font-serif uppercase tracking-widest text-sm group-hover:text-[#fbbf24] transition-colors">
        {label}
      </p>
    </div>

    {/* Border Glow */}
    <div className="absolute inset-0 border border-[#fbbf24]/0 group-hover:border-[#fbbf24]/30 rounded-lg transition-colors duration-500" />
  </motion.div>
);

// --- MAIN PAGE ---

export default function Home() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.8]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouse({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <main ref={containerRef} className="bg-obsidian min-h-screen selection:bg-amber-500/30">

      {/* 3D Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Canvas gl={{ antialias: true, alpha: true }}>
          <Suspense fallback={null}>
            <AncientArtifacts mouse={mouse} />
          </Suspense>
        </Canvas>
      </div>

      {/* Floating Dust Particles (CSS Animation) */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-amber-500 rounded-full animate-float blur-[1px]" />
        <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-amber-300 rounded-full animate-float blur-[1px] delay-700" />
        <div className="absolute bottom-1/4 left-1/2 w-3 h-3 bg-purple-500 rounded-full animate-float blur-[2px] delay-1000" />
      </div>

      {/* HERO SECTION - "THE TEMPLE ENTRANCE" */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 pt-20">
        <motion.div
          style={{ opacity, scale }}
          className="text-center max-w-6xl mx-auto"
        >
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="mb-8 inline-block"
          >
            <span className="px-6 py-2 rounded-full border border-amber-500/30 bg-amber-950/30 text-amber-400 text-sm font-bold tracking-[0.3em] uppercase backdrop-blur-md">
              The 8th Wonder of Code
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 1 }}
            className="text-7xl md:text-9xl font-black mb-6 tracking-tighter"
          >
            <span className="text-white drop-shadow-2xl">CODE</span>
            <br />
            <span className="text-gold-gradient drop-shadow-glow">ARCHAEOLOGIST</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="text-xl md:text-3xl text-slate-300 mb-12 font-light max-w-3xl mx-auto leading-relaxed"
          >
            Unearth the <span className="text-amber-400 font-serif italic">Lost Knowledge</span> of Your Codebase.
            <br />
            <span className="text-base text-slate-500 mt-4 block font-sans">
              Gemini 2.0 • Kestra Agents • RL Fine-Tuning
            </span>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-6 justify-center items-center"
          >
            <Link href="/excavate">
              <button className="group relative px-10 py-5 bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl overflow-hidden shadow-lg hover:shadow-amber-500/40 transition-all duration-300 transform hover:scale-105">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
                <span className="relative z-10 flex items-center gap-3 text-white font-bold text-lg tracking-wide">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  BEGIN EXCAVATION
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </Link>

            <Link href="https://github.com/Harsh8818198/code-archaeologist" target="_blank">
              <button className="px-10 py-5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md text-white font-semibold text-lg hover:bg-white/10 transition-all flex items-center gap-3">
                <Github className="w-5 h-5" />
                View Artifacts
              </button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-500"
        >
          <span className="text-xs uppercase tracking-widest">Descend</span>
          <div className="w-[1px] h-16 bg-gradient-to-b from-amber-500/0 via-amber-500 to-amber-500/0" />
        </motion.div>
      </section>

      {/* FEATURES - "THE DISCOVERY CHAMBERS" */}
      <section className="relative z-10 py-32 bg-gradient-to-b from-transparent to-[#0a0a0a]">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4 font-serif text-slate-200">The Discovery Chambers</h2>
            <div className="h-1 w-24 bg-gradient-to-r from-transparent via-amber-500 to-transparent mx-auto" />
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            <FeatureCard
              title="Hall of Commits"
              description="Deep archaeological excavation of your git history. Uncover the timeline of decisions, authors, and code evolution."
              icon={Scroll}
              color="blue"
              delay={0.2}
            />
            <FeatureCard
              title="The Oracle Chamber"
              description="Gemini 2.0 Flash synthesis engine. Ask questions and receive ancient wisdom about your codebase architecture."
              icon={Brain}
              color="purple"
              delay={0.4}
            />
            <FeatureCard
              title="The Map Room"
              description="Interactive 3D Knowledge Graph. Visualize the complex web of relationships between files, functions, and developers."
              icon={Map}
              color="green"
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* TECH STACK - "THE INFINITY STONES" */}
      <section className="relative z-10 py-32 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-24"
          >
            <span className="text-amber-500 font-bold tracking-[0.3em] text-sm uppercase">Powered by</span>
            <h2 className="text-4xl md:text-6xl font-black mt-2 text-white">THE INFINITY STONES</h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 md:gap-12 max-w-6xl mx-auto place-items-center">
            <StoneBadge name="Cline" icon="🔮" color="from-blue-600 to-cyan-500" delay={0.1} />
            <StoneBadge name="Kestra" icon="⚡" color="from-purple-600 to-fuchsia-500" delay={0.2} />
            <StoneBadge name="Oumi" icon="🧠" color="from-emerald-600 to-green-500" delay={0.3} />
            <StoneBadge name="Gemini" icon="✨" color="from-amber-500 to-yellow-400" delay={0.4} />
            <StoneBadge name="CodeRabbit" icon="🐰" color="from-red-600 to-rose-500" delay={0.5} />
            <StoneBadge name="Vercel" icon="▲" color="from-slate-600 to-slate-400" delay={0.6} />
          </div>
        </div>
      </section>

      {/* STATS - "THE ANCIENT TABLETS" */}
      <section className="relative z-10 py-32 bg-[#0f0f0f]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <StatTablet value="6" label="Divine Technologies" delay={0.2} />
            <StatTablet value="100%" label="RL Fine-Tuned" delay={0.4} />
            <StatTablet value="Real-time" label="Analysis Speed" delay={0.6} />
            <StatTablet value="∞" label="Knowledge Found" delay={0.8} />
          </div>
        </div>
      </section>

      {/* FINAL CTA - "THE TREASURE" */}
      <section className="relative z-10 py-40 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/20 via-[#0a0a0a] to-[#0a0a0a]" />

        <div className="container mx-auto px-4 relative text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto p-12 rounded-3xl bg-slate-900/50 backdrop-blur-xl border border-amber-500/20 shadow-2xl relative overflow-hidden group"
          >
            {/* Treasure Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/30 blur-[100px]" />

            <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform duration-500">⚱️</div>

            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-serif">
              The Treasure Awaits
            </h2>
            <p className="text-xl text-slate-400 mb-10">
              Your codebase contains lost treasures and forgotten decisions.
              <br />What secrets will you uncover today?
            </p>

            <Link href="/excavate">
              <button className="px-12 py-6 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full text-white text-xl font-bold shadow-[0_0_40px_rgba(245,158,11,0.4)] hover:shadow-[0_0_60px_rgba(245,158,11,0.6)] hover:scale-105 transition-all duration-300">
                Start Your Expedition
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 border-t border-white/5 bg-[#050505] text-center">
        <p className="text-slate-600 text-sm">
          Crafted with 🧡 by <span className="text-amber-500">Code Archaeologist Team</span> • Infinity Stones Hackathon 2024
        </p>
      </footer>

    </main>
  );
}
