import axios from 'axios';

const KESTRA_URL = process.env.KESTRA_URL || 'http://localhost:8080';
const CALLBACK_URL = process.env.CALLBACK_URL || 'http://host.docker.internal:3001';

export class KestraClient {
  async isAvailable(): Promise<boolean> {
    try {
      const res = await axios.get(`${KESTRA_URL}/api/v1/flows`, { timeout: 3000 });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  async triggerExcavation(jobId: string, repoUrl: string, maxFiles: number = 10) {
    try {
      const webhookUrl = `${KESTRA_URL}/api/v1/executions/webhook/code-archaeologist/excavation/excavate`;

      const response = await axios.post(webhookUrl, {
        jobId,
        repoUrl,
        maxFiles,
        callbackUrl: CALLBACK_URL
      }, { timeout: 10000 });

      return { success: true, executionId: response.data?.id };
    } catch (error: any) {
      console.error('Kestra trigger failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

let instance: KestraClient | null = null;
export function getKestraClient() {
  if (!instance) instance = new KestraClient();
  return instance;
}
