// File: src/lib/ai.ts

import { Message } from './messages';
import { OpenAI } from 'openai';
import { replyPrompt } from './prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const getSuggestedReplies = async (messages: Message[]): Promise<string[]> => {
  const formattedConversation = messages.map(m => `${m.sender === 'me' ? 'Me' : 'Partner'}: ${m.text}`).join('\n');

  const systemPrompt = replyPrompt;

  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: formattedConversation }
    ],
    temperature: 0.7,
  });

  const raw = response.choices?.[0]?.message?.content || '';

  // Try to extract bullet points or numbered suggestions
  const replies = raw
    .split(/\n\s*(?:\d+\.|-)/)
    .map(r => r.trim())
    .filter(Boolean);

  return replies.length > 0 ? replies : [raw];
};
