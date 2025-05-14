import dotenv from "dotenv"
dotenv.config()

import express from "express"
import { getRecentMessages } from "./lib/messages"
import { getSuggestedReplies } from "./lib/ai"
import auth from "./lib/auth"
import cors from "cors"
import session from "express-session"
import logger from "./lib/logger"

const app = express()
const PORT = 2309

// Session configuration
app.use(
    session({
        secret: process.env.SESSION_SECRET || "wellsaid-secret-key",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === "production",
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
    }),
)

app.use(cors())
app.use(express.json())

// Only serve login.html and assets without authentication
app.use("/login.html", express.static("public/login.html"))
app.use("/styles.css", express.static("public/styles.css"))
app.use("/dist", express.static("dist"))

// Authentication routes (not protected)
app.post("/login", (req, res) => {
    auth.login(req, res)
})
app.get("/logout", (req, res) => {
    auth.logout(req, res)
})

// Redirect root to login if not authenticated
app.get("/", (req, res, next) => {
    if (req.session?.isAuthenticated) {
        next()
    } else {
        res.redirect("/login.html")
    }
})

// Middleware to protect all other routes
app.use((req, res, next) => {
    auth.isAuthenticated(req, res, next)
})

// Serve protected static files (after authentication check)
app.use(express.static("public"))

// This route is already protected by the auth middleware above
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
                info: "No messages to summarize.",
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
        logger.error(err)
        res.status(500).json({ error: "Something went wrong." })
    }
})

app.listen(PORT, () => {
    logger.info(`✅ WellSaid app listening at http://localhost:${PORT}`)
})
