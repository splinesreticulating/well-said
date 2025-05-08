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

    const goBtn = document.getElementById("go-btn");
    
    if (goBtn) {
        goBtn.addEventListener("click", fetchReplies);
    }
});



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



function showReplyTextarea(reply: string, div: HTMLDivElement, suggDiv: HTMLElement): void {
    
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

        e.stopPropagation();
        
        // Set the copying flag to prevent textarea from reverting
        isCopying = true;

        
        // Log the textarea value


        
        // Focus and select the textarea
        textarea.focus();
        textarea.select();

        
        try {
            // Execute the copy command

            const successful = document.execCommand('copy');

            
            if (successful) {

                copyBtn.textContent = "Copied!";
                setTimeout(() => {
                    copyBtn.textContent = "Copy";
                    // Reset the copying flag after the operation is complete
                    isCopying = false;
                
                    // Re-focus the textarea to allow continued editing
                    textarea.focus();
                }, 1500);
            } else {

                if (navigator.clipboard) {

                    navigator.clipboard.writeText(textarea.value)
                        .then(() => {

                            copyBtn.textContent = "Copied!";
                            setTimeout(() => {
                                copyBtn.textContent = "Copy";
                                // Reset the copying flag after the operation is complete
                                isCopying = false;
                            
                                // Re-focus the textarea to allow continued editing
                                textarea.focus();
                            }, 1500);
                        })
                        .catch(err => {

                            // Reset the copying flag on error
                            isCopying = false;

                            // Re-focus the textarea to allow continued editing
                            textarea.focus();
                        });
                } else {

                    // Reset the copying flag if API not available
                    isCopying = false;

                    // Re-focus the textarea to allow continued editing
                    textarea.focus();
                }
            }
        } catch (err) {

            if (navigator.clipboard) {

                navigator.clipboard.writeText(textarea.value)
                    .then(() => {

                        copyBtn.textContent = "Copied!";
                        setTimeout(() => {
                            copyBtn.textContent = "Copy";
                            // Reset the copying flag after the operation is complete
                            isCopying = false;
                        
                            // Re-focus the textarea to allow continued editing
                            textarea.focus();
                        }, 1500);
                    })
                    .catch(err => {

                        // Reset the copying flag on error
                        isCopying = false;

                        // Re-focus the textarea to allow continued editing
                        textarea.focus();
                    });
            } else {
                // Reset the copying flag if no API available
                isCopying = false;

                // Re-focus the textarea to allow continued editing
                textarea.focus();
            }
        }
    });
    
    // Store a flag to track if we're handling a copy operation
    let isCopying = false;
    
    textarea.onblur = (e) => {

        
        // Don't revert if we're in the middle of a copy operation
        if (isCopying) {

            return;
        }
        
        // Check if the related target is our copy button
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (relatedTarget && relatedTarget.className === 'copy-btn') {

            // Don't revert when clicking the copy button
            return;
        }
        

        revertToDiv(textarea.value, div, suggDiv);
    };
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

// API calls will now only happen when the Go button is clicked
