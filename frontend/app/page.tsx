import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text">
            🏛️ Code Archaeologist
          </h1>
          <p className="text-2xl text-slate-300 mb-4">
            Uncover the &quot;Why&quot; Behind Every Line of Code
          </p>
          <p className="text-lg text-slate-400 mb-12">
            AI-powered analysis that reconstructs the historical context and decisions behind your codebase.
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              href="/excavate"
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all"
            >
              Start Excavation →
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
          <FeatureCard
            icon="🔍"
            title="Deep Analysis"
            description="Analyze git history, code patterns, and commit messages"
          />
          <FeatureCard
            icon="🧠"
            title="AI Synthesis"
            description="Gemini 2.5 reconstructs business context and decisions"
          />
          <FeatureCard
            icon="📊"
            title="Knowledge Graph"
            description="Visualize relationships between code, authors, and decisions"
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
  );
}
