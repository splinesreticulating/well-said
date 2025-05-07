// Utility functions
const $ = (id) => document.getElementById(id);
const on = (el, event, handler) => el?.addEventListener(event, handler);

const saveContext = (val) => localStorage.setItem("well-said_context", val);
const loadContext = () => localStorage.getItem("well-said_context") || "";

const setupInputPersistence = () => {
    const contextInput = $("context-input");
    const contextDetails = $("context-details");
    if (!contextInput) return;
    contextInput.value = loadContext();
    on(contextInput, "input", (e) => saveContext(e.target?.value));
    on(contextInput, "focus", () => { if (contextDetails) contextDetails.open = true; });
};

const setupSelectRefresh = () => {
    // Listen for changes to the "window-back" select
    const windowBackEl = $("window-back");
    on(windowBackEl, "change", fetchReplies);

    // Listen for changes to the tone radio group
    const toneRadios = document.querySelectorAll('input[name="tone"]');
    for (const radio of toneRadios) {
        radio.addEventListener('change', (e) => {
            // Update active class for styling
            const labels = document.querySelectorAll('#tone-radio-group label');
            for (const label of labels) {
                label.classList.remove('active');
            }
            e.target.closest('label').classList.add('active');
            
            // Fetch new replies
            fetchReplies();
        });
    }
};

document.addEventListener("DOMContentLoaded", () => {
    setupInputPersistence();
    setupSelectRefresh();
    const regenBtn = document.getElementById("regenerate-btn");
    if (regenBtn) {
        regenBtn.addEventListener("click", fetchReplies);
    }
});

// Helper to revert input back to display div
function revertToDiv(val, div, suggDiv) {
    div.innerHTML = "";
    div.textContent = val;
    div.tabIndex = 0;
    div.onclick = () => showEditableInput(val, div, suggDiv);
}

function showEditableInput(val, div, suggDiv) {
    div.innerHTML = "";
    const input = document.createElement("input");
    input.type = "text";
    input.value = val;
    input.className = "reply-edit";
    input.style.width = "80%";
    input.style.marginRight = "0.5rem";
    const copyBtn = createCopyButton(() => input.value);
    input.onblur = () => revertToDiv(input.value, div, suggDiv);
    input.onkeydown = (e) => { if (e.key === "Enter") revertToDiv(input.value, div, suggDiv); };
    div.append(input, copyBtn);
    input.focus();
}

function createCopyButton(getValue) {
    const btn = document.createElement("button");
    btn.textContent = "Copy";
    btn.className = "copy-btn";
    btn.onclick = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(getValue());
    };
    return btn;
}

async function fetchReplies() {
    const suggDiv = document.getElementById("suggestions")
    if (suggDiv) {
        suggDiv.innerHTML = '<div class="loading-indicator">🧠</div>'
    }
    // Remove summary and count when loading
    const convoDiv = document.getElementById("conversation");
    if (convoDiv) {
        const oldSummary = convoDiv.querySelector('.summary');
        if (oldSummary) oldSummary.remove();
        const oldCount = convoDiv.querySelector('.message-count');
        if (oldCount) oldCount.remove();
    }
    // Get selected tone from radio buttons
    const toneRadio = document.querySelector('input[name="tone"]:checked');
    const tone = toneRadio ? toneRadio.value : "gentle";
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
        // Update message count
        const countDiv = document.createElement("div");
        countDiv.className = "message-count";
        countDiv.textContent = `${messageCount} messages`;
        convoDiv.appendChild(countDiv);
        // Show replies
        renderReplies(suggDiv, replies);
    } catch (error) {
        if (suggDiv) {
            suggDiv.innerHTML = '<div class="loading-indicator" style="color: var(--accent);">❌ Failed to load replies</div>';
        }
    }
}

function renderReplies(suggDiv, replies) {
    if (!suggDiv) return;
    suggDiv.innerHTML = "";
    for (const reply of replies) {
        if (reply && reply.trim() !== "") {
            suggDiv.appendChild(createReplyDiv(reply, suggDiv));
        }
    }
}

function createReplyDiv(reply, suggDiv) {
    const div = document.createElement("div");
    div.className = "reply";
    div.textContent = reply;
    div.tabIndex = 0;
    div.onclick = () => showReplyTextarea(reply, div, suggDiv);
    return div;
}

function showReplyTextarea(reply, div, suggDiv) {
    const computed = window.getComputedStyle(div);
    const lineCount = (reply.match(/\n/g) || []).length + 1;
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
    textarea.style.minWidth = '200px';
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
    textarea.oninput = function() {
        this.style.height = 'auto';
        this.style.height = `${this.scrollHeight}px`;
    };
    const copyBtn = createCopyButton(() => textarea.value);
    textarea.onblur = () => revertToDiv(textarea.value, div, suggDiv);
    textarea.onkeydown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            revertToDiv(textarea.value, div, suggDiv);
        }
    };
    div.innerHTML = "";
    div.append(textarea, copyBtn);
    textarea.focus();
}

fetchReplies();
