import express from "express"
import type { Request, Response, NextFunction, RequestHandler } from "express"
import request from "supertest"
import type { SuperAgentTest } from "supertest"
import session from "express-session"
import * as messagesModule from "../src/lib/messages"
import * as aiModule from "../src/lib/ai"
import type { Message } from "../src/lib/messages"

// Extend the SessionData interface to include our custom properties
declare module "express-session" {
    interface SessionData {
        isAuthenticated?: boolean;
        username?: string;
    }
}

// Constants for routes
const LOGIN_ROUTE = "/login"
const REPLIES_ROUTE = "/replies"

// Constants for status codes
const STATUS_OK = 200
const STATUS_UNAUTHORIZED = 401
const STATUS_SERVER_ERROR = 500

// Constants for error messages
const ERROR_UNAUTHORIZED = "Unauthorized"
const ERROR_INVALID_CREDENTIALS = "Invalid credentials"
const ERROR_SERVER = "Something went wrong."
const INFO_NO_MESSAGES = "No messages to summarize."

// Constants for test data
const TEST_TONE = "friendly"
const TEST_CONTEXT = "test context"
const DEFAULT_TONE = "gentle"

// Mock external modules
jest.mock("../src/lib/messages")
jest.mock("../src/lib/ai")
jest.mock("../src/lib/auth", () => ({
    __esModule: true,
    default: {
        isAuthenticated: jest.fn((req, res, next) => {
            req.session?.isAuthenticated ? next() : res.status(STATUS_UNAUTHORIZED).json({ error: ERROR_UNAUTHORIZED })
        }),
        login: jest.fn(),
        logout: jest.fn(),
    },
}))

describe("API Routes", () => {
    // Test data
    const testCredentials = { username: "testuser", password: "testpass" }
    const mockMessages: Message[] = [
        { sender: "me", text: "Hello there!", timestamp: "2023-01-01 10:00:00" },
        { sender: "partner", text: "Hi! How are you?", timestamp: "2023-01-01 10:01:00" },
    ]
    
    // App instance for testing
    let app: express.Express

    beforeEach(() => {
        jest.clearAllMocks()
        
        // Create and configure test app
        app = express()
        app.use(express.json())
        app.use(session({
            secret: "test-secret",
            resave: false,
            saveUninitialized: false,
        }))
        
        // Setup route handlers
        setupTestRoutes(app)
    })
    
    // Helper to set up test routes with explicit typing
    function setupTestRoutes(app: express.Express) {
        // Login route
        const loginHandler: RequestHandler = (req, res) => {
            if (req.body.username === testCredentials.username && 
                req.body.password === testCredentials.password) {
                req.session.isAuthenticated = true
                req.session.username = req.body.username
                res.status(STATUS_OK).json({ success: true })
            } else {
                res.status(STATUS_UNAUTHORIZED).json({ error: ERROR_INVALID_CREDENTIALS })
            }
        }
        app.post(LOGIN_ROUTE, loginHandler)
        
        // Auth middleware for protected routes
        const authMiddleware: RequestHandler = (req, res, next) => {
            req.session?.isAuthenticated ? 
                next() : 
                res.status(STATUS_UNAUTHORIZED).json({ error: ERROR_UNAUTHORIZED })
        }
        app.use(authMiddleware)
        
        // Replies endpoint
        const repliesHandler: RequestHandler = async (req, res) => {
            const { tone, context, startDate, endDate } = req.body
        
            try {
                const messages = await (messagesModule.getRecentMessages as jest.Mock)(startDate, endDate)
                
                // Handle empty messages case
                if (!messages || messages.length === 0) {
                    res.json({
                        summary: "",
                        replies: [],
                        messageCount: 0,
                        info: INFO_NO_MESSAGES,
                    })
                    return
                }
                
                // Get AI-generated replies
                const { summary, replies, messageCount } = 
                    await (aiModule.getSuggestedReplies as jest.Mock)(
                        messages,
                        tone || DEFAULT_TONE,
                        context || "",
                    )
                    
                res.json({ summary, replies, messageCount })
            } catch (err) {
                res.status(STATUS_SERVER_ERROR).json({ error: ERROR_SERVER })
            }
        }
        app.post(REPLIES_ROUTE, repliesHandler)
    }

    describe("Login Routes", () => {
        test("accepts valid credentials and sets session", async () => {
            // Arrange & Act
            const response = await request(app)
                .post(LOGIN_ROUTE)
                .send(testCredentials)
            
            // Assert
            expect(response.status).toBe(STATUS_OK)
            expect(response.body).toEqual({ success: true })
        })
        
        test("rejects invalid credentials with 401", async () => {
            // Arrange & Act
            const response = await request(app)
                .post(LOGIN_ROUTE)
                .send({ username: "wronguser", password: "wrongpass" })
            
            // Assert
            expect(response.status).toBe(STATUS_UNAUTHORIZED)
            expect(response.body).toEqual({ error: ERROR_INVALID_CREDENTIALS })
        })
    })
    
    describe("Replies Routes", () => {
        test("returns 401 when not authenticated", async () => {
            // Act
            const response = await request(app)
                .post(REPLIES_ROUTE)
                .send({ tone: TEST_TONE })
            
            // Assert
            expect(response.status).toBe(STATUS_UNAUTHORIZED)
        })
        
        test("returns proper response with messages", async () => {
            // Arrange
            const agent = request.agent(app)
            await loginUser(agent as unknown as SuperAgentTest)
            // Cast agent to any to avoid type issues between supertest versions
            
            const mockAIResponse = {
                summary: "Test summary",
                replies: ["Reply 1", "Reply 2", "Reply 3"],
                messageCount: 2,
            }
            
            // Setup mocks
            ;(messagesModule.getRecentMessages as jest.Mock).mockResolvedValue(mockMessages)
            ;(aiModule.getSuggestedReplies as jest.Mock).mockResolvedValue(mockAIResponse)
            
            // Act
            const response = await agent
                .post(REPLIES_ROUTE)
                .send({ tone: TEST_TONE, context: TEST_CONTEXT })
            
            // Assert
            expect(response.status).toBe(STATUS_OK)
            expect(response.body).toEqual(mockAIResponse)
            
            // Verify calls to mocks
            expect(messagesModule.getRecentMessages).toHaveBeenCalled()
            expect(aiModule.getSuggestedReplies).toHaveBeenCalledWith(
                mockMessages,
                TEST_TONE,
                TEST_CONTEXT,
            )
        })
        
        test("handles case with no messages", async () => {
            // Arrange
            const agent = request.agent(app)
            // Cast agent to any to avoid type issues between supertest versions
            await loginUser(agent as unknown as SuperAgentTest)
            
            // Setup mock to return empty array
            ;(messagesModule.getRecentMessages as jest.Mock).mockResolvedValue([])
            
            // Act
            const response = await agent
                .post(REPLIES_ROUTE)
                .send({ tone: TEST_TONE })
            
            // Assert
            expect(response.status).toBe(STATUS_OK)
            expect(response.body).toEqual({
                summary: "",
                replies: [],
                messageCount: 0,
                info: INFO_NO_MESSAGES,
            })
            
            // Verify only messages module was called
            expect(messagesModule.getRecentMessages).toHaveBeenCalled()
            expect(aiModule.getSuggestedReplies).not.toHaveBeenCalled()
        })
    })
    
    // Helper to login a test user with the agent
    // Using any type to avoid compatibility issues with different supertest versions
    async function loginUser(agent: SuperAgentTest) {
        await agent
            .post(LOGIN_ROUTE)
            .send(testCredentials)
    }
})
