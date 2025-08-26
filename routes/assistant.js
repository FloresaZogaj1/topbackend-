import { Router } from "express";
import OpenAI from "openai";
import { z } from "zod";

const router = Router();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ReqSchema = z.object({
  message: z.string().min(1),
  history: z.array(z.object({ role: z.enum(["user","assistant","system"]), content: z.string() })).optional()
});

const SYSTEM_PROMPT = `
Ti je "Topi", asistent virtual premium i Top Mobile. Flet shqip, je konkret, i sjellshëm dhe teknik kur duhet.
Rregulla:
- Përgjigju shkurt dhe qartë (1-4 fjali).
- Jep hapa praktikë, linke vetëm nëse i ke (p.sh. /faq ose /contact), pa improvizime URL.
- Nëse kërkohet handoff te njeriu, sugjero WhatsApp/telefon.
- Mos premto gjëra që nuk i ofron dyqani. 
`;

router.post("/", async (req, res) => {
  try {
    const { message, history = [] } = ReqSchema.parse(req.body);
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-8),
      { role: "user", content: message }
    ];
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini", // ose modeli yt i preferuar
      messages,
      temperature: 0.4,
      max_tokens: 300
    });
    const reply = completion.choices[0]?.message?.content?.trim() || "S’kam përgjigje tani.";
    res.json({ reply });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "Bad request" });
  }
});

export default router;
