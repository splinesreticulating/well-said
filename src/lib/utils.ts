export const parseSummaryToHumanReadable = (rawOutput: string): string => {
    // Extract the summary from the raw output
    // The summary is everything before the "----" marker
    const marker = "---"
    const summaryEndIndex = rawOutput.indexOf(marker)

    // Extract the summary
    const summary = rawOutput.substring(0, summaryEndIndex).trim()

    if (!summary) {
        return "(No summary available)"
    }

    // Remove "**Brief Summary:**" or similar patterns
    let cleaned = summary

    // Remove any variation of the Brief Summary prefix with or without asterisks
    cleaned = cleaned.replace(/^\s*\*{0,2}\s*Brief Summary:\s*\*{0,2}\s*/i, "")

    // Also remove any remaining leading asterisks
    cleaned = cleaned.replace(/^\s*\*+\s*/, "")

    // Split the text into narrative and structured sections
    let mainNarrative = cleaned
    let structuredSections = ""

    // Extract structured sections if they exist
    const sectionMarkers = [
        "Main Topics:",
        "**Main topics:**",
        "Emotional Tone:",
        "**Emotional tone:**",
        "Changes in mood:",
        "**Changes in mood:**",
    ]

    // Find the earliest section marker
    let earliestIndex = cleaned.length
    let foundMarker = false

    for (const marker of sectionMarkers) {
        const index = cleaned.indexOf(marker)
        if (index !== -1 && index < earliestIndex) {
            earliestIndex = index
            foundMarker = true
        }
    }

    if (foundMarker) {
        // Split the text at the earliest section marker
        mainNarrative = cleaned.substring(0, earliestIndex).trim()
        structuredSections = cleaned.substring(earliestIndex).trim()
    }

    // Convert the main narrative to HTML paragraphs
    // Look for sentences that might indicate topic changes
    const paragraphs = mainNarrative
        .replace(/\. The conversation/g, ".||The conversation")
        .replace(/\. The discussion/g, ".||The discussion")
        .replace(/\. The mood/g, ".||The mood")
        .replace(/\. You try/g, ".||You try")
        .replace(/\. Your partner/g, ".||Your partner")
        .split("||")

    // Create HTML paragraphs
    const mainNarrativeHtml = paragraphs
        .map((p) => `<p>${p.trim()}</p>`)
        .join("")

    // Format structured sections with HTML
    let structuredSectionsHtml = ""
    if (structuredSections) {
        // Format section headers to be cleaner
        structuredSections = structuredSections.replace(
            /\*\*([^*]+):\*\*/g,
            "$1:",
        )

        // Process each section separately
        let currentHtml = ""
        const sections = structuredSections.split(/\n(?=[A-Z])/) // Split on newlines followed by capital letter

        for (const section of sections) {
            if (!section.trim()) continue

            // Extract section header and content
            const match = section.match(/^([^:]+):(.*)/s)
            if (match) {
                const [, header, content] = match

                // Create section header
                currentHtml += `<h3>${header.trim()}</h3>`

                // Process bullet points
                if (content.includes("-")) {
                    const items = content
                        .split(/\n\s*-\s*/)
                        .filter((item) => item.trim())
                    if (items.length > 0) {
                        currentHtml += "<ul>"
                        for (const item of items) {
                            if (item.trim()) {
                                currentHtml += `<li>${item.trim()}</li>`
                            }
                        }
                        currentHtml += "</ul>"
                    }
                } else {
                    // Regular paragraph content
                    currentHtml += `<p>${content.trim()}</p>`
                }
            } else {
                // Just a regular paragraph
                currentHtml += `<p>${section.trim()}</p>`
            }
        }

        structuredSectionsHtml = currentHtml
    }

    // Combine the formatted parts
    const result = mainNarrativeHtml + structuredSectionsHtml

    return result || "<p>(No summary available)</p>"
}
