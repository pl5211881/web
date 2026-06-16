import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const execFileAsync = promisify(execFile);
const PORT = Number(process.env.PORT || 5173);

loadEnv();

const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const DIMENSIONS = ["定位与目标用户", "信息架构与核心流程", "视觉风格与品牌感", "交互体验与任务效率", "内容价值与核心功能"];
const MAX_PRODUCT_IMAGES = 9;
const VISION_PROBE_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/health") {
      const modelConfig = getModelConfig(req);
      return json(res, 200, {
        ok: true,
        modelConfigured: Boolean(modelConfig.apiKey && modelConfig.model),
        baseUrl: modelConfig.baseUrl,
        model: modelConfig.model || null,
        source: modelConfig.fromHeaders ? "browser" : "environment",
        mode: "standalone"
      });
    }

    if (req.method === "POST" && url.pathname === "/api/test-model") {
      return handleTestModel(req, res);
    }

    if (req.method === "POST" && url.pathname === "/api/extract") {
      const body = await readJson(req);
      if (!body?.url || !isValidUrl(body.url)) return json(res, 400, { error: "请输入有效 URL" });
      const [extraction, screenshot] = await Promise.all([
        extractPageText(body.url),
        capturePageScreenshot(body.url)
      ]);
      const result = {
        ...extraction,
        screenshot: screenshot.ok ? screenshot.image : null,
        screenshotWarning: screenshot.ok ? "" : screenshot.warning
      };
      return json(res, extraction.ok || screenshot.ok ? 200 : 422, result);
    }

    if (req.method === "POST" && url.pathname === "/api/profile") {
      return handleProfile(req, res, await readJson(req));
    }

    if (req.method === "POST" && url.pathname === "/api/analyze") {
      return handleAnalyze(req, res, await readJson(req));
    }

    if (req.method === "GET") return serveStatic(res, url.pathname);

    if (url.pathname.startsWith("/api")) {
      return json(res, 404, {
        error: "API 路径或请求方式不匹配",
        details: `当前请求为 ${req.method} ${url.pathname}，请确认后端服务版本已更新并支持该接口。`
      });
    }

    json(res, 405, { error: "Method Not Allowed" });
  } catch (error) {
    json(res, 500, { error: "服务异常", details: error.message });
  }
});

process.on("uncaughtException", (error) => {
  console.error("服务捕获到未处理异常：", error);
});

process.on("unhandledRejection", (error) => {
  console.error("服务捕获到未处理 Promise：", error);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`端口 ${PORT} 已被占用，请关闭占用进程或使用 PORT=其他端口 npm run dev:standalone。`);
    process.exit(1);
  }
  if (error.code === "EPERM") {
    console.error(`当前环境不允许监听 127.0.0.1:${PORT}。请在本机终端中运行 npm run dev:standalone。`);
    process.exit(1);
  }
  throw error;
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Standalone UX analysis tool running on http://127.0.0.1:${PORT}`);
});

async function handleTestModel(req, res) {
  const modelConfig = getModelConfig(req);
  if (!modelConfig.apiKey || !modelConfig.model) {
    return json(res, 503, {
      error: "模型配置缺失",
      details: "请填写 API Key、Base URL 和模型名称后再测试连接。"
    });
  }

  try {
    const startedAt = Date.now();
    const body = await readJson(req);
    const textJson = await callModelJson(modelConfig, buildModelTestMessages({ scenario: "ping" }));

    if (textJson?.ok !== true) {
      return json(res, 502, {
        error: "模型连接测试失败",
        details: "模型已响应，但未返回预期的 JSON 结构，请确认该模型支持 Chat Completions 和 JSON 输出。"
      });
    }

    const messages = buildModelTestMessages(body);
    let visionAvailable = !messagesContainImages(messages);
    let warning = "";
    if (!visionAvailable) {
      try {
        const visionJson = await callModelJson(modelConfig, messages);
        visionAvailable = visionJson?.ok === true;
      } catch (error) {
        warning = `文本生成链路可响应，但图片输入能力未通过测试：${error.message}`;
      }
    }

    return json(res, 200, {
      ok: true,
      modelConfigured: true,
      visionAvailable,
      status: visionAvailable ? "ready" : "limited",
      baseUrl: modelConfig.baseUrl,
      model: modelConfig.model,
      source: modelConfig.fromHeaders ? "browser" : "environment",
      mode: "standalone",
      elapsedMs: Date.now() - startedAt,
      warning: warning
        ? `${warning}。当前模型接口仍可生成文本报告；如需可靠分析截图视觉细节，请切换支持 image_url 的视觉模型。`
        : "",
      message: warning
        ? "文本生成链路可响应，图片输入能力受限。"
        : `模型文本与图片输入能力均可响应，当前测试耗时 ${Math.round((Date.now() - startedAt) / 1000)} 秒；复杂生成仍可能因图片数量、上下文长度或网关负载而超时。`
    });
  } catch (error) {
    return json(res, 502, {
      error: "模型连接测试失败",
      details: error.message
    });
  }
}

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

async function handleProfile(req, res, body) {
  try {
    const validation = validateProduct(body);
    if (!validation.ok) return json(res, 400, { error: "画像生成参数校验失败", details: validation.errors });
    const modelConfig = getModelConfig(req);
    if (!modelConfig.apiKey || !modelConfig.model) {
      return json(res, 503, { error: "模型配置缺失", details: "请配置 OPENAI_API_KEY 与 OPENAI_MODEL。" });
    }

    const product = validation.product;
    const extraction = product.url ? await extractPageText(product.url) : { ok: false, text: "", warning: "未提供 URL" };
    const messages = [
      { role: "system", content: "你是资深产品研究员和 UX 分析师。只输出合法 JSON，不输出 Markdown。" },
      {
        role: "user",
        content: [
          { type: "text", text: buildProfilePrompt(product, extraction) },
          ...product.images.map((image) => ({ type: "image_url", image_url: { url: image.dataUrl, detail: "high" } }))
        ]
      }
    ];
    const { json: modelJson, downgraded } = await callModelJsonWithImageFallback(modelConfig, messages);

    const profile = modelJson.profile || modelJson;
    const errors = validateProfile(profile);
    if (errors.length) return json(res, 502, { error: "模型返回的功能画像结构不符合要求", details: errors });

    json(res, 200, {
      profile,
      meta: {
        generatedAt: new Date().toISOString(),
        model: modelConfig.model,
        sourceSummary: `链接${extraction.ok ? "已抓取" : "未抓取成功"}，图片 ${product.images.length} 张${downgraded ? "（模型不支持图片输入，已按纯文本生成）" : ""}`
      },
      extraction
    });
  } catch (error) {
    json(res, 500, { error: "生成功能画像失败", details: error.message });
  }
}

async function handleAnalyze(req, res, body) {
  try {
    const validation = validateAnalyzeRequest(body);
    if (!validation.ok) return json(res, 400, { error: "表单校验失败", details: validation.errors });
    const modelConfig = getModelConfig(req);
    if (!modelConfig.apiKey || !modelConfig.model) {
      return json(res, 503, { error: "模型配置缺失", details: "请在环境变量中配置 OPENAI_API_KEY 与 OPENAI_MODEL。" });
    }

    const productsWithSources = await Promise.all(validation.products.map(async (product) => {
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

    const report = await callModelJson(modelConfig, [
      { role: "system", content: "你是资深 UX 研究员，只输出合法 JSON，不输出 Markdown。" },
      { role: "user", content: buildReportPrompt(productsWithSources, validation.dimensions, modelConfig.model) }
    ]);

    report.meta = {
      ...(report.meta || {}),
      generatedAt: report.meta?.generatedAt || new Date().toISOString(),
      language: report.meta?.language || "zh-CN",
      model: report.meta?.model || modelConfig.model,
      sources: sourceMeta
    };

    const reportErrors = validateReport(report);
    if (reportErrors.length) return json(res, 502, { error: "模型返回的报告结构不符合要求", details: reportErrors });
    json(res, 200, report);
  } catch (error) {
    json(res, 500, { error: "生成报告失败", details: error.message });
  }
}

async function callModelJson(modelConfig, messages, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 75000);
  let completion;
  try {
    const payload = {
      model: modelConfig.model,
      temperature: 0.2,
      messages
    };
    if (!options.omitResponseFormat) payload.response_format = { type: "json_object" };

    completion = await fetch(`${modelConfig.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${modelConfig.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    if (error.name === "AbortError") throw new Error("模型接口响应超时，请稍后重试或切换模型。");
    throw new Error(readableNetworkError(error, modelConfig.baseUrl));
  } finally {
    clearTimeout(timeout);
  }

  if (!completion.ok) {
    const text = await completion.text();
    if (!options.omitResponseFormat && isResponseFormatUnsupportedError(text)) {
      return callModelJson(modelConfig, messages, { omitResponseFormat: true });
    }
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
  return message.includes("不支持图片输入")
    || message.includes("image_url")
    || message.includes("unknown variant")
    || message.includes("expected `text`")
    || message.includes("multi-modal")
    || message.includes("vision");
}

function readableModelApiError(text = "") {
  if (text.includes("unknown variant `image_url`") || text.includes("expected `text`")) {
    return "当前模型接口不支持图片输入 image_url。系统会在可降级的场景自动改用纯文本；如需分析截图视觉细节，请切换支持视觉输入的模型。";
  }
  return `模型接口调用失败：${text.slice(0, 1200)}`;
}

function isResponseFormatUnsupportedError(text = "") {
  const message = String(text).toLowerCase();
  return message.includes("response_format")
    && (message.includes("unsupported")
      || message.includes("not support")
      || message.includes("invalid")
      || message.includes("unrecognized")
      || message.includes("extra_forbidden")
      || message.includes("json_object"));
}

function readableNetworkError(error, baseUrl = "") {
  const message = String(error?.message || error || "");
  if (message.includes("fetch failed")) {
    return `模型服务网络连接失败：当前部署环境无法访问 ${baseUrl}。如果这是企业内网、VPN、专线或白名单网关，Vercel 线上环境通常无法直连；请改用公网可访问的 OpenAI 兼容网关，或把应用部署到能访问该网关的内网环境。`;
  }
  return message || "模型服务网络连接失败，请检查 Base URL 是否公网可访问。";
}

function getModelConfig(req) {
  const headerApiKey = String(req.headers["x-openai-api-key"] || "").trim();
  const headerBaseUrl = String(req.headers["x-openai-base-url"] || "").trim();
  const headerModel = String(req.headers["x-openai-model"] || "").trim();
  const fromHeaders = Boolean(headerApiKey || headerModel || headerBaseUrl);
  return {
    apiKey: headerApiKey || OPENAI_API_KEY,
    baseUrl: headerBaseUrl || OPENAI_BASE_URL,
    model: headerModel || OPENAI_MODEL,
    fromHeaders
  };
}

function serveStatic(res, pathname) {
  const filePath = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  if (filePath === "src/main.js") {
    const js = fs.readFileSync(path.join(rootDir, filePath), "utf8").replace('import "./styles.css";', "");
    return send(res, 200, js, "application/javascript; charset=utf-8");
  }

  if (filePath === "index.html") {
    const html = fs.readFileSync(path.join(rootDir, "index.html"), "utf8")
      .replace("</head>", '    <link rel="stylesheet" href="/src/styles.css" />\n  </head>');
    return send(res, 200, html, "text/html; charset=utf-8");
  }

  const normalized = path.normalize(filePath);
  if (normalized.startsWith("..")) return send(res, 403, "Forbidden", "text/plain");

  const absolute = path.join(rootDir, normalized);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) return send(res, 404, "Not Found", "text/plain");
  send(res, 200, fs.readFileSync(absolute), contentType(absolute));
}

function validateAnalyzeRequest(body) {
  const products = Array.isArray(body?.products) ? body.products : [];
  const dimensions = Array.isArray(body?.dimensions) ? body.dimensions : [];
  const errors = [];

  if (products.length < 2 || products.length > 4) errors.push("产品数量需要为 2-4 个。");
  if (products.filter((product) => product?.role === "self").length !== 1) errors.push("必须包含且仅包含 1 个本品。");
  if (!dimensions.length || dimensions.length > DIMENSIONS.length) errors.push("请选择 1-5 个 UX 维度。");
  dimensions.forEach((dimension) => {
    if (!DIMENSIONS.includes(dimension)) errors.push(`不支持的 UX 维度：${dimension}`);
  });

  const cleaned = products.map(cleanProduct);
  cleaned.forEach((product) => errors.push(...validateProduct(product).errors));
  return { ok: errors.length === 0, errors, products: cleaned, dimensions };
}

function validateProduct(body) {
  const product = cleanProduct(body);
  const errors = [];
  if (!product.name) errors.push("产品名称不能为空。");
  if (product.url && !isValidUrl(product.url)) errors.push(`${product.name || "产品"} 的 URL 无效。`);
  if (product.images.length > MAX_PRODUCT_IMAGES) errors.push(`每个产品最多上传 ${MAX_PRODUCT_IMAGES} 张图片。`);
  product.images.forEach((image) => {
    if (!String(image.dataUrl || "").startsWith("data:image/")) errors.push("图片格式无效。");
    if (String(image.dataUrl || "").length > 3_000_000) errors.push("单张图片过大。");
  });
  return { ok: errors.length === 0, errors, product };
}

function cleanProduct(product = {}) {
  return {
    role: product.role === "self" ? "self" : "competitor",
    name: String(product.name || "").trim().slice(0, 80),
    url: String(product.url || "").trim(),
    profile: cleanProfile(product.profile || {}),
    images: Array.isArray(product.images) ? product.images.slice(0, MAX_PRODUCT_IMAGES).map((image) => ({
      name: String(image.name || "uploaded-image").slice(0, 160),
      type: String(image.type || "image/png").slice(0, 80),
      dataUrl: String(image.dataUrl || "")
    })) : []
  };
}

function cleanProfile(profile = {}) {
  return {
    positioning: String(profile.positioning || "").slice(0, 3000),
    coreFlow: String(profile.coreFlow || "").slice(0, 3000),
    targetUsers: String(profile.targetUsers || "").slice(0, 3000),
    designStyle: String(profile.designStyle || "").slice(0, 3000),
    keyFeatures: String(profile.keyFeatures || "").slice(0, 3000),
    marketSignals: String(profile.marketSignals || "").slice(0, 3000)
  };
}

function validateProfile(profile) {
  const required = ["positioning", "coreFlow", "targetUsers", "designStyle", "keyFeatures", "marketSignals"];
  return required.filter((key) => typeof profile?.[key] !== "string").map((key) => `${key} 必须是字符串。`);
}

function validateReport(report) {
  const errors = [];
  if (!report?.meta?.sources) errors.push("meta.sources 缺失。");
  if (!Array.isArray(report?.rankings) || report.rankings.length < 2) errors.push("rankings 至少包含 2 个产品。");
  if (!Array.isArray(report?.matrix) || !report.matrix.length) errors.push("matrix 不能为空。");
  if (!Array.isArray(report?.interactionBreakdown)) errors.push("interactionBreakdown 缺失。");
  if (!Array.isArray(report?.productAnalyses) || report.productAnalyses.length < 2) errors.push("productAnalyses 至少包含 2 个产品。");
  if (!Array.isArray(report?.recommendations)) errors.push("recommendations 缺失。");
  return errors;
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
  const sourceBlocks = products.map((product) => [
    `产品：${product.name}`,
    `角色：${product.role === "self" ? "本品" : "竞品"}`,
    `链接：${product.url || "未提供"}`,
    `资料状态：${product.extractedText ? "已抓取最新页面正文" : "未获得有效页面正文"}；${profileToText(product.profile) ? "有功能画像" : "无功能画像"}；${product.images.length ? `有 ${product.images.length} 张产品图片` : "无图片"}${product.extractionWarning ? `；抓取提示：${product.extractionWarning}` : ""}`,
    `页面正文：${product.extractedText || "无"}`,
    `功能画像：${profileToText(product.profile) || "无"}`
  ].join("\n")).join("\n\n---\n\n");

  return `
请基于以下产品画像、联网抓取资料与 UX 维度，生成中文 UX 竞品深度分析报告。

分析维度：${dimensions.join("、")}

必须返回一个 JSON 对象，字段完全遵循：
{
  "meta": {"generatedAt": "ISO 时间", "language": "zh-CN", "model": "${modelName}", "sources": []},
  "rankings": [{"productName":"", "score": 0, "rank": 1, "summary": ""}],
  "matrix": [{"dimension":"", "cells":[{"productName":"", "score": 0, "verdict": ""}]}],
  "bestConclusion": "",
  "interactionBreakdown": [{"topic":"", "insight":"", "productReferences":[""]}],
  "productAnalyses": [{"productName":"", "strengths":[""], "weaknesses":[""], "bestFitScenarios":[""]}],
  "recommendations": [{"priority":"高", "action":"", "rationale": ""}]
}

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

function loadEnv() {
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)\s*$/);
    if (!match || process.env[match[1]]) return;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  });
}

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let tooLarge = false;
    req.on("data", (chunk) => {
      if (tooLarge) return;
      body += chunk;
      if (body.length > 30_000_000) {
        tooLarge = true;
        reject(new Error("请求体过大：请减少图片数量或压缩图片后重试。"));
      }
    });
    req.on("end", () => {
      if (tooLarge) return;
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function json(res, status, data) {
  send(res, status, JSON.stringify(data), "application/json; charset=utf-8");
}

function send(res, status, body, type) {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

function contentType(filePath) {
  const ext = path.extname(filePath);
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}
