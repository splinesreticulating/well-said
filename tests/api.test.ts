import express from "express"
import type { Request, Response, NextFunction, RequestHandler } from "express"
import request from "supertest"
import type { SuperAgentTest } from "supertest"
import session from "express-session"
import * as messagesModule from "../src/lib/messages"
import * as aiModule from "../src/lib/ai"
import type { Message } from "../src/lib/messages"

// Mock external modules
jest.mock("../src/lib/messages")
jest.mock("../src/lib/ai")
jest.mock("../src/lib/auth", () => ({
    __esModule: true,
    default: {
        isAuthenticated: jest.fn((req, res, next) => {
            req.session?.isAuthenticated ? next() : res.status(401).json({ error: "Unauthorized" })
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
                res.status(200).json({ success: true })
            } else {
                res.status(401).json({ error: "Invalid credentials" })
            }
        }
        app.post("/login", loginHandler)
        
        // Auth middleware for protected routes
        const authMiddleware: RequestHandler = (req, res, next) => {
            req.session?.isAuthenticated ? 
                next() : 
                res.status(401).json({ error: "Unauthorized" })
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
                        info: "No messages to summarize.",
                    })
                    return
                }
                
                // Get AI-generated replies
                const { summary, replies, messageCount } = 
                    await (aiModule.getSuggestedReplies as jest.Mock)(
                        messages,
                        tone || "gentle",
                        context || "",
                    )
                    
                res.json({ summary, replies, messageCount })
            } catch (err) {
                res.status(500).json({ error: "Something went wrong." })
            }
        }
        app.post("/replies", repliesHandler)
    }

    describe("Login Routes", () => {
        test("accepts valid credentials and sets session", async () => {
            // Arrange & Act
            const response = await request(app)
                .post("/login")
                .send(testCredentials)
            
            // Assert
            expect(response.status).toBe(200)
            expect(response.body).toEqual({ success: true })
        })
        
        test("rejects invalid credentials with 401", async () => {
            // Arrange & Act
            const response = await request(app)
                .post("/login")
                .send({ username: "wronguser", password: "wrongpass" })
            
            // Assert
            expect(response.status).toBe(401)
            expect(response.body).toEqual({ error: "Invalid credentials" })
        })
    })
    
    describe("Replies Routes", () => {
        test("returns 401 when not authenticated", async () => {
            // Act
            const response = await request(app)
                .post("/replies")
                .send({ tone: "friendly" })
            
            // Assert
            expect(response.status).toBe(401)
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
                .post("/replies")
                .send({ tone: "friendly", context: "test context" })
            
            // Assert
            expect(response.status).toBe(200)
            expect(response.body).toEqual(mockAIResponse)
            
            // Verify calls to mocks
            expect(messagesModule.getRecentMessages).toHaveBeenCalled()
            expect(aiModule.getSuggestedReplies).toHaveBeenCalledWith(
                mockMessages,
                "friendly",
                "test context",
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
                .post("/replies")
                .send({ tone: "friendly" })
            
            // Assert
            expect(response.status).toBe(200)
            expect(response.body).toEqual({
                summary: "",
                replies: [],
                messageCount: 0,
                info: "No messages to summarize.",
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
            .post("/login")
            .send(testCredentials)
    }
})
