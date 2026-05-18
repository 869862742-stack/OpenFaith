/**
 * Complete server with mock Supabase Auth and REST API
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const crypto = require('crypto');

// Data persistence file
const DATA_FILE = path.join(__dirname, 'data.json');

// Load persisted data or create empty stores
let persistedData = { users: {}, profiles: {}, notes: {}, posts: {}, groups: {}, tags: {}, note_shares: {}, books: {}, chapters: {}, religions: {} };
try {
  if (fs.existsSync(DATA_FILE)) {
    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    persistedData = JSON.parse(rawData);
    console.log('Loaded persisted data from file');
  }
} catch (err) {
  console.log('No persisted data found, starting fresh');
}

// Data Store (initialized from persisted data)
const db = {
  users: new Map(Object.entries(persistedData.users || {})),
  profiles: new Map(Object.entries(persistedData.profiles || {})),
  notes: new Map(Object.entries(persistedData.notes || {})),
  posts: new Map(Object.entries(persistedData.posts || {})),
  groups: new Map(Object.entries(persistedData.groups || {})),
  tags: new Map(Object.entries(persistedData.tags || {})),
  note_shares: new Map(Object.entries(persistedData.note_shares || {})),
  books: new Map(Object.entries(persistedData.books || {})),
  chapters: new Map(Object.entries(persistedData.chapters || {})),
  religions: new Map(Object.entries(persistedData.religions || {})),
  book_groups: new Map(Object.entries(persistedData.book_groups || {})),
};

// Auto-save function
const saveData = () => {
  try {
    const dataToSave = {
      users: Object.fromEntries(db.users),
      profiles: Object.fromEntries(db.profiles),
      notes: Object.fromEntries(db.notes),
      posts: Object.fromEntries(db.posts),
      groups: Object.fromEntries(db.groups),
      tags: Object.fromEntries(db.tags),
      note_shares: Object.fromEntries(db.note_shares),
      books: Object.fromEntries(db.books),
      chapters: Object.fromEntries(db.chapters),
      religions: Object.fromEntries(db.religions),
      book_groups: Object.fromEntries(db.book_groups),
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2));
    console.log('Data persisted to file');
  } catch (err) {
    console.error('Failed to persist data:', err.message);
  }
};

// Initialize super admin only if not already exists
if (!db.users.has('00000001')) {
  // Super admin profile (for login)
  db.profiles.set('00000001', {
    id: '00000001',
    username: 'admin',
    nickname: '管理员',
    avatar: '',
    background: '',
    bio: '超级管理员',
    role: 'super_admin',
    is_vip: true,
    theme_mode: 'light',
    theme_color: 'default',
    font_size: 'standard',
    created_at: new Date().toISOString()
  });

  // Super admin user (for login)
  db.users.set('00000001', {
    id: '00000001',
    email: 'admin@example.com',
    password: 'admin123', // Default admin password
    created_at: new Date().toISOString()
  });
}

// Note: Sample books and religions removed - only use data added through backend

function generateId(length = 8) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateToken(userId, email, roles = []) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    email: email,
    roles: roles,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  })).toString('base64');
  const signature = crypto.createHmac('sha256', 'mock-secret').update(`${header}.${payload}`).digest('base64');
  return `${header}.${payload}.${signature}`;
}

function parseToken(token) {
  try {
    console.log('[DEBUG] parseToken input:', token?.substring(0, 50) + '...');
    const parts = token.split('.');
    console.log('[DEBUG] parseToken parts.length:', parts.length);
    
    // 三段式 JWT 格式
    if (parts.length === 3) {
      // 直接解析 payload，不验证签名（支持 Supabase JWT 和 Mock JWT）
      const payloadStr = Buffer.from(parts[1], 'base64').toString();
      console.log('[DEBUG] parseToken payloadStr:', payloadStr);
      const payload = JSON.parse(payloadStr);
      
      // 检查 token 是否过期
      if (payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
          console.log('[DEBUG] parseToken: token expired (exp:', payload.exp, ', now:', now, ')');
          return null;
        }
        console.log('[DEBUG] parseToken: token valid, exp:', payload.exp);
      }
      
      return payload;
    }
    // 单段 base64 JSON 格式（简化 token）
    if (parts.length === 1) {
      const payload = JSON.parse(Buffer.from(parts[0], 'base64').toString());
      
      // 检查 token 是否过期
      if (payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
          console.log('[DEBUG] parseToken: simplified token expired');
          return null;
        }
      }
      
      return payload;
    }
    return null;
  } catch (e) {
    console.error('[DEBUG] parseToken error:', e.message);
    return null;
  }
}

function sendResponse(res, status, headers, body) {
  if (res.headersSent) {
    try { res.end(body); } catch (e) {}
    return;
  }
  try {
    res.writeHead(status, headers);
    res.end(body);
  } catch (e) {
    console.error('Send response error:', e.message);
  }
}

function sendJSON(res, status, data) {
  sendResponse(res, status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, Prefer'
  }, JSON.stringify(data));
}

function sendError(res, status, error, message) {
  sendJSON(res, status, { error, message });
}

function sendOptions(res) {
  sendResponse(res, 200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, Prefer'
  }, '');
}

function getContentType(ext) {
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
  };
  return contentTypes[ext] || 'application/octet-stream';
}

function sendHTML(res, status, data) {
  if (res.headersSent) {
    try { res.end(data); } catch (e) {}
    return;
  }
  try {
    res.writeHead(status, { 'Content-Type': 'text/html' });
    res.end(data);
  } catch (e) {
    console.error('Send HTML error:', e.message);
  }
}

// Parse body synchronously for small payloads
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const PORT = process.env.PORT || 5000;

http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = parsedUrl.pathname;
    const queryParams = parsedUrl.searchParams;

    // CORS preflight
    if (req.method === 'OPTIONS') {
      sendOptions(res);
      return;
    }

    // Functions API (Edge Function 兼容端点)
    if (pathname.startsWith('/sb-api/functions/v1/') || pathname.startsWith('/functions/v1/')) {
      const funcPath = pathname.replace('/sb-api', '').split('?')[0];
      
      // Admin Auth Function
      if (req.method === 'POST' && funcPath === '/functions/v1/admin-auth') {
        try {
          const body = await parseBody(req);
          const { username, password } = body;
          
          if (!username || !password) {
            return sendJSON(res, 200, { success: false, error: '用户名和密码不能为空' });
          }
          
          // 检查超级管理员
          if (username === 'admin' && password === 'admin123') {
            const token = btoa(JSON.stringify({
              sub: '00000001',
              admin_id: 'super-0000001',
              email: 'admin@example.com',
              username: 'admin',
              roles: ['super_admin'],
              exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
            }));
            return sendJSON(res, 200, {
              success: true,
              token,
              admin: { id: '00000001', email: 'admin@example.com', username: 'admin', role: 'super_admin' }
            });
          }
          
          // 检查其他管理员
          for (const [userId, user] of db.users.entries()) {
            if (user.email === username || user.email === `${username}@admin.local`) {
              if (user.password === password) {
                const profile = db.profiles.get(userId);
                const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
                if (isAdmin) {
                  const token = btoa(JSON.stringify({
                    sub: userId,
                    admin_id: userId,
                    email: user.email,
                    username: username,
                    roles: [profile.role],
                    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
                  }));
                  return sendJSON(res, 200, {
                    success: true,
                    token,
                    user: { id: userId, email: user.email, username, role: profile.role }
                  });
                }
              }
            }
          }
          
          return sendJSON(res, 200, { success: false, error: '用户名或密码错误' });
        } catch (e) {
          return sendJSON(res, 200, { success: false, error: '请求格式错误' });
        }
      }
      
      // Admin Verify Function
      if (req.method === 'POST' && funcPath === '/functions/v1/admin-verify') {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          return sendJSON(res, 401, { valid: false, error: 'No authorization token' });
        }
        
        try {
          const token = parseToken(authHeader.substring(7));
          if (!token) {
            return sendJSON(res, 401, { valid: false, error: 'Invalid token' });
          }
          
          const profile = db.profiles.get(token.sub);
          if (!profile) {
            return sendJSON(res, 200, { valid: false, error: 'Profile not found' });
          }
          
          const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
          if (!isAdmin) {
            return sendJSON(res, 200, { valid: false, error: 'Not an admin' });
          }
          
          return sendJSON(res, 200, {
            valid: true,
            admin: {
              id: profile.id,
              username: profile.username,
              role: profile.role,
              email: profile.email || ''
            }
          });
        } catch (e) {
          return sendJSON(res, 200, { valid: false, error: '验证失败' });
        }
      }
    }

    // Auth API
    if (pathname.startsWith('/sb-api/auth/') || pathname.startsWith('/auth/')) {
      const authPath = pathname.replace('/sb-api', '').split('?')[0]; // 移除查询参数
      
      // Signup
      if (req.method === 'POST' && authPath === '/auth/v1/signup') {
        try {
          const body = await parseBody(req);
          const { email, password, options } = body;
          
          if (!email || !password) {
            return sendError(res, 400, 'invalid_request', 'Email and password required');
          }
          
          // Check if user exists
          for (const [id, user] of db.users.entries()) {
            if (user.email === email) {
              return sendError(res, 400, 'user_already_exists', 'User already registered');
            }
          }
          
          const userId = generateId(8);
          const user = { id: userId, email, password, created_at: new Date().toISOString() };
          db.users.set(userId, user);
          saveData();
          
          const username = options?.data?.username || email.split('@')[0];
          const faithTag = options?.data?.faith_tag || '寻求者';
          const profile = {
            id: userId,
            username,
            nickname: username,
            avatar: '',
            avatar_url: '',
            background: '',
            background_url: '',
            bio: '',
            faith_tag: faithTag,
            role: 'user',
            is_vip: false,
            is_animated_avatar: false,
            level: 1,
            experience: 0,
            hot_points: 0,
            heat_count: 0,
            followers_count: 0,
            following_count: 0,
            tag_last_modified_at: null,
            theme_mode: 'light',
            theme_color: 'default',
            font_size: 'standard',
            created_at: new Date().toISOString()
          };
          db.profiles.set(userId, profile);
          saveData();
          
          const token = generateToken(userId, email, ['user']);
          return sendJSON(res, 200, {
            access_token: token,
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: generateId(32),
            user: { id: userId, email, created_at: user.created_at }
          });
        } catch (e) {
          return sendError(res, 400, 'invalid_request', 'Invalid request body');
        }
      }
      
      // Token (Login)
      if (req.method === 'POST' && authPath === '/auth/v1/token') {
        try {
          const body = await parseBody(req);
          const { email, password } = body;
          
          if (!email || !password) {
            return sendError(res, 400, 'invalid_request', 'Email and password required');
          }
          
          for (const [userId, user] of db.users.entries()) {
            if (user.email === email && user.password === password) {
              const profile = db.profiles.get(userId) || { role: 'user' };
              const token = generateToken(userId, email, [profile.role]);
              return sendJSON(res, 200, {
                access_token: token,
                token_type: 'bearer',
                expires_in: 3600,
                refresh_token: generateId(32),
                user: { id: userId, email, created_at: user.created_at }
              });
            }
          }
          
          return sendError(res, 400, 'invalid_grant', 'Invalid email or password');
        } catch (e) {
          return sendError(res, 400, 'invalid_request', 'Invalid request body');
        }
      }
      
      // Admin Login (管理端专用登录)
      if (req.method === 'POST' && authPath === '/auth/v1/admin-login') {
        try {
          const body = await parseBody(req);
          const { username, password } = body;
          
          if (!username || !password) {
            return sendJSON(res, 200, { success: false, error: '用户名和密码不能为空' });
          }
          
          // 检查超级管理员
          if (username === 'admin' && password === 'admin123') {
            const token = btoa(JSON.stringify({
              admin_id: 'super-0000001',
              username: 'admin',
              roles: ['super_admin'],
              exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
            }));
            return sendJSON(res, 200, {
              success: true,
              token,
              admin: { id: '00000001', username: 'admin', roles: ['super_admin'] }
            });
          }
          
          // 检查其他管理员
          const adminUser = db.profiles.get('00000001');
          if (adminUser && adminUser.role === 'super_admin') {
            // 管理员使用 email 登录
            const email = username.includes('@') ? username : `${username}@admin.local`;
            for (const [userId, user] of db.users.entries()) {
              if (user.email === email && user.password === password) {
                const profile = db.profiles.get(userId);
                const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
                if (isAdmin) {
                  const token = btoa(JSON.stringify({
                    admin_id: userId,
                    username: username,
                    roles: [profile.role],
                    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
                  }));
                  return sendJSON(res, 200, {
                    success: true,
                    token,
                    admin: { id: userId, username, roles: [profile.role] }
                  });
                }
              }
            }
          }
          
          return sendJSON(res, 200, { success: false, error: '用户名或密码错误' });
        } catch (e) {
          return sendJSON(res, 200, { success: false, error: '请求格式错误' });
        }
      }
      
      // Admin Auth (Edge Function 兼容端点)
      if (req.method === 'POST' && (authPath === '/functions/v1/admin-auth' || authPath === '/rest/v1/admin-auth')) {
        try {
          const body = await parseBody(req);
          const { username, password } = body;
          
          if (!username || !password) {
            return sendJSON(res, 200, { success: false, error: '用户名和密码不能为空' });
          }
          
          // 检查超级管理员
          if (username === 'admin' && password === 'admin123') {
            const token = btoa(JSON.stringify({
              sub: '00000001',
              admin_id: 'super-0000001',
              email: 'admin@example.com',
              username: 'admin',
              roles: ['super_admin'],
              exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
            }));
            return sendJSON(res, 200, {
              success: true,
              token,
              admin: { id: '00000001', email: 'admin@example.com', username: 'admin', role: 'super_admin' }
            });
          }
          
          // 检查其他管理员
          for (const [userId, user] of db.users.entries()) {
            if (user.email === username || user.email === `${username}@admin.local`) {
              if (user.password === password) {
                const profile = db.profiles.get(userId);
                const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
                if (isAdmin) {
                  const token = btoa(JSON.stringify({
                    sub: userId,
                    admin_id: userId,
                    email: user.email,
                    username: username,
                    roles: [profile.role],
                    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
                  }));
                  return sendJSON(res, 200, {
                    success: true,
                    token,
                    admin: { id: userId, email: user.email, username, role: profile.role }
                  });
                }
              }
            }
          }
          
          return sendJSON(res, 200, { success: false, error: '用户名或密码错误' });
        } catch (e) {
          return sendJSON(res, 200, { success: false, error: '请求格式错误' });
        }
      }
      
      // Get user
      if (req.method === 'GET' && authPath === '/auth/v1/user') {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          return sendError(res, 401, 'no授权', 'No authorization token');
        }
        
        const token = parseToken(authHeader.substring(7));
        if (!token) {
          return sendError(res, 401, 'invalid_token', 'Invalid token');
        }
        
        const user = db.users.get(token.sub);
        if (!user) {
          return sendError(res, 401, 'user_not_found', 'User not found');
        }
        
        const profile = db.profiles.get(token.sub) || {};
        return sendJSON(res, 200, {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          ...profile
        });
      }
      
      // Forgot Password
      if (req.method === 'POST' && authPath === '/auth/v1/forgot_password') {
        try {
          const body = await parseBody(req);
          const { email } = body;
          
          if (!email) {
            return sendError(res, 400, 'invalid_request', 'Email required');
          }
          
          // Find user by email
          let foundUser = null;
          for (const [userId, user] of db.users.entries()) {
            if (user.email === email) {
              foundUser = { ...user, id: userId };
              break;
            }
          }
          
          if (!foundUser) {
            // 为了安全，不要明确说用户不存在
            return sendJSON(res, 200, {
              message: 'If the email exists, a password reset link has been sent'
            });
          }
          
          // Generate reset token (in real app, this would be sent via email)
          const resetToken = generateId(32);
          foundUser.reset_token = resetToken;
          foundUser.reset_expires = Date.now() + 3600000; // 1 hour
          db.users.set(foundUser.id, foundUser);
          saveData();
          
          console.log(`Password reset token for ${email}: ${resetToken}`);
          
          return sendJSON(res, 200, {
            message: 'Password reset instructions sent to email',
            // For demo purposes, include the token in response
            demo_token: resetToken
          });
        } catch (e) {
          return sendError(res, 400, 'invalid_request', 'Invalid request body');
        }
      }
      
      // Reset Password
      if (req.method === 'POST' && authPath === '/auth/v1/reset_password') {
        try {
          const body = await parseBody(req);
          const { email, password, token } = body;
          
          if (!email || !password || !token) {
            return sendError(res, 400, 'invalid_request', 'Email, password and token required');
          }
          
          // Find user and verify token
          let foundUser = null;
          for (const [userId, user] of db.users.entries()) {
            if (user.email === email && user.reset_token === token) {
              if (user.reset_expires && Date.now() > user.reset_expires) {
                return sendError(res, 400, 'token_expired', 'Reset token has expired');
              }
              foundUser = { ...user, id: userId };
              break;
            }
          }
          
          if (!foundUser) {
            return sendError(res, 400, 'invalid_request', 'Invalid email or reset token');
          }
          
          // Update password
          foundUser.password = password;
          delete foundUser.reset_token;
          delete foundUser.reset_expires;
          db.users.set(foundUser.id, foundUser);
          saveData();
          
          return sendJSON(res, 200, {
            message: 'Password reset successfully'
          });
        } catch (e) {
          return sendError(res, 400, 'invalid_request', 'Invalid request body');
        }
      }
      
      // Admin: Clear all users (for testing)
      if (req.method === 'POST' && authPath === '/auth/v1/admin/clear_users') {
        try {
          // Clear all users except super admin
          for (const [userId] of db.users.entries()) {
            if (userId !== '00000001') {
              db.users.delete(userId);
              db.profiles.delete(userId);
            }
          }
          saveData();
          return sendJSON(res, 200, {
            message: 'All users cleared successfully'
          });
        } catch (e) {
          return sendError(res, 500, 'server_error', 'Failed to clear users');
        }
      }
      
      return sendError(res, 404, 'not_found', 'Auth endpoint not found');
    }

    // Storage API (代理到 Supabase Storage，绕过 CORS)
    if (pathname.startsWith('/sb-storage/v1/')) {
      const storagePath = pathname.replace('/sb-storage/v1/', '');
      const targetUrl = `https://rdhwmeittgdosmkxtpak.supabase.co/storage/v1/${storagePath}`;
      
      console.log('[Storage Proxy]', pathname, '->', targetUrl);
      
      try {
        // 读取请求体
        const bodyChunks = [];
        for await (const chunk of req) {
          bodyChunks.push(chunk);
        }
        const bodyData = Buffer.concat(bodyChunks);
        
        const response = await fetch(targetUrl, {
          method: req.method,
          headers: {
            'Authorization': req.headers.authorization || '',
            'Content-Type': req.headers['content-type'] || 'application/octet-stream',
            'apikey': req.headers['apikey'] || '',
            'x-upsert': req.headers['x-upsert'] || 'false',
          },
          body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? bodyData : undefined,
        });
        
        const data = await response.text();
        res.writeHead(response.status, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        });
        res.end(data);
      } catch (e) {
        console.error('[Storage Proxy Error]', e);
        sendError(res, 500, 'proxy_error', 'Storage proxy failed');
      }
      return;
    }

    // REST API
    if (pathname.startsWith('/rest/v1/') || pathname.startsWith('/sb-api/rest/v1/')) {
      // 优先处理 /sb-api/rest/v1，再处理 /rest/v1
      let restPath;
      if (pathname.startsWith('/sb-api/rest/v1/')) {
        restPath = pathname.replace('/sb-api/rest/v1/', '');
      } else {
        restPath = pathname.replace('/rest/v1/', '');
      }
      restPath = restPath.split('?')[0];
      
      const authHeader = req.headers.authorization;
      console.log('[DEBUG] REST API authHeader:', authHeader?.substring(0, 50) + '...');
      
      let currentUser = null;
      if (authHeader?.startsWith('Bearer ')) {
        const token = parseToken(authHeader.substring(7));
        console.log('[DEBUG] REST API parseToken result:', token);
        if (token) {
          // 兼容前台 JWT token 和后台简化 token
          currentUser = { 
            id: token.sub || token.admin_id || token.user_id, 
            email: token.email || token.username || '',
            roles: token.roles || (token.admin_id ? ['super_admin'] : [])
          };
          console.log('[DEBUG] REST API currentUser:', currentUser);
        }
      }
      
      const isAdmin = () => currentUser && (currentUser.roles.includes('admin') || currentUser.roles.includes('super_admin'));
      const isSuperAdmin = () => currentUser && currentUser.roles.includes('super_admin');
      
      // Parse id=eq.xxx from URL
      const getIdFromQuery = () => {
        // Try to get from parsedUrl first
        const idFromParams = queryParams.get('id');
        if (idFromParams && idFromParams.startsWith('eq.')) {
          return idFromParams.substring(3);
        }
        // Fallback to pathname match
        const match = pathname.match(/id=eq\.([^&\s]+)/);
        return match ? match[1] : null;
      };
      
      // Profiles
      if (restPath === 'profiles') {
        if (req.method === 'GET') {
          const targetId = getIdFromQuery();
          
          if (targetId) {
            const profile = db.profiles.get(targetId);
            if (!profile) return sendJSON(res, 200, []);
            // Allow user to view their own profile, admins can view all
            if (!isAdmin() && profile.id !== currentUser?.id) {
              return sendError(res, 403, 'forbidden', 'Cannot view other profiles');
            }
            return sendJSON(res, 200, profile);
          }
          
          if (!isAdmin()) return sendError(res, 403, 'forbidden', 'Admin access required');
          return sendJSON(res, 200, Array.from(db.profiles.values()));
        }
        
        if (req.method === 'PATCH') {
          if (!currentUser) return sendError(res, 401, 'unauthorized', 'Not authenticated');
          
          console.log('[DEBUG] PATCH profiles, currentUser:', currentUser, 'pathname:', pathname);
          
          // 支持 user_id=eq.xxx 或 id=eq.xxx 格式
          let targetId = getIdFromQuery();
          if (!targetId) {
            // 尝试从 user_id 获取
            const userIdParam = queryParams.get('user_id');
            if (userIdParam && userIdParam.startsWith('eq.')) {
              targetId = userIdParam.substring(3);
            }
          }
          console.log('[DEBUG] targetId:', targetId);
          if (!targetId) return sendError(res, 400, 'invalid_request', 'Profile ID or user_id required');
          
          if (!isAdmin() && targetId !== currentUser.id) {
            return sendError(res, 403, 'forbidden', 'Cannot update other profiles');
          }
          
          try {
            const body = await parseBody(req);
            console.log('[DEBUG] PATCH body:', body);
            
            // 查找对应的 profile（可能用 user_id 匹配）
            let profile = db.profiles.get(targetId);
            if (!profile) {
              // 尝试通过 user_id 字段查找
              for (const [id, p] of db.profiles.entries()) {
                if (p.user_id === targetId) {
                  profile = p;
                  targetId = id;
                  break;
                }
              }
            }
            
            console.log('[DEBUG] found profile:', profile);
            if (!profile) return sendError(res, 404, 'not_found', 'Profile not found');
            
            if (body.role && !isSuperAdmin()) delete body.role;
            
            const updated = { ...profile, ...body };
            db.profiles.set(targetId, updated);
            saveData();
            console.log('[DEBUG] updated profile:', updated);
            return sendJSON(res, 200, [updated]);
          } catch (e) {
            console.error('[DEBUG] PATCH error:', e);
            return sendError(res, 400, 'invalid_request', 'Invalid request body');
          }
        }
      }
      
      // Tags
      if (restPath === 'tags') {
        if (req.method === 'GET') {
          const allTags = Array.from(db.tags.values());
          if (!isAdmin()) {
            return sendJSON(res, 200, allTags.filter(t => t.status === 'approved'));
          }
          const status = queryParams.get('status');
          if (status) {
            return sendJSON(res, 200, allTags.filter(t => t.status === status));
          }
          return sendJSON(res, 200, allTags);
        }
        
        if (req.method === 'POST') {
          if (!currentUser) return sendError(res, 401, 'unauthorized', 'Not authenticated');
          
          try {
            const body = await parseBody(req);
            const tagId = generateId(8);
            const tag = {
              id: tagId,
              name: body.name,
              type: body.type || 'custom',
              status: 'pending',
              created_by: currentUser.id,
              created_at: new Date().toISOString()
            };
            db.tags.set(tagId, tag);
            saveData();
            return sendJSON(res, 201, tag);
          } catch (e) {
            return sendError(res, 400, 'invalid_request', 'Invalid request body');
          }
        }
        
        if (req.method === 'PATCH') {
          if (!isAdmin()) return sendError(res, 403, 'forbidden', 'Admin access required');
          
          const tagId = getIdFromQuery();
          if (!tagId) return sendError(res, 400, 'invalid_request', 'Tag ID required');
          
          try {
            const body = await parseBody(req);
            const tag = db.tags.get(tagId);
            if (!tag) return sendError(res, 404, 'not_found', 'Tag not found');
            
            const updated = { ...tag, ...body };
            db.tags.set(tagId, updated);
            saveData();
            return sendJSON(res, 200, updated);
          } catch (e) {
            return sendError(res, 400, 'invalid_request', 'Invalid request body');
          }
        }
      }
      
      // Religions (宗教百科)
      if (restPath === 'religions') {
        if (req.method === 'GET') {
          const targetId = getIdFromQuery();
          let allReligions = Array.from(db.religions.values());
          
          // 如果有 id 查询参数，返回单个对象（支持 .single() 调用）
          if (targetId) {
            const religion = db.religions.get(targetId);
            if (!religion) return sendJSON(res, 200, null);
            return sendJSON(res, 200, religion);
          }
          
          // 支持 name.ilike.*xxx* 搜索
          const nameParam = parsedUrl.searchParams.get('name');
          if (nameParam) {
            // URL searchParams.get() 已经自动解码，所以直接使用
            if (nameParam.startsWith('ilike.*') && nameParam.endsWith('*')) {
              const searchText = nameParam.slice(7, -1).toLowerCase();
              allReligions = allReligions.filter(r => 
                r.name && r.name.toLowerCase().includes(searchText)
              );
            }
          }
          
          // 支持排序 order=xxx.desc 或 order=xxx.asc
          const orderParam = parsedUrl.searchParams.get('order');
          if (orderParam) {
            const [field, direction] = orderParam.split('.');
            allReligions.sort((a, b) => {
              const aVal = a[field] || '';
              const bVal = b[field] || '';
              if (direction === 'desc') {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
              }
              return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
            });
          }
          
          // 支持 offset 和 limit 分页
          const offset = parseInt(parsedUrl.searchParams.get('offset') || '0', 10);
          const limit = parseInt(parsedUrl.searchParams.get('limit') || '1000', 10);
          const paginatedReligions = allReligions.slice(offset, offset + limit);
          
          // GET 请求返回宗教列表
          return sendJSON(res, 200, paginatedReligions);
        }
        
        if (req.method === 'POST') {
          // 移除管理员权限要求，允许导入宗教百科数据
          // if (!isAdmin()) return sendError(res, 403, 'forbidden', 'Admin access required');
          
          try {
            const body = await parseBody(req);
            const religionId = body.id || generateId(8);
            const religion = {
              id: religionId,
              name: body.name || '未命名宗教',
              type: body.type || '',
              origin_place: body.origin_place || '',
              origin_time: body.origin_time || '',
              distribution: body.distribution || '',
              followers_scale: body.followers_scale || '',
              core_belief: body.core_belief || '',
              introduction: body.introduction || '',
              history: body.history || '',
              doctrines: body.doctrines || '',
              classics: body.classics || '',
              festivals: body.festivals || '',
              rituals: body.rituals || '',
              taboos: body.taboos || '',
              sacred_sites: body.sacred_sites || '',
              famous_figures: body.famous_figures || '',
              is_active: body.is_active !== undefined ? body.is_active : true,
              created_at: body.created_at || new Date().toISOString()
            };
            db.religions.set(religionId, religion);
            saveData();
            return sendJSON(res, 201, religion);
          } catch (e) {
            return sendError(res, 400, 'invalid_request', 'Invalid request body');
          }
        }
        
        if (req.method === 'PATCH') {
          // 移除管理员权限要求，允许更新宗教百科
          // if (!isAdmin()) return sendError(res, 403, 'forbidden', 'Admin access required');
          
          const religionId = getIdFromQuery();
          if (!religionId) return sendError(res, 400, 'invalid_request', 'Religion ID required');
          
          try {
            const body = await parseBody(req);
            const religion = db.religions.get(religionId);
            if (!religion) return sendError(res, 404, 'not_found', 'Religion not found');
            
            const updated = { ...religion, ...body };
            db.religions.set(religionId, updated);
            saveData();
            return sendJSON(res, 200, updated);
          } catch (e) {
            return sendError(res, 400, 'invalid_request', 'Invalid request body');
          }
        }
        
        if (req.method === 'DELETE') {
          // 移除管理员权限要求，允许删除宗教百科
          // if (!isAdmin()) return sendError(res, 403, 'forbidden', 'Admin access required');
          
          const religionId = getIdFromQuery();
          if (!religionId) return sendError(res, 400, 'invalid_request', 'Religion ID required');
          
          if (!db.religions.has(religionId)) {
            return sendError(res, 404, 'not_found', 'Religion not found');
          }
          
          db.religions.delete(religionId);
          saveData();
          return sendJSON(res, 200, { deleted: true });
        }
      }
      
      // Groups
      if (restPath === 'groups') {
        if (req.method === 'GET') {
          return sendJSON(res, 200, Array.from(db.groups.values()));
        }
        
        if (req.method === 'POST') {
          if (!currentUser) return sendError(res, 401, 'unauthorized', 'Not authenticated');
          
          try {
            const body = await parseBody(req);
            const groupId = generateId(8);
            const group = {
              id: groupId,
              name: body.name,
              description: body.description || '',
              created_by: currentUser.id,
              created_at: new Date().toISOString()
            };
            db.groups.set(groupId, group);
            saveData();
            return sendJSON(res, 201, group);
          } catch (e) {
            return sendError(res, 400, 'invalid_request', 'Invalid request body');
          }
        }
      }
      
      // Books (藏书)
      if (restPath === 'books') {
        if (req.method === 'GET') {
          const targetId = getIdFromQuery();
          
          // 如果有 id 查询参数，返回单个对象（支持 .single() 调用）
          if (targetId) {
            const book = db.books.get(targetId);
            if (!book) return sendJSON(res, 200, null);
            return sendJSON(res, 200, book);
          }
          
          // GET 请求返回所有书籍（不对用户做状态过滤限制）
          const allBooks = Array.from(db.books.values());
          return sendJSON(res, 200, allBooks);
        }
        
        if (req.method === 'POST') {
          // 移除管理员权限要求，允许导入宗教百科数据
          // if (!isAdmin()) return sendError(res, 403, 'forbidden', 'Admin access required');
          
          try {
            const body = await parseBody(req);
            const bookId = body.id || generateId(8);
            const book = {
              id: bookId,
              title: body.title || '未命名书籍',
              religion: body.religion || '',
              category: body.category || '',
              description: body.description || '',
              status: body.status || 'draft',
              created_at: body.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            db.books.set(bookId, book);
            saveData();
            return sendJSON(res, 201, book);
          } catch (e) {
            return sendError(res, 400, 'invalid_request', 'Invalid request body');
          }
        }
        
        if (req.method === 'PATCH') {
          // 移除管理员权限要求，允许内部API调用更新书籍的 group_id
          // if (!isAdmin()) return sendError(res, 403, 'forbidden', 'Admin access required');
          
          const bookId = getIdFromQuery();
          if (!bookId) return sendError(res, 400, 'invalid_request', 'Book ID required');
          
          try {
            const body = await parseBody(req);
            const book = db.books.get(bookId);
            if (!book) return sendError(res, 404, 'not_found', 'Book not found');
            
            const updated = { ...book, ...body, updated_at: new Date().toISOString() };
            db.books.set(bookId, updated);
            saveData();
            return sendJSON(res, 200, [updated]);
          } catch (e) {
            return sendError(res, 400, 'invalid_request', 'Invalid request body');
          }
        }
        
        if (req.method === 'DELETE') {
          // 移除管理员权限要求，允许内部API调用删除书籍
          // if (!isAdmin()) return sendError(res, 403, 'forbidden', 'Admin access required');
          
          const bookId = getIdFromQuery();
          if (!bookId) return sendError(res, 400, 'invalid_request', 'Book ID required');
          
          if (!db.books.has(bookId)) return sendError(res, 404, 'not_found', 'Book not found');
          
          db.books.delete(bookId);
          // 同时删除该书的所有章节
          for (const [chapterId, chapter] of db.chapters.entries()) {
            if (chapter.book_id === bookId) {
              db.chapters.delete(chapterId);
            }
          }
          saveData();
          return sendJSON(res, 200, { message: 'Book deleted successfully' });
        }
      }
      
      // Chapters (书卷章节)
      if (restPath === 'chapters') {
        const bookIdParam = queryParams.get('book_id');
        
        if (req.method === 'GET') {
          // 如果有 book_id 查询参数，过滤该书籍的章节
          if (bookIdParam) {
            let filterId = bookIdParam;
            if (filterId.startsWith('eq.')) {
              filterId = filterId.substring(3);
            }
            const chapters = Array.from(db.chapters.values()).filter(c => c.book_id === filterId);
            return sendJSON(res, 200, chapters);
          }
          // GET 对所有用户开放
          return sendJSON(res, 200, Array.from(db.chapters.values()));
        }
        
        if (req.method === 'POST') {
          // 移除管理员权限要求，允许导入宗教百科数据
          // if (!isAdmin()) return sendError(res, 403, 'forbidden', 'Admin access required');
          
          try {
            const body = await parseBody(req);
            const chapterId = body.id || generateId(8);
            const chapter = {
              id: chapterId,
              book_id: body.book_id,
              number: body.number || 1,
              title: body.title || '未命名章节',
              content: body.content || '',
              status: body.status || 'draft',
              created_at: body.created_at || new Date().toISOString()
            };
            db.chapters.set(chapterId, chapter);
            saveData();
            return sendJSON(res, 201, chapter);
          } catch (e) {
            return sendError(res, 400, 'invalid_request', 'Invalid request body');
          }
        }
        
        if (req.method === 'PATCH') {
          // 移除管理员权限要求，允许内部API调用更新章节
          // if (!isAdmin()) return sendError(res, 403, 'forbidden', 'Admin access required');
          
          const chapterId = getIdFromQuery();
          if (!chapterId) return sendError(res, 400, 'invalid_request', 'Chapter ID required');
          
          try {
            const body = await parseBody(req);
            const chapter = db.chapters.get(chapterId);
            if (!chapter) return sendError(res, 404, 'not_found', 'Chapter not found');
            
            const updated = { ...chapter, ...body };
            db.chapters.set(chapterId, updated);
            saveData();
            return sendJSON(res, 200, [updated]);
          } catch (e) {
            return sendError(res, 400, 'invalid_request', 'Invalid request body');
          }
        }
        
        if (req.method === 'DELETE') {
          // 移除管理员权限要求，允许内部API调用删除章节
          // if (!isAdmin()) return sendError(res, 403, 'forbidden', 'Admin access required');
          
          const chapterId = getIdFromQuery();
          if (!chapterId) return sendError(res, 400, 'invalid_request', 'Chapter ID required');
          
          if (!db.chapters.has(chapterId)) return sendError(res, 404, 'not_found', 'Chapter not found');
          
          db.chapters.delete(chapterId);
          saveData();
          return sendJSON(res, 200, { message: 'Chapter deleted successfully' });
        }
      }
      
      // Book Groups (藏书群组) - 内部API，无需管理员权限
      if (restPath === 'book_groups') {
        if (req.method === 'GET') {
          const targetId = getIdFromQuery();
          
          if (targetId) {
            const group = db.book_groups.get(targetId);
            if (!group) return sendJSON(res, 200, null);
            return sendJSON(res, 200, group);
          }
          
          return sendJSON(res, 200, Array.from(db.book_groups.values()));
        }
        
        if (req.method === 'POST') {
          try {
            const body = await parseBody(req);
            const groupId = body.id || generateId(12);
            const group = {
              id: groupId,
              name: body.name || '未命名群组',
              religion: body.religion || '',
              description: body.description || '',
              book_ids: body.book_ids || [],
              group_ids: body.group_ids || [],
              parent_id: body.parent_id || null,
              status: body.status || 'draft',
              created_at: body.created_at || new Date().toISOString(),
            };
            db.book_groups.set(groupId, group);
            saveData();
            return sendJSON(res, 201, group);
          } catch (e) {
            return sendError(res, 400, 'invalid_request', 'Invalid request body');
          }
        }
        
        if (req.method === 'PATCH') {
          const groupId = getIdFromQuery();
          if (!groupId) return sendError(res, 400, 'invalid_request', 'Group ID required');
          
          try {
            const body = await parseBody(req);
            const group = db.book_groups.get(groupId);
            if (!group) return sendError(res, 404, 'not_found', 'Group not found');
            
            const updated = { ...group, ...body };
            db.book_groups.set(groupId, updated);
            saveData();
            return sendJSON(res, 200, [updated]);
          } catch (e) {
            return sendError(res, 400, 'invalid_request', 'Invalid request body');
          }
        }
        
        if (req.method === 'DELETE') {
          const groupId = getIdFromQuery();
          if (!groupId) return sendError(res, 400, 'invalid_request', 'Group ID required');
          
          if (!db.book_groups.has(groupId)) return sendError(res, 404, 'not_found', 'Group not found');
          
          db.book_groups.delete(groupId);
          saveData();
          return sendJSON(res, 200, { message: 'Group deleted successfully' });
        }
      }
      
      // Notes
      if (restPath === 'notes') {
        if (req.method === 'GET') {
          const allNotes = Array.from(db.notes.values());
          if (isAdmin()) return sendJSON(res, 200, allNotes);
          if (currentUser) {
            return sendJSON(res, 200, allNotes.filter(n => n.user_id === currentUser.id));
          }
          return sendJSON(res, 200, []);
        }
        
        if (req.method === 'POST') {
          if (!currentUser) return sendError(res, 401, 'unauthorized', 'Not authenticated');
          
          try {
            const body = await parseBody(req);
            const noteId = generateId(8);
            const note = {
              id: noteId,
              user_id: currentUser.id,
              title: body.title || '',
              content: body.content || '',
              tags: body.tags || [],
              status: 'pending', // pending, approved, rejected
              rejection_reason: '',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            db.notes.set(noteId, note);
            saveData();
            return sendJSON(res, 201, note);
          } catch (e) {
            return sendError(res, 400, 'invalid_request', 'Invalid request body');
          }
        }
        
        if (req.method === 'PATCH') {
          if (!currentUser) return sendError(res, 401, 'unauthorized', 'Not authenticated');
          
          const noteId = getIdFromQuery();
          if (!noteId) return sendError(res, 400, 'invalid_request', 'Note ID required');
          
          try {
            const body = await parseBody(req);
            const note = db.notes.get(noteId);
            if (!note) return sendError(res, 404, 'not_found', 'Note not found');
            
            if (!isAdmin() && note.user_id !== currentUser.id) {
              return sendError(res, 403, 'forbidden', 'Cannot update other notes');
            }
            
            const updated = { ...note, ...body, updated_at: new Date().toISOString() };
            db.notes.set(noteId, updated);
            saveData();
            return sendJSON(res, 200, updated);
          } catch (e) {
            return sendError(res, 400, 'invalid_request', 'Invalid request body');
          }
        }
      }
      
      // Posts (帖子/笔记)
      if (restPath === 'posts') {
        if (req.method === 'GET') {
          const allPosts = Array.from(db.posts.values());
          if (isAdmin()) return sendJSON(res, 200, allPosts);
          if (currentUser) {
            return sendJSON(res, 200, allPosts.filter(p => p.user_id === currentUser.id));
          }
          return sendJSON(res, 200, []);
        }
        
        if (req.method === 'POST') {
          if (!currentUser) return sendError(res, 401, 'unauthorized', 'Not authenticated');
          
          try {
            const body = await parseBody(req);
            const postId = generateId(8);
            const post = {
              id: postId,
              user_id: currentUser.id,
              title: body.title || '',
              content: body.content || '',
              cover_image: body.cover_image || null,
              images: body.images || [],
              tags: body.tags || [],
              status: body.status || 'pending', // pending, approved, rejected
              rejection_reason: '',
              likes: 0,
              comments: 0,
              view_count: 0,
              share_count: 0,
              hot_score: 0,
              is_ai_flagged: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            db.posts.set(postId, post);
            saveData();
            return sendJSON(res, 201, post);
          } catch (e) {
            return sendError(res, 400, 'invalid_request', 'Invalid request body');
          }
        }
        
        if (req.method === 'PATCH') {
          if (!currentUser) return sendError(res, 401, 'unauthorized', 'Not authenticated');
          
          const postId = getIdFromQuery();
          if (!postId) return sendError(res, 400, 'invalid_request', 'Post ID required');
          
          try {
            const body = await parseBody(req);
            const post = db.posts.get(postId);
            if (!post) return sendError(res, 404, 'not_found', 'Post not found');
            
            if (!isAdmin() && post.user_id !== currentUser.id) {
              return sendError(res, 403, 'forbidden', 'Cannot update other posts');
            }
            
            const updated = { ...post, ...body, updated_at: new Date().toISOString() };
            db.posts.set(postId, updated);
            return sendJSON(res, 200, updated);
          } catch (e) {
            return sendError(res, 400, 'invalid_request', 'Invalid request body');
          }
        }
      }
      
      return sendError(res, 404, 'not_found', 'REST endpoint not found');
    }

    // RPC endpoints
    if (pathname.startsWith('/sb-api/rpc/') || pathname.startsWith('/rpc/')) {
      const rpcPath = pathname.replace('/sb-api/rpc', '').replace('/rpc', '');
      const authHeader = req.headers.authorization;
      let currentUser = null;
      if (authHeader?.startsWith('Bearer ')) {
        const token = parseToken(authHeader.substring(7));
        if (token) {
          currentUser = { id: token.sub, email: token.email, roles: token.roles || [] };
        }
      }
      
      // Share note
      if (rpcPath === '/share_note' && req.method === 'POST') {
        if (!currentUser) return sendError(res, 401, 'unauthorized', 'Not authenticated');
        
        try {
          const body = await parseBody(req);
          if (!db.notes.has(body.note_id)) {
            return sendError(res, 404, 'not_found', 'Note not found');
          }
          
          const shareCode = generateId(12);
          const shareId = generateId(8);
          const share = {
            id: shareId,
            note_id: body.note_id,
            share_code: shareCode,
            created_by: currentUser.id,
            created_at: new Date().toISOString()
          };
          db.note_shares.set(shareId, share);
          saveData();
          return sendJSON(res, 200, { share_code: shareCode });
        } catch (e) {
          return sendError(res, 400, 'invalid_request', 'Invalid request body');
        }
      }
      
      // Get shared note
      if (rpcPath === '/get_shared_note' && req.method === 'GET') {
        const shareCode = queryParams.get('code');
        if (!shareCode) return sendError(res, 400, 'invalid_request', 'Share code required');
        
        for (const share of db.note_shares.values()) {
          if (share.share_code === shareCode) {
            const note = db.notes.get(share.note_id);
            if (note) {
              const author = db.profiles.get(note.user_id);
              return sendJSON(res, 200, {
                ...note,
                author_nickname: author?.nickname || 'Unknown'
              });
            }
          }
        }
        return sendError(res, 404, 'not_found', 'Share not found');
      }
      
      // Set admin (super_admin only)
      if (rpcPath === '/set_admin' && req.method === 'POST') {
        if (!currentUser || !currentUser.roles.includes('super_admin')) {
          return sendError(res, 403, 'forbidden', 'Super admin access required');
        }
        
        try {
          const body = await parseBody(req);
          const profile = db.profiles.get(body.user_id);
          if (!profile) return sendError(res, 404, 'not_found', 'User not found');
          
          profile.role = body.role || 'admin';
          db.profiles.set(body.user_id, profile);
          saveData();
          return sendJSON(res, 200, { success: true, profile });
        } catch (e) {
          return sendError(res, 400, 'invalid_request', 'Invalid request body');
        }
      }
      
      // Get book chapters count (for efficient loading)
      if (rpcPath === '/get_book_chapters_count' && req.method === 'GET') {
        try {
          // 获取所有书籍和群组
          const books = Array.from(db.books.values());
          const groups = Array.from(db.book_groups.values());
          
          // 收集所有被发布的群组直接或间接包含的书籍ID
          const getPublishedBookIds = () => {
            const publishedBookIds = new Set();
            
            // 检查书籍是否被已发布的群组包含
            const isBookInPublishedGroup = (bookId) => {
              for (const group of groups) {
                if (group.is_published !== false) {
                  // 检查书籍是否在群组的 book_ids 中
                  if (group.book_ids && group.book_ids.includes(bookId)) {
                    return true;
                  }
                  // 检查书籍是否在子群组的 book_ids 中
                  if (group.group_ids && group.group_ids.length > 0) {
                    for (const subGroupId of group.group_ids) {
                      const subGroup = groups.find(g => g.id === subGroupId);
                      if (subGroup && subGroup.is_published !== false && subGroup.book_ids && subGroup.book_ids.includes(bookId)) {
                        return true;
                      }
                    }
                  }
                }
              }
              return false;
            };
            
            for (const book of books) {
              if (isBookInPublishedGroup(book.id)) {
                publishedBookIds.add(book.id);
              }
            }
            return publishedBookIds;
          };
          
          const publishedBookIds = getPublishedBookIds();
          
          // 获取每本书的章节数
          const chapters = Array.from(db.chapters.values());
          const bookChapterCounts = {};
          
          for (const bookId of publishedBookIds) {
            bookChapterCounts[bookId] = 0;
          }
          
          for (const chapter of chapters) {
            if (publishedBookIds.has(chapter.book_id)) {
              bookChapterCounts[chapter.book_id] = (bookChapterCounts[chapter.book_id] || 0) + 1;
            }
          }
          
          // 返回 [{book_id, count}, ...]
          const result = Object.entries(bookChapterCounts).map(([book_id, count]) => ({
            book_id,
            count
          }));
          
          return sendJSON(res, 200, result);
        } catch (e) {
          return sendError(res, 500, 'server_error', 'Failed to get chapters count');
        }
      }
      
      return sendError(res, 404, 'not_found', 'RPC not found');
    }

    // Static files - must be last
    let filePath = pathname.split('?')[0];
    
    // Handle admin path - serve from dist root for admin files
    if (filePath.startsWith('/admin/')) {
      // /admin/admin-bundle.js -> /admin-bundle.js
      const adminFile = filePath.slice(6); // Remove /admin to get /admin-bundle.js
      const adminDistPath = path.join(__dirname, 'dist', adminFile);
      
      fs.readFile(adminDistPath, (err, data) => {
        if (err) {
          // Fallback to admin-dashboard.html (webpack build output)
          fs.readFile(path.join(__dirname, 'dist', 'admin-dashboard.html'), (err2, data2) => {
            if (err2) {
              // Try admin.html as another fallback
              fs.readFile(path.join(__dirname, 'dist', 'admin.html'), (err3, data3) => {
                if (err3) {
                  sendResponse(res, 404, { 'Content-Type': 'text/plain' }, 'Not Found');
                } else {
                  sendResponse(res, 200, { 'Content-Type': 'text/html' }, data3);
                }
              });
            } else {
              sendResponse(res, 200, { 'Content-Type': 'text/html' }, data2);
            }
          });
          return;
        }
        
        const ext = path.extname(adminFile).toLowerCase();
        const contentType = getContentType(ext);
        sendResponse(res, 200, { 'Content-Type': contentType }, data);
      });
      return;
    }
    
    if (filePath === '/' || !path.extname(filePath)) {
      // 根路径默认返回用户端 index.html
      filePath = '/index.html';
    }

    const distPath = path.join(__dirname, 'dist', filePath);
    
    // 根据文件扩展名确定 Content-Type
    const ext = path.extname(filePath).toLowerCase();
    const contentType = getContentType(ext);
    
    fs.readFile(distPath, (err, data) => {
      if (err) {
        // Try index.html as fallback
        fs.readFile(path.join(__dirname, 'dist', 'index.html'), (err2, data2) => {
          if (err2) {
            sendResponse(res, 404, { 'Content-Type': 'text/plain' }, 'Not Found');
          } else {
            sendResponse(res, 200, { 'Content-Type': 'text/html' }, data2);
          }
        });
        return;
      }

      sendResponse(res, 200, { 'Content-Type': contentType }, data);
    });
  } catch (e) {
    // Catch any errors in request handling
    console.error('Request error:', e.message);
    try {
      if (!res.writableEnded) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'server_error', message: 'Internal server error' }));
      }
    } catch (e2) {
      // Ignore
    }
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Super Admin ID: 00000001`);
});
