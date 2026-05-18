/**
 * 合并圣经66卷为一本书 - 优化版
 * 使用批量操作提高效率
 */

const SUPABASE_URL = 'https://rdhwmeittgdosmkxtpak.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

const authHeaders = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'  // 减少响应
};

// 圣经66卷的顺序
const BIBLE_BOOKS_ORDER = [
  '创世记', '出埃及记', '利未记', '民数记', '申命记',
  '约书亚记', '士师记', '路得记', '撒母耳记上', '撒母耳记下',
  '列王纪上', '列王纪下', '历代志上', '历代志下', '以斯拉记',
  '尼希米记', '以斯帖记', '约伯记', '诗篇', '箴言',
  '传道书', '雅歌', '以赛亚书', '耶利米书', '耶利米哀歌',
  '以西结书', '但以理书', '何西阿书', '约珥书', '阿摩司书',
  '俄巴底亚书', '约拿书', '弥迦书', '那鸿书', '哈巴底书',
  '西番雅书', '哈该书', '撒迦利亚书', '玛拉基书',
  '马太福音', '马可福音', '路加福音', '约翰福音', '使徒行传',
  '罗马书', '哥林多前书', '哥林多后书', '加拉太书', '以弗所书',
  '腓立比书', '歌罗西书', '帖撒罗尼迦前书', '帖撒罗尼迦后书', '提摩太前书',
  '提摩太后书', '提多书', '腓利门书', '希伯来书', '雅各书',
  '彼得前书', '彼得后书', '约翰一书', '约翰二书', '约翰三书',
  '犹大书', '启示录'
];

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
  if (!text || text === '') return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function main() {
  console.log('🚀 开始合并圣经66卷...\n');
  
  // 1. 获取所有书籍
  console.log('📚 获取书籍列表...');
  const books = await apiRequest('books?select=id,title&order=title.asc');
  console.log(`   共 ${books.length} 本书\n`);
  
  // 2. 找出圣经书籍
  const bibleBooks = books.filter(b => {
    const isBible = BIBLE_BOOKS_ORDER.includes(b.title);
    const isProtected = PROTECTED_BOOKS.includes(b.id);
    return isBible && !isProtected;
  });
  
  console.log(`📖 找到 ${bibleBooks.length} 本圣经书\n`);
  
  // 3. 创建新书
  console.log('✨ 创建新书 "圣经"...');
  const newBibleId = 'bible-merged-' + Date.now();
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
  
  // 4. 批量更新章节 - 按书名处理
  let totalChapters = 0;
  let oldBookIds = [];
  
  for (const bookTitle of BIBLE_BOOKS_ORDER) {
    const oldBook = bibleBooks.find(b => b.title === bookTitle);
    if (!oldBook) {
      console.log(`⚠️  未找到: ${bookTitle}`);
      continue;
    }
    
    // 获取章节数
    const chapters = await apiRequest(`chapters?book_id=eq.${oldBook.id}&select=id`);
    if (!chapters || chapters.length === 0) {
      console.log(`📄 ${bookTitle}: 无章节`);
      oldBookIds.push(oldBook.id);
      continue;
    }
    
    const chapterIds = chapters.map(ch => ch.id);
    
    // 批量更新 - 使用 where id=in
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/chapters?id=in.(${chapterIds.join(',')})`, {
      method: 'PATCH',
      headers: {
        ...authHeaders,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        book_id: newBibleId,
        volume: bookTitle
      })
    });
    
    if (updateRes.ok) {
      console.log(`✅ ${bookTitle}: ${chapters.length} 章`);
      totalChapters += chapters.length;
      oldBookIds.push(oldBook.id);
    } else {
      console.log(`❌ ${bookTitle}: 更新失败`);
    }
  }
  
  console.log(`\n📊 总章节数: ${totalChapters}`);
  
  // 5. 批量删除旧书
  console.log('\n🗑️  删除旧书...');
  if (oldBookIds.length > 0) {
    const deleteRes = await fetch(`${SUPABASE_URL}/rest/v1/books?id=in.(${oldBookIds.join(',')})`, {
      method: 'DELETE',
      headers: authHeaders
    });
    console.log(`   删除结果: ${deleteRes.ok ? '成功' : '失败'}`);
  }
  
  // 6. 验证
  console.log('\n🔍 验证结果...');
  const newBook = await apiRequest(`books?id=eq.${newBibleId}`);
  console.log(`   新书: ${newBook ? newBook.title : '未找到'}`);
  
  const chapterCount = await apiRequest(`chapters?book_id=eq.${newBibleId}&select=id`);
  console.log(`   章节总数: ${Array.isArray(chapterCount) ? chapterCount.length : 0}`);
  
  const remainingBooks = await apiRequest('books?select=id');
  console.log(`   剩余书籍数: ${Array.isArray(remainingBooks) ? remainingBooks.length : 0}`);
  
  console.log('\n✅ 合并完成！');
}

main().catch(console.error);
