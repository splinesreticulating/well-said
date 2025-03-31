async function fetchReplies() {
  const tone = document.getElementById('tone-select')?.value || 'gentle';

  const res = await fetch('/replies', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tone }),
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
