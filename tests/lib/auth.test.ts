import auth from "../../src/lib/auth"
import type { Request, Response, NextFunction } from "express"

describe("Auth Module", () => {
    // Test helpers to reduce duplication
    type MockRequestOptions = {
        session?: Record<string, unknown>;
        path?: string;
        body?: Record<string, unknown>;
        extras?: Record<string, unknown>;
    }
    
    const createMockRequest = (options: MockRequestOptions = {}): Request => ({
        session: options.session || {},
        path: options.path || "/",
        body: options.body || {},
        ...(options.extras || {}),
    }) as unknown as Request

    const createMockResponse = (): Response => ({
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    }) as unknown as Response

    // Setup and teardown for environment variables
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
            // Arrange
            const req = createMockRequest({ session: { isAuthenticated: true } })
            const res = createMockResponse()
            const next = jest.fn()

            // Act
            auth.isAuthenticated(req, res, next)
            
            // Assert
            expect(next).toHaveBeenCalled()
        })

        test("redirects to login for regular routes if not authenticated", () => {
            // Arrange
            const req = createMockRequest({ 
                session: { isAuthenticated: false },
                path: "/some-path"
            })
            const res = createMockResponse()
            const next = jest.fn()

            // Act
            auth.isAuthenticated(req, res, next)
            
            // Assert
            expect(res.redirect).toHaveBeenCalledWith("/login.html?error=auth")
            expect(next).not.toHaveBeenCalled()
        })

        test("returns 401 for API routes if not authenticated", () => {
            // Arrange
            const req = createMockRequest({ 
                session: { isAuthenticated: false },
                path: "/api/some-endpoint"
            })
            const res = createMockResponse()
            const next = jest.fn()

            // Act
            auth.isAuthenticated(req, res, next)
            
            // Assert
            expect(res.status).toHaveBeenCalledWith(401)
            expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" })
            expect(next).not.toHaveBeenCalled()
        })
    })

    describe("login", () => {
        test("sets session and returns success with valid credentials", () => {
            // Arrange
            const req = createMockRequest({
                body: { username: "testuser", password: "testpass" }
            })
            const res = createMockResponse()

            // Act
            auth.login(req, res)
            
            // Assert
            expect(req.session.isAuthenticated).toBe(true)
            expect(req.session.username).toBe("testuser")
            expect(res.status).toHaveBeenCalledWith(200)
            expect(res.json).toHaveBeenCalledWith({ success: true })
        })

        test("returns 401 with invalid credentials", () => {
            // Arrange
            const req = createMockRequest({
                body: { username: "wronguser", password: "wrongpass" }
            })
            const res = createMockResponse()

            // Act
            auth.login(req, res)
            
            // Assert
            expect(res.status).toHaveBeenCalledWith(401)
            expect(res.json).toHaveBeenCalledWith({ error: "Invalid credentials" })
        })
    })

    describe("logout", () => {
        test("destroys session and redirects to login", () => {
            // Arrange
            const destroyMock = jest.fn((callback) => callback(null))
            const req = createMockRequest({
                session: { destroy: destroyMock }
            })
            const res = createMockResponse()

            // Act
            auth.logout(req, res)
            
            // Assert
            expect(destroyMock).toHaveBeenCalled()
            expect(res.redirect).toHaveBeenCalledWith("/login.html")
        })

        test("redirects to login when no session exists", () => {
            // Arrange
            const req = { session: null } as unknown as Request
            const res = createMockResponse()

            // Act
            auth.logout(req, res)
            
            // Assert
            expect(res.redirect).toHaveBeenCalledWith("/login.html")
        })
    })
})
