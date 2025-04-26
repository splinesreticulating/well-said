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
        // Expand details when textarea is focused
        contextInput.addEventListener("focus", () => {
            if (contextDetails) contextDetails.open = true
        })
    }
    // Tone radio group event listener
    const toneGroup = document.getElementById("tone-group")
    if (toneGroup) {
        toneGroup.addEventListener("change", (e) => {
            if (e.target && e.target.name === "tone") {
                fetchReplies();
            }
        });
    }
    const windowBack = document.getElementById("window-back")
    if (windowBack) {
        windowBack.addEventListener("change", () => {
            fetchReplies()
        })
    }
})

async function fetchReplies() {
    const suggDiv = document.getElementById("suggestions");
    if (suggDiv) {
        suggDiv.innerHTML = '<div class="loading-indicator">Loading...</div>';
    }
    const toneRadio = document.querySelector('input[name="tone"]:checked');
    const tone = toneRadio ? toneRadio.value : "gentle"
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
        // Move 'Summarize messages from' and select above the summary
    const timeframeDiv = document.createElement("div")
    timeframeDiv.className = "timeframe-controls"
    timeframeDiv.innerHTML = `
      <label for="window-back"><strong>Summarize messages from:</strong></label>
      <select id="window-back" name="window-back">
        <option value="1h">Last hour</option>
        <option value="6h">Last 6 hours</option>
        <option value="12h">Last 12 hours</option>
        <option value="1d">Last day</option>
        <option value="2d">Last 2 days</option>
        <option value="3d">Last 3 days</option>
        <option value="4d">Last 4 days</option>
        <option value="5d">Last 5 days</option>
        <option value="7d">Last week</option>
      </select>
    `;
    convoDiv.appendChild(timeframeDiv);

    const summaryDiv = document.createElement("div")
    summaryDiv.className = "summary"
    summaryDiv.textContent = summary
    convoDiv.appendChild(summaryDiv)

    // Set the window-back select value to match current
    const windowBackSelect = timeframeDiv.querySelector("#window-back");
    if (windowBackSelect) {
      windowBackSelect.value = windowVal;
      windowBackSelect.addEventListener("change", () => {
        // Clear the summary text immediately
        const summaryDiv = convoDiv.querySelector('.summary');
        if (summaryDiv) summaryDiv.textContent = '';
        fetchReplies();
      });
    }

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
