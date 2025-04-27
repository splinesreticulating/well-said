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

// Helper to revert input back to display div
function revertToDiv(val, div, suggDiv) {
    div.innerHTML = "";
    div.textContent = val;
    div.tabIndex = 0;
    div.onclick = () => {
        // Replace with input and copy button
        const input = document.createElement("input");
        input.type = "text";
        input.value = val;
        input.className = "reply-edit";
        input.style.width = "80%";
        input.style.marginRight = "0.5rem";
        const copyBtn = document.createElement("button");
        copyBtn.textContent = "Copy";
        copyBtn.className = "copy-btn";
        copyBtn.onclick = (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(input.value);
        };
        input.onblur = () => {
            revertToDiv(input.value, div, suggDiv);
        };
        input.onkeydown = (e) => {
            if (e.key === "Enter") {
                revertToDiv(input.value, div, suggDiv);
            }
        };
        div.innerHTML = "";
        div.appendChild(input);
        div.appendChild(copyBtn);
        input.focus();
    };
}

async function fetchReplies() {
    const suggDiv = document.getElementById("suggestions")
    if (suggDiv) {
        suggDiv.innerHTML = '<div class="loading-indicator spinner"></div>'
    }
    // Remove summary and count when loading
    const convoDiv = document.getElementById("conversation");
    if (convoDiv) {
        const oldSummary = convoDiv.querySelector('.summary');
        if (oldSummary) oldSummary.remove();
        const oldCount = convoDiv.querySelector('.message-count');
        if (oldCount) oldCount.remove();
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

        const { summary, replies, messageCount } = await res.json()

        const convoDiv = document.getElementById("conversation");
        // Only update the summary, not the timeframe controls
        const summaryDiv = document.createElement("div");
        summaryDiv.className = "summary";
        summaryDiv.textContent = summary;
        // Remove any existing summary
        const oldSummary = convoDiv.querySelector('.summary');
        if (oldSummary) oldSummary.remove();
        convoDiv.appendChild(summaryDiv);
        // Only show message count if summary is non-empty
        let countDiv = convoDiv.querySelector('.message-count');
        if (summary && summary.trim().length > 0) {
            if (!countDiv) {
                countDiv = document.createElement('div');
                countDiv.className = 'message-count';
                countDiv.style.fontSize = '0.95em';
                countDiv.style.color = '#555';
                countDiv.style.marginBottom = '0.25rem';
            }
            const safeCount = (typeof messageCount === 'number' && !Number.isNaN(messageCount)) ? messageCount : 0;
            countDiv.textContent = `- Summarized ${safeCount} message${safeCount === 1 ? '' : 's'}`;
            convoDiv.appendChild(countDiv);
        } else if (countDiv) {
            countDiv.remove();
        }
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
            div.tabIndex = 0;
            div.onclick = () => {
                // Get computed style of the div for sizing
                const computed = window.getComputedStyle(div);
                // Calculate rows based on line breaks in reply text
                const lineCount = (reply.match(/\n/g) || []).length + 1;
                // Create textarea
                const textarea = document.createElement("textarea");
                textarea.value = reply;
                textarea.className = "reply-edit";
                textarea.style.boxSizing = "border-box";
                textarea.rows = lineCount;
                textarea.style.font = computed.font;
                textarea.style.padding = computed.padding;
                textarea.style.borderRadius = computed.borderRadius;
                textarea.style.border = computed.border;
                textarea.style.marginRight = "0.5rem";
                textarea.style.resize = "vertical";
                // Let browser auto-size width, but set minWidth for aesthetics
                textarea.style.minWidth = '200px';
                // Initial resize: auto height for content
                textarea.style.height = 'auto';
                textarea.style.height = `${textarea.scrollHeight}px`;
                textarea.oninput = function() {
                    this.style.height = 'auto';
                    this.style.height = `${this.scrollHeight}px`;
                };

                const copyBtn = document.createElement("button");
                copyBtn.textContent = "Copy";
                copyBtn.className = "copy-btn";
                copyBtn.onclick = (e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(`${textarea.value}`);
                };
                // Save on blur or Enter
                textarea.onblur = () => {
                    revertToDiv(textarea.value, div, suggDiv);
                };
                textarea.onkeydown = (e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        revertToDiv(textarea.value, div, suggDiv);
                    }
                };
                div.innerHTML = "";
                div.appendChild(textarea);
                div.appendChild(copyBtn);
                textarea.focus();
            };
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
