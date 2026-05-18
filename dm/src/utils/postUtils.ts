/**
 * 群聊检测工具函数
 * 用于在 Supabase 查询后过滤掉群聊记录
 */

/**
 * 判断一个 post 是否是群聊
 * @param post - 帖子对象
 * @returns true 表示是群聊，false 表示是普通笔记
 */
export function isGroupChat(post: { tags?: string[] | null } | null | undefined): boolean {
  if (!post) return false;
  if (!post.tags) return false;
  // tags 是 jsonb 类型，可能是数组
  if (Array.isArray(post.tags)) {
    return post.tags.includes('__group_chat__');
  }
  return false;
}

/**
 * 过滤掉群聊，获取纯笔记列表
 * @param posts - 帖子列表
 * @returns 过滤后的笔记列表（不包含群聊）
 */
export function filterOutGroupChats<T extends { tags?: string[] | null }>(posts: T[]): T[] {
  if (!Array.isArray(posts)) return [];
  return posts.filter(post => !isGroupChat(post));
}

/**
 * 判断用户是否是群聊成员
 * @param post - 帖子对象
 * @param userId - 用户ID
 * @returns true 表示是群成员
 */
export function isGroupMember(post: { tags?: string[] | null } | null | undefined, userId: string | null | undefined): boolean {
  if (!post || !userId) return false;
  if (!post.tags) return false;
  if (Array.isArray(post.tags)) {
    return post.tags.includes(`member_${userId}`);
  }
  return false;
}