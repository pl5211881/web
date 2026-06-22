import "./styles.css";

const UNIFIED_DIMENSIONS = [
  {
    id: "strategy",
    label: "定位与目标用户",
    fields: ["positioning", "targetUsers"],
    description: "合并产品定位、基础定位层与目标用户，判断价值主张和适配人群。"
  },
  {
    id: "architecture",
    label: "信息架构与核心流程",
    fields: ["coreFlow"],
    description: "合并架构信息层与核心流程，判断入口、层级、路径和任务闭环。"
  },
  {
    id: "visual",
    label: "视觉风格与品牌感",
    fields: ["designStyle"],
    description: "合并视觉体验层与设计风格，判断品牌一致性、组件密度和视觉识别。"
  },
  {
    id: "interaction",
    label: "交互体验与任务效率",
    fields: ["coreFlow"],
    description: "合并交互体验层与流程操作，判断反馈、效率、容错和上手成本。"
  },
  {
    id: "content",
    label: "内容价值与核心功能",
    fields: ["keyFeatures", "marketSignals"],
    description: "合并内容体验层、核心功能与联网资料洞察，判断信息质量和功能覆盖。"
  }
];

const PROFILE_FIELDS = [
  ["positioning", "产品定位"],
  ["coreFlow", "核心流程"],
  ["targetUsers", "目标用户"],
  ["designStyle", "设计风格"],
  ["keyFeatures", "核心功能"],
  ["marketSignals", "联网资料洞察"]
];

const MAX_PRODUCT_IMAGES = 9;
const DISCOVERY_MARKETS = [
  ["cn", "中国大陆"],
  ["us", "美国"],
  ["jp", "日本"],
  ["gb", "英国"],
  ["sg", "新加坡"]
];
const MODEL_PROVIDERS = ["OpenAI", "DeepSeek", "自定义"];
const PRODUCT_ROLE_COLORS = {
  self: "#b7ff5a",
  competitor1: "#7dddf3",
  competitor2: "#c4b5fd",
  competitor3: "#fcd34d"
};

const EMPTY_PROFILE = {
  positioning: "",
  coreFlow: "",
  targetUsers: "",
  designStyle: "",
  keyFeatures: "",
  marketSignals: ""
};

const NAV_SECTIONS = ["discover", "products", "profiles", "report"];

const state = {
  products: [
    createProduct("self"),
    createProduct("competitor")
  ],
  dimensions: UNIFIED_DIMENSIONS.map((dimension) => dimension.label),
  health: null,
  loading: false,
  extractingId: "",
  profilingId: "",
  profilingAll: false,
  error: "",
  report: null,
  discovery: {
    selfName: "",
    selfUrl: "",
    industryKeywords: "",
    market: "cn",
    sourceText: "",
    sourceUrls: "",
    loading: false,
    candidates: [],
    selectedIds: [],
    sources: [],
    warnings: [],
    error: "",
    optionalOpen: false,
    marketOpen: false
  },
  modelConfig: loadModelConfig(),
  showConfigModal: false,
  previewImage: null,
  modelRequestEpoch: 0,
  activeSection: sectionFromHash()
};

const app = document.querySelector("#app");
const activeModelControllers = new Set();
let activeScrollRoot = null;

render();
loadHealth();
normalizeInitialHashPosition();
window.addEventListener("resize", syncAddProductCardHeight);
window.addEventListener("hashchange", syncActiveSectionFromHash);
window.addEventListener("scroll", syncActiveSectionFromScroll, { passive: true });

function createProduct(role) {
  return {
    id: crypto.randomUUID(),
    role,
    name: "",
    url: "",
    profile: { ...EMPTY_PROFILE },
    images: [],
    extract: null,
    profileMeta: null,
    profileOpen: false
  };
}

async function loadHealth() {
  try {
    const response = await fetch("/api/health", { headers: modelHeaders() });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.health = await response.json();
  } catch {
    state.health = { ok: false, modelConfigured: false, apiAvailable: false };
  }
  if (state.health) state.health.apiAvailable = state.health.ok !== false;
  render();
}

function render() {
  const activeSection = state.activeSection || sectionFromHash();
  const modelConfigured = Boolean(state.health?.modelConfigured || isLocalModelConfigured());
  const modelTitle = state.health?.apiAvailable
    ? modelConfigured
      ? "更改API模型"
      : "未设置API模型"
    : "API 未连接";
  const modelSubtitle = state.health?.apiAvailable
    ? modelConfigured
      ? state.health?.visionAvailable === false
        ? "报告生成可用，截图视觉分析受限；点击右侧配置入口可切换视觉模型和API"
        : "点击右侧配置入口可一键切换模型和API"
      : "报告生成受限"
    : "请启动后端服务";

  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">UX</div>
          <div>
            <strong>竞品分析</strong>
            <span>Research Console</span>
          </div>
        </div>
        <nav class="nav-list" aria-label="工作台导航">
          <a class="${activeSection === "discover" ? "active" : ""}" href="#discover">竞品发现</a>
          <a class="${activeSection === "products" ? "active" : ""}" href="#products">上传截图</a>
          <a class="${activeSection === "profiles" ? "active" : ""}" href="#profiles">UX 纬度分析</a>
          <a class="${activeSection === "report" ? "active" : ""}" href="#report">输出报告</a>
        </nav>
      </aside>

      <main class="workspace" id="workspace">
        <span class="section-anchor" id="discover" aria-hidden="true"></span>
        <header class="topbar">
          <div>
            <p class="eyebrow">UX Competitive Intelligence</p>
            <h1>UX 竞品深度分析</h1>
          </div>
          ${state.report ? `
            <div class="top-actions" id="export">
              <button class="ghost-btn" data-action="export-html">导出 HTML</button>
              <button class="primary-btn" data-action="print">导出为 PDF</button>
            </div>
          ` : ""}
        </header>

        ${state.health && !state.health.apiAvailable ? `
          <section class="config-alert">
            <strong>API 服务未连接</strong>
            <span>当前页面没有连接到后端 API。请使用 npm run dev 同时启动前后端，或运行 npm run dev:standalone。</span>
          </section>
        ` : ""}

        ${state.health?.apiAvailable ? `
          <button class="status-panel config-strip" data-action="open-config" type="button">
            <div>
              <strong>
                <span class="config-status-icon ${modelConfigured ? "ok" : "warn"}" aria-hidden="true">
                  ${modelConfigured ? `
                    <svg class="status-line-icon" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" />
                      <path d="m8.4 12.2 2.2 2.2 5-5.4" />
                    </svg>
                  ` : `
                    <svg class="status-line-icon" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7.5v5.5" />
                      <path d="M12 16.6h.01" />
                    </svg>
                  `}
                </span>
                ${modelTitle}
              </strong>
              <span>${modelConfigured ? modelSubtitle : "点击顶部模型配置入口，填写 API Key、Base URL 与模型名称后即可生成报告。"}</span>
            </div>
            <b>${modelConfigured ? "更改配置" : "点击配置"}</b>
          </button>
        ` : ""}

        <section class="flow-grid" aria-label="分析流程">
          <article class="step-card">
            <span>01</span>
            <strong>竞品发现</strong>
            <p>基于本品、行业关键词和公开资料，先筛选同行业竞品。</p>
          </article>
          <article class="step-card">
            <span>02</span>
            <strong>上传与抓取</strong>
            <p>为本品和竞品录入链接，上传界面截图或产品图片。</p>
          </article>
          <article class="step-card">
            <span>03</span>
            <strong>UX 纬度分析</strong>
            <p>选择统一分析维度，作为报告矩阵、雷达图与建议的依据。</p>
          </article>
          <article class="step-card">
            <span>04</span>
            <strong>输出报告</strong>
            <p>基于产品链接、截图和 UX 维度生成矩阵、排名与行动建议。</p>
          </article>
        </section>

        ${renderCompetitorDiscovery(modelConfigured)}

        <section class="panel" id="products">
          <div class="panel-head">
            <div>
              <h2>02. 上传产品截图</h2>
              <p>最多对比 4 个产品（本品 + 3 竞品），每个产品最多 9 张截图。</p>
            </div>
          </div>
          <div class="product-list">
            ${state.products.map((product) => renderProduct(product)).join("")}
            ${competitorCount() < 3 ? renderAddProductCard() : ""}
          </div>
        </section>

        <section class="panel" id="profiles">
          <div class="panel-head">
            <div>
              <h2>03. UX 纬度分析</h2>
              <p>选择本次分析维度，生成竞品对比报告。</p>
            </div>
            <div class="matrix-toolbar">
              <span class="matrix-count">${selectedUnifiedDimensions().length} 个统一维度 × ${state.products.length} 个产品</span>
            </div>
          </div>
          ${renderUnifiedDimensionPicker(modelConfigured)}
        </section>

        ${state.loading ? renderProgress("正在生成报告", "正在综合产品链接、截图线索与 UX 维度。") : ""}
        ${state.report ? renderReport(state.report) : renderEmptyReport()}
      </main>
      ${state.showConfigModal ? renderConfigModal() : ""}
      ${state.previewImage ? renderImagePreview() : ""}
    </div>
  `;

  bindEvents();
  bindWorkspaceScroll();
  bindPanelHoverSpot();
  syncAddProductCardHeight();
}

function renderProduct(product) {
  const competitorNumber = competitorIndex(product.id);
  const roleLabel = product.role === "self" ? "本品" : `竞品 ${competitorNumber}`;
  const roleClass = product.role === "self" ? "role-self" : `role-competitor role-competitor-${competitorNumber}`;
  const canUploadMore = product.images.length < MAX_PRODUCT_IMAGES;
  const productName = product.name.trim();

  return `
    <article class="product-card" data-id="${product.id}">
      <div class="capture-head">
        <div class="capture-name-row">
          <label class="name-edit" title="编辑产品名称">
            <span class="name-display ${productName ? "" : "is-placeholder"}">${escapeHtml(productName || "请输入产品名称")}</span>
            <input value="${escapeAttr(product.name)}" data-field="name" data-id="${product.id}" placeholder="请输入产品名称" autocomplete="off">
            <svg class="edit-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </label>
        </div>
        <div class="capture-tools">
          <button class="remove-product-btn" data-action="remove-product" data-id="${product.id}" ${state.products.length <= 1 ? "disabled" : ""}>移除</button>
        </div>
      </div>

      <div class="capture-meta">
        <span class="role-pill ${roleClass}">${roleLabel}</span>
      </div>

      <div class="capture-grid">
        ${product.images.map((image, index) => `
          <figure class="capture-slot filled">
            <span>${index + 1}</span>
            <button class="image-preview-trigger" data-action="open-image-preview" data-id="${product.id}" data-image-id="${image.id}" aria-label="放大查看 ${escapeAttr(image.name)}">
              <img src="${image.dataUrl}" alt="${escapeAttr(image.name)}">
            </button>
            <figcaption>${escapeHtml(image.name)}</figcaption>
            <button class="icon-btn image-remove" title="移除图片" data-action="remove-image" data-id="${product.id}" data-image-id="${image.id}">×</button>
          </figure>
        `).join("")}
        ${canUploadMore ? `
          <label class="capture-slot empty">
            <span>${product.images.length + 1}</span>
            <b>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 16V5m0 0 4 4m-4-4-4 4M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/>
              </svg>
              上传
            </b>
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple data-upload="${product.id}">
          </label>
        ` : ""}
      </div>

      <div class="capture-link">
        <label>
          <span>产品链接</span>
          <div class="inline-input">
            <input type="url" inputmode="url" value="${escapeAttr(product.url)}" data-field="url" data-id="${product.id}" placeholder="https://example.com">
            <button class="ghost-btn small" data-action="extract" data-id="${product.id}" ${state.extractingId === product.id ? "disabled" : ""}>
              ${state.extractingId === product.id ? "抓取中" : "抓取"}
            </button>
          </div>
        </label>
      </div>

    </article>
  `;
}

function renderCompetitorDiscovery(modelConfigured) {
  const selectedCount = state.discovery.selectedIds.length;
  const hasCandidates = state.discovery.candidates.length > 0;
  const canDiscover = canDiscoverCompetitors();
  const optionalOpen = state.discovery.optionalOpen;
  return `
    <section class="panel discovery-panel">
      <div class="panel-head">
        <div>
          <h2>01. 竞品发现</h2>
          <p>先找到同行业竞品，再导入到对比分析流程。</p>
        </div>
        <div class="matrix-toolbar">
          <span class="matrix-count">${hasCandidates ? `${state.discovery.candidates.length} 个候选 · 已选 ${selectedCount}/3` : "App Store + 行业资料 + AI 归类"}</span>
        </div>
      </div>

      <div class="discovery-form">
        <label>
          <span>本品名称 <em>必填</em></span>
          <input data-discovery-field="selfName" value="${escapeAttr(state.discovery.selfName)}" placeholder="例如 腾讯健康">
        </label>
        <label>
          <span>目标市场 <em>必选</em></span>
          ${renderMarketDropdown()}
        </label>
        <button class="ghost-btn small optional-toggle" type="button" data-action="toggle-discovery-optional" aria-expanded="${optionalOpen}">
          ${optionalOpen ? "收起选填项" : "展开选填项"}
        </button>
      </div>

      <div class="discovery-form optional-fields ${optionalOpen ? "open" : ""}" ${optionalOpen ? "" : "hidden"}>
        <label>
          <span>本品官网 / App Store 链接 <em>选填</em></span>
          <input data-discovery-field="selfUrl" value="${escapeAttr(state.discovery.selfUrl)}" placeholder="https://example.com 或 App Store 链接">
        </label>
        <label>
          <span>行业关键词 <em>选填</em></span>
          <input data-discovery-field="industryKeywords" value="${escapeAttr(state.discovery.industryKeywords)}" placeholder="在线问诊、健康管理、医保服务">
        </label>
        <label class="wide-field source-field">
          <span>行业资料 <em>选填</em></span>
          <textarea data-discovery-field="sourceMaterials" placeholder="可粘贴艾瑞咨询、行业报告、榜单页面等公开链接，也可直接粘贴报告摘要、行业图谱或竞品清单。链接建议每行一个。">${escapeHtml(discoverySourceMaterials())}</textarea>
        </label>
      </div>

      <div class="discovery-actions">
        <button class="primary-btn" data-action="discover-competitors" ${state.discovery.loading || !state.health?.apiAvailable || !canDiscover ? "disabled" : ""}>
          ${state.discovery.loading ? "发现中..." : "发现竞品"}
        </button>
        <button class="secondary-btn" data-action="import-competitors" ${selectedCount === 0 ? "disabled" : ""}>导入为竞品</button>
      </div>

      ${state.discovery.error ? `<div class="error-box">${escapeHtml(state.discovery.error)}</div>` : ""}
      ${renderDiscoveryResults()}
    </section>
  `;
}

function renderDiscoveryResults() {
  if (state.discovery.loading) return renderDiscoveryLoading();

  if (!state.discovery.candidates.length) {
    return `
      <div class="discovery-empty">
        <strong>还没有候选竞品</strong>
        <p>输入本品名称、行业关键词或行业资料后，点击“发现竞品”。你也可以继续使用下方手动添加竞品。</p>
      </div>
    `;
  }

  return `
    <div class="discovery-meta">
      ${state.discovery.sources.map((source) => `<span>${escapeHtml(source.label || source.type || "资料源")}${source.count ? ` · ${source.count}` : ""}${source.ok === false ? " · 失败" : ""}</span>`).join("")}
      ${state.discovery.warnings.map((warning) => `<span class="warn">${escapeHtml(warning)}</span>`).join("")}
    </div>
    <div class="candidate-grid">
      ${state.discovery.candidates.map((candidate) => renderCandidateCard(candidate)).join("")}
    </div>
  `;
}

function renderDiscoveryLoading() {
  return `
    <div class="discovery-empty discovery-loading">
      <div class="spinner"></div>
      <div>
        <strong>正在发现竞品</strong>
        <p>正在检索 App Store、抓取行业资料，并整理候选列表。</p>
      </div>
    </div>
  `;
}

function renderMarketDropdown() {
  const current = DISCOVERY_MARKETS.find(([value]) => value === state.discovery.market) || DISCOVERY_MARKETS[0];
  return `
    <div class="market-dropdown ${state.discovery.marketOpen ? "open" : ""}">
      <button class="market-trigger" type="button" data-action="toggle-market-menu" aria-haspopup="listbox" aria-expanded="${state.discovery.marketOpen}">
        <span>${escapeHtml(current[1])}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      ${state.discovery.marketOpen ? `
        <div class="market-menu" role="listbox" aria-label="目标市场">
          ${DISCOVERY_MARKETS.map(([value, label]) => `
            <button class="market-option ${value === state.discovery.market ? "selected" : ""}" type="button" role="option" aria-selected="${value === state.discovery.market}" data-action="select-market" data-id="${value}">
              <span>${escapeHtml(label)}</span>
              ${value === state.discovery.market ? `<b>✓</b>` : ""}
            </button>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function renderCandidateCard(candidate) {
  const selected = state.discovery.selectedIds.includes(candidate.id);
  const imported = isCandidateImported(candidate);
  return `
    <article class="candidate-card ${selected ? "selected" : ""} ${imported ? "imported" : ""}">
      <label class="candidate-check">
        <input type="checkbox" data-candidate-id="${candidate.id}" ${selected ? "checked" : ""} ${imported ? "disabled" : ""}>
        <span>${imported ? "已在列表中" : "选择"}</span>
      </label>
      <div class="candidate-main">
        <div class="candidate-icon">
          ${candidate.iconUrl ? `<img src="${escapeAttr(candidate.iconUrl)}" alt="">` : `<span>${escapeHtml(candidate.name.slice(0, 1) || "竞")}</span>`}
        </div>
        <div>
          <h3>${escapeHtml(candidate.name)}</h3>
          <p>${escapeHtml([candidate.platform, candidate.category, candidate.developer].filter(Boolean).join(" · ") || "公开资料候选")}</p>
        </div>
      </div>
      <p class="candidate-reason">${escapeHtml(candidate.reason || "根据公开资料判断为潜在同行业竞品。")}</p>
      <div class="candidate-foot">
        <span>${escapeHtml(candidate.source || "公开资料")}</span>
        <b>${candidate.confidence || 0}%</b>
        ${candidate.url ? `<a href="${escapeAttr(candidate.url)}" target="_blank" rel="noreferrer">查看</a>` : ""}
      </div>
      ${candidate.matchedKeywords?.length ? `<div class="candidate-tags">${candidate.matchedKeywords.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
    </article>
  `;
}

function renderAddProductCard() {
  return `
    <button class="add-product-card" data-action="add-competitor" type="button">
      <span>+</span>
      <strong>添加竞品 (${competitorCount()}/3)</strong>
    </button>
  `;
}

function renderUnifiedDimensionPicker(modelConfigured) {
  return `
    <div class="profile-dimension-block">
      <div class="dimension-grid">
        ${UNIFIED_DIMENSIONS.map((dimension) => `
          <label class="check-tile">
            <input type="checkbox" data-dimension="${dimension.label}" ${state.dimensions.includes(dimension.label) ? "checked" : ""}>
            <span>${dimension.label}</span>
          </label>
        `).join("")}
      </div>
      <div class="generate-action">
        <button class="primary-btn wide" data-action="analyze" ${state.loading || !state.health?.apiAvailable || !modelConfigured ? "disabled" : ""}>
          ${state.loading ? "生成中..." : "生成对比报告"}
        </button>
        ${state.error ? `<div class="error-box">${escapeHtml(state.error)}</div>` : ""}
      </div>
    </div>
  `;
}

function renderProgress(title, description) {
  return `
    <section class="progress-panel">
      <div class="spinner"></div>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(description)}</p>
      </div>
    </section>
  `;
}

function renderEmptyReport() {
  return `
    <section class="report-shell empty" id="report">
      <div>
        <span class="mini-label">Report</span>
        <h2>04. 报告将在这里生成</h2>
        <p>选择分析维度后，点击生成对比报告。</p>
      </div>
    </section>
  `;
}

function renderReport(report) {
  return `
    <section class="report-shell" id="report">
      <div class="report-cover">
        <div>
          <span class="mini-label">Generated Report</span>
          <h2>竞品分析报告</h2>
          <p>${new Date(report.meta.generatedAt).toLocaleString("zh-CN")} · ${escapeHtml(report.meta.model)}</p>
        </div>
        <div class="score-stack">
          ${report.rankings.slice(0, 3).map((item) => `
            <div>
              <span>#${item.rank}</span>
              <strong>${escapeHtml(item.productName)}</strong>
              <b>${item.score}</b>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="report-section">
        <h3>综合排名与 AI 分数</h3>
        <div class="ranking-grid">
          ${report.rankings.map((item) => `
            <article class="ranking-card">
              <span>#${item.rank}</span>
              <strong>${escapeHtml(item.productName)}</strong>
              <div class="score-bar"><i style="width:${item.score}%"></i></div>
              <b>${item.score}</b>
              <p>${escapeHtml(item.summary)}</p>
            </article>
          `).join("")}
        </div>
      </div>

      <div class="report-section">
        <h3>横向对比矩阵</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>维度</th>
                ${report.rankings.map((item) => `<th>${escapeHtml(item.productName)}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${report.matrix.map((row) => `
                <tr>
                  <th>${escapeHtml(row.dimension)}</th>
                  ${report.rankings.map((product) => {
                    const cell = row.cells.find((item) => item.productName === product.productName);
                    return `<td><span>${escapeHtml(cell?.verdict || "无")}</span></td>`;
                  }).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="report-section highlight">
        ${renderRadarConclusion(report)}
      </div>

      <div class="report-section">
        <h3>交互细节拆解</h3>
        <div class="insight-list">
          ${report.interactionBreakdown.map((item) => `
            <article>
              <strong>${escapeHtml(item.topic)}</strong>
              <p>${escapeHtml(item.insight)}</p>
              <span>${item.productReferences.map(escapeHtml).join(" · ")}</span>
            </article>
          `).join("")}
        </div>
      </div>

      <div class="report-section">
        <div class="section-title-row simple">
          <h3>各产品优劣势 + 场景适配</h3>
          <span>点击截图可查看大图</span>
        </div>
        <div class="analysis-board">
          ${report.productAnalyses.map((product) => renderProductAnalysisCard(product, report)).join("")}
        </div>
      </div>

      <div class="report-section">
        <h3>行动建议</h3>
        <div class="recommendation-list">
          ${report.recommendations.map((item) => `
            <article>
              <span class="priority ${item.priority}">${item.priority}</span>
              <div>
                <strong>${escapeHtml(item.action)}</strong>
                <p>${escapeHtml(item.rationale)}</p>
              </div>
            </article>
          `).join("")}
        </div>
      </div>

      <div class="report-section sources">
        <h3>资料来源</h3>
        ${report.meta.sources.map((source) => `
          <p><strong>${escapeHtml(source.productName)}</strong>：${source.extracted ? "链接正文" : "未抓取成功"}${source.imageCount ? ` + ${source.imageCount} 张图片` : ""}${source.warning ? ` · ${escapeHtml(source.warning)}` : ""}</p>
        `).join("")}
      </div>
    </section>
  `;
}

function renderRadarConclusion(report) {
  const radar = buildRadarData(report);
  const summaries = buildProductRadarSummaries(report, radar);

  return `
    <div class="section-title-row">
      <h3>整体最优结论</h3>
      <span>蛛网雷达图 · 已选 ${radar.dimensions.length} 项</span>
    </div>
    <div class="radar-layout">
      <div class="radar-card">
        <div class="radar-viewport">
          ${renderRadarChart(radar)}
        </div>
      </div>
      <div class="radar-copy">
        <div class="radar-legend">
          ${radar.products.map((product) => `
            <span><i style="background:${product.color}"></i>${escapeHtml(product.name)}</span>
          `).join("")}
        </div>
        <ol class="radar-summary-list">
          ${summaries.map((item) => `<li><strong>${escapeHtml(item.productName)}</strong>${escapeHtml(item.summary)}</li>`).join("")}
        </ol>
        <div class="dimension-tags">
          ${radar.dimensions.map((dimension) => `<span>${escapeHtml(dimension)}</span>`).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderProductAnalysisCard(productAnalysis, report) {
  const ranking = report.rankings.find((item) => item.productName === productAnalysis.productName);
  const sourceProduct = findProductByName(productAnalysis.productName);
  const image = sourceProduct?.images?.[0];
  const accent = productColor(productAnalysis.productName);

  return `
    <article class="analysis-card rich">
      <header class="analysis-card-head">
        <div>
          <span class="analysis-dot" style="background:${accent}"></span>
          <h4>${escapeHtml(productAnalysis.productName)}</h4>
          ${ranking ? `<b>AI ${ranking.score}</b>` : ""}
        </div>
      </header>
      <div class="analysis-shot">
        ${image ? `
          <button class="analysis-shot-button" data-action="open-image-preview" data-id="${sourceProduct.id}" data-image-id="${image.id}" aria-label="放大查看 ${escapeAttr(image.name)}">
            <img src="${image.dataUrl}" alt="${escapeAttr(image.name)}">
          </button>
        ` : `
          <div class="analysis-shot-empty">
            <span>暂无截图</span>
          </div>
        `}
      </div>
      ${renderAnalysisBlock("优势 · Pros", productAnalysis.strengths, "pros")}
      ${renderAnalysisBlock("劣势 · Cons", productAnalysis.weaknesses, "cons")}
      <div class="scenario-strip">
        <strong>适用场景：</strong>
        <span>${escapeHtml(productAnalysis.bestFitScenarios.join("、") || "暂无")}</span>
      </div>
    </article>
  `;
}

function renderAnalysisBlock(title, items, tone) {
  return `
    <section class="analysis-block ${tone}">
      <strong>${title}</strong>
      <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>
  `;
}

function findProductByName(name) {
  const comparableName = comparableText(name);
  return state.products.find((product) => product.name === name)
    || state.products.find((product) => product.name && name.includes(product.name))
    || state.products.find((product) => {
      const productName = comparableText(product.name);
      return productName && (comparableName.includes(productName) || productName.includes(comparableName));
    })
    || null;
}

function productColor(productName) {
  const product = findProductByName(productName);
  if (!product || product.role === "self") {
    return PRODUCT_ROLE_COLORS.self;
  }

  const index = competitorIndex(product.id);
  return PRODUCT_ROLE_COLORS[`competitor${index}`] || PRODUCT_ROLE_COLORS.competitor1;
}

function buildRadarData(report) {
  const dimensions = report.matrix.map((row) => row.dimension);
  const products = report.rankings.map((product) => ({
    name: product.productName,
    color: productColor(product.productName),
    scores: report.matrix.map((row) => {
      const cell = row.cells.find((item) => item.productName === product.productName);
      return clampScore(Number(cell?.score ?? 0));
    })
  }));
  return { dimensions, products };
}

function renderRadarChart(radar) {
  const size = 520;
  const center = size / 2;
  const radius = 116;
  const labelDistance = 176;
  const labelSafeInset = 86;
  const levels = [0.25, 0.5, 0.75, 1];
  const pointsFor = (scoreList, scale = 1) => scoreList.map((score, index) => {
    const angle = radarAngle(index, radar.dimensions.length);
    const distance = radius * scale * clampScore(score) / 100;
    return `${center + Math.cos(angle) * distance},${center + Math.sin(angle) * distance}`;
  }).join(" ");
  const axisEnd = (index) => {
    const angle = radarAngle(index, radar.dimensions.length);
    const rawLabelX = center + Math.cos(angle) * labelDistance;
    const rawLabelY = center + Math.sin(angle) * labelDistance;
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
      labelX: Math.max(labelSafeInset, Math.min(size - labelSafeInset, rawLabelX)),
      labelY: Math.max(42, Math.min(size - 42, rawLabelY))
    };
  };

  return `
    <svg class="radar-chart" viewBox="0 0 ${size} ${size}" role="img" aria-label="各产品 UX 维度雷达图">
      <g class="radar-grid">
        ${levels.map((level) => `<polygon points="${pointsFor(new Array(radar.dimensions.length).fill(100), level)}"></polygon>`).join("")}
        ${radar.dimensions.map((_, index) => {
          const end = axisEnd(index);
          return `<line x1="${center}" y1="${center}" x2="${end.x}" y2="${end.y}"></line>`;
        }).join("")}
      </g>
      <g class="radar-series">
        ${radar.products.map((product) => {
          const points = pointsFor(product.scores);
          return `
            <polygon points="${points}" fill="${product.color}" stroke="${product.color}"></polygon>
            <polyline points="${points} ${points.split(" ")[0]}" stroke="${product.color}"></polyline>
          `;
        }).join("")}
      </g>
      <g class="radar-labels">
        ${radar.dimensions.map((dimension, index) => {
          const end = axisEnd(index);
          const anchor = end.labelX < center - 16 ? "end" : end.labelX > center + 16 ? "start" : "middle";
          const lines = splitRadarLabel(dimension);
          const lineOffset = lines.length > 1 ? -7 : 0;
          return `
            <text x="${end.labelX}" y="${end.labelY}" text-anchor="${anchor}" dominant-baseline="middle">
              ${lines.map((line, lineIndex) => `<tspan x="${end.labelX}" dy="${lineIndex === 0 ? lineOffset : 14}">${escapeHtml(line)}</tspan>`).join("")}
            </text>
          `;
        }).join("")}
      </g>
    </svg>
  `;
}

function splitRadarLabel(label) {
  const normalized = String(label || "").trim();
  if (normalized.length <= 6) {
    return [normalized];
  }
  const splitIndex = Math.ceil(normalized.length / 2);
  return [
    normalized.slice(0, splitIndex),
    normalized.slice(splitIndex)
  ].filter(Boolean);
}

function buildProductRadarSummaries(report, radar) {
  if (!radar.products.length || !radar.dimensions.length) {
    return report.rankings.map((product) => ({
      productName: product.productName,
      summary: ` 综合 AI 评分 ${product.score}；${product.summary || "暂无摘要。"}`
    }));
  }

  return report.rankings.map((product) => {
    const productRadar = radar.products.find((item) => item.name === product.productName);
    const scores = productRadar?.scores || [];
    const maxIndex = scores.length ? scores.indexOf(Math.max(...scores)) : -1;
    const minIndex = scores.length ? scores.indexOf(Math.min(...scores)) : -1;
    const strongest = radar.dimensions[maxIndex] || "优势维度";
    const weakest = radar.dimensions[minIndex] || "待补齐维度";
    const summary = product.summary ? ` ${product.summary}` : "";
    return {
      productName: product.productName,
      summary: ` 综合 AI 评分 ${product.score}，在「${strongest}」表现更突出，后续可重点补齐「${weakest}」。${summary}`
    };
  });
}

function radarAngle(index, total) {
  return -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(total, 1);
}

function clampScore(score) {
  if (Number.isNaN(score)) return 0;
  return Math.max(0, Math.min(100, score));
}

function renderList(title, items) {
  return `
    <div class="mini-list">
      <span>${title}</span>
      <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>
  `;
}

function renderImagePreview() {
  return `
    <dialog class="image-preview-dialog" open data-action="close-image-preview" aria-label="图片预览">
      <button class="image-preview-close" data-action="close-image-preview" type="button" aria-label="关闭图片预览">×</button>
      <figure class="image-preview-frame" data-preview-panel>
        <img src="${state.previewImage.dataUrl}" alt="${escapeAttr(state.previewImage.name)}">
        <figcaption>${escapeHtml(state.previewImage.name)}</figcaption>
      </figure>
    </dialog>
  `;
}

function renderConfigModal() {
  return `
    <div class="modal-backdrop" data-action="close-config">
      <section class="config-modal" role="dialog" aria-modal="true" aria-label="模型配置" data-modal-panel>
        <button class="modal-close" data-action="close-config" type="button" aria-label="关闭模型配置">×</button>
        <div class="modal-hero">
          <div>
            <p class="eyebrow">Model Settings</p>
            <h2>模型配置</h2>
            <p>Key 只缓存在当前浏览器；测试连接会同时检查 JSON 输出和图片输入能力。</p>
          </div>
          <span class="config-badge">${isLocalModelConfigured() || state.health?.modelConfigured ? "已配置" : "未配置 Key"}</span>
        </div>
        <div class="modal-form">
          <label>
            <span>模型服务</span>
            ${renderProviderDropdown()}
          </label>
          <label>
            <span>模型</span>
            <input value="${escapeAttr(state.modelConfig.model)}" data-config-field="model" placeholder="例如 gpt-4o-mini / deepseek-vl2">
          </label>
          <label>
            <span>Base URL</span>
            <input value="${escapeAttr(state.modelConfig.baseUrl)}" data-config-field="baseUrl" placeholder="https://api.openai.com/v1">
          </label>
          <label>
            <span>API Key</span>
            <div class="secret-input">
              <input type="${state.modelConfig.showKey ? "text" : "password"}" value="${escapeAttr(state.modelConfig.apiKey)}" data-config-field="apiKey" placeholder="sk-... / Bearer token">
              <button class="ghost-btn small" type="button" data-action="toggle-key">${state.modelConfig.showKey ? "隐藏" : "显示"}</button>
            </div>
          </label>
        </div>
        <div class="modal-actions">
          <button class="ghost-btn" data-action="reset-config">重置 Key</button>
          <button class="ghost-btn" data-action="test-config">测试连接</button>
          <button class="primary-btn" data-action="save-config">保存配置</button>
        </div>
        ${state.error ? `<div class="modal-message">${escapeHtml(state.error)}</div>` : ""}
      </section>
    </div>
  `;
}

function renderProviderDropdown() {
  const current = MODEL_PROVIDERS.includes(state.modelConfig.provider) ? state.modelConfig.provider : MODEL_PROVIDERS[0];
  return `
    <div class="market-dropdown provider-dropdown ${state.modelConfig.providerOpen ? "open" : ""}">
      <button class="market-trigger provider-trigger" type="button" data-action="toggle-provider-menu" aria-haspopup="listbox" aria-expanded="${state.modelConfig.providerOpen ? "true" : "false"}">
        <span>${escapeHtml(current)}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      ${state.modelConfig.providerOpen ? `
        <div class="market-menu provider-menu" role="listbox" aria-label="模型服务">
          ${MODEL_PROVIDERS.map((provider) => `
            <button class="market-option provider-option ${provider === current ? "selected" : ""}" type="button" role="option" aria-selected="${provider === current}" data-action="select-provider" data-id="${escapeAttr(provider)}">
              <span>${escapeHtml(provider)}</span>
              ${provider === current ? `<b>✓</b>` : ""}
            </button>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function bindEvents() {
  app.querySelectorAll("[data-field]").forEach((field) => {
    field.addEventListener("input", (event) => {
      const product = findProduct(event.target.dataset.id);
      if (!product) return;
      product[event.target.dataset.field] = event.target.value;
      if (event.target.dataset.field === "url") product.extract = null;
      if (event.target.dataset.field === "name") {
        const display = event.target.closest(".name-edit")?.querySelector(".name-display");
        if (display) {
          const name = event.target.value.trim();
          display.textContent = name || "请输入产品名称";
          display.classList.toggle("is-placeholder", !name);
        }
      }
    });
  });

  app.querySelectorAll("[data-profile-field]").forEach((field) => {
    autosizeTextarea(field);
    field.addEventListener("input", (event) => {
      const product = findProduct(event.target.dataset.id);
      if (!product) return;
      product.profile[event.target.dataset.profileField] = event.target.value;
      autosizeTextarea(event.target);
    });
  });

  app.querySelectorAll("[data-config-field]").forEach((field) => {
    field.addEventListener("input", (event) => {
      state.modelConfig[event.target.dataset.configField] = event.target.value;
      clearVisibleError();
      cancelActiveModelRequests();
    });
    field.addEventListener("change", (event) => {
      state.modelConfig[event.target.dataset.configField] = event.target.value;
      clearVisibleError();
      cancelActiveModelRequests();
    });
  });

  app.querySelectorAll("[data-discovery-field]").forEach((field) => {
    field.addEventListener("input", (event) => {
      updateDiscoveryField(event.target.dataset.discoveryField, event.target.value);
      state.discovery.error = "";
    });
    field.addEventListener("change", (event) => {
      updateDiscoveryField(event.target.dataset.discoveryField, event.target.value);
      state.discovery.error = "";
    });
  });

  app.querySelectorAll("[data-candidate-id]").forEach((field) => {
    field.addEventListener("change", (event) => toggleCandidateSelection(event.target.dataset.candidateId, event.target.checked));
  });

  app.querySelectorAll("[data-modal-panel]").forEach((panel) => {
    panel.addEventListener("click", (event) => event.stopPropagation());
  });

  app.querySelectorAll("[data-preview-panel]").forEach((panel) => {
    panel.addEventListener("click", (event) => event.stopPropagation());
  });

  app.querySelectorAll("[data-upload]").forEach((field) => {
    field.addEventListener("change", (event) => handleImages(event.target.dataset.upload, event.target.files));
  });

  app.querySelectorAll("[data-dimension]").forEach((field) => {
    field.addEventListener("change", (event) => {
      const dimension = event.target.dataset.dimension;
      state.error = "";
      state.dimensions = event.target.checked
        ? [...new Set([...state.dimensions, dimension])]
        : state.dimensions.filter((item) => item !== dimension);
      render();
    });
  });

  app.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action, button.dataset.id, button.dataset.imageId));
  });

  app.querySelectorAll(".nav-list a[href^='#']").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const section = link.getAttribute("href")?.slice(1);
      navigateToSection(section);
    });
  });
}

function sectionFromHash() {
  const section = window.location.hash.replace("#", "");
  return NAV_SECTIONS.includes(section) ? section : "discover";
}

function setActiveSection(section) {
  if (!NAV_SECTIONS.includes(section) || state.activeSection === section) return;
  state.activeSection = section;
  updateActiveNav();
}

function navigateToSection(section) {
  if (!NAV_SECTIONS.includes(section)) return;
  state.activeSection = section;
  updateActiveNav();
  const nextHash = `#${section}`;
  if (window.location.hash !== nextHash) window.history.pushState(null, "", nextHash);
  requestAnimationFrame(() => {
    scrollSectionIntoView(section);
  });
}

function normalizeInitialHashPosition() {
  if (!window.location.hash) return;
  requestAnimationFrame(() => {
    getScrollRoot().scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
}

function syncActiveSectionFromHash() {
  setActiveSection(sectionFromHash());
}

function updateActiveNav() {
  app.querySelectorAll(".nav-list a[href^='#']").forEach((link) => {
    const section = link.getAttribute("href")?.slice(1);
    link.classList.toggle("active", section === state.activeSection);
  });
}

function syncActiveSectionFromScroll() {
  let current = sectionFromHash();
  const scrollRoot = getScrollRoot();
  const rootTop = scrollRoot === window ? 0 : scrollRoot.getBoundingClientRect().top;
  const anchorOffset = rootTop + 140;
  for (const section of NAV_SECTIONS) {
    const node = document.getElementById(section);
    if (!node) continue;
    if (node.getBoundingClientRect().top <= anchorOffset) current = section;
  }
  setActiveSection(current);
}

function getScrollRoot() {
  return app.querySelector(".workspace") || window;
}

function bindWorkspaceScroll() {
  const nextScrollRoot = getScrollRoot();
  if (activeScrollRoot === nextScrollRoot) return;
  if (activeScrollRoot && activeScrollRoot !== window) {
    activeScrollRoot.removeEventListener("scroll", syncActiveSectionFromScroll);
  }
  activeScrollRoot = nextScrollRoot;
  if (activeScrollRoot !== window) {
    activeScrollRoot.addEventListener("scroll", syncActiveSectionFromScroll, { passive: true });
  }
}

function scrollSectionIntoView(section) {
  const node = document.getElementById(section);
  if (!node) return;
  const scrollRoot = getScrollRoot();
  if (scrollRoot === window) {
    node.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const rootRect = scrollRoot.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  const top = scrollRoot.scrollTop + nodeRect.top - rootRect.top;
  scrollRoot.scrollTo({ top, left: 0, behavior: "smooth" });
}

function syncAddProductCardHeight() {
  requestAnimationFrame(() => {
    const productList = app.querySelector(".product-list");
    if (!productList) return;

    const productCards = [...productList.querySelectorAll(".product-card")];
    const addCard = productList.querySelector(".add-product-card");
    if (!productCards.length || !addCard) {
      productList.style.removeProperty("--product-card-height");
      return;
    }

    const maxHeight = Math.max(...productCards.map((card) => card.getBoundingClientRect().height));
    if (maxHeight > 0) productList.style.setProperty("--product-card-height", `${Math.round(maxHeight)}px`);
  });
}

function bindPanelHoverSpot() {
  app.querySelectorAll(".panel, .report-shell, .progress-panel").forEach((panel) => {
    const syncSpot = (event) => {
      const rect = panel.getBoundingClientRect();
      panel.style.setProperty("--spot-x", `${Math.round(event.clientX - rect.left)}px`);
      panel.style.setProperty("--spot-y", `${Math.round(event.clientY - rect.top)}px`);
    };

    panel.addEventListener("pointerenter", syncSpot);
    panel.addEventListener("pointermove", syncSpot);
  });
}

function autosizeTextarea(field) {
  field.style.height = "auto";
  field.style.height = `${field.scrollHeight}px`;
}

function clearVisibleError() {
  state.error = "";
  app.querySelectorAll(".error-box,.modal-message").forEach((node) => node.remove());
}

function cancelActiveModelRequests() {
  state.modelRequestEpoch += 1;
  state.loading = false;
  state.profilingAll = false;
  state.profilingId = "";
  activeModelControllers.forEach((controller) => controller.abort());
  activeModelControllers.clear();
}

async function handleAction(action, id, imageId) {
  if (action === "open-config") {
    state.showConfigModal = true;
    state.error = "";
    render();
  }

  if (action === "close-config") {
    state.showConfigModal = false;
    state.error = "";
    state.modelConfig.providerOpen = false;
    render();
  }

  if (action === "toggle-key") {
    state.modelConfig.showKey = !state.modelConfig.showKey;
    render();
  }

  if (action === "toggle-provider-menu") {
    state.modelConfig.providerOpen = !state.modelConfig.providerOpen;
    state.discovery.marketOpen = false;
    render();
  }

  if (action === "select-provider") {
    state.modelConfig.provider = id || state.modelConfig.provider;
    state.modelConfig.providerOpen = false;
    clearVisibleError();
    cancelActiveModelRequests();
    render();
  }

  if (action === "open-image-preview") {
    const product = findProduct(id);
    const image = product?.images.find((item) => item.id === imageId);
    if (image) {
      state.previewImage = image;
      render();
    }
  }

  if (action === "close-image-preview") {
    state.previewImage = null;
    render();
  }

  if (action === "reset-config") {
    cancelActiveModelRequests();
    state.modelConfig = defaultModelConfig();
    localStorage.removeItem("uxModelConfig");
    state.error = "已清除浏览器中的模型配置。";
    await loadHealth();
  }

  if (action === "save-config") {
    cancelActiveModelRequests();
    saveModelConfig();
    state.error = "";
    state.showConfigModal = false;
    await loadHealth();
  }

  if (action === "test-config") {
    saveModelConfig();
    await testModelConfig();
  }

  if (action === "add-competitor") {
    state.products.push(createProduct("competitor"));
    render();
  }

  if (action === "toggle-discovery-optional") {
    state.discovery.optionalOpen = !state.discovery.optionalOpen;
    render();
  }

  if (action === "toggle-market-menu") {
    state.discovery.marketOpen = !state.discovery.marketOpen;
    state.modelConfig.providerOpen = false;
    render();
  }

  if (action === "select-market") {
    state.discovery.market = id || state.discovery.market;
    state.discovery.marketOpen = false;
    state.discovery.error = "";
    render();
  }

  if (action === "remove-product") {
    if (state.products.length <= 1) return;
    state.products = state.products.filter((product) => product.id !== id);
    if (!state.products.some((product) => product.role === "self") && state.products[0]) {
      state.products[0].role = "self";
    }
    render();
  }

  if (action === "remove-image") {
    const product = findProduct(id);
    if (product) product.images = product.images.filter((image) => image.id !== imageId);
    render();
  }

  if (action === "discover-competitors") await discoverCompetitors();
  if (action === "import-competitors") importSelectedCompetitors();
  if (action === "extract") await extractProduct(id);
  if (action === "analyze") await analyze();
  if (action === "export-html") exportHtml();
  if (action === "print") window.print();
}

async function handleImages(id, fileList) {
  const product = findProduct(id);
  if (!product) return;
  const incoming = [...fileList].slice(0, MAX_PRODUCT_IMAGES - product.images.length);
  const oversized = [...fileList].some((file) => file.size > 2 * 1024 * 1024);

  if (oversized) {
    state.error = "图片不能超过 2MB，请压缩后再上传。";
    render();
    return;
  }

  const images = await Promise.all(incoming.map(readImageFile));
  product.images = [...product.images, ...images].slice(0, MAX_PRODUCT_IMAGES);
  state.error = "";
  render();
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type,
      dataUrl: reader.result
    });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function extractProduct(id) {
  const product = findProduct(id);
  if (!product?.url) {
    state.error = "请先填写产品链接。";
    render();
    return;
  }

  state.extractingId = id;
  state.error = "";
  render();

  try {
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: product.url })
    });
    const data = await response.json();
    product.extract = response.ok ? data : { ok: false, warning: data.warning || data.error || "抓取失败" };
    if (response.ok && !product.name.trim() && data.suggestedName) {
      product.name = data.suggestedName;
    }
    if (response.ok && data.screenshot?.dataUrl && product.images.length < MAX_PRODUCT_IMAGES) {
      const alreadyCaptured = product.images.some((image) => image.name?.startsWith("页面截图-") && image.dataUrl === data.screenshot.dataUrl);
      if (!alreadyCaptured) {
        product.images = [
          ...product.images,
          {
            id: crypto.randomUUID(),
            name: data.screenshot.name || "页面截图.png",
            type: data.screenshot.type || "image/png",
            dataUrl: data.screenshot.dataUrl
          }
        ].slice(0, MAX_PRODUCT_IMAGES);
      }
    }
    if (response.ok && !data.screenshot && data.screenshotWarning) {
      state.error = `页面正文已抓取，但截图失败：${data.screenshotWarning}`;
    }
  } catch (error) {
    product.extract = { ok: false, warning: error.message };
  }

  state.extractingId = "";
  render();
}

async function discoverCompetitors() {
  if (!canDiscoverCompetitors()) {
    state.discovery.error = "请先填写本品名称。链接、行业关键词和行业资料可展开后选填。";
    render();
    return;
  }

  syncSelfProductFromDiscovery();
  state.discovery.loading = true;
  state.discovery.error = "";
  state.discovery.warnings = [];
  state.discovery.sources = [];
  state.discovery.selectedIds = [];
  render();

  try {
    const response = await fetchWithTimeout("/api/discover-competitors", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...modelHeaders() },
      body: JSON.stringify({
        selfName: state.discovery.selfName,
        selfUrl: state.discovery.selfUrl,
        industryKeywords: state.discovery.industryKeywords,
        market: state.discovery.market || "cn",
        sourceText: state.discovery.sourceText,
        sourceUrls: splitLines(state.discovery.sourceUrls),
        limit: 10
      })
    }, 90000);
    const data = await response.json();
    if (!response.ok) throw new Error(formatApiError(data));
    state.discovery.candidates = (data.candidates || []).map((candidate) => ({
      ...candidate,
      id: crypto.randomUUID()
    }));
    state.discovery.sources = data.sources || [];
    state.discovery.warnings = data.warnings || [];
    if (!state.discovery.candidates.length) {
      state.discovery.error = "未找到候选竞品，请补充行业关键词、App Store 链接或行业资料。";
    }
  } catch (error) {
    state.discovery.error = error.message;
  }

  state.discovery.loading = false;
  render();
}

function canDiscoverCompetitors() {
  return Boolean(state.discovery.selfName.trim());
}

function toggleCandidateSelection(candidateId, checked) {
  state.discovery.error = "";
  if (!checked) {
    state.discovery.selectedIds = state.discovery.selectedIds.filter((id) => id !== candidateId);
    render();
    return;
  }
  if (state.discovery.selectedIds.length >= 3) {
    state.discovery.error = "最多选择 3 个竞品。";
    render();
    return;
  }
  state.discovery.selectedIds = [...new Set([...state.discovery.selectedIds, candidateId])];
  render();
}

function importSelectedCompetitors() {
  const selected = state.discovery.candidates.filter((candidate) => state.discovery.selectedIds.includes(candidate.id) && !isCandidateImported(candidate));
  if (!selected.length) {
    state.discovery.error = "请选择尚未导入的候选竞品。";
    render();
    return;
  }

  const emptyCompetitorSlots = state.products.filter((product) => (
    product.role === "competitor"
    && !product.name.trim()
    && !product.url.trim()
    && product.images.length === 0
  )).length;
  const availableSlots = emptyCompetitorSlots + Math.max(0, 3 - competitorCount());
  if (selected.length > availableSlots) {
    state.discovery.error = `当前最多还能导入 ${availableSlots} 个竞品，请先移除已有竞品或减少选择。`;
    render();
    return;
  }

  syncSelfProductFromDiscovery();
  selected.forEach((candidate) => {
    const emptyCompetitor = state.products.find((product) => (
      product.role === "competitor"
      && !product.name.trim()
      && !product.url.trim()
      && product.images.length === 0
    ));
    const product = emptyCompetitor || createProduct("competitor");
    product.name = candidate.name || "";
    product.url = candidate.url || "";
    product.extract = null;
    product.profile = {
      ...EMPTY_PROFILE,
      positioning: candidate.reason || "",
      marketSignals: [
        candidate.source ? `来源：${candidate.source}` : "",
        candidate.category ? `分类：${candidate.category}` : "",
        candidate.developer ? `开发商：${candidate.developer}` : "",
        candidate.confidence ? `相关度：${candidate.confidence}%` : ""
      ].filter(Boolean).join("；")
    };
    if (!emptyCompetitor) state.products.push(product);
  });

  state.discovery.selectedIds = [];
  state.discovery.error = `已导入 ${selected.length} 个竞品，可继续上传截图或抓取链接。`;
  render();
}

function syncSelfProductFromDiscovery() {
  const selfProduct = state.products.find((product) => product.role === "self") || state.products[0];
  if (!selfProduct) return;
  if (state.discovery.selfName.trim() && !selfProduct.name.trim()) selfProduct.name = state.discovery.selfName.trim();
  if (state.discovery.selfUrl.trim() && !selfProduct.url.trim()) selfProduct.url = state.discovery.selfUrl.trim();
}

function isCandidateImported(candidate) {
  const candidateName = comparableText(candidate.name);
  const candidateUrl = comparableUrl(candidate.url);
  return state.products.some((product) => {
    if (product.role !== "competitor") return false;
    return (candidateName && comparableText(product.name) === candidateName)
      || (candidateUrl && comparableUrl(product.url) === candidateUrl);
  });
}

async function testModelConfig() {
  const requestEpoch = state.modelRequestEpoch;
  state.error = "正在测试模型生成能力，可能需要 1 分钟左右...";
  render();
  try {
    const response = await fetchWithTimeout("/api/test-model", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...modelHeaders() },
      body: JSON.stringify({
        scenario: "generation",
        product: productForModelTest()
      })
    }, 90000);
    const data = await response.json();
    if (requestEpoch !== state.modelRequestEpoch) return;
    if (!response.ok || !data.ok) {
      throw new Error(data.details || data.error || "模型连接测试失败，请检查 API Key、Base URL 和模型名称。");
    }
    state.health = {
      ...(state.health || {}),
      ...data,
      apiAvailable: true,
      modelConfigured: true
    };
    state.error = data.warning || data.message || "模型文本与图片输入能力均可响应；复杂生成仍可能因图片数量、上下文长度或网关负载而超时。";
  } catch (error) {
    if (requestEpoch !== state.modelRequestEpoch) return;
    state.error = error.message;
  }
  render();
}

function productForModelTest() {
  const product = state.products.find((item) => item.images.length || item.url.trim()) || state.products[0];
  return {
    role: product.role,
    name: product.name || "测试产品",
    url: product.url,
    profile: product.profile,
    images: product.images
  };
}

function updateDiscoveryField(field, value) {
  state.discovery.marketOpen = false;
  if (field === "sourceMaterials") {
    const parsed = parseDiscoveryMaterials(value);
    state.discovery.sourceUrls = parsed.sourceUrls.join("\n");
    state.discovery.sourceText = parsed.sourceText;
    return;
  }
  state.discovery[field] = value;
}

function discoverySourceMaterials() {
  return [
    state.discovery.sourceUrls,
    state.discovery.sourceText
  ].map((item) => item.trim()).filter(Boolean).join("\n\n");
}

function parseDiscoveryMaterials(value) {
  const urlPattern = /https?:\/\/[^\s，,；;]+/gi;
  const sourceUrls = [];
  const textLines = [];

  String(value || "").split(/\r?\n/).forEach((line) => {
    const urls = line.match(urlPattern) || [];
    urls.forEach((url) => {
      const cleaned = url.replace(/[。.!?)\]）】]+$/g, "");
      if (isHttpUrl(cleaned)) sourceUrls.push(cleaned);
    });
    const text = line.replace(urlPattern, "").trim();
    if (text) textLines.push(text);
  });

  return {
    sourceUrls: [...new Set(sourceUrls)].slice(0, 5),
    sourceText: textLines.join("\n").slice(0, 20000)
  };
}

async function generateProfile(id) {
  return generateProfileForProduct(id, { renderStart: true });
}

async function generateAllProfiles() {
  if (!state.dimensions.length) {
    state.error = "请至少选择一个分析维度。";
    render();
    return;
  }

  const invalid = state.products.find((product) => !product.name.trim() || (!product.url.trim() && product.images.length === 0));
  if (invalid) {
    state.error = !invalid.name.trim()
      ? "请先填写所有产品名称。"
      : `${invalid.name} 需要产品链接或至少一张图片，才能生成报告。`;
    render();
    return;
  }

  state.profilingAll = true;
  state.error = "";
  render();

  for (const product of state.products) {
    const ok = await generateProfileForProduct(product.id, { renderStart: false, renderEnd: false });
    if (!ok) break;
  }

  state.profilingId = "";
  state.profilingAll = false;
  render();
}

async function generateProfileForProduct(id, options = {}) {
  const { renderStart = true, renderEnd = true } = options;
  const product = findProduct(id);
  if (!product) return false;
  if (!product.name.trim()) {
    state.error = "请先填写产品名称。";
    render();
    return false;
  }
  if (!product.url.trim() && product.images.length === 0) {
    state.error = `${product.name} 需要产品链接或至少一张图片，才能生成报告。`;
    render();
    return false;
  }

  state.profilingId = id;
  state.error = "";
  const requestEpoch = state.modelRequestEpoch;
  if (renderStart) render();

  try {
    const response = await fetchWithTimeout("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...modelHeaders() },
      body: JSON.stringify(serializeProduct(product))
    }, 90000);
    if (requestEpoch !== state.modelRequestEpoch) {
      state.profilingId = "";
      if (renderEnd) render();
      return false;
    }
    const data = await response.json();
    if (!response.ok) throw new Error(formatApiError(data));
    product.profile = { ...EMPTY_PROFILE, ...data.profile };
    product.profileMeta = data.meta;
    product.extract = data.extraction || product.extract;
    product.profileOpen = true;
  } catch (error) {
    if (requestEpoch !== state.modelRequestEpoch) return false;
    state.error = error.message;
    state.profilingId = "";
    if (renderEnd) render();
    return false;
  }

  state.profilingId = "";
  if (renderEnd) render();
  return true;
}

async function analyze() {
  const validationError = validateForm();
  if (validationError) {
    state.error = validationError;
    render();
    return;
  }

  state.loading = true;
  state.error = "";
  state.report = null;
  const requestEpoch = state.modelRequestEpoch;
  render();

  try {
    const response = await fetchWithTimeout("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...modelHeaders() },
      body: JSON.stringify({
        products: state.products.map(serializeProduct),
        dimensions: state.dimensions
      })
    }, 90000);
    if (requestEpoch !== state.modelRequestEpoch) {
      state.loading = false;
      render();
      return;
    }
    const data = await response.json();
    if (!response.ok) throw new Error(formatApiError(data));
    state.report = data;
  } catch (error) {
    if (requestEpoch !== state.modelRequestEpoch) return;
    state.error = error.message;
  }

  state.loading = false;
  render();
}

function validateForm() {
  if (state.dimensions.length === 0) return "请至少选择一个 UX 维度。";
  if (state.products.length < 2) return "请至少填写本品和一个竞品。";
  for (const product of state.products) {
    if (!product.name.trim()) return "请填写所有产品名称。";
    if (!product.url.trim() && product.images.length === 0) {
      return `${product.name || "产品"} 需要链接或图片。`;
    }
  }
  return "";
}

function serializeProduct(product) {
  return {
    role: product.role,
    name: product.name,
    url: product.url,
    profile: product.profile,
    images: product.images.map(({ name, type, dataUrl }) => ({ name, type, dataUrl }))
  };
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  activeModelControllers.add(controller);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === "AbortError") throw new Error("请求超时：模型接口响应过慢，请稍后重试或切换模型。");
    throw error;
  } finally {
    activeModelControllers.delete(controller);
    clearTimeout(timer);
  }
}

function exportHtml() {
  if (!state.report) return;
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>竞品分析报告</title><style>${collectInlineStyles()}</style></head><body><main class="workspace exported">${renderReport(state.report)}</main></body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ux-competitive-report-${Date.now()}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatApiError(data) {
  if (!data) return "生成失败";
  if (data.error === "Method Not Allowed") return "API 请求方式不匹配：请确认后端服务已启动，并且当前页面连接到 /api 接口。";
  if (typeof data.details === "string" && data.details.includes("Unterminated string")) {
    return "模型返回的结构化 JSON 不完整，可能是模型输出被截断或没有按 JSON 格式结束。请减少图片数量、切换更稳定的模型，或重试生成。";
  }
  if (
    typeof data.details === "string"
    && (
      data.details.includes("unknown variant `image_url`")
      || data.details.includes("unknown variant image_url")
      || data.details.includes("expected `text`")
      || data.details.includes("expected text")
    )
  ) {
    return "当前模型接口不支持图片输入 image_url。系统会在可降级的场景自动改用纯文本；如需分析截图视觉细节，请切换支持视觉输入的模型。";
  }
  if (typeof data.details === "string") return data.details;
  if (Array.isArray(data.details)) return `${data.error || "请求失败"}：${data.details.join("；")}`;
  if (data.error && data.details) return `${data.error}：${JSON.stringify(data.details)}`;
  return data.error || "生成失败";
}

function collectInlineStyles() {
  return [...document.styleSheets]
    .map((sheet) => {
      try {
        return [...sheet.cssRules].map((rule) => rule.cssText).join("\n");
      } catch {
        return "";
      }
    })
    .join("\n");
}

function profileText(profile) {
  return PROFILE_FIELDS.map(([key]) => profile?.[key] || "").join("\n").trim();
}

function selectedUnifiedDimensions() {
  return UNIFIED_DIMENSIONS.filter((dimension) => state.dimensions.includes(dimension.label));
}

function defaultModelConfig() {
  return {
    provider: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "",
    apiKey: "",
    showKey: false,
    providerOpen: false
  };
}

function loadModelConfig() {
  try {
    return { ...defaultModelConfig(), ...JSON.parse(localStorage.getItem("uxModelConfig") || "{}"), showKey: false };
  } catch {
    return defaultModelConfig();
  }
}

function saveModelConfig() {
  const { provider, baseUrl, model, apiKey } = state.modelConfig;
  localStorage.setItem("uxModelConfig", JSON.stringify({ provider, baseUrl, model, apiKey }));
}

function isLocalModelConfigured() {
  return Boolean(state.modelConfig.apiKey?.trim() && state.modelConfig.model?.trim());
}

function modelHeaders() {
  if (!isLocalModelConfigured()) return {};
  return {
    "x-openai-api-key": state.modelConfig.apiKey.trim(),
    "x-openai-base-url": (state.modelConfig.baseUrl || "https://api.openai.com/v1").trim(),
    "x-openai-model": state.modelConfig.model.trim()
  };
}

function findProduct(id) {
  return state.products.find((item) => item.id === id);
}

function competitorCount() {
  return state.products.filter((product) => product.role === "competitor").length;
}

function competitorIndex(id) {
  return state.products.filter((product) => product.role === "competitor").findIndex((product) => product.id === id) + 1;
}

function splitLines(value = "") {
  return [...new Set(String(value || "").split(/[\n,，]/).map((item) => item.trim()).filter(Boolean))].slice(0, 5);
}

function comparableText(value = "") {
  return String(value || "").toLowerCase().replace(/\s+/g, "").replace(/[^\p{L}\p{N}]/gu, "");
}

function comparableUrl(value = "") {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return String(value || "").trim().replace(/\/$/, "").toLowerCase();
  }
}

function isHttpUrl(value = "") {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value = "") {
  return escapeHtml(value).replace(/\n/g, " ");
}
