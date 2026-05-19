/**
 * 数据导出工具
 * 支持 CSV 和 Excel 格式导出
 */

import { GeoLocation, normalizeCountryName, getContinentFromCountry } from './geoLocation';

// 导出格式类型
export type ExportFormat = 'csv' | 'xlsx' | 'xls';

// 数据类型
export type ExportDataType = 'faithTag' | 'continent' | 'country' | 'users' | 'posts' | 'all';

// 导出配置
export interface ExportConfig {
  type: ExportDataType;
  format: ExportFormat;
  data: any[];
  filename?: string;
  timeRange?: string;
}

// 将数据转换为 CSV 格式
export function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      // 如果值包含逗号、引号或换行符，需要用引号包裹
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}

// 添加 BOM 以支持 Excel 正确显示 UTF-8 编码的中文
export function addBOM(content: string): string {
  return '\uFEFF' + content;
}

// 导出为 CSV 文件
export function exportAsCSV(data: any[], filename: string): void {
  const csvContent = addBOM(convertToCSV(data));
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

// 导出为 Excel 文件（使用 HTML 表格方式，兼容性更好）
export function exportAsExcel(data: any[], filename: string): void {
  if (!data || data.length === 0) {
    alert('没有数据可导出');
    return;
  }
  
  const headers = Object.keys(data[0]);
  
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" 
    xmlns:x="urn:schemas-microsoft-com:office:excel" 
    xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        th { background-color: #2563EB; color: white; }
        tr:nth-child(even) { background-color: #f9f9f9; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${data.map(row => `<tr>${headers.map(h => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>
    </body>
  </html>`;
  
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  downloadBlob(blob, `${filename}.xls`);
}

// 下载 Blob 文件
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 通用导出函数
export function exportData(config: ExportConfig): void {
  const { type, format, data, filename, timeRange } = config;
  const timestamp = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `${type}_${timestamp}`;
  
  if (data.length === 0) {
    alert('没有数据可导出');
    return;
  }
  
  switch (format) {
    case 'csv':
      exportAsCSV(data, finalFilename);
      break;
    case 'xlsx':
    case 'xls':
      exportAsExcel(data, finalFilename);
      break;
    default:
      exportAsCSV(data, finalFilename);
  }
}

// 格式化导出数据
export function formatExportData(
  type: ExportDataType,
  stats: any,
  faithTagDistribution: any[],
  continentDistribution: any[],
  countryDistribution: any[]
): any[] {
  switch (type) {
    case 'faithTag':
      return faithTagDistribution.map(item => ({
        '身份标签': item.name,
        '用户数': item.value,
        '占比': item.percentage,
      }));
      
    case 'continent':
      return continentDistribution.map(item => ({
        '大洲': item.name,
        '用户数': item.value,
        '占比': item.percentage,
      }));
      
    case 'country':
      return countryDistribution.map(item => ({
        '国家': item.country,
        '用户数': item.count,
      }));
      
    case 'all':
      return [
        { '统计项': '总用户数', '数值': stats.totalUsers },
        { '统计项': '今日新增用户', '数值': stats.todayUsers },
        { '统计项': '当前在线用户', '数值': stats.onlineUsers },
        { '统计项': '今日活跃用户', '数值': stats.todayActiveUsers },
        { '统计项': '总笔记数', '数值': stats.totalPosts },
        { '统计项': '今日新增笔记', '数值': stats.todayNotes },
        { '统计项': '今日新增评论', '数值': stats.todayComments },
        { '统计项': '待审核内容', '数值': stats.pendingPosts + stats.pendingComments },
        { '统计项': '待处理举报', '数值': stats.pendingReports },
      ];
      
    default:
      return [];
  }
}

// 获取时间范围描述
export function getTimeRangeDescription(timeRange: string, customRange?: { start: string; end: string }): string {
  const descriptions: Record<string, string> = {
    'today': '今日',
    '7days': '近7天',
    '30days': '近30天',
    '90days': '近90天',
    'custom': customRange ? `${customRange.start} 至 ${customRange.end}` : '自定义',
  };
  return descriptions[timeRange] || '未知';
}
