import { buildReplyPrompt, permanentContext } from "../../src/lib/prompts"

describe("Prompts Module", () => {
    describe("buildReplyPrompt function", () => {
        test("formats messages with tone and context correctly", () => {
            // Arrange
            const messages = [
                "Me: Hey, how was your day?",
                "Partner: It was good! Had a productive meeting."
            ]
            const tone = "friendly"
            const context = "We're planning a vacation next week"
            
            // Act
            const result = buildReplyPrompt(messages, tone, context)
            
            // Assert - Message formatting
            expect(result).toContain("Message 1: Me: Hey, how was your day?")
            expect(result).toContain("Message 2: Partner: It was good! Had a productive meeting.")
            
            // Assert - Tone & context
            expect(result).toContain(`Tone: ${tone}`)
            expect(result).toContain(`Additional context: ${context}`)
            
            // Assert - Response format instructions
            expect(result).toContain("Summary: <summary>")
            expect(result).toContain("Reply 1: <reply>")
            expect(result).toContain("Reply 2: <reply>")
            expect(result).toContain("Reply 3: <reply>")
        })
        
        test("works correctly without context field", () => {
            // Arrange
            const messages = ["Me: What time is dinner?"]
            const tone = "direct"
            const context = ""
            
            // Act
            const result = buildReplyPrompt(messages, tone, context)
            
            // Assert
            expect(result).toContain(`Tone: ${tone}`)
            expect(result).not.toContain("Additional context:")
        })
    })
    
    describe("permanentContext", () => {
        test("contains required system instructions", () => {
            // Assert
            expect(permanentContext).toContain("Act as my therapist")
            expect(typeof permanentContext).toBe("string")
        })
    })
})
