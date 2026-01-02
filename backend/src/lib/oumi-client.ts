import { spawn } from 'child_process';
import * as path from 'path';

export class OumiClient {
  private modelPath: string;
  private venvPath: string;

  constructor() {
    this.modelPath = path.join(process.cwd(), '../oumi-training/output/archaeologist-model');
    this.venvPath = path.join(process.cwd(), '../oumi-training/venv');
  }

  async isModelAvailable(): Promise<boolean> {
    const fs = await import('fs');
    return fs.existsSync(this.modelPath);
  }

  async analyzeWithOumi(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      // Python script to use the trained model
      const pythonScript = `
import sys
sys.path.insert(0, '${this.venvPath}/lib/python3.11/site-packages')

from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import torch

base_model = "Qwen/Qwen2.5-1.5B-Instruct"
adapter_path = "${this.modelPath}"

tokenizer = AutoTokenizer.from_pretrained(base_model, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(base_model, trust_remote_code=True, torch_dtype=torch.float16)
model = PeftModel.from_pretrained(model, adapter_path)

prompt = """${prompt.replace(/"/g, '\\"')}"""
inputs = tokenizer(prompt, return_tensors="pt")
outputs = model.generate(**inputs, max_new_tokens=500)
print(tokenizer.decode(outputs[0], skip_special_tokens=True))
`;

      const python = spawn('python3', ['-c', pythonScript]);
      let output = '';
      let error = '';

      python.stdout.on('data', (data) => { output += data.toString(); });
      python.stderr.on('data', (data) => { error += data.toString(); });
      
      python.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(error));
        }
      });
    });
  }
}

export const oumiClient = new OumiClient();
