import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ParsedRow = {
  level: number; // 7..1
  solid: number | null;
  large: number | null;
  dirty: number | null;
  broken: number | null;
};

type ParsedSlip = {
  coop: string | null;
  date: string | null; // "YYYY-MM-DD" (LLM'e böyle isteyeceğiz)
  rows: ParsedRow[];
  note: string | null;
  bottomRight: string | null; // sağ alttaki 63,4 gibi
};

function stripJsonFences(s: string) {
  // bazen ```json ... ``` dönebiliyor
  return s
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

/**
 * iPhone'dan gelen data URL'i normalize eder.
 * OpenAI Responses API'nin beklediği formata dönüştürür.
 * Boşlukları ve yeni satırları temizler.
 */
function normalizeImageDataUrl(dataUrl: string): string {
  if (!dataUrl || typeof dataUrl !== "string") {
    throw new Error("Invalid imageDataUrl");
  }

  // Önce boşlukları ve yeni satırları temizle
  let cleaned = dataUrl.trim().replace(/\s+/g, "");

  // Data URL formatını parse et
  if (cleaned.startsWith("data:image/")) {
    // Format: data:image/<type>;base64,<base64_data>
    const commaIndex = cleaned.indexOf(",");
    if (commaIndex === -1) {
      throw new Error("Invalid data URL format: missing comma");
    }

    const prefix = cleaned.substring(0, commaIndex + 1); // "data:image/jpeg;base64,"
    const base64Data = cleaned.substring(commaIndex + 1);

    // Base64 verisindeki boşlukları temizle (iPhone bazen ekleyebilir)
    const cleanBase64 = base64Data.replace(/\s/g, "");

    // Normalize edilmiş data URL'i döndür
    return `${prefix}${cleanBase64}`;
  }

  // Eğer sadece base64 string ise, JPEG olarak varsay ve data URL formatına çevir
  // (iPhone genellikle JPEG çeker)
  if (!cleaned.includes(",") && !cleaned.includes(";")) {
    const cleanBase64 = cleaned.replace(/\s/g, "");
    return `data:image/jpeg;base64,${cleanBase64}`;
  }

  // Diğer durumlarda temizlenmiş halini döndür
  return cleaned;
}

export async function POST(req: Request) {
  try {
    const { imageDataUrl } = (await req.json()) as { imageDataUrl?: string };

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      return NextResponse.json(
        { error: "imageDataUrl is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is missing" },
        { status: 500 }
      );
    }

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const system = `
You read Turkish "YUMURTA SAYIM FİŞİ" photos and return ONLY valid JSON.
No markdown. No commentary.

Output schema:
{
  "coop": string|"-",
  "date": string|"-", // "DD-MM-YYYY" if possible, otherwise "-"
  "rows": [
    {"level":7,"solid":number|"-","large":number|"-","dirty":number|"-","broken":number|"-"},
    ...
    {"level":1,...}
  ],
  "note": string|"-",
  "bottomRight": string|"-"
}

Rules:
- Keep numbers as integers (e.g. 6.536 => 6536; 12,930 => 12930).
- If a cell is "-" or empty => return "-" (NOT null).
- Always include all levels 7..1 (even if "-").
- Date must be DD-MM-YYYY when readable; otherwise "-".
- If you see extra handwritten value at bottom right, put it in bottomRight as string (e.g. "63,4").
- The "large" column (İri) is usually empty on this form. If it appears blank, ALWAYS return "-" for large.
- Do NOT shift columns. Keep "dirty" under dirty and "broken" under broken.
- If large is blank on the form, NEVER put any numbers into large.
- If a row is blank, leave it blank.

`.trim();

    const userText = "Extract the table faithfully from the image into the JSON schema.";

    // iPhone'dan gelen data URL'i normalize et
    const normalizedImageUrl = normalizeImageDataUrl(imageDataUrl);

    // OpenAI Responses API
    const body = {
        model,
        input: [
            {
                role: "system",
                content: [
                {
                    type: "input_text",
                    text: system,
                },
            ],
        },
        {
            role: "user",
            content: [
                {
                    type: "input_text",
                    text: userText,
                },
                {
                    type: "input_image",
                    image_url: normalizedImageUrl,
                },
            ],
        },
    ],
    max_output_tokens: 1200,
};


    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const errText = await r.text();
      return NextResponse.json(
        { error: "OpenAI request failed", detail: errText },
        { status: 500 }
      );
    }

    const data = await r.json();

    // Responses API: çıktı text’ini bul
    // data.output_text çoğu durumda var; yoksa output array içinden çıkarmaya çalış
    const outputText: string =
      data.output_text ??
      (Array.isArray(data.output)
        ? data.output
            .flatMap((o: any) => o?.content ?? [])
            .filter((c: any) => c?.type === "output_text")
            .map((c: any) => c?.text)
            .join("\n")
        : "");

    const clean = stripJsonFences(String(outputText || ""));
    const parsed = JSON.parse(clean) as ParsedSlip;

    return NextResponse.json({ parsed });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Parse failed", detail: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}
