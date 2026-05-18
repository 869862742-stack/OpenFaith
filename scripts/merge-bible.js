/**
 * 合并圣经66卷为一本书
 * 将创世记、出埃及记等66卷合并为1本书"圣经"
 */

const SUPABASE_URL = 'https://rdhwmeittgdosmkxtpak.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

const authHeaders = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json'
};

// 圣经66卷的顺序（旧约39卷 + 新约27卷）
const BIBLE_BOOKS_ORDER = [
  // 旧约39卷
  '创世记', '出埃及记', '利未记', '民数记', '申命记',
  '约书亚记', '士师记', '路得记', '撒母耳记上', '撒母耳记下',
  '列王纪上', '列王纪下', '历代志上', '历代志下', '以斯拉记',
  '尼希米记', '以斯帖记', '约伯记', '诗篇', '箴言',
  '传道书', '雅歌', '以赛亚书', '耶利米书', '耶利米哀歌',
  '以西结书', '但以理书', '何西阿书', '约珥书', '阿摩司书',
  '俄巴底亚书', '约拿书', '弥迦书', '那鸿书', '哈巴谷书',
  '西番雅书', '哈该书', '撒迦利亚书', '玛拉基书',
  // 新约27卷
  '马太福音', '马可福音', '路加福音', '约翰福音', '使徒行传',
  '罗马书', '哥林多前书', '哥林多后书', '加拉太书', '以弗所书',
  '腓立比书', '歌罗西书', '帖撒罗尼迦前书', '帖撒罗尼迦后书', '提摩太前书',
  '提摩太后书', '提多书', '腓利门书', '希伯来书', '雅各书',
  '彼得前书', '彼得后书', '约翰一书', '约翰二书', '约翰三书',
  '犹大书', '启示录'
];

// 不动的书籍ID（荒漠甘泉、馨香的没药）
const PROTECTED_BOOKS = [
  '55aa5618-4f6c-436a-addb-6f266551ac24',
  'cd85fc10-a790-4fad-9f1e-4ef14721dcbf'
];

async function apiRequest(endpoint, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    ...options,
    headers: { ...authHeaders, ...options.headers }
  });
  
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error: ${res.status} - ${text}`);
  }
  
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}

async function main() {
  console.log('🚀 开始合并圣经66卷...\n');
  
  // 1. 获取所有书籍
  console.log('📚 获取书籍列表...');
  const books = await apiRequest('books?select=*&order=title.asc');
  console.log(`   共 ${books.length} 本书\n`);
  
  // 2. 找出圣经书籍（排除荒漠甘泉、馨香的没药）
  const bibleBooks = books.filter(b => {
    const isBible = BIBLE_BOOKS_ORDER.includes(b.title);
    const isProtected = PROTECTED_BOOKS.includes(b.id);
    return isBible && !isProtected;
  });
  
  console.log(`📖 找到 ${bibleBooks.length} 本圣经书\n`);
  
  // 3. 创建新的"圣经"书
  console.log('✨ 创建新书 "圣经"...');
  const newBibleId = crypto.randomUUID();
  const now = new Date().toISOString();
  
  await apiRequest('books', {
    method: 'POST',
    body: JSON.stringify([{
      id: newBibleId,
      title: '圣经',
      religion: '基督教',
      category: '经典',
      description: '圣经和合本（简体完整版）- 旧约39卷+新约27卷',
      status: 'published',
      sort_order: 1,
      created_at: now,
      updated_at: now
    }])
  });
  console.log(`   新书ID: ${newBibleId}\n`);
  
  // 4. 按顺序处理每本圣经书
  let totalChapters = 0;
  
  for (const bookTitle of BIBLE_BOOKS_ORDER) {
    const oldBook = bibleBooks.find(b => b.title === bookTitle);
    if (!oldBook) {
      console.log(`⚠️  未找到: ${bookTitle}，跳过`);
      continue;
    }
    
    // 获取该书的所有章节
    const chapters = await apiRequest(`chapters?book_id=eq.${oldBook.id}&select=*&order=number.asc`);
    
    if (chapters.length === 0) {
      console.log(`📄 ${bookTitle}: 无章节，跳过`);
      continue;
    }
    
    console.log(`📄 ${bookTitle}: ${chapters.length} 章`);
    
    // 更新每个章节的 book_id 和 volume
    for (const ch of chapters) {
      await apiRequest(`chapters?id=eq.${ch.id}`, {
        method: 'PATCH',
        body: JSON.stringify([{
          book_id: newBibleId,
          volume: bookTitle,
          updated_at: now
        }])
      });
    }
    
    totalChapters += chapters.length;
    
    // 删除旧书
    await apiRequest(`books?id=eq.${oldBook.id}`, { method: 'DELETE' });
  }
  
  console.log(`\n✅ 合并完成！`);
  console.log(`   新书ID: ${newBibleId}`);
  console.log(`   总章节数: ${totalChapters}`);
  console.log(`   已删除 ${bibleBooks.length} 本旧书`);
  
  // 5. 验证结果
  console.log('\n🔍 验证结果...');
  const newChapters = await apiRequest(`chapters?book_id=eq.${newBibleId}&select=volume&order=id.asc&limit=5`);
  const allChapters = await apiRequest(`chapters?book_id=eq.${newBibleId}&select=id,volume`);
  
  // 统计各卷章节数
  const volumeCounts = {};
  allChapters.forEach(ch => {
    volumeCounts[ch.volume] = (volumeCounts[ch.volume] || 0) + 1;
  });
  
  console.log('\n📊 各卷章节数:');
  for (const [vol, count] of Object.entries(volumeCounts)) {
    console.log(`   ${vol}: ${count} 章`);
  }
  
  console.log(`\n总计: ${allChapters.length} 章\n`);
}

main().catch(console.error);
