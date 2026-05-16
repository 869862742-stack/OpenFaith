# OpenFaith 静默陪伴房间功能 - 手动执行说明

## 一、Supabase SQL 执行

### 1.1 执行方式

在 Supabase Dashboard 中执行以下步骤：

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目 `rdhwmeittgdosmkxtpak`
3. 左侧菜单 → **SQL Editor**
4. 点击 **New Query**
5. 复制以下 SQL 文件内容并执行：
   ```
   sql/008_create_rooms.sql
   ```

### 1.2 SQL 文件内容说明

SQL 文件包含以下内容：

1. **rooms 表**：存储房间信息
   - id, name, description, creator_id
   - ambient_sound（环境音类型）
   - custom_audio_url（自定义音频URL）
   - tags（宗教标签数组）
   - user_count（在线人数）
   - max_display_sentences（最多显示句子数）
   - last_activity_at（最后活跃时间）

2. **room_participants 表**：存储房间参与者
   - room_id, user_id
   - status（状态：quiet/reading/reflecting/meditating/praying/grateful）
   - is_owner（是否房主）
   - joined_at, last_active_at

3. **room_sentences 表**：存储漂浮句子
   - room_id, user_id
   - content（30字以内）
   - created_at

4. **索引**：优化查询性能

5. **RLS 策略**：基于角色的访问控制

6. **触发器**：
   - 自动更新房间在线人数
   - 自动更新最后活跃时间

---

## 二、Supabase Storage 配置

### 2.1 创建 Storage Bucket

房间功能支持房主上传自定义音频文件，需要创建 Storage bucket：

1. 登录 Supabase Dashboard
2. 左侧菜单 → **Storage**
3. 点击 **New bucket**
4. 配置如下：
   - **Name**: `room-audio`
   - **Public**: ✅ 是（允许公开访问）
   - **Allowed MIME types**: `audio/mpeg`, `audio/wav`, `audio/mp4`, `audio/x-m4a`
   - **Max file size**: 10 MB

### 2.2 Storage Policy（自动创建）

SQL 执行时会自动创建以下策略：

```sql
-- 允许房主上传自己房间的音频
CREATE POLICY "Allow room audio upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'room-audio');

-- 允许所有用户读取音频（房间内成员）
CREATE POLICY "Allow room audio read" ON storage.objects
  FOR SELECT USING (bucket_id = 'room-audio');
```

---

## 三、环境音音频文件（可选）

目前代码中的环境音使用占位符，需要后续添加实际音频文件：

### 3.1 音频文件准备

将以下音频文件放入 `public/sounds/` 目录：

| 文件名 | 描述 | 建议时长 |
|--------|------|----------|
| rain.mp3 | 雨声 | 3-5分钟循环 |
| ocean.mp3 | 海浪声 | 3-5分钟循环 |
| forest.mp3 | 森林鸟鸣 | 3-5分钟循环 |
| wind.mp3 | 风声 | 3-5分钟循环 |
| piano.mp3 | 轻柔钢琴 | 3-5分钟循环 |

### 3.2 修改代码

在 `src/pages/SilentRoom.tsx` 中找到以下代码并取消注释：

```typescript
// const soundUrls: Record<string, string> = {
//   rain: '/sounds/rain.mp3',
//   ocean: '/sounds/ocean.mp3',
//   forest: '/sounds/forest.mp3',
//   wind: '/sounds/wind.mp3',
//   piano: '/sounds/piano.mp3',
// };
```

---

## 四、功能测试清单

### 4.1 数据库验证

- [ ] rooms 表创建成功
- [ ] room_participants 表创建成功
- [ ] room_sentences 表创建成功
- [ ] 索引创建成功
- [ ] RLS 策略生效

### 4.2 Storage 验证

- [ ] room-audio bucket 创建成功
- [ ] 可以上传音频文件
- [ ] 音频文件可公开访问

### 4.3 功能验证

- [ ] 首页显示"静默房间"入口
- [ ] 点击 + 按钮显示发布弹窗（含"房间"选项）
- [ ] 可以创建房间（填写名称、描述、选择环境音、选择标签）
- [ ] 成功创建后跳转到房间页面
- [ ] 房间页面显示星空背景动画
- [ ] 可以看到其他参与者的头像漂浮
- [ ] 可以切换状态（安静中/阅读中/反思中/冥想中/祈祷中/感恩中）
- [ ] 可以"说一句话"（30字限制）
- [ ] 句子在30秒后自动淡出
- [ ] 可以分享房间链接
- [ ] 可以退出房间
- [ ] 首页房间卡片显示在线人数

---

## 五、后续优化（不在本期范围内）

1. **定时清理任务**：设置 pg_cron 定时清理过期句子（30分钟前）和过期房间（24小时无活动）

2. **环境音实现**：添加实际音频文件并取消注释代码

3. **房间搜索**：添加房间搜索/筛选功能

4. **房间解散**：实现房主解散房间功能

5. **禁言机制**：防止用户刷屏发送句子

6. **性能优化**：
   - 参与者头像使用 Canvas 绘制（减少 DOM 节点）
   - 句子使用 Canvas 绘制
   - WebSocket 替代轮询

---

## 六、已知限制

1. 环境音目前为空实现，需要后续添加音频文件
2. 星空背景在低性能设备上可能有性能问题
3. 房间解散机制需要手动执行 SQL 或添加定时任务
4. Storage bucket 需要手动创建（Supabase 免费版可能有 bucket 数量限制）

---

## 七、紧急回滚

如果需要回滚，执行以下 SQL：

```sql
-- 删除表（按依赖顺序）
DROP TABLE IF EXISTS room_sentences;
DROP TABLE IF EXISTS room_participants;
DROP TABLE IF EXISTS rooms;

-- 删除 storage bucket（在 Storage 页面手动删除）
-- 删除 room-audio bucket
```
