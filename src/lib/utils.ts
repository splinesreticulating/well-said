export const parseSummaryToHumanReadable = (rawOutput: string): string => {
    console.debug("\n==== RAW CONTENT OUTPUT ====")
    console.debug(rawOutput)
    
    // Extract the summary from the raw output
    const summaryRegex = /Summary:[ \t]*(\n+)?(.+)/s
    const match = rawOutput.match(summaryRegex)
    
    if (!match) {
        return rawOutput
    }
    
    return match[2].trim()
}
