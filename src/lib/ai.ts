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
): Promise<{ summary: string; replies: string[]; messageCount: number }> => {
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
            body: JSON.stringify({ q: prompt, agent: process.env.KHOJ_AGENT }),
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
        // Extract summary as everything before the first reply
        const summary = parseSummaryToHumanReadable(rawOutput)
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

function parseSummaryToHumanReadable(rawOutput: string) {
    // Extract the summary from the raw output
    // The summary is everything before the "----" marker
    
    // Find where the replies section starts with the consistent marker
    const marker = "---";
    const summaryEndIndex = rawOutput.indexOf(marker);
    
    // Extract the summary
    const summary = rawOutput.substring(0, summaryEndIndex).trim();
    return cleanupSummary(summary);
}

// Helper function to clean up the summary text
function cleanupSummary(text: string): string {
    if (!text) {
        return "(No summary available)";
    }
    
    // Remove "**Brief Summary:**" or similar patterns
    let cleaned = text;
    
    // Remove any variation of the Brief Summary prefix with or without asterisks
    cleaned = cleaned.replace(/^\s*\*{0,2}\s*Brief Summary:\s*\*{0,2}\s*/i, "");
    
    // Also remove any remaining leading asterisks
    cleaned = cleaned.replace(/^\s*\*+\s*/, "");
    
    // Split the text into narrative and structured sections
    let mainNarrative = cleaned;
    let structuredSections = "";
    
    // Extract structured sections if they exist
    const sectionMarkers = [
        "Main Topics:", "**Main Topics:**", 
        "Emotional Tone:", "**Emotional Tone:**", 
        "Changes in mood:", "**Changes in mood:**"
    ];
    
    // Find the earliest section marker
    let earliestIndex = cleaned.length;
    let foundMarker = false;
    
    for (const marker of sectionMarkers) {
        const index = cleaned.indexOf(marker);
        if (index !== -1 && index < earliestIndex) {
            earliestIndex = index;
            foundMarker = true;
        }
    }
    
    if (foundMarker) {
        // Split the text at the earliest section marker
        mainNarrative = cleaned.substring(0, earliestIndex).trim();
        structuredSections = cleaned.substring(earliestIndex).trim();
    }
    
    // Add paragraph breaks to the main narrative
    // Look for sentences that might indicate topic changes
    mainNarrative = mainNarrative
        .replace(/\. The conversation/g, ".\n\nThe conversation")
        .replace(/\. The discussion/g, ".\n\nThe discussion")
        .replace(/\. The mood/g, ".\n\nThe mood")
        .replace(/\. You try/g, ".\n\nYou try")
        .replace(/\. Your partner/g, ".\n\nYour partner");
    
    // Format structured sections
    if (structuredSections) {
        // Format section headers to be cleaner
        structuredSections = structuredSections.replace(/\*\*([^*]+):\*\*/g, "$1:");
        
        // Add spacing before section headers
        for (const marker of sectionMarkers) {
            structuredSections = structuredSections.replace(marker, `\n\n${marker}`);
        }
        
        // Format bullet points properly
        structuredSections = structuredSections.replace(/(?<!\n)\s*-\s*/g, "\n- ");
        structuredSections = structuredSections.replace(/\n\n-/g, "\n-");
    }
    
    // Combine the formatted parts
    const result = mainNarrative + (structuredSections ? `\n\n${structuredSections}` : "");
    
    // Clean up any excessive whitespace
    return result.replace(/\n{3,}/g, "\n\n").trim() || "(No summary available)";
}
