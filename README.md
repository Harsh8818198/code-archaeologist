# 🏛️ The Temporal Code Archaeologist

> Solving the "Why Does This Code Exist?" Crisis  
> **AI Agents Assemble Hackathon 2025**

[![Live Demo](https://img.shields.io/badge/Demo-Live-success)](https://code-archaeologist-79z0uewbj-harsh8818198s-projects.vercel.app/)
[![API Status](https://img.shields.io/badge/API-Online-success)](http://localhost:3001/health)
[![CodeRabbit](https://img.shields.io/badge/CodeRabbit-Active-purple)](https://coderabbit.ai)

## 🎯 Hackathon Prize Categories

This project qualifies for:

- ✅ **Infinity Build Award** ($10,000) - Full-stack AI agent system using Cline-inspired architecture + Kestra + Vercel
- ✅ **Visionary Intelligence Award** ($3,000) - Google Gemini 1.5 Pro + Oumi fine-tuning infrastructure
- ✅ **Captain Code Award** ($2,000) - CodeRabbit automated code review

**Total Potential: $15,000**

---

## 🌟 The Infinity Stones Architecture

| Stone | Role | Status | Technology |
|-------|------|--------|------------|
| 🔵 **Excavator Agent** | The Builder | ✅ Complete | TypeScript + Gemini |
| 🟡 **Gemini** | The Synthesis Engine | ✅ Active | Google Gemini 1.5 Pro (2M context) |
| 🟣 **Kestra** | The Orchestrator | ✅ Running | Declarative workflows |
| 🟠 **Oumi** | The Context Distiller | ⚙️ Configured | LoRA fine-tuning ready |
| 🟢 **Vercel** | The Living Museum | ✅ Deployed | Next.js 14 + Tailwind |
| 🔴 **CodeRabbit** | The Quality Gate | ✅ Active | Automated PR reviews |

---

## 🚀 Live Demo

- **Frontend**: [https://code-archaeologist-79z0uewbj-harsh8818198s-projects.vercel.app/]
- **API**: http://localhost:3001
- **Kestra UI**: http://localhost:8080
- **Sample Analysis**: [archaeological-report.json](./archaeological-report.json)

---

## 💡 The Problem We're Solving

Every engineering team faces **"archaeological debt"**:
- Code that works perfectly but no one understands WHY it exists
- Lost tribal knowledge when engineers leave
- Hours wasted reverse-engineering decisions
- Fear of refactoring due to unknown dependencies

**Cost**: $100B+ annually in wasted developer time (Source: Stripe Developer Coefficient)

---

## 🛠️ The Solution

Code Archaeologist reconstructs the complete historical context of your codebase by analyzing:

✅ Git commit history and diffs  
✅ Author contributions and patterns  
✅ Code complexity metrics  
✅ Dependency relationships  
✅ Business context extraction (AI-powered)

---

## ⚡ Quick Start

### Prerequisites
```bash
# Required
- Node.js 20+
- Python 3.11+
- Docker (for Kestra)
- Google AI API Key (https://aistudio.google.com/)

# Optional (for full features)
- GitHub Personal Access Token
- Vercel account
```

### Installation
```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/code-archaeologist
cd code-archaeologist

# 2. Install dependencies
pnpm install

# 3. Configure environment
cp .env.example .env
# Edit .env and add your GOOGLE_AI_API_KEY

# 4. Test setup
pnpm run test:gemini

# 5. Start services
docker compose -f ~/kestra/docker-compose.yml up -d  # Kestra
pnpm run start  # API server (port 3001)

# 6. Run excavation
pnpm run excavate /path/to/your/repo
```

---

## 📖 Usage

### Command Line
```bash
# Basic excavation
pnpm run excavate /path/to/repo

# With options
pnpm run excavate . --max-files=20 -v

# Interactive file selection
pnpm run excavate . -i

# Skip AI analysis (faster, for testing)
pnpm run excavate . --skip-ai

# Interactive query mode
pnpm run query /path/to/repo
```

### REST API
```bash
# Start excavation
curl -X POST http://localhost:3001/api/excavate \
  -H "Content-Type: application/json" \
  -d '{"repoPath": "/path/to/repo", "options": {"maxFiles": 10}}'

# Check job status
curl http://localhost:3001/api/jobs/{jobId}

# Get report
curl http://localhost:3001/api/jobs/{jobId}/report
```

### Web UI

Visit [https://code-archaeologist-79z0uewbj-harsh8818198s-projects.vercel.app/]/excavate and paste a repository path or GitHub URL.

---

## 🏗️ Architecture
````
┌─────────────────────────────────────────────────────────────┐
│                    Vercel Frontend (Next.js)                │
│                 https://your-project.vercel.app             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ HTTP/REST
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    REST API Server (Node.js)                │
│                     Port 3001                               │
│  Routes: /api/excavate, /api/jobs, /api/jobs/:id/report     │
└─────────┬─────────────────────────────────┬─────────────────┘
          │                                 │
          │                                 │
    ┌─────▼─────┐                     ┌──────▼──────┐
    │  Excavator │                    │   Kestra    │
    │   Agent    │                    │ Orchestrator│
    │(TypeScript)│                    │  Port 8080  │
    └─────┬──────┘                    └──────┬──────┘
          │                                  │
          │                                  │
    ┌─────▼──────────────────────────────────▼──────┐
    │           Gemini Synthesis Engine              │
    │         (Google Gemini 2.5 Flash)              │
    │         2M token context window                │
    └───────────────────┬────────────────────────────┘
                        │
                        │
              ┌─────────▼─────────┐
              │  Git Repository   │
              │   simple-git      │
              └───────────────────┘

📊 Example Output
json{
  "summary": {
    "totalFiles": 127,
    "analyzedFiles": 20,
    "totalCommits": 543,
    "uniqueAuthors": 8
  },
  "files": [
    {
      "path": "src/auth/session.ts",
      "analysis": {
        "summary": "JWT session validation with legacy user support",
        "businessContext": "Supports both modern tokens and pre-2020 legacy users during migration period",
        "technicalRationale": "Added token length validation after SEC-2024-001 security audit",
        "risks": [
          "Removing legacy check would lock out 15% of active users"
        ],
        "recommendations": [
          "Document migration timeline for legacy token deprecation",
          "Add monitoring for legacy token usage rates"
        ],
        "confidenceScore": 0.92
      }
    }
  ],
  "insights": {
    "businessDomains": ["authentication", "payments", "api"],
    "hotspots": ["src/auth/session.ts (47 commits)"],
    "riskAreas": ["High complexity in src/lib/parser.ts"]
  }
}
````

---

## 🎓 How It Works

1. **Discovery Phase**
   - Scans repository for source files
   - Extracts git commit history

2. **Analysis Phase**
   - For each file:
     - Calculates complexity metrics
     - Extracts definitions and imports
     - Gets commit history with diffs
     - Sends to Gemini for context analysis

3. **Synthesis Phase**
   - Builds knowledge graph of relationships
   - Identifies business domains
   - Extracts technical debt and risks
   - Finds code hotspots

4. **Output Phase**
   - Generates JSON report
   - Creates visual knowledge graph (future)
   - Stores in Kestra for long-term tracking

---

## 🔧 Tech Stack Details

### Frontend (Vercel)
- **Next.js 14** - App Router architecture
- **Tailwind CSS** - Utility-first styling
- **TypeScript** - Type safety
- **Vercel AI SDK** - Future: streaming AI responses

### Backend (API Server)
- **Node.js 20** - Runtime
- **TypeScript** - Type safety
- **simple-git** - Git operations
- **Gemini SDK** - AI analysis

### AI (Gemini)
- **Model**: gemini-2.5-flash
- **Context Window**: 2M tokens (analyze entire repos)
- **Multimodal**: Can analyze UI screenshots with code
- **Cost**: Generous free tier

### Orchestration (Kestra)
- **Declarative YAML** workflows
- **Event-driven** triggers
- **State persistence** across days
- **Human-in-the-loop** support

### Quality (CodeRabbit)
- **Automated PR reviews**
- **Custom review rules**
- **Configurable tone**
- **Security scanning**

---

## 🎯 Roadmap

### Completed ✅
- [x] Core excavator agent
- [x] Gemini integration
- [x] REST API
- [x] Vercel deployment
- [x] CodeRabbit setup
- [x] Kestra workflows
- [x] Oumi training infrastructure

### In Progress 🚧
- [ ] Knowledge graph visualization (D3.js)
- [ ] Real-time streaming to frontend
- [ ] GitHub integration (analyze repos directly)

### Future 🔮
- [ ] VS Code extension
- [ ] Slack bot for queries
- [ ] Team analytics dashboard
- [ ] Custom model deployment

---

## 📸 Screenshots

[Add screenshots of your frontend, API responses, and Kestra workflows]

---

## 🏆 Hackathon Submission Checklist

- [x] Uses Gemini for AI analysis
- [x] Deployed to Vercel
- [x] CodeRabbit active on repository
- [x] Kestra workflows configured
- [x] Oumi training infrastructure ready
- [x] Comprehensive README
- [x] Live demo accessible
- [ ] Demo video recorded
- [ ] Submission form completed

---

## 🤝 Contributing

This is a hackathon project, but contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Open a Pull Request (CodeRabbit will review!)

---

## 📄 License

MIT License - see [LICENSE](./LICENSE)

---

## 👥 Team

Built for AI Agents Assemble Hackathon 2025

- **Your Name** - [GitHub](https://github.com/Harsh8818198)

---

## 🙏 Acknowledgments

- **Google Gemini** - Incredible 2M token context window
- **Anthropic** - Claude/Cline inspiration
- **Kestra** - Best orchestration tool
- **Vercel** - Seamless deployment
- **CodeRabbit** - Keeping code quality high

---

**⭐ Star this repo if you find it useful!**
