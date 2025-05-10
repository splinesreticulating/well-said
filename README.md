<p align="center" style="display: flex; gap: 20px; justify-content: center;">
  <img src="./assets/box-art-front.png" alt="WellSaid Front Cover" width="45%" style="box-shadow: 0 4px 8px rgba(0,0,0,0.3); border-radius: 8px;"/>
  <img src="./assets/box-art-back.png" alt="WellSaid Back Cover" width="45%" style="box-shadow: 0 4px 8px rgba(0,0,0,0.3); border-radius: 8px;"/>
</p>

<h1 align="center">WellSaid</h1>
<p align="center"><b>Empathy. Upgraded.</b></p>

---

## 📝 Project Overview

**WellSaid** is a local-first, privacy-respecting smart reply tool for iMessage. It leverages AI (OpenAI GPT-4 and local LLMs via Khoj) to help you craft thoughtful, emotionally intelligent responses to your partner's texts—right from your own device. WellSaid summarizes recent conversations and suggests 2–3 natural, emotionally aware replies in your own voice, helping you communicate with empathy and clarity.

---

## ✨ Features

- 📱 **iMessage Smart Reply**: Summarizes recent conversations and suggests emotionally intelligent responses.
- 🎭 **Customizable Tone**: Choose your reply tone (gentle, honest, funny, reassuring, concise).
- 🧠 **Context Awareness**: Add context about your relationship or conversation for better suggestions.
- 🛡️ **Local-First & Private**: Runs locally; your messages never leave your machine unless you use an external LLM.
- ⚡ **Fast & Modern UI**: Clean, responsive web interface with instant feedback.
- 🔑 **Easy Setup**: Simple environment configuration and one-command start.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm
- Access to your iMessage chat.db (macOS)
- OpenAI API key (or local LLM via Khoj)

### Installation

```bash
# Clone the repo
$ git clone https://github.com/yourusername/well-said.git
$ cd well-said

# Install dependencies
$ npm install

# Copy and edit environment variables
$ cp .env.example .env
# Fill in your OpenAI API key, model, and partner phone in .env
```

### Running the App

```bash
# Start the development server
$ npm run dev

# Or build and start for production
$ npm run build
$ npm start
```

The app will be available at [http://localhost:2309](http://localhost:2309).

---

## 🛠️ Tech Stack
- **Frontend**: HTML, CSS, Vanilla JS (public/)
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite (reads iMessage chat.db)
- **AI**: OpenAI GPT-4 API, Khoj (local LLM support)
- **Authentication**: Simple username/password authentication

---

## 📁 Project Structure

```
well-said/
├── public/        # Frontend (HTML, CSS, JS)
├── src/           # Backend (TypeScript)
│   └── lib/       # AI, message, and prompt logic
├── assets/        # Images for README and app
├── .env.example   # Example environment variables
├── package.json   # Dependencies and scripts
└── README.md
```

---

## ⚙️ Configuration

Edit `.env` with your keys and settings:

```
OPENAI_API_KEY=your-key-here
OPENAI_MODEL=gpt-4
OPENAI_TEMPERATURE=0.7
PARTNER_PHONE=+19999999999
KHOJ_API_URL=http://127.0.0.1:42110/api/chat
```

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License

MIT License. See [LICENSE](./LICENSE) for details.

