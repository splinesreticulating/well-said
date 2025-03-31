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
const PARTNER_HANDLE_ID = process.env.PARTNER_PHONE;

export const getRecentMessages = async (): Promise<Message[]> => {
  const db = await open({
    filename: CHAT_DB_PATH,
    driver: sqlite3.Database,
  });

  const rows = await db.all(`
    SELECT
      datetime(message.date / 1000000000 + strftime('%s', '2001-01-01'), 'unixepoch') AS timestamp,
      message.text AS text,
      handle.id AS contact_id,
      message.handle_id,
      handle.ROWID as handle_rowid,
      message.is_from_me,
      message.account
    FROM message
    JOIN handle ON message.handle_id = handle.ROWID
    WHERE message.text IS NOT NULL
    AND handle.id = ?
    ORDER BY message.date DESC
    LIMIT 30;
  `, [PARTNER_HANDLE_ID]);

  await db.close();

  console.log(`📨 Fetched ${rows.length} messages for handle ID ${PARTNER_HANDLE_ID}`);

  const formattedRows = rows.map((row: any) => ({
    sender: row.is_from_me ? 'me' : 
           row.contact_id === PARTNER_HANDLE_ID ? 'partner' : 
           'unknown',
    text: row.text,
    timestamp: row.timestamp,
  })).reverse();

  return formattedRows;
};
