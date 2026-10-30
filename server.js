
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.get("/", (req, res) => {
  res.json({
    name: "NEXON AI",
    status: "online",
    brain: "Groq"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    brain: "Groq",
    configured: Boolean(GROQ_API_KEY)
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({
        error: "Groq API key is missing. Add GROQ_API_KEY in Render Environment."
      });
    }

    const message = req.body?.message;

    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 30000);

    let groqResponse;

    try {
      groqResponse = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-20b",
            messages: [
              {
                role: "system",
                content:
                  "You are NEXON, an intelligent personal AI assistant. " +
                  "Be friendly, accurate, helpful and conversational. " +
                  "Answer questions clearly. Explain difficult topics step by step. " +
                  "Keep simple answers concise."
              },
              {
                role: "user",
                content: message.trim()
              }
            ],
            reasoning_effort: "low",
            max_completion_tokens: 1024
          }),
          signal: controller.signal
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    const data = await groqResponse.json();

    if (!groqResponse.ok) {
      console.error("Groq API error:", groqResponse.status, data);

      return res.status(groqResponse.status).json({
        error:
          data.error?.message ||
          "Groq could not generate a response."
      });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(502).json({
        error: "Groq returned an empty response."
      });
    }

    return res.json({ reply });

  } catch (error) {
    console.error("NEXON server error:", error);

    if (error.name === "AbortError") {
      return res.status(504).json({
        error: "AI request timed out. Please try again."
      });
    }

    return res.status(500).json({
      error: "NEXON could not connect to its AI brain."
    });
  }
});

app.listen(PORT, () => {
  console.log(`NEXON AI running on port ${PORT}`);
});
