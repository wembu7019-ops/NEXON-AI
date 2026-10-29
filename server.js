import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "20kb" }));

app.get("/", (_req, res) => {
  res.json({
    name: "NEXON Backend",
    status: "online",
    message: "NEXON backend is running. Send POST /api/chat to ask a question."
  });
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: "The AI key has not been configured on the server yet."
      });
    }

    const message = typeof req.body?.message === "string"
      ? req.body.message.trim()
      : "";

    if (!message) {
      return res.status(400).json({ error: "Please send a message." });
    }
    if (message.length > 8000) {
      return res.status(413).json({ error: "Message is too long." });
    }

    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [{
            text:
              "You are NEXON, a helpful, friendly personal AI assistant. " +
              "Be clear and honest. Do not claim you can access a phone, " +
              "Google account, calls, files, or robot unless a connected tool " +
              "actually provides that capability. User message: " + message
          }]
        }
      ]
    });

    const reply = result.text?.trim();
    if (!reply) {
      return res.status(502).json({ error: "The AI returned an empty answer. Try again." });
    }

    return res.json({ reply });
  } catch (error) {
    console.error("NEXON chat request failed:", error?.message || "Unknown error");
    return res.status(500).json({
      error: "NEXON could not get an AI response. Check the server logs and API quota."
    });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`NEXON backend listening on port ${port}`);
});
