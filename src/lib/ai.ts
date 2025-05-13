import type { Message } from "./messages"
import { buildReplyPrompt } from "./prompts"
import { parseSummaryToHumanReadable } from "./utils"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4"
const OPENAI_TEMPERATURE = Number.parseFloat(process.env.OPENAI_TEMPERATURE || "0.7")
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

if (!OPENAI_API_KEY) {
    console.warn("⚠️ OPENAI_API_KEY is not set. OpenAI integration will not work.")
} else {
    console.log(`🤖 Using OpenAI API with model: ${OPENAI_MODEL}`)
}

export const getSuggestedReplies = async (
    messages: Message[],
    tone: string,
    context: string,
): Promise<{ summary: string; replies: string[]; messageCount: number }> => {
    if (!OPENAI_API_KEY) {
        return {
            summary: "OpenAI API key is not configured.",
            replies: ["Please set up your OpenAI API key in the .env file."],
            messageCount: messages.length,
        }
    }

    const recentText = messages.map((m) => {
        const tag =
            m.sender === "me"
                ? "Me"
                : m.sender === "partner"
                  ? "Partner"
                  : m.sender
        return `${tag}: ${m.text}`
    })

    const prompt = buildReplyPrompt(recentText, tone, context)

    console.debug("\n==== PROMPT ====")
    console.debug(prompt)

    try {
        const response = await fetch(OPENAI_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: OPENAI_MODEL,
                messages: [
                    { role: "system", content: "You are a helpful assistant that summarizes conversations and suggests replies." },
                    { role: "user", content: prompt }
                ],
                temperature: OPENAI_TEMPERATURE,
            }),
        })

        if (!response.ok) {
            let errorBody: string
            try {
                errorBody = await response.text()
            } catch (e) {
                errorBody = "(could not read body)"
            }
            console.error(
                `OpenAI API error: ${response.status} - ${errorBody.slice(0, 500)}`,
            )
            throw new Error(`OpenAI API error: ${response.status}`)
        }

        const data = await response.json()
        const rawOutput = data.choices[0]?.message?.content || ""
        
        // Extract summary as everything before the first reply
        const summary = parseSummaryToHumanReadable(rawOutput)
        
        // Match both '**Reply 1:**' and 'Reply 1:'
        const replyMatches = [
            ...rawOutput.matchAll(/\*\*Reply\s*\d:\*\*\s*(.*)/g),
            ...rawOutput.matchAll(/Reply\s*\d:\s*(.*)/g),
        ]
        
        const replies = replyMatches.map((m) =>
            m[1]
                .replace(/^\*+\s*/, "") // Remove leading asterisks and spaces
                .replace(/^"/, "") // Remove leading quote
                .replace(/"$/, "") // Remove trailing quote
                .trim(),
        )
        
        return { summary, replies, messageCount: messages.length }
    } catch (err) {
        console.error("Error generating replies:", err)
        return {
            summary: "",
            replies: ["(Sorry, I had trouble generating a response.)"],
            messageCount: messages.length,
        }
    }
}
