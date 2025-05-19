// Import shared constants
import {
    TEST_API_KEY,
    TEST_MODEL,
    OPENAI_API_ENDPOINT,
    TEST_TIMESTAMP_1,
    TEST_TIMESTAMP_2,
    TEST_SENDER_ME,
    TEST_SENDER_PARTNER,
    TEST_MESSAGE_1,
    TEST_MESSAGE_2,
    TONE_CONCISE,
    TEST_CONTEXT,
    ERROR_API_KEY,
    ERROR_API_KEY_SETUP,
    ERROR_RESPONSE,
    MOCKED_SUMMARY
} from '../testConstants'

// Constants specific to this test file
const TEST_SUMMARY = "This is a test summary.";

// Set environment variables before importing the module
process.env.OPENAI_API_KEY = TEST_API_KEY;
process.env.OPENAI_MODEL = TEST_MODEL;

import { getSuggestedReplies } from "../../src/lib/ai"
import * as utils from "../../src/lib/utils"
import type { Message } from "../../src/lib/types"

// Mock the fetch function
global.fetch = jest.fn()

describe("AI Module", () => {
    // Test data and helpers
    const originalEnv = process.env
    const mockMessages: Message[] = [
        { sender: TEST_SENDER_ME, text: TEST_MESSAGE_1, timestamp: TEST_TIMESTAMP_1 },
        { sender: TEST_SENDER_PARTNER, text: TEST_MESSAGE_2, timestamp: TEST_TIMESTAMP_2 },
    ]
    
    // Helper function to create mock OpenAI response
    const createMockOpenAIResponse = (content: string) => ({
        ok: true,
        json: jest.fn().mockResolvedValue({
            choices: [
                {
                    message: { content },
                },
            ],
        }),
    })

    // Setup and teardown
    beforeEach(() => {
        jest.resetModules()
        process.env = { ...originalEnv }
        process.env.OPENAI_API_KEY = TEST_API_KEY
        process.env.OPENAI_MODEL = TEST_MODEL
        jest.clearAllMocks()
        
        // Mock utility function
        jest.spyOn(utils, "parseSummaryToHumanReadable")
            .mockImplementation(() => "Mocked summary")
    })

    afterEach(() => {
        process.env = originalEnv
    })

    test("returns error message when OpenAI API key is not set", async () => {
        // Arrange
        process.env.OPENAI_API_KEY = ""
        jest.resetModules()
        const { getSuggestedReplies: freshGetSuggestedReplies } = require("../../src/lib/ai")
        
        // Act
        const result = await freshGetSuggestedReplies(mockMessages, TONE_CONCISE, "")
        
        // Assert
        expect(result).toEqual({
            summary: ERROR_API_KEY,
            replies: [ERROR_API_KEY_SETUP],
            messageCount: mockMessages.length,
        })
    })

    test("parses OpenAI response correctly", async () => {
        // Arrange
        const mockResponse = createMockOpenAIResponse(
            `Summary: ${TEST_SUMMARY}

            Suggested replies:
            Reply 1: "Thanks for asking! I'm doing well."
            Reply 2: "I'm good, thanks! How about you?"
            Reply 3: "Doing great, thanks for asking!"`
        )
        
        ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)
        
        // Act
        const result = await getSuggestedReplies(mockMessages, TONE_CONCISE, "")
        
        // Assert - Check API call
        expect(global.fetch).toHaveBeenCalledWith(
            OPENAI_API_ENDPOINT,
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({
                    "Authorization": `Bearer ${TEST_API_KEY}`,
                }),
            })
        )
        
        // Assert - Check returned data
        expect(result).toEqual({
            summary: MOCKED_SUMMARY,
            replies: [
                "Thanks for asking! I'm doing well.",
                "I'm good, thanks! How about you?",
                "Doing great, thanks for asking!",
            ],
            messageCount: mockMessages.length,
        })
    })

    test("handles OpenAI API errors gracefully", async () => {
        // Arrange
        const errorResponse = {
            ok: false,
            status: 401,
            text: jest.fn().mockResolvedValue("Unauthorized"),
        }
        
        ;(global.fetch as jest.Mock).mockResolvedValue(errorResponse)
        
        // Act
        const result = await getSuggestedReplies(mockMessages, TONE_CONCISE, "")
        
        // Assert
        expect(result).toEqual({
            summary: "",
            replies: [ERROR_RESPONSE],
            messageCount: mockMessages.length,
        })
    })

    test("passes correct tone and context to prompt", async () => {
        // Arrange
        const mockResponse = createMockOpenAIResponse("Summary: Test\n\nReply 1: Test reply")
        ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)
        
        // Act
        await getSuggestedReplies(
            mockMessages, 
            TONE_CONCISE, 
            TEST_CONTEXT
        )
        
        // Assert
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
        const requestBody = JSON.parse(fetchCall[1].body)
        
        expect(requestBody.messages[1].content).toContain(`Tone: ${TONE_CONCISE}`)
        expect(requestBody.messages[1].content).toContain(TEST_CONTEXT)
    })
})
