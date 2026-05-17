# 仪表盘增强功能使用说明

## 功能概览

增强后的仪表盘新增了以下功能：

### 1. 身份标签分布统计
- 饼图展示各身份标签（faith_tag）的用户数量和占比
- 支持导出为 CSV/Excel 格式

### 2. 地区分布统计
- 按洲分布统计（亚洲、欧洲、北美等）
- 可展开查看各大洲下的国家分布
- 支持导出为 CSV/Excel 格式

### 3. 数据导出功能
- 支持导出：综合统计、身份标签分布、大洲分布、国家分布
- 支持格式：CSV、Excel
- 导出文件名包含导出时间

### 4. 时间筛选
- 快捷选项：今日、近7天、近30天、近90天
- 支持自定义日期范围
- 所有统计数据按选定时间范围过滤

## 数据库初始化（重要！）

在使用地区分布统计功能之前，需要先在数据库中添加地区字段。

### 步骤 1：在 Supabase Dashboard 中执行 SQL

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 进入 **SQL Editor**
4. 执行以下 SQL：

```sql
-- 添加地区字段到 profiles 表

-- 1. 添加 continent 字段（洲）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS continent TEXT DEFAULT 'Unknown';

-- 2. 添加 country 字段（国家）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Unknown';

-- 3. 添加 region 字段（具体地区/省份）
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'Unknown';

-- 4. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_profiles_continent ON public.profiles(continent);
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles(country);
CREATE INDEX IF NOT EXISTS idx_profiles_faith_tag ON public.profiles(faith_tag);

-- 输出成功消息
SELECT 'Profile location fields added successfully!' AS message;
```

### 步骤 2：更新现有用户数据（可选）

如果需要为现有用户填充地区信息，可以通过以下方式：

1. **手动更新**：管理员在用户管理页面手动设置
2. **批量导入**：通过 CSV 导入地区数据
3. **前端采集**：用户注册/登录时自动通过 IP 获取地区

## 地区自动检测（可选）

如果希望自动采集用户地区信息，可以在用户注册流程中添加 IP 地理位置检测：

### 前端实现示例

```javascript
// 在用户注册或登录时调用
async function detectUserLocation() {
  try {
    const response = await fetch('http://ip-api.com/json/?fields=status,country,countryCode');
    const data = await response.json();
    
    if (data.status === 'success') {
      return {
        country: data.country,
        countryCode: data.countryCode,
        continent: getContinentFromCountry(data.countryCode)
      };
    }
  } catch (error) {
    console.error('Failed to detect location:', error);
  }
  return null;
}
```

### 后端更新（Edge Function）

创建 Edge Function 来更新用户地区信息：

```typescript
// supabase/functions/update-user-location/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { user_id } = await req.json();
  
  // 获取 IP 地理位置
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
  
  // 这里需要调用第三方 API 获取地理位置
  // ...

  // 更新用户资料
  await supabaseAdmin
    .from('profiles')
    .update({
      country: detectedCountry,
      continent: detectedContinent,
    })
    .eq('id', user_id);

  return new Response(JSON.stringify({ success: true }));
});
```

## 导出功能使用

1. 在仪表盘各模块中找到 **导出** 按钮
2. 选择导出内容（综合统计/身份标签/大洲/国家）
3. 选择导出格式（CSV/Excel）
4. 点击 **确认导出** 下载文件

导出的文件会自动命名，包含数据类型和导出日期。

## 注意事项

1. **地区字段默认值**：新添加的地区字段默认值为 'Unknown'
2. **查询性能**：已为常用查询字段创建索引
3. **数据隐私**：收集用户地理位置信息需遵守当地法律法规，建议在隐私政策中说明
4. **IP 检测限制**：免费 IP 地理位置 API 有请求限制，生产环境建议使用付费服务

## 技术支持

如有问题，请联系开发团队。
