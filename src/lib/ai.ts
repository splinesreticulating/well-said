import { Message } from './messages';
import { OpenAI } from 'openai';
import { replyPrompt } from './prompts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
console.log(`🤖 Using OpenAI model: ${MODEL}`);

export const getSuggestedReplies = async (messages: Message[]): Promise<string[]> => {
  const seenSenders = new Set<string>();
  for (const msg of messages) {
    if (!seenSenders.has(msg.sender)) {
      seenSenders.add(msg.sender);
    }
  }

  const formattedConversation = messages.map(m => {
    const tag = m.sender === 'me' ? 'Me' : m.sender === 'partner' ? 'Partner' : m.sender;
    return `${tag}: ${m.text}`;
  }).join('\n');

  const systemPrompt = replyPrompt;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: formattedConversation }
      ],
      temperature: process.env.OPENAI_TEMPERATURE ? parseFloat(process.env.OPENAI_TEMPERATURE) : 0.5,
    });

    const raw = response.choices?.[0]?.message?.content || '';

    const replies = raw
      .split(/\n\s*(?:\d+\.|-)/)
      .map(r => r.trim())
      .filter(Boolean);

    return replies.length > 0 ? replies : [raw];
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    return [
      '⚠️ Could not generate replies. You may have hit your OpenAI API quota.',
      'Visit https://platform.openai.com/account/billing to check your usage.',
    ];
  }
};
