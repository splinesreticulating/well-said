import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { getRecentMessages } from './lib/messages';
import { getSuggestedReplies } from './lib/ai';
import cors from 'cors';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

app.post('/replies', async (req, res) => {
  const { tone } = req.body;

  try {
    const messages = await getRecentMessages();
    const replies = await getSuggestedReplies(messages, tone || 'gentle');
    res.json({ messages, replies });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ SmartReply app listening at http://localhost:${PORT}`);
});
