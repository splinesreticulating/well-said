import type { Request, Response, NextFunction } from "express"
import logger from "./logger"

// Define auth middleware and handlers as an object
const auth = {
    // Simple authentication middleware
    isAuthenticated: (req: Request, res: Response, next: NextFunction) => {
        // Check if user is authenticated
        if (req.session?.isAuthenticated) {
            return next()
        }

        // If it's an API request, return 401
        if (req.path.startsWith("/api") || req.path === "/replies") {
            return res.status(401).json({ error: "Unauthorized" })
        }

        // Otherwise redirect to login page
        res.redirect("/login.html?error=auth")
    },

    // Authentication handler
    login: (req: Request, res: Response) => {
        const { username, password } = req.body

        // Check against environment variables
        const validUsername = process.env.AUTH_USERNAME || "admin"
        const validPassword = process.env.AUTH_PASSWORD || "password"

        if (username === validUsername && password === validPassword) {
            // Set session
            if (req.session) {
                req.session.isAuthenticated = true
                req.session.username = username
            }

            return res.status(200).json({ success: true })
        }

        return res.status(401).json({ error: "Invalid credentials" })
    },

    // Logout handler
    logout: (req: Request, res: Response) => {
        if (req.session) {
            req.session.destroy((err: Error) => {
                if (err) {
                    logger.error("Logout error:", err)
                }
                res.redirect("/login.html")
            })
        } else {
            res.redirect("/login.html")
        }
    },
}

// Export the auth object
export default auth

// Add session types
declare module "express-session" {
    interface SessionData {
        isAuthenticated?: boolean
        username?: string
    }
}
