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
            body: JSON.stringify({ message: prompt }),
        })
        if (!khojRes.ok) throw new Error(`Khoj API error: ${khojRes.status}`)
        const khojData = await khojRes.json()
        // Khoj returns { response: "..." }
        const rawOutput = khojData.response || ""
        const summaryMatch = rawOutput.match(/Summary:\s*([\s\S]*?)(?=\n\n|$)/)
        const summary = summaryMatch ? summaryMatch[1].trim() : ""
        const replyMatches = [...rawOutput.matchAll(/Reply\s*\d:\s*(.*)/g)]
        const replies = replyMatches.map((m) => m[1].trim())
        return { summary, replies }
    } catch (err) {
        console.error("Error generating replies:", err)
        return {
            summary: "",
            replies: ["(Sorry, I had trouble generating a response.)"],
        }
    }
}
