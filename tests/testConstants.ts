// Shared constants for tests

// Status codes
export const STATUS_OK = 200;
export const STATUS_UNAUTHORIZED = 401;
export const STATUS_SERVER_ERROR = 500;

// Error messages
export const ERROR_UNAUTHORIZED = "Unauthorized";
export const ERROR_INVALID_CREDENTIALS = "Invalid credentials";
export const ERROR_SERVER = "Something went wrong.";
export const ERROR_API_KEY = "OpenAI API key is not configured.";
export const ERROR_API_KEY_SETUP = "Please set up your OpenAI API key in the .env file.";
export const ERROR_RESPONSE = "(Sorry, I had trouble generating a response.)";
export const INFO_NO_MESSAGES = "No messages to summarize.";
export const MOCKED_SUMMARY = "Mocked summary";

// Routes and paths
export const LOGIN_ROUTE = "/login";
export const REPLIES_ROUTE = "/replies";
export const LOGIN_PATH = "/login.html";
export const LOGIN_ERROR_PATH = "/login.html?error=auth";
export const API_PATH_PREFIX = "/api/";

// Common test data
export const TEST_USERNAME = "testuser";
export const TEST_PASSWORD = "testpass";
export const TEST_PARTNER_PHONE = "+15551234567";

// Message data
export const TEST_TIMESTAMP_1 = "2023-01-01 10:00:00";
export const TEST_TIMESTAMP_2 = "2023-01-01 10:01:00";
export const TEST_SENDER_ME = "me";
export const TEST_SENDER_PARTNER = "partner";
export const TEST_MESSAGE_1 = "Hello there!";
export const TEST_MESSAGE_2 = "Hi! How are you?";

// Date testing
export const TEST_START_DATE = "2023-01-01T00:00:00Z";
export const TEST_END_DATE = "2023-01-31T23:59:59Z";
export const APPLE_EPOCH_DATE = "2001-01-01T00:00:00Z";
export const ISO_TEST_DATE = "2023-01-01T00:00:00Z";

// Tones
export const TONE_CONCISE = "concise";
export const DEFAULT_TONE = "gentle";

// Context
export const TEST_CONTEXT = "We're discussing a work project";

// API configuration (for tests only)
export const TEST_API_KEY = "test-api-key";
export const TEST_MODEL = "gpt-4";
export const OPENAI_API_ENDPOINT = "https://api.openai.com/v1/chat/completions";

// Test prompt prefixes and tags
export const TONE_PREFIX = "Tone: ";
export const ADDITIONAL_CONTEXT_PREFIX = "Additional context: ";
export const SUMMARY_TAG = "Summary: <summary>";
export const REPLY_1_TAG = "Reply 1: <reply>";
export const REPLY_2_TAG = "Reply 2: <reply>";
export const REPLY_3_TAG = "Reply 3: <reply>";
export const SYSTEM_INSTRUCTION = "Act as my therapist";
