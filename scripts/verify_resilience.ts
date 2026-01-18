import { GeminiChat } from '../packages/core/src/core/geminiChat';
import { Config } from '../packages/core/src/config/config';
import * as fs from 'fs';
import * as path from 'path';

async function runVerification() {
  console.log('Starting Resilience Verification...');

  const logPath = path.join(process.cwd(), 'Omni', 'api_errors.log');
  if (fs.existsSync(logPath)) {
    fs.unlinkSync(logPath);
  }

  const config = new Config({
    sessionId: 'verify-session',
    targetDir: process.cwd(),
  });

  // Mock a 400 error
  const mockError = new Error('Simulated 400 Bad Request');
  (mockError as any).status = 400;
  (mockError as any).response = {
    data: { error: { message: 'Mismatched parts or something' } },
    headers: { 'x-debug-id': '12345' }
  };

  const mockContentGenerator = {
    generateContentStream: async () => {
      throw mockError;
    }
  };

  (config as any).getContentGenerator = () => mockContentGenerator;

  const chat = new GeminiChat(config);
  
  try {
    const stream = await chat.sendMessageStream(
      { model: 'gemini-2.0-flash' },
      'Trigger error',
      'verify-prompt',
      new AbortController().signal
    );
    for await (const _ of stream) {}
  } catch (e) {
    console.log('Caught expected error:', (e as any).name);
  }

  if (fs.existsSync(logPath)) {
    const logContent = fs.readFileSync(logPath, 'utf8');
    console.log('Log file created successfully.');
    if (logContent.includes('Simulated 400 Bad Request') && logContent.includes('Conversation History Snapshot')) {
      console.log('Log content verified: Contains error message and history snapshot.');
    } else {
      console.error('Log content verification failed!');
      process.exit(1);
    }
  } else {
    console.error('Log file was not created!');
    process.exit(1);
  }

  console.log('Verification Complete!');
}

runVerification().catch(err => {
  console.error(err);
  process.exit(1);
});
