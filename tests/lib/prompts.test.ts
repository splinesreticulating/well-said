import { buildReplyPrompt, permanentContext } from "../../src/lib/prompts"

// Import shared constants
import {
    TONE_FRIENDLY,
    TONE_DIRECT,
    SUMMARY_TAG,
    REPLY_1_TAG,
    REPLY_2_TAG,
    REPLY_3_TAG,
    TONE_PREFIX,
    ADDITIONAL_CONTEXT_PREFIX,
    SYSTEM_INSTRUCTION
} from '../testConstants'

// Constants specific to this test file
const TEST_TONE_FRIENDLY = TONE_FRIENDLY
const TEST_TONE_DIRECT = TONE_DIRECT
const TEST_CONTEXT = "We're planning a vacation next week"
const TEST_MESSAGE_1 = "Me: Hey, how was your day?"
const TEST_MESSAGE_2 = "Partner: It was good! Had a productive meeting."

describe("Prompts Module", () => {
    describe("buildReplyPrompt function", () => {
        test("formats messages with tone and context correctly", () => {
            // Arrange
            const messages = [
                TEST_MESSAGE_1,
                TEST_MESSAGE_2
            ]
            const tone = TEST_TONE_FRIENDLY
            const context = TEST_CONTEXT
            
            // Act
            const result = buildReplyPrompt(messages, tone, context)
            
            // Assert - Message formatting
            expect(result).toContain("Message 1: Me: Hey, how was your day?")
            expect(result).toContain("Message 2: Partner: It was good! Had a productive meeting.")
            
            // Assert - Tone & context
            expect(result).toContain(`${TONE_PREFIX}${tone}`)
            expect(result).toContain(`${ADDITIONAL_CONTEXT_PREFIX}${context}`)
            
            // Assert - Response format instructions
            expect(result).toContain(SUMMARY_TAG)
            expect(result).toContain(REPLY_1_TAG)
            expect(result).toContain(REPLY_2_TAG)
            expect(result).toContain(REPLY_3_TAG)
        })
        
        test("works correctly without context field", () => {
            // Arrange
            const messages = ["Me: What time is dinner?"]
            const tone = TEST_TONE_DIRECT
            const context = ""
            
            // Act
            const result = buildReplyPrompt(messages, tone, context)
            
            // Assert
            expect(result).toContain(`${TONE_PREFIX}${tone}`)
            expect(result).not.toContain(ADDITIONAL_CONTEXT_PREFIX)
        })
    })
    
    describe("permanentContext", () => {
        test("contains required system instructions", () => {
            // Assert
            expect(permanentContext).toContain(SYSTEM_INSTRUCTION)
            expect(typeof permanentContext).toBe("string")
        })
    })
})
