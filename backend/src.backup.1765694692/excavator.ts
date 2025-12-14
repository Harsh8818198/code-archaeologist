// backend/src/excavator.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  ExcavationResult,
  ArchaeologicalLayer,
  FossilizedPattern,
  KnowledgeGap,
  Recommendation,
  GraphData,
  GraphNode,
  GraphEdge
} from './lib/redis';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface ExcavationOptions {
  maxCommits?: number;
  incremental?: boolean;
  onProgress?: (progress: number, step: string) => Promise<void>;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
  }>;
}

export async function excavateRepository(
  repoUrl: string,
  options: ExcavationOptions = {}
): Promise<ExcavationResult> {
  const { maxCommits = 100, onProgress } = options;

  // Extract owner/repo from URL
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) throw new Error('Invalid GitHub URL');
  const [, owner, repo] = match;

  // Fetch commits from GitHub API
  await onProgress?.(10, 'Fetching commit history from GitHub...');
  const commits = await fetchCommits(owner, repo, maxCommits);

  // Analyze with Gemini
  await onProgress?.(30, 'Analyzing commit patterns with AI...');
  const analysis = await analyzeCommitsWithGemini(commits, owner, repo);

  // Generate archaeological layers
  await onProgress?.(50, 'Generating archaeological layers...');
  const layers = generateArchaeologicalLayers(commits);

  // Detect fossilized patterns
  await onProgress?.(65, 'Detecting fossilized patterns...');
  const patterns = analysis.fossilizedPatterns;

  // Identify knowledge gaps
  await onProgress?.(80, 'Identifying knowledge gaps...');
  const gaps = analysis.knowledgeGaps;

  // Generate recommendations
  await onProgress?.(90, 'Generating recommendations...');
  const recommendations = analysis.recommendations;

  // Build knowledge graph
  await onProgress?.(95, 'Building knowledge graph...');
  const graphData = buildKnowledgeGraph(commits, patterns, layers);

  return {
    repoUrl,
    analyzedAt: new Date().toISOString(),
    totalCommits: commits.length,
    totalFiles: countUniqueFiles(commits),
    archaeologicalLayers: layers,
    fossilizedPatterns: patterns,
    knowledgeGaps: gaps,
    recommendations,
    graphData,
  };
}

async function fetchCommits(
  owner: string,
  repo: string,
  maxCommits: number
): Promise<GitHubCommit[]> {
  const commits: GitHubCommit[] = [];
  let page = 1;
  const perPage = Math.min(maxCommits, 100);

  while (commits.length < maxCommits) {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=${perPage}&page=${page}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': process.env.GITHUB_TOKEN ? `token ${process.env.GITHUB_TOKEN}` : '',
          'User-Agent': 'Temporal-Archaeologist',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 403) {
        console.warn('GitHub API rate limit reached');
        break;
      }
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const data = await response.json() as GitHubCommit[];
    if (data.length === 0) break;

    commits.push(...data);
    page++;

    if (data.length < perPage) break;
  }

  return commits.slice(0, maxCommits);
}

async function analyzeCommitsWithGemini(
  commits: GitHubCommit[],
  owner: string,
  repo: string
): Promise<{
  fossilizedPatterns: FossilizedPattern[];
  knowledgeGaps: KnowledgeGap[];
  recommendations: Recommendation[];
}> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  // Prepare commit summary for analysis
  const commitSummary = commits.slice(0, 50).map(c => ({
    sha: c.sha.substring(0, 7),
    message: c.commit.message.substring(0, 200),
    author: c.commit.author.name,
    date: c.commit.author.date,
  }));

  const prompt = `You are a Code Archaeologist analyzing a GitHub repository's commit history.

Repository: ${owner}/${repo}

Recent commits (last 50):
${JSON.stringify(commitSummary, null, 2)}

Analyze this commit history and identify:

1. **Fossilized Patterns**: Dead code, legacy patterns, abandoned features, or cargo-cult code
2. **Knowledge Gaps**: Missing documentation, unclear purpose, tribal knowledge, bus factor risks
3. **Recommendations**: Prioritized actions for documentation, refactoring, testing, or cleanup

Return your analysis as JSON in this exact format:
{
  "fossilizedPatterns": [
    {
      "id": "pattern-1",
      "type": "dead-code|legacy-pattern|abandoned-feature|cargo-cult",
      "location": "file or area path",
      "description": "what is this pattern",
      "lastTouched": "ISO date",
      "riskLevel": "low|medium|high|critical",
      "suggestedAction": "what to do"
    }
  ],
  "knowledgeGaps": [
    {
      "id": "gap-1",
      "file": "file path",
      "type": "missing-docs|unclear-purpose|tribal-knowledge|bus-factor",
      "severity": "low|medium|high",
      "description": "what is the gap",
      "affectedAreas": ["area1", "area2"]
    }
  ],
  "recommendations": [
    {
      "id": "rec-1",
      "priority": 1,
      "category": "documentation|refactoring|testing|cleanup",
      "title": "short title",
      "description": "detailed description",
      "estimatedEffort": "1 hour|1 day|1 week|1 month",
      "impact": "low|medium|high"
    }
  ]
}

Be specific and actionable. Base your analysis on actual patterns you see in the commits.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return {
      fossilizedPatterns: analysis.fossilizedPatterns || [],
      knowledgeGaps: analysis.knowledgeGaps || [],
      recommendations: analysis.recommendations || [],
    };
  } catch (error) {
    console.error('Gemini analysis error:', error);
    // Return empty results on error
    return {
      fossilizedPatterns: [],
      knowledgeGaps: [],
      recommendations: [{
        id: 'rec-1',
        priority: 1,
        category: 'documentation',
        title: 'Add repository documentation',
        description: 'Could not perform full analysis. Consider adding a comprehensive README.',
        estimatedEffort: '1 day',
        impact: 'high',
      }],
    };
  }
}

function generateArchaeologicalLayers(commits: GitHubCommit[]): ArchaeologicalLayer[] {
  if (commits.length === 0) return [];

  // Group commits by time periods
  const sortedCommits = [...commits].sort(
    (a, b) => new Date(a.commit.author.date).getTime() - new Date(b.commit.author.date).getTime()
  );

  const layers: ArchaeologicalLayer[] = [];
  const layerSize = Math.ceil(commits.length / 5); // 5 layers max

  for (let i = 0; i < sortedCommits.length; i += layerSize) {
    const layerCommits = sortedCommits.slice(i, i + layerSize);
    if (layerCommits.length === 0) continue;

    const contributors = [...new Set(layerCommits.map(c => c.commit.author.name))];
    const startDate = layerCommits[0].commit.author.date;
    const endDate = layerCommits[layerCommits.length - 1].commit.author.date;

    // Determine layer name based on time
    const layerIndex = Math.floor(i / layerSize);
    const layerNames = ['Foundation', 'Early Development', 'Growth', 'Maturation', 'Recent'];

    // Calculate sentiment based on commit frequency and patterns
    const daySpan = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
    const commitsPerDay = layerCommits.length / Math.max(daySpan, 1);
    const sentiment: 'active' | 'stable' | 'declining' =
      commitsPerDay > 1 ? 'active' :
      commitsPerDay > 0.1 ? 'stable' : 'declining';

    layers.push({
      id: `layer-${layerIndex}`,
      name: layerNames[layerIndex] || `Layer ${layerIndex + 1}`,
      dateRange: { start: startDate, end: endDate },
      commits: layerCommits.length,
      keyChanges: extractKeyChanges(layerCommits),
      contributors,
      sentiment,
    });
  }

  return layers.reverse(); // Most recent first
}

function extractKeyChanges(commits: GitHubCommit[]): string[] {
  const changes: string[] = [];

  for (const commit of commits.slice(0, 10)) {
    const message = commit.commit.message.split('\n')[0];
    if (message.length > 10 && !message.toLowerCase().includes('merge')) {
      changes.push(message.substring(0, 100));
    }
    if (changes.length >= 5) break;
  }

  return changes;
}

function countUniqueFiles(commits: GitHubCommit[]): number {
  const files = new Set<string>();
  for (const commit of commits) {
    for (const file of commit.files || []) {
      files.add(file.filename);
    }
  }
  return files.size || commits.length; // Fallback if no file data
}

function buildKnowledgeGraph(
  commits: GitHubCommit[],
  patterns: FossilizedPattern[],
  layers: ArchaeologicalLayer[]
): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeIds = new Set<string>();

  // Add layer nodes
  for (const layer of layers) {
    const layerId = `layer:${layer.id}`;
    nodes.push({
      id: layerId,
      type: 'file', // Using file type for visualization
      label: layer.name,
      metadata: {
        commits: layer.commits,
        sentiment: layer.sentiment,
        dateRange: layer.dateRange,
      },
    });
    nodeIds.add(layerId);
  }

  // Add author nodes and connect to layers
  const authorsByLayer: Map<string, Set<string>> = new Map();

  for (const commit of commits) {
    const author = commit.commit.author.name;
    const authorId = `author:${author.replace(/\s+/g, '-').toLowerCase()}`;

    if (!nodeIds.has(authorId)) {
      nodes.push({
        id: authorId,
        type: 'author',
        label: author,
        metadata: { email: commit.commit.author.email },
      });
      nodeIds.add(authorId);
    }

    // Find which layer this commit belongs to
    for (const layer of layers) {
      const commitDate = new Date(commit.commit.author.date);
      const layerStart = new Date(layer.dateRange.start);
      const layerEnd = new Date(layer.dateRange.end);

      if (commitDate >= layerStart && commitDate <= layerEnd) {
        const layerId = `layer:${layer.id}`;
        const edgeId = `${authorId}->${layerId}`;

        if (!authorsByLayer.has(edgeId)) {
          authorsByLayer.set(edgeId, new Set());
          edges.push({
            source: authorId,
            target: layerId,
            type: 'authored-by',
            weight: 1,
          });
        }
        break;
      }
    }
  }

  // Add pattern nodes
  for (const pattern of patterns) {
    const patternId = `pattern:${pattern.id}`;
    nodes.push({
      id: patternId,
      type: 'pattern',
      label: pattern.description.substring(0, 50),
      metadata: {
        type: pattern.type,
        riskLevel: pattern.riskLevel,
        location: pattern.location,
      },
    });
    nodeIds.add(patternId);

    // Connect patterns to the most recent layer
    if (layers.length > 0) {
      edges.push({
        source: patternId,
        target: `layer:${layers[0].id}`,
        type: 'related-to',
        weight: pattern.riskLevel === 'critical' ? 3 :
               pattern.riskLevel === 'high' ? 2 : 1,
      });
    }
  }

  return { nodes, edges };
}
