import { GeminiSynthesisEngine } from "./gemini-client.js";
import { simpleGit } from "simple-git";
import * as fs from "fs";
import { config } from "dotenv";

config();

async function main() {
  const repoPath = process.argv[2] || process.cwd();
  const outputPath = "./training-data.jsonl";

  console.log("📚 Generating Training Data");
  console.log("═".repeat(40));

  const git = simpleGit(repoPath);
  const gemini = new GeminiSynthesisEngine();
  await gemini.initialize();

  const log = await git.log({ maxCount: 20 });
  const commits = log.all;

  console.log(`Found ${commits.length} commits\n`);

  const trainingData: Array<{ messages: Array<{ role: string; content: string }> }> = [];

  for (let i = 0; i < commits.length; i++) {
    const c = commits[i];
    
    try {
      const prompt = `Explain the business context for this commit: "${c.message}" by ${c.author_name}. Give a 2-3 sentence explanation.`;
      const response = await gemini.generate(prompt);
      
      trainingData.push({
        messages: [
          { role: "user", content: `Explain the business context for this code change: ${c.message}` },
          { role: "assistant", content: response.trim() }
        ]
      });
      
      console.log(`Processed commit ${i + 1}/${commits.length}`);
    } catch (e) {
      console.log(`Commit ${i + 1} failed, skipping`);
    }

    await new Promise(r => setTimeout(r, 1500));
  }

  const jsonl = trainingData.map(d => JSON.stringify(d)).join("\n");
  fs.writeFileSync(outputPath, jsonl);

  console.log(`\n✅ Generated ${trainingData.length} examples`);
  console.log(`📄 Saved to: ${outputPath}`);
}

main().catch(console.error);
