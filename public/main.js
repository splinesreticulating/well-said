function saveContext(val) {
    localStorage.setItem("wellsaid_context", val)
}
function loadContext() {
    return localStorage.getItem("wellsaid_context") || ""
}

document.addEventListener("DOMContentLoaded", () => {
    const contextInput = document.getElementById("context-input")
    const contextDetails = document.getElementById("context-details")
    if (contextInput) {
        contextInput.value = loadContext()
        contextInput.addEventListener("input", (e) => {
            saveContext(e.target.value)
        })
        contextInput.addEventListener("focus", () => {
            if (contextDetails) contextDetails.open = true
        })
    }
    const toneSelect = document.getElementById("tone-select")
    if (toneSelect) {
        toneSelect.addEventListener("change", () => {
            fetchReplies()
        })
    }
    const windowBack = document.getElementById("window-back")
    if (windowBack) {
        windowBack.addEventListener("change", () => {
            fetchReplies()
        })
    }
})

async function fetchReplies() {
    const suggDiv = document.getElementById("suggestions")
    if (suggDiv) {
        suggDiv.innerHTML = '<div class="loading-indicator spinner"></div>'
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
        // default to shortest window
        start = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
    }
    const startDate = start.toISOString()

    try {
        const res = await fetch("/replies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tone, context, startDate }),
        })

        const { summary, replies } = await res.json()

        const convoDiv = document.getElementById("conversation");
        // Only update the summary, not the timeframe controls
        const summaryDiv = document.createElement("div");
        summaryDiv.className = "summary";
        summaryDiv.textContent = summary;
        // Remove any existing summary
        const oldSummary = convoDiv.querySelector('.summary');
        if (oldSummary) oldSummary.remove();
        convoDiv.appendChild(summaryDiv);
        // Set window-back select to correct value
        const windowBackSelect = document.getElementById("window-back");
        if (windowBackSelect) {
            windowBackSelect.value = windowVal;
            windowBackSelect.onchange = () => {
                summaryDiv.textContent = "";
                fetchReplies();
            };
        }

        const suggDiv = document.getElementById("suggestions")
        suggDiv.innerHTML = ""
        // Show only the first 3 replies by default
        const maxVisible = 3;
        const visibleReplies = replies.slice(0, maxVisible);
        const hiddenReplies = replies.slice(maxVisible);

        for (const reply of visibleReplies) {
            const div = document.createElement("div");
            div.className = "reply";
            div.textContent = reply;
            div.onclick = () => navigator.clipboard.writeText(reply);
            suggDiv.appendChild(div);
        }

        if (hiddenReplies.length > 0) {
            const showMoreBtn = document.createElement("button");
            showMoreBtn.textContent = `Show ${hiddenReplies.length} more repl${hiddenReplies.length === 1 ? 'y' : 'ies'}`;
            showMoreBtn.className = "show-more-replies";
            showMoreBtn.style.marginTop = "0.5rem";
            showMoreBtn.onclick = () => {
                for (const reply of hiddenReplies) {
                    const div = document.createElement("div");
                    div.className = "reply";
                    div.textContent = reply;
                    div.onclick = () => navigator.clipboard.writeText(reply);
                    suggDiv.appendChild(div);
                }
                showMoreBtn.remove();
            };
            suggDiv.appendChild(showMoreBtn);
        }

        // Add the loading indicator as a DOM element instead of using innerHTML (to avoid overwriting button)
        const loadingDiv = document.createElement("div");
        loadingDiv.className = "loading-indicator";
        loadingDiv.style.display = "none";
        loadingDiv.textContent = "Loaded";
        suggDiv.appendChild(loadingDiv);
    } catch (error) {
        const suggDiv = document.getElementById("suggestions")
        if (suggDiv) {
            suggDiv.innerHTML =
                '<div class="loading-indicator" style="color: red;">Failed to load replies.</div>'
        }
    }
}

fetchReplies()
