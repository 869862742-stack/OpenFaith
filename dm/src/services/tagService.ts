/**
 * Tag Service - 标签管理服务
 * 从 Supabase tags 表获取和管理标签
 */

import { cachedFetch } from '../utils/apiCache';

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

// 标签类型
export type TagType = 'identity' | 'homepage' | 'post' | 'group';

// 标签项
export interface Tag {
  id: string;
  name: string;
  type: TagType;
  icon?: string;
  sort_order: number;
  is_active: boolean;
}

// Fallback 数据（当 API 获取失败时使用）
const FALLBACK_TAGS: Record<TagType, string[]> = {
  identity: [
    '基督教', '伊斯兰教', '犹太教', '佛教', '印度教', '道教', '锡克教',
    '巴哈伊教', '摩门教', '耶和华见证人', '琐罗亚斯德教', '诺斯替',
    '卡巴拉', '神道教', '耆那教', '德鲁兹教', '约鲁巴教', '伏都教',
    '雅兹迪', '曼达安', '玛雅/阿兹特克', '毛利宗教', '天理教', '天道教',
    '高台教', '宗教研究者', '经文爱好者', '寻求者'
  ],
  homepage: [
    '基督教', '伊斯兰教', '犹太教', '佛教', '印度教', '道教', '锡克教',
    '巴哈伊教', '摩门教', '耶和华见证人', '琐罗亚斯德教', '诺斯替',
    '卡巴拉', '神道教', '耆那教', '德鲁兹教', '约鲁巴教', '伏都教',
    '雅兹迪', '曼达安', '玛雅/阿兹特克', '毛利宗教', '天理教', '天道教',
    '高台教'
  ],
  post: [
    '基督教', '伊斯兰教', '犹太教', '佛教', '印度教', '道教', '锡克教',
    '巴哈伊教', '摩门教', '耶和华见证人', '琐罗亚斯德教', '诺斯替',
    '卡巴拉', '神道教', '耆那教', '德鲁兹教', '约鲁巴教', '伏都教',
    '雅兹迪', '曼达安', '玛雅/阿兹特克', '毛利宗教', '天理教', '天道教',
    '高台教'
  ],
  group: [
    '基督教', '伊斯兰教', '犹太教', '佛教', '印度教', '道教', '锡克教',
    '巴哈伊教', '摩门教', '耶和华见证人', '琐罗亚斯德教', '诺斯替',
    '卡巴拉', '神道教', '耆那教', '德鲁兹教', '约鲁巴教', '伏都教',
    '雅兹迪', '曼达安', '玛雅/阿兹特克', '毛利宗教', '天理教', '天道教',
    '高台教'
  ],
};

// 本地缓存
const tagCache: Record<TagType, { data: Tag[]; timestamp: number }> = {
  identity: { data: [], timestamp: 0 },
  homepage: { data: [], timestamp: 0 },
  post: { data: [], timestamp: 0 },
  group: { data: [], timestamp: 0 },
};

// 缓存有效期：5分钟
const CACHE_TTL = 5 * 60 * 1000;

/**
 * 获取标签列表
 * @param type 标签类型
 * @param forceRefresh 是否强制刷新
 */
export async function getTags(type: TagType, forceRefresh = false): Promise<Tag[]> {
  const now = Date.now();
  const cached = tagCache[type];

  // 检查缓存是否有效
  if (!forceRefresh && cached.data.length > 0 && (now - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }

  try {
    const headers = {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    };

    const params = new URLSearchParams({
      type: `eq.${type}`,
      is_active: 'eq.true',
      select: '*',
      order: 'sort_order.asc',
    });

    const response = await cachedFetch(`/sb-api/rest/v1/tags?${params}`, { headers }, { ttl: 60000 });

    if (Array.isArray(response) && response.length > 0) {
      const tags: Tag[] = response.map((item: any) => ({
        id: item.id,
        name: item.name,
        type: item.type as TagType,
        icon: item.icon || getDefaultIcon(item.name),
        sort_order: item.sort_order || 0,
        is_active: item.is_active !== false,
      }));

      tagCache[type] = { data: tags, timestamp: now };
      return tags;
    }

    // API 返回空，使用 fallback
    return getFallbackTags(type);
  } catch (error) {
    console.error(`[TagService] Failed to fetch tags for type ${type}:`, error);
    // 出错时返回 fallback
    return getFallbackTags(type);
  }
}

/**
 * 获取标签名称列表（简化版）
 */
export async function getTagNames(type: TagType, forceRefresh = false): Promise<string[]> {
  const tags = await getTags(type, forceRefresh);
  if (tags.length > 0) {
    return tags.map(t => t.name);
  }
  return FALLBACK_TAGS[type];
}

/**
 * 获取单个标签
 */
export async function getTagByName(name: string, type: TagType): Promise<Tag | null> {
  const tags = await getTags(type);
  return tags.find(t => t.name === name) || null;
}

/**
 * 获取 fallback 标签
 */
function getFallbackTags(type: TagType): Tag[] {
  return FALLBACK_TAGS[type].map((name, index) => ({
    id: `fallback-${type}-${index}`,
    name,
    type,
    icon: getDefaultIcon(name),
    sort_order: index + 1,
    is_active: true,
  }));
}

/**
 * 根据名称获取默认图标
 */
function getDefaultIcon(name: string): string {
  const iconMap: Record<string, string> = {
    '基督教': '✝️',
    '伊斯兰教': '☪️',
    '犹太教': '✡️',
    '佛教': '☸️',
    '印度教': '🕉️',
    '道教': '☯️',
    '锡克教': '🏴',
    '巴哈伊教': '✦',
    '摩门教': '📿',
    '耶和华见证人': '📖',
    '琐罗亚斯德教': '🔥',
    '诺斯替': '☆',
    '卡巴拉': '🔮',
    '神道教': '⛩️',
    '耆那教': '☸️',
    '德鲁兹教': '🌙',
    '约鲁巴教': '🐍',
    '伏都教': '🦅',
    '雅兹迪': '👼',
    '曼达安': '⭐',
    '玛雅/阿兹特克': '🌵',
    '毛利宗教': '🌺',
    '天理教': '🌸',
    '天道教': '☀️',
    '高台教': '🌈',
    '宗教研究者': '🔍',
    '经文爱好者': '📚',
    '寻求者': '❓',
  };
  return iconMap[name] || '🏷️';
}

/**
 * 清除标签缓存
 */
export function clearTagCache(): void {
  Object.keys(tagCache).forEach(key => {
    tagCache[key as TagType] = { data: [], timestamp: 0 };
  });
}

/**
 * 清除指定类型的标签缓存
 */
export function clearTagCacheByType(type: TagType): void {
  tagCache[type] = { data: [], timestamp: 0 };
}

/**
 * 预加载所有类型的标签
 */
export async function preloadAllTags(): Promise<void> {
  const types: TagType[] = ['identity', 'homepage', 'post', 'group'];
  await Promise.all(types.map(type => getTags(type)));
}

export default {
  getTags,
  getTagNames,
  getTagByName,
  clearTagCache,
  clearTagCacheByType,
  preloadAllTags,
};
