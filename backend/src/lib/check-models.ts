import "dotenv/config";

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

if (!API_KEY) {
  console.error("❌ Missing API key");
  process.exit(1);
}

interface Model {
  name: string;
  supportedGenerationMethods?: string[];
}

interface ModelsResponse {
  models: Model[];
}

async function checkModels() {
  console.log("🔍 Fetching available Gemini models...\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`
  );

  const data = await response.json() as ModelsResponse;

  console.log("📋 All Models:");
  for (const model of data.models) {
    const methods = model.supportedGenerationMethods?.join(", ") || "none";
    console.log(`  - ${model.name}`);
    console.log(`    Methods: ${methods}\n`);
  }

  console.log("\n✅ Models supporting generateContent:");
  const generativeModels = data.models.filter(
    (m) => m.supportedGenerationMethods?.includes("generateContent")
  );

  if (generativeModels.length === 0) {
    console.log("  ❌ None found!");
  } else {
    generativeModels.forEach((m) => console.log(`  - ${m.name}`));
  }
}

checkModels().catch(console.error);
