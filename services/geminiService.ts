import { GoogleGenAI, Type } from "@google/genai";
import { BlockData, ChecklistItem } from "../types";
import { v4 as uuidv4 } from 'uuid';

// Initialize Gemini Client
// Note: process.env.API_KEY is handled by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

export const generateBlockFromPrompt = async (prompt: string, centerPos: {x: number, y: number}): Promise<BlockData | null> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Create a single workspace block based on this request: "${prompt}".
      Return a JSON object describing the block.
      
      For lists of tasks, use type 'checklist'. 
      For code snippets, use type 'code'. 
      For structured data, task boards, or plans (like workout plans, study schedules), use type 'table'.
      For simple text, use type 'text'.
      
      If type is 'table', try to structure it usefuly. 
      If it's a tracking table (like "workout plan"), set the first column as a 'checkbox' column (header "Done").
      
      Determine a 'category' for the block: 'fitness' (gym, health), 'study' (books, learning), 'code' (programming), or 'general'.
      
      If the user asks for an image, strictly return type 'text' with the content being a description of the image they wanted, so we can show a placeholder or explanation, OR if a URL is provided in the prompt, use type 'image' and that URL.
      
      Make the content appropriate for the type.
      Provide a width (w) and height (h) that fits the content (min w 200, min h 100).
      Give it a relevant title.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['text', 'checklist', 'code', 'table', 'image'] },
            title: { type: Type.STRING },
            category: { type: Type.STRING, enum: ['fitness', 'study', 'code', 'general'] },
            content: { type: Type.STRING, description: "For checklist, provide a newline separated list. For code, the code string. For text, the text. For table, providing a JSON stringified object matching TableContent interface (headers, rows, columnTypes)." },
            tableData: {
                type: Type.OBJECT,
                properties: {
                    headers: { type: Type.ARRAY, items: { type: Type.STRING } },
                    rows: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.STRING } } },
                    columnTypes: { type: Type.ARRAY, items: { type: Type.STRING, enum: ['text', 'checkbox'] } }
                }
            },
            w: { type: Type.NUMBER },
            h: { type: Type.NUMBER },
          },
          required: ['type', 'w', 'h']
        }
      }
    });

    const result = JSON.parse(response.text || "{}");

    if (!result.type) return null;

    let finalContent: any = result.content;

    if (result.type === 'checklist' && typeof result.content === 'string') {
      const items = (result.content as string).split('\n').map(line => ({
        id: uuidv4(),
        text: line.replace(/^-\s*|^\[\s*\]\s*/, ''), // Remove markdown list chars
        checked: false
      }));
      finalContent = items;
    } else if (result.type === 'table') {
        // If the model returned tableData separately (preferred via schema) or we need to construct it
        if (result.tableData) {
            finalContent = result.tableData;
        } else {
            // Fallback if content string was used
            try {
                finalContent = JSON.parse(result.content);
            } catch (e) {
                finalContent = { headers: ['Col 1'], rows: [['Data']] };
            }
        }
    }

    return {
      id: uuidv4(),
      type: result.type,
      x: centerPos.x - (result.w / 2),
      y: centerPos.y - (result.h / 2),
      w: result.w,
      h: result.h,
      title: result.title || 'AI Generated',
      category: result.category || 'general',
      content: finalContent
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

export const improveText = async (currentText: string, instruction: string): Promise<string> => {
   try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Original text: "${currentText}".
      Instruction: ${instruction}.
      Return only the updated text.`,
    });
    return response.text || currentText;
  } catch (e) {
    console.error(e);
    return currentText;
  }
}