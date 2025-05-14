import winston from "winston"

// Define log level colors
const colors = {
    error: "red",
    warn: "yellow",
    info: "green",
    http: "magenta",
    debug: "blue",
}

// Add colors to winston
winston.addColors(colors)

// Create the logger format
const format = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`,
    ),
)

// Create the logger instance
const logger = winston.createLogger({
    format,
    level: process.env.LOG_LEVEL || "info",
    transports: [new winston.transports.Console()],
})

// Export the logger
export default logger
