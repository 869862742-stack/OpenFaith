/**
 * 图片压缩和优化工具
 * 用于处理头像、封面图等用户上传的图片
 */

// 最大尺寸限制
const MAX_WIDTH = 800;
const MAX_HEIGHT = 800;
const QUALITY = 0.8;
const AVATAR_SIZE = 200;

/**
 * 压缩图片
 * @param file 原始文件
 * @param maxWidth 最大宽度
 * @param maxHeight 最大高度
 * @param quality 压缩质量 (0-1)
 * @returns 压缩后的 base64 字符串
 */
export async function compressImage(
  file: File | Blob,
  maxWidth: number = MAX_WIDTH,
  maxHeight: number = MAX_HEIGHT,
  quality: number = QUALITY
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // 计算新的尺寸
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // 创建 canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // 绘制并压缩
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * 压缩头像图片（更小的尺寸和质量）
 */
export async function compressAvatar(file: File | Blob): Promise<string> {
  return compressImage(file, AVATAR_SIZE, AVATAR_SIZE, 0.7);
}

/**
 * 压缩背景图
 */
export async function compressBackground(file: File | Blob): Promise<string> {
  return compressImage(file, MAX_WIDTH, MAX_HEIGHT, 0.8);
}

/**
 * 验证图片文件
 */
export function validateImage(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: '仅支持 JPG、PNG、GIF、WebP 格式' };
  }
  
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: '图片大小不能超过 10MB' };
  }
  
  return { valid: true };
}

/**
 * 获取图片尺寸
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * 从 base64 字符串提取 MimeType
 */
export function getMimeTypeFromBase64(base64: string): string {
  const matches = base64.match(/^data:([^;]+);/);
  return matches ? matches[1] : 'image/jpeg';
}

/**
 * base64 转 File 对象
 */
export function base64ToFile(base64: string, filename: string): File {
  const mimeType = getMimeTypeFromBase64(base64);
  const byteString = atob(base64.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new File([ab], filename, { type: mimeType });
}

/**
 * 清理 base64 数据URL（移除元数据，只保留数据）
 */
export function cleanBase64(base64: string): string {
  return base64.split(',')[1] || base64;
}

/**
 * 计算 base64 大小（KB）
 */
export function getBase64Size(base64: string): number {
  const data = base64.split(',')[1] || base64;
  return Math.round((data.length * 3) / 4 / 1024);
}
