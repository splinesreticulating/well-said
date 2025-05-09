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

function createCopyButton(getValue: () => string): HTMLButtonElement {
    const btn = document.createElement("button");
    
    btn.textContent = "Copy";
    btn.className = "copy-btn";
    
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        
        // Get the text to copy
        const textToCopy = getValue();
        
        // First try the Clipboard API (works better on mobile, especially iOS)
        if (navigator.clipboard) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => {
                    // Provide visual feedback
                    const originalText = btn.textContent;
                    btn.textContent = "Copied!";
                    
                    setTimeout(() => {
                        btn.textContent = originalText;
                    }, 1500);
                })
                .catch(err => {
                    console.error('Clipboard API failed:', err);
                    // Fall back to execCommand method
                    useExecCommand(textToCopy, btn);
                });
        } else {
            // Fall back to execCommand method if Clipboard API isn't available
            useExecCommand(textToCopy, btn);
        }
    });
    
    // Helper function for execCommand method (fallback)
    function useExecCommand(text: string, button: HTMLButtonElement) {
        // Create a temporary textarea element
        const textArea = document.createElement('textarea');
        textArea.value = text;
        
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
        textArea.style.opacity = '0';
        
        document.body.appendChild(textArea);
        
        try {
            // Critical steps for iOS: need to be visible and in the DOM
            textArea.contentEditable = 'true';
            textArea.readOnly = false;
            
            // Focus and select the text
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
            
            // Execute the copy command
            const successful = document.execCommand('copy');
            
            if (successful) {
                // Provide visual feedback
                const originalText = button.textContent;
                button.textContent = "Copied!";
                
                setTimeout(() => {
                    button.textContent = originalText;
                }, 1500);
            } else {
                console.error('execCommand returned false');
                button.textContent = "Copy failed";
                setTimeout(() => {
                    button.textContent = "Copy";
                }, 1500);
            }
        } catch (err) {
            console.error('Copy operation failed:', err);
            button.textContent = "Copy failed";
            setTimeout(() => {
                button.textContent = "Copy";
            }, 1500);
        } finally {
            // Clean up
            document.body.removeChild(textArea);
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
    const convoDiv = document.getElementById("conversation");
    
    // Clear the suggestions area
    if (suggDiv) {
        suggDiv.innerHTML = '';
    }
    
    // Show loading indicator in the summary area
    if (convoDiv) {
        // Remove existing summary if any
        const oldSummary = convoDiv.querySelector('.summary');
        if (oldSummary) oldSummary.remove();
        
        // Add loading indicator to conversation area
        const loadingDiv = document.createElement("div");
        loadingDiv.className = "summary";
        loadingDiv.innerHTML = '<div class="loading-indicator">🧠</div>';
        convoDiv.appendChild(loadingDiv);
    
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
        summaryDiv.innerHTML = summary;

        // Remove any existing summary
        const oldSummary = convoDiv.querySelector('.summary');
    
        if (oldSummary) oldSummary.remove();
        
        // Remove any loading indicator
        const loadingIndicator = convoDiv.querySelector('.loading-indicator');
        if (loadingIndicator) loadingIndicator.remove();
        
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
        // Show error in the summary area
        if (convoDiv) {
            const oldSummary = convoDiv.querySelector('.summary');
            if (oldSummary) oldSummary.remove();
            
            const errorDiv = document.createElement("div");
            errorDiv.className = "summary";
            errorDiv.innerHTML = '<div class="loading-indicator" style="color: var(--accent);">❌ Failed to load replies</div>';
            convoDiv.appendChild(errorDiv);
        }
        
        // Clear suggestions area
        if (suggDiv) {
            suggDiv.innerHTML = '';
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
    const copyBtn = document.createElement("button");
    const replyText = document.createElement("div");
    
    // Set up the container div
    div.className = "reply";
    
    // Set up the text container
    replyText.className = "reply-text";
    replyText.textContent = reply;
    
    // Set up the copy button with icon
    copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    copyBtn.className = "copy-btn";
    copyBtn.title = "Copy to clipboard";
    copyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        
        // Try Clipboard API first
        if (navigator.clipboard) {
            navigator.clipboard.writeText(reply)
                .then(() => {
                    copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
                        copyBtn.classList.remove('copied');
                    }, 1500);
                })
                .catch(err => {
                    console.error('Clipboard API failed:', err);
                    // Fall back to execCommand method
                    fallbackCopy();
                });
        } else {
            // Fall back to execCommand method
            fallbackCopy();
        }
        
        // Fallback copy method using execCommand
        function fallbackCopy() {
            try {
                // Create a temporary textarea
                const tempTextarea = document.createElement('textarea');
                tempTextarea.value = reply;
                tempTextarea.style.position = 'fixed';
                tempTextarea.style.left = '0';
                tempTextarea.style.top = '0';
                tempTextarea.style.opacity = '0';
                document.body.appendChild(tempTextarea);
                
                // Special handling for iOS
                tempTextarea.contentEditable = 'true';
                tempTextarea.readOnly = false;
                tempTextarea.focus();
                tempTextarea.select();
                
                // For iOS
                const range = document.createRange();
                range.selectNodeContents(tempTextarea);
                const selection = window.getSelection();
                if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
                tempTextarea.setSelectionRange(0, reply.length);
                
                const successful = document.execCommand('copy');
                document.body.removeChild(tempTextarea);
                
                if (successful) {
                    copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                    copyBtn.classList.add('copied');
                } else {
                    copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
                    copyBtn.classList.add('failed');
                }
                
                setTimeout(() => {
                    copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
                    copyBtn.classList.remove('copied');
                    copyBtn.classList.remove('failed');
                }, 1500);
                
            } catch (err) {
                console.error('Copy operation failed:', err);
                copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
                copyBtn.classList.add('failed');
                setTimeout(() => {
                    copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
                    copyBtn.classList.remove('failed');
                }, 1500);
            }
        }
    });
    
    // Assemble the components
    div.appendChild(replyText);
    div.appendChild(copyBtn);
    
    return div;
}
