import { promises as fs } from 'fs';
import path from 'path';

// ponytail: JSON file on disk, not Redis/DB — this app has no persistence
// layer at all today. Upgrade to whatever storage a real producer already
// has; this file is purely a demonstration of the interface.
const STORE_PATH = path.join(process.cwd(), 'data', 'listing-ids.json');

async function readIds(): Promise<string[]> {
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf-8');
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export async function addListingId(id: string): Promise<void> {
  const ids = await readIds();
  if (!ids.includes(id)) {
    ids.push(id);
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(ids, null, 2));
  }
}

export async function getListingIds(): Promise<string[]> {
  return readIds();
}
