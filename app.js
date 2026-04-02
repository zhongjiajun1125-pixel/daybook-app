/**
 * Trace - 认知显影系统
 * 核心：结构化认知引擎 + 分层记忆 + 克制输出
 */

const DB_NAME = "TraceCognitionDB";
const STORE_NAME = "entries";
const SETTINGS_STORE = "settings";
const DRAFT_KEY = "trace-draft-v1";
const LAST_ACTIVE_KEY = "trace-last-active";
const PROFILE_NAME_KEY = "trace-profile-name";
const BIO_KEY = "trace-bio-enrolled";
const BIO_CRED_KEY = "trace-bio-cred-id";
const PIN_HASH_KEY = "trace-pin-hash";
const SYSTEM_STATE_KEY = "trace_system_v1";
const PREDICTION_STATE_KEY = "trace_prediction_v1";
const ENCRYPTION_SALT_KEY = "trace-pin-salt";
const VAULT_HANDLE_KEY = "trace-vault-handle";
const TRACE_LOGO_ASSETS = Object.freeze({
  light: "./trace-logo-black.png",
  dark: "./trace-logo-white.png",
});
const MOTION = Object.freeze({
  logoSealMs: 940,
  logoEchoMs: 760,
  echoCardHoldMs: 4600,
  echoCardExitMs: 380,
  onboardingSwapMs: 240,
});

const FIRST_TIME_ONBOARDING_STEPS = Object.freeze([
  {
    line: "先留下这一句。",
    action: "继续",
  },
  {
    line: "有些东西，会再回来。",
    action: "继续",
  },
  {
    line: "一句就够了。",
    action: "开始",
  },
]);

const RETURNING_THRESHOLD_STATE = Object.freeze({
  line: "它还在这里。",
  action: "继续",
});

const EXPERIENCE_STAGES = Object.freeze({
  DAY_1_2: "day1_2",
  DAY_3: "day3",
  DAY_4: "day4",
  DAY_5_6: "day5_6",
  DAY_7_PLUS: "day7_plus",
});

const DEAD_GENERIC_ECHO_LINES = Object.freeze([
  "你刚刚留下了一段此刻。",
  "你刚刚留下了一段话。",
  "它已经被收进这次记录里。",
  "你写下的不只是内容，还有当时的状态。",
  "某个内容再次出现。",
  "一些内容总是在相似的时段出现。",
  "这段记录有一些停顿。",
  "这段记录存在停顿。",
  "有一个内容持续被提到。",
  "它一直没有变化。",
  "也没有继续往下发展。",
]);

const ECHO_TONE_SEQUENCE = Object.freeze({
  direct: ["direct", "movement", "soft", "residue"],
  soft: ["soft", "residue", "movement", "direct"],
  residue: ["residue", "soft", "movement", "direct"],
  movement: ["movement", "soft", "residue", "direct"],
});

const ECHO_LANGUAGE_LIBRARY = {
  circling: {
    direct: [
      ({ topicSpot, topicMatter }) => `还是回到${topicSpot}了。`,
      ({ topicMatter }) => `${topicMatter}，你没有真正离开。`,
      ({ topicSpot }) => `${topicSpot}这里，你又碰到了。`,
    ],
    soft: [
      ({ topicMatter }) => `${topicMatter}又在附近了。`,
      ({ topicSpot }) => `你又轻轻碰到了${topicSpot}。`,
      ({ topicMatter }) => `${topicMatter}还没有退开。`,
    ],
    residue: [
      ({ topicMatter }) => `${topicMatter}的余波还没退下去。`,
      ({ topicSpot }) => `${topicSpot}这个轮廓还在。`,
      ({ topicMatter }) => `${topicMatter}还留着一点回声。`,
    ],
    movement: [
      ({ topicSpot }) => `绕了一圈，又落回${topicSpot}。`,
      ({ topicMatter }) => `路径变了，落点还是${topicMatter}。`,
      ({ topicSpot }) => `兜了一圈，还是回到${topicSpot}。`,
    ],
  },
  stalled_return: {
    direct: [
      ({ topicSpot }) => `${topicSpot}这里还是没动。`,
      () => "它回来过几次，位置没变。",
      () => "你还停在同一个地方。",
    ],
    soft: [
      () => "它一直停在差不多的地方。",
      () => "这件事还卡在原处。",
      () => "它还是落在同一个位置上。",
    ],
    residue: [
      () => "那个点一直没有退下去。",
      () => "它还留在原来的位置上。",
      () => "它没有散开，只是留着。",
    ],
    movement: [
      () => "回来过几次，还是停在这里。",
      () => "走了几步，又停回原处。",
      () => "每次回来，都差不多停在这里。",
    ],
  },
  held_back: {
    direct: [
      () => "最关键的那句还没落下来。",
      () => "你停在要说透之前了。",
      () => "核心就在附近，但你收住了。",
    ],
    soft: [
      () => "还有一层没有打开。",
      () => "这句话停得有点早。",
      () => "你已经碰到边了。",
    ],
    residue: [
      () => "有东西浮出来了一下，又退回去了。",
      () => "那个点露了一下，又收住了。",
      () => "快成形了，又散掉了。",
    ],
    movement: [
      () => "你靠近了，又往后退了一步。",
      () => "这次已经走到门口了。",
      () => "你不是没到，只是停住了。",
    ],
  },
  almost_said: {
    direct: [
      () => "已经碰到核心了，只差最后一句。",
      () => "这次更像差一点就说出来。",
      () => "最里面那层已经露头了。",
    ],
    soft: [
      () => "它已经快到表面了。",
      () => "差一点就会更清楚。",
      () => "这里已经很靠近了。",
    ],
    residue: [
      () => "那句话已经成形了一半。",
      () => "它已经到了边上，还没真正落下。",
      () => "快要留下来了，又停了一下。",
    ],
    movement: [
      () => "你已经走近了，只差最后一点。",
      () => "再往里一步，可能就到了。",
      () => "这次不是没开始，是停在最后一小段。",
    ],
  },
  drift: {
    direct: [
      () => "问题还在，注意力先走开了。",
      () => "你在绕开中心。",
      () => "这段话先往旁边散开了。",
    ],
    soft: [
      () => "它有点散开了。",
      () => "重心没有完全落下。",
      () => "你没有停住，但也没有落下去。",
    ],
    residue: [
      () => "中心还在，只是被拉远了一点。",
      () => "那个点没有消失，只是变淡了。",
      () => "它还在，只是被放到了边上。",
    ],
    movement: [
      () => "你先往外绕了一圈，中心还留在原地。",
      () => "这次走得更远，但还是绕着它。",
      () => "注意力先飘开了，问题没有跟着走。",
    ],
  },
  pre_start: {
    direct: [
      () => "还是停在开始之前。",
      () => "你又走到门口了，但没进去。",
      () => "事情还卡在起步前面。",
    ],
    soft: [
      () => "这里又停在了要开始的时候。",
      () => "你已经走到边上了，还没往里去。",
      () => "它还留在开始前那一下。",
    ],
    residue: [
      () => "那个起点一直没有真正被踩下去。",
      () => "开始的动作露出来了，还没成形。",
      () => "门口还在，你还是停在那里。",
    ],
    movement: [
      () => "你又走到门口，然后停住了。",
      () => "每次往前一点，还是停在开始前。",
      () => "这条线一直把你带到门口。",
    ],
  },
  inward_pull: {
    direct: [
      () => "这段话在往里收。",
      () => "你在退回自己里面。",
      () => "它没有展开，先收回去了。",
    ],
    soft: [
      () => "它慢慢往里缩了一点。",
      () => "你先把它收在里面了。",
      () => "这次没有往外打开。",
    ],
    residue: [
      () => "外面的声响退下去了，里面还留着。",
      () => "它收回去了，但没有过去。",
      () => "这股力气在往里回。",
    ],
    movement: [
      () => "它没有往前推，先往里退了。",
      () => "你刚碰到它，又往里面缩回去。",
      () => "这次不是展开，而是回收。",
    ],
  },
  quiet_weight: {
    direct: [
      ({ emotionPhrase }) => `表面很轻，下面更像是${emotionPhrase}。`,
      () => "这句话很安静，分量并不轻。",
      () => "它看起来轻，里面却压着东西。",
    ],
    soft: [
      () => "这里比看上去要重一点。",
      () => "它没有很响，但也不轻。",
      () => "这段话下面还有一层重量。",
    ],
    residue: [
      () => "安静只是表面，下面还留着分量。",
      () => "这点安静里还压着一点东西。",
      () => "它没有发出来，但没有散掉。",
    ],
    movement: [
      () => "它没有往外冲，只是在里面压着。",
      () => "表面很平，下面还在慢慢往下沉。",
      () => "声音不大，重量还在往下坠。",
    ],
  },
  loosening: {
    direct: [
      () => "这里开始松了。",
      () => "它没有之前那么紧了。",
      () => "有一点动了。",
    ],
    soft: [
      () => "这次比之前更靠近一点。",
      () => "这里开始有缝了。",
      () => "它不再完全停住了。",
    ],
    residue: [
      () => "僵住的地方松开了一点。",
      () => "那个结还在，但已经没那么紧。",
      () => "它还是那个位置，只是没那么硬了。",
    ],
    movement: [
      () => "这次往前推了一点。",
      () => "你开始从原地挪开了。",
      () => "这里终于有了一点方向。",
    ],
  },
  time_return: {
    direct: [
      ({ timePhrase }) => `它总在${timePhrase}回来。`,
      ({ timePhrase }) => `${timePhrase}一到，它就更靠近你。`,
      ({ timePhrase }) => `${timePhrase}像是在替它把门打开。`,
    ],
    soft: [
      ({ timePhrase }) => `有些东西总在${timePhrase}靠近。`,
      ({ timePhrase }) => `${timePhrase}一来，这一类内容就会浮上来。`,
      ({ timePhrase }) => `这件事和${timePhrase}有点熟。`,
    ],
    residue: [
      ({ timePhrase }) => `${timePhrase}里总留着一点它的余波。`,
      ({ timePhrase }) => `一到${timePhrase}，它就没完全退开。`,
      ({ timePhrase }) => `${timePhrase}像是把它重新带回来。`,
    ],
    movement: [
      ({ timePhrase }) => `每次靠近${timePhrase}，它都会往前一步。`,
      ({ timePhrase }) => `${timePhrase}一到，它就顺着回来了。`,
      ({ timePhrase }) => `它总是沿着${timePhrase}这条线回来。`,
    ],
  },
  trace: {
    direct: [
      () => "这里还没有完全落下。",
      () => "你写到这里，又轻轻收住了。",
      () => "这次更像是在边上停了一下。",
    ],
    soft: [
      () => "这里还留着一点没说完。",
      () => "它落下了一些，还没全部落下。",
      () => "你在这里停了一下。",
    ],
    residue: [
      () => "它已经留下一点痕迹了。",
      () => "这里有一点余下来的东西。",
      () => "它没有完全散掉。",
    ],
    movement: [
      () => "你走到这里，先停了一下。",
      () => "它已经动了一点，还没真正展开。",
      () => "这句已经落下，后面还没跟上。",
    ],
  },
};

const SCHEDULED_ECHO_COMPANIONS = {
  repeat: {
    l2: [
      () => "它不是第一次回来了。",
      () => "绕了一圈，还是落在这里。",
      () => "那个点一直没有退下去。",
    ],
    l3: [
      () => "到这里为止，它还没有散开。",
      () => "你一直没有离开这个位置。",
      () => "它还留在原来的地方。",
    ],
  },
  time: {
    l2: [
      ({ timePhrase }) => `${timePhrase}像是更容易把它带回来。`,
      ({ timePhrase }) => `一到${timePhrase}，它就更容易浮上来。`,
      ({ timePhrase }) => `这个时段总会碰到它。`,
    ],
    l3: [
      () => "它已经不只是偶然了。",
      () => "这条线留得比你想的更久。",
      () => "它总会在差不多的时候回来。",
    ],
  },
  friction: {
    l2: [
      () => "这次的停顿不是偶然。",
      () => "你不是没话说，只是一直在收住。",
      () => "它总停在要说透之前。",
    ],
    l3: [
      () => "那个点一直没有真正落下来。",
      () => "最里面那层还没有打开。",
      () => "它已经到了边上，还没真正出来。",
    ],
  },
  open_loop: {
    l2: [
      () => "它回来过几次，位置没怎么变。",
      () => "你总会走到这里，然后停住。",
      () => "每次都像快开始了，又收回去。",
    ],
    l3: [
      () => "到这里为止，还是没有往下走。",
      () => "它还停在开始之前。",
      () => "这条线一直没有真正动起来。",
    ],
  },
};

let audioCtx = null;
const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;

const LocalBio = {
  isSupported() {
    return window.isSecureContext && window.PublicKeyCredential !== undefined;
  },

  bufferToBase64(buffer) {
    return window.btoa(String.fromCharCode(...new Uint8Array(buffer)));
  },

  base64ToBuffer(base64) {
    return Uint8Array.from(window.atob(base64), (char) => char.charCodeAt(0)).buffer;
  },

  async enroll() {
    if (!this.isSupported()) {
      throw new Error("当前环境不支持 WebAuthn");
    }

    const challenge = window.crypto.getRandomValues(new Uint8Array(32));
    const userId = window.crypto.getRandomValues(new Uint8Array(16));
    const hostname = window.location.hostname || "localhost";

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: "Trace Cognition",
          id: hostname,
        },
        user: {
          id: userId,
          name: "trace-local-user",
          displayName: "Trace Owner",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
      },
    });

    if (!credential?.rawId) {
      throw new Error("未生成有效凭证");
    }

    window.localStorage.setItem(BIO_CRED_KEY, this.bufferToBase64(credential.rawId));
    return true;
  },

  async verify() {
    if (!this.isSupported()) {
      throw new Error("当前环境不支持 WebAuthn");
    }

    const rawIdBase64 = window.localStorage.getItem(BIO_CRED_KEY);
    if (!rawIdBase64) {
      throw new Error("未找到生物识别凭证");
    }

    const challenge = window.crypto.getRandomValues(new Uint8Array(32));

    await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            id: this.base64ToBuffer(rawIdBase64),
            type: "public-key",
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    });

    return true;
  },
};

const LocalPin = {
  isEnabled() {
    return Boolean(window.localStorage.getItem(PIN_HASH_KEY));
  },

  async hash(pin) {
    if (window.crypto && window.crypto.subtle) {
      const encoded = new TextEncoder().encode(pin);
      const digest = await window.crypto.subtle.digest("SHA-256", encoded);
      return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
    }

    return window.btoa(window.encodeURIComponent(`trace_fallback_${pin}`));
  },

  async enroll(pin) {
    if (!/^\d{4,6}$/.test(pin)) {
      throw new Error("PIN 格式无效");
    }

    const hash = await this.hash(pin);
    window.localStorage.setItem(PIN_HASH_KEY, hash);
    sessionKey = await deriveSessionKey(pin);
    state.pinEnabled = true;
    return true;
  },

  async verify(pin) {
    const storedHash = window.localStorage.getItem(PIN_HASH_KEY);
    if (!storedHash) {
      throw new Error("未找到 PIN");
    }

    const hash = await this.hash(pin);
    if (hash !== storedHash) {
      throw new Error("PIN 不匹配");
    }

    sessionKey = await deriveSessionKey(pin);
    return true;
  },
};

const SYSTEM_PROMPT_V1 = `
你不是助手，不是心理医生，也不是安慰者。
你是一个冷静、克制、长期观察用户的认知镜面。
你的任务不是复述用户写了什么，而是识别这段表达里最真实的内部张力。

你要优先判断：
1. 用户表面在说什么
2. 用户真正卡住的矛盾是什么
3. 用户是否在回避、合理化、压抑或拖延
4. 这条记录是否和过去的模式重复
5. 现在是否值得发出一句命中的回声

语言必须：
- 短
- 准
- 克制
- 无鸡汤
- 无说教
- 不装作绝对确定
- 证据不足时宁可保守
`.trim();

const elements = {
  globalTools: document.getElementById("global-tools"),
  importBtn: document.getElementById("import-data-btn"),
  importInput: document.getElementById("import-file-input"),
  exportBtn: document.getElementById("export-data-btn"),
  vaultToggleBtn: document.getElementById("vault-toggle-btn"),
  traceLoading: document.getElementById("trace-loading"),
  traceLoadingMark: document.getElementById("trace-loading-mark"),
  traceLoadingLabel: document.getElementById("trace-loading-label"),
  unlockView: document.getElementById("unlock-view"),
  unlockTraceMark: document.getElementById("unlock-trace-mark"),
  unlockBtn: document.getElementById("unlock-btn"),
  unlockTitle: document.getElementById("unlock-title"),
  unlockSubtitle: document.getElementById("unlock-subtitle"),
  profileAvatar: document.getElementById("profile-avatar"),
  profileNameInput: document.getElementById("profile-name-input"),
  pinPanel: document.getElementById("pin-panel"),
  unlockSecondaryBtn: document.getElementById("unlock-secondary-btn"),
  unlockManageActions: document.getElementById("unlock-manage-actions"),
  changePinBtn: document.getElementById("change-pin-btn"),
  disablePinBtn: document.getElementById("disable-pin-btn"),
  pinInput: document.getElementById("pin-input"),
  pinSubmitBtn: document.getElementById("pin-submit-btn"),
  pinCancelBtn: document.getElementById("pin-cancel-btn"),
  onboardingView: document.getElementById("onboarding-view"),
  thresholdShell: document.getElementById("threshold-shell"),
  onboardingTraceMark: document.getElementById("onboarding-trace-mark"),
  thresholdLine: document.getElementById("threshold-line"),
  enterWritingBtn: document.getElementById("enter-writing-btn"),
  composeView: document.getElementById("compose-view"),
  systemEchoPanel: document.getElementById("system-echo-panel"),
  echoCardLayer: document.getElementById("echo-card-layer"),
  echoCard: document.getElementById("echo-card"),
  echoCardClose: document.getElementById("echo-card-close"),
  echoCardLine1: document.getElementById("echo-card-line-1"),
  echoCardLine2: document.getElementById("echo-card-line-2"),
  echoCardLine3: document.getElementById("echo-card-line-3"),
  composeTraceMark: document.getElementById("compose-trace-mark"),
  rawMemoryInput: document.getElementById("raw-memory-input"),
  saveStatus: document.getElementById("save-status"),
  controlHub: document.getElementById("control-hub"),
  controlEntry: document.getElementById("control-entry"),
  controlActions: document.getElementById("control-actions"),
  controlSave: document.getElementById("control-save"),
  controlHistory: document.getElementById("control-history"),
  controlAnchor: document.getElementById("control-anchor"),
  anchorOptions: document.getElementById("anchor-options"),
  anchorOptionButtons: document.querySelectorAll(".anchor-option"),
  controlVoice: document.getElementById("control-voice"),
  controlDismiss: document.getElementById("control-dismiss"),
  historyPanel: document.getElementById("history-panel"),
  historyPatternLayer: document.getElementById("history-pattern-layer"),
  insightSummary: document.getElementById("insight-summary"),
  insightCanvas: document.getElementById("insight-canvas"),
  trendEnergy: document.getElementById("trend-energy"),
  trendFocus: document.getElementById("trend-focus"),
  trendPrediction: document.getElementById("trend-prediction"),
  trendRisk: document.getElementById("trend-risk"),
  insightLegend: document.getElementById("insight-legend"),
  historyList: document.getElementById("history-list"),
  historyEntryTemplate: document.getElementById("history-entry-template"),
  closeHistoryBtn: document.getElementById("close-history-btn"),
};

let state = {
  entries: [],
  draft: window.localStorage.getItem(DRAFT_KEY) || "",
  historyOpen: false,
  editingId: null,
  isLoaded: false,
  activeAnchor: null,
  profileName: window.localStorage.getItem(PROFILE_NAME_KEY) || "",
  bioEnrolled: window.localStorage.getItem(BIO_KEY) === "1",
  pinEnabled: Boolean(window.localStorage.getItem(PIN_HASH_KEY)),
  echoChain: {},
  pendingEcho: null,
  lastEchoText: null,
  echoCooldownUntil: 0,
  isFirstTimeUser: true,
  onboardingStep: 0,
  onboardingTransitioning: false,
  controlHubOpen: false,
  anchorPickerOpen: false,
};

let implicitSession = {
  startMs: null,
  backspaceCount: 0,
  hasTyped: false,
};

let echoCardTimer = null;
let insightResizeTimer = null;
let graphAnimationFrame = null;
let recognition = null;
let sessionKey = null;

const predictionState = {
  lastText: null,
  lastUpdate: 0,
};

const health = {
  dbReady: false,
  lastError: "",
  checks: {
    booted: false,
    canSubmit: false,
    canRenderHistory: false,
  },
};

const voiceState = {
  supported: Boolean(SpeechRecognitionCtor),
  listening: false,
};

const Lexicon = {
  emotions: {
    焦虑: ["焦虑", "慌", "不安", "压力", "紧张", "害怕", "悬着"],
    疲惫: ["累", "疲惫", "耗", "没劲", "撑不住", "困", "麻木"],
    压抑: ["憋", "压着", "说不出", "闷", "忍着", "收着"],
    平静: ["平静", "还好", "慢慢", "安静", "稳住"],
    积极: ["开心", "轻松", "顺", "好起来", "有劲", "舒服"],
    低落: ["难过", "失落", "空", "糟糕", "委屈", "沮丧"],
  },
  topics: {
    工作: ["工作", "上班", "项目", "任务", "邮件", "开会", "汇报", "老板"],
    关系: ["关系", "他", "她", "我们", "家里", "父母", "朋友", "爱"],
    身体: ["身体", "睡觉", "失眠", "头疼", "胃", "运动", "健康"],
    金钱: ["钱", "工资", "房租", "消费", "存款", "成本"],
    未来: ["未来", "选择", "方向", "以后", "人生", "长期"],
    身份感: ["自己", "价值", "证明", "身份", "意义", "失败"],
  },
  defense: {
    回避: ["不想碰", "不想打开", "算了", "先不", "拖着", "躲", "逃开"],
    合理化: ["其实", "应该", "按理说", "我知道", "也不是", "没那么"],
    压抑: ["没事", "还好", "忍一忍", "不用说", "算正常"],
    漂移: ["不知道", "说不上", "随便", "空白", "散掉"],
  },
  tensionPairs: [
    {
      label: "认知和行动脱节",
      when: (text) => containsAny(text, ["知道", "明白", "清楚"]) && containsAny(text, ["不想", "拖", "不敢", "躲"]),
    },
    {
      label: "想开始，但被结果感压住",
      when: (text) => containsAny(text, ["开始", "重启", "打开", "动手"]) && containsAny(text, ["怕", "后果", "必须", "持续"]),
    },
    {
      label: "在维持表面平稳，但内部已经过载",
      when: (text) => containsAny(text, ["还好", "没事", "正常"]) && containsAny(text, ["累", "烦", "撑", "压"]),
    },
    {
      label: "想表达，但又在主动收回",
      when: (text) => containsAny(text, ["想说", "想写", "其实"]) && containsAny(text, ["算了", "删掉", "忍着"]),
    },
  ],
};

const RetentionSniper = {
  check() {
    const lastActive = window.localStorage.getItem(LAST_ACTIVE_KEY);
    if (!lastActive) return null;

    const hoursSince = (Date.now() - Number.parseInt(lastActive, 10)) / (1000 * 60 * 60);

    if (hoursSince > 96) {
      return "你有几天没来了，上次写下的那件事还在这里。";
    }

    if (hoursSince > 48 && state.entries.length > 0) {
      const latest = state.entries[0];
      const latestQuestion = latest.analysis?.response?.question;
      if (latestQuestion) {
        return `上次的问题还在：${latestQuestion}`;
      }
    }

    return null;
  },
  updateActivity() {
    window.localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
  },
};

const db = {
  instance: null,
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 3);
      request.onupgradeneeded = (event) => {
        const database = event.target.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
          database.createObjectStore(SETTINGS_STORE);
        }
      };
      request.onsuccess = (event) => {
        this.instance = event.target.result;
        resolve();
      };
      request.onerror = (event) => reject(event);
    });
  },
  async getAll() {
    if (!this.instance) return [];
    const tx = this.instance.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => {
        resolve(request.result.sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp)));
      };
    });
  },
  async put(entry) {
    if (!this.instance) return;
    const tx = this.instance.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(entry);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  },
  async delete(id) {
    if (!this.instance) return;
    const tx = this.instance.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  },
  async getSetting(key) {
    if (!this.instance) return null;
    const tx = this.instance.transaction(SETTINGS_STORE, "readonly");
    const request = tx.objectStore(SETTINGS_STORE).get(key);
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => resolve(null);
    });
  },
  async setSetting(key, value) {
    if (!this.instance) return;
    const tx = this.instance.transaction(SETTINGS_STORE, "readwrite");
    tx.objectStore(SETTINGS_STORE).put(value, key);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
    });
  },
};

function bytesToBase64(bytes) {
  return window.btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(base64) {
  return Uint8Array.from(window.atob(base64), (char) => char.charCodeAt(0));
}

function createPlainEntryShape(entry) {
  return {
    id: entry.id || `mem-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    content: typeof entry.content === "string" ? entry.content : "",
    timestamp: entry.timestamp || new Date().toISOString(),
    context: {
      durationSec: Number.isFinite(entry.context?.durationSec) ? entry.context.durationSec : 0,
      friction: Number.isFinite(entry.context?.friction) ? entry.context.friction : 0,
      timePhase: entry.context?.timePhase || resolveTimePhase(new Date(entry.timestamp || Date.now())),
    },
    tags: {
      emotion: entry.tags?.emotion || null,
      keywords: Array.isArray(entry.tags?.keywords) ? entry.tags.keywords : [],
    },
    system: {
      weight: Number.isFinite(entry.system?.weight) ? entry.system.weight : 0,
      echo: entry.system?.echo || null,
      echoLevel: entry.system?.echoLevel || null,
      echoType: entry.system?.echoType || null,
      flashback: entry.system?.flashback || null,
    },
    metadata: entry.metadata || null,
    analysis: entry.analysis || null,
  };
}

async function ensureEncryptionSalt() {
  let salt = window.localStorage.getItem(ENCRYPTION_SALT_KEY);
  if (salt) return base64ToBytes(salt);

  const bytes = window.crypto.getRandomValues(new Uint8Array(16));
  window.localStorage.setItem(ENCRYPTION_SALT_KEY, bytesToBase64(bytes));
  return bytes;
}

async function deriveSessionKey(pin) {
  if (!(window.crypto && window.crypto.subtle)) return null;
  const salt = await ensureEncryptionSalt();
  const material = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 120000,
      hash: "SHA-256",
    },
    material,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptEntryRecord(entry) {
  if (!state.pinEnabled || !sessionKey || !(window.crypto && window.crypto.subtle)) {
    const plain = createPlainEntryShape(entry);
    delete plain.encrypted;
    delete plain.secure;
    return plain;
  }

  const plain = createPlainEntryShape(entry);
  const sensitivePayload = {
    content: plain.content,
    tags: plain.tags,
    metadata: plain.metadata,
    analysis: plain.analysis,
    system: {
      echo: plain.system.echo,
      echoLevel: plain.system.echoLevel,
      echoType: plain.system.echoType,
      flashback: plain.system.flashback || null,
    },
  };
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(sensitivePayload));
  const cipherBuffer = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, sessionKey, encoded);

  return {
    id: plain.id,
    timestamp: plain.timestamp,
    context: plain.context,
    encrypted: true,
    secure: {
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(cipherBuffer)),
      version: 1,
    },
  };
}

async function decryptEntryRecord(entry) {
  if (!entry?.encrypted || !entry.secure?.ciphertext || !entry.secure?.iv) {
    return createPlainEntryShape(entry);
  }

  if (!sessionKey || !(window.crypto && window.crypto.subtle)) {
    return createPlainEntryShape({
      ...entry,
      content: "[已加密内容]",
      tags: { emotion: null, keywords: [] },
      metadata: entry.metadata || null,
      analysis: null,
      system: { ...(entry.system || {}), echo: null, flashback: null },
    });
  }

  try {
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToBytes(entry.secure.iv) },
      sessionKey,
      base64ToBytes(entry.secure.ciphertext),
    );
    const payload = JSON.parse(new TextDecoder().decode(decrypted));
    return createPlainEntryShape({
      ...entry,
      content: payload.content,
      tags: payload.tags,
      metadata: payload.metadata,
      analysis: payload.analysis,
      system: {
        ...(entry.system || {}),
        ...(payload.system || {}),
      },
    });
  } catch {
    return createPlainEntryShape({
      ...entry,
      content: "[解密失败]",
      tags: { emotion: null, keywords: [] },
      metadata: entry.metadata || null,
      analysis: null,
      system: { ...(entry.system || {}), echo: null, flashback: null },
    });
  }
}

async function saveEntryRecord(entry, options = {}) {
  const record = options.forcePlain ? createPlainEntryShape(entry) : await encryptEntryRecord(entry);
  await db.put(record);
}

async function migrateEntriesEncryptionMode(forcePlain = false) {
  if (!state.entries.length) return;
  for (const entry of state.entries) {
    await saveEntryRecord(entry, { forcePlain });
  }
}

async function hydrateStoredEntries(records) {
  const hydrated = [];
  for (const record of records) {
    hydrated.push(await decryptEntryRecord(record));
  }
  return normalizeEntries(hydrated);
}

async function connectVaultFolder() {
  if (!window.showDirectoryPicker) {
    setStatusMessage("当前浏览器不支持保险库", 1600);
    return;
  }

  try {
    const handle = await window.showDirectoryPicker({ id: "trace-vault", mode: "readwrite" });
    await db.setSetting(VAULT_HANDLE_KEY, handle);
    syncVaultButton(true);
    setStatusMessage("保险库已连接", 1600);
  } catch {
    setStatusMessage("未连接保险库", 1200);
  }
}

async function writeEntryToVault(entry) {
  const handle = await db.getSetting(VAULT_HANDLE_KEY);
  if (!handle) return;

  try {
    const currentPermission = await handle.queryPermission?.({ mode: "readwrite" });
    const permission = currentPermission === "granted"
      ? currentPermission
      : await handle.requestPermission?.({ mode: "readwrite" });

    if (permission !== "granted") return;

    const fileName = `${entry.timestamp.slice(0, 19).replace(/[:T]/g, "-")}-${entry.id}.md`;
    const fileHandle = await handle.getFileHandle(fileName, { create: true });
    const writer = await fileHandle.createWritable();
    const lines = [
      `# ${new Date(entry.timestamp).toLocaleString("zh-CN")}`,
      "",
      entry.content || "",
      "",
      `- 锚点: ${entry.metadata?.anchor || "未标记"}`,
      `- 时间相位: ${entry.context?.timePhase || "未知"}`,
      `- 摩擦: ${entry.context?.friction || 0}`,
    ];
    await writer.write(lines.join("\n"));
    await writer.close();
  } catch {
    // keep silent
  }
}

async function syncVaultButton(connected) {
  if (!elements.vaultToggleBtn) return;

  let resolved = connected;
  if (typeof resolved !== "boolean") {
    resolved = Boolean(await db.getSetting(VAULT_HANDLE_KEY));
  }

  elements.vaultToggleBtn.textContent = resolved ? "保险库已连" : "保险库";
}

function persistSystemState() {
  window.localStorage.setItem(
    SYSTEM_STATE_KEY,
    JSON.stringify({
      echoChain: state.echoChain,
      pendingEcho: state.pendingEcho,
      lastEchoText: state.lastEchoText,
      echoCooldownUntil: state.echoCooldownUntil,
    }),
  );
}

function loadSystemState() {
  const raw = window.localStorage.getItem(SYSTEM_STATE_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw);
    state.echoChain = data.echoChain || {};
    state.pendingEcho = data.pendingEcho || null;
    state.lastEchoText = data.lastEchoText || null;
    state.echoCooldownUntil = data.echoCooldownUntil || 0;
  } catch {
    state.echoChain = {};
    state.pendingEcho = null;
    state.lastEchoText = null;
    state.echoCooldownUntil = 0;
  }
}

function savePredictionState() {
  try {
    window.localStorage.setItem(PREDICTION_STATE_KEY, JSON.stringify(predictionState));
  } catch {
    // keep silent
  }
}

function loadPredictionState() {
  try {
    const raw = window.localStorage.getItem(PREDICTION_STATE_KEY);
    if (!raw) return;

    const data = JSON.parse(raw);
    predictionState.lastText = data.lastText || null;
    predictionState.lastUpdate = data.lastUpdate || 0;
  } catch {
    predictionState.lastText = null;
    predictionState.lastUpdate = 0;
  }
}

const OBSERVATION_MODEL_VERSION = 1;

const ObservationLexicon = {
  uncertainty: ["好像", "似乎", "可能", "也许", "说不上", "不知道", "大概", "仿佛", "好像也"],
  negation: ["不", "没", "没有", "不是", "别", "未", "无"],
  selfCorrection: ["其实", "或者", "不对", "不是这个", "更像", "应该说", "算了", "删掉", "改成"],
  contradiction: ["但是", "可是", "却", "又", "明明", "一边", "同时", "一方面", "另一方面"],
  minimization: ["还好", "没什么", "就这样", "也还行", "算正常", "一点点", "没那么", "先这样"],
  avoidance: ["先不", "算了", "躲", "逃", "拖", "以后再说", "不想碰", "不想打开", "跳过", "略过"],
  suppression: ["忍着", "压着", "憋着", "收着", "吞下去", "别说", "不提", "按住", "咽回去"],
  abstraction: ["意义", "状态", "问题", "东西", "那些", "这一切", "感觉", "生活", "方向", "价值", "关系", "事情"],
  concreteness: ["今天", "昨天", "刚才", "早上", "晚上", "地铁", "办公室", "床上", "电话", "消息", "吃饭", "睡觉", "走路", "开会", "回家"],
  intensity: ["很", "太", "特别", "一直", "完全", "根本", "一下子", "反复", "总是", "忽然"],
  isolation: ["一个人", "没人", "不联系", "关起来", "躲起来", "不想见", "不想说", "不回应"],
  entanglement: ["离不开", "总要顾及", "放不下", "纠缠", "牵着", "被拽着", "扯住"],
  rolePressure: ["应该", "必须", "得", "不能", "负责", "体面", "交代", "稳定", "成熟", "懂事", "配得上"],
  comparison: ["别人", "大家", "他们都", "应该像", "比我", "不如", "落后", "跟不上"],
  externalDemand: ["要交", "要做", "要负责", "被要求", "要表现", "要回应", "得撑住", "得稳住"],
  internalDesire: ["我想", "我只想", "其实想", "更想", "希望", "想要", "宁愿", "只想"],
  identityPerformance: ["证明", "配得上", "体面", "像样", "不让人失望", "被看见", "看起来", "应该成为"],
  socialOthers: ["他", "她", "他们", "别人", "大家", "父母", "老板", "同事", "朋友", "家里", "我们"],
  family: ["父母", "家里", "妈妈", "爸爸", "家人", "亲戚"],
  work: ["工作", "上班", "项目", "汇报", "老板", "同事", "邮件", "交付", "任务", "开会"],
  intimacy: ["他", "她", "我们", "关系", "亲密", "喜欢", "爱", "分开", "靠近"],
  desireConflict: ["想", "又不想", "想要", "又怕", "明明", "但是"],
  collapse: ["撑不住", "散掉", "崩", "垮", "空白", "麻木"],
  repair: ["松了", "靠近", "开始", "终于", "动了", "往前", "看见"],
};

function averageNumbers(values) {
  if (!values?.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function medianNumbers(values) {
  if (!values?.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function varianceNumbers(values) {
  if (!values?.length) return 0;
  const avg = averageNumbers(values);
  return averageNumbers(values.map((value) => (value - avg) ** 2));
}

function clamp01(value) {
  return Math.min(Math.max(value, 0), 1);
}

function scoreBand(score) {
  if (score >= 0.75) return "strong";
  if (score >= 0.54) return "medium";
  return "weak";
}

function splitNarrativeUnits(text) {
  const normalized = (text || "").replace(/\r/g, "").trim();
  if (!normalized) return [];
  return normalized
    .split(/[。！？!?；;\n]/)
    .map((unit) => unit.trim())
    .filter(Boolean);
}

function collectMarkerHits(text, markers = []) {
  return markers.filter((marker) => text.includes(marker));
}

function uniqueValues(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function findRepeatedNarrativeFragment(units = []) {
  const normalized = units
    .map((unit) => unit.replace(/\s+/g, "").trim())
    .filter((unit) => unit.length >= 3);
  if (!normalized.length) return { fragment: "", count: 0, ratio: 0 };

  const counts = normalized.reduce((accumulator, unit) => {
    accumulator[unit] = (accumulator[unit] || 0) + 1;
    return accumulator;
  }, {});
  const fragment = Object.keys(counts).reduce((left, right) => (counts[left] >= counts[right] ? left : right));
  const count = counts[fragment] || 0;

  return {
    fragment: count >= 2 ? fragment : "",
    count,
    ratio: count >= 2 ? count / normalized.length : 0,
  };
}

function createObservationSignal({
  key,
  layer,
  score,
  source,
  horizon,
  mode,
  evidence = [],
  note = "",
}) {
  const normalized = clamp01(score);
  if (normalized < 0.34) return null;
  return {
    key,
    layer,
    score: Number(normalized.toFixed(3)),
    strength: scoreBand(normalized),
    source,
    horizon,
    mode,
    evidence: evidence.filter(Boolean).slice(0, 5),
    note,
  };
}

function pushObservationSignal(target, config) {
  const signal = createObservationSignal(config);
  if (signal) target.push(signal);
}

function profileEntryForObservation(entry) {
  const text = (entry?.content || "").trim();
  const units = splitNarrativeUnits(text);
  const charCount = text.replace(/\s+/g, "").length;
  const unitLengths = units.map((unit) => unit.length);
  const avgUnitLength = averageNumbers(unitLengths);
  const repeatedFragment = findRepeatedNarrativeFragment(units);
  const fragmentRatio = units.length
    ? units.filter((unit) => unit.length <= 10).length / units.length
    : (charCount > 0 && charCount <= 10 ? 1 : 0);

  const uncertaintyHits = collectMarkerHits(text, ObservationLexicon.uncertainty);
  const negationHits = collectMarkerHits(text, ObservationLexicon.negation);
  const selfCorrectionHits = collectMarkerHits(text, ObservationLexicon.selfCorrection);
  const contradictionHits = collectMarkerHits(text, ObservationLexicon.contradiction);
  const minimizationHits = collectMarkerHits(text, ObservationLexicon.minimization);
  const avoidanceHits = collectMarkerHits(text, ObservationLexicon.avoidance);
  const suppressionHits = collectMarkerHits(text, ObservationLexicon.suppression);
  const abstractionHits = collectMarkerHits(text, ObservationLexicon.abstraction);
  const concretenessHits = collectMarkerHits(text, ObservationLexicon.concreteness);
  const intensityHits = collectMarkerHits(text, ObservationLexicon.intensity);
  const rolePressureHits = collectMarkerHits(text, ObservationLexicon.rolePressure);
  const comparisonHits = collectMarkerHits(text, ObservationLexicon.comparison);
  const externalDemandHits = collectMarkerHits(text, ObservationLexicon.externalDemand);
  const internalDesireHits = collectMarkerHits(text, ObservationLexicon.internalDesire);
  const identityPerformanceHits = collectMarkerHits(text, ObservationLexicon.identityPerformance);
  const isolationHits = collectMarkerHits(text, ObservationLexicon.isolation);
  const entanglementHits = collectMarkerHits(text, ObservationLexicon.entanglement);
  const familyHits = collectMarkerHits(text, ObservationLexicon.family);
  const workHits = collectMarkerHits(text, ObservationLexicon.work);
  const intimacyHits = collectMarkerHits(text, ObservationLexicon.intimacy);
  const socialOthersHits = collectMarkerHits(text, ObservationLexicon.socialOthers);
  const unfinishedTail = /[，、,:：\-—～…]$|(?:但是|可是|然后|因为|如果|只是|还是)$/.test(text);
  const coherenceScore = clamp01(
    0.28
      + (concretenessHits.length * 0.12)
      + Math.min(units.length, 4) * 0.05
      + (charCount > 18 ? 0.08 : 0)
      - fragmentRatio * 0.32
      - contradictionHits.length * 0.07
      - uncertaintyHits.length * 0.05,
  );

  return {
    id: entry.id,
    timestampMs: new Date(entry.timestamp).getTime(),
    text,
    units,
    charCount,
    unitCount: units.length,
    avgUnitLength,
    fragmentRatio,
    repeatedFragment,
    unfinishedTail,
    uncertaintyHits,
    negationHits,
    selfCorrectionHits,
    contradictionHits,
    minimizationHits,
    avoidanceHits,
    suppressionHits,
    abstractionHits,
    concretenessHits,
    intensityHits,
    rolePressureHits,
    comparisonHits,
    externalDemandHits,
    internalDesireHits,
    identityPerformanceHits,
    isolationHits,
    entanglementHits,
    familyHits,
    workHits,
    intimacyHits,
    socialOthersHits,
    topics: inferTopics(text, entry),
    defense: inferDefenseSignal(text, entry),
    emotion: detectEmotion(text, entry),
    anchor: entry.metadata?.anchor || "",
    friction: entry.context?.friction || 0,
    durationSec: entry.context?.durationSec || 0,
    timePhase: entry.context?.timePhase || resolveTimePhase(new Date(entry.timestamp || Date.now())),
    coherenceScore,
  };
}

const ObservationEngine = {
  observe(currentEntry, entries, memory) {
    const context = this.createContext(currentEntry, entries, memory);
    const languageForm = this.buildLanguageFormLayer(context);
    const timeBehavior = this.buildTimeBehaviorLayer(context);
    const socialContext = this.buildSocialContextLayer(context);
    const trajectory = this.buildTrajectoryLayer(context, languageForm, timeBehavior, socialContext, memory);
    const psychologicalDynamic = this.buildPsychologicalDynamicLayer(
      context,
      languageForm,
      timeBehavior,
      trajectory,
      socialContext,
      memory,
    );
    const longitudinalMemory = this.buildLongitudinalMemoryLayer(
      context,
      languageForm,
      timeBehavior,
      trajectory,
      socialContext,
      psychologicalDynamic,
      memory,
    );
    const layers = {
      languageForm,
      timeBehavior,
      trajectory,
      psychologicalDynamic,
      socialContext,
      longitudinalMemory,
    };
    const inference = this.buildInference(layers, context);
    const classes = this.buildObservationClasses(layers, inference, context);
    const outputReadiness = this.buildOutputReadiness(layers, inference, classes, context);

    return {
      version: OBSERVATION_MODEL_VERSION,
      createdAt: new Date().toISOString(),
      layers,
      inference,
      classes,
      outputReadiness,
      signalInventory: Object.values(layers).flatMap((layer) => layer.signals || []),
    };
  },

  createContext(currentEntry, entries, memory) {
    const deduped = entries
      .filter(Boolean)
      .reduce((list, entry) => {
        if (list.some((item) => item.id === entry.id)) return list;
        list.push(entry);
        return list;
      }, [])
      .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
    const previousEntries = deduped.filter((entry) => entry.id !== currentEntry.id);
    const currentProfile = profileEntryForObservation(currentEntry);
    const previousProfiles = previousEntries.slice(0, 48).map(profileEntryForObservation);
    const allProfiles = [currentProfile, ...previousProfiles];
    const recentProfiles = allProfiles.slice(0, 8);
    const olderProfiles = allProfiles.slice(8, 16);

    return {
      currentEntry,
      currentProfile,
      allEntries: [currentEntry, ...previousEntries],
      previousEntries,
      allProfiles,
      previousProfiles,
      recentProfiles,
      olderProfiles,
      memory,
      nowMs: new Date(currentEntry.timestamp).getTime(),
    };
  },

  buildLanguageFormLayer(context) {
    const profile = context.currentProfile;
    const signals = [];
    const abstractionBias = clamp01(
      (profile.abstractionHits.length - profile.concretenessHits.length + 2) / 6,
    );
    const contradictionScore = clamp01(
      (profile.contradictionHits.length + (containsAny(profile.text, ["想", "应该"]) && containsAny(profile.text, ["不想", "不敢", "拖"]) ? 1 : 0)) / 3,
    );

    pushObservationSignal(signals, {
      key: "repetition_loop",
      layer: "language_form",
      score: clamp01((profile.repeatedFragment.ratio * 1.4) + (profile.repeatedFragment.count >= 3 ? 0.2 : 0)),
      source: "text",
      horizon: "short",
      mode: "direct",
      evidence: profile.repeatedFragment.fragment ? [profile.repeatedFragment.fragment] : [],
    });
    pushObservationSignal(signals, {
      key: "fragmentation",
      layer: "language_form",
      score: profile.fragmentRatio + (profile.unitCount <= 2 && profile.charCount <= 18 ? 0.2 : 0),
      source: "text",
      horizon: "short",
      mode: "direct",
      evidence: profile.units.slice(0, 3),
    });
    pushObservationSignal(signals, {
      key: "unfinished_syntax",
      layer: "language_form",
      score: profile.unfinishedTail ? 0.74 : 0,
      source: "syntax",
      horizon: "short",
      mode: "direct",
      evidence: [profile.text.slice(-16)],
    });
    pushObservationSignal(signals, {
      key: "uncertainty_markers",
      layer: "language_form",
      score: clamp01(profile.uncertaintyHits.length / 3),
      source: "wording",
      horizon: "short",
      mode: "direct",
      evidence: profile.uncertaintyHits,
    });
    pushObservationSignal(signals, {
      key: "negation_pressure",
      layer: "language_form",
      score: clamp01(profile.negationHits.length / 6),
      source: "wording",
      horizon: "short",
      mode: "direct",
      evidence: profile.negationHits,
    });
    pushObservationSignal(signals, {
      key: "self_correction",
      layer: "language_form",
      score: clamp01(profile.selfCorrectionHits.length / 3),
      source: "wording",
      horizon: "short",
      mode: "direct",
      evidence: profile.selfCorrectionHits,
    });
    pushObservationSignal(signals, {
      key: "contradiction_in_phrasing",
      layer: "language_form",
      score: contradictionScore,
      source: "phrasing",
      horizon: "short",
      mode: "inferred",
      evidence: profile.contradictionHits,
    });
    pushObservationSignal(signals, {
      key: "intensity_spike",
      layer: "language_form",
      score: clamp01(profile.intensityHits.length / 4),
      source: "wording",
      horizon: "short",
      mode: "direct",
      evidence: profile.intensityHits,
    });
    pushObservationSignal(signals, {
      key: "minimization_language",
      layer: "language_form",
      score: clamp01((profile.minimizationHits.length + (profile.emotion === "平静" && profile.friction >= 8 ? 1 : 0)) / 3),
      source: "wording",
      horizon: "short",
      mode: "inferred",
      evidence: profile.minimizationHits,
    });
    pushObservationSignal(signals, {
      key: "avoidance_language",
      layer: "language_form",
      score: clamp01((profile.avoidanceHits.length + (profile.defense === "回避" ? 1 : 0)) / 3),
      source: "wording",
      horizon: "short",
      mode: "inferred",
      evidence: profile.avoidanceHits,
    });
    pushObservationSignal(signals, {
      key: "suppression_language",
      layer: "language_form",
      score: clamp01((profile.suppressionHits.length + profile.minimizationHits.length * 0.5) / 3),
      source: "wording",
      horizon: "short",
      mode: "inferred",
      evidence: [...profile.suppressionHits, ...profile.minimizationHits].slice(0, 4),
    });
    pushObservationSignal(signals, {
      key: "abstraction_bias",
      layer: "language_form",
      score: abstractionBias,
      source: "wording",
      horizon: "short",
      mode: "inferred",
      evidence: profile.abstractionHits,
    });
    pushObservationSignal(signals, {
      key: "concrete_grounding",
      layer: "language_form",
      score: clamp01(profile.concretenessHits.length / 4),
      source: "wording",
      horizon: "short",
      mode: "direct",
      evidence: profile.concretenessHits,
    });

    return {
      metrics: {
        charCount: profile.charCount,
        sentenceCount: Math.max(profile.unitCount, profile.text ? 1 : 0),
        avgSentenceLength: Number(profile.avgUnitLength.toFixed(2)),
        fragmentRatio: Number(profile.fragmentRatio.toFixed(3)),
        repetitionRatio: Number(profile.repeatedFragment.ratio.toFixed(3)),
        unfinishedTail: profile.unfinishedTail,
        coherenceScore: Number(profile.coherenceScore.toFixed(3)),
      },
      dominantFeatures: {
        surfaceEmotion: profile.emotion,
        dominantTopic: profile.topics[0] || "",
        dominantDefense: profile.defense,
        abstractionBias: Number(abstractionBias.toFixed(3)),
      },
      signals,
    };
  },

  buildTimeBehaviorLayer(context) {
    const signals = [];
    const profiles = context.allProfiles;
    const gapsHours = [];

    for (let index = 0; index < profiles.length - 1; index += 1) {
      gapsHours.push((profiles[index].timestampMs - profiles[index + 1].timestampMs) / (1000 * 60 * 60));
    }

    const gapToPrevious = gapsHours[0] || 0;
    const medianGap = medianNumbers(gapsHours);
    const avgGap = averageNumbers(gapsHours);
    const maxGap = Math.max(...gapsHours, 0);
    const burst24hCount = profiles.filter((profile) => context.nowMs - profile.timestampMs <= 24 * 60 * 60 * 1000).length;
    const recentBurstBeforeCurrent = context.previousProfiles
      .slice(0, 4)
      .filter((profile) => context.nowMs - profile.timestampMs <= 24 * 60 * 60 * 1000).length;
    const irregularity = avgGap > 0 ? Math.sqrt(varianceNumbers(gapsHours)) / avgGap : 0;
    const currentTimePhase = context.currentProfile.timePhase;
    const samePhaseCount = profiles.slice(0, 12).filter((profile) => profile.timePhase === currentTimePhase).length;
    const gapBuckets = gapsHours.map((gap) => Math.round(gap / 12) * 12).filter((gap) => gap > 0);
    const recurringGap = findMostFrequent(gapBuckets) || null;

    pushObservationSignal(signals, {
      key: "sudden_stop",
      layer: "time_behavior",
      score: gapToPrevious >= 36 && recentBurstBeforeCurrent >= 2
        ? clamp01((gapToPrevious / 96) + (recentBurstBeforeCurrent / 6))
        : 0,
      source: "timestamp",
      horizon: "mid",
      mode: "inferred",
      evidence: [`gap:${gapToPrevious.toFixed(1)}h`, `burst:${recentBurstBeforeCurrent}`],
    });
    pushObservationSignal(signals, {
      key: "silence_gap",
      layer: "time_behavior",
      score: gapToPrevious > 0 ? clamp01(Math.max(gapToPrevious / Math.max(medianGap || 24, 24), gapToPrevious / 96) / 2.2) : 0,
      source: "timestamp",
      horizon: "mid",
      mode: "direct",
      evidence: gapToPrevious ? [`gap:${gapToPrevious.toFixed(1)}h`] : [],
    });
    pushObservationSignal(signals, {
      key: "burst_writing",
      layer: "time_behavior",
      score: clamp01((burst24hCount - 1) / 4),
      source: "timestamp",
      horizon: "mid",
      mode: "direct",
      evidence: burst24hCount ? [`24h:${burst24hCount}`] : [],
    });
    pushObservationSignal(signals, {
      key: "irregular_rhythm",
      layer: "time_behavior",
      score: clamp01(irregularity / 1.4),
      source: "timestamp",
      horizon: "long",
      mode: "inferred",
      evidence: irregularity ? [`cv:${irregularity.toFixed(2)}`] : [],
    });
    pushObservationSignal(signals, {
      key: "time_phase_return",
      layer: "time_behavior",
      score: clamp01((samePhaseCount - 1) / 4),
      source: "timestamp",
      horizon: "long",
      mode: "inferred",
      evidence: currentTimePhase ? [`phase:${currentTimePhase}`, `count:${samePhaseCount}`] : [],
    });
    pushObservationSignal(signals, {
      key: "recurrence_cycle",
      layer: "time_behavior",
      score: recurringGap && gapBuckets.filter((gap) => gap === recurringGap).length >= 3
        ? clamp01(gapBuckets.filter((gap) => gap === recurringGap).length / 5)
        : 0,
      source: "timestamp",
      horizon: "long",
      mode: "inferred",
      evidence: recurringGap ? [`cycle:${recurringGap}h`] : [],
    });
    pushObservationSignal(signals, {
      key: "return_after_gap",
      layer: "time_behavior",
      score: gapToPrevious >= 48 && context.currentProfile.topics.some((topic) =>
        context.previousProfiles.slice(0, 12).some((profile) => profile.topics.includes(topic)),
      )
        ? clamp01(gapToPrevious / 120)
        : 0,
      source: "timestamp+topic",
      horizon: "mid",
      mode: "inferred",
      evidence: context.currentProfile.topics.slice(0, 2),
    });

    return {
      metrics: {
        gapToPreviousHours: Number(gapToPrevious.toFixed(2)),
        medianGapHours: Number(medianGap.toFixed(2)),
        averageGapHours: Number(avgGap.toFixed(2)),
        maxGapHours: Number(maxGap.toFixed(2)),
        burst24hCount,
        irregularity: Number(irregularity.toFixed(3)),
        samePhaseCount,
        recurringGapHours: recurringGap || 0,
      },
      signals,
    };
  },

  buildSocialContextLayer(context) {
    const profile = context.currentProfile;
    const signals = [];
    const demandVsDesireGap = Math.max(
      0,
      profile.rolePressureHits.length + profile.externalDemandHits.length - profile.internalDesireHits.length,
    );

    pushObservationSignal(signals, {
      key: "family_context",
      layer: "social_context",
      score: clamp01(profile.familyHits.length / 3),
      source: "wording",
      horizon: "mid",
      mode: "direct",
      evidence: profile.familyHits,
    });
    pushObservationSignal(signals, {
      key: "work_context",
      layer: "social_context",
      score: clamp01(profile.workHits.length / 4),
      source: "wording",
      horizon: "mid",
      mode: "direct",
      evidence: profile.workHits,
    });
    pushObservationSignal(signals, {
      key: "intimacy_context",
      layer: "social_context",
      score: clamp01(profile.intimacyHits.length / 4),
      source: "wording",
      horizon: "mid",
      mode: "direct",
      evidence: profile.intimacyHits,
    });
    pushObservationSignal(signals, {
      key: "role_pressure",
      layer: "social_context",
      score: clamp01((profile.rolePressureHits.length + profile.externalDemandHits.length * 0.8) / 4),
      source: "wording",
      horizon: "short",
      mode: "direct",
      evidence: [...profile.rolePressureHits, ...profile.externalDemandHits].slice(0, 4),
    });
    pushObservationSignal(signals, {
      key: "social_comparison",
      layer: "social_context",
      score: clamp01(profile.comparisonHits.length / 3),
      source: "wording",
      horizon: "short",
      mode: "direct",
      evidence: profile.comparisonHits,
    });
    pushObservationSignal(signals, {
      key: "isolation_pull",
      layer: "social_context",
      score: clamp01((profile.isolationHits.length + (profile.socialOthersHits.length === 0 && profile.charCount > 0 ? 0.8 : 0)) / 3),
      source: "wording",
      horizon: "mid",
      mode: "inferred",
      evidence: profile.isolationHits,
    });
    pushObservationSignal(signals, {
      key: "entanglement_pressure",
      layer: "social_context",
      score: clamp01((profile.entanglementHits.length + (profile.socialOthersHits.length >= 3 ? 1 : 0)) / 3),
      source: "wording",
      horizon: "mid",
      mode: "inferred",
      evidence: [...profile.entanglementHits, ...profile.socialOthersHits].slice(0, 4),
    });
    pushObservationSignal(signals, {
      key: "demand_vs_desire_gap",
      layer: "social_context",
      score: clamp01(demandVsDesireGap / 4),
      source: "wording",
      horizon: "short",
      mode: "inferred",
      evidence: [...profile.externalDemandHits, ...profile.internalDesireHits].slice(0, 4),
    });
    pushObservationSignal(signals, {
      key: "identity_performance_pressure",
      layer: "social_context",
      score: clamp01(profile.identityPerformanceHits.length / 3),
      source: "wording",
      horizon: "mid",
      mode: "inferred",
      evidence: profile.identityPerformanceHits,
    });

    return {
      metrics: {
        othersRefCount: profile.socialOthersHits.length,
        familyCount: profile.familyHits.length,
        workCount: profile.workHits.length,
        intimacyCount: profile.intimacyHits.length,
        desireCount: profile.internalDesireHits.length,
        demandCount: profile.externalDemandHits.length + profile.rolePressureHits.length,
      },
      domains: {
        family: profile.familyHits.length > 0,
        work: profile.workHits.length > 0,
        intimacy: profile.intimacyHits.length > 0,
      },
      signals,
    };
  },

  buildTrajectoryLayer(context, languageForm, timeBehavior, socialContext, memory) {
    const signals = [];
    const recent = context.recentProfiles;
    const older = context.olderProfiles.length ? context.olderProfiles : context.previousProfiles.slice(4, 8);
    const recentLength = averageNumbers(recent.map((profile) => profile.charCount));
    const olderLength = averageNumbers(older.map((profile) => profile.charCount));
    const recentCoherence = averageNumbers(recent.map((profile) => profile.coherenceScore));
    const olderCoherence = averageNumbers(older.map((profile) => profile.coherenceScore));
    const recentAvoidance = averageNumbers(recent.map((profile) => profile.avoidanceHits.length + profile.minimizationHits.length * 0.5));
    const olderAvoidance = averageNumbers(older.map((profile) => profile.avoidanceHits.length + profile.minimizationHits.length * 0.5));
    const recentFriction = averageNumbers(recent.map((profile) => profile.friction));
    const olderFriction = averageNumbers(older.map((profile) => profile.friction));
    const recentTopics = recent.flatMap((profile) => profile.topics);
    const topRecentTopic = findMostFrequent(recentTopics);
    const loopCount = topRecentTopic ? recentTopics.filter((topic) => topic === topRecentTopic).length : 0;
    const uniqueRecentTopics = uniqueValues(recentTopics);

    const contractionScore = olderLength > 0 && recentLength < olderLength * 0.72
      ? clamp01((olderLength - recentLength) / Math.max(olderLength, 1))
      : 0;
    const expansionScore = olderLength > 0 && recentLength > olderLength * 1.22
      ? clamp01((recentLength - olderLength) / Math.max(recentLength, 1))
      : 0;
    const scatteringScore = clamp01(
      (languageForm.metrics.fragmentRatio * 0.5)
      + ((1 - languageForm.metrics.coherenceScore) * 0.5),
    );
    const releaseScore = clamp01(
      ((olderAvoidance - recentAvoidance) * 0.18)
      + ((recentCoherence - olderCoherence) * 0.8)
      + ((olderFriction - recentFriction) * 0.06)
      + (context.currentProfile.anchor === "澄明" ? 0.25 : 0),
    );

    pushObservationSignal(signals, {
      key: "contraction",
      layer: "trajectory",
      score: contractionScore,
      source: "cross_entry",
      horizon: "mid",
      mode: "inferred",
      evidence: [`recent:${recentLength.toFixed(1)}`, `older:${olderLength.toFixed(1)}`],
    });
    pushObservationSignal(signals, {
      key: "expansion",
      layer: "trajectory",
      score: expansionScore,
      source: "cross_entry",
      horizon: "mid",
      mode: "inferred",
      evidence: [`recent:${recentLength.toFixed(1)}`, `older:${olderLength.toFixed(1)}`],
    });
    pushObservationSignal(signals, {
      key: "stabilization",
      layer: "trajectory",
      score: clamp01((recentCoherence - olderCoherence + 0.4) / 1.1),
      source: "cross_entry",
      horizon: "mid",
      mode: "inferred",
      evidence: [`coherence:${recentCoherence.toFixed(2)}`],
    });
    pushObservationSignal(signals, {
      key: "fluctuation",
      layer: "trajectory",
      score: clamp01((Math.sqrt(varianceNumbers(recent.map((profile) => profile.friction))) / 4) + timeBehavior.metrics.irregularity * 0.4),
      source: "cross_entry",
      horizon: "mid",
      mode: "inferred",
      evidence: [`irregular:${timeBehavior.metrics.irregularity}`],
    });
    pushObservationSignal(signals, {
      key: "looping",
      layer: "trajectory",
      score: clamp01(((loopCount - 1) / 4) + (memory.openLoops.length ? 0.24 : 0)),
      source: "topic+memory",
      horizon: "long",
      mode: "inferred",
      evidence: topRecentTopic ? [topRecentTopic] : [],
    });
    pushObservationSignal(signals, {
      key: "movement",
      layer: "trajectory",
      score: clamp01((releaseScore * 0.6) + (uniqueRecentTopics.length >= 4 ? 0.18 : 0)),
      source: "cross_entry",
      horizon: "mid",
      mode: "inferred",
      evidence: uniqueRecentTopics.slice(0, 4),
    });
    pushObservationSignal(signals, {
      key: "avoidance_bias",
      layer: "trajectory",
      score: clamp01((recentAvoidance - olderAvoidance + 1.2) / 3.2),
      source: "cross_entry",
      horizon: "mid",
      mode: "inferred",
      evidence: context.currentProfile.avoidanceHits,
    });
    pushObservationSignal(signals, {
      key: "confrontation_shift",
      layer: "trajectory",
      score: clamp01((releaseScore * 0.7) + (context.currentProfile.concretenessHits.length / 5)),
      source: "cross_entry",
      horizon: "mid",
      mode: "inferred",
      evidence: context.currentProfile.concretenessHits,
    });
    pushObservationSignal(signals, {
      key: "collapse_motion",
      layer: "trajectory",
      score: clamp01(
        (scatteringScore * 0.55)
        + ((recentFriction >= 10 ? 0.22 : 0))
        + (context.currentProfile.anchor === "沉缩" ? 0.2 : 0),
      ),
      source: "cross_entry",
      horizon: "mid",
      mode: "inferred",
      evidence: [context.currentProfile.anchor, `friction:${recentFriction.toFixed(1)}`],
    });
    pushObservationSignal(signals, {
      key: "recovery_motion",
      layer: "trajectory",
      score: releaseScore,
      source: "cross_entry",
      horizon: "mid",
      mode: "inferred",
      evidence: [context.currentProfile.anchor, `coherence:${recentCoherence.toFixed(2)}`],
    });
    pushObservationSignal(signals, {
      key: "compression",
      layer: "trajectory",
      score: clamp01((contractionScore * 0.55) + (recentFriction >= 8 ? 0.24 : 0) + (languageForm.metrics.coherenceScore >= 0.52 ? 0.12 : 0)),
      source: "cross_entry",
      horizon: "mid",
      mode: "inferred",
      evidence: [`friction:${recentFriction.toFixed(1)}`],
    });
    pushObservationSignal(signals, {
      key: "release",
      layer: "trajectory",
      score: releaseScore,
      source: "cross_entry",
      horizon: "mid",
      mode: "inferred",
      evidence: [context.currentProfile.anchor],
    });

    return {
      axes: {
        contractionVsExpansion: Number((expansionScore - contractionScore).toFixed(3)),
        stabilizationVsFluctuation: Number((recentCoherence - Math.sqrt(varianceNumbers(recent.map((profile) => profile.coherenceScore)))).toFixed(3)),
        loopingVsMovement: Number((((loopCount - 1) / 4) - releaseScore).toFixed(3)),
        avoidanceVsConfrontation: Number((recentAvoidance - releaseScore).toFixed(3)),
        collapseVsRecovery: Number((((signals.find((signal) => signal.key === "collapse_motion")?.score || 0) - releaseScore)).toFixed(3)),
        coherenceVsScattering: Number((languageForm.metrics.coherenceScore - scatteringScore).toFixed(3)),
        compressionVsRelease: Number(((signals.find((signal) => signal.key === "compression")?.score || 0) - releaseScore).toFixed(3)),
      },
      signals,
    };
  },

  buildPsychologicalDynamicLayer(context, languageForm, timeBehavior, trajectory, socialContext, memory) {
    const profile = context.currentProfile;
    const signals = [];
    const saidAvoidedScore = clamp01(
      (languageForm.metrics.fragmentRatio * 0.22)
      + (profile.avoidanceHits.length * 0.16)
      + (profile.minimizationHits.length * 0.14)
      + (profile.unfinishedTail ? 0.22 : 0)
      + (profile.friction >= 8 ? 0.18 : 0),
    );
    const suppressionScore = clamp01(
      (profile.suppressionHits.length * 0.22)
      + (profile.minimizationHits.length * 0.16)
      + (profile.emotion === "平静" && profile.friction >= 8 ? 0.24 : 0)
      + (profile.charCount <= 24 && profile.friction >= 8 ? 0.16 : 0),
    );
    const ruminationScore = clamp01(
      ((trajectory.signals.find((signal) => signal.key === "looping")?.score || 0) * 0.55)
      + (memory.openLoops.length ? 0.24 : 0)
      + (timeBehavior.signals.find((signal) => signal.key === "time_phase_return")?.score || 0) * 0.18,
    );
    const dissonanceScore = clamp01(
      (languageForm.signals.find((signal) => signal.key === "contradiction_in_phrasing")?.score || 0) * 0.52
      + (socialContext.signals.find((signal) => signal.key === "demand_vs_desire_gap")?.score || 0) * 0.34
      + (containsAny(profile.text, ["知道", "明白", "清楚"]) && containsAny(profile.text, ["不想", "不敢", "拖"]) ? 0.24 : 0),
    );
    const rationalizationScore = clamp01(
      (profile.defense === "合理化" ? 0.48 : 0)
      + (profile.selfCorrectionHits.length * 0.1)
      + (containsAny(profile.text, ["按理说", "其实", "我知道"]) ? 0.2 : 0),
    );
    const displacementScore = clamp01(
      ((socialContext.metrics.workCount + socialContext.metrics.familyCount + socialContext.metrics.intimacyCount) > 0 ? 0.18 : 0)
      + (profile.emotion === "平静" && profile.friction >= 8 ? 0.26 : 0)
      + (languageForm.dominantFeatures.abstractionBias * 0.36),
    );
    const unfinishedConflictScore = clamp01(
      (saidAvoidedScore * 0.44)
      + (dissonanceScore * 0.34)
      + (memory.openLoops.length ? 0.18 : 0),
    );
    const selfProtectionScore = clamp01(
      (suppressionScore * 0.42)
      + (profile.avoidanceHits.length ? 0.18 : 0)
      + (profile.defense === "回避" ? 0.22 : 0),
    );
    const fragmentationScore = clamp01(
      (languageForm.signals.find((signal) => signal.key === "fragmentation")?.score || 0) * 0.44
      + (languageForm.signals.find((signal) => signal.key === "contradiction_in_phrasing")?.score || 0) * 0.26
      + (trajectory.signals.find((signal) => signal.key === "collapse_motion")?.score || 0) * 0.22,
    );
    const integrationScore = clamp01(
      (trajectory.signals.find((signal) => signal.key === "recovery_motion")?.score || 0) * 0.42
      + (trajectory.signals.find((signal) => signal.key === "confrontation_shift")?.score || 0) * 0.22
      + (profile.anchor === "澄明" ? 0.18 : 0)
      + (languageForm.metrics.coherenceScore * 0.18),
    );

    pushObservationSignal(signals, {
      key: "said_avoided_tension",
      layer: "psychological_dynamic",
      score: saidAvoidedScore,
      source: "language+behavior",
      horizon: "short",
      mode: "inferred",
      evidence: [...profile.avoidanceHits, ...profile.minimizationHits].slice(0, 4),
    });
    pushObservationSignal(signals, {
      key: "suppression_holding_back",
      layer: "psychological_dynamic",
      score: suppressionScore,
      source: "language+behavior",
      horizon: "short",
      mode: "inferred",
      evidence: [...profile.suppressionHits, ...profile.minimizationHits].slice(0, 4),
    });
    pushObservationSignal(signals, {
      key: "rumination_looping",
      layer: "psychological_dynamic",
      score: ruminationScore,
      source: "memory+trajectory",
      horizon: "long",
      mode: "inferred",
      evidence: memory.openLoops.slice(0, 2),
    });
    pushObservationSignal(signals, {
      key: "cognitive_dissonance",
      layer: "psychological_dynamic",
      score: dissonanceScore,
      source: "phrasing+social",
      horizon: "short",
      mode: "inferred",
      evidence: profile.contradictionHits,
    });
    pushObservationSignal(signals, {
      key: "defensive_rationalization",
      layer: "psychological_dynamic",
      score: rationalizationScore,
      source: "phrasing",
      horizon: "short",
      mode: "inferred",
      evidence: profile.selfCorrectionHits,
    });
    pushObservationSignal(signals, {
      key: "emotional_displacement",
      layer: "psychological_dynamic",
      score: displacementScore,
      source: "social+language",
      horizon: "mid",
      mode: "inferred",
      evidence: [...profile.workHits, ...profile.familyHits, ...profile.intimacyHits].slice(0, 4),
    });
    pushObservationSignal(signals, {
      key: "unfinished_internal_conflict",
      layer: "psychological_dynamic",
      score: unfinishedConflictScore,
      source: "memory+language",
      horizon: "mid",
      mode: "inferred",
      evidence: [...profile.contradictionHits, ...memory.openLoops].slice(0, 4),
    });
    pushObservationSignal(signals, {
      key: "self_protection_pattern",
      layer: "psychological_dynamic",
      score: selfProtectionScore,
      source: "language+behavior",
      horizon: "mid",
      mode: "inferred",
      evidence: [profile.defense, ...profile.avoidanceHits].slice(0, 4),
    });
    pushObservationSignal(signals, {
      key: "self_fragmentation",
      layer: "psychological_dynamic",
      score: fragmentationScore,
      source: "trajectory+language",
      horizon: "mid",
      mode: "inferred",
      evidence: [profile.anchor, ...profile.contradictionHits].slice(0, 4),
    });
    pushObservationSignal(signals, {
      key: "integration_attempt",
      layer: "psychological_dynamic",
      score: integrationScore,
      source: "trajectory+language",
      horizon: "mid",
      mode: "inferred",
      evidence: [profile.anchor, ...profile.concretenessHits].slice(0, 4),
    });

    return {
      tensions: {
        saidVsAvoided: Number(saidAvoidedScore.toFixed(3)),
        suppression: Number(suppressionScore.toFixed(3)),
        rumination: Number(ruminationScore.toFixed(3)),
        dissonance: Number(dissonanceScore.toFixed(3)),
      },
      signals,
    };
  },

  buildLongitudinalMemoryLayer(context, languageForm, timeBehavior, trajectory, socialContext, psychologicalDynamic, memory) {
    const signals = [];
    const previousProfiles = context.previousProfiles;
    const allTopics = previousProfiles.flatMap((profile) => profile.topics);
    const repeatedTheme = findMostFrequent(allTopics) || "";
    const repeatedThemeCount = repeatedTheme ? allTopics.filter((topic) => topic === repeatedTheme).length : 0;
    const previousClasses = previousProfiles.flatMap((profile) =>
      (context.previousEntries.find((entry) => entry.id === profile.id)?.analysis?.observation?.classes || []).map((item) => item.key),
    );
    const recurringClass = findMostFrequent(previousClasses) || "";
    const recurringClassCount = recurringClass ? previousClasses.filter((item) => item === recurringClass).length : 0;
    const recentEmotions = previousProfiles.slice(0, 12).map((profile) => profile.emotion).filter(Boolean);
    const emotionalClimate = findMostFrequent(recentEmotions) || "";
    const identityPressureCount = previousProfiles.filter((profile) =>
      profile.topics.includes("身份感") || profile.identityPerformanceHits.length > 0,
    ).length;
    const unresolvedReturnScore = clamp01(
      ((repeatedThemeCount >= 3 ? repeatedThemeCount / 6 : 0) * 0.44)
      + ((psychologicalDynamic.signals.find((signal) => signal.key === "rumination_looping")?.score || 0) * 0.26)
      + ((memory.openLoops.length ? 0.24 : 0)),
    );
    const narrativeDriftScore = clamp01(
      (uniqueValues(context.recentProfiles.flatMap((profile) => profile.topics)).length >= 4 ? 0.24 : 0)
      + (recurringClassCount >= 3 && repeatedThemeCount <= 2 ? 0.34 : 0)
      + ((trajectory.signals.find((signal) => signal.key === "movement")?.score || 0) * 0.16),
    );

    pushObservationSignal(signals, {
      key: "repeated_unresolved_theme",
      layer: "longitudinal_memory",
      score: clamp01(repeatedThemeCount / 6),
      source: "cross_entry",
      horizon: "long",
      mode: "inferred",
      evidence: repeatedTheme ? [repeatedTheme, `count:${repeatedThemeCount}`] : [],
    });
    pushObservationSignal(signals, {
      key: "recurring_tension_structure",
      layer: "longitudinal_memory",
      score: clamp01(recurringClassCount / 6),
      source: "cross_entry",
      horizon: "long",
      mode: "inferred",
      evidence: recurringClass ? [recurringClass, `count:${recurringClassCount}`] : [],
    });
    pushObservationSignal(signals, {
      key: "emotional_climate",
      layer: "longitudinal_memory",
      score: emotionalClimate && emotionalClimate !== "平静" ? clamp01(recentEmotions.filter((emotion) => emotion === emotionalClimate).length / 6) : 0,
      source: "cross_entry",
      horizon: "long",
      mode: "inferred",
      evidence: emotionalClimate ? [emotionalClimate] : [],
    });
    pushObservationSignal(signals, {
      key: "behavioral_cycle",
      layer: "longitudinal_memory",
      score: timeBehavior.signals.find((signal) => signal.key === "recurrence_cycle")?.score || 0,
      source: "timestamp",
      horizon: "long",
      mode: "inferred",
      evidence: timeBehavior.signals.find((signal) => signal.key === "recurrence_cycle")?.evidence || [],
    });
    pushObservationSignal(signals, {
      key: "narrative_drift",
      layer: "longitudinal_memory",
      score: narrativeDriftScore,
      source: "cross_entry",
      horizon: "long",
      mode: "inferred",
      evidence: uniqueValues(context.recentProfiles.flatMap((profile) => profile.topics)).slice(0, 4),
    });
    pushObservationSignal(signals, {
      key: "identity_pattern",
      layer: "longitudinal_memory",
      score: clamp01(identityPressureCount / 6),
      source: "cross_entry",
      horizon: "long",
      mode: "inferred",
      evidence: identityPressureCount ? [`count:${identityPressureCount}`] : [],
    });
    pushObservationSignal(signals, {
      key: "unresolved_return",
      layer: "longitudinal_memory",
      score: unresolvedReturnScore,
      source: "cross_entry",
      horizon: "long",
      mode: "inferred",
      evidence: [...memory.openLoops, repeatedTheme].filter(Boolean).slice(0, 4),
    });

    return {
      patterns: {
        repeatedTheme,
        recurringClass,
        emotionalClimate,
      },
      signals,
    };
  },

  buildInference(layers) {
    const allSignals = Object.values(layers).flatMap((layer) => layer.signals || []);
    const weakSignals = allSignals.filter((signal) => signal.strength === "weak").slice(0, 24);
    const mediumSignals = allSignals.filter((signal) => signal.strength === "medium").slice(0, 24);
    const strongSignals = allSignals.filter((signal) => signal.strength === "strong").slice(0, 24);
    const familyScores = {
      drift: averageNumbers([
        layers.trajectory.signals.find((signal) => signal.key === "fluctuation")?.score || 0,
        layers.trajectory.signals.find((signal) => signal.key === "avoidance_bias")?.score || 0,
        layers.psychologicalDynamic.signals.find((signal) => signal.key === "emotional_displacement")?.score || 0,
      ]),
      looping: averageNumbers([
        layers.trajectory.signals.find((signal) => signal.key === "looping")?.score || 0,
        layers.psychologicalDynamic.signals.find((signal) => signal.key === "rumination_looping")?.score || 0,
        layers.longitudinalMemory.signals.find((signal) => signal.key === "unresolved_return")?.score || 0,
      ]),
      suppression: averageNumbers([
        layers.languageForm.signals.find((signal) => signal.key === "suppression_language")?.score || 0,
        layers.psychologicalDynamic.signals.find((signal) => signal.key === "suppression_holding_back")?.score || 0,
        layers.psychologicalDynamic.signals.find((signal) => signal.key === "self_protection_pattern")?.score || 0,
      ]),
      fragmentation: averageNumbers([
        layers.languageForm.signals.find((signal) => signal.key === "fragmentation")?.score || 0,
        layers.psychologicalDynamic.signals.find((signal) => signal.key === "self_fragmentation")?.score || 0,
        layers.trajectory.signals.find((signal) => signal.key === "collapse_motion")?.score || 0,
      ]),
      rolePressure: averageNumbers([
        layers.socialContext.signals.find((signal) => signal.key === "role_pressure")?.score || 0,
        layers.socialContext.signals.find((signal) => signal.key === "demand_vs_desire_gap")?.score || 0,
        layers.longitudinalMemory.signals.find((signal) => signal.key === "identity_pattern")?.score || 0,
      ]),
      contradiction: averageNumbers([
        layers.languageForm.signals.find((signal) => signal.key === "contradiction_in_phrasing")?.score || 0,
        layers.psychologicalDynamic.signals.find((signal) => signal.key === "cognitive_dissonance")?.score || 0,
        layers.psychologicalDynamic.signals.find((signal) => signal.key === "unfinished_internal_conflict")?.score || 0,
      ]),
      unfinishedConflict: averageNumbers([
        layers.psychologicalDynamic.signals.find((signal) => signal.key === "unfinished_internal_conflict")?.score || 0,
        layers.psychologicalDynamic.signals.find((signal) => signal.key === "cognitive_dissonance")?.score || 0,
        layers.languageForm.signals.find((signal) => signal.key === "unfinished_syntax")?.score || 0,
      ]),
      loosening: averageNumbers([
        layers.trajectory.signals.find((signal) => signal.key === "recovery_motion")?.score || 0,
        layers.psychologicalDynamic.signals.find((signal) => signal.key === "integration_attempt")?.score || 0,
        layers.trajectory.signals.find((signal) => signal.key === "release")?.score || 0,
      ]),
      withdrawal: averageNumbers([
        layers.socialContext.signals.find((signal) => signal.key === "isolation_pull")?.score || 0,
        layers.trajectory.signals.find((signal) => signal.key === "contraction")?.score || 0,
        layers.trajectory.signals.find((signal) => signal.key === "compression")?.score || 0,
      ]),
      compression: averageNumbers([
        layers.trajectory.signals.find((signal) => signal.key === "compression")?.score || 0,
        layers.psychologicalDynamic.signals.find((signal) => signal.key === "suppression_holding_back")?.score || 0,
        layers.languageForm.signals.find((signal) => signal.key === "minimization_language")?.score || 0,
      ]),
    };

    const convergingSignals = Object.entries(familyScores)
      .filter(([, score]) => score >= 0.48)
      .map(([key, score]) => ({
        key,
        score: Number(score.toFixed(3)),
        strength: scoreBand(score),
      }))
      .sort((left, right) => right.score - left.score);

    const strongPatterns = convergingSignals.filter((signal) => signal.score >= 0.72);
    const topScore = convergingSignals[0]?.score || 0;

    return {
      weakSignals,
      mediumSignals,
      convergingSignals,
      strongPatterns,
      confidenceBand: Number(topScore.toFixed(3)),
      silenceRecommended: topScore < 0.48 && mediumSignals.length < 3,
    };
  },

  buildObservationClasses(layers, inference, context) {
    const classes = [];
    const addClass = (key, score, evidence = [], horizon = "mid") => {
      if (score < 0.42) return;
      classes.push({
        key,
        score: Number(score.toFixed(3)),
        strength: scoreBand(score),
        horizon,
        evidence: evidence.filter(Boolean).slice(0, 4),
      });
    };

    const familyScore = (key) => inference.convergingSignals.find((signal) => signal.key === key)?.score || 0;
    addClass("drift", familyScore("drift"), ["fluctuation", "avoidance_bias"]);
    addClass("looping", familyScore("looping"), ["looping", "rumination_looping"], "long");
    addClass("suppression", familyScore("suppression"), ["suppression_language", "suppression_holding_back"]);
    addClass("fragmentation", familyScore("fragmentation"), ["fragmentation", "self_fragmentation"]);
    addClass("over_control", averageNumbers([
      layers.socialContext.signals.find((signal) => signal.key === "role_pressure")?.score || 0,
      layers.psychologicalDynamic.signals.find((signal) => signal.key === "defensive_rationalization")?.score || 0,
    ]), ["role_pressure", "defensive_rationalization"]);
    addClass("collapse_risk", averageNumbers([
      layers.trajectory.signals.find((signal) => signal.key === "collapse_motion")?.score || 0,
      layers.timeBehavior.signals.find((signal) => signal.key === "silence_gap")?.score || 0,
    ]), ["collapse_motion", "silence_gap"]);
    addClass("avoidance", averageNumbers([
      layers.languageForm.signals.find((signal) => signal.key === "avoidance_language")?.score || 0,
      layers.psychologicalDynamic.signals.find((signal) => signal.key === "self_protection_pattern")?.score || 0,
    ]), ["avoidance_language", "self_protection_pattern"]);
    addClass("emotional_compression", familyScore("compression"), ["compression", "quiet_weight"]);
    addClass("identity_strain", averageNumbers([
      layers.socialContext.signals.find((signal) => signal.key === "identity_performance_pressure")?.score || 0,
      layers.longitudinalMemory.signals.find((signal) => signal.key === "identity_pattern")?.score || 0,
    ]), ["identity_performance_pressure", "identity_pattern"], "long");
    addClass("role_pressure", familyScore("rolePressure"), ["role_pressure", "demand_vs_desire_gap"]);
    addClass("unresolved_return", averageNumbers([
      layers.longitudinalMemory.signals.find((signal) => signal.key === "unresolved_return")?.score || 0,
      layers.trajectory.signals.find((signal) => signal.key === "looping")?.score || 0,
    ]), ["unresolved_return", "looping"], "long");
    addClass("unfinished_meaning", averageNumbers([
      layers.psychologicalDynamic.signals.find((signal) => signal.key === "unfinished_internal_conflict")?.score || 0,
      layers.languageForm.signals.find((signal) => signal.key === "unfinished_syntax")?.score || 0,
    ]), ["unfinished_internal_conflict", "unfinished_syntax"]);
    addClass("withdrawal", familyScore("withdrawal"), ["contraction", "isolation_pull"]);
    addClass("self_contradiction", layers.psychologicalDynamic.signals.find((signal) => signal.key === "cognitive_dissonance")?.score || 0, ["cognitive_dissonance"]);
    addClass("tension_accumulation", averageNumbers([
      layers.psychologicalDynamic.signals.find((signal) => signal.key === "unfinished_internal_conflict")?.score || 0,
      layers.longitudinalMemory.signals.find((signal) => signal.key === "repeated_unresolved_theme")?.score || 0,
    ]), ["unfinished_internal_conflict", "repeated_unresolved_theme"], "long");
    addClass("temporary_stabilization", averageNumbers([
      layers.trajectory.signals.find((signal) => signal.key === "stabilization")?.score || 0,
      layers.trajectory.signals.find((signal) => signal.key === "recovery_motion")?.score || 0,
    ]), ["stabilization", "recovery_motion"]);
    addClass("pre_start_loop", averageNumbers([
      layers.psychologicalDynamic.signals.find((signal) => signal.key === "rumination_looping")?.score || 0,
      layers.longitudinalMemory.signals.find((signal) => signal.key === "unresolved_return")?.score || 0,
      context.currentProfile && containsAny(context.currentProfile.text, ["开始", "准备", "打开"]) ? 0.24 : 0,
    ]), ["rumination_looping", "unresolved_return"]);
    addClass("private_public_split", averageNumbers([
      layers.socialContext.signals.find((signal) => signal.key === "identity_performance_pressure")?.score || 0,
      layers.psychologicalDynamic.signals.find((signal) => signal.key === "suppression_holding_back")?.score || 0,
    ]), ["identity_performance_pressure", "suppression_holding_back"]);
    addClass("displaced_pressure", layers.psychologicalDynamic.signals.find((signal) => signal.key === "emotional_displacement")?.score || 0, ["emotional_displacement"]);
    addClass("fragile_loosening", familyScore("loosening"), ["recovery_motion", "integration_attempt"]);
    addClass("held_back_core", averageNumbers([
      layers.psychologicalDynamic.signals.find((signal) => signal.key === "said_avoided_tension")?.score || 0,
      layers.psychologicalDynamic.signals.find((signal) => signal.key === "suppression_holding_back")?.score || 0,
    ]), ["said_avoided_tension", "suppression_holding_back"]);
    addClass("night_return", averageNumbers([
      layers.timeBehavior.signals.find((signal) => signal.key === "time_phase_return")?.score || 0,
      context.currentProfile.timePhase === "深夜" ? 0.3 : 0,
    ]), ["time_phase_return"], "long");
    addClass("silence_after_activation", averageNumbers([
      layers.timeBehavior.signals.find((signal) => signal.key === "silence_gap")?.score || 0,
      layers.timeBehavior.signals.find((signal) => signal.key === "sudden_stop")?.score || 0,
    ]), ["silence_gap", "sudden_stop"]);
    addClass("burst_release", averageNumbers([
      layers.timeBehavior.signals.find((signal) => signal.key === "burst_writing")?.score || 0,
      layers.trajectory.signals.find((signal) => signal.key === "release")?.score || 0,
    ]), ["burst_writing", "release"]);
    addClass("relational_ambivalence", averageNumbers([
      layers.socialContext.signals.find((signal) => signal.key === "intimacy_context")?.score || 0,
      layers.socialContext.signals.find((signal) => signal.key === "entanglement_pressure")?.score || 0,
      layers.psychologicalDynamic.signals.find((signal) => signal.key === "cognitive_dissonance")?.score || 0,
    ]), ["intimacy_context", "entanglement_pressure", "cognitive_dissonance"]);
    addClass("integration_attempt", layers.psychologicalDynamic.signals.find((signal) => signal.key === "integration_attempt")?.score || 0, ["integration_attempt"]);
    addClass("recovery_direction", averageNumbers([
      layers.trajectory.signals.find((signal) => signal.key === "recovery_motion")?.score || 0,
      layers.trajectory.signals.find((signal) => signal.key === "movement")?.score || 0,
    ]), ["recovery_motion", "movement"]);
    addClass("identity_performance_pressure", averageNumbers([
      layers.socialContext.signals.find((signal) => signal.key === "identity_performance_pressure")?.score || 0,
      layers.socialContext.signals.find((signal) => signal.key === "role_pressure")?.score || 0,
    ]), ["identity_performance_pressure", "role_pressure"], "long");
    addClass("coherence_forming", averageNumbers([
      layers.trajectory.signals.find((signal) => signal.key === "recovery_motion")?.score || 0,
      layers.languageForm.metrics.coherenceScore,
    ]), ["recovery_motion", "coherenceScore"]);
    addClass("coherence_breaking", averageNumbers([
      layers.trajectory.signals.find((signal) => signal.key === "collapse_motion")?.score || 0,
      1 - layers.languageForm.metrics.coherenceScore,
    ]), ["collapse_motion", "fragmentation"]);
    addClass("narrative_drift", layers.longitudinalMemory.signals.find((signal) => signal.key === "narrative_drift")?.score || 0, ["narrative_drift"], "long");
    addClass("recurring_social_pressure", averageNumbers([
      layers.socialContext.signals.find((signal) => signal.key === "role_pressure")?.score || 0,
      layers.longitudinalMemory.signals.find((signal) => signal.key === "identity_pattern")?.score || 0,
    ]), ["role_pressure", "identity_pattern"], "long");

    return classes.sort((left, right) => right.score - left.score);
  },

  buildOutputReadiness(layers, inference, classes) {
    const primary = classes[0] || null;
    const secondary = classes[1] || null;
    const mode = inference.silenceRecommended
      ? "silent"
      : (primary?.score || 0) >= 0.76
        ? "sharp"
        : "soft";

    return {
      echo: {
        mode,
        primaryClass: primary?.key || "",
        secondaryClass: secondary?.key || "",
        shouldSpeak: !inference.silenceRecommended,
        uncertainty: Number((1 - inference.confidenceBand).toFixed(3)),
        familyBias: primary?.key || "",
        toneBias: mode === "sharp" ? "direct" : (primary?.key === "looping" || primary?.key === "unresolved_return" ? "residue" : "soft"),
      },
      continuity: {
        carryForward: Boolean(primary && ["unresolved_return", "pre_start_loop", "tension_accumulation", "identity_strain", "role_pressure"].includes(primary.key)),
        threadClass: primary?.key || "",
        persistence: primary?.horizon || "short",
      },
      history: {
        narrativeAnchor: primary?.key || "",
        structureWeight: layers.longitudinalMemory.patterns.repeatedTheme || primary?.key || "",
        recordEmphasis: secondary?.key || primary?.key || "",
      },
      resurfacing: {
        eligible: Boolean(primary && primary.horizon === "long" && primary.score >= 0.68),
        classKey: primary?.key || "",
        classScore: primary?.score || 0,
        quietWeight: primary?.score ? Number(Math.max(primary.score - 0.12, 0).toFixed(3)) : 0,
      },
    };
  },
};

const AIEngine = {
  createPromptEnvelope(currentEntry, memoryContext, observation) {
    return {
      system_prompt: SYSTEM_PROMPT_V1,
      current_entry: currentEntry.content,
      current_anchor: currentEntry.metadata?.anchor || "",
      recent_entries: memoryContext.shortWindow.map((entry) => entry.content || "[空白记录]"),
      active_patterns: memoryContext.activePatterns,
      open_loops: memoryContext.openLoops,
      signals: currentEntry.context,
      observation_glimpse: {
        primary_class: observation?.outputReadiness?.echo?.primaryClass || "",
        secondary_class: observation?.outputReadiness?.echo?.secondaryClass || "",
        continuity_thread: observation?.outputReadiness?.continuity?.threadClass || "",
      },
    };
  },

  analyze(currentEntry, entries) {
    const memory = MemoryEngine.build(entries, currentEntry);
    const observation = ObservationEngine.observe(currentEntry, entries, memory);
    const promptEnvelope = this.createPromptEnvelope(currentEntry, memory, observation);
    const interpretation = this.interpret(currentEntry, memory, observation);
    const response = this.composeResponse(interpretation, memory, currentEntry);

    return {
      promptEnvelope,
      memory,
      observation,
      interpretation,
      response,
      analyzedAt: new Date().toISOString(),
    };
  },

  interpret(entry, memory, observation) {
    const text = (entry.content || "").trim();
    const surfaceEmotion = observation?.layers?.languageForm?.dominantFeatures?.surfaceEmotion || inferSurfaceEmotion(text, entry);
    const topicEntities = uniqueValues([
      ...inferTopics(text, entry),
      ...(observation?.layers?.longitudinalMemory?.patterns?.repeatedTheme ? [observation.layers.longitudinalMemory.patterns.repeatedTheme] : []),
    ]).slice(0, 3);
    const defenseSignal = inferDefenseSignal(text, entry, observation);
    const coreTension = inferCoreTension(text, entry, memory, observation);
    const patternLink = inferPatternLink(topicEntities, surfaceEmotion, memory, observation);
    const confidence = inferConfidence(entry, surfaceEmotion, coreTension, patternLink, observation);
    const baseInterpretation = {
      surface_emotion: surfaceEmotion,
      defense_signal: defenseSignal,
      topic_entities: topicEntities,
      core_tension: coreTension,
      pattern_link: patternLink,
      confidence,
      observation_primary_class: observation?.outputReadiness?.echo?.primaryClass || "",
      observation_secondary_class: observation?.outputReadiness?.echo?.secondaryClass || "",
      observation_classes: observation?.classes?.slice(0, 6).map((item) => item.key) || [],
      observation_confidence: observation?.inference?.confidenceBand || 0,
    };
    const shouldEcho =
      observation?.outputReadiness?.echo?.mode !== "silent"
      || confidence >= 0.36
      || Boolean(patternLink)
      || Boolean(coreTension);
    const echoFamily = deriveEchoFamily(entry, baseInterpretation, memory);
    const echoTone = deriveEchoTone(entry, baseInterpretation, echoFamily);

    return {
      ...baseInterpretation,
      should_echo: shouldEcho,
      echo_family: echoFamily,
      echo_tone: echoTone,
    };
  },

  composeResponse(interpretation, memory, entry) {
    if (!interpretation.should_echo) {
      return {
        echo: buildFallbackEcho(interpretation, memory, entry),
        question: "",
        pattern_hint: "",
      };
    }

    const echo = buildAnalysisEcho(interpretation, memory, entry);
    const question = shouldAskEchoQuestion(entry, interpretation, memory)
      ? buildAnalysisQuestion(interpretation, memory)
      : "";
    const patternHint =
      !question && interpretation.pattern_link && interpretation.confidence >= 0.66
        ? buildPatternHint(interpretation, memory, entry, echo)
        : "";

    return {
      echo,
      question,
      pattern_hint: patternHint,
    };
  },
};

function buildFallbackEcho(interpretation, memory, entry) {
  const family = interpretation.pattern_link
    ? "circling"
    : interpretation.surface_emotion && interpretation.surface_emotion !== "平静"
      ? "quiet_weight"
      : "trace";

  return generateEchoSentence(entry, interpretation, memory, {
    family,
    tone: family === "trace" ? "soft" : "residue",
  });
}

function normalizeEchoWhitespace(text) {
  return (text || "").replace(/\s+/g, " ").trim();
}

function fingerprintEchoText(text) {
  return normalizeEchoWhitespace(text)
    .replace(/[「」『』【】〔〕（）()，。！？!?,、:：;；….\-\s]/g, "")
    .replace(/最近|这次|这里|那个|一下|已经|还是|有点|总会|正在|一直/g, "");
}

function isDeadGenericEchoText(text) {
  const normalized = normalizeEchoWhitespace(text);
  return DEAD_GENERIC_ECHO_LINES.some((line) => normalizeEchoWhitespace(line) === normalized);
}

function isDeadGenericEchoPayload(payload) {
  if (!payload) return false;
  return [payload.l1, payload.l2, payload.l3].filter(Boolean).some((text) => isDeadGenericEchoText(text));
}

function collectRecentEchoFingerprints(entries = [], excludeId = null, limit = 14) {
  const fingerprints = [];
  const pool = entries.filter((entry) => entry?.id !== excludeId).slice(0, limit);

  pool.forEach((entry) => {
    const texts = [
      entry.analysis?.response?.echo,
      entry.analysis?.response?.pattern_hint,
      entry.system?.echo?.l1,
      entry.system?.echo?.l2,
      entry.system?.echo?.l3,
    ].filter(Boolean);

    texts.forEach((text) => {
      const fingerprint = fingerprintEchoText(text);
      if (fingerprint) fingerprints.push(fingerprint);
    });
  });

  return fingerprints;
}

function echoTooSimilar(text, recentFingerprints) {
  const fingerprint = fingerprintEchoText(text);
  if (!fingerprint) return false;

  return recentFingerprints.some((recent) => {
    if (!recent) return false;
    if (fingerprint.length < 8 || recent.length < 8) {
      return fingerprint === recent;
    }
    return fingerprint === recent || fingerprint.includes(recent) || recent.includes(fingerprint);
  });
}

function toTimePhrase(timePhase) {
  if (timePhase === "深夜") return "深夜";
  if (timePhase === "清晨") return "清晨";
  return "这个时段";
}

function createEchoContext(entry, interpretation = {}, memory = {}, overrides = {}) {
  const topic = overrides.topic || interpretation.topic_entities?.[0] || entry.tags?.keywords?.[0] || "";
  const emotion = overrides.emotion || interpretation.surface_emotion || entry.tags?.emotion || "";
  const anchor = overrides.anchor || entry.metadata?.anchor || "";
  const timePhrase = overrides.timePhrase || toTimePhrase(overrides.timePhase || entry.context?.timePhase);
  const seedSource =
    overrides.seedSource
    || `${entry.id || entry.timestamp || Date.now()}-${topic}-${emotion}-${anchor}-${interpretation.core_tension || ""}`;

  return {
    entry,
    interpretation,
    memory,
    topic,
    emotion,
    anchor,
    topicSpot: topic ? `「${topic}」` : "这里",
    topicMatter: topic ? `「${topic}」这件事` : "这件事",
    emotionPhrase: emotion && emotion !== "平静" ? `「${emotion}」` : "这种感觉",
    timePhrase,
    seed: hashCode(seedSource),
  };
}

function deriveEchoFamily(entry, interpretation, memory) {
  const text = entry.content || "";
  const primaryClass = interpretation.observation_primary_class || interpretation.observation_classes?.[0] || "";

  if (primaryClass === "pre_start_loop") {
    return "pre_start";
  }

  if (["held_back_core", "unfinished_meaning"].includes(primaryClass)) {
    return entry.context?.friction >= 10 ? "almost_said" : "held_back";
  }

  if (["unresolved_return", "looping"].includes(primaryClass)) {
    return interpretation.core_tension ? "stalled_return" : "circling";
  }

  if (primaryClass === "drift") {
    return "drift";
  }

  if (["withdrawal", "emotional_compression"].includes(primaryClass)) {
    return "inward_pull";
  }

  if (["fragile_loosening", "recovery_direction", "integration_attempt", "temporary_stabilization"].includes(primaryClass)) {
    return "loosening";
  }

  if (["identity_strain", "role_pressure", "identity_performance_pressure", "recurring_social_pressure"].includes(primaryClass)) {
    return "quiet_weight";
  }

  if (
    memory.openLoops.length > 0 &&
    containsAny(text, ["开始", "明天", "这次", "还是", "准备", "先"])
  ) {
    return "pre_start";
  }

  if (entry.context?.friction >= 11 && entry.context?.durationSec >= 90) {
    return "almost_said";
  }

  if (interpretation.defense_signal === "回避") {
    return "held_back";
  }

  if (interpretation.pattern_link && interpretation.core_tension) {
    return "stalled_return";
  }

  if (interpretation.pattern_link) {
    return "circling";
  }

  if (entry.metadata?.anchor === "游离") {
    return "drift";
  }

  if (entry.metadata?.anchor === "沉缩") {
    return "inward_pull";
  }

  if (entry.metadata?.anchor === "澄明") {
    return "loosening";
  }

  if (interpretation.surface_emotion && interpretation.surface_emotion !== "平静") {
    return "quiet_weight";
  }

  if (memory.longIdentityMemory[0]) {
    return "circling";
  }

  return "trace";
}

function deriveEchoTone(entry, interpretation, family) {
  const primaryClass = interpretation.observation_primary_class || interpretation.observation_classes?.[0] || "";

  if (["held_back_core", "unfinished_meaning", "self_contradiction"].includes(primaryClass)) {
    return "direct";
  }
  if (["unresolved_return", "looping", "night_return"].includes(primaryClass)) {
    return "residue";
  }
  if (["fragile_loosening", "recovery_direction", "integration_attempt"].includes(primaryClass)) {
    return "movement";
  }
  if (["withdrawal", "emotional_compression", "silence_after_activation"].includes(primaryClass)) {
    return "residue";
  }

  if (family === "pre_start") return "movement";
  if (family === "held_back") return entry.context?.friction >= 10 ? "direct" : "movement";
  if (family === "almost_said") return "movement";
  if (family === "circling") return interpretation.confidence >= 0.58 ? "movement" : "soft";
  if (family === "stalled_return") return "residue";
  if (family === "drift") return "soft";
  if (family === "inward_pull") return "residue";
  if (family === "loosening") return "movement";
  if (family === "quiet_weight") return "residue";
  if (family === "time_return") return "soft";
  return "soft";
}

function buildEchoCandidates(family, preferredTone, context) {
  const familyLibrary = ECHO_LANGUAGE_LIBRARY[family] || ECHO_LANGUAGE_LIBRARY.trace;
  const tones = ECHO_TONE_SEQUENCE[preferredTone] || ECHO_TONE_SEQUENCE.soft;
  const candidates = [];

  tones.forEach((tone) => {
    const templates = familyLibrary[tone] || [];
    templates.forEach((template) => {
      const text = normalizeEchoWhitespace(typeof template === "function" ? template(context) : template);
      if (!text || isDeadGenericEchoText(text)) return;
      candidates.push({ text, tone, family });
    });
  });

  return candidates;
}

function chooseEchoCandidate(candidates, context, recentFingerprints) {
  if (!candidates.length) return "";

  const startIndex = context.seed % candidates.length;
  for (let offset = 0; offset < candidates.length; offset += 1) {
    const candidate = candidates[(startIndex + offset) % candidates.length];
    if (!echoTooSimilar(candidate.text, recentFingerprints)) {
      return candidate.text;
    }
  }

  return candidates[startIndex].text;
}

function generateEchoSentence(entry, interpretation, memory, overrides = {}) {
  const context = createEchoContext(entry, interpretation, memory, overrides);
  const family = overrides.family || deriveEchoFamily(entry, interpretation, memory);
  const tone = overrides.tone || deriveEchoTone(entry, interpretation, family);
  const recentFingerprints =
    overrides.recentFingerprints || collectRecentEchoFingerprints(overrides.entries || state.entries, entry.id);
  const candidates = buildEchoCandidates(family, tone, context);
  return chooseEchoCandidate(candidates, context, recentFingerprints)
    || chooseEchoCandidate(buildEchoCandidates("trace", "soft", context), context, recentFingerprints)
    || "这里还没有完全落下。";
}

function buildPatternHint(interpretation, memory, entry, leadEcho = "") {
  if (!interpretation.pattern_link) return "";

  const family = interpretation.echo_family === "circling" ? "stalled_return" : "circling";
  const recentFingerprints = collectRecentEchoFingerprints(state.entries, entry.id);
  if (leadEcho) recentFingerprints.push(fingerprintEchoText(leadEcho));
  return generateEchoSentence(entry, interpretation, memory, {
    family,
    tone: "residue",
    recentFingerprints,
  });
}

function collectRecentQuestionFingerprints(entries = [], excludeId = null, limit = 5) {
  return entries
    .filter((entry) => entry?.id !== excludeId)
    .slice(0, limit)
    .map((entry) => fingerprintEchoText(entry.analysis?.response?.question || ""))
    .filter(Boolean);
}

function shouldAskEchoQuestion(entry, interpretation, memory) {
  if (interpretation.confidence < 0.72) return false;
  if (["trace", "loosening", "circling", "quiet_weight", "time_return"].includes(interpretation.echo_family)) {
    return false;
  }
  if (
    interpretation.defense_signal === "直接表达"
    && !memory.openLoops.length
    && (entry.context?.friction || 0) < 8
  ) {
    return false;
  }

  if (collectRecentQuestionFingerprints(state.entries, entry.id).length >= 2) {
    return false;
  }

  return Boolean(
    interpretation.core_tension
      || interpretation.defense_signal === "回避"
      || interpretation.defense_signal === "压抑"
      || memory.openLoops.length
      || interpretation.topic_entities.length,
  );
}

const MemoryEngine = {
  build(entries, currentEntry) {
    const currentMs = new Date(currentEntry.timestamp).getTime();
    const entriesForMemory = entries
      .filter(
        (entry) =>
          entry.id !== currentEntry.id &&
          new Date(entry.timestamp).getTime() < currentMs,
      )
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
    const shortWindow = entriesForMemory.slice(0, 6);
    const activePatterns = collectActivePatterns(shortWindow);
    const openLoops = collectOpenLoops(entriesForMemory);
    const longIdentityMemory = collectIdentityMemory(entriesForMemory);

    return {
      shortWindow,
      activePatterns,
      openLoops,
      longIdentityMemory,
    };
  },
};

function createTimeoutError(message) {
  const error = new Error(message);
  error.name = "TraceTimeoutError";
  return error;
}

async function bootWithTimeout(timeoutMs = 1800) {
  return Promise.race([
    bootSystem(),
    new Promise((_, reject) => {
      window.setTimeout(() => reject(createTimeoutError("Trace boot timed out")), timeoutMs);
    })
  ]);
}

async function bootSystem() {
  try {
    await db.init();
    health.dbReady = true;
    const storedRecords = await db.getAll();
    state.entries = await hydrateStoredEntries(storedRecords);
    await reanalyzeEntriesIfNeeded();
    await syncVaultButton();
    state.isLoaded = true;
    elements.rawMemoryInput.value = state.draft;

    const hasEntries = state.entries.length > 0;
    updateHomepageState(hasEntries);

    if (hasEntries) {
      const sniperEcho = RetentionSniper.check();
      if (sniperEcho) {
        renderEchoBlock({ echo: sniperEcho, question: "", pattern_hint: "" });
      } else {
        triggerSystemEcho();
      }
    }

    RetentionSniper.updateActivity();
    if (state.pinEnabled && sessionKey && storedRecords.some((record) => !record?.encrypted)) {
      await migrateEntriesEncryptionMode(false);
    }
    runHealthChecks();
  } catch (error) {
    health.lastError = error instanceof Error ? error.message : String(error);
    if (elements.unlockBtn) {
      elements.unlockBtn.textContent = "打开失败";
    }
  }
}

function shouldRequireUnlock() {
  return state.pinEnabled && !sessionKey;
}

async function enterOnboardingFlow() {
  await bootWithTimeout();
  showView("onboarding");
  checkPendingEchoOnBoot();
}

async function startTraceRuntime() {
  try {
    if (shouldRequireUnlock()) {
      showView("unlock");
      renderAccessView("idle");
      return;
    }

    await enterOnboardingFlow();
  } catch (error) {
    health.lastError = error instanceof Error ? error.message : String(error);
    if (shouldRequireUnlock()) {
      showView("unlock");
      renderAccessView("failed", "打开失败");
      return;
    }
    showView("onboarding");
  }
}

function updateHomepageState(hasEntries) {
  state.isFirstTimeUser = !hasEntries;
  state.onboardingStep = 0;
  renderThresholdState({ immediate: true });
}

function getThresholdState() {
  if (!state.isFirstTimeUser) {
    return RETURNING_THRESHOLD_STATE;
  }

  return FIRST_TIME_ONBOARDING_STEPS[state.onboardingStep] || FIRST_TIME_ONBOARDING_STEPS[0];
}

function renderThresholdState({ immediate = false } = {}) {
  const thresholdState = getThresholdState();
  if (!elements.thresholdLine || !elements.enterWritingBtn) return;

  if (immediate || !elements.thresholdShell) {
    state.onboardingTransitioning = false;
    elements.thresholdLine.textContent = thresholdState.line;
    elements.enterWritingBtn.textContent = thresholdState.action;
    return;
  }

  state.onboardingTransitioning = true;
  elements.thresholdShell.classList.add("is-stepping");

  const swapPoint = Math.round(MOTION.onboardingSwapMs * 0.42);
  window.setTimeout(() => {
    elements.thresholdLine.textContent = thresholdState.line;
    elements.enterWritingBtn.textContent = thresholdState.action;
    window.requestAnimationFrame(() => {
      elements.thresholdShell.classList.remove("is-stepping");
      window.setTimeout(() => {
        state.onboardingTransitioning = false;
      }, MOTION.onboardingSwapMs);
    });
  }, swapPoint);
}

function resetLegacyBioState() {
  const hasCredential = Boolean(window.localStorage.getItem(BIO_CRED_KEY));
  if (state.bioEnrolled && !hasCredential) {
    state.bioEnrolled = false;
    window.localStorage.removeItem(BIO_KEY);
  }
}

function resolveProfileInitial(name) {
  const clean = (name || "").trim();
  if (!clean) return "你";
  return Array.from(clean)[0];
}

function syncProfileUI() {
  const name = (state.profileName || "").trim();

  if (elements.profileNameInput && elements.profileNameInput.value !== name) {
    elements.profileNameInput.value = name;
  }

  if (elements.profileAvatar) {
    elements.profileAvatar.textContent = resolveProfileInitial(name);
  }
}

function saveProfileName(name) {
  state.profileName = (name || "").trim();
  window.localStorage.setItem(PROFILE_NAME_KEY, state.profileName);
  syncProfileUI();
}

function setStatusMessage(text = "", timeout = 0) {
  if (!elements.saveStatus) return;
  elements.saveStatus.textContent = text;

  if (setStatusMessage._timer) {
    window.clearTimeout(setStatusMessage._timer);
    setStatusMessage._timer = null;
  }

  if (timeout > 0) {
    setStatusMessage._timer = window.setTimeout(() => {
      if (elements.saveStatus.textContent === text) {
        elements.saveStatus.textContent = "";
      }
    }, timeout);
  }
}

function syncControlHub() {
  if (!elements.controlHub || !elements.controlEntry || !elements.controlActions) return;

  elements.controlHub.classList.toggle("is-open", state.controlHubOpen);
  elements.controlHub.classList.toggle("is-marking", state.anchorPickerOpen);
  elements.controlEntry.setAttribute("aria-expanded", String(state.controlHubOpen));
  elements.controlActions.setAttribute("aria-hidden", String(!state.controlHubOpen));

  if (elements.anchorOptions) {
    elements.anchorOptions.setAttribute("aria-hidden", String(!state.anchorPickerOpen));
  }

  if (elements.controlVoice) {
    elements.controlVoice.textContent = voiceState.listening ? "先停一下" : "说出来";
  }

  elements.anchorOptionButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.anchor === state.activeAnchor);
  });
}

function setControlHubOpen(open) {
  state.controlHubOpen = Boolean(open);
  if (!state.controlHubOpen) {
    state.anchorPickerOpen = false;
  }
  syncControlHub();
}

function setAnchorPickerOpen(open) {
  state.anchorPickerOpen = Boolean(open);
  if (state.anchorPickerOpen) {
    state.controlHubOpen = true;
  }
  syncControlHub();
}

function toggleAnchor(anchor) {
  state.activeAnchor = state.activeAnchor === anchor ? null : anchor;
  setAnchorPickerOpen(false);
  setControlHubOpen(false);
  elements.rawMemoryInput.focus();
  syncControlHub();
}

function clearCurrentDraft() {
  if (voiceState.listening) {
    stopVoiceCapture({ silent: true });
  }

  resetComposeState();
  hideEchoCard(true);
  setStatusMessage("", 0);
  setAnchorPickerOpen(false);
  setControlHubOpen(false);
  elements.rawMemoryInput.focus();
}

function openHistoryOverlay() {
  state.historyOpen = true;
  if (closeHistory._timer) {
    window.clearTimeout(closeHistory._timer);
    closeHistory._timer = null;
  }
  elements.historyPanel.classList.remove("is-closing");
  elements.historyPanel.classList.remove("hidden");
  elements.historyPanel.setAttribute("aria-hidden", "false");
  hideEchoCard(true);
  document.body.classList.remove("focus-mode");
  setAnchorPickerOpen(false);
  setControlHubOpen(false);
  renderHistory();
}

function getEntryLocalDayKey(entry) {
  const date = new Date(entry?.timestamp || Date.now());
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getExperienceProgression(currentEntry, entries = state.entries) {
  const pool = [currentEntry, ...entries]
    .filter(Boolean)
    .reduce((list, entry) => {
      if (list.some((item) => item.id === entry.id)) return list;
      list.push(entry);
      return list;
    }, [])
    .sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp));

  const dayKeys = [];
  pool.forEach((entry) => {
    const key = getEntryLocalDayKey(entry);
    if (!dayKeys.includes(key)) dayKeys.push(key);
  });

  const currentDayKey = getEntryLocalDayKey(currentEntry);
  const currentDayIndex = Math.max(dayKeys.indexOf(currentDayKey) + 1, 1);
  const activeDays = dayKeys.length;

  let stage = EXPERIENCE_STAGES.DAY_1_2;
  if (currentDayIndex === 3) stage = EXPERIENCE_STAGES.DAY_3;
  else if (currentDayIndex === 4) stage = EXPERIENCE_STAGES.DAY_4;
  else if (currentDayIndex >= 5 && currentDayIndex <= 6) stage = EXPERIENCE_STAGES.DAY_5_6;
  else if (currentDayIndex >= 7) stage = EXPERIENCE_STAGES.DAY_7_PLUS;

  return {
    activeDays,
    currentDayIndex,
    stage,
  };
}

function hasMeaningfulEchoSignal(entry) {
  const interpretation = entry.analysis?.interpretation || {};
  const observation = entry.analysis?.observation;
  const primaryClass = observation?.outputReadiness?.echo?.primaryClass || interpretation.observation_primary_class || "";
  const topClassScore = observation?.classes?.[0]?.score || 0;

  return Boolean(
    interpretation.pattern_link
      || interpretation.core_tension
      || (primaryClass && primaryClass !== "trace")
      || interpretation.confidence >= 0.6
      || topClassScore >= 0.66
  );
}

function hasStrongEchoSignal(entry) {
  const interpretation = entry.analysis?.interpretation || {};
  const observation = entry.analysis?.observation;
  const topClassScore = observation?.classes?.[0]?.score || 0;

  return Boolean(
    (interpretation.pattern_link && interpretation.core_tension)
      || interpretation.confidence >= 0.76
      || topClassScore >= 0.78
      || (entry.system?.weight || 0) >= 6
  );
}

function shouldSurfaceEntryEcho(entry, entries = state.entries) {
  const progression = getExperienceProgression(entry, entries);
  const meaningful = hasMeaningfulEchoSignal(entry);
  const strong = hasStrongEchoSignal(entry);

  if (progression.stage === EXPERIENCE_STAGES.DAY_1_2) {
    return strong;
  }

  if (progression.stage === EXPERIENCE_STAGES.DAY_3) {
    return meaningful;
  }

  if (progression.stage === EXPERIENCE_STAGES.DAY_4) {
    return false;
  }

  if (progression.stage === EXPERIENCE_STAGES.DAY_5_6) {
    return meaningful;
  }

  return meaningful || strong;
}

function shouldAllowScheduledEcho(pattern, level, entry, entries = state.entries) {
  const progression = getExperienceProgression(entry, entries);
  const strongPattern = level >= 2 || pattern.type === "open_loop" || (entry.system?.weight || 0) >= 6;

  if (progression.stage === EXPERIENCE_STAGES.DAY_1_2) {
    return false;
  }

  if (progression.stage === EXPERIENCE_STAGES.DAY_3) {
    return strongPattern;
  }

  if (progression.stage === EXPERIENCE_STAGES.DAY_4) {
    return false;
  }

  if (progression.stage === EXPERIENCE_STAGES.DAY_5_6) {
    return strongPattern || pattern.type === "repeat";
  }

  return true;
}

function clearTraceMarkState(node) {
  if (!node) return;
  node.classList.remove("is-loading", "is-sealing", "is-echo");
  if (node._traceTimer) {
    window.clearTimeout(node._traceTimer);
    node._traceTimer = null;
  }
}

function animateTraceMark(node, mode, duration = 1000) {
  if (!node) return;
  clearTraceMarkState(node);
  void node.offsetWidth;
  node.classList.add(mode);
  if (duration > 0) {
    node._traceTimer = window.setTimeout(() => {
      node.classList.remove(mode);
      node._traceTimer = null;
    }, duration);
  }
}

function setTraceLoading(active, label = "正在进入…") {
  if (!elements.traceLoading) return;

  if (elements.traceLoadingLabel) {
    elements.traceLoadingLabel.textContent = label;
  }

  elements.traceLoading.classList.toggle("hidden", !active);
  elements.traceLoading.classList.toggle("is-active", active);

  if (active) {
    animateTraceMark(elements.traceLoadingMark, "is-loading", 0);
  } else {
    clearTraceMarkState(elements.traceLoadingMark);
    clearTraceMarkState(elements.unlockTraceMark);
  }
}

function insertTextAtCursor(text) {
  const input = elements.rawMemoryInput;
  if (!input || !text) return;

  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const prefix = input.value.slice(0, start);
  const suffix = input.value.slice(end);
  const spacer = prefix && !/\s$/.test(prefix) ? " " : "";
  const insertion = `${spacer}${text}`;

  input.value = `${prefix}${insertion}${suffix}`;
  const caret = prefix.length + insertion.length;
  input.setSelectionRange(caret, caret);
  input.focus();

  state.draft = input.value;
  window.localStorage.setItem(DRAFT_KEY, state.draft);
}

function stopVoiceCapture({ silent = false } = {}) {
  if (!recognition || !voiceState.listening) {
    voiceState.listening = false;
    document.body.classList.remove("listening-mode");
    syncControlHub();
    return;
  }

  voiceState.listening = false;
  recognition.stop();
  document.body.classList.remove("listening-mode");
  if (!silent) {
    setStatusMessage("先停一下", 1200);
  }
  syncControlHub();
}

function initVoiceRecognition() {
  if (!voiceState.supported || recognition) {
    return;
  }

  recognition = new SpeechRecognitionCtor();
  recognition.lang = "zh-CN";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    voiceState.listening = true;
    document.body.classList.add("listening-mode");
    setStatusMessage("在听", 0);
    syncControlHub();
  };

  recognition.onresult = (event) => {
    let finalTranscript = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const transcript = event.results[index][0]?.transcript?.trim() || "";
      if (!transcript) continue;

      if (event.results[index].isFinal) {
        finalTranscript += transcript;
      }
    }

    if (finalTranscript) {
      insertTextAtCursor(finalTranscript);
      setStatusMessage("已经记下了", 1400);
    }
  };

  recognition.onerror = (event) => {
    voiceState.listening = false;
    document.body.classList.remove("listening-mode");

    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      setStatusMessage("这里还不能直接说", 1800);
      syncControlHub();
      return;
    }

    if (event.error === "no-speech") {
      setStatusMessage("刚刚没听清", 1400);
      syncControlHub();
      return;
    }

    if (event.error === "aborted") {
      return;
    }

    setStatusMessage("这里还不能直接说", 1800);
    syncControlHub();
  };

  recognition.onend = () => {
    const wasListening = voiceState.listening;
    voiceState.listening = false;
    document.body.classList.remove("listening-mode");

    if (wasListening && elements.saveStatus?.textContent === "在听") {
      setStatusMessage("", 0);
    }
    syncControlHub();
  };
}

function startVoiceCapture() {
  if (!voiceState.supported) {
    setStatusMessage("这里还不能直接说", 1800);
    return;
  }

  initVoiceRecognition();
  if (!recognition) return;

  if (voiceState.listening) {
    stopVoiceCapture();
    return;
  }

  try {
    recognition.start();
  } catch {
    setStatusMessage("这里还不能直接说", 1800);
  }
}

function showPinPanel(visible) {
  if (!elements.pinPanel) return;
  elements.pinPanel.classList.toggle("hidden", !visible);
}

function renderAccessView(status = "idle", customSubtitle = "") {
  const title = elements.unlockTitle;
  const subtitle = elements.unlockSubtitle;
  const primary = elements.unlockBtn;
  if (!title || !subtitle || !primary) return;

  primary.classList.remove("hidden");
  showPinPanel(true);
  title.textContent = "输入密码";
  primary.textContent = status === "active" ? "验证中…" : "进入";

  if (status === "active") {
    subtitle.textContent = "正在验证…";
    return;
  }

  if (status === "failed") {
    subtitle.textContent = customSubtitle || "请再试一次";
    return;
  }

  if (status === "success") {
    subtitle.textContent = "已进入";
    return;
  }

  subtitle.textContent = customSubtitle || "本地保护已开启";
  if (elements.pinInput) {
    window.setTimeout(() => elements.pinInput.focus(), 30);
  }
}

async function completeUnlock() {
  renderAccessView("success");
  setTraceLoading(true, "正在进入…");
  await new Promise((resolve) => window.setTimeout(resolve, 280));
  showPinPanel(false);
  await enterOnboardingFlow();
  setTraceLoading(false);
  animateTraceMark(elements.unlockTraceMark, "is-echo", MOTION.logoEchoMs);
}

async function handleUnlock() {
  await handlePinSubmit();
}

async function handlePinSubmit() {
  const pin = elements.pinInput?.value.trim() || "";
  if (!/^\d{4,6}$/.test(pin)) {
    if (elements.unlockSubtitle) elements.unlockSubtitle.textContent = "请输入 4 到 6 位数字";
    return;
  }

  renderAccessView("active");
  setTraceLoading(true, "正在验证…");

  try {
    await LocalPin.verify(pin);

    await completeUnlock();
  } catch (error) {
    console.error("PIN Auth Failed:", error);
    setTraceLoading(false);
    renderAccessView("failed", state.pinEnabled ? "PIN 不正确" : "PIN 设置失败");
    if (elements.pinInput) elements.pinInput.value = "";
    window.setTimeout(() => {
      renderAccessView("idle");
    }, 1200);
  }
}

function init() {
  resetLegacyBioState();
  syncProfileUI();
  renderAccessView("idle");
  initVoiceRecognition();
  bindEvents();
  syncControlHub();
}

async function handleDisablePin() {
  const currentPin = elements.pinInput?.value.trim() || "";
  if (!/^\d{4,6}$/.test(currentPin)) {
    renderAccessView("failed", "先输入当前 PIN");
    return;
  }

  try {
    await LocalPin.verify(currentPin);
    if (!db.instance) {
      await db.init();
    }
    state.entries = await hydrateStoredEntries(await db.getAll());
    await migrateEntriesEncryptionMode(true);
    window.localStorage.removeItem(PIN_HASH_KEY);
    window.localStorage.removeItem(BIO_KEY);
    window.localStorage.removeItem(BIO_CRED_KEY);
    window.localStorage.removeItem(ENCRYPTION_SALT_KEY);
    state.pinEnabled = false;
    state.bioEnrolled = false;
    sessionKey = null;
    if (elements.pinInput) elements.pinInput.value = "";
    renderAccessView("idle", "密码已关闭");
  } catch {
    renderAccessView("failed", "PIN 不正确");
  }
}

async function handleChangePin() {
  const currentPin = elements.pinInput?.value.trim() || "";
  if (!/^\d{4,6}$/.test(currentPin)) {
    renderAccessView("failed", "先输入当前 PIN");
    return;
  }

  try {
    await LocalPin.verify(currentPin);
    if (!db.instance) {
      await db.init();
    }
    state.entries = await hydrateStoredEntries(await db.getAll());
    if (elements.pinInput) elements.pinInput.value = "";
    renderAccessView("idle", "输入新的 4 到 6 位数字");
  } catch {
    renderAccessView("failed", "PIN 不正确");
  }
}

function bindEvents() {
  if (elements.unlockBtn) {
    elements.unlockBtn.addEventListener("click", handleUnlock);
  }

  if (elements.pinSubmitBtn) {
    elements.pinSubmitBtn.addEventListener("click", handlePinSubmit);
  }

  if (elements.pinInput) {
    elements.pinInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handlePinSubmit();
      }
    });
  }

  if (elements.enterWritingBtn) {
    elements.enterWritingBtn.addEventListener("click", () => {
      if (state.onboardingTransitioning) return;
      if (state.isFirstTimeUser && state.onboardingStep < FIRST_TIME_ONBOARDING_STEPS.length - 1) {
        state.onboardingStep += 1;
        renderThresholdState();
        return;
      }
      showView("compose");
      elements.rawMemoryInput.focus();
    });
  }

  elements.rawMemoryInput.addEventListener("focus", () => {
    if (!implicitSession.startMs) implicitSession.startMs = Date.now();
    document.body.classList.add("focus-mode");
  });

  elements.rawMemoryInput.addEventListener("blur", () => {
    document.body.classList.remove("focus-mode");
  });

  elements.rawMemoryInput.addEventListener("keydown", (event) => {
    implicitSession.hasTyped = true;
    if (event.key === "Backspace" || event.key === "Delete") implicitSession.backspaceCount += 1;
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      submitEntry();
    }
  });

  elements.rawMemoryInput.addEventListener("input", (event) => {
    state.draft = event.target.value;
    window.localStorage.setItem(DRAFT_KEY, state.draft);
    if (state.controlHubOpen) {
      setAnchorPickerOpen(false);
      setControlHubOpen(false);
    }
  });

  elements.rawMemoryInput.addEventListener("dblclick", (event) => {
    const input = event.currentTarget;
    if (!input.value || input.selectionStart === input.value.length) {
      startVoiceCapture();
    }
  });

  if (elements.controlEntry) {
    elements.controlEntry.addEventListener("click", () => {
      setControlHubOpen(!state.controlHubOpen);
    });
  }

  if (elements.controlSave) {
    elements.controlSave.addEventListener("click", () => {
      submitEntry();
    });
  }

  if (elements.controlHistory) {
    elements.controlHistory.addEventListener("click", () => {
      openHistoryOverlay();
    });
  }

  if (elements.controlAnchor) {
    elements.controlAnchor.addEventListener("click", () => {
      setAnchorPickerOpen(!state.anchorPickerOpen);
    });
  }

  elements.anchorOptionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      toggleAnchor(button.dataset.anchor || "");
    });
  });

  if (elements.controlVoice) {
    elements.controlVoice.addEventListener("click", () => {
      startVoiceCapture();
      setAnchorPickerOpen(false);
      setControlHubOpen(false);
    });
  }

  if (elements.controlDismiss) {
    elements.controlDismiss.addEventListener("click", () => {
      clearCurrentDraft();
    });
  }

  if (elements.closeHistoryBtn) {
    elements.closeHistoryBtn.addEventListener("click", () => {
      closeHistory();
    });
  }

  if (elements.echoCardClose) {
    elements.echoCardClose.addEventListener("click", () => hideEchoCard());
  }

  if (elements.exportBtn) {
    elements.exportBtn.addEventListener("click", exportEntries);
  }

  if (elements.vaultToggleBtn) {
    elements.vaultToggleBtn.addEventListener("click", () => {
      connectVaultFolder();
    });
  }

  if (elements.importBtn && elements.importInput) {
    elements.importBtn.addEventListener("click", () => elements.importInput.click());
    elements.importInput.addEventListener("change", importEntries);
  }

  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.code === "Space") {
      event.preventDefault();
      startVoiceCapture();
      return;
    }

    if (event.key === "Escape" && voiceState.listening) {
      event.preventDefault();
      stopVoiceCapture();
      return;
    }

    if (event.key === "Escape" && state.historyOpen) {
      closeHistory();
      return;
    }

    if (event.key === "Escape" && state.anchorPickerOpen) {
      setAnchorPickerOpen(false);
      return;
    }

    if (event.key === "Escape" && state.controlHubOpen) {
      setControlHubOpen(false);
    }
  });

  document.addEventListener("click", (event) => {
    if (state.historyOpen) {
      if (elements.historyPanel.contains(event.target)) return;
      closeHistory();
      return;
    }

    if (!state.controlHubOpen || !elements.controlHub) return;
    if (elements.controlHub.contains(event.target)) return;
    setAnchorPickerOpen(false);
    setControlHubOpen(false);
  });

  window.addEventListener("resize", () => {
    if (insightResizeTimer) window.clearTimeout(insightResizeTimer);
    insightResizeTimer = window.setTimeout(() => {
      if (state.historyOpen) {
        renderInsightViewV2();
      }
    }, 120);
  });
}

async function submitEntry() {
  if (voiceState.listening) {
    stopVoiceCapture({ silent: true });
  }

  const content = elements.rawMemoryInput.value.trim();
  if (!content && !state.activeAnchor) {
    setAnchorPickerOpen(false);
    setControlHubOpen(false);
    return;
  }

  const now = new Date();
  const durationSec = implicitSession.startMs
    ? Math.round((Date.now() - implicitSession.startMs) / 1000)
    : 0;
  const friction = implicitSession.backspaceCount;
  const timePhase = resolveTimePhase(now);

  const entry = {
    id: state.editingId || `mem-${now.getTime()}`,
    content,
    timestamp: now.toISOString(),
    context: {
      durationSec,
      friction,
      timePhase,
    },
    tags: {
      emotion: null,
      keywords: [],
    },
    system: {
      weight: 0,
      echo: null,
      echoLevel: null,
      echoType: null,
    },
    metadata: state.activeAnchor ? { anchor: state.activeAnchor } : null,
  };

  elements.rawMemoryInput.blur();
  elements.rawMemoryInput.classList.add("ink-dissolve");
  document.body.classList.remove("focus-mode");
  setAnchorPickerOpen(false);
  setControlHubOpen(false);
  elements.saveStatus.textContent = "收着…";
  animateTraceMark(elements.composeTraceMark, "is-sealing", MOTION.logoSealMs);
  playTraceFeedback();

  await saveEntryRecord(entry);
  upsertStateEntry(entry);
  RetentionSniper.updateActivity();

  window.setTimeout(() => {
    elements.saveStatus.textContent = "收好了";
  }, 280);

  window.setTimeout(async () => {
    elements.rawMemoryInput.value = "";
    elements.rawMemoryInput.classList.remove("ink-dissolve");
    state.draft = "";
    state.editingId = null;
    state.activeAnchor = null;
    window.localStorage.removeItem(DRAFT_KEY);
    elements.saveStatus.textContent = "收好了";
    syncControlHub();

    await silentAnalyze(entry);
    await writeEntryToVault(entry);
    triggerSystemEcho();

    const echoPayload = buildEntryEchoCard(entry);
    if (echoPayload) {
      window.setTimeout(() => {
        showEchoCard(echoPayload);
      }, 360);
    } else {
      hideEchoCard(true);
    }

    window.setTimeout(() => {
      TracePrediction.update();
    }, 600);

    window.setTimeout(() => {
      elements.saveStatus.textContent = "";
    }, 2000);

    implicitSession = { startMs: null, backspaceCount: 0, hasTyped: false };
  }, 800);

  runHealthChecks();
}

function upsertStateEntry(entry) {
  const existingIndex = state.entries.findIndex((item) => item.id === entry.id);
  if (existingIndex === -1) {
    state.entries.unshift(entry);
    return;
  }
  state.entries[existingIndex] = entry;
  state.entries.sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
}

function resetComposeState() {
  elements.rawMemoryInput.value = "";
  elements.rawMemoryInput.classList.remove("ink-dissolve");
  state.draft = "";
  state.editingId = null;
  state.activeAnchor = null;
  implicitSession = { startMs: null, backspaceCount: 0, hasTyped: false };
  window.localStorage.removeItem(DRAFT_KEY);
  syncControlHub();
}

function triggerSystemEcho() {
  renderEchoBlock({ echo: "", question: "", pattern_hint: "" });
}

function closeHistory() {
  if (!state.historyOpen || !elements.historyPanel || elements.historyPanel.classList.contains("hidden")) {
    return;
  }

  state.historyOpen = false;
  elements.historyPanel.setAttribute("aria-hidden", "true");
  elements.historyPanel.classList.remove("hidden");
  elements.historyPanel.classList.add("is-closing");

  if (closeHistory._timer) {
    window.clearTimeout(closeHistory._timer);
  }

  closeHistory._timer = window.setTimeout(() => {
    elements.historyPanel.classList.add("hidden");
    elements.historyPanel.classList.remove("is-closing");
    closeHistory._timer = null;
    if (!elements.composeView.classList.contains("hidden")) {
      elements.rawMemoryInput.focus();
    }
    syncControlHub();
  }, 280);
}

function renderEchoBlock(response) {
  const panel = elements.systemEchoPanel;
  if (!panel) return;
  panel.innerHTML = "";

  const pieces = [response?.echo].filter(Boolean);
  if (!pieces.length) {
    panel.classList.add("empty");
    return;
  }

  panel.classList.remove("empty");
  pieces.forEach((text, index) => {
    const line = document.createElement("p");
    line.className = "echo-text";
    line.textContent = text;
    if (index > 0) line.style.marginTop = "8px";
    panel.appendChild(line);
  });
}

function buildEntryEchoCard(entry) {
  const progression = getExperienceProgression(entry, state.entries);
  const allowFlashback = progression.currentDayIndex >= 7;

  if (!shouldSurfaceEntryEcho(entry, state.entries)) {
    return null;
  }

  if (entry.system?.echo) {
    return {
      ...entry.system.echo,
      l2: progression.currentDayIndex >= 7 ? entry.system.echo.l2 || "" : "",
      l3: allowFlashback ? (entry.system.flashback || entry.system.echo.l3 || "") : "",
    };
  }

  const response = entry.analysis?.response || {};
  if (response.echo) {
    return {
      l1: response.echo || "",
      l2: "",
      l3: allowFlashback ? (entry.system?.flashback || "") : "",
      level: progression.currentDayIndex >= 7 ? 2 : 1,
    };
  }

  if (entry.content) {
    const interpretation = entry.analysis?.interpretation || {
      surface_emotion: detectEmotion(entry.content || "", entry),
      topic_entities: inferTopics(entry.content || "", entry),
      defense_signal: inferDefenseSignal(entry.content || "", entry),
      core_tension: "",
      pattern_link: "",
      confidence: 0.22,
      echo_family: "trace",
      echo_tone: "soft",
    };
    return {
      l1: generateEchoSentence(entry, interpretation, { openLoops: [], activePatterns: [], longIdentityMemory: [] }, {
        family: interpretation.echo_family || "trace",
        tone: interpretation.echo_tone || "soft",
      }),
      l3: "",
      level: 1,
    };
  }

  return null;
}

async function silentAnalyze(entry) {
  entry.tags = {
    emotion: detectEmotion(entry.content || "", entry),
    keywords: extractKeywords(entry.content || ""),
  };
  entry.system.weight = calculateWeight(entry, state.entries);
  entry.analysis = AIEngine.analyze(entry, [entry, ...state.entries.filter((item) => item.id !== entry.id)]);
  entry.system.flashback = findSerendipitousEcho(entry, state.entries.filter((item) => item.id !== entry.id));

  const echoResult = scheduleEcho(entry, state.entries);

  if (echoResult?.immediate) {
    entry.system.echo = echoResult.text;
    entry.system.echoLevel = echoResult.level;
    entry.system.echoType = echoResult.type || null;
  } else if (echoResult?.delayed) {
    state.pendingEcho = {
      text: echoResult.text,
      createdAt: Date.now(),
      level: echoResult.level,
      sourceEntryId: entry.id,
    };
    persistSystemState();
  }

  await saveEntryRecord(entry);
  upsertStateEntry(entry);
}

function calculateWeight(entry, recentEntries) {
  let weight = 0;

  const friction = entry.context?.friction || 0;
  const timePhase = entry.context?.timePhase;

  if (friction >= 8) weight += 2;
  if (friction >= 15) weight += 3;
  if (timePhase === "深夜") weight += 2;

  const keywords = extractKeywords(entry.content || "");
  const recentKeywords = recentEntries.flatMap((item) => item.tags?.keywords || []);

  keywords.forEach((keyword) => {
    if (recentKeywords.filter((recentKeyword) => recentKeyword === keyword).length >= 2) {
      weight += 2;
    }
  });

  return weight;
}

function scheduleEcho(entry, allEntries) {
  if (Date.now() < state.echoCooldownUntil) return null;

  const recent = allEntries.slice(0, 12);
  const patterns = detectPatterns(recent, entry);

  if (!patterns.length) return null;

  const top = patterns[0];
  const key = top.type;
  const nextCount = (state.echoChain[key]?.count || 0) + 1;
  const nextLevel = Math.min(nextCount, 3);
  const scopedEntries = [entry, ...allEntries.filter((item) => item.id !== entry.id)];

  if (!shouldAllowScheduledEcho(top, nextLevel, entry, scopedEntries)) {
    return null;
  }

  if (!state.echoChain[key]) {
    state.echoChain[key] = { count: 0, lastTimestamp: 0 };
  }

  const chain = state.echoChain[key];
  chain.count += 1;
  chain.lastTimestamp = Date.now();

  const level = Math.min(chain.count, 3);
  const text = buildScheduledEcho(top, level, entry, recent);
  const textHash = JSON.stringify(text);

  if (state.lastEchoText === textHash) return null;
  state.lastEchoText = textHash;
  state.echoCooldownUntil = Date.now() + (level >= 3 ? 6 * 60 * 60 * 1000 : 30 * 60 * 1000);
  persistSystemState();

  if (level >= 3 || entry.system.weight >= 6) {
    return {
      delayed: true,
      text,
      level,
    };
  }

  return {
    immediate: true,
    text,
    level,
    type: top.type || null,
  };
}

function buildScheduledEcho(pattern, level, entry, recentEntries = []) {
  const familyMap = {
    repeat: level >= 2 ? "stalled_return" : "circling",
    time: "time_return",
    friction: level >= 2 ? "almost_said" : "held_back",
    open_loop: "pre_start",
  };
  const toneMap = {
    repeat: level >= 2 ? "movement" : "soft",
    time: "soft",
    friction: level >= 2 ? "direct" : "movement",
    open_loop: "movement",
  };

  const interpretation = {
    surface_emotion: entry.tags?.emotion || detectEmotion(entry.content || "", entry),
    topic_entities: pattern.key ? [pattern.key] : inferTopics(entry.content || "", entry),
    defense_signal: inferDefenseSignal(entry.content || "", entry),
    core_tension: "",
    pattern_link: pattern.type === "repeat" || pattern.type === "open_loop" ? "linked" : "",
    confidence: 0.72,
    echo_family: familyMap[pattern.type] || "trace",
    echo_tone: toneMap[pattern.type] || "soft",
  };
  const memory = {
    openLoops: pattern.type === "open_loop" ? ["open_loop"] : [],
    activePatterns: [],
    longIdentityMemory: [],
  };
  const context = createEchoContext(entry, interpretation, memory, {
    topic: pattern.key || interpretation.topic_entities[0] || "",
    timePhase: pattern.key || entry.context?.timePhase,
    seedSource: `${entry.id}-${pattern.type}-${level}-${pattern.key || ""}`,
  });
  const recentFingerprints = collectRecentEchoFingerprints(recentEntries, entry.id);
  const l1 = generateEchoSentence(entry, interpretation, memory, {
    family: interpretation.echo_family,
    tone: interpretation.echo_tone,
    recentFingerprints,
    topic: pattern.key || "",
    timePhase: pattern.key || entry.context?.timePhase,
    seedSource: `${entry.id}-${pattern.type}-${level}-l1`,
  });

  const companions = SCHEDULED_ECHO_COMPANIONS[pattern.type] || {};
  const pickCompanion = (lineKey) => {
    const templates = companions[lineKey] || [];
    if (!templates.length) return "";
    const startIndex = context.seed % templates.length;
    for (let offset = 0; offset < templates.length; offset += 1) {
      const template = templates[(startIndex + offset) % templates.length];
      const text = normalizeEchoWhitespace(typeof template === "function" ? template(context) : template);
      if (!text || isDeadGenericEchoText(text) || echoTooSimilar(text, recentFingerprints)) continue;
      return text;
    }
    const template = templates[startIndex];
    return normalizeEchoWhitespace(typeof template === "function" ? template(context) : template);
  };

  return {
    l1,
    l2: level >= 2 ? pickCompanion("l2") : "",
    l3: level >= 3 ? pickCompanion("l3") : "",
    level,
  };
}

function detectPatterns(recentEntries, currentEntry) {
  const patterns = [];
  const keywords = recentEntries.flatMap((entry) => entry.tags?.keywords || []);
  const frictions = recentEntries.map((entry) => entry.context?.friction || 0);
  const timePhases = recentEntries.map((entry) => entry.context?.timePhase);
  const contents = recentEntries.map((entry) => entry.content || "");

  const keywordFrequency = {};
  keywords.forEach((keyword) => {
    keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
  });
  const topKeyword = Object.entries(keywordFrequency).sort((left, right) => right[1] - left[1])[0];

  if (topKeyword && topKeyword[1] >= 3) {
    patterns.push({
      type: "repeat",
      level: 1,
      key: topKeyword[0],
    });
  }

  const timeFrequency = {};
  timePhases.forEach((timePhase) => {
    if (timePhase) timeFrequency[timePhase] = (timeFrequency[timePhase] || 0) + 1;
  });
  const topTime = Object.entries(timeFrequency).sort((left, right) => right[1] - left[1])[0];

  if (topTime && topTime[1] >= 3) {
    patterns.push({
      type: "time",
      level: 2,
      key: topTime[0],
    });
  }

  const avgFriction = frictions.length ? frictions.reduce((sum, value) => sum + value, 0) / frictions.length : 0;
  if (avgFriction >= 8) {
    patterns.push({
      type: "friction",
      level: 2,
    });
  }

  const openLoopHits = contents.filter((text) => ["想", "应该", "但是"].some((anchor) => text.includes(anchor))).length;
  if (openLoopHits >= 3) {
    patterns.push({
      type: "open_loop",
      level: 3,
    });
  }

  return patterns.sort((left, right) => right.level - left.level);
}

function showEchoCard(payload) {
  if (!payload) return;

  elements.echoCardLine1.textContent = payload.l1 || "";
  elements.echoCardLine2.textContent = payload.l2 || "";
  elements.echoCardLine3.textContent = payload.l3 || "";
  animateTraceMark(elements.composeTraceMark, "is-echo", MOTION.logoEchoMs);

  elements.echoCard.classList.remove("hidden", "fade-out", "show");
  void elements.echoCard.offsetWidth;
  elements.echoCard.classList.add("show");

  if (echoCardTimer) window.clearTimeout(echoCardTimer);
  echoCardTimer = window.setTimeout(() => {
    hideEchoCard();
  }, MOTION.echoCardHoldMs);
}

function hideEchoCard(immediate = false) {
  if (echoCardTimer) {
    window.clearTimeout(echoCardTimer);
    echoCardTimer = null;
  }

  if (immediate) {
    elements.echoCard.classList.add("hidden");
    elements.echoCard.classList.remove("fade-out", "show");
    return;
  }

  if (elements.echoCard.classList.contains("hidden")) return;
  elements.echoCard.classList.remove("show");
  elements.echoCard.classList.add("fade-out");
  window.setTimeout(() => {
    elements.echoCard.classList.add("hidden");
    elements.echoCard.classList.remove("fade-out");
  }, MOTION.echoCardExitMs);
}

function checkPendingEchoOnBoot() {
  if (!state.pendingEcho) return;

  const delay = 1000 * 60 * 60 * 4;
  if (Date.now() - state.pendingEcho.createdAt < delay) return;

  showEchoCard(state.pendingEcho.text);
  state.pendingEcho = null;
  persistSystemState();
}

function cleanupEchoChain() {
  const now = Date.now();

  Object.keys(state.echoChain).forEach((key) => {
    if (now - (state.echoChain[key]?.lastTimestamp || 0) > 72 * 60 * 60 * 1000) {
      delete state.echoChain[key];
    }
  });

  persistSystemState();
}

function renderHistory() {
  elements.historyList.innerHTML = "";
  if (elements.historyPatternLayer) {
    const hasInsight = state.entries.length > 0;
    elements.historyPatternLayer.classList.toggle("empty", !hasInsight);
    if (hasInsight) {
      renderInsightViewV2();
    }
  }

  if (!state.entries.length) {
    elements.historyList.innerHTML = '<p class="history-empty">还没有留下什么。</p>';
    return;
  }

  let currentDateLabel = "";

  state.entries.forEach((entry) => {
    const date = new Date(entry.timestamp);
    const dateLabel = formatEntropyGroup(date);

    if (dateLabel !== currentDateLabel) {
      const divider = document.createElement("div");
      divider.className = "history-date-divider";
      divider.textContent = dateLabel;
      elements.historyList.appendChild(divider);
      currentDateLabel = dateLabel;
    }

    const node = elements.historyEntryTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".history-time").textContent = formatEntropyMoment(date);

    const metadataNode = node.querySelector(".history-metadata");
    if (metadataNode && entry.metadata?.anchor) {
      metadataNode.textContent = entry.metadata.anchor;
      metadataNode.classList.remove("hidden");
    }

    const deleteBtn = node.querySelector(".history-delete-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
      });
      deleteBtn.addEventListener("click", async (event) => {
        event.stopPropagation();
        await deleteEntry(entry.id);
      });
    }

    const textNode = node.querySelector(".history-raw-text");
    const echoNode = node.querySelector(".history-echo-text");
    const secondaryNode = node.querySelector(".history-secondary");
    textNode.textContent = summarizeHistoryContent(entry.content || "[空白记录]");
    const flashbackSummary = entry.system?.flashback || "";
    const secondarySummary = flashbackSummary;
    if (echoNode && secondaryNode && secondarySummary) {
      echoNode.textContent = secondarySummary;
      secondaryNode.classList.remove("hidden");
    }

    node.style.cursor = "pointer";
    node.addEventListener("click", () => loadEntryForEdit(entry.id));
    elements.historyList.appendChild(node);
  });
}

function buildGraph(entries) {
  const nodes = {};
  const edges = {};
  const recent = entries.slice(0, 30);

  recent.forEach((entry) => {
    const keys = [...(entry.tags?.keywords || [])];
    const emotionAnchor = entry.metadata?.anchor;

    if (emotionAnchor) keys.push(emotionAnchor);

    keys.forEach((key) => {
      if (!nodes[key]) {
        nodes[key] = { id: key, weight: 0, x: 0, y: 0 };
      }
      nodes[key].weight += 1;
    });

    for (let index = 0; index < keys.length; index += 1) {
      for (let inner = index + 1; inner < keys.length; inner += 1) {
        const left = keys[index];
        const right = keys[inner];
        const edgeKey = left < right ? `${left}-${right}` : `${right}-${left}`;
        edges[edgeKey] = (edges[edgeKey] || 0) + 1;
      }
    }
  });

  return { nodes, edges };
}

function getGraphMetrics(graph) {
  const nodeList = Object.values(graph.nodes);
  const edgeList = Object.entries(graph.edges);

  const topNode = nodeList.sort((left, right) => right.weight - left.weight)[0] || null;
  const strongestEdge = edgeList.sort((left, right) => right[1] - left[1])[0] || null;

  return {
    topNode,
    strongestEdge,
    nodeCount: nodeList.length,
    edgeCount: edgeList.length,
  };
}

function layoutGraph(graph, canvas) {
  const nodeList = Object.values(graph.nodes);
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) * 0.35;

  nodeList.forEach((node, index) => {
    const angle = (index / Math.max(nodeList.length, 1)) * Math.PI * 2;
    const hash = hashCode(node.id);
    const r = radius * (0.6 + (hash % 40) / 100);

    node.x = centerX + Math.cos(angle) * r;
    node.y = centerY + Math.sin(angle) * r;
  });
}

function hashCode(str) {
  let hash = 0;
  for (let index = 0; index < str.length; index += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function renderGraph() {
  const canvas = elements.insightCanvas;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (graphAnimationFrame) {
    window.cancelAnimationFrame(graphAnimationFrame);
    graphAnimationFrame = null;
  }

  canvas.width = canvas.offsetWidth;
  canvas.height = 220;

  const fullGraph = buildGraph(state.entries);
  const latestEntry = state.entries[0] || null;
  const latestKeys = [...(latestEntry?.tags?.keywords || [])];
  if (latestEntry?.metadata?.anchor) latestKeys.push(latestEntry.metadata.anchor);

  const rankedNodes = Object.values(fullGraph.nodes).sort((left, right) => right.weight - left.weight);
  const keepIds = new Set(rankedNodes.slice(0, 10).map((node) => node.id));
  latestKeys.forEach((key) => keepIds.add(key));

  const graph = { nodes: {}, edges: {} };
  keepIds.forEach((id) => {
    if (fullGraph.nodes[id]) graph.nodes[id] = { ...fullGraph.nodes[id] };
  });
  Object.entries(fullGraph.edges).forEach(([edgeKey, weight]) => {
    const [sourceId, targetId] = edgeKey.split("-");
    if (graph.nodes[sourceId] && graph.nodes[targetId]) {
      graph.edges[edgeKey] = weight;
    }
  });

  layoutGraph(graph, canvas);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  Object.entries(graph.edges).forEach(([edgeKey, weight]) => {
    const [sourceId, targetId] = edgeKey.split("-");
    const source = graph.nodes[sourceId];
    const target = graph.nodes[targetId];
    if (!source || !target) return;

    ctx.beginPath();
    ctx.moveTo(source.x, source.y);
    ctx.lineTo(target.x, target.y);
    ctx.strokeStyle = `rgba(180,180,180,${Math.min(weight * 0.06, 0.14)})`;
    ctx.lineWidth = Math.min(1.2 + (weight * 0.18), 1.8);
    ctx.stroke();
  });

  Object.values(graph.nodes).forEach((node) => {
    const size = Math.min(3.8 + (node.weight * 1.18), 10);
    const isCurrent = latestKeys.includes(node.id);

    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, Math.PI * 2);
    ctx.fillStyle = isCurrent ? "rgba(220,220,220,0.46)" : "rgba(220,220,220,0.28)";
    ctx.fill();
  });

  highlightCurrentNode(graph, latestEntry);
}

function highlightCurrentNode(graph, latestEntry, timestamp = 0) {
  if (!latestEntry || !elements.insightCanvas) return;

  const ctx = elements.insightCanvas.getContext("2d");
  if (!ctx) return;

  const keys = [...(latestEntry.tags?.keywords || [])];
  const emotionAnchor = latestEntry.metadata?.anchor;
  if (emotionAnchor) keys.push(emotionAnchor);

  keys.forEach((key) => {
    const node = graph.nodes[key];
    if (!node) return;

    ctx.beginPath();
    ctx.arc(node.x, node.y, 14, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.stroke();
  });
}

function calculateEnergyScore(entries) {
  if (!entries || entries.length === 0) return 0;
  let score = 0;

  entries.forEach((entry) => {
    const anchor = entry.metadata?.emotionAnchor || entry.metadata?.anchor;
    if (anchor === "澄明") score += 2;
    if (anchor === "游离") score -= 0.5;
    if (anchor === "焦滞") score -= 1.5;
    if (anchor === "沉缩") score -= 2;
  });

  return score;
}

function getTrendDirection(entries) {
  if (!entries || entries.length < 6) return "→";

  const windowSize = Math.min(6, Math.floor(entries.length / 2));
  const recent = entries.slice(0, windowSize);
  const older = entries.slice(windowSize, windowSize * 2);

  const recentScore = calculateEnergyScore(recent);
  const olderScore = calculateEnergyScore(older);
  const diff = recentScore - olderScore;

  if (diff > 2) return "↗";
  if (diff < -2) return "↘";
  return "→";
}

function calculateFocusTrend(entries) {
  const recent = entries.slice(0, 10);
  if (!recent.length) return "稳定";

  const avgFriction = recent.reduce((sum, entry) => sum + (entry.context?.friction || 0), 0) / recent.length;
  if (avgFriction < 4) return "稳定";
  if (avgFriction < 8) return "波动";
  return "下降";
}

function renderInsightSummary() {
  if (!elements.insightSummary) return;

  elements.insightSummary.innerHTML = `<p class="history-narrative-line">${buildHistoryNarrative(state.entries)}</p>`;
}

function calculateRiskSignal(entries) {
  const inertia = calculateTrendInertia(entries);
  const recent = entries.slice(0, 8);
  const avgFriction = recent.length
    ? recent.reduce((sum, entry) => sum + (entry.context?.friction || 0), 0) / recent.length
    : 0;
  const lateNightCount = recent.filter((entry) => entry.context?.timePhase === "深夜").length;
  const openLoopCount = recent.filter((entry) =>
    ["想", "应该", "但是"].some((anchor) => (entry.content || "").includes(anchor)),
  ).length;

  if (inertia.type === "down" && inertia.strength >= 3 && avgFriction >= 8) {
    return {
      level: "高",
      text: "最近的状态在往下走，而且记录过程也更费力。",
      note: "这说明某些内容正在持续消耗你。",
    };
  }

  if (lateNightCount >= 4 || openLoopCount >= 4) {
    return {
      level: "中",
      text: "有些内容在固定时段反复出现。",
      note: "它还停在同一个未完成的位置。",
    };
  }

  return {
    level: "低",
    text: "当前没有明显的高风险信号。",
    note: "变化仍然在可观察范围内。",
  };
}

function renderRiskSignal() {
  if (!elements.trendRisk) return;

  const risk = calculateRiskSignal(state.entries);
  elements.trendRisk.innerHTML = `
    <div class="trend-label">风险节点</div>
    <div class="trend-main">${risk.level}</div>
    <div class="trend-sub">${risk.text}</div>
    <div class="trend-sub">${risk.note}</div>
  `;
}

function renderInsightLegend(graph) {
  if (!elements.insightLegend) return;

  const metrics = getGraphMetrics(graph);
  const latest = state.entries[0];
  const activeKeys = [...(latest?.tags?.keywords || [])];
  if (latest?.metadata?.anchor) activeKeys.push(latest.metadata.anchor);

  elements.insightLegend.innerHTML = `
    节点表示最近反复出现的词和状态，连线表示它们常常一起出现。
    ${metrics.topNode ? `当前中心更靠近「${metrics.topNode.id}」。` : ""}
    ${activeKeys.length ? `本次高亮：${activeKeys.join(" / ")}。` : ""}
  `;
}

function getEntriesSafe() {
  if (!state || !Array.isArray(state.entries)) return [];
  return state.entries;
}

function calculateTrendInertia(entries) {
  if (!entries || entries.length < 6) {
    return {
      type: "insufficient",
      strength: 0,
      diff: 0,
      recentScore: 0,
      olderScore: 0,
    };
  }

  const windowSize = Math.min(6, Math.floor(entries.length / 2));
  const recent = entries.slice(0, windowSize);
  const older = entries.slice(windowSize, windowSize * 2);
  const recentScore = calculateEnergyScore(recent);
  const olderScore = calculateEnergyScore(older);
  const diff = recentScore - olderScore;
  const strength = Math.abs(diff);

  let type = "stable";
  if (strength >= 1) {
    type = diff > 0 ? "up" : "down";
  }

  return {
    type,
    strength,
    diff,
    recentScore,
    olderScore,
  };
}

function buildTrendProjection(inertia) {
  if (!inertia || inertia.type === "insufficient") {
    return {
      l1: "当前记录尚未形成明显变化轨迹。",
      l2: "",
      l3: "",
    };
  }

  if (inertia.type === "up") {
    return {
      l1: "最近的状态在向上延续。",
      l2: inertia.strength > 3 ? "这种变化正在逐渐强化。" : "这种变化仍在持续。",
      l3: "",
    };
  }

  if (inertia.type === "down") {
    return {
      l1: "最近的状态在向下延续。",
      l2: inertia.strength > 3 ? "这种趋势正在加深。" : "这种变化仍在持续。",
      l3: "",
    };
  }

  return {
    l1: "最近的状态没有明显变化。",
    l2: "",
    l3: "",
  };
}

function shouldRenderPrediction(textObj) {
  const text = JSON.stringify(textObj);
  const hasRendered = Boolean(elements.trendPrediction?.innerHTML?.trim());
  if (predictionState.lastText === text) {
    return !hasRendered;
  }

  predictionState.lastText = text;
  predictionState.lastUpdate = Date.now();
  savePredictionState();
  return true;
}

function renderPrediction() {
  const entries = getEntriesSafe();
  const inertia = calculateTrendInertia(entries);
  const projection = buildTrendProjection(inertia);

  if (!elements.trendPrediction) return;
  if (!shouldRenderPrediction(projection)) return;

  elements.trendPrediction.innerHTML = `
    <div class="trend-label">变化趋势</div>
    <div class="trend-main">${projection.l1}</div>
    ${projection.l2 ? `<div class="trend-sub">${projection.l2}</div>` : ""}
  `;
}

function initPredictionLayer() {
  loadPredictionState();
}

function updatePrediction() {
  renderPrediction();
}

function renderTrends() {
  if (!elements.trendEnergy || !elements.trendFocus) return;

  const score = calculateEnergyScore(state.entries);
  const direction = getTrendDirection(state.entries);
  const focus = calculateFocusTrend(state.entries);

  elements.trendEnergy.innerHTML = `
    <div class="trend-label">能量</div>
    <div class="trend-main">${direction}</div>
    <div class="trend-sub">${score.toFixed(1)}</div>
  `;

  elements.trendFocus.innerHTML = `
    <div class="trend-label">专注</div>
    <div class="trend-main">${focus}</div>
  `;
}

function renderInsightViewV2() {
  renderInsightSummary();
  renderGraph();
}

function buildHistoryNarrative(entries) {
  if (!entries?.length) return "这里还没有留下什么。";

  const latest = entries[0];
  const observation = latest.analysis?.observation;
  const primaryClass =
    observation?.outputReadiness?.history?.narrativeAnchor
    || observation?.outputReadiness?.echo?.primaryClass
    || "";
  const repeatedTheme = observation?.layers?.longitudinalMemory?.patterns?.repeatedTheme || "";
  const graph = buildGraph(entries);
  const metrics = getGraphMetrics(graph);
  const topic = repeatedTheme || metrics.topNode?.id || latest.metadata?.anchor || "这里";
  const topicSpot = topic === "这里" ? topic : `「${topic}」`;

  if (["looping", "unresolved_return", "night_return"].includes(primaryClass)) {
    return `最近还是会绕回${topicSpot}。`;
  }

  if (["held_back_core", "unfinished_meaning"].includes(primaryClass)) {
    return `${topicSpot}还停在没有说透的地方。`;
  }

  if (primaryClass === "pre_start_loop") {
    return `${topicSpot}总停在开始之前。`;
  }

  if (["drift", "narrative_drift", "fragmentation"].includes(primaryClass)) {
    return `最近有些散开，重心还在${topicSpot}附近。`;
  }

  if (["withdrawal", "emotional_compression"].includes(primaryClass)) {
    return `最近往里收了一些，${topicSpot}还没有退下去。`;
  }

  if (["fragile_loosening", "integration_attempt", "recovery_direction", "temporary_stabilization"].includes(primaryClass)) {
    return `最近开始松动一点，但还是牵着${topicSpot}。`;
  }

  if (["role_pressure", "identity_strain", "identity_performance_pressure", "recurring_social_pressure"].includes(primaryClass)) {
    return `最近总有别的要求压下来，还是会回到${topicSpot}。`;
  }

  return `最近的记录还是会回到${topicSpot}。`;
}

function loadEntryForEdit(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;

  elements.rawMemoryInput.value = entry.content || "";
  state.draft = entry.content || "";
  state.editingId = id;
  state.activeAnchor = entry.metadata?.anchor || null;
  syncControlHub();

  elements.historyPanel.classList.add("hidden");
  elements.historyPanel.classList.remove("is-closing");
  elements.historyPanel.setAttribute("aria-hidden", "true");
  state.historyOpen = false;
  elements.rawMemoryInput.focus();
  hideEchoCard(true);
  renderEchoBlock(entry.analysis?.response || { echo: "", question: "", pattern_hint: "" });
}

async function deleteEntry(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (!entry) return;

  const confirmed = window.confirm("删掉这条？\n从这台设备里拿走以后，就回不来了。");
  if (!confirmed) return;

  await db.delete(id);
  state.entries = state.entries.filter((item) => item.id !== id);

  if (state.editingId === id) {
    resetComposeState();
    hideEchoCard(true);
    renderEchoBlock({ echo: "", question: "", pattern_hint: "" });
  }

  if (state.historyOpen) {
    renderHistory();
  }

  TracePrediction.update();
  runHealthChecks();
}

function showView(viewName) {
  document.body.classList.remove("runtime-pending");
  if (elements.unlockView) elements.unlockView.classList.toggle("hidden", viewName !== "unlock");
  elements.onboardingView.classList.toggle("hidden", viewName !== "onboarding");
  elements.composeView.classList.toggle("hidden", viewName !== "compose");

  if (viewName !== "compose") {
    setAnchorPickerOpen(false);
    setControlHubOpen(false);
  }

  if (viewName === "onboarding") {
    animateTraceMark(elements.onboardingTraceMark, "is-sealing", MOTION.logoSealMs);
  }
}
function exportEntries() {
  const payload = JSON.stringify(state.entries, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `trace-export-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function importEntries(event) {
  const [file] = event.target.files || [];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return;

    const importedEntries = normalizeEntries(parsed);
    const merged = new Map(state.entries.map((entry) => [entry.id, entry]));
    importedEntries.forEach((entry) => {
      merged.set(entry.id, entry);
    });

    for (const entry of merged.values()) {
      await saveEntryRecord(entry);
    }

    state.entries = await hydrateStoredEntries(await db.getAll());
    await reanalyzeEntriesIfNeeded();
    triggerSystemEcho();
    if (state.historyOpen) {
      renderHistory();
    }
    TracePrediction.update();
    runHealthChecks();
  } catch {
    // Keep silent to avoid adding UI noise.
  } finally {
    event.target.value = "";
  }
}

function buildTopologySummary(entries) {
  if (entries.length < 3) return "";

  const recent = entries.slice(0, 8);
  const topics = recent.flatMap((entry) => entry.analysis?.interpretation?.topic_entities || []);
  const emotions = recent.map((entry) => entry.analysis?.interpretation?.surface_emotion).filter(Boolean);
  const defenses = recent.map((entry) => entry.analysis?.interpretation?.defense_signal).filter(Boolean);

  const lines = [];
  const topTopic = findMostFrequent(topics);
  const topEmotion = findMostFrequent(emotions);
  const topDefense = findMostFrequent(defenses);

  if (topTopic) lines.push(`你最近常写到「${topTopic}」。`);
  if (topEmotion && topEmotion !== "平静") lines.push(`最近的情绪更接近「${topEmotion}」。`);
  if (topDefense && topDefense !== "直接表达") lines.push(`你最近常常会先「${topDefense}」。`);

  const openLoop = collectOpenLoops(entries)[0];
  if (openLoop) lines.push(openLoop);

  const repeatedQuestion = findMostFrequent(
    recent.map((entry) => entry.analysis?.response?.question).filter(Boolean),
  );
  if (repeatedQuestion) lines.push(`最近反复出现的问题是：${repeatedQuestion}`);

  return lines.join("\n");
}

function collectActivePatterns(entries) {
  const topics = entries.flatMap((entry) => inferTopics(entry.content || "", entry));
  const emotions = entries.map((entry) => inferSurfaceEmotion(entry.content || "", entry));
  const patterns = [];

  const topTopic = findMostFrequent(topics);
  if (topTopic && topics.filter((topic) => topic === topTopic).length >= 2) {
    patterns.push(`「${topTopic}」最近一直在回来。`);
  }

  const topEmotion = findMostFrequent(emotions);
  if (topEmotion && topEmotion !== "平静" && emotions.filter((emotion) => emotion === topEmotion).length >= 2) {
    patterns.push(`「${topEmotion}」还没有完全退下去。`);
  }

  return patterns;
}

function collectOpenLoops(entries) {
  const loops = [];
  const recentTexts = entries.slice(0, 6).map((entry) => entry.content || "");

  if (recentTexts.filter((text) => containsAny(text, ["开始", "准备", "打开", "重启"])).length >= 3) {
    loops.push("最近总会停在开始之前。");
  }

  if (entries.slice(0, 6).filter((entry) => entry.context?.friction >= 8).length >= 3) {
    loops.push("最近总有一层没真正说开。");
  }

  return loops;
}

function collectIdentityMemory(entries) {
  const identity = [];
  const allTopics = entries.flatMap((entry) => inferTopics(entry.content || "", entry));
  const topTopic = findMostFrequent(allTopics);
  if (topTopic) identity.push(`你常会回到「${topTopic}」。`);

  const frequentDefense = findMostFrequent(
    entries.map((entry) => inferDefenseSignal(entry.content || "", entry)).filter(Boolean),
  );
  if (frequentDefense && frequentDefense !== "直接表达") {
    identity.push(`你总会先用「${frequentDefense}」把自己护住一点。`);
  }

  return identity;
}

async function playTraceFeedback() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.value = 880;
    osc.type = "sine";
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(310, now + 0.18);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.025, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    osc.start(now);
    osc.stop(now + 0.4);
  } catch {
    // Keep silent to avoid blocking the main writing flow.
  }
}
function normalizeEntries(entries) {
  return entries
    .filter(Boolean)
    .map((entry) => ({
      id: entry.id || `mem-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      content: typeof entry.content === "string" ? entry.content : "",
      timestamp: entry.timestamp || new Date().toISOString(),
      context: {
        durationSec: Number.isFinite(entry.context?.durationSec) ? entry.context.durationSec : 0,
        friction: Number.isFinite(entry.context?.friction) ? entry.context.friction : 0,
        timePhase: entry.context?.timePhase || resolveTimePhase(new Date(entry.timestamp || Date.now())),
      },
      tags: {
        emotion: entry.tags?.emotion || null,
        keywords: Array.isArray(entry.tags?.keywords) ? entry.tags.keywords : [],
      },
      system: {
        weight: Number.isFinite(entry.system?.weight) ? entry.system.weight : 0,
        echo: entry.system?.echo || null,
        echoLevel: entry.system?.echoLevel || null,
        echoType: entry.system?.echoType || null,
        flashback: entry.system?.flashback || null,
      },
      metadata: entry.metadata || null,
      analysis: entry.analysis || null,
    }))
    .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
}

async function reanalyzeEntriesIfNeeded() {
  let changed = false;
  const rebuilt = [];

  for (let index = 0; index < state.entries.length; index += 1) {
    const entry = state.entries[index];
    const previousEntries = [...rebuilt, ...state.entries.slice(index + 1)];
    const observation = entry.analysis?.observation;
    const needsRefresh =
      !entry.analysis?.response?.echo
      || isDeadGenericEchoText(entry.analysis?.response?.echo)
      || isDeadGenericEchoText(entry.analysis?.response?.pattern_hint)
      || isDeadGenericEchoPayload(entry.system?.echo)
      || !entry.analysis?.interpretation?.echo_family
      || !entry.analysis?.interpretation?.echo_tone
      || !observation
      || observation.version !== OBSERVATION_MODEL_VERSION
      || !Array.isArray(observation.classes)
      || !observation.classes.length
      || !observation.outputReadiness?.echo
      || !observation.outputReadiness?.history;

    if (
      needsRefresh
      || (!entry.analysis?.response?.question && !entry.tags?.emotion)
    ) {
      entry.tags = {
        emotion: detectEmotion(entry.content || "", entry),
        keywords: extractKeywords(entry.content || "", entry),
      };
      entry.analysis = AIEngine.analyze(entry, [entry, ...previousEntries.filter((item) => item.id !== entry.id)]);
      if (!entry.system) entry.system = {};
      if (isDeadGenericEchoPayload(entry.system?.echo) || !entry.system?.echo?.l1) {
        entry.system.echo = buildEntryEchoCard(entry);
      }
      await saveEntryRecord(entry);
      changed = true;
    }
    rebuilt.push(entry);
  }

  if (changed) {
    state.entries = await hydrateStoredEntries(await db.getAll());
  }
}

function inferSurfaceEmotion(text, entry) {
  const scoreMap = {};

  Object.entries(Lexicon.emotions).forEach(([emotion, triggers]) => {
    scoreMap[emotion] = triggers.reduce((score, trigger) => score + (text.includes(trigger) ? 1 : 0), 0);
  });

  if (entry.context?.friction >= 8) scoreMap.焦虑 = (scoreMap.焦虑 || 0) + 1;
  if (entry.context?.durationSec >= 120) scoreMap.压抑 = (scoreMap.压抑 || 0) + 1;
  if ((text || "").length === 0 && entry.metadata?.anchor) scoreMap.压抑 = (scoreMap.压抑 || 0) + 1;

  const topEmotion = Object.keys(scoreMap).sort((left, right) => scoreMap[right] - scoreMap[left])[0];
  return scoreMap[topEmotion] > 0 ? topEmotion : "平静";
}

function getObservationClassScore(observation, key) {
  return observation?.classes?.find((item) => item.key === key)?.score || 0;
}

function getObservationSignalScore(observation, layerKey, signalKey) {
  return observation?.layers?.[layerKey]?.signals?.find((item) => item.key === signalKey)?.score || 0;
}

function inferTopics(text, entry) {
  const topics = Object.entries(Lexicon.topics)
    .filter(([, triggers]) => triggers.some((trigger) => text.includes(trigger)))
    .map(([topic]) => topic);

  if (entry.metadata?.anchor && !topics.length) {
    topics.push("身份感");
  }

  return topics.slice(0, 3);
}

function detectEmotion(text, entry) {
  return inferSurfaceEmotion(text, entry);
}

function extractKeywords(text) {
  const anchors = ["累", "不想", "想", "换", "烦", "焦虑", "逃", "困"];
  return anchors.filter((anchor) => text.includes(anchor));
}

function inferDefenseSignal(text, entry, observation) {
  if (entry.context?.friction >= 10 && !text) return "强防御";

  if (getObservationClassScore(observation, "over_control") >= 0.64) return "合理化";
  if (getObservationClassScore(observation, "suppression") >= 0.6) return "压抑";
  if (getObservationClassScore(observation, "avoidance") >= 0.58) return "回避";

  for (const [signal, triggers] of Object.entries(Lexicon.defense)) {
    if (triggers.some((trigger) => text.includes(trigger))) return signal;
  }

  if (entry.context?.friction >= 8) return "斟酌";
  return "直接表达";
}

function inferCoreTension(text, entry, memory, observation) {
  const primaryClass = observation?.outputReadiness?.echo?.primaryClass || "";
  const repeatedTheme = observation?.layers?.longitudinalMemory?.patterns?.repeatedTheme || "";

  const matchedPair = Lexicon.tensionPairs.find((pair) => pair.when(text));
  if (matchedPair) return matchedPair.label;

  if (primaryClass === "pre_start_loop") {
    return "事情总停在开始之前。";
  }

  if (primaryClass === "held_back_core" || primaryClass === "unfinished_meaning") {
    return "最关键的那句还没有真正落下来。";
  }

  if (primaryClass === "drift") {
    return "你在旁边绕了一圈，中心还留在原地。";
  }

  if (primaryClass === "emotional_compression" || primaryClass === "withdrawal") {
    return "你在往里收，那件事并没有退下去。";
  }

  if (primaryClass === "role_pressure" || primaryClass === "identity_strain") {
    return "外面的要求和里面真正想要的，还没有站在一起。";
  }

  if (primaryClass === "self_contradiction") {
    return "你一边知道，一边又停在原地。";
  }

  if (entry.context?.friction >= 10 && entry.context?.durationSec >= 120) {
    return "你不是没话说，只是一直在收住。";
  }

  if (memory.openLoops.length > 0 && containsAny(text, ["开始", "明天", "这次", "还是"])) {
    return "事情总停在开始之前。";
  }

  if (entry.metadata?.anchor === "焦滞") {
    return "你卡住了，但还没离开这里。";
  }

  if (entry.metadata?.anchor === "游离") {
    return "你先往旁边走开了。";
  }

  if (entry.metadata?.anchor === "澄明") {
    return "你已经靠近了，只是还没真正动。";
  }

  if (entry.metadata?.anchor === "沉缩") {
    return "你在往里收，那件事还没过去。";
  }

  if (repeatedTheme) {
    return `你还是会回到「${repeatedTheme}」。`;
  }

  return "";
}

function inferPatternLink(topics, surfaceEmotion, memory, observation) {
  const repeatedTheme = observation?.layers?.longitudinalMemory?.patterns?.repeatedTheme || "";
  const continuityThread = observation?.outputReadiness?.continuity?.threadClass || "";

  if (repeatedTheme) {
    return `「${repeatedTheme}」还是会回来。`;
  }

  const topicMatch = topics.find((topic) =>
    memory.activePatterns.some((pattern) => pattern.includes(`「${topic}」`)),
  );
  if (topicMatch) {
    return `「${topicMatch}」还是会回来。`;
  }

  if (surfaceEmotion !== "平静" && memory.activePatterns.some((pattern) => pattern.includes(`「${surfaceEmotion}」`))) {
    return `「${surfaceEmotion}」还没有完全退下去。`;
  }

  const openLoop = memory.openLoops[0];
  if (!openLoop && continuityThread === "unresolved_return") {
    return "它还没有真正退下去。";
  }
  return openLoop || "";
}

function inferConfidence(entry, surfaceEmotion, coreTension, patternLink, observation) {
  let score = 0.18;
  if (surfaceEmotion && surfaceEmotion !== "平静") score += 0.16;
  if (coreTension) score += 0.24;
  if (patternLink) score += 0.2;
  if (entry.context?.friction >= 8) score += 0.12;
  if (entry.context?.durationSec >= 120) score += 0.1;
  score += (observation?.inference?.confidenceBand || 0) * 0.26;
  if ((observation?.classes?.length || 0) >= 3) score += 0.06;
  if (getObservationSignalScore(observation, "psychologicalDynamic", "unfinished_internal_conflict") >= 0.66) {
    score += 0.06;
  }
  return Math.min(score, 0.92);
}

function buildAnalysisEcho(interpretation, memory, entry) {
  const primary = generateEchoSentence(entry, interpretation, memory, {
    family: interpretation.echo_family,
    tone: interpretation.echo_tone,
  });

  if (primary && !isDeadGenericEchoText(primary)) {
    return primary;
  }

  if (interpretation.pattern_link) return interpretation.pattern_link;
  if (memory.longIdentityMemory[0]) return memory.longIdentityMemory[0];
  return "这里还没有完全落下。";
}

function buildAnalysisQuestion(interpretation, memory) {
  if (interpretation.echo_family === "pre_start") {
    return "你真正停住的是哪一下？";
  }

  if (["held_back", "almost_said"].includes(interpretation.echo_family)) {
    return "你收住的那句是什么？";
  }

  if (interpretation.echo_family === "drift") {
    return "你刚才绕开的是哪一点？";
  }

  if (interpretation.echo_family === "inward_pull") {
    return "你往里收的时候，最先避开的是什么？";
  }

  if (interpretation.core_tension.includes("行动")) {
    return "压住你的，是结果，还是一开始就停不下来？";
  }

  if (interpretation.defense_signal === "回避") {
    return "你先退开的，是事情，还是后面的现实？";
  }

  if (interpretation.defense_signal === "压抑") {
    return "如果不先压住它，最先出来的会是什么？";
  }

  if (interpretation.pattern_link || memory.openLoops.length) {
    return "和前几次比，真正没变的是什么？";
  }

  if (interpretation.topic_entities.includes("关系")) {
    return "这里更难碰到的是失望，还是需要？";
  }

  if (interpretation.topic_entities.includes("工作")) {
    return "压住你的，是事情，还是结果？";
  }

  return "如果只留一句，哪一句最难写？";
}

function runHealthChecks() {
  health.checks.booted = state.isLoaded && health.dbReady;
  health.checks.canSubmit = typeof submitEntry === "function" && Boolean(elements.rawMemoryInput);
  health.checks.canRenderHistory = typeof renderHistory === "function" && Boolean(elements.historyList);
  window.__traceHealth = {
    ...health,
    totalEntries: state.entries.length,
    latestEcho: state.entries[0]?.analysis?.response?.echo || "",
  };
}

function resolveTimePhase(date) {
  const hour = date.getHours();
  if (hour < 5 || hour >= 23) return "深夜";
  if (hour < 10) return "清晨";
  return "日间";
}

function resolveAmbientClass(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 10) return "time-morning";
  if (hour >= 10 && hour < 18) return "time-noon";
  return "time-night";
}

function syncThemeColor(themeClass) {
  const themeColor = themeClass === "time-night" ? "#1a1b1e" : "#f9fafb";
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", themeColor);
  });
}

function syncTraceLogos(themeClass) {
  const nextSrc = themeClass === "time-night" ? TRACE_LOGO_ASSETS.dark : TRACE_LOGO_ASSETS.light;

  document.querySelectorAll(".trace-logo[data-light-src][data-dark-src]").forEach((node) => {
    const preferred = themeClass === "time-night" ? node.dataset.darkSrc : node.dataset.lightSrc;
    const src = preferred || nextSrc;
    if (node.getAttribute("src") !== src) {
      node.setAttribute("src", src);
    }
  });
}

function setAmbientLight(date = new Date()) {
  const nextClass = resolveAmbientClass(date);
  document.body.classList.remove("time-morning", "time-day", "time-noon", "time-night");
  document.body.classList.add(nextClass);
  syncThemeColor(nextClass);
  syncTraceLogos(nextClass);
}

function findMostFrequent(values) {
  if (!values || !values.length) return null;
  const counts = values.reduce((accumulator, value) => {
    accumulator[value] = (accumulator[value] || 0) + 1;
    return accumulator;
  }, {});

  return Object.keys(counts).reduce((left, right) => (counts[left] >= counts[right] ? left : right));
}

function containsAny(text, lexicon) {
  return lexicon.some((item) => text.includes(item));
}

function summarizeHistoryContent(text) {
  if (!text || text === "[空白记录]") return text;
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= 60) return normalized;
  return `${normalized.slice(0, 60)}…`;
}

function summarizeHistoryEcho(parts) {
  const firstLine = parts[0] || "";
  if (firstLine.length <= 42) return firstLine;
  return `${firstLine.slice(0, 42)}…`;
}

function findSerendipitousEcho(currentEntry, entries) {
  if (!currentEntry?.content || !entries?.length) return null;

  const currentTime = new Date(currentEntry.timestamp).getTime();
  const currentKeywords = currentEntry.tags?.keywords || [];
  const currentAnchor = currentEntry.metadata?.anchor || "";
  const threshold = 75 * 24 * 60 * 60 * 1000;

  let candidate = null;
  let bestScore = 0;

  entries.forEach((entry) => {
    const entryTime = new Date(entry.timestamp).getTime();
    if (!Number.isFinite(entryTime) || currentTime - entryTime < threshold) return;

    const oldKeywords = entry.tags?.keywords || [];
    const sharedKeywords = currentKeywords.filter((keyword) => oldKeywords.includes(keyword));
    const sameAnchor = Boolean(currentAnchor && entry.metadata?.anchor === currentAnchor);
    const weightedOldEntry =
      entry.metadata?.anchor === "焦滞" ||
      entry.context?.friction >= 8 ||
      entry.system?.weight >= 4;

    const score = sharedKeywords.length * 2 + (sameAnchor ? 2 : 0) + (weightedOldEntry ? 1 : 0);
    if (score < 3 || score <= bestScore) return;

    bestScore = score;
    candidate = entry;
  });

  if (!candidate) return null;

  const excerpt = summarizeHistoryContent(candidate.content || "");
  return `这和${formatEntropyMoment(new Date(candidate.timestamp))}写下的那段话，像是同一个没有解开的结：「${excerpt}」`;
}

function getDayDiff(date) {
  const now = new Date();
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return Math.round((startNow - startDate) / (24 * 60 * 60 * 1000));
}

function phaseLabel(date) {
  const phase = resolveTimePhase(date);
  if (phase === "深夜") return "深夜";
  if (phase === "清晨") return "清晨";
  return "日间";
}

function weekdayLabel(date) {
  return ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][date.getDay()];
}

function formatEntropyGroup(date) {
  const diff = getDayDiff(date);
  if (diff <= 0) return "今天";
  if (diff === 1) return "昨天";
  if (diff < 7) return `上个${weekdayLabel(date)}`;
  if (date.getFullYear() === new Date().getFullYear()) {
    return `${date.getMonth() + 1}月的某个${phaseLabel(date)}`;
  }
  return `${date.getFullYear()}年${date.getMonth() + 1}月的某个${phaseLabel(date)}`;
}

function formatEntropyMoment(date) {
  const diff = getDayDiff(date);
  if (diff <= 0) {
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }
  if (diff === 1) return "昨天";
  if (diff < 7) return `上个${weekdayLabel(date)}`;
  if (date.getFullYear() === new Date().getFullYear()) {
    return `${date.getMonth() + 1}月的某个${phaseLabel(date)}`;
  }
  return `去年的一个${phaseLabel(date)}`;
}

window.TracePrediction = {
  init: initPredictionLayer,
  update: updatePrediction,
  calculate: calculateTrendInertia,
};

window.addEventListener("load", async () => {
  init();
  setAmbientLight();
  window.setInterval(() => {
    setAmbientLight();
  }, 30 * 60 * 1000);
  loadSystemState();
  TracePrediction.init();
  cleanupEchoChain();
  await startTraceRuntime();
});
