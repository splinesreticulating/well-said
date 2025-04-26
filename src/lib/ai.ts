import { Message } from './messages';
import { OpenAI } from 'openai';
// @ts-ignore: suppress TS resolution error for local prompts module
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
): Promise<{ summary: string; replies: string[] }> => {
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
    const summaryMatch = rawOutput.match(/Summary:\s*([\s\S]*?)(?=\n\n|$)/);
    const summary = summaryMatch ? summaryMatch[1].trim() : '';
    const replyMatches = [...rawOutput.matchAll(/Reply\s*\d:\s*(.*)/g)];
    const replies = replyMatches.map(m => m[1].trim());
    return { summary, replies };
  } catch (err) {
    console.error('Error generating replies:', err);
    return { summary: '', replies: ['(Sorry, I had trouble generating a response.)'] };
  }
};
