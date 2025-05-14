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
Please respond in this format: 
Summary: <summary>
Suggested replies:
Reply 1: <reply>
Reply 2: <reply>
Reply 3: <reply>
`
}

export const permanentContext = `
You are a helpful assistant that summarizes conversations and suggests replies.
`
