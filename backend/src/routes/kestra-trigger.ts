import axios from 'axios';

const KESTRA_URL = process.env.KESTRA_URL || 'http://localhost:8080';
const USE_KESTRA = process.env.USE_KESTRA === 'true';

export async function triggerKestraWorkflow(
  repoUrl: string, 
  options: any
): Promise<string | null> {
  if (!USE_KESTRA) {
    console.log('ℹ️  Kestra orchestration disabled (USE_KESTRA=false)');
    return null;
  }

  try {
    const response = await axios.post(
      `${KESTRA_URL}/api/v1/executions/webhook/code-archaeologist/excavation-workflow/excavate-trigger`,
      {
        repo_url: repoUrl,
        max_files: options.maxFiles || 10,
        callback_url: process.env.API_URL || 'http://localhost:3001'
      },
      { timeout: 5000 }
    );

    console.log('✅ Kestra workflow triggered:', response.data.id);
    return response.data.id;
    
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.warn('⚠️  Kestra not reachable, using local processing');
    } else {
      console.error('Kestra trigger error:', error.message);
    }
    return null;
  }
}
