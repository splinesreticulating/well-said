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

Please summarize each thought and feeling.

Based on that summary, what should they say next?

Tone: ${tone}

Additional context if any: ${context}

Suggest 2–3 short, natural replies that the user might send.
 
Reply 1:
 
Reply 2:
 
Reply 3:
`
}
