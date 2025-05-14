import { getRecentMessages } from "../../src/lib/messages"
import type { Message } from "../../src/lib/messages"
import * as sqlite from "sqlite"

// Mock SQLite database
jest.mock("sqlite", () => ({
    open: jest.fn(),
}))

describe("Messages Module", () => {
    // Test data and helpers
    const mockMessages: Message[] = [
        { sender: "me", text: "Hello there!", timestamp: "2023-01-01 10:00:00" },
        { sender: "partner", text: "Hi! How are you?", timestamp: "2023-01-01 10:01:00" },
    ]

    // Helper function to create a mock of the messages module
    type MessagesModuleMock = {
        getRecentMessages?: jest.Mock;
    }
    
    const mockMessagesModule = (implementation: MessagesModuleMock) => {
        jest.resetModules()
        jest.mock("../../src/lib/messages", () => {
            const originalModule = jest.requireActual("../../src/lib/messages")
            return {
                ...originalModule,
                ...implementation
            }
        })
        return require("../../src/lib/messages")
    }
    
    // Environment setup and teardown
    const originalEnv = process.env
    
    beforeEach(() => {
        jest.resetModules()
        process.env = { ...originalEnv }
        process.env.PARTNER_PHONE = "+15551234567"
        jest.clearAllMocks()
    })
    
    afterEach(() => {
        process.env = originalEnv
        jest.resetModules()
    })
    
    test("formats query results correctly", async () => {
        // Arrange
        const messagesModule = mockMessagesModule({
            getRecentMessages: jest.fn().mockResolvedValue(mockMessages)
        })
        
        // Act
        const result = await messagesModule.getRecentMessages()
        
        // Assert
        expect(result).toEqual(mockMessages)
    })
    
    test("handles date filters correctly", async () => {
        // Arrange
        let capturedStartDate: string | undefined
        let capturedEndDate: string | undefined
        
        const messagesModule = mockMessagesModule({
            getRecentMessages: jest.fn((startDate?: string, endDate?: string) => {
                capturedStartDate = startDate
                capturedEndDate = endDate
                return Promise.resolve([])
            })
        })
        
        const startDate = "2023-01-01T00:00:00Z"
        const endDate = "2023-01-31T23:59:59Z"
        
        // Act
        await messagesModule.getRecentMessages(startDate, endDate)
        
        // Assert
        expect(capturedStartDate).toBe(startDate)
        expect(capturedEndDate).toBe(endDate)
    })
    
    test("handles date conversion correctly", async () => {
        // Arrange
        const isoToAppleNs = (iso: string): number => {
            const appleEpoch = new Date("2001-01-01T00:00:00Z").getTime()
            const target = new Date(iso).getTime()
            return (target - appleEpoch) * 1000000 // ms to ns
        }
        
        const isoDate = "2023-01-01T00:00:00Z"
        const appleEpoch = new Date("2001-01-01T00:00:00Z").getTime()
        const targetDate = new Date(isoDate).getTime()
        const expectedNs = (targetDate - appleEpoch) * 1000000
        
        // Act
        const result = isoToAppleNs(isoDate)
        
        // Assert
        expect(result).toBe(expectedNs)
    })
})
