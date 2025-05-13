export const buildReplyPrompt = (
    messages: string[],
    tone: string,
    context: string,
): string => {
    const formattedMessages = messages
        .map((msg, idx) => `Message ${idx + 1}: ${msg}`)
        .join("\n")

    return `
Here are some text messages between my partner and I:
${formattedMessages}
Please give a brief summary, including the emotional tone, main topics, and any changes in mood.
Suggest 3 replies that I might send.
Tone: ${tone}
${context ? `Additional context: ${context}` : ""}
Reply 1:
Reply 2:
Reply 3:
`
}
