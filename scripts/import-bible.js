/**
 * 从 data.json 重新导入并合并圣经
 */

const fs = require('fs');
const SUPABASE_URL = 'https://rdhwmeittgdosmkxtpak.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkaHdtZWl0dGdkb3Nta3h0cGFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODEzMjQ5MiwiZXhwIjoyMDkzNzA4NDkyfQ.bPatiu7NXaE2k48aTkjAGQsba6NzXlIdq2k_gGLYLBE';

const authHeaders = {
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json'
};

// 圣经66卷顺序
const BIBLE_BOOKS_ORDER = [
  '创世记', '出埃及记', '利未记', '民数记', '申命记',
  '约书亚记', '士师记', '路得记', '撒母耳记上', '撒母耳记下',
  '列王纪上', '列王纪下', '历代志上', '历代志下', '以斯拉记',
  '尼希米记', '以斯帖记', '约伯记', '诗篇', '箴言',
  '传道书', '雅歌', '以赛亚书', '耶利米书', '耶利米哀歌',
  '以西结书', '但以理书', '何西阿书', '约珥书', '阿摩司书',
  '俄巴底亚书', '约拿书', '弥迦书', '那鸿书', '哈巴谷书',
  '西番雅书', '哈该书', '撒迦利亚书', '玛拉基书',
  '马太福音', '马可福音', '路加福音', '约翰福音', '使徒行传',
  '罗马书', '哥林多前书', '哥林多后书', '加拉太书', '以弗所书',
  '腓立比书', '歌罗西书', '帖撒罗尼迦前书', '帖撒罗尼迦后书', '提摩太前书',
  '提摩太后书', '提多书', '腓利门书', '希伯来书', '雅各书',
  '彼得前书', '彼得后书', '约翰一书', '约翰二书', '约翰三书',
  '犹大书', '启示录'
];

const PROTECTED_BOOKS = ['荒漠甘泉', '馨香的没药'];

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
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function genId() {
  return crypto.randomUUID();
}

async function main() {
  console.log('📖 开始导入并合并圣经...\n');

  // 1. 加载 data.json
  console.log('📁 加载 data.json...');
  const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
  const booksData = data.books;
  const chaptersData = data.chapters || {};
  console.log(`   共有 ${Object.keys(booksData).length} 本书, ${Object.keys(chaptersData).length} 章\n`);

  // 2. 筛选圣经书籍并建立 ID 映射
  const bibleBooks = {};
  const bibleBookIds = {}; // title -> id
  
  for (const [id, book] of Object.entries(booksData)) {
    if (BIBLE_BOOKS_ORDER.includes(book.title) && !PROTECTED_BOOKS.includes(book.title)) {
      bibleBooks[id] = book;
      bibleBookIds[book.title] = id;
    }
  }
  
  console.log(`📕 找到 ${Object.keys(bibleBooks).length} 本圣经书\n`);

  // 3. 统计章节数
  let totalChapters = 0;
  for (const [chId, ch] of Object.entries(chaptersData)) {
    if (bibleBookIds[ch.book_id]) {
      totalChapters++;
    }
  }
  console.log(`   共有 ${totalChapters} 章\n`);

  // 3. 创建新的"圣经"书
  console.log('✨ 创建新书 "圣经"...');
  const newBibleId = genId();
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

  // 4. 按顺序导入章节
  console.log('📝 导入章节...');
  let importedChapters = 0;
  
  for (const bookTitle of BIBLE_BOOKS_ORDER) {
    const bookId = bibleBookIds[bookTitle];
    if (!bookId) {
      console.log(`⚠️  未找到: ${bookTitle}`);
      continue;
    }
    
    // 获取该书的所有章节
    const bookChapters = [];
    for (const [chId, ch] of Object.entries(chaptersData)) {
      if (ch.book_id === bookId) {
        bookChapters.push(ch);
      }
    }
    
    if (bookChapters.length === 0) {
      console.log(`📄 ${bookTitle}: 无章节`);
      continue;
    }
    
    // 按 number 排序
    bookChapters.sort((a, b) => (a.number || 0) - (b.number || 0));
    
    // 批量创建章节
    const chapterRecords = bookChapters.map((ch, idx) => ({
      id: genId(),
      book_id: newBibleId,
      number: idx + 1,
      title: ch.title || `第${idx + 1}章`,
      content: ch.content || '',
      volume: bookTitle,
      status: 'published',
      created_at: now,
      updated_at: now
    }));
    
    // 分批插入（每批100条）
    const batchSize = 100;
    for (let i = 0; i < chapterRecords.length; i += batchSize) {
      const batch = chapterRecords.slice(i, i + batchSize);
      await apiRequest('chapters', {
        method: 'POST',
        body: JSON.stringify(batch)
      });
    }
    
    console.log(`✅ ${bookTitle}: ${bookChapters.length} 章`);
    importedChapters += bookChapters.length;
  }

  console.log(`\n📊 总共导入 ${importedChapters} 章`);

  // 5. 验证结果
  console.log('\n🔍 验证结果...');
  const result = await apiRequest(`chapters?book_id=eq.${newBibleId}&select=volume`);
  const chapterCount = Array.isArray(result) ? result.length : 0;
  
  // 统计各卷
  const volumeCounts = {};
  if (Array.isArray(result)) {
    result.forEach(ch => {
      if (ch.volume) {
        volumeCounts[ch.volume] = (volumeCounts[ch.volume] || 0) + 1;
      }
    });
  }
  
  console.log('\n📊 各卷章节数:');
  for (const [vol, count] of Object.entries(volumeCounts)) {
    console.log(`   ${vol}: ${count} 章`);
  }
  
  console.log(`\n✅ 合并完成！`);
  console.log(`   新书ID: ${newBibleId}`);
  console.log(`   总章节数: ${chapterCount}`);
}

main().catch(console.error);
