/**
 * WellSaid App Main Script
 * Organized for clarity and maintainability.
 *
 * NOTE: For best type safety, enable "strict": true in your tsconfig.json.
 *
 * Sections:
 * 1. DOM & Persistence Helpers
 * 2. Event Handlers
 * 3. API Logic
 * 4. UI Rendering Helpers
 * 5. Types & Interfaces
 */

// ================================
// 1. DOM & Persistence Helpers
// ================================

/** Utility helpers for DOM and persistence */
const utils = {
    /**
     * Get an element by ID (shorthand for document.getElementById), with type safety
     */
    getById<T extends HTMLElement = HTMLElement>(id: string): T | null {
        return document.getElementById(id) as T | null;
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

// ================================
// 2. Event Handlers
// ================================

/**
 * Setup input persistence for the context textarea
 * Loads and saves context to localStorage, and expands details on focus.
 */
const setupInputPersistence = (): void => {
    const contextInput = utils.getById<HTMLTextAreaElement>("context-input");
    const contextDetails = utils.getById<HTMLDetailsElement>("context-details");
    if (!contextInput) return;
    contextInput.value = utils.loadContext();
    utils.on(contextInput, "input", (e: Event) =>
        utils.saveContext((e.target as HTMLTextAreaElement)?.value ?? "")
    );
    utils.on(contextInput, "focus", () => {
        if (contextDetails) contextDetails.open = true;
    });
};

/** Setup tone radio group refresh styling */
/**
 * Toggle the 'active' class on the correct tone label
 * @param e - The event from the radio input
 */
const toggleActiveToneLabel = (e: Event): void => {
    const labels = document.querySelectorAll("#tone-radio-group label");
    for (const label of labels) label.classList.remove("active");
    const label = (e.target as HTMLElement).closest("label") as HTMLElement | null;
    if (label) label.classList.add("active");
};

/**
 * Setup tone radio group refresh styling
 * Adds change listeners to tone radios to update active state.
 */
const setupSelectRefresh = (): void => {
    // Listen for changes to the tone radio group
    const toneRadios = document.querySelectorAll('input[name="tone"]');
    for (const radio of toneRadios) {
        (radio as HTMLInputElement).addEventListener("change", toggleActiveToneLabel);
    }
};


// ================================
// 3. Main App Initialization
// ================================

document.addEventListener("DOMContentLoaded", () => {
    setupInputPersistence();
    setupSelectRefresh();

    const goBtn = utils.getById("go-btn");
    if (goBtn) {
        goBtn.addEventListener("click", fetchReplies);
    }
});

// ================================
// 4. UI Rendering Helpers
// ================================

/**
 * Centralized utility function for copy-to-clipboard with visual feedback
 * Handles both Clipboard API and execCommand fallback. Shows feedback on the button.
 */
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
    const setFeedback = (type: 'success' | 'fail' | 'normal') => {
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
    btn.className = "copy-btn";
    btn.title = "Copy to clipboard";
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(getValue(), btn);
    });
    return btn;
}


interface ReplyResponse {
    summary: string;
    replies: string[];
    messageCount: number;
}

// Main fetchReplies function, using centralized constants and utils
/** Show the pulsating brain loading indicator in the conversation area */
/**
 * Show the pulsating brain loading indicator in the conversation area
 * @param convoDiv - The conversation container
 */
function showLoadingIndicator(convoDiv: HTMLElement) {
    clearSummaryAndCount(convoDiv);
    const loadingDiv = document.createElement("div");
    loadingDiv.className = "summary";
    loadingDiv.innerHTML = `<div class="loading-indicator" aria-label="Loading"><span role="img" aria-label="brain" style="display:inline-block;">🧠</span></div>`;
    convoDiv.appendChild(loadingDiv);
}

/** Remove summary and message count from the conversation area */
/**
 * Remove summary and message count from the conversation area
 * @param convoDiv - The conversation container
 */
function clearSummaryAndCount(convoDiv: HTMLElement) {
    const oldSummary = convoDiv.querySelector(".summary");
    if (oldSummary) oldSummary.remove();
    const oldCount = convoDiv.querySelector(".message-count");
    if (oldCount) oldCount.remove();
}

/** Render the summary and message count in the conversation area */
/**
 * Render the summary and message count in the conversation area
 * @param convoDiv - The conversation container
 * @param summary - The summary HTML string
 * @param messageCount - The number of messages
 */
function renderSummaryAndCount(convoDiv: HTMLElement, summary: string, messageCount: number) {
    clearSummaryAndCount(convoDiv);
    const summaryDiv = document.createElement("div");
    summaryDiv.className = "summary";
    summaryDiv.innerHTML = summary;
    convoDiv.appendChild(summaryDiv);
    const countDiv = document.createElement("div");
    countDiv.className = "message-count";
    countDiv.textContent = `${messageCount} messages`;
    convoDiv.appendChild(countDiv);
}

/**
 * Render an error indicator in the conversation area with a custom message
 * @param convoDiv The conversation container element
 * @param message The error message to display
 */
/**
 * Render an error indicator in the conversation area with a custom message
 * @param convoDiv - The conversation container element
 * @param message - The error message to display
 */
function renderErrorIndicator(convoDiv: HTMLElement, message = "Failed to load replies") {
    clearSummaryAndCount(convoDiv);
    const errorDiv = document.createElement("div");
    errorDiv.className = "summary";
    errorDiv.innerHTML = `<div class='loading-indicator' style='color: var(--accent);'>❌ ${message}</div>`;
    convoDiv.appendChild(errorDiv);
}

/**
 * Log the error to the console and show a user-friendly message in the UI
 * @param error The error object
 * @param userMessage The message to display to the user
 */
/**
 * Log the error to the console and show a user-friendly message in the UI
 * @param error - The error object
 * @param userMessage - The message to display to the user
 */
function logAndShowError(error: unknown, userMessage: string) {
    console.error("[WellSaid]", error);
    const convoDiv = utils.getById("conversation");
    if (convoDiv) renderErrorIndicator(convoDiv, userMessage);
    const suggDivFinal = utils.getById("suggestions");
    if (suggDivFinal) suggDivFinal.innerHTML = "";
}

/**
 * Main fetchReplies function
 * Fetches replies from the API and updates the UI.
 */
async function fetchReplies(): Promise<void> {
    const suggDiv = utils.getById("suggestions");
    const convoDiv = utils.getById("conversation");

    // Clear the suggestions area
    if (suggDiv) suggDiv.innerHTML = "";
    if (convoDiv) showLoadingIndicator(convoDiv);

    // Get selected tone from radio buttons
    const toneRadio = document.querySelector('input[name="tone"]:checked') as HTMLInputElement | null;
    const tone = toneRadio ? toneRadio.value : "gentle";
    const context = utils.getById<HTMLTextAreaElement>("context-input")?.value || "";
    const windowVal = utils.getById<HTMLSelectElement>("window-back")?.value || "3d";
    const now = new Date();
    let start: Date;
    if (windowVal.endsWith("h")) {
        const hours = Number.parseInt(windowVal);
        start = new Date(now.getTime() - hours * 60 * 60 * 1000);
    } else if (windowVal.endsWith("d")) {
        const days = Number.parseInt(windowVal);
        start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    } else {
        // default to shortest window
        start = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    }
    const startDate = start.toISOString();
    try {
        const res = await fetch("/replies", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tone, context, startDate }),
        });
        const { summary, replies, messageCount } = (await res.json()) as ReplyResponse;
        const convoDiv = utils.getById("conversation");
        if (!convoDiv) return;

        // Render summary and count
        renderSummaryAndCount(convoDiv, summary, messageCount);

        // Show replies
        const suggDivFinal = utils.getById("suggestions");
        if (suggDivFinal) {
            renderReplies(suggDivFinal, replies);
        }
        return;
    } catch (error) {
        logAndShowError(error, "Failed to load replies. Please try again or check your connection.");
        return;
    }
}

/**
 * Render all replies into the suggestions container
 * @param suggDiv - The suggestions container
 * @param replies - Array of reply strings
 */
function renderReplies(suggDiv: HTMLElement, replies: string[]): void {
    if (!suggDiv) return

    suggDiv.innerHTML = ""

    for (const reply of replies) {
        if (reply && reply.trim() !== "") {
            suggDiv.appendChild(createReplyDiv(reply))
        }
    }
}

// ================================
// 5. Types & Interfaces
// ================================

/**
 * Interface for the API reply response
 */
interface ReplyResponse {
    summary: string;
    replies: string[];
    messageCount: number;
}

// ================================
// 6. Main Rendering Logic
// ================================

/**
 * Create a reply div with text and copy button
 * @param reply - The reply text
 * @param suggDiv - The parent suggestions container
 * @returns The reply div element
 */
function createReplyDiv(reply: string): HTMLDivElement {
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

