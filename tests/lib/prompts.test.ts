import { buildReplyPrompt, permanentContext } from "../../src/lib/prompts"

describe("Prompts Module", () => {
    test("buildReplyPrompt formats messages correctly", () => {
        const messages = [
            "Me: Hey, how was your day?",
            "Partner: It was good! Had a productive meeting."
        ]
        const tone = "friendly"
        const context = "We're planning a vacation next week"
        
        const result = buildReplyPrompt(messages, tone, context)
        
        // Check that the messages are numbered correctly
        expect(result).toContain("Message 1: Me: Hey, how was your day?")
        expect(result).toContain("Message 2: Partner: It was good! Had a productive meeting.")
        
        // Check that tone is included
        expect(result).toContain(`Tone: ${tone}`)
        
        // Check that context is included
        expect(result).toContain(`Additional context: ${context}`)
        
        // Check the format instructions
        expect(result).toContain("Summary: <summary>")
        expect(result).toContain("Reply 1: <reply>")
        expect(result).toContain("Reply 2: <reply>")
        expect(result).toContain("Reply 3: <reply>")
    })
    
    test("buildReplyPrompt works without context", () => {
        const messages = ["Me: What time is dinner?"]
        const tone = "direct"
        const context = ""
        
        const result = buildReplyPrompt(messages, tone, context)
        
        // Check that tone is included
        expect(result).toContain(`Tone: ${tone}`)
        
        // Check that no additional context section is added
        expect(result).not.toContain("Additional context:")
    })
    
    test("permanentContext contains system instructions", () => {
        expect(permanentContext).toContain("Act as my therapist")
        expect(typeof permanentContext).toBe("string")
    })
})
