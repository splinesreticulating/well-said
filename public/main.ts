// Utility functions
const $ = (id: string): HTMLElement | null => document.getElementById(id);
const on = <K extends keyof HTMLElementEventMap>(
  el: HTMLElement | null, 
  event: K, 
  handler: (ev: HTMLElementEventMap[K]) => void
): void => el?.addEventListener(event, handler);

const saveContext = (val: string): void => localStorage.setItem("well-said_context", val);
const loadContext = (): string => localStorage.getItem("well-said_context") || "";

const setupInputPersistence = (): void => {
    const contextInput = $("context-input") as HTMLTextAreaElement | null;
    const contextDetails = $("context-details") as HTMLDetailsElement | null;

    if (!contextInput) return;

    contextInput.value = loadContext();
    
    on(contextInput, "input", (e) => saveContext((e.target as HTMLTextAreaElement)?.value));
    on(contextInput, "focus", () => { if (contextDetails) contextDetails.open = true; });
};

const setupSelectRefresh = (): void => {
    // Listen for changes to the tone radio group
    const toneRadios = document.querySelectorAll('input[name="tone"]');
    
    for (const radio of toneRadios) {
        (radio as HTMLInputElement).addEventListener('change', (e) => {
            // Update active class for styling
            const labels = document.querySelectorAll('#tone-radio-group label');
            for (const label of labels) {
                label.classList.remove('active');
            }
            ((e.target as HTMLElement).closest('label') as HTMLElement).classList.add('active');
        });
    }
};

document.addEventListener("DOMContentLoaded", () => {
    setupInputPersistence();
    setupSelectRefresh();
    setupTestCopyArea();

    const goBtn = document.getElementById("go-btn");
    
    if (goBtn) {
        goBtn.addEventListener("click", fetchReplies);
    }
});

// Test copy functionality
function setupTestCopyArea(): void {
    const testCopyBtn = document.getElementById("test-copy-btn");
    const testText = document.getElementById("test-text") as HTMLInputElement;
    const copyStatus = document.getElementById("copy-status");
    
    if (testCopyBtn && testText && copyStatus) {
        testCopyBtn.addEventListener("click", () => {
            // Method 1: Using execCommand (older but widely supported)
            try {
                testText.select();
                const success = document.execCommand("copy");
                
                if (success) {
                    copyStatus.textContent = "✓ Copied using execCommand!";
                    setTimeout(() => { copyStatus.textContent = ""; }, 2000);
                } else {
                    copyStatus.textContent = "✗ execCommand failed, trying Clipboard API...";
                    copyStatus.style.color = "orange";
                    
                    // Try method 2 if method 1 fails
                    copyWithClipboardAPI();
                }
            } catch (err) {
                copyStatus.textContent = `✗ execCommand error: ${err}`;
                copyStatus.style.color = "red";
                
                // Try method 2 if method 1 fails with error
                copyWithClipboardAPI();
            }
        });
    }
    
    // Method 2: Using Clipboard API (modern)
    function copyWithClipboardAPI() {
        if (navigator.clipboard && testText) {
            navigator.clipboard.writeText(testText.value)
                .then(() => {
                    if (copyStatus) {
                        copyStatus.textContent = "✓ Copied using Clipboard API!";
                        copyStatus.style.color = "green";
                        setTimeout(() => { copyStatus.textContent = ""; }, 2000);
                    }
                })
                .catch(err => {
                    if (copyStatus) {
                        copyStatus.textContent = `✗ Both copy methods failed: ${err}`;
                        copyStatus.style.color = "red";
                    }
                });
        } else if (copyStatus) {
            copyStatus.textContent = "✗ Clipboard API not available";
            copyStatus.style.color = "red";
        }
    }
}

// Helper to revert input back to display div
function revertToDiv(val: string, div: HTMLElement, suggDiv: HTMLElement): void {
    div.innerHTML = "";
    div.textContent = val;
    div.tabIndex = 0;
    div.onclick = () => showEditableInput(val, div, suggDiv);
}

function showEditableInput(val: string, div: HTMLElement, suggDiv: HTMLElement): void {
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

function createCopyButton(getValue: () => string): HTMLButtonElement {
    const btn = document.createElement("button");
    
    btn.textContent = "Copy";
    btn.className = "copy-btn";
    
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        
        // Get the text to copy
        const textToCopy = getValue();
        
        // Create a temporary textarea element
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        
        // Make it visible but out of the way
        textArea.style.position = 'fixed';
        textArea.style.left = '0';
        textArea.style.top = '0';
        textArea.style.width = '2em';
        textArea.style.height = '2em';
        textArea.style.padding = '0';
        textArea.style.border = 'none';
        textArea.style.outline = 'none';
        textArea.style.boxShadow = 'none';
        textArea.style.background = 'transparent';
        
        document.body.appendChild(textArea);
        
        // Critical steps: focus and select the text
        textArea.focus();
        textArea.select();
        
        try {
            // Execute the copy command
            const successful = document.execCommand('copy');
            
            if (successful) {
                // Provide visual feedback
                const originalText = btn.textContent;
                btn.textContent = "Copied!";
                
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 1500);
            } else {
                console.error('execCommand returned false');
                // Try clipboard API as fallback
                useClipboardAPI(textToCopy, btn);
            }
        } catch (err) {
            console.error('Copy operation failed:', err);
            // Try clipboard API as fallback
            useClipboardAPI(textToCopy, btn);
        } finally {
            // Clean up
            document.body.removeChild(textArea);
        }
    });
    
    // Helper function for Clipboard API
    function useClipboardAPI(text: string, button: HTMLButtonElement) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    const originalText = button.textContent;
                    button.textContent = "Copied!";
                    setTimeout(() => {
                        button.textContent = originalText;
                    }, 1500);
                })
                .catch(err => console.error('Clipboard API failed:', err));
        }
    }
    
    return btn;
}

interface ReplyResponse {
    summary: string;
    replies: string[];
    messageCount: number;
}

async function fetchReplies(): Promise<void> {
    const suggDiv = document.getElementById("suggestions");
    
    if (suggDiv) {
        suggDiv.innerHTML = '<div class="loading-indicator">🧠</div>';
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
    const toneRadio = document.querySelector('input[name="tone"]:checked') as HTMLInputElement | null;
    const tone = toneRadio ? toneRadio.value : "gentle";
    const context = (document.getElementById("context-input") as HTMLTextAreaElement)?.value || "";
    const windowVal = (document.getElementById("window-back") as HTMLSelectElement)?.value || "3d";
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

        const { summary, replies, messageCount } = await res.json() as ReplyResponse;

        const convoDiv = document.getElementById("conversation");
        if (!convoDiv) return;
        
        // Only update the summary, not the timeframe controls
        const summaryDiv = document.createElement("div");
    
        summaryDiv.className = "summary";
        summaryDiv.innerHTML = summary; // Use innerHTML instead of textContent to render HTML
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
        if (suggDiv) {
            renderReplies(suggDiv, replies);
        }
    } catch (error) {
        if (suggDiv) {
            suggDiv.innerHTML = '<div class="loading-indicator" style="color: var(--accent);">❌ Failed to load replies</div>';
        }
    }
}

function renderReplies(suggDiv: HTMLElement, replies: string[]): void {
    if (!suggDiv) return;
    
    suggDiv.innerHTML = "";
    
    for (const reply of replies) {
        if (reply && reply.trim() !== "") {
            suggDiv.appendChild(createReplyDiv(reply, suggDiv));
        }
    }
}

function createReplyDiv(reply: string, suggDiv: HTMLElement): HTMLDivElement {
    const div = document.createElement("div");
    
    div.className = "reply";
    div.textContent = reply;
    div.tabIndex = 0;
    div.onclick = () => showReplyTextarea(reply, div, suggDiv);
    
    return div;
}

// Simple function to create a debug overlay for logging
function createDebugOverlay(): HTMLElement {
    // Check if it already exists
    let overlay = document.getElementById('debug-overlay');
    if (overlay) return overlay;
    
    // Create overlay if it doesn't exist
    overlay = document.createElement('div');
    overlay.id = 'debug-overlay';
    overlay.style.position = 'fixed';
    overlay.style.bottom = '10px';
    overlay.style.right = '10px';
    overlay.style.width = '300px';
    overlay.style.maxHeight = '200px';
    overlay.style.overflowY = 'auto';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.7)';
    overlay.style.color = 'white';
    overlay.style.padding = '10px';
    overlay.style.borderRadius = '5px';
    overlay.style.fontFamily = 'monospace';
    overlay.style.fontSize = '12px';
    overlay.style.zIndex = '9999';
    document.body.appendChild(overlay);
    return overlay;
}

// Function to log debug messages
function debugLog(message: string): void {
    const overlay = createDebugOverlay();
    const logEntry = document.createElement('div');
    logEntry.textContent = `${new Date().toLocaleTimeString()}: ${message}`;
    overlay.appendChild(logEntry);
    // Scroll to bottom
    overlay.scrollTop = overlay.scrollHeight;
    // Also log to console
    console.log(message);
}

function showReplyTextarea(reply: string, div: HTMLDivElement, suggDiv: HTMLElement): void {
    debugLog('showReplyTextarea called');
    
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
    textarea.oninput = (e: Event) => {
        const target = e.target as HTMLTextAreaElement;
        target.style.height = 'auto';
        target.style.height = `${target.scrollHeight}px`;
    };
    
    // Create a simple copy button with debug logging
    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Copy";
    copyBtn.className = "copy-btn";
    copyBtn.addEventListener("click", (e) => {
        debugLog('Copy button clicked');
        e.stopPropagation();
        
        // Set the copying flag to prevent textarea from reverting
        isCopying = true;
        debugLog('Set isCopying flag to true');
        
        // Log the textarea value
        debugLog(`Textarea value: "${textarea.value.substring(0, 20)}${textarea.value.length > 20 ? '...' : ''}"`);
        debugLog(`Textarea is focused: ${document.activeElement === textarea}`);
        
        // Focus and select the textarea
        textarea.focus();
        textarea.select();
        debugLog(`After focus/select, textarea is focused: ${document.activeElement === textarea}`);
        
        try {
            // Execute the copy command
            debugLog('Attempting execCommand("copy")');
            const successful = document.execCommand('copy');
            debugLog(`execCommand result: ${successful}`);
            
            if (successful) {
                debugLog('Copy successful via execCommand');
                copyBtn.textContent = "Copied!";
                setTimeout(() => {
                    copyBtn.textContent = "Copy";
                    // Reset the copying flag after the operation is complete
                    isCopying = false;
                    debugLog('Reset isCopying flag to false');
                    // Re-focus the textarea to allow continued editing
                    textarea.focus();
                }, 1500);
            } else {
                debugLog('execCommand returned false, trying Clipboard API');
                if (navigator.clipboard) {
                    debugLog('Clipboard API available, trying writeText');
                    navigator.clipboard.writeText(textarea.value)
                        .then(() => {
                            debugLog('Clipboard API writeText succeeded');
                            copyBtn.textContent = "Copied!";
                            setTimeout(() => {
                                copyBtn.textContent = "Copy";
                                // Reset the copying flag after the operation is complete
                                isCopying = false;
                                debugLog('Reset isCopying flag to false');
                                // Re-focus the textarea to allow continued editing
                                textarea.focus();
                            }, 1500);
                        })
                        .catch(err => {
                            debugLog(`Clipboard API failed: ${err}`);
                            // Reset the copying flag on error
                            isCopying = false;
                            debugLog('Reset isCopying flag to false due to error');
                            // Re-focus the textarea to allow continued editing
                            textarea.focus();
                        });
                } else {
                    debugLog('Clipboard API not available');
                    // Reset the copying flag if API not available
                    isCopying = false;
                    debugLog('Reset isCopying flag to false due to no API');
                    // Re-focus the textarea to allow continued editing
                    textarea.focus();
                }
            }
        } catch (err) {
            debugLog(`Copy operation error: ${err}`);
            if (navigator.clipboard) {
                debugLog('Trying Clipboard API after error');
                navigator.clipboard.writeText(textarea.value)
                    .then(() => {
                        debugLog('Clipboard API succeeded after error');
                        copyBtn.textContent = "Copied!";
                        setTimeout(() => {
                            copyBtn.textContent = "Copy";
                            // Reset the copying flag after the operation is complete
                            isCopying = false;
                            debugLog('Reset isCopying flag to false');
                            // Re-focus the textarea to allow continued editing
                            textarea.focus();
                        }, 1500);
                    })
                    .catch(err => {
                        debugLog(`Clipboard API also failed: ${err}`);
                        // Reset the copying flag on error
                        isCopying = false;
                        debugLog('Reset isCopying flag to false due to error');
                        // Re-focus the textarea to allow continued editing
                        textarea.focus();
                    });
            } else {
                // Reset the copying flag if no API available
                isCopying = false;
                debugLog('Reset isCopying flag to false due to no API after error');
                // Re-focus the textarea to allow continued editing
                textarea.focus();
            }
        }
    });
    
    // Store a flag to track if we're handling a copy operation
    let isCopying = false;
    
    textarea.onblur = (e) => {
        debugLog('Textarea blur event fired');
        
        // Don't revert if we're in the middle of a copy operation
        if (isCopying) {
            debugLog('Ignoring blur during copy operation');
            return;
        }
        
        // Check if the related target is our copy button
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (relatedTarget && relatedTarget.className === 'copy-btn') {
            debugLog('Blur caused by copy button click, not reverting');
            // Don't revert when clicking the copy button
            return;
        }
        
        debugLog('Reverting textarea to div');
        revertToDiv(textarea.value, div, suggDiv);
    };
    textarea.onkeydown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            debugLog('Enter pressed, reverting to div');
            e.preventDefault();
            revertToDiv(textarea.value, div, suggDiv);
        }
    };
    
    div.innerHTML = "";
    div.append(textarea, copyBtn);
    debugLog('Focusing textarea');
    textarea.focus();
}

// API calls will now only happen when the Go button is clicked
