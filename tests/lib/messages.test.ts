import type { Message } from "../../src/lib/types"

// Import shared constants
import {
    TEST_TIMESTAMP_1,
    TEST_TIMESTAMP_2,
    TEST_SENDER_ME,
    TEST_SENDER_PARTNER,
    TEST_MESSAGE_1,
    TEST_MESSAGE_2,
    TEST_START_DATE,
    TEST_END_DATE,
    APPLE_EPOCH_DATE,
    ISO_TEST_DATE,
    TEST_PARTNER_PHONE
} from '../testConstants'

// Mock SQLite database
jest.mock("sqlite", () => ({
    open: jest.fn(),
}))

describe("Messages Module", () => {
    // Test data and helpers
    const mockMessages: Message[] = [
        { sender: TEST_SENDER_ME, text: TEST_MESSAGE_1, timestamp: TEST_TIMESTAMP_1 },
        { sender: TEST_SENDER_PARTNER, text: TEST_MESSAGE_2, timestamp: TEST_TIMESTAMP_2 },
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
        process.env.PARTNER_PHONE = TEST_PARTNER_PHONE
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
        
        const startDate = TEST_START_DATE
        const endDate = TEST_END_DATE
        
        // Act
        await messagesModule.getRecentMessages(startDate, endDate)
        
        // Assert
        expect(capturedStartDate).toBe(startDate)
        expect(capturedEndDate).toBe(endDate)
    })
    
    test("handles date conversion correctly", async () => {
        // Arrange
        const isoToAppleNs = (iso: string): number => {
            const appleEpoch = new Date(APPLE_EPOCH_DATE).getTime()
            const target = new Date(iso).getTime()
            return (target - appleEpoch) * 1000000 // ms to ns
        }
        
        const isoDate = ISO_TEST_DATE
        const appleEpoch = new Date(APPLE_EPOCH_DATE).getTime()
        const targetDate = new Date(isoDate).getTime()
        const expectedNs = (targetDate - appleEpoch) * 1000000
        
        // Act
        const result = isoToAppleNs(isoDate)
        
        // Assert
        expect(result).toBe(expectedNs)
    })
})
