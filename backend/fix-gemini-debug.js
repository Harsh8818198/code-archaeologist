const fs = require('fs');

let content = fs.readFileSync('src/lib/gemini-client.ts', 'utf8');

// Find the exact pattern
const oldCode = `    const raw = await this.generate(prompt);
    return this.parseJson(raw);`;

const newCode = `    const raw = await this.generate(prompt);
    
    // DEBUG
    console.log("DEBUG RAW:", raw.substring(0, 400));
    const parsed = this.parseJson(raw);
    console.log("DEBUG PARSED:", JSON.stringify(parsed).substring(0, 300));
    
    return parsed;`;

content = content.replace(oldCode, newCode);

fs.writeFileSync('src/lib/gemini-client.ts', content);
console.log('✅ Fixed!');
