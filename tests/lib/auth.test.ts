import auth from "../../src/lib/auth"
import type { Request, Response } from "express"

// Import shared constants
import {
    LOGIN_PATH,
    LOGIN_ERROR_PATH,
    API_PATH_PREFIX,
    STATUS_OK,
    STATUS_UNAUTHORIZED,
    ERROR_UNAUTHORIZED,
    ERROR_INVALID_CREDENTIALS,
    TEST_USERNAME,
    TEST_PASSWORD
} from '../testConstants'

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
        process.env.AUTH_USERNAME = TEST_USERNAME
        process.env.AUTH_PASSWORD = TEST_PASSWORD
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
            expect(res.redirect).toHaveBeenCalledWith(LOGIN_ERROR_PATH)
            expect(next).not.toHaveBeenCalled()
        })

        test("returns 401 for API routes if not authenticated", () => {
            // Arrange
            const req = createMockRequest({ 
                session: { isAuthenticated: false },
                path: `${API_PATH_PREFIX}some-endpoint`
            })
            const res = createMockResponse()
            const next = jest.fn()

            // Act
            auth.isAuthenticated(req, res, next)
            
            // Assert
            expect(res.status).toHaveBeenCalledWith(STATUS_UNAUTHORIZED)
            expect(res.json).toHaveBeenCalledWith({ error: ERROR_UNAUTHORIZED })
            expect(next).not.toHaveBeenCalled()
        })
    })

    describe("login", () => {
        test("sets session and returns success with valid credentials", () => {
            // Arrange
            const req = createMockRequest({
                body: { username: TEST_USERNAME, password: TEST_PASSWORD }
            })
            const res = createMockResponse()

            // Act
            auth.login(req, res)
            
            // Assert
            expect(req.session.isAuthenticated).toBe(true)
            expect(req.session.username).toBe("testuser")
            expect(res.status).toHaveBeenCalledWith(STATUS_OK)
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
            expect(res.status).toHaveBeenCalledWith(STATUS_UNAUTHORIZED)
            expect(res.json).toHaveBeenCalledWith({ error: ERROR_INVALID_CREDENTIALS })
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
            expect(res.redirect).toHaveBeenCalledWith(LOGIN_PATH)
        })

        test("redirects to login when no session exists", () => {
            // Arrange
            const req = { session: null } as unknown as Request
            const res = createMockResponse()

            // Act
            auth.logout(req, res)
            
            // Assert
            expect(res.redirect).toHaveBeenCalledWith(LOGIN_PATH)
        })
    })
})
