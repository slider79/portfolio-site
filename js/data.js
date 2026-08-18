/* ============================================================
   THE LIBRARY: every cartridge the machine can load.

   Order is deliberate: the deployed AI agents lead, because those are
   the ones a visitor can press START on and immediately use. Reports
   and undeployed builds sit at the back, where the NO DISC stamp is
   an honest label rather than a disappointment.

   `glyph`   names a renderer in js/covers.js. Each one is a different
             animated diagram of what the project actually does, not
             an icon. Nothing here is an image file; the whole library
             is drawn at runtime onto the 960x544 screen canvas.
   `accent`  drives the cover gradient AND, through the existing spill
             readback in psp.js, the colour of the light the screen
             throws across the shell. Pick these as if lighting a room.
   `live`    null means undeployed. START then falls through to `repo`
             and the cover earns a NO DISC stamp.
   ============================================================ */
window.SJ_WORKS = [
  {
    id: 'vox',
    title: 'Vox',
    tagline: 'A real-time AI voice agent',
    kind: 'VOICE AGENT',
    year: '2026',
    accent: '#ff5d3a',
    glyph: 'waveform',
    live: 'https://real-time-ai-voice-agent-gk4yhsiqeypmipxmxenb8x.streamlit.app',
    repo: 'https://github.com/slider79/Real-Time-AI-Voice-Agent',
    tech: ['Python', 'Groq Whisper', 'Groq LLM', 'ElevenLabs', 'Streamlit'],
    blurb: 'Talk to it and it talks back. Records your voice, transcribes it with Groq Whisper, reasons with a tool-calling Groq LLM, and replies out loud through ElevenLabs. Tools for time and arithmetic are wired in, so it can answer things a language model alone would guess at.'
  },
  {
    id: 'memory-chat',
    title: 'Memory Chat',
    tagline: 'A chatbot that actually remembers you',
    kind: 'MEMORY',
    year: '2026',
    accent: '#7b3fe4',
    glyph: 'memory',
    live: 'https://persistent-memory-chatbot-9h83e5n4mekkpohkauggxd.streamlit.app',
    repo: 'https://github.com/slider79/Persistent-Memory-Chatbot',
    tech: ['Python', 'Groq', 'Mem0', 'Streamlit'],
    blurb: 'Tell it you are 25 and that you like football, come back tomorrow after the app has restarted, and it still knows. Facts persist in Mem0 across restarts and redeploys, not just page reloads. Correct yourself and the old fact is updated rather than duplicated.'
  },
  {
    id: 'codex',
    title: 'Codex',
    tagline: 'A RAG assistant with live source control',
    kind: 'RAG',
    year: '2026',
    accent: '#5b57ef',
    glyph: 'vectors',
    live: 'https://rag-knowledge-assistant-5uoyjwkn7g5obsxv5yg22d.streamlit.app',
    repo: 'https://github.com/slider79/RAG-Knowledge-Assistant',
    tech: ['Python', 'Groq', 'Gemini embeddings', 'Chroma', 'Streamlit'],
    blurb: 'Upload PDFs, text or Word files and ask questions grounded in them. Add or delete sources at any time and watch the vector store re-index. A live dashboard reports retrieval quality, latency and answer faithfulness for every single query.'
  },
  {
    id: 'delphi',
    title: 'Delphi',
    tagline: 'A voice-first RAG assistant',
    kind: 'VOICE RAG',
    year: '2026',
    accent: '#e0224c',
    glyph: 'orb',
    live: 'https://rag-voice-assistant-theta.vercel.app',
    repo: 'https://github.com/slider79/RAG-Voice-Assistant',
    tech: ['Vapi', 'FastAPI', 'Groq', 'Gemini', 'Qdrant', 'Vercel'],
    blurb: 'Ask a question out loud and get a spoken answer grounded in your own documents. Vapi handles speech, streaming and turn-taking, but instead of answering from a generic model it calls this backend as its custom LLM, which runs retrieval and streams back a sourced answer.'
  },
  {
    id: 'dispatch',
    title: 'Dispatch',
    tagline: 'An autonomous newsroom of three agents',
    kind: 'MULTI-AGENT',
    year: '2026',
    accent: '#2f7fed',
    glyph: 'relay',
    live: 'https://news-automation-bot-crew-ai.vercel.app',
    repo: 'https://github.com/slider79/News-Automation-Bot-CrewAI',
    tech: ['CrewAI', 'Groq', 'Serper', 'Slack', 'Google Sheets', 'GitHub Actions'],
    blurb: 'Three CrewAI agents collaborate once a day without anyone pressing anything: a researcher finds the day’s news and drops syndicated repeats, an editor cuts it into a digest, and a distributor posts it to Slack and logs it to a spreadsheet.'
  },
  {
    id: 'scribe',
    title: 'Scribe',
    tagline: 'An agent that finds a video and transcribes it',
    kind: 'TOOL-CALLING',
    year: '2026',
    accent: '#12a05a',
    glyph: 'timeline',
    live: 'https://ai-video-transcription-wh8v-lime.vercel.app',
    repo: 'https://github.com/slider79/AI-Video-Transcription',
    tech: ['Python', 'Groq', 'SerpApi', 'Gemini', 'Vercel'],
    blurb: 'Ask for a video about photosynthesis and the agent decides, unprompted, to call search and then transcription. Two tools are handed to a Groq model: one finds a YouTube URL through SerpApi, the other transcribes it with Gemini. It runs as a CLI and as a serverless web app.'
  },
  {
    id: 'persona',
    title: 'Persona',
    tagline: 'Five scoped personalities that refuse to break character',
    kind: 'CHAT',
    year: '2026',
    accent: '#ff4b4b',
    glyph: 'masks',
    live: 'https://agentic-chat-ap9tcu5vuj6uzrulfdzefj.streamlit.app',
    repo: 'https://github.com/slider79/Agentic-Chat',
    tech: ['Python', 'Groq', 'Streamlit'],
    blurb: 'Pick a model, pick a personality, and chat. Each of the five personalities is scoped to one subject and politely refuses anything outside it, with a system prompt written to resist override attempts. History is kept per personality, so switching does not contaminate the thread.'
  },
  {
    id: 'mirage',
    title: 'Mirage',
    tagline: 'A conversational image generator',
    kind: 'IMAGE GEN',
    year: '2026',
    accent: '#9b5cf6',
    glyph: 'diffusion',
    live: null,
    repo: 'https://github.com/slider79/chainlit-image-generator',
    tech: ['Chainlit', 'Pollinations', 'Python'],
    blurb: 'Describe something and watch it appear. Built on Chainlit to learn how its decorator-driven model compares to Streamlit’s rerun loop. Images come from Pollinations, which needs no API key, so the whole app deploys with no secrets at all.'
  },
  {
    id: 'anon-mesh',
    title: 'ANON Mesh',
    tagline: 'An anonymous P2P messaging network',
    kind: 'DISTRIBUTED',
    year: '2026',
    accent: '#22c55e',
    glyph: 'gossip',
    live: null,
    repo: 'https://github.com/slider79/ANON_Deployment',
    tech: ['JavaScript', 'Gossip protocols', 'EigenTrust', 'Distributed systems'],
    blurb: 'A fully decentralised network with no central server, built for anonymous campus messaging. Messages spread peer to peer through gossip across constantly changing nodes, while EigenTrust reputation scoring keeps peers honest and the overlay topology absorbs heavy churn. Started at a NUST hackathon.'
  },
  {
    id: 'onyourway',
    title: 'OnYourWay',
    tagline: 'A campus ride-sharing app',
    kind: 'FULL-STACK',
    year: '2025',
    accent: '#f59e0b',
    glyph: 'route',
    live: null,
    repo: 'https://github.com/slider79/Campus-Ride-Sharing',
    tech: ['MongoDB', 'Express', 'React', 'Node.js', 'Google Maps', 'WebSockets'],
    blurb: 'A MERN carpooling platform with Google Maps for live routing. I designed the schema and REST API, built the ride-matching logic and JWT auth, and wired a trip dashboard with real-time messaging over WebSockets.'
  },
  {
    id: 'bsdi-fts',
    title: 'BSDI FTS',
    tagline: 'Digitising government file routing',
    kind: 'DJANGO',
    year: '2026',
    accent: '#0ea5e9',
    glyph: 'flow',
    live: null,
    repo: 'https://github.com/slider79/BSDI_FTS_sj',
    tech: ['Django', 'Python', 'PostgreSQL'],
    blurb: 'A file tracking system for the Balochistan Special Development Initiative. Files are created, attached to documents, and securely dispatched, forwarded and archived between departments inside a role-based ecosystem, with transparent visibility into where anything currently sits.'
  },
  {
    id: 'llms-comparison',
    title: 'LLMs Comparison',
    tagline: 'Five models, one document, every claim checked',
    kind: 'RESEARCH',
    year: '2026',
    accent: '#eab308',
    glyph: 'bars',
    live: null,
    repo: 'https://github.com/slider79/LLMs-Comparison',
    tech: ['Evaluation', 'Summarisation', 'Claude', 'DeepSeek', 'Gemini', 'GPT', 'Mistral'],
    blurb: 'Five language models got an identical peer-reviewed article and an identical prompt, then were scored on quality, accuracy, conciseness and hallucination rate. Every claim in every summary was verified against the source. Claude and DeepSeek tied at 9.0 by opposite routes, and exactly one hallucination appeared across all five.'
  },
  {
    id: 'web-scraping',
    title: 'Scraping Tools',
    tagline: 'Four scrapers, tested rather than read about',
    kind: 'RESEARCH',
    year: '2026',
    accent: '#14b8a6',
    glyph: 'scrape',
    live: null,
    repo: 'https://github.com/slider79/web-scraping-tools-exploration',
    tech: ['Jina', 'Firecrawl', 'BeautifulSoup', 'Crawl4AI'],
    blurb: 'A hands-on comparison written from my own testing, not from marketing pages. All four tools were pointed at the same site in two forms, static HTML and a JavaScript-rendered version. That second page was the whole story: it cleanly separates the tools that download HTML from the ones that actually render like a browser.'
  },
  {
    id: 'frontend-tools',
    title: 'Frontend Shortcuts',
    tagline: 'Thirteen design-to-code tools, every number checked',
    kind: 'RESEARCH',
    year: '2026',
    accent: '#ec4899',
    glyph: 'registry',
    live: null,
    repo: 'https://github.com/slider79/AI-Assisted-Frontend-Tools',
    tech: ['shadcn CLI', '21st.dev', 'Magic UI', 'React', 'Vite'],
    blurb: 'Rather than summarise thirteen landing pages, I built a throwaway React project and installed things into it. The finding: the shadcn CLI has quietly become the package manager for UI code, and it copies files without checking they fit. One install pulled in 41 files and imported next/dynamic into a project that was not Next.js. Nothing warned me.'
  }
];

/* The hero cut-out is swappable. 'cards' is the pack of playing cards,
   'dice' is the original. One word, nothing else to change. Whichever one the
   hero does not take goes to the contact section. */
window.SJ_HERO_CUTOUT = 'cards';

/* Background music. Put a track you have the rights to at
   assets/audio/theme1.mp3, flip this to true, and the toggle appears in the
   corner. It always starts silent and remembers the choice for the session.
   Left false, the file is never requested at all. */
window.SJ_MUSIC = true;
