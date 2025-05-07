export const buildReplyPrompt = (
    messages: string[],
    tone: string,
    context: string,
): string => {
    const formattedMessages = messages
        .map((msg, idx) => `Message ${idx + 1}: ${msg}`)
        .join("\n")

    return `
Here are my partner's message(s):
${formattedMessages}

Please summarize them for me.

Suggest 2–3 short, natural replies that the user might send.

Tone: ${tone}

Additional context if any: ${context}

Reply 1:
 
Reply 2:
 
Reply 3:
`
}
