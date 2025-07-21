import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
    try {
        // 获取查询参数
        const { position } = req.query;
        
        // 验证输入
        const positionNum = parseInt(position);
        if (isNaN(positionNum) || positionNum < 1 || positionNum > 100000000) {
            return res.status(400).json({ error: '请输入1到1亿之间的有效数字' });
        }
        
        // 计算文件索引和偏移量
        const fileIndex = Math.ceil(positionNum / 10000000);
        const offset = positionNum - (fileIndex - 1) * 10000000 - 1; // 调整为0-based索引
        
        // 构建文件路径
        const filePath = join(process.cwd(), `pi_${fileIndex}.txt`);
        
        // 读取文件并获取对应位置的数字
        const data = readFileSync(filePath, 'utf8');
        const digit = data.charAt(offset);
        
        // 验证是否成功获取数字
        if (!digit) {
            return res.status(500).json({ error: '无法获取指定位置的数字' });
        }
        
        // 返回结果
        res.status(200).json({ digit });
        
    } catch (error) {
        console.error('查询出错:', error);
        res.status(500).json({ error: '服务器内部错误，请稍后再试' });
    }
}