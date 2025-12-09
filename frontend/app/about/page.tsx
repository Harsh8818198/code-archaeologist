export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-20 max-w-4xl">
        <h1 className="text-5xl font-bold mb-8">About This Project</h1>

        <div className="prose prose-invert prose-lg">
          <h2 className="text-3xl font-semibold mt-8 mb-4">The Problem</h2>
          <p className="text-slate-300 mb-6">
            Every engineering team faces "archaeological debt" - code that works but no one understands WHY it exists. 
            This costs billions annually in wasted developer time.
          </p>

          <h2 className="text-3xl font-semibold mt-8 mb-4">The Solution</h2>
          <p className="text-slate-300 mb-6">
            Code Archaeologist reconstructs the historical context of every line of code by analyzing:
          </p>
          <ul className="list-disc list-inside text-slate-300 space-y-2 mb-6">
            <li>Git commit history and diffs</li>
            <li>Pull request descriptions</li>
            <li>Code patterns and dependencies</li>
            <li>Author contributions</li>
          </ul>

          <h2 className="text-3xl font-semibold mt-8 mb-4">The Tech Stack</h2>
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <TechCard 
              name="Google Gemini 1.5 Pro"
              role="AI Analysis Engine"
              description="2M token context window for analyzing entire repositories"
            />
            <TechCard 
              name="Vercel"
              role="Frontend & Deployment"
              description="Next.js application with serverless functions"
            />
            <TechCard 
              name="Kestra"
              role="Workflow Orchestration"
              description="Manages long-running excavation processes"
            />
            <TechCard 
              name="Oumi"
              role="Custom Model Training"
              description="Fine-tune specialized models for code understanding"
            />
            <TechCard 
              name="CodeRabbit"
              role="Quality Enforcement"
              description="Automated code review and standards enforcement"
            />
            <TechCard 
              name="TypeScript"
              role="Core Language"
              description="Type-safe development with modern tooling"
            />
          </div>
        </div>
      </div>
    </main>
  );
}

function TechCard({ name, role, description }: { name: string; role: string; description: string }) {
  return (
    <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
      <h3 className="text-lg font-semibold text-white">{name}</h3>
      <p className="text-sm text-purple-400 mb-2">{role}</p>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}
