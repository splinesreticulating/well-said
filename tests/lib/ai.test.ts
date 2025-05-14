// Set environment variables before importing the module
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.OPENAI_MODEL = 'gpt-4';

import { getSuggestedReplies } from "../../src/lib/ai"
import * as utils from "../../src/lib/utils"
import type { Message } from "../../src/lib/messages"

// Mock the fetch function
global.fetch = jest.fn()

describe("AI Module", () => {
    // Test data and helpers
    const originalEnv = process.env
    const mockMessages: Message[] = [
        { sender: "me", text: "Hello there!", timestamp: "2023-01-01 10:00:00" },
        { sender: "partner", text: "Hi! How are you?", timestamp: "2023-01-01 10:01:00" },
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
        process.env.OPENAI_API_KEY = "test-api-key"
        process.env.OPENAI_MODEL = "gpt-4"
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
            summary: "OpenAI API key is not configured.",
            replies: ["Please set up your OpenAI API key in the .env file."],
            messageCount: mockMessages.length,
        })
    })

    test("parses OpenAI response correctly", async () => {
        // Arrange
        const mockResponse = createMockOpenAIResponse(
            `Summary: This is a test summary.

            Suggested replies:
            Reply 1: "Thanks for asking! I'm doing well."
            Reply 2: "I'm good, thanks! How about you?"
            Reply 3: "Doing great, thanks for asking!"`
        )
        
        ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)
        
        // Act
        const result = await getSuggestedReplies(mockMessages, "friendly", "")
        
        // Assert - Check API call
        expect(global.fetch).toHaveBeenCalledWith(
            "https://api.openai.com/v1/chat/completions",
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({
                    "Authorization": "Bearer test-api-key",
                }),
            })
        )
        
        // Assert - Check returned data
        expect(result).toEqual({
            summary: "Mocked summary",
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
        const result = await getSuggestedReplies(mockMessages, "friendly", "")
        
        // Assert
        expect(result).toEqual({
            summary: "",
            replies: ["(Sorry, I had trouble generating a response.)"],
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
            "professional", 
            "We're discussing a work project"
        )
        
        // Assert
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
        const requestBody = JSON.parse(fetchCall[1].body)
        
        expect(requestBody.messages[1].content).toContain("Tone: professional")
        expect(requestBody.messages[1].content).toContain("We're discussing a work project")
    })
})
