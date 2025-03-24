import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import os from 'os';
import path from 'path';

export interface Message {
  sender: string;
  text: string;
  timestamp: string;
}

const CHAT_DB_PATH = path.join(os.homedir(), 'Library', 'Messages', 'chat.db');
const YOUR_HANDLE_ID = '<your handle>';

export const getRecentMessages = async (): Promise<Message[]> => {
  const db = await open({
    filename: CHAT_DB_PATH,
    driver: sqlite3.Database,
  });

  const rows = await db.all(`
    SELECT
      datetime(message.date / 1000000000 + strftime('%s', '2001-01-01'), 'unixepoch') AS timestamp,
      message.text AS text,
      handle.id AS sender
    FROM message
    JOIN handle ON message.handle_id = handle.ROWID
    WHERE message.text IS NOT NULL
    ORDER BY message.date DESC
    LIMIT 10;
  `);

  await db.close();

  return rows.map((row: any) => ({
    sender: row.sender === YOUR_HANDLE_ID ? 'me' : 'partner',
    text: row.text,
    timestamp: row.timestamp,
  })).reverse();
};
