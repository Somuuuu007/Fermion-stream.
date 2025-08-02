import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  try {
    const hlsDir = join(process.cwd(), 'public', 'hls');
    const entries = await readdir(hlsDir, { withFileTypes: true });
    
    const streams = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
    
    return NextResponse.json(streams);
  } catch (error) {
    console.error('Error reading HLS directory:', error);
    return NextResponse.json([]);
  }
}