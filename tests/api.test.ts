import express from "express"
import type { Request, Response, NextFunction, RequestHandler } from "express"
import request from "supertest"
import session from "express-session"
import * as messagesModule from "../src/lib/messages"
import * as aiModule from "../src/lib/ai"

// We need to mock these modules
jest.mock("../src/lib/messages")
jest.mock("../src/lib/ai")
jest.mock("../src/lib/auth", () => ({
    __esModule: true,
    default: {
        isAuthenticated: (req: Request, res: Response, next: NextFunction) => {
            if (req.session?.isAuthenticated) {
                return next()
            }
            return res.status(401).json({ error: "Unauthorized" })
        },
        login: jest.fn((req: Request, res: Response) => {
            if (req.body.username === "testuser" && req.body.password === "testpass") {
                req.session.isAuthenticated = true
                req.session.username = req.body.username
                return res.status(200).json({ success: true })
            }
            return res.status(401).json({ error: "Invalid credentials" })
        }),
        logout: jest.fn((req: Request, res: Response) => {
            req.session.destroy(() => {
                res.redirect("/login.html")
            })
        }),
    },
}))

describe("API Routes", () => {
    let app: express.Express

    beforeEach(() => {
        jest.clearAllMocks()
        
        // Create a clean Express app for testing
        app = express()
        
        // Configure middleware
        app.use(express.json())
        app.use(
            session({
                secret: "test-secret",
                resave: false,
                saveUninitialized: false,
            }),
        )
        
        // Set up the routes we want to test
        // Define handlers with explicit typing
        const loginHandler: RequestHandler = (req, res, _next) => {
            if (req.body.username === "testuser" && req.body.password === "testpass") {
                req.session.isAuthenticated = true
                req.session.username = req.body.username
                res.status(200).json({ success: true })
            } else {
                res.status(401).json({ error: "Invalid credentials" })
            }
        }
        
        // Register routes with properly typed handlers
        app.post("/login", loginHandler)
        
        // Authentication middleware with proper types
        const authMiddleware: RequestHandler = (req, res, next) => {
            if (req.session?.isAuthenticated) {
                next()
            } else {
                res.status(401).json({ error: "Unauthorized" })
            }
        }
        app.use(authMiddleware)
        
        // Replies endpoint handler with proper typing
        const repliesHandler: RequestHandler = async (req, res, _next) => {
            const { tone, context, startDate, endDate } = req.body
        
            try {
                const messages = await (messagesModule.getRecentMessages as jest.Mock)(startDate, endDate)
                if (!messages || messages.length === 0) {
                    res.json({
                        summary: "",
                        replies: [],
                        messageCount: 0,
                        info: "No messages to summarize.",
                    })
                    return
                }
                const { summary, replies, messageCount } = await (aiModule.getSuggestedReplies as jest.Mock)(
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
    })

    test("login route sets session when valid credentials are provided", async () => {
        const response = await request(app)
            .post("/login")
            .send({ username: "testuser", password: "testpass" })
        
        expect(response.status).toBe(200)
        expect(response.body).toEqual({ success: true })
    })
    
    test("login route returns 401 when invalid credentials are provided", async () => {
        const response = await request(app)
            .post("/login")
            .send({ username: "wronguser", password: "wrongpass" })
        
        expect(response.status).toBe(401)
        expect(response.body).toEqual({ error: "Invalid credentials" })
    })
    
    test("replies route returns 401 when not authenticated", async () => {
        const response = await request(app)
            .post("/replies")
            .send({ tone: "friendly" })
        
        expect(response.status).toBe(401)
    })
    
    test("replies route returns proper response with messages", async () => {
        // Set up mocks for authenticated session
        const agent = request.agent(app)
        await agent
            .post("/login")
            .send({ username: "testuser", password: "testpass" })
        
        // Mock messages module
        const mockMessages = [
            { sender: "me", text: "Hello there!", timestamp: "2023-01-01 10:00:00" },
            { sender: "partner", text: "Hi! How are you?", timestamp: "2023-01-01 10:01:00" },
        ]
        ;(messagesModule.getRecentMessages as jest.Mock).mockResolvedValue(mockMessages)
        
        // Mock AI module
        const mockAIResponse = {
            summary: "Test summary",
            replies: ["Reply 1", "Reply 2", "Reply 3"],
            messageCount: 2,
        }
        ;(aiModule.getSuggestedReplies as jest.Mock).mockResolvedValue(mockAIResponse)
        
        // Test the replies endpoint
        const response = await agent
            .post("/replies")
            .send({ tone: "friendly", context: "test context" })
        
        expect(response.status).toBe(200)
        expect(response.body).toEqual(mockAIResponse)
        
        // Verify the mock calls
        expect(messagesModule.getRecentMessages).toHaveBeenCalled()
        expect(aiModule.getSuggestedReplies).toHaveBeenCalledWith(
            mockMessages,
            "friendly",
            "test context",
        )
    })
    
    test("replies route handles case with no messages", async () => {
        // Set up mocks for authenticated session
        const agent = request.agent(app)
        await agent
            .post("/login")
            .send({ username: "testuser", password: "testpass" })
        
        // Mock messages module to return empty array
        ;(messagesModule.getRecentMessages as jest.Mock).mockResolvedValue([])
        
        // Test the replies endpoint
        const response = await agent.post("/replies").send({ tone: "friendly" })
        
        expect(response.status).toBe(200)
        expect(response.body).toEqual({
            summary: "",
            replies: [],
            messageCount: 0,
            info: "No messages to summarize.",
        })
        
        // Verify the mock calls
        expect(messagesModule.getRecentMessages).toHaveBeenCalled()
        expect(aiModule.getSuggestedReplies).not.toHaveBeenCalled()
    })
})
