function saveContext(val) {
    localStorage.setItem("wellsaid_context", val)
}
function loadContext() {
    return localStorage.getItem("wellsaid_context") || ""
}

document.addEventListener("DOMContentLoaded", () => {
    const contextInput = document.getElementById("context-input")
    if (contextInput) {
        contextInput.value = loadContext()
        contextInput.addEventListener("input", (e) => {
            saveContext(e.target.value)
        })
    }
})

async function fetchReplies() {
    const suggDiv = document.getElementById("suggestions");
    if (suggDiv) {
        suggDiv.innerHTML = '<div class="loading-indicator">Loading...</div>';
    }
    const tone = document.getElementById("tone-select")?.value || "gentle"
    const context = document.getElementById("context-input")?.value || ""
    const windowVal = document.getElementById("window-back")?.value || "3d"
    const now = new Date()
    let start
    if (windowVal.endsWith("h")) {
        const hours = Number.parseInt(windowVal)
        start = new Date(now.getTime() - hours * 60 * 60 * 1000)
    } else if (windowVal.endsWith("d")) {
        const days = Number.parseInt(windowVal)
        start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    } else {
        // fallback: default to 3 days
        start = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    }
    const startDate = start.toISOString()

    try {
        const res = await fetch("/replies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tone, context, startDate }),
        })

        const { summary, replies } = await res.json()

        const convoDiv = document.getElementById("conversation")
        convoDiv.innerHTML = ""
        const summaryDiv = document.createElement("div")
        summaryDiv.className = "summary"
        summaryDiv.textContent = summary
        convoDiv.appendChild(summaryDiv)

        const suggDiv = document.getElementById("suggestions")
        suggDiv.innerHTML = ""
        for (const reply of replies) {
            const div = document.createElement("div")
            div.className = "reply"
            div.textContent = reply
            div.onclick = () => navigator.clipboard.writeText(reply)
            suggDiv.appendChild(div)
        }
        suggDiv.innerHTML += '<div class="loading-indicator" style="display: none;">Loaded</div>';
    } catch (error) {
        const suggDiv = document.getElementById("suggestions");
        if (suggDiv) {
            suggDiv.innerHTML = '<div class="loading-indicator" style="color: red;">Failed to load replies.</div>';
        }
    }
}

fetchReplies()
