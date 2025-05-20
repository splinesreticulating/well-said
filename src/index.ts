import dotenv from "dotenv"
dotenv.config()

import express, { type Request, type Response, type NextFunction } from "express"
import { getRecentMessages } from "./lib/messages"
import { getSuggestedReplies } from "./lib/ai"
import auth from "./lib/auth"
import cors from "cors"
import session from "express-session"
import logger from "./lib/logger"
import helmet from "helmet"
import rateLimit from "express-rate-limit"
import { z } from "zod"

const app = express()
const PORT = 2309

// Hardened: Add helmet for HTTP headers
app.use(helmet())

// Hardened: Add rate limiting to all endpoints
app.use(rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
}))

// =============================
// Session configuration
// =============================
// IMPORTANT: For production, set SESSION_SECRET to a long, random value in your environment.
// The fallback is only suitable for development/testing.
if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET must be set in environment for secure session handling!');
}
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: true, // Always secure if exposed to internet
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
    }),
) // Hardened: require SESSION_SECRET, secure cookie, sameSite=lax

// =============================
// CORS configuration
// =============================
// Hardened: Restrict CORS to trusted origin from env
if (!process.env.CORS_ORIGIN) {
    throw new Error('CORS_ORIGIN must be set in environment for secure CORS!');
}
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }))
app.use(express.json())

// =============================
// Public static assets (unprotected)
// =============================
app.use("/login.html", express.static("public/login.html"));
app.use("/styles.css", express.static("public/styles.css"));
app.use("/dist", express.static("dist"));

// =============================
// Authentication routes (unprotected)
// =============================
app.post("/login", (req: Request, res: Response) => {
    auth.login(req, res)
});
app.get("/logout", (req: Request, res: Response) => {
    auth.logout(req, res)
});

// =============================
// Middleware to protect all other routes
// =============================
app.use((req: Request, res: Response, next: NextFunction) => {
    auth.isAuthenticated(req, res, next)
});

// =============================
// Protected static files (after authentication check)
// =============================
app.use(express.static("public"));

// Serve index.html for authenticated root requests
app.get("/", (req: Request, res: Response) => {
    res.sendFile("index.html", { root: "public" })
});

// Replies API (protected)
// Hardened: Validate input using zod
const repliesSchema = z.object({
    tone: z.string().optional(),
    context: z.string().optional(),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
});

app.post("/replies", async (req: Request, res: Response) => {
    const parseResult = repliesSchema.safeParse(req.body);
    if (!parseResult.success) {
        res.status(400).json({ error: "Invalid input", details: parseResult.error.errors });
        return;
    }
    const { tone, context, startDate, endDate } = parseResult.data;

    try {
        const messages = await getRecentMessages(startDate, endDate)
        if (!messages || messages.length === 0) {
            res.json({
                summary: "",
                replies: [],
                messageCount: 0,
                info: "No messages to summarize.",
            });
            return;
        }
        const { summary, replies, messageCount } = await getSuggestedReplies(
            messages,
            tone || "gentle",
            context || "",
        );
        res.json({ summary, replies, messageCount });
    } catch (err) {
        logger.error(err);
        res.status(500).json({ error: "Something went wrong." });
    }
})

app.listen(PORT, () => {
    logger.info(`✅ WellSaid app listening at http://localhost:${PORT}`)
})
