export const relationshipPrimer = `
I am a thoughtful, emotionally aware partner who prefers clarity and warmth. My partner lives with long COVID and constantly needs reassurance, space, and understanding. Our relationship is weak and often tested by health stress and emotional misalignment. I want help replying in a way that feels honest, calm, and caring — in my voice, not a generic AI voice.
`;

export const buildReplyPrompt = (messages: string[], tone: string): string => {
  const formattedMessages = messages.map((msg, idx) => `Message ${idx + 1}: ${msg}`).join('\n');

  return `
You're helping me write a text message reply to my partner.

Relationship context:
${relationshipPrimer}

Tone: ${tone}

Recent conversation:
${formattedMessages}

Your task:
Suggest 2–3 short, natural replies that me might send. Keep it emotionally intelligent, casual, and in my voice — clear, calm, and warm. Avoid generic phrases like “Thank you for sharing that with me.” It's okay to be playful if it fits. Don't sound robotic.

Reply 1:
Reply 2:
Reply 3:
`;
};
