import "dotenv/config";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import express from "express";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const app = express();
const execFileAsync = promisify(execFile);
const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "../dist");
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const DIMENSIONS = ["定位与目标用户", "信息架构与核心流程", "视觉风格与品牌感", "交互体验与任务效率", "内容价值与核心功能"];
const MAX_PRODUCT_IMAGES = 9;
const VISION_PROBE_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

app.use(express.json({ limit: "30mb" }));
app.use((error, _req, res, next) => {
  if (error?.type === "entity.too.large") {
    return res.status(413).json({ error: "请求体过大", details: "请减少图片数量或压缩图片后重试。" });
  }
  next(error);
});

const ProfileSchema = z.object({
  positioning: z.string().max(3000).optional().default(""),
  coreFlow: z.string().max(3000).optional().default(""),
  targetUsers: z.string().max(3000).optional().default(""),
  designStyle: z.string().max(3000).optional().default(""),
  keyFeatures: z.string().max(3000).optional().default(""),
  marketSignals: z.string().max(3000).optional().default("")
});

const ImageSchema = z.object({
  name: z.string().max(160).optional().default("uploaded-image"),
  type: z.string().max(80).optional().default("image/png"),
  dataUrl: z.string().startsWith("data:image/").max(3_000_000)
});

const ProductSchema = z.object({
  role: z.enum(["self", "competitor"]),
  name: z.string().min(1).max(80),
  url: z.string().url().optional().or(z.literal("")),
  profile: ProfileSchema.optional().default({}),
  images: z.array(ImageSchema).max(MAX_PRODUCT_IMAGES).optional().default([])
});

const AnalyzeInputSchema = z.object({
  products: z.array(ProductSchema).min(2).max(4).refine(
    (products) => products.filter((product) => product.role === "self").length === 1,
    "必须包含且仅包含 1 个本品"
  ),
  dimensions: z.array(z.enum(DIMENSIONS)).min(1).max(DIMENSIONS.length)
});

const GeneratedProfileSchema = z.object({
  profile: ProfileSchema,
  meta: z.object({
    generatedAt: z.string(),
    model: z.string(),
    sourceSummary: z.string()
  }),
  extraction: z.object({
    ok: z.boolean(),
    text: z.string().optional(),
    warning: z.string().optional()
  }).optional()
});

const ReportSchema = z.object({
  meta: z.object({
    generatedAt: z.string(),
    language: z.string(),
    model: z.string(),
    sources: z.array(z.object({
      productName: z.string(),
      url: z.string().optional(),
      extracted: z.boolean(),
      usedProfile: z.boolean(),
      imageCount: z.number().int().min(0),
      warning: z.string().optional()
    }))
  }),
  rankings: z.array(z.object({
    productName: z.string(),
    score: z.number().min(0).max(100),
    rank: z.number().int().positive(),
    summary: z.string()
  })),
  matrix: z.array(z.object({
    dimension: z.string(),
    cells: z.array(z.object({
      productName: z.string(),
      score: z.number().min(0).max(100),
      verdict: z.string()
    }))
  })),
  bestConclusion: z.string(),
  interactionBreakdown: z.array(z.object({
    topic: z.string(),
    insight: z.string(),
    productReferences: z.array(z.string())
  })),
  productAnalyses: z.array(z.object({
    productName: z.string(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    bestFitScenarios: z.array(z.string())
  })),
  recommendations: z.array(z.object({
    priority: z.enum(["高", "中", "低"]),
    action: z.string(),
    rationale: z.string()
  }))
});

app.get("/api/health", (req, res) => {
  const modelConfig = getModelConfig(req);
  res.json({
    ok: true,
    modelConfigured: Boolean(modelConfig.apiKey && modelConfig.model),
    baseUrl: modelConfig.baseUrl,
    model: modelConfig.model || null,
    source: modelConfig.fromHeaders ? "browser" : "environment"
  });
});

app.post("/api/test-model", async (req, res) => {
  const modelConfig = getModelConfig(req);
  if (!modelConfig.apiKey || !modelConfig.model) {
    return res.status(503).json({
      error: "模型配置缺失",
      details: "请填写 API Key、Base URL 和模型名称后再测试连接。"
    });
  }

  try {
    const startedAt = Date.now();
    const messages = buildModelTestMessages(req.body);
    const { json, downgraded } = await callModelJsonWithImageFallback(modelConfig, messages);

    if (json?.ok !== true) {
      return res.status(502).json({
        error: "模型连接测试失败",
        details: "模型已响应，但未返回预期的 JSON 结构，请确认该模型支持 Chat Completions、JSON 输出，以及当前测试场景需要的视觉输入。"
      });
    }

    res.json({
      ok: true,
      modelConfigured: true,
      visionAvailable: !downgraded,
      status: downgraded ? "limited" : "ready",
      baseUrl: modelConfig.baseUrl,
      model: modelConfig.model,
      source: modelConfig.fromHeaders ? "browser" : "environment",
      elapsedMs: Date.now() - startedAt,
      warning: downgraded
        ? "当前模型接口可以生成文本报告，但不支持 image_url 图片输入；功能画像会降级为纯文本，无法可靠分析截图视觉细节。"
        : "",
      message: downgraded
        ? "文本生成链路可响应，但图片输入能力未通过测试。请切换支持视觉输入的模型后再生成截图画像。"
        : `模型文本与图片输入能力均可响应，当前测试耗时 ${Math.round((Date.now() - startedAt) / 1000)} 秒；复杂生成仍可能因图片数量、上下文长度或网关负载而超时。`
    });
  } catch (error) {
    res.status(502).json({
      error: "模型连接测试失败",
      details: error.message
    });
  }
});

function buildModelTestMessages(body = {}) {
  if (body?.scenario !== "generation") {
    return [
      { role: "system", content: "只输出合法 JSON，不输出 Markdown。" },
      { role: "user", content: "请返回 {\"ok\":true,\"message\":\"pong\"}，用于测试模型连接。" }
    ];
  }

  const product = cleanTestProduct(body.product);
  const probeImages = product.images.length ? product.images.slice(0, 1) : [{ dataUrl: VISION_PROBE_IMAGE, isProbe: true }];
  return [
    { role: "system", content: "你是资深产品研究员和 UX 分析师。只输出合法 JSON，不输出 Markdown。" },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `
请模拟一次“功能画像生成”能力测试，判断模型是否能稳定处理当前产品资料并输出结构化 JSON。

产品名称：${product.name || "测试产品"}
角色：${product.role === "self" ? "本品" : "竞品"}
产品链接：${product.url || "未提供"}
图片数量：${product.images.length}
测试说明：本次会附带 1 张${probeImages[0]?.isProbe ? "内置极小探测图" : "产品截图"}，用于提前验证 image_url 图片输入是否被当前模型网关支持。

必须只返回 JSON：
{
  "ok": true,
  "profile": {
    "positioning": "一句话产品定位",
    "coreFlow": "一句话核心流程",
    "targetUsers": "一句话目标用户",
    "designStyle": "一句话设计风格",
    "keyFeatures": "一句话核心功能",
    "marketSignals": "一句话联网资料洞察"
  }
}
`.trim()
        },
        ...probeImages.map((image) => ({
          type: "image_url",
          image_url: { url: image.dataUrl, detail: "low" }
        }))
      ]
    }
  ];
}

function cleanTestProduct(product = {}) {
  return {
    role: product.role === "self" ? "self" : "competitor",
    name: String(product.name || "").trim().slice(0, 80),
    url: String(product.url || "").trim(),
    images: Array.isArray(product.images) ? product.images.slice(0, MAX_PRODUCT_IMAGES).filter((image) => (
      String(image?.dataUrl || "").startsWith("data:image/")
    )).map((image) => ({
      dataUrl: String(image.dataUrl || "")
    })) : []
  };
}

app.post("/api/extract", async (req, res) => {
  const parsed = z.object({ url: z.string().url() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "请输入有效 URL" });

  const [extraction, screenshot] = await Promise.all([
    extractPageText(parsed.data.url),
    capturePageScreenshot(parsed.data.url)
  ]);
  const result = {
    ...extraction,
    screenshot: screenshot.ok ? screenshot.image : null,
    screenshotWarning: screenshot.ok ? "" : screenshot.warning
  };
  res.status(extraction.ok || screenshot.ok ? 200 : 422).json(result);
});

app.post("/api/profile", async (req, res) => {
  const parsed = ProductSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "画像生成参数校验失败", details: parsed.error.flatten() });
  const modelConfig = getModelConfig(req);
  if (!modelConfig.apiKey || !modelConfig.model) {
    return res.status(503).json({ error: "模型配置缺失", details: "请配置 OPENAI_API_KEY 与 OPENAI_MODEL。" });
  }

  const product = parsed.data;
  const extraction = product.url ? await extractPageText(product.url) : { ok: false, text: "", warning: "未提供 URL" };
  const prompt = buildProfilePrompt(product, extraction);

  try {
    const messages = [
      { role: "system", content: "你是资深产品研究员和 UX 分析师。只输出合法 JSON，不输出 Markdown。" },
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...product.images.map((image) => ({
            type: "image_url",
            image_url: { url: image.dataUrl, detail: "high" }
          }))
        ]
      }
    ];
    const { json, downgraded } = await callModelJsonWithImageFallback(modelConfig, messages);

    const result = GeneratedProfileSchema.safeParse({
      profile: json.profile || json,
      meta: {
        generatedAt: new Date().toISOString(),
        model: modelConfig.model,
        sourceSummary: `链接${extraction.ok ? "已抓取" : "未抓取成功"}，图片 ${product.images.length} 张${downgraded ? "（模型不支持图片输入，已按纯文本生成）" : ""}`
      },
      extraction
    });

    if (!result.success) {
      return res.status(502).json({ error: "模型返回的功能画像结构不符合要求", details: result.error.flatten() });
    }

    res.json(result.data);
  } catch (error) {
    res.status(500).json({ error: "生成功能画像失败", details: error.message });
  }
});

app.post("/api/analyze", async (req, res) => {
  const parsed = AnalyzeInputSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "表单校验失败", details: parsed.error.flatten() });
  const modelConfig = getModelConfig(req);
  if (!modelConfig.apiKey || !modelConfig.model) {
    return res.status(503).json({ error: "模型配置缺失", details: "请在环境变量中配置 OPENAI_API_KEY 与 OPENAI_MODEL。" });
  }

  const productsWithSources = await Promise.all(parsed.data.products.map(async (product) => {
    const extracted = product.url ? await extractPageText(product.url) : { ok: false, text: "", warning: "未提供 URL" };
    return {
      ...product,
      extractedOk: extracted.ok,
      extractedText: extracted.ok ? extracted.text : "",
      extractionWarning: extracted.ok ? "" : extracted.warning || "页面抓取失败"
    };
  }));

  const sourceMeta = productsWithSources.map((product) => ({
    productName: product.name,
    url: product.url || undefined,
    extracted: product.extractedOk,
    usedProfile: Boolean(profileToText(product.profile)),
    imageCount: product.images.length,
    warning: product.extractionWarning || undefined
  }));

  try {
    const json = await callModelJson(modelConfig, [
      { role: "system", content: "你是资深 UX 研究员，只输出合法 JSON，不输出 Markdown。" },
      { role: "user", content: buildReportPrompt(productsWithSources, parsed.data.dimensions, modelConfig.model) }
    ]);

    if (json?.meta && typeof json.meta === "object") {
      json.meta.sources = sourceMeta;
      json.meta.generatedAt = json.meta.generatedAt || new Date().toISOString();
      json.meta.language = json.meta.language || "zh-CN";
      json.meta.model = json.meta.model || modelConfig.model;
    }

    const report = ReportSchema.safeParse(json);
    if (!report.success) {
      return res.status(502).json({ error: "模型返回的报告结构不符合要求", details: report.error.flatten() });
    }

    res.json(report.data);
  } catch (error) {
    res.status(500).json({ error: "生成报告失败", details: error.message });
  }
});

app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API 路径或请求方式不匹配",
    details: `当前请求为 ${req.method} ${req.originalUrl}，请确认后端服务版本已更新并支持该接口。`
  });
});

if (process.env.VERCEL !== "1" && fs.existsSync(path.join(distDir, "index.html"))) {
  app.use(express.static(distDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });
}

if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`UX analysis API running on http://localhost:${PORT}`);
  });
}

export default app;

async function callModelJson(modelConfig, messages) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);
  let completion;
  try {
    completion = await fetch(`${modelConfig.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${modelConfig.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: modelConfig.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages
      })
    });
  } catch (error) {
    if (error.name === "AbortError") throw new Error("模型接口响应超时，请稍后重试或切换模型。");
    throw new Error(readableNetworkError(error, modelConfig.baseUrl));
  } finally {
    clearTimeout(timeout);
  }

  if (!completion.ok) {
    const text = await completion.text();
    throw new Error(readableModelApiError(text));
  }

  const data = await completion.json();
  return parseJsonObject(data?.choices?.[0]?.message?.content || "");
}

async function callModelJsonWithImageFallback(modelConfig, messages) {
  try {
    return { json: await callModelJson(modelConfig, messages), downgraded: false };
  } catch (error) {
    if (!isImageUnsupportedError(error) || !messagesContainImages(messages)) throw error;
    return { json: await callModelJson(modelConfig, stripImageMessages(messages)), downgraded: true };
  }
}

function messagesContainImages(messages) {
  return messages.some((message) => Array.isArray(message.content) && message.content.some((item) => item?.type === "image_url"));
}

function stripImageMessages(messages) {
  return messages.map((message) => {
    if (!Array.isArray(message.content)) return message;
    const imageCount = message.content.filter((item) => item?.type === "image_url").length;
    return {
      ...message,
      content: [
        ...message.content.filter((item) => item?.type !== "image_url"),
        ...(imageCount ? [{ type: "text", text: `提示：原请求包含 ${imageCount} 张图片，但当前模型接口不支持 image_url，已降级为纯文本分析。` }] : [])
      ]
    };
  });
}

function isImageUnsupportedError(error) {
  const message = String(error?.message || "");
  return message.includes("不支持图片输入") || message.includes("unknown variant `image_url`") || message.includes("expected `text`");
}

function readableModelApiError(text = "") {
  if (text.includes("unknown variant `image_url`") || text.includes("expected `text`")) {
    return "当前模型接口不支持图片输入 image_url。系统会在可降级的场景自动改用纯文本；如需分析截图视觉细节，请切换支持视觉输入的模型。";
  }
  return `模型接口调用失败：${text.slice(0, 1200)}`;
}

function readableNetworkError(error, baseUrl = "") {
  const message = String(error?.message || error || "");
  if (message.includes("fetch failed")) {
    return `模型服务网络连接失败：当前部署环境无法访问 ${baseUrl}。如果这是企业内网、VPN、专线或白名单网关，Vercel 线上环境通常无法直连；请改用公网可访问的 OpenAI 兼容网关，或把应用部署到能访问该网关的内网环境。`;
  }
  return message || "模型服务网络连接失败，请检查 Base URL 是否公网可访问。";
}

function getModelConfig(req) {
  const headerApiKey = String(req.get("x-openai-api-key") || "").trim();
  const headerBaseUrl = String(req.get("x-openai-base-url") || "").trim();
  const headerModel = String(req.get("x-openai-model") || "").trim();
  const fromHeaders = Boolean(headerApiKey || headerModel || headerBaseUrl);
  return {
    apiKey: headerApiKey || OPENAI_API_KEY,
    baseUrl: headerBaseUrl || OPENAI_BASE_URL,
    model: headerModel || OPENAI_MODEL,
    fromHeaders
  };
}

async function extractPageText(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 UXCompetitiveAnalysisBot/1.0",
        "Accept": "text/html,application/xhtml+xml"
      }
    });
    clearTimeout(timeout);

    if (!response.ok) return { ok: false, text: "", warning: `HTTP ${response.status}` };

    const html = await response.text();
    const suggestedName = extractProductName(html, url);
    const text = htmlToText(html).slice(0, 14000);
    if (text.length < 120) return { ok: false, text, suggestedName, warning: "抓取到的正文过短，建议上传图片或补充画像" };
    return { ok: true, text, suggestedName, warning: "" };
  } catch (error) {
    return { ok: false, text: "", warning: error.name === "AbortError" ? "抓取超时" : error.message };
  }
}

async function capturePageScreenshot(url) {
  const chromePath = findChromeExecutable();
  if (!chromePath) return { ok: false, warning: "未找到本机 Chrome，无法生成页面截图。" };

  const filePath = path.join(os.tmpdir(), `ux-page-shot-${randomUUID()}.png`);
  try {
    await execFileAsync(chromePath, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1280,900",
      `--screenshot=${filePath}`,
      url
    ], { timeout: 30000, maxBuffer: 1024 * 1024 });

    const bytes = fs.readFileSync(filePath);
    if (!bytes.length) return { ok: false, warning: "页面截图为空。" };
    return {
      ok: true,
      image: {
        name: `页面截图-${Date.now()}.png`,
        type: "image/png",
        dataUrl: `data:image/png;base64,${bytes.toString("base64")}`
      }
    };
  } catch (error) {
    return { ok: false, warning: error.killed ? "页面截图超时" : error.message };
  } finally {
    fs.rmSync(filePath, { force: true });
  }
}

function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium"
  ].filter(Boolean);
  return candidates.find((candidate) => fs.existsSync(candidate)) || "";
}

function buildProfilePrompt(product, extraction) {
  return `
请根据联网抓取资料与上传图片，为单个产品生成“功能画像”。如果图片中包含界面、导航、按钮、文案、视觉风格，请纳入判断。

产品名称：${product.name}
角色：${product.role === "self" ? "本品" : "竞品"}
产品链接：${product.url || "未提供"}
联网抓取状态：${extraction.ok ? "成功" : `失败：${extraction.warning || "未知原因"}`}
联网抓取正文：
${extraction.text || "无"}

当前已有画像：
${profileToText(product.profile) || "无"}

必须只返回 JSON：
{
  "profile": {
    "positioning": "产品定位，说明核心价值主张和市场位置",
    "coreFlow": "核心流程，说明用户从进入到完成关键任务的路径",
    "targetUsers": "目标用户，说明用户类型、场景和需求",
    "designStyle": "设计风格，说明视觉语言、组件密度、情绪和品牌感",
    "keyFeatures": "核心功能，按功能模块归纳",
    "marketSignals": "联网资料洞察，说明近期公开页面透露的产品变化、卖点或限制"
  }
}
`.trim();
}

function buildReportPrompt(products, dimensions, modelName) {
  const sourceBlocks = products.map((product) => {
    const sourceState = [
      product.extractedText ? "已抓取最新页面正文" : "未获得有效页面正文",
      profileToText(product.profile) ? "有功能画像" : "无功能画像",
      product.images.length ? `有 ${product.images.length} 张产品图片` : "无图片",
      product.extractionWarning ? `抓取提示：${product.extractionWarning}` : ""
    ].filter(Boolean).join("；");

    return [
      `产品：${product.name}`,
      `角色：${product.role === "self" ? "本品" : "竞品"}`,
      `链接：${product.url || "未提供"}`,
      `资料状态：${sourceState}`,
      `页面正文：${product.extractedText || "无"}`,
      `功能画像：${profileToText(product.profile) || "无"}`
    ].join("\n");
  }).join("\n\n---\n\n");

  return `
请基于以下产品画像、联网抓取资料与 UX 维度，生成中文 UX 竞品深度分析报告。

分析维度：${dimensions.join("、")}

必须返回一个 JSON 对象，字段完全遵循：
{
  "meta": {
    "generatedAt": "ISO 时间",
    "language": "zh-CN",
    "model": "${modelName}",
    "sources": [{"productName":"", "url":"", "extracted": true, "usedProfile": true, "imageCount": 0, "warning": ""}]
  },
  "rankings": [{"productName":"", "score": 0, "rank": 1, "summary": ""}],
  "matrix": [{"dimension":"", "cells":[{"productName":"", "score": 0, "verdict": ""}]}],
  "bestConclusion": "",
  "interactionBreakdown": [{"topic":"", "insight":"", "productReferences":[""]}],
  "productAnalyses": [{"productName":"", "strengths":[""], "weaknesses":[""], "bestFitScenarios":[""]}],
  "recommendations": [{"priority":"高", "action":"", "rationale": ""}]
}

要求：
1. 分数为 0-100，排名从 1 开始且不可并列。
2. matrix 必须覆盖所有选择的分析维度和所有产品。
3. 优先使用已生成的功能画像，联网资料用于校正产品当前状态。
4. 资料不足时说明不确定性，但仍给出可执行建议。
5. 不要输出 Markdown，不要把 JSON 包在代码块中。

产品资料：
${sourceBlocks}
`.trim();
}

function profileToText(profile = {}) {
  return [
    ["产品定位", profile.positioning],
    ["核心流程", profile.coreFlow],
    ["目标用户", profile.targetUsers],
    ["设计风格", profile.designStyle],
    ["核心功能", profile.keyFeatures],
    ["联网资料洞察", profile.marketSignals]
  ].filter(([, value]) => value).map(([label, value]) => `${label}：${value}`).join("\n");
}

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<\/(p|div|section|article|main|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractProductName(html, pageUrl) {
  const candidates = [
    matchMetaContent(html, "property", "og:site_name"),
    matchMetaContent(html, "name", "application-name"),
    matchMetaContent(html, "name", "apple-mobile-web-app-title"),
    matchMetaContent(html, "property", "og:title"),
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1],
    safeHostname(pageUrl)
  ];

  return candidates
    .map((value) => cleanProductName(value))
    .find(Boolean) || "";
}

function matchMetaContent(html, attrName, attrValue) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  const normalizedAttr = attrValue.toLowerCase();
  const tag = metaTags.find((item) => {
    const value = getHtmlAttr(item, attrName);
    return value?.toLowerCase() === normalizedAttr;
  });
  return tag ? getHtmlAttr(tag, "content") : "";
}

function getHtmlAttr(tag, name) {
  const match = tag.match(new RegExp(`${name}=["']([^"']*)["']`, "i"));
  return match?.[1] || "";
}

function cleanProductName(value = "") {
  return decodeHtml(String(value))
    .replace(/\s*[-_|｜·].*$/u, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

function decodeHtml(value = "") {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"");
}

function safeHostname(pageUrl) {
  try {
    return new URL(pageUrl).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function parseJsonObject(raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        // Fall through to a readable error below.
      }
    }
    throw new Error(readableJsonParseError(error));
  }
}

function readableJsonParseError(error) {
  const message = String(error?.message || "");
  if (message.includes("Unterminated string")) {
    return "模型返回的结构化 JSON 不完整，可能是模型输出被截断或未按 JSON 格式结束。请减少图片数量、切换更稳定的模型，或重试生成。";
  }
  return "模型没有返回可解析的 JSON，请确认模型支持 JSON 输出，或切换模型后重试。";
}
