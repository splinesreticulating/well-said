import { Message } from './messages';
import { OpenAI } from 'openai';
import { buildReplyPrompt } from './prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
console.log(`🤖 Using OpenAI model: ${MODEL}`);

export const getSuggestedReplies = async (
  messages: Message[],
  tone: string,
  context: string
): Promise<string[]> => {
  const recentText = messages.map(m => {
    const tag = m.sender === 'me' ? 'Me' : m.sender === 'partner' ? 'Partner' : m.sender;
    return `${tag}: ${m.text}`;
  });

  const prompt = buildReplyPrompt(recentText, tone, context);

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    });

    const rawOutput = response.choices[0].message?.content || '';
    const replies = rawOutput
      .split(/Reply \d:/)
      .map(r => r.trim())
      .filter(Boolean);

    return replies;
  } catch (err) {
    console.error('Error generating replies:', err);
    return ['(Sorry, I had trouble generating a response.)'];
  }
};
