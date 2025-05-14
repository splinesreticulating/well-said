import logger from './logger';

export const parseSummaryToHumanReadable = (rawOutput: string): string => {
    logger.debug("\n==== RAW CONTENT OUTPUT ====")
    logger.debug(rawOutput)
    
    // Extract the summary from the raw output - get content between "Summary:" and "Suggested replies:"
    const summaryRegex = /Summary:[ \t]*(\n+)?([\s\S]*?)(?=\s*Suggested replies:|$)/
    const match = rawOutput.match(summaryRegex)
    
    if (!match) {
        return rawOutput
    }
    
    return match[2].trim()
}
