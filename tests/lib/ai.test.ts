// Set environment variables before importing the module
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.OPENAI_MODEL = 'gpt-4';

import { getSuggestedReplies } from "../../src/lib/ai"
import * as utils from "../../src/lib/utils"
import type { Message } from "../../src/lib/messages"

// Mock the fetch function
global.fetch = jest.fn()

describe("AI Module", () => {
    const originalEnv = process.env
    const mockMessages: Message[] = [
        { sender: "me", text: "Hello there!", timestamp: "2023-01-01 10:00:00" },
        { sender: "partner", text: "Hi! How are you?", timestamp: "2023-01-01 10:01:00" },
    ]

    beforeEach(() => {
        jest.resetModules()
        process.env = { ...originalEnv }
        process.env.OPENAI_API_KEY = "test-api-key"
        process.env.OPENAI_MODEL = "gpt-4"
        // Clear mock calls
        jest.clearAllMocks()
        
        // Mock parseSummaryToHumanReadable function
        jest.spyOn(utils, "parseSummaryToHumanReadable").mockImplementation((text) => {
            return "Mocked summary"
        })
    })

    afterEach(() => {
        process.env = originalEnv
    })

    test("returns error message when OpenAI API key is not set", async () => {
        // Save original environment and explicitly unset the API key for this test
        const originalApiKey = process.env.OPENAI_API_KEY
        // Set to empty string instead of using delete
        process.env.OPENAI_API_KEY = ""
        
        // Import the module again to get a fresh instance with the updated environment
        jest.resetModules()
        const { getSuggestedReplies: freshGetSuggestedReplies } = require("../../src/lib/ai")
        
        const result = await freshGetSuggestedReplies(mockMessages, "friendly", "")
        
        expect(result).toEqual({
            summary: "OpenAI API key is not configured.",
            replies: ["Please set up your OpenAI API key in the .env file."],
            messageCount: mockMessages.length,
        })
        
        // Restore the environment for other tests
        process.env.OPENAI_API_KEY = originalApiKey
    })

    test("parses OpenAI response correctly", async () => {
        const mockResponse = {
            ok: true,
            json: jest.fn().mockResolvedValue({
                choices: [
                    {
                        message: {
                            content: `Summary: This is a test summary.

Suggested replies:
Reply 1: "Thanks for asking! I'm doing well."
Reply 2: "I'm good, thanks! How about you?"
Reply 3: "Doing great, thanks for asking!"`,
                        },
                    },
                ],
            }),
        }
        
        // Mock the fetch to return our mock response
        ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)
        
        const result = await getSuggestedReplies(mockMessages, "friendly", "")
        
        expect(global.fetch).toHaveBeenCalledTimes(1)
        expect(global.fetch).toHaveBeenCalledWith(
            "https://api.openai.com/v1/chat/completions",
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({
                    "Authorization": "Bearer test-api-key",
                }),
                body: expect.any(String),
            })
        )
        
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
        const errorResponse = {
            ok: false,
            status: 401,
            text: jest.fn().mockResolvedValue("Unauthorized"),
        }
        
        // Mock the fetch to return an error
        ;(global.fetch as jest.Mock).mockResolvedValue(errorResponse)
        
        const result = await getSuggestedReplies(mockMessages, "friendly", "")
        
        expect(result).toEqual({
            summary: "",
            replies: ["(Sorry, I had trouble generating a response.)"],
            messageCount: mockMessages.length,
        })
    })

    test("passes correct tone and context to prompt", async () => {
        const mockResponse = {
            ok: true,
            json: jest.fn().mockResolvedValue({
                choices: [
                    {
                        message: {
                            content: "Summary: Test\n\nReply 1: Test reply",
                        },
                    },
                ],
            }),
        }
        
        ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)
        
        await getSuggestedReplies(mockMessages, "professional", "We're discussing a work project")
        
        // Verify tone and context are included in the request
        const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
        const requestBody = JSON.parse(fetchCall[1].body)
        
        // Look for tone in the buildReplyPrompt result
        expect(requestBody.messages[1].content).toContain("Tone: professional")
        expect(requestBody.messages[1].content).toContain("We're discussing a work project")
    })
})
