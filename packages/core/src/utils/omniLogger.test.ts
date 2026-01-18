import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { OmniLogger } from './omniLogger';

vi.mock('fs');

describe('OmniLogger', () => {
  const logPath = path.join(process.cwd(), 'Omni', 'api_errors.log');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should append message to the log file', () => {
    OmniLogger.log('Test message', { key: 'value' });

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      logPath,
      expect.stringContaining('Test message')
    );
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      logPath,
      expect.stringContaining('"key": "value"')
    );
  });

  it('should log errors with stack and response if available', () => {
    const error = new Error('Test error');
    error.stack = 'test stack';
    (error as any).response = { status: 400, data: 'bad request' };

    OmniLogger.logError(error, 'Test Context');

    expect(fs.appendFileSync).toHaveBeenCalledWith(
      logPath,
      expect.stringContaining('ERROR: Test Context')
    );
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      logPath,
      expect.stringContaining('Message: Test error')
    );
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      logPath,
      expect.stringContaining('Stack: test stack')
    );
    expect(fs.appendFileSync).toHaveBeenCalledWith(
      logPath,
      expect.stringContaining('"status": 400')
    );
  });

  it('should rotate logs if file size exceeds limit (simulated)', () => {
    // This will fail initially because rotation is not implemented
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue({ size: 10 * 1024 * 1024 + 1 } as any); // 10MB + 1

    OmniLogger.log('Trigger rotation');

    expect(fs.renameSync).toHaveBeenCalled();
    expect(fs.appendFileSync).toHaveBeenCalled();
  });
});
