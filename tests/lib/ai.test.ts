// Constants for API and model configuration
const TEST_API_KEY = 'test-api-key';
const TEST_MODEL = 'gpt-4';
const OPENAI_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

// Constants for test data
const TEST_TIMESTAMP_1 = "2023-01-01 10:00:00";
const TEST_TIMESTAMP_2 = "2023-01-01 10:01:00";
const TEST_SENDER_ME = "me";
const TEST_SENDER_PARTNER = "partner";
const TEST_MESSAGE_1 = "Hello there!";
const TEST_MESSAGE_2 = "Hi! How are you?";

// Constants for tones and contexts
const TONE_FRIENDLY = "friendly";
const TONE_PROFESSIONAL = "professional";
const TEST_CONTEXT = "We're discussing a work project";

// Constants for response texts
const ERROR_API_KEY = "OpenAI API key is not configured.";
const ERROR_API_KEY_SETUP = "Please set up your OpenAI API key in the .env file.";
const ERROR_RESPONSE = "(Sorry, I had trouble generating a response.)";
const TEST_SUMMARY = "This is a test summary.";
const MOCKED_SUMMARY = "Mocked summary";

// Set environment variables before importing the module
process.env.OPENAI_API_KEY = TEST_API_KEY;
process.env.OPENAI_MODEL = TEST_MODEL;

import { getSuggestedReplies } from "../../src/lib/ai"
import * as utils from "../../src/lib/utils"
import type { Message } from "../../src/lib/messages"

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
        const result = await freshGetSuggestedReplies(mockMessages, "friendly", "")
        
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
        const result = await getSuggestedReplies(mockMessages, TONE_FRIENDLY, "")
        
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
        const result = await getSuggestedReplies(mockMessages, TONE_FRIENDLY, "")
        
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
            TONE_PROFESSIONAL, 
            TEST_CONTEXT
        )
        
        // Assert
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
        const requestBody = JSON.parse(fetchCall[1].body)
        
        expect(requestBody.messages[1].content).toContain(`Tone: ${TONE_PROFESSIONAL}`)
        expect(requestBody.messages[1].content).toContain(TEST_CONTEXT)
    })
})
