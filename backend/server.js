import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const port = 3000;
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

app.use(cors());
app.use(express.json());

const nameTriggers = [
    "isming", "ismin", "ismini", "ismini ayt", "ismini ayt!",
    "seni isming", "seni isming nima", "seni isming nima?",
    "atin", "ating", "ating nima", "ating nima?", "atingni ayt",
    "noming", "noming!", "noming nima", "noming nima?",
    "nomingni ayt", "nomingdi ayt", "seni noming", "seni noming?",
    "geminimisan", "isming geminimi", "gemini", "chatgpt misan",
    "gpt misan", "cloud misan", "allo cloud"
];

app.post('/chat', async (req, res) => {
    try {
        const { history, message } = req.body;

        if (!history || !message) {
            return res.status(400).json({ error: "Suhbat tarixi (history) va xabar (message) yuborilishi shart." });
        }

        const lowerMsg = message.toLowerCase();
        if (nameTriggers.some(trigger => lowerMsg.includes(trigger))) {
            return res.json({
                response: 'Men <span style="color:silver;">5<span style="color:gold;">0</span>-gram</span> loyihasini "infinite limit" modeliman!'
            });




        }

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        res.json({ response: text });

    } catch (error) {
        console.error("Gemini API xatoligi:", error);
        res.status(500).json({ error: "Modeldan javob olishda xatolik yuz berdi." });
    }
});

app.listen(port, () => {
    console.log(`Server http://localhost:${port} manzilida ishga tushdi`);
});
