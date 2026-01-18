import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiChat } from './geminiChat';
import { Config } from '../config/config';
import { OmniLogger } from '../utils/omniLogger';

vi.mock('../utils/omniLogger');
vi.mock('../telemetry/loggers');
vi.mock('../utils/retry', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    retryWithBackoff: vi.fn().mockImplementation((fn) => fn()), // No retries for test
  };
});

describe('GeminiChat Resilience Integration', () => {
  let chat: any;
  let mockContentGenerator: any;
  let config: Config;

  beforeEach(() => {
    vi.clearAllMocks();
    mockContentGenerator = {
      generateContentStream: vi.fn(),
    };
    config = new Config({
      sessionId: 'test-session',
      targetDir: process.cwd(),
    });
    vi.spyOn(config, 'getContentGenerator').mockReturnValue(mockContentGenerator);
    chat = new GeminiChat(config);
  });

  it('should log 400 errors to OmniLogger', async () => {
    const error400 = new Error('Bad Request');
    (error400 as any).status = 400;
    (error400 as any).response = { data: 'invalid request' };

    mockContentGenerator.generateContentStream.mockRejectedValue(error400);

    const stream = await chat.sendMessageStream(
      { model: 'gemini-2.0-flash' },
      'test',
      'test-prompt',
      new AbortController().signal
    );

    await expect(async () => {
      for await (const _ of stream) {}
    }).rejects.toThrow('Bad Request');

    expect(OmniLogger.logError).toHaveBeenCalledWith(error400, expect.any(String));
    expect(OmniLogger.log).toHaveBeenCalledWith('Conversation History Snapshot', expect.any(Array));
  });

  it('should log 500 errors to OmniLogger', async () => {
    const error500 = new Error('Internal Server Error');
    (error500 as any).status = 500;

    mockContentGenerator.generateContentStream.mockRejectedValue(error500);

    const stream = await chat.sendMessageStream(
      { model: 'gemini-2.0-flash' },
      'test',
      'test-prompt',
      new AbortController().signal
    );

    // Use a shorter timeout or just expect it to eventually throw
    await expect(async () => {
      for await (const _ of stream) {}
    }).rejects.toThrow();

    expect(OmniLogger.logError).toHaveBeenCalled();
  }, 15000);

  describe('Recovery Strategies', () => {
    it('should perform Deep Rollback correctly', () => {
      chat.history = [
        { role: 'user', parts: [{ text: 'msg 1' }] },
        { role: 'model', parts: [{ text: 'resp 1' }] },
        { role: 'user', parts: [{ text: 'msg 2' }] },
      ];

      chat.rollbackDeep();

      expect(chat.history).toHaveLength(2);
      expect(chat.history[0].parts[0].text).toBe('msg 1');
      expect(chat.history[1].parts[0].text).toBe('resp 1');
    });

    it('should perform Clear Current Turn correctly', () => {
      chat.history = [
        { role: 'user', parts: [{ text: 'msg 1' }] },
        { role: 'model', parts: [{ text: 'resp 1' }] },
        { role: 'user', parts: [{ text: 'msg 2' }] },
      ];

      chat.clearCurrentTurn();

      expect(chat.history).toHaveLength(2);
      expect(chat.history[1].parts[0].text).toBe('resp 1');
    });
  });
});