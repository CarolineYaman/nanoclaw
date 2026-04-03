import fs from 'fs';
import path from 'path';

import OpenAI from 'openai';

import { readEnvFile } from './env.js';
import { logger } from './logger.js';

function getClient(): OpenAI | null {
  const envVars = readEnvFile(['OPENAI_API_KEY']);
  const apiKey = process.env.OPENAI_API_KEY || envVars.OPENAI_API_KEY || '';
  if (!apiKey) {
    logger.warn('OPENAI_API_KEY not set — voice transcription unavailable');
    return null;
  }
  return new OpenAI({ apiKey });
}

/**
 * Transcribe an audio buffer using OpenAI Whisper.
 * Returns the transcript string, or null on failure.
 */
export async function transcribeAudio(
  buffer: Buffer,
  filename: string,
): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  // Write to a temp file — OpenAI SDK needs a file stream
  const tmpPath = path.join('/tmp', filename);
  try {
    fs.writeFileSync(tmpPath, buffer);
    const result = await client.audio.transcriptions.create({
      model: 'whisper-1',
      file: fs.createReadStream(tmpPath),
    });
    logger.info(
      { chars: result.text.length },
      'Transcribed voice message',
    );
    return result.text;
  } catch (err) {
    logger.error({ err }, 'OpenAI transcription failed');
    return null;
  } finally {
    try {
      fs.unlinkSync(tmpPath);
    } catch {}
  }
}
