function saveContext(val) {
  localStorage.setItem('wellsaid_context', val);
}
function loadContext() {
  return localStorage.getItem('wellsaid_context') || '';
}

document.addEventListener('DOMContentLoaded', () => {
  const contextInput = document.getElementById('context-input');
  if (contextInput) {
    contextInput.value = loadContext();
    contextInput.addEventListener('input', e => {
      saveContext(e.target.value);
    });
  }
});

async function fetchReplies() {
  const tone = document.getElementById('tone-select')?.value || 'gentle';
  const context = document.getElementById('context-input')?.value || '';

  const res = await fetch('/replies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tone, context }),
  });

  const { messages, replies } = await res.json();

  const convoDiv = document.getElementById('conversation');
  convoDiv.innerHTML = '';
  messages.forEach(msg => {
    const div = document.createElement('div');
    div.className = `message ${msg.sender}`;
    div.textContent = `${msg.sender === 'me' ? 'Me' : 'Partner'}: ${msg.text}`;
    convoDiv.appendChild(div);
  });

  const suggDiv = document.getElementById('suggestions');
  suggDiv.innerHTML = '';
  replies.forEach(reply => {
    const div = document.createElement('div');
    div.className = 'reply';
    div.textContent = reply;
    div.onclick = () => navigator.clipboard.writeText(reply);
    suggDiv.appendChild(div);
  });
}

fetchReplies();
