-- OpenFaith 原子操作函数（解决并发PATCH覆盖问题）
-- 在 Supabase Dashboard → SQL Editor 中执行

-- 1. 原子性增加帖子加热数
CREATE OR REPLACE FUNCTION increment_heat_count(post_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE posts SET heat_count = heat_count + 1 WHERE id = post_id RETURNING heat_count;
$$;

-- 2. 原子性扣减用户热点（不会变成负数）
CREATE OR REPLACE FUNCTION decrement_hot_points(target_user_id uuid, amount integer DEFAULT 1)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE profiles SET hot_points = GREATEST(hot_points - amount, 0) WHERE user_id = target_user_id RETURNING hot_points;
$$;

-- 3. 原子性增加用户经验值
CREATE OR REPLACE FUNCTION increment_experience(target_user_id uuid, exp_amount integer DEFAULT 1)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  DECLARE
    v_new_exp integer;
    v_new_level integer;
  BEGIN
    -- 计算新经验值
    UPDATE profiles 
    SET experience = experience + exp_amount 
    WHERE user_id = target_user_id
    RETURNING experience INTO v_new_exp;
    
    -- 根据新经验值计算等级
    v_new_level := CASE
      WHEN v_new_exp >= 5000000 THEN 10
      WHEN v_new_exp >= 2000000 THEN 9
      WHEN v_new_exp >= 1000000 THEN 8
      WHEN v_new_exp >= 500000 THEN 7
      WHEN v_new_exp >= 250000 THEN 6
      WHEN v_new_exp >= 125000 THEN 5
      WHEN v_new_exp >= 25000 THEN 4
      WHEN v_new_exp >= 5000 THEN 3
      WHEN v_new_exp >= 1000 THEN 2
      ELSE 1
    END;
    
    -- 更新等级
    UPDATE profiles SET level = v_new_level WHERE user_id = target_user_id;
    
    RETURN json_build_object('experience', v_new_exp, 'level', v_new_level);
  END;
$$;

-- 4. 获取用户当前热点数（用于检查是否足够）
CREATE OR REPLACE FUNCTION get_hot_points(target_user_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT hot_points FROM profiles WHERE user_id = target_user_id;
$$;

-- 5. 获取用户 profile 信息（用于检查 VIP 状态）
CREATE OR REPLACE FUNCTION get_profile_info(target_user_id uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'is_vip', is_vip,
    'experience', experience,
    'level', level
  ) FROM profiles WHERE user_id = target_user_id;
$$;

-- 6. 批量原子操作：加热帖子（包含扣热点、加heat_count、加作者经验）
CREATE OR REPLACE FUNCTION heat_post(
  p_post_id uuid,
  p_heater_user_id uuid,
  p_author_user_id uuid,
  p_author_is_vip boolean DEFAULT false,
  p_heater_is_vip boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_author_exp integer;
  v_author_new_level integer;
  v_heater_exp integer;
  v_heater_new_level integer;
  v_new_heat_count integer;
BEGIN
  -- 1. 扣减加热者热点（原子操作）
  UPDATE profiles SET hot_points = GREATEST(hot_points - 1, 0) WHERE user_id = p_heater_user_id;
  
  -- 2. 增加帖子加热数（原子操作）
  UPDATE posts SET heat_count = heat_count + 1 WHERE id = p_post_id RETURNING heat_count INTO v_new_heat_count;
  
  -- 3. 增加作者经验（被加热 +3，VIP 6）
  UPDATE profiles SET experience = experience + CASE WHEN p_author_is_vip THEN 6 ELSE 3 END WHERE user_id = p_author_user_id;
  SELECT experience INTO v_author_exp FROM profiles WHERE user_id = p_author_user_id;
  
  -- 计算作者新等级
  v_author_new_level := CASE
    WHEN v_author_exp >= 5000000 THEN 10
    WHEN v_author_exp >= 2000000 THEN 9
    WHEN v_author_exp >= 1000000 THEN 8
    WHEN v_author_exp >= 500000 THEN 7
    WHEN v_author_exp >= 250000 THEN 6
    WHEN v_author_exp >= 125000 THEN 5
    WHEN v_author_exp >= 25000 THEN 4
    WHEN v_author_exp >= 5000 THEN 3
    WHEN v_author_exp >= 1000 THEN 2
    ELSE 1
  END;
  UPDATE profiles SET level = v_author_new_level WHERE user_id = p_author_user_id;
  
  -- 4. 增加加热者经验（加热他人 +1，VIP 2）
  UPDATE profiles SET experience = experience + CASE WHEN p_heater_is_vip THEN 2 ELSE 1 END WHERE user_id = p_heater_user_id;
  SELECT experience INTO v_heater_exp FROM profiles WHERE user_id = p_heater_user_id;
  
  -- 计算加热者新等级
  v_heater_new_level := CASE
    WHEN v_heater_exp >= 5000000 THEN 10
    WHEN v_heater_exp >= 2000000 THEN 9
    WHEN v_heater_exp >= 1000000 THEN 8
    WHEN v_heater_exp >= 500000 THEN 7
    WHEN v_heater_exp >= 250000 THEN 6
    WHEN v_heater_exp >= 125000 THEN 5
    WHEN v_heater_exp >= 25000 THEN 4
    WHEN v_heater_exp >= 5000 THEN 3
    WHEN v_heater_exp >= 1000 THEN 2
    ELSE 1
  END;
  UPDATE profiles SET level = v_heater_new_level WHERE user_id = p_heater_user_id;
  
  RETURN json_build_object(
    'heat_count', v_new_heat_count,
    'author_exp', v_author_exp,
    'author_level', v_author_new_level,
    'heater_exp', v_heater_exp,
    'heater_level', v_heater_new_level
  );
END;
$$;

-- 7. 原子性增加分享计数
CREATE OR REPLACE FUNCTION increment_shares_count(post_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE posts SET shares_count = shares_count + 1 WHERE id = post_id RETURNING shares_count;
$$;

-- 8. 原子性增加收藏计数
CREATE OR REPLACE FUNCTION increment_favorites_count(post_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE posts SET favorites_count = favorites_count + 1 WHERE id = post_id RETURNING favorites_count;
$$;

-- 9. 原子性减少收藏计数（不会变成负数）
CREATE OR REPLACE FUNCTION decrement_favorites_count(post_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE posts SET favorites_count = GREATEST(favorites_count - 1, 0) WHERE id = post_id RETURNING favorites_count;
$$;
