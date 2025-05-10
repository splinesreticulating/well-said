import dotenv from "dotenv"
dotenv.config()

import express from "express"
import { getRecentMessages } from "./lib/messages"
import { getSuggestedReplies } from "./lib/ai"
import auth from "./lib/auth"
import cors from "cors"
import session from "express-session"

const app = express()
const PORT = 3000

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'wellsaid-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}))

app.use(cors())
app.use(express.static("public"))
app.use("/dist", express.static("dist"))
app.use(express.json())

// Authentication routes (not protected)
app.post("/login", (req, res) => {
    auth.login(req, res);
})
app.get("/logout", (req, res) => {
    auth.logout(req, res);
})

// Static routes that don't need authentication
app.get("/login.html", (req, res) => {
    res.sendFile("login.html", { root: "public" })
})

// Middleware to protect all other routes
app.use((req, res, next) => {
    // Skip authentication for static assets like CSS and JS files
    if (req.path.endsWith('.css') || req.path.endsWith('.js') || req.path.includes('/dist/')) {
        return next()
    }
    
    // Apply authentication middleware
    auth.isAuthenticated(req, res, next)
})

// Serve index.html only to authenticated users
app.get("/", (req, res) => {
    res.sendFile("index.html", { root: "public" })
})

app.post("/replies", async (req, res) => {
    const { tone, context, startDate, endDate } = req.body

    try {
        const messages = await getRecentMessages(startDate, endDate)
        if (!messages || messages.length === 0) {
            res.json({
                summary: "",
                replies: [],
                messageCount: 0,
                info: "No messages to summarize."
            })
            return
        }
        const { summary, replies, messageCount } = await getSuggestedReplies(
            messages,
            tone || "gentle",
            context || "",
        )
        res.json({ summary, replies, messageCount })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Something went wrong." })
    }
})

app.listen(PORT, () => {
    console.log(`✅ SmartReply app listening at http://localhost:${PORT}`)
})
