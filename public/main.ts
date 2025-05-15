/** Utility helpers for DOM and persistence */
const utils = {
    /**
     * Get an element by ID (shorthand for document.getElementById)
     */
    getById(id: string): HTMLElement | null {
        return document.getElementById(id);
    },

    /**
     * Add an event listener to an element, if it exists
     */
    on<K extends keyof HTMLElementEventMap>(
        el: HTMLElement | null,
        event: K,
        handler: (ev: HTMLElementEventMap[K]) => void
    ): void {
        el?.addEventListener(event, handler);
    },

    /**
     * Save context string to localStorage
     */
    saveContext(val: string): void {
        localStorage.setItem("well-said_context", val);
    },

    /**
     * Load context string from localStorage
     */
    loadContext(): string {
        return localStorage.getItem("well-said_context") || "";
    },
};

/** Setup input persistence for the context textarea */
function setupInputPersistence(): void {
    const contextInput = utils.getById("context-input") as HTMLTextAreaElement | null;
    const contextDetails = utils.getById("context-details") as HTMLDetailsElement | null;
    if (!contextInput) return;
    contextInput.value = utils.loadContext();
    utils.on(contextInput, "input", (e) =>
        utils.saveContext((e.target as HTMLTextAreaElement)?.value)
    );
    utils.on(contextInput, "focus", () => {
        if (contextDetails) contextDetails.open = true;
    });
}

/** Setup tone radio group refresh styling */
function setupSelectRefresh(): void {
    // Listen for changes to the tone radio group
    const toneRadios = document.querySelectorAll('input[name="tone"]');
    for (const radio of toneRadios) {
        (radio as HTMLInputElement).addEventListener("change", (e) => {
            // Update active class for styling
            const labels = document.querySelectorAll("#tone-radio-group label");
            for (const label of labels) {
                label.classList.remove("active");
            }
            (
                (e.target as HTMLElement).closest("label") as HTMLElement
            ).classList.add("active");
        });
    }
}


document.addEventListener("DOMContentLoaded", () => {
    setupInputPersistence()
    setupSelectRefresh()

    const goBtn = document.getElementById("go-btn")

    if (goBtn) {
        goBtn.addEventListener("click", fetchReplies)
    }
})

// Centralized utility function for copy-to-clipboard with visual feedback
function copyToClipboard(
    text: string,
    button: HTMLButtonElement,
    opts?: {
        successIcon?: string;
        failIcon?: string;
        normalIcon?: string;
        feedbackType?: "icon" | "text";
        feedbackDuration?: number;
    }
) {
    const {
        successIcon = '',
        failIcon = '',
        normalIcon = '',
        feedbackType = 'text',
        feedbackDuration = 1500,
    } = opts || {};

    // Helper to set feedback
    function setFeedback(type: 'success' | 'fail' | 'normal') {
        if (feedbackType === 'icon') {
            if (type === 'success') {
                button.innerHTML = successIcon;
                button.classList.add('copied');
            } else if (type === 'fail') {
                button.innerHTML = failIcon;
                button.classList.add('failed');
            } else {
                button.innerHTML = normalIcon;
                button.classList.remove('copied', 'failed');
            }
        } else {
            if (type === 'success') {
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                setTimeout(() => {
                    button.textContent = originalText || 'Copy';
                }, feedbackDuration);
            } else if (type === 'fail') {
                const originalText = button.textContent;
                button.textContent = 'Copy failed';
                setTimeout(() => {
                    button.textContent = originalText || 'Copy';
                }, feedbackDuration);
            } else {
                button.textContent = 'Copy';
                button.classList.remove('copied', 'failed');
            }
        }
    }

    // Clipboard API
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text)
            .then(() => {
                setFeedback('success');
                if (feedbackType === 'icon') {
                    setTimeout(() => setFeedback('normal'), feedbackDuration);
                }
            })
            .catch((err) => {
                console.error('Clipboard API failed:', err);
                execCommandFallback();
            });
    } else {
        execCommandFallback();
    }

    // Fallback using execCommand
    function execCommandFallback() {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '0';
            textArea.style.top = '0';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.contentEditable = 'true';
            textArea.readOnly = false;
            textArea.focus();
            textArea.select();
            // For iOS
            const range = document.createRange();
            range.selectNodeContents(textArea);
            const selection = window.getSelection();
            if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
            }
            textArea.setSelectionRange(0, text.length);
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            if (successful) {
                setFeedback('success');
                if (feedbackType === 'icon') {
                    setTimeout(() => setFeedback('normal'), feedbackDuration);
                }
            } else {
                setFeedback('fail');
                if (feedbackType === 'icon') {
                    setTimeout(() => setFeedback('normal'), feedbackDuration);
                }
            }
        } catch (err) {
            console.error('Copy operation failed:', err);
            setFeedback('fail');
            if (feedbackType === 'icon') {
                setTimeout(() => setFeedback('normal'), feedbackDuration);
            }
        }
    }
}

function createCopyButton(getValue: () => string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = 'Copy';
    btn.className = 'copy-btn';
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(getValue(), btn);
    });
    return btn;
}


interface ReplyResponse {
    summary: string
    replies: string[]
    messageCount: number
}

async function fetchReplies(): Promise<void> {
    const suggDiv = document.getElementById("suggestions")
    const convoDiv = document.getElementById("conversation")

    // Clear the suggestions area
    if (suggDiv) {
        suggDiv.innerHTML = ""
    }

    // Show loading indicator in the summary area
    if (convoDiv) {
        // Remove existing summary if any
        const oldSummary = convoDiv.querySelector(".summary")
        if (oldSummary) oldSummary.remove()

        // Add loading indicator to conversation area
        const loadingDiv = document.createElement("div")
        loadingDiv.className = "summary"
        loadingDiv.innerHTML = '<div class="loading-indicator">🧠</div>'
        convoDiv.appendChild(loadingDiv)

        const oldCount = convoDiv.querySelector(".message-count")
        if (oldCount) oldCount.remove()
    }

    // Get selected tone from radio buttons
    const toneRadio = document.querySelector(
        'input[name="tone"]:checked',
    ) as HTMLInputElement | null
    const tone = toneRadio ? toneRadio.value : "gentle"
    const context =
        (document.getElementById("context-input") as HTMLTextAreaElement)
            ?.value || ""
    const windowVal =
        (document.getElementById("window-back") as HTMLSelectElement)?.value ||
        "3d"
    const now = new Date()
    let start: Date

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

        const { summary, replies, messageCount } =
            (await res.json()) as ReplyResponse

        const convoDiv = document.getElementById("conversation")
        if (!convoDiv) return

        // Only update the summary, not the timeframe controls
        const summaryDiv = document.createElement("div")

        summaryDiv.className = "summary"
        summaryDiv.innerHTML = summary

        // Remove any existing summary
        const oldSummary = convoDiv.querySelector(".summary")

        if (oldSummary) oldSummary.remove()

        // Remove any loading indicator
        const loadingIndicator = convoDiv.querySelector(".loading-indicator")
        if (loadingIndicator) loadingIndicator.remove()

        convoDiv.appendChild(summaryDiv)
        // Update message count
        const countDiv = document.createElement("div")

        countDiv.className = "message-count"
        countDiv.textContent = `${messageCount} messages`
        convoDiv.appendChild(countDiv)

        // Show replies
        if (suggDiv) {
            renderReplies(suggDiv, replies)
        }
    } catch (error) {
        // Show error in the summary area
        if (convoDiv) {
            const oldSummary = convoDiv.querySelector(".summary")
            if (oldSummary) oldSummary.remove()

            const errorDiv = document.createElement("div")
            errorDiv.className = "summary"
            errorDiv.innerHTML =
                '<div class="loading-indicator" style="color: var(--accent);">❌ Failed to load replies</div>'
            convoDiv.appendChild(errorDiv)
        }

        // Clear suggestions area
        if (suggDiv) {
            suggDiv.innerHTML = ""
        }
    }
}

function renderReplies(suggDiv: HTMLElement, replies: string[]): void {
    if (!suggDiv) return

    suggDiv.innerHTML = ""

    for (const reply of replies) {
        if (reply && reply.trim() !== "") {
            suggDiv.appendChild(createReplyDiv(reply, suggDiv))
        }
    }
}

function createReplyDiv(reply: string, suggDiv: HTMLElement): HTMLDivElement {
    const div = document.createElement("div");
    const copyBtn = document.createElement("button");
    const replyText = document.createElement("div");

    // Set up the container div
    div.className = "reply";

    // Set up the text container
    replyText.className = "reply-text";
    replyText.textContent = reply;

    // Set up the copy button with icon
    const normalIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    const successIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    const failIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    copyBtn.innerHTML = normalIcon;
    copyBtn.className = "copy-btn";
    copyBtn.title = "Copy to clipboard";
    copyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        copyToClipboard(reply, copyBtn, {
            successIcon,
            failIcon,
            normalIcon,
            feedbackType: "icon",
            feedbackDuration: 1500,
        });
    });

    // Assemble the components
    div.appendChild(replyText);
    div.appendChild(copyBtn);

    return div;
}

