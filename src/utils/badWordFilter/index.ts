// ============================================
// OpenFaith 违规词过滤系统
// 支持多语言、模糊匹配、变体识别
// ============================================

export interface BannedWord {
  word: string;
  language: string;
  category: 'profanity' | 'insult' | 'drug' | 'violence' | 'sexual' | 'politics' | 'religion_abuse' | 'spam';
  variants?: string[];
}

export interface FilterResult {
  hasViolation: boolean;
  category?: string;
  words?: string[];
  message?: string;
}

// ============================================
// 内置违规词库（客户端缓存）
// 按语言和类别分类
// ============================================
const BANNED_WORDS_DB: Record<string, BannedWord[]> = {
  // 中文简体
  'zh-CN': [
    // 脏话/侮辱
    { word: '傻逼', language: 'zh-CN', category: 'profanity', variants: ['傻比', '傻逼'] },
    { word: '妈逼', language: 'zh-CN', category: 'profanity', variants: ['妈比'] },
    { word: '操你妈', language: 'zh-CN', category: 'profanity', variants: ['草泥马'] },
    { word: '狗日的', language: 'zh-CN', category: 'profanity' },
    { word: '傻吊', language: 'zh-CN', category: 'profanity', variants: ['傻屌'] },
    { word: '贱人', language: 'zh-CN', category: 'insult' },
    { word: '婊子', language: 'zh-CN', category: 'insult', variants: ['表子'] },
    { word: '废物', language: 'zh-CN', category: 'insult' },
    { word: '垃圾', language: 'zh-CN', category: 'insult' },
    { word: '人渣', language: 'zh-CN', category: 'insult' },
    { word: '滚开', language: 'zh-CN', category: 'insult' },
    { word: '去死', language: 'zh-CN', category: 'insult' },
    { word: '神经病', language: 'zh-CN', category: 'insult', variants: ['神经病'] },
    { word: '脑残', language: 'zh-CN', category: 'insult' },

    // 毒品
    { word: '海洛因', language: 'zh-CN', category: 'drug', variants: ['白粉', '四号'] },
    { word: '冰毒', language: 'zh-CN', category: 'drug' },
    { word: '摇头丸', language: 'zh-CN', category: 'drug' },
    { word: 'K粉', language: 'zh-CN', category: 'drug' },
    { word: '大麻', language: 'zh-CN', category: 'drug' },
    { word: '鸦片', language: 'zh-CN', category: 'drug' },
    { word: '可卡因', language: 'zh-CN', category: 'drug' },
    { word: '毒品', language: 'zh-CN', category: 'drug' },
    { word: '吸毒', language: 'zh-CN', category: 'drug' },
    { word: '贩毒', language: 'zh-CN', category: 'drug' },
    { word: '麻古', language: 'zh-CN', category: 'drug' },
    { word: '开心水', language: 'zh-CN', category: 'drug' },

    // 暴力
    { word: '杀人', language: 'zh-CN', category: 'violence' },
    { word: '砍死', language: 'zh-CN', category: 'violence' },
    { word: '打死', language: 'zh-CN', category: 'violence' },
    { word: '爆炸', language: 'zh-CN', category: 'violence' },
    { word: '炸弹', language: 'zh-CN', category: 'violence' },
    { word: '恐怖', language: 'zh-CN', category: 'violence' },
    { word: '屠杀', language: 'zh-CN', category: 'violence' },
    { word: '虐待', language: 'zh-CN', category: 'violence' },
    { word: '绑架', language: 'zh-CN', category: 'violence' },
    { word: '强奸', language: 'zh-CN', category: 'violence' },
    { word: '轮奸', language: 'zh-CN', category: 'violence' },
    { word: '血洗', language: 'zh-CN', category: 'violence' },

    // 色情
    { word: '做爱', language: 'zh-CN', category: 'sexual' },
    { word: '性交', language: 'zh-CN', category: 'sexual' },
    { word: '淫荡', language: 'zh-CN', category: 'sexual' },
    { word: '色情', language: 'zh-CN', category: 'sexual' },
    { word: '黄色', language: 'zh-CN', category: 'sexual' },
    { word: '裸体', language: 'zh-CN', category: 'sexual' },
    { word: '脱衣', language: 'zh-CN', category: 'sexual' },
    { word: '嫖娼', language: 'zh-CN', category: 'sexual' },
    { word: '卖淫', language: 'zh-CN', category: 'sexual' },
    { word: 'AV', language: 'zh-CN', category: 'sexual' },

    // 政治敏感
    { word: '法轮功', language: 'zh-CN', category: 'politics' },
    { word: '六四', language: 'zh-CN', category: 'politics' },
    { word: '天安门', language: 'zh-CN', category: 'politics' },
    { word: '反共', language: 'zh-CN', category: 'politics' },
    { word: '推翻', language: 'zh-CN', category: 'politics' },
    { word: '暴动', language: 'zh-CN', category: 'politics' },
    { word: '游行', language: 'zh-CN', category: 'politics' },
    { word: '颠覆', language: 'zh-CN', category: 'politics' },
    { word: '台独', language: 'zh-CN', category: 'politics' },
    { word: '疆独', language: 'zh-CN', category: 'politics' },

    // 宗教亵渎（注意：这是跨信仰平台，重点防止攻击性内容）
    { word: '伪先知', language: 'zh-CN', category: 'religion_abuse' },
    { word: '邪教', language: 'zh-CN', category: 'religion_abuse' },
    { word: '迷信', language: 'zh-CN', category: 'religion_abuse' },
    { word: '神棍', language: 'zh-CN', category: 'religion_abuse' },

    // 垃圾信息
    { word: '加微信', language: 'zh-CN', category: 'spam' },
    { word: '加QQ', language: 'zh-CN', category: 'spam' },
    { word: '兼职', language: 'zh-CN', category: 'spam' },
    { word: '赚钱', language: 'zh-CN', category: 'spam' },
    { word: '中奖', language: 'zh-CN', category: 'spam' },
    { word: '免费送', language: 'zh-CN', category: 'spam' },
    { word: '刷单', language: 'zh-CN', category: 'spam' },
    { word: '代练', language: 'zh-CN', category: 'spam' },
  ],

  // 英语
  'en-US': [
    // Profanity
    { word: 'fuck', language: 'en-US', category: 'profanity', variants: ['f**k', 'fck', 'phuck'] },
    { word: 'shit', language: 'en-US', category: 'profanity', variants: ['sh*t', 'sht'] },
    { word: 'damn', language: 'en-US', category: 'profanity', variants: ['d*mn', 'dam'] },
    { word: 'asshole', language: 'en-US', category: 'profanity', variants: ['a**hole', 'ass'] },
    { word: 'bitch', language: 'en-US', category: 'profanity', variants: ['b*tch', 'biatch'] },
    { word: 'bastard', language: 'en-US', category: 'profanity' },
    { word: 'dick', language: 'en-US', category: 'profanity', variants: ['d*ck'] },
    { word: 'pussy', language: 'en-US', category: 'profanity' },
    { word: 'cunt', language: 'en-US', category: 'profanity', variants: ['c*nt'] },
    { word: 'whore', language: 'en-US', category: 'profanity' },
    { word: 'slut', language: 'en-US', category: 'profanity' },
    { word: 'motherfucker', language: 'en-US', category: 'profanity', variants: ['motherf*cker', 'mf'] },

    // Drug
    { word: 'cocaine', language: 'en-US', category: 'drug', variants: ['coke'] },
    { word: 'heroin', language: 'en-US', category: 'drug', variants: ['smack', 'dope'] },
    { word: 'meth', language: 'en-US', category: 'drug', variants: ['methamphetamine', 'crystal'] },
    { word: 'ecstasy', language: 'en-US', category: 'drug', variants: ['mdma', 'molly', 'x'] },
    { word: 'lsd', language: 'en-US', category: 'drug', variants: ['acid'] },
    { word: 'marijuana', language: 'en-US', category: 'drug', variants: ['weed', 'pot', 'cannabis'] },
    { word: 'crack', language: 'en-US', category: 'drug' },
    { word: 'drug dealer', language: 'en-US', category: 'drug' },
    { word: 'get high', language: 'en-US', category: 'drug' },
    { word: 'overdose', language: 'en-US', category: 'drug' },

    // Violence
    { word: 'kill', language: 'en-US', category: 'violence', variants: ['murder', 'slaughter'] },
    { word: 'terrorist', language: 'en-US', category: 'violence', variants: ['terrorism'] },
    { word: 'bomb', language: 'en-US', category: 'violence' },
    { word: 'explode', language: 'en-US', category: 'violence', variants: ['explosion'] },
    { word: 'massacre', language: 'en-US', category: 'violence' },
    { word: 'rape', language: 'en-US', category: 'violence', variants: ['sexual assault'] },
    { word: 'torture', language: 'en-US', category: 'violence' },
    { word: 'kidnap', language: 'en-US', category: 'violence', variants: ['abduct'] },
    { word: 'assassinate', language: 'en-US', category: 'violence' },
    { word: 'murder', language: 'en-US', category: 'violence' },

    // Sexual
    { word: 'porn', language: 'en-US', category: 'sexual', variants: ['pornography', 'porno'] },
    { word: 'naked', language: 'en-US', category: 'sexual', variants: ['nude'] },
    { word: 'sex', language: 'en-US', category: 'sexual', variants: ['intercourse'] },
    { word: 'hooker', language: 'en-US', category: 'sexual', variants: ['prostitute'] },
    { word: 'escort', language: 'en-US', category: 'sexual' },
    { word: 'erotic', language: 'en-US', category: 'sexual' },
    { word: 'xxx', language: 'en-US', category: 'sexual' },
    { word: 'adult video', language: 'en-US', category: 'sexual' },
    { word: 'strip', language: 'en-US', category: 'sexual' },
    { word: 'nude', language: 'en-US', category: 'sexual' },

    // Politics
    { word: 'revolution', language: 'en-US', category: 'politics' },
    { word: 'overthrow', language: 'en-US', category: 'politics' },
    { word: 'coup', language: 'en-US', category: 'politics' },
    { word: 'protest', language: 'en-US', category: 'politics' },
    { word: 'riot', language: 'en-US', category: 'politics' },
    { word: 'insurrection', language: 'en-US', category: 'politics' },
    { word: 'terrorist', language: 'en-US', category: 'politics' },
    { word: 'extremist', language: 'en-US', category: 'politics' },

    // Religion Abuse
    { word: 'false prophet', language: 'en-US', category: 'religion_abuse' },
    { word: 'cult', language: 'en-US', category: 'religion_abuse' },
    { word: 'heretic', language: 'en-US', category: 'religion_abuse' },
    { word: 'blasphemy', language: 'en-US', category: 'religion_abuse' },

    // Spam
    { word: 'add me', language: 'en-US', category: 'spam', variants: ['add on whatsapp', 'add on telegram'] },
    { word: 'make money', language: 'en-US', category: 'spam' },
    { word: 'get rich', language: 'en-US', category: 'spam' },
    { word: 'win prize', language: 'en-US', category: 'spam' },
    { word: 'free gift', language: 'en-US', category: 'spam' },
    { word: 'click here', language: 'en-US', category: 'spam' },
    { word: 'buy followers', language: 'en-US', category: 'spam' },
    { word: 'crypto scam', language: 'en-US', category: 'spam' },
  ],

  // 法语
  'fr-FR': [
    // Profanity
    { word: 'putain', language: 'fr-FR', category: 'profanity', variants: ['pute', 'ptn'] },
    { word: 'merde', language: 'fr-FR', category: 'profanity', variants: ['mrd'] },
    { word: 'con', language: 'fr-FR', category: 'profanity', variants: ['connard', 'conne'] },
    { word: 'salope', language: 'fr-FR', category: 'profanity', variants: ['slp'] },
    { word: 'enculé', language: 'fr-FR', category: 'profanity', variants: ['enfoncé'] },
    { word: 'bite', language: 'fr-FR', category: 'profanity' },
    { word: 'cul', language: 'fr-FR', category: 'profanity' },
    { word: 'chier', language: 'fr-FR', category: 'profanity' },
    { word: 'foutre', language: 'fr-FR', category: 'profanity' },
    { word: 'bordel', language: 'fr-FR', category: 'profanity', variants: ['bdl'] },

    // Drug
    { word: 'cocaïne', language: 'fr-FR', category: 'drug', variants: ['coca', 'coke'] },
    { word: 'héroïne', language: 'fr-FR', category: 'drug', variants: ['héro', 'smack'] },
    { word: 'ecstasy', language: 'fr-FR', category: 'drug', variants: ['mdma', 'xtc'] },
    { word: 'cannabis', language: 'fr-FR', category: 'drug', variants: ['herbe', 'weed', 'beuh'] },
    { word: 'crack', language: 'fr-FR', category: 'drug' },
    { word: 'drogue', language: 'fr-FR', category: 'drug' },
    { word: 'dealer', language: 'fr-FR', category: 'drug' },

    // Violence
    { word: 'tuer', language: 'fr-FR', category: 'violence', variants: ['assassiner', 'meurtrier'] },
    { word: 'terroriste', language: 'fr-FR', category: 'violence' },
    { word: 'bombe', language: 'fr-FR', category: 'violence' },
    { word: 'viol', language: 'fr-FR', category: 'violence' },
    { word: 'torture', language: 'fr-FR', category: 'violence' },
    { word: 'enlever', language: 'fr-FR', category: 'violence', variants: ['kidnapper'] },
    { word: 'massacre', language: 'fr-FR', category: 'violence' },

    // Sexual
    { word: 'porno', language: 'fr-FR', category: 'sexual', variants: ['porn'] },
    { word: 'nu', language: 'fr-FR', category: 'sexual', variants: ['nue'] },
    { word: 'sexe', language: 'fr-FR', category: 'sexual' },
    { word: 'prostituée', language: 'fr-FR', category: 'sexual', variants: ['pute', 'poule'] },
    { word: 'strip-tease', language: 'fr-FR', category: 'sexual' },

    // Politics
    { word: 'révolution', language: 'fr-FR', category: 'politics' },
    { word: 'coup', language: 'fr-FR', category: 'politics' },
    { word: 'émeute', language: 'fr-FR', category: 'politics', variants: ['riot'] },
    { word: 'protestation', language: 'fr-FR', category: 'politics' },

    // Religion Abuse
    { word: 'faux prophète', language: 'fr-FR', category: 'religion_abuse' },
    { word: 'secte', language: 'fr-FR', category: 'religion_abuse' },
    { word: 'hérétique', language: 'fr-FR', category: 'religion_abuse' },

    // Spam
    { word: 'ajoute-moi', language: 'fr-FR', category: 'spam', variants: ['ajoute moi'] },
    { word: 'gagner argent', language: 'fr-FR', category: 'spam' },
    { word: 'cadeau gratuit', language: 'fr-FR', category: 'spam' },
  ],

  // 西班牙语
  'es-ES': [
    // Profanity
    { word: 'puta', language: 'es-ES', category: 'profanity', variants: ['puto', 'putos'] },
    { word: 'mierda', language: 'es-ES', category: 'profanity', variants: ['mierdas'] },
    { word: 'joder', language: 'es-ES', category: 'profanity', variants: ['jodido'] },
    { word: 'coño', language: 'es-ES', category: 'profanity' },
    { word: 'polla', language: 'es-ES', category: 'profanity' },
    { word: 'pendejo', language: 'es-ES', category: 'profanity', variants: ['pendeja'] },
    { word: 'cabrón', language: 'es-ES', category: 'profanity', variants: ['cabrona'] },
    { word: 'hijo de puta', language: 'es-ES', category: 'profanity', variants: ['hdp'] },
    { word: 'gilipollas', language: 'es-ES', category: 'profanity' },
    { word: 'zorra', language: 'es-ES', category: 'profanity' },

    // Drug
    { word: 'cocaína', language: 'es-ES', category: 'drug', variants: ['coca'] },
    { word: 'heroína', language: 'es-ES', category: 'drug', variants: ['hero'] },
    { word: 'éxtasis', language: 'es-ES', category: 'drug', variants: ['xtc', 'pastillas'] },
    { word: 'marihuana', language: 'es-ES', category: 'drug', variants: ['mota', 'yerba', 'weed'] },
    { word: 'crack', language: 'es-ES', category: 'drug' },
    { word: 'droga', language: 'es-ES', category: 'drug' },
    { word: 'narcotraficante', language: 'es-ES', category: 'drug', variants: ['narco'] },

    // Violence
    { word: 'matar', language: 'es-ES', category: 'violence', variants: ['asesinar', 'asesino'] },
    { word: 'terrorista', language: 'es-ES', category: 'violence' },
    { word: 'bomba', language: 'es-ES', category: 'violence' },
    { word: 'violación', language: 'es-ES', category: 'violence', variants: ['violar'] },
    { word: 'tortura', language: 'es-ES', category: 'violence' },
    { word: 'secuestro', language: 'es-ES', category: 'violence', variants: ['secuestrar'] },
    { word: 'masacre', language: 'es-ES', category: 'violence' },

    // Sexual
    { word: 'porno', language: 'es-ES', category: 'sexual', variants: ['pornografía'] },
    { word: 'desnudo', language: 'es-ES', category: 'sexual', variants: ['desnuda'] },
    { word: 'sexo', language: 'es-ES', category: 'sexual' },
    { word: 'prostituta', language: 'es-ES', category: 'sexual', variants: ['puta'] },
    { word: 'striptease', language: 'es-ES', category: 'sexual' },

    // Politics
    { word: 'revolución', language: 'es-ES', category: 'politics' },
    { word: 'golpe', language: 'es-ES', category: 'politics', variants: ['golpe de estado'] },
    { word: 'disturbio', language: 'es-ES', category: 'politics', variants: ['motín'] },
    { word: 'protesta', language: 'es-ES', category: 'politics' },

    // Religion Abuse
    { word: 'falso profeta', language: 'es-ES', category: 'religion_abuse' },
    { word: 'secta', language: 'es-ES', category: 'religion_abuse' },
    { word: 'hereje', language: 'es-ES', category: 'religion_abuse' },

    // Spam
    { word: 'añádeme', language: 'es-ES', category: 'spam', variants: ['agregame'] },
    { word: 'ganar dinero', language: 'es-ES', category: 'spam' },
    { word: 'regalo gratis', language: 'es-ES', category: 'spam' },
  ],

  // 俄语
  'ru-RU': [
    // Profanity
    { word: 'блядь', language: 'ru-RU', category: 'profanity', variants: ['бля', 'блядь'] },
    { word: 'пизда', language: 'ru-RU', category: 'profanity', variants: ['пизду'] },
    { word: 'хуй', language: 'ru-RU', category: 'profanity', variants: ['хуе', 'хуя'] },
    { word: 'ебать', language: 'ru-RU', category: 'profanity', variants: ['ебать'] },
    { word: 'сучка', language: 'ru-RU', category: 'profanity', variants: ['сука'] },
    { word: 'гандон', language: 'ru-RU', category: 'profanity', variants: ['презерватив'] },
    { word: 'пидор', language: 'ru-RU', category: 'profanity', variants: ['пидор'] },
    { word: 'нахер', language: 'ru-RU', category: 'profanity', variants: ['нахер'] },
    { word: 'дерьмо', language: 'ru-RU', category: 'profanity', variants: ['дерьмо'] },

    // Drug
    { word: 'кокаин', language: 'ru-RU', category: 'drug', variants: ['кокаин'] },
    { word: 'героин', language: 'ru-RU', category: 'drug', variants: ['героин'] },
    { word: 'метадон', language: 'ru-RU', category: 'drug', variants: ['метадон'] },
    { word: 'экстази', language: 'ru-RU', category: 'drug', variants: ['экстази'] },
    { word: 'марихуана', language: 'ru-RU', category: 'drug', variants: ['травка', 'план'] },
    { word: 'наркотик', language: 'ru-RU', category: 'drug', variants: ['наркотики'] },
    { word: 'дилер', language: 'ru-RU', category: 'drug', variants: ['торговец'] },

    // Violence
    { word: 'убить', language: 'ru-RU', category: 'violence', variants: ['убийство', 'убийца'] },
    { word: 'террорист', language: 'ru-RU', category: 'violence', variants: ['террорист'] },
    { word: 'бомба', language: 'ru-RU', category: 'violence', variants: ['бомба'] },
    { word: 'изнасилование', language: 'ru-RU', category: 'violence', variants: ['изнасиловать'] },
    { word: 'пытки', language: 'ru-RU', category: 'violence', variants: ['пытать'] },
    { word: 'похищение', language: 'ru-RU', category: 'violence', variants: ['похитить'] },
    { word: 'резня', language: 'ru-RU', category: 'violence', variants: ['резня'] },

    // Sexual
    { word: 'порно', language: 'ru-RU', category: 'sexual', variants: ['порнография'] },
    { word: 'голый', language: 'ru-RU', category: 'sexual', variants: ['голая'] },
    { word: 'секс', language: 'ru-RU', category: 'sexual' },
    { word: 'проститутка', language: 'ru-RU', category: 'sexual', variants: ['шлюха'] },
    { word: 'стриптиз', language: 'ru-RU', category: 'sexual' },

    // Politics
    { word: 'революция', language: 'ru-RU', category: 'politics', variants: ['революция'] },
    { word: 'переворот', language: 'ru-RU', category: 'politics', variants: ['переворот'] },
    { word: 'бунт', language: 'ru-RU', category: 'politics', variants: ['бунт'] },
    { word: 'протест', language: 'ru-RU', category: 'politics', variants: ['протест'] },

    // Religion Abuse
    { word: 'ложный пророк', language: 'ru-RU', category: 'religion_abuse' },
    { word: 'секта', language: 'ru-RU', category: 'religion_abuse' },
    { word: 'еретик', language: 'ru-RU', category: 'religion_abuse' },

    // Spam
    { word: 'добавь меня', language: 'ru-RU', category: 'spam', variants: ['добавь меня'] },
    { word: 'заработок', language: 'ru-RU', category: 'spam', variants: ['заработать'] },
    { word: 'бесплатный', language: 'ru-RU', category: 'spam', variants: ['бесплатно'] },
  ],

  // 通用（所有语言）
  'all': [],
};

// 缓存的数据库违规词列表
let cachedDatabaseWords: BannedWord[] | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30分钟缓存

// ============================================
// 工具函数
// ============================================

/**
 * 简体中文转繁体中文
 */
function convertToTraditional(text: string): string {
  const simpleToTraditional: Record<string, string> = {
    '傻逼': '傻逼', '妈逼': '媽逼', '操你妈': '操你媽', '垃圾': '垃圾',
    '婊子': '婊子', '贱人': '賤人', '神经病': '神經病', '脑残': '腦殘',
  };
  let result = text;
  for (const [simple, traditional] of Object.entries(simpleToTraditional)) {
    result = result.replace(new RegExp(simple, 'g'), traditional);
  }
  return result;
}

/**
 * 规范化文本（去除变体、符号等）
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff]/g, '') // 移除特殊字符，保留中文字符
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 检查是否包含违规词
 */
function containsBannedWord(text: string, bannedWord: BannedWord): boolean {
  const normalizedText = normalizeText(text);
  const normalizedWord = normalizeText(bannedWord.word);
  const normalizedVariants = (bannedWord.variants || []).map(normalizeText);

  // 检查主词
  if (normalizedText.includes(normalizedWord)) {
    return true;
  }

  // 检查变体
  for (const variant of normalizedVariants) {
    if (normalizedText.includes(variant)) {
      return true;
    }
  }

  // 中文检查简繁体
  if (bannedWord.language === 'zh-CN' || bannedWord.language === 'all') {
    const traditionalText = convertToTraditional(text);
    if (traditionalText.includes(bannedWord.word)) {
      return true;
    }
  }

  return false;
}

// ============================================
// 主要函数
// ============================================

/**
 * 从数据库加载违规词列表
 */
export async function loadBannedWordsFromDatabase(supabaseUrl: string): Promise<void> {
  const now = Date.now();

  // 如果缓存未过期，直接返回
  if (cachedDatabaseWords && (now - lastFetchTime) < CACHE_DURATION) {
    return;
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/banned_words?select=*`, {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE',
      },
    });

    if (res.ok) {
      const data = await res.json();
      cachedDatabaseWords = Array.isArray(data) ? data.map((item: any) => ({
        word: item.word,
        language: item.language || 'all',
        category: item.category,
        variants: item.variants || [],
      })) : [];
      lastFetchTime = now;
    }
  } catch (error) {
    console.error('[BadWordFilter] Failed to load from database:', error);
  }
}

/**
 * 获取指定语言的违规词列表
 */
export function getBannedWords(language: string): BannedWord[] {
  const words: BannedWord[] = [];

  // 添加内置列表
  if (BANNED_WORDS_DB[language]) {
    words.push(...BANNED_WORDS_DB[language]);
  }

  // 添加通用列表
  if (BANNED_WORDS_DB['all']) {
    words.push(...BANNED_WORDS_DB['all']);
  }

  // 添加数据库列表（只匹配相同语言或 'all'）
  if (cachedDatabaseWords) {
    words.push(...cachedDatabaseWords.filter(w => w.language === language || w.language === 'all'));
  }

  return words;
}

/**
 * 检查文本是否包含违规词
 */
export function checkBadWords(
  text: string,
  language: string,
  options?: { highlight?: boolean }
): FilterResult {
  if (!text || text.trim().length === 0) {
    return { hasViolation: false };
  }

  const words = getBannedWords(language);
  const foundWords: string[] = [];
  const categories = new Set<string>();

  for (const bannedWord of words) {
    if (containsBannedWord(text, bannedWord)) {
      foundWords.push(bannedWord.word);
      categories.add(bannedWord.category);
    }
  }

  if (foundWords.length === 0) {
    return { hasViolation: false };
  }

  const category = Array.from(categories)[0];

  // 友好的提示信息
  const messages: Record<string, string> = {
    profanity: '内容包含不当词汇，请文明用语',
    insult: '内容包含攻击性语言，请友善交流',
    drug: '内容包含违禁词汇，禁止讨论毒品相关内容',
    violence: '内容包含暴力词汇，禁止发布暴力内容',
    sexual: '内容包含不当内容，请遵守社区规范',
    politics: '内容包含敏感词汇，请避免政治相关话题',
    religion_abuse: '内容包含宗教不当言论，请尊重不同信仰',
    spam: '内容疑似垃圾信息，请勿发布广告',
  };

  return {
    hasViolation: true,
    category,
    words: foundWords,
    message: messages[category] || '内容包含违规词汇，请修改后重新发送',
  };
}

/**
 * 高亮显示违规词（可选）
 */
export function highlightBadWords(text: string, language: string): string {
  const result = checkBadWords(text, language);
  if (!result.hasViolation || !result.words) {
    return text;
  }

  let highlightedText = text;
  for (const word of result.words) {
    const regex = new RegExp(`(${word})`, 'gi');
    highlightedText = highlightedText.replace(regex, '<mark class="bg-red-200 text-red-800">$1</mark>');
  }

  return highlightedText;
}

/**
 * 从文本中移除违规词（用 * 替换）
 */
export function maskBadWords(text: string, language: string): string {
  const result = checkBadWords(text, language);
  if (!result.hasViolation || !result.words) {
    return text;
  }

  let maskedText = text;
  for (const word of result.words) {
    const regex = new RegExp(`(${word})`, 'gi');
    maskedText = maskedText.replace(regex, '*'.repeat(word.length));
  }

  return maskedText;
}

// ============================================
// React Hook（用于前端组件）
// ============================================

import { useEffect, useState } from 'react';

export function useBadWordFilter(supabaseUrl: string) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadBannedWordsFromDatabase(supabaseUrl).then(() => {
      setIsLoaded(true);
    });
  }, [supabaseUrl]);

  return {
    isLoaded,
    check: (text: string, language: string) => checkBadWords(text, language),
    highlight: (text: string, language: string) => highlightBadWords(text, language),
    mask: (text: string, language: string) => maskBadWords(text, language),
  };
}