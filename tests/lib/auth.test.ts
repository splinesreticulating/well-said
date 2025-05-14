import auth from "../../src/lib/auth"
import type { Request, Response, NextFunction } from "express"

describe("Auth Module", () => {
    // Store original env variables and restore after tests
    const originalEnv = process.env

    beforeEach(() => {
        jest.resetModules()
        process.env = { ...originalEnv }
        process.env.AUTH_USERNAME = "testuser"
        process.env.AUTH_PASSWORD = "testpass"
    })

    afterEach(() => {
        process.env = originalEnv
    })

    describe("isAuthenticated", () => {
        test("calls next() when user is authenticated", () => {
            const req = {
                session: { isAuthenticated: true },
                path: "/some-path",
            } as unknown as Request
            const res = {} as Response
            const next = jest.fn()

            auth.isAuthenticated(req, res, next)
            expect(next).toHaveBeenCalled()
        })

        test("redirects to login when user is not authenticated for regular routes", () => {
            const req = {
                session: { isAuthenticated: false },
                path: "/some-path",
            } as unknown as Request
            const res = {
                redirect: jest.fn(),
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            } as unknown as Response
            const next = jest.fn()

            auth.isAuthenticated(req, res, next)
            expect(res.redirect).toHaveBeenCalledWith("/login.html?error=auth")
            expect(next).not.toHaveBeenCalled()
        })

        test("returns 401 for API routes when user is not authenticated", () => {
            const req = {
                session: { isAuthenticated: false },
                path: "/api/some-endpoint",
            } as unknown as Request
            const res = {
                redirect: jest.fn(),
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            } as unknown as Response
            const next = jest.fn()

            auth.isAuthenticated(req, res, next)
            expect(res.status).toHaveBeenCalledWith(401)
            expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" })
            expect(next).not.toHaveBeenCalled()
        })
    })

    describe("login", () => {
        test("sets session and returns success when credentials are valid", () => {
            const req = {
                body: { username: "testuser", password: "testpass" },
                session: {},
            } as unknown as Request
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            } as unknown as Response

            auth.login(req, res)
            expect(req.session.isAuthenticated).toBe(true)
            expect(req.session.username).toBe("testuser")
            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith({ success: true })
        })

        test("returns 401 when credentials are invalid", () => {
            const req = {
                body: { username: "wronguser", password: "wrongpass" },
                session: {},
            } as unknown as Request
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            } as unknown as Response

            auth.login(req, res)
            expect(res.status).toHaveBeenCalledWith(401)
            expect(res.json).toHaveBeenCalledWith({ error: "Invalid credentials" })
        })
    })

    describe("logout", () => {
        test("destroys session and redirects to login", () => {
            const destroyMock = jest.fn((callback) => callback(null))
            const req = {
                session: { destroy: destroyMock },
            } as unknown as Request
            const res = {
                redirect: jest.fn(),
            } as unknown as Response

            auth.logout(req, res)
            expect(destroyMock).toHaveBeenCalled()
            expect(res.redirect).toHaveBeenCalledWith("/login.html")
        })

        test("redirects to login when no session exists", () => {
            const req = { session: null } as unknown as Request
            const res = {
                redirect: jest.fn(),
            } as unknown as Response

            auth.logout(req, res)
            expect(res.redirect).toHaveBeenCalledWith("/login.html")
        })
    })
})
