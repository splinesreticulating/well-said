import type { Message } from "./messages"
// @ts-ignore: suppress TS resolution error for local prompts module
import { buildReplyPrompt } from "./prompts"

const KHOJ_API_URL =
    process.env.KHOJ_API_URL || "http://localhost:8080/api/chat"
console.log(`🤖 Using Khoj API at: ${KHOJ_API_URL}`)

export const getSuggestedReplies = async (
    messages: Message[],
    tone: string,
    context: string,
): Promise<{ summary: string; replies: string[] }> => {
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

    try {
        const khojRes = await fetch(KHOJ_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ q: prompt }),
        })
        if (!khojRes.ok) {
            let errorBody: string
            try {
                errorBody = await khojRes.text()
            } catch (e) {
                errorBody = "(could not read body)"
            }
            // Only log the status and the first 500 characters of the error body
            console.error(`Khoj API error: ${khojRes.status} - ${errorBody.slice(0, 500)}`)
            throw new Error(`Khoj API error: ${khojRes.status}`)
        }
        const khojData = await khojRes.json()
        // Khoj returns { response: "..." }
        const rawOutput = khojData.response || ""
        console.log("Khoj raw output:", rawOutput)
        // Extract summary as everything before the first reply
        const summary = rawOutput.split(/\*\*Reply 1:\*\*|Reply 1:/)[0].trim()
        // Match both '**Reply 1:**' and 'Reply 1:'
        const replyMatches = [
            ...rawOutput.matchAll(/\*\*Reply\s*\d:\*\*\s*(.*)/g),
            ...rawOutput.matchAll(/Reply\s*\d:\s*(.*)/g),
        ]
        const replies = replyMatches.map((m) => m[1]
            .replace(/^\*+\s*/, "")    // Remove leading asterisks and spaces
            .replace(/^"/, "")           // Remove leading quote
            .replace(/"$/, "")           // Remove trailing quote
            .trim()
        )
        return { summary, replies }
    } catch (err) {
        console.error("Error generating replies:", err)
        return {
            summary: "",
            replies: ["(Sorry, I had trouble generating a response.)"],
        }
    }
}
