import { Router, type IRouter } from "express";
import {
  RecognizeProductPhotoBody,
  RecognizeProductPhotoResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const MAX_IMAGE_BYTES = 4_800_000;
const supportedImageDataUrl =
  /^data:image\/(?:jpeg|png|gif|webp);base64,[a-z0-9+/=\s]+$/i;

type DeepSeekCompletion = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

function parseRecognition(content: string): { name: string; brand: string } | null {
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const value: unknown = JSON.parse(cleaned);
    if (
      typeof value === "object" &&
      value !== null &&
      "name" in value &&
      "brand" in value &&
      typeof value.name === "string" &&
      typeof value.brand === "string" &&
      value.name.trim() &&
      value.brand.trim()
    ) {
      return { name: value.name.trim(), brand: value.brand.trim() };
    }
  } catch {
    return null;
  }

  return null;
}

router.post(
  "/ai/product-recognition",
  async (req, res): Promise<void> => {
    const parsed = RecognizeProductPhotoBody.safeParse(req.body);

    if (!parsed.success) {
      req.log.warn({ issues: parsed.error.issues }, "Invalid product recognition input");
      res.status(400).json({ error: "圖片資料格式不正確，請重新選擇商品照片。" });
      return;
    }

    const { imageData, ocrText } = parsed.data;

    if (
      !supportedImageDataUrl.test(imageData) ||
      Buffer.byteLength(imageData, "utf8") > MAX_IMAGE_BYTES
    ) {
      res.status(400).json({ error: "請上傳 4MB 以內的 JPEG、PNG、GIF 或 WebP 商品照片。" });
      return;
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      req.log.error("DeepSeek API key is not configured");
      res.status(502).json({ error: "AI 辨識暫時無法使用，請稍後再試。" });
      return;
    }

    const prompt = [
      "請辨識這張美妝或保養品商品照片。",
      "回覆時只輸出一個 JSON 物件，格式為：",
      '{"name":"繁體中文完整商品名稱","brand":"品牌名稱"}',
      "商品名稱請使用繁體中文。品牌可保留官方英文或日韓文拼寫，但不可留白。",
      "若照片文字模糊，請依包裝與可辨識資訊做最合理的判斷。",
      ocrText ? `使用者提供的可辨識文字：${ocrText}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-v4-flash-vision-exp",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: imageData } },
              ],
            },
          ],
          max_tokens: 300,
          temperature: 0.1,
        }),
      });

      if (!response.ok) {
        req.log.warn(
          { providerStatus: response.status },
          "DeepSeek product recognition request failed",
        );
        res.status(502).json({ error: "AI 未能辨識這張商品照片，請再試一次或自行填寫。" });
        return;
      }

      const payload = (await response.json()) as DeepSeekCompletion;
      const recognition = parseRecognition(
        payload.choices?.[0]?.message?.content ?? "",
      );

      if (!recognition) {
        req.log.warn("DeepSeek returned an unrecognized product response");
        res.status(502).json({ error: "AI 回覆格式無法辨識，請自行填寫商品資訊。" });
        return;
      }

      res.json(RecognizeProductPhotoResponse.parse(recognition));
    } catch (error) {
      req.log.error({ err: error }, "DeepSeek product recognition request failed");
      res.status(502).json({ error: "AI 辨識暫時無法使用，請稍後再試。" });
    }
  },
);

export default router;