/**
 * AI Bill Scanner — Claude Vision API integration
 *
 * Reads paper bills (handwritten Hindi, printed English, thermal receipts)
 * and extracts structured purchase data.
 */

import { PrismaClient } from "@prisma/client";
import { fuzzyMatchItem, loadMatchingContext } from "./fuzzy-matcher";

export interface ExtractedItem {
  rawText: string;
  matchedItemId: string | null;
  matchedItemName: string | null;
  quantity: number;
  unit: string;
  unitPrice: number;
  lineTotal: number;
  confidence: number;
}

export interface ExtractedBill {
  supplier: {
    name: string | null;
    phone: string | null;
    matchedId: string | null;
  };
  items: ExtractedItem[];
  grandTotal: number;
  billDate: string | null;
  billNumber: string | null;
  confidence: number;
}

/**
 * Build the Claude Vision extraction prompt with business context
 */
function buildExtractionPrompt(
  items: { id: string; name: string; unit: string; costPrice: number; aliases: string[] }[],
  suppliers: { id: string; name: string; phone: string }[]
): string {
  const itemList = items
    .map(
      (i) =>
        `- ${i.name} (aliases: ${i.aliases.length ? i.aliases.join(", ") : "none"}, unit: ${i.unit}, last price: ${i.costPrice})`
    )
    .join("\n");

  const supplierList = suppliers.map((s) => `- ${s.name} (${s.phone})`).join("\n");

  return `Extract ALL items from this Indian purchase bill/invoice.

The bill may be:
- Handwritten in Hindi (Devanagari script) or English
- Printed thermal receipt
- Computer-printed invoice
- Carbon copy

KNOWN INVENTORY ITEMS in this business:
${itemList}

KNOWN SUPPLIERS:
${supplierList}

COMMON HINDI ITEM NAMES:
pyaaz/kanda = Onion, gobhi = Cabbage, atta = Flour,
maida = Refined Flour, besan = Gram Flour,
tel/oil = Oil, namak = Salt, cheeni/shakkar = Sugar,
paneer = Paneer, doodh = Milk, anda = Egg,
mirch = Chilli, haldi = Turmeric, dhaniya = Coriander,
jeera = Cumin, adrak = Ginger, lehsun = Garlic,
tamatar = Tomato, aloo = Potato, matar = Peas

INSTRUCTIONS:
- Match each extracted item to the KNOWN INVENTORY list above
- Use aliases for matching (pyaaz -> Onion)
- If supplier name visible, match to KNOWN SUPPLIERS
- If item not in inventory, set matchedItemName to null
- Read quantities, units, and prices carefully
- For handwritten bills, do your best to read numbers

Reply ONLY as JSON (no markdown, no backticks):
{
  "supplier": { "name": "...", "phone": "...", "matchedId": "..." },
  "items": [
    {
      "rawText": "what was written on bill",
      "matchedItemName": "matched inventory name or null",
      "quantity": number,
      "unit": "kg/pcs/litre/strip/bottle/pack",
      "unitPrice": number,
      "lineTotal": number,
      "confidence": 0.0-1.0
    }
  ],
  "grandTotal": number,
  "billDate": "YYYY-MM-DD or null",
  "billNumber": "string or null",
  "confidence": 0.0-1.0
}`;
}

/**
 * Call Claude Vision API to extract bill data from an image
 */
async function callClaudeVision(
  imageBase64: string,
  prompt: string
): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_VISION_MODEL || "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error: ${response.status} ${err}`);
  }

  const result = await response.json();
  const text = result.content?.[0]?.text;
  if (!text) throw new Error("No text in Claude response");

  return JSON.parse(text);
}

/**
 * Call Claude text API to parse a text bill (WhatsApp / voice transcript)
 */
async function callClaudeText(
  text: string,
  itemsList: string
): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_TEXT_MODEL || "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Extract purchase items from this supplier message or voice transcript.
The text may be in Hindi, English, or Hinglish (mixed).

Text: "${text}"

Known inventory items:
${itemsList}

COMMON HINDI ITEM NAMES:
pyaaz = Onion, gobhi = Cabbage, atta = Flour, maida = Refined Flour,
besan = Gram Flour, tel = Oil, namak = Salt, cheeni = Sugar,
paneer = Paneer, doodh = Milk, anda = Egg, haldi = Turmeric,
dhaniya = Coriander, jeera = Cumin, adrak = Ginger, lehsun = Garlic,
tamatar = Tomato, aloo = Potato, matar = Peas

Reply ONLY as JSON (no markdown, no backticks):
{
  "supplier": { "name": "detected supplier name or null" },
  "items": [
    {
      "rawText": "original text fragment",
      "matchedItemName": "matched item or null",
      "quantity": number,
      "unit": "kg/pcs/litre/strip/bottle/pack",
      "unitPrice": number,
      "lineTotal": number,
      "confidence": 0.0-1.0
    }
  ],
  "grandTotal": number,
  "confidence": 0.0-1.0
}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error: ${response.status} ${err}`);
  }

  const result = await response.json();
  const responseText = result.content?.[0]?.text;
  if (!responseText) throw new Error("No text in Claude response");

  return JSON.parse(responseText);
}

/**
 * Main: Scan a bill image and return structured extracted data
 */
export async function scanBill(
  imageBase64: string,
  db: PrismaClient
): Promise<ExtractedBill> {
  // 1. Load inventory + suppliers + aliases
  const { items, aliases } = await loadMatchingContext(db);
  const suppliers = await db.supplier.findMany({
    where: { isActive: true },
    select: { id: true, name: true, phone: true },
  });

  // 2. Build prompt
  const prompt = buildExtractionPrompt(items, suppliers);

  // 3. Call Claude Vision
  const extracted = await callClaudeVision(imageBase64, prompt);

  // 4. Post-process: fuzzy match items to inventory IDs
  for (const item of extracted.items) {
    if (item.matchedItemName) {
      const found = items.find(
        (i) => i.name.toLowerCase() === item.matchedItemName.toLowerCase()
      );
      if (found) {
        item.matchedItemId = found.id;
      } else {
        // Try fuzzy match
        const match = fuzzyMatchItem(item.matchedItemName, items, aliases);
        item.matchedItemId = match.itemId;
        item.matchedItemName = match.itemName;
        item.confidence = Math.min(item.confidence || 0.5, match.confidence);
      }
    } else {
      // No match from Claude, try our own fuzzy matching
      const match = fuzzyMatchItem(item.rawText, items, aliases);
      item.matchedItemId = match.itemId;
      item.matchedItemName = match.itemName;
      item.confidence = match.confidence;
    }
  }

  // 5. Match supplier
  if (extracted.supplier?.name) {
    const match = suppliers.find((s) =>
      s.name.toLowerCase().includes(extracted.supplier.name.toLowerCase()) ||
      extracted.supplier.name.toLowerCase().includes(s.name.toLowerCase())
    );
    extracted.supplier.matchedId = match?.id || null;
  }

  return extracted as ExtractedBill;
}

/**
 * Parse a text-based bill (WhatsApp message or voice transcript)
 */
export async function parseTextBill(
  text: string,
  db: PrismaClient
): Promise<ExtractedBill> {
  const { items, aliases } = await loadMatchingContext(db);
  const suppliers = await db.supplier.findMany({
    where: { isActive: true },
    select: { id: true, name: true, phone: true },
  });

  const itemsList = items
    .map((i) => `${i.name} (${i.aliases.join(", ")})`)
    .join(", ");

  const extracted = await callClaudeText(text, itemsList);

  // Post-process matches
  for (const item of extracted.items) {
    if (item.matchedItemName) {
      const found = items.find(
        (i) => i.name.toLowerCase() === item.matchedItemName.toLowerCase()
      );
      item.matchedItemId = found?.id || null;
    }
    if (!item.matchedItemId) {
      const match = fuzzyMatchItem(
        item.matchedItemName || item.rawText,
        items,
        aliases
      );
      item.matchedItemId = match.itemId;
      item.matchedItemName = match.itemName;
      item.confidence = match.confidence;
    }
  }

  // Match supplier
  if (extracted.supplier?.name) {
    const match = suppliers.find((s) =>
      s.name.toLowerCase().includes(extracted.supplier.name.toLowerCase())
    );
    extracted.supplier.matchedId = match?.id || null;
  }

  return {
    supplier: extracted.supplier || { name: null, phone: null, matchedId: null },
    items: extracted.items || [],
    grandTotal: extracted.grandTotal || 0,
    billDate: extracted.billDate || null,
    billNumber: extracted.billNumber || null,
    confidence: extracted.confidence || 0.5,
  };
}
