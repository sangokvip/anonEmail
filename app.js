const express = require('express');
const multer = require('multer');
const path = require('path');
const { Resend } = require('resend');
const fs = require('fs');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

// 初始化Express应用
const app = express();
const port = process.env.PORT || 3000;

// 初始化S3客户端
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// 设置视图引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 配置内存存储的multer
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 限制10MB
    files: 5 // 最多5个文件
  }
});

// 初始化Resend客户端
const resend = new Resend(process.env.RESEND_API_KEY);

// 路由
app.get('/', (req, res) => {
  res.render('index', {
    title: '自定义邮件发送',
    domains: ['soeasy.mom']
  });
});

app.post('/send-email', upload.array('attachments', 5), async (req, res) => {
  const uploadedFiles = [];
  try {
    const { prefix, domain, subject, content, to } = req.body;
    const from = `${prefix}@${domain}`;
    const files = req.files || [];
    
    // 上传文件到S3
    const attachments = await Promise.all(files.map(async (file) => {
      try {
        const key = `${Date.now()}-${file.originalname}`;
        const uploadParams = {
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype
        };
        
        await s3Client.send(new PutObjectCommand(uploadParams));
        uploadedFiles.push(key);
        
        return {
          filename: file.originalname,
          content: file.buffer
        };
      } catch (error) {
        console.error('文件上传错误:', error);
        throw new Error(`文件 ${file.originalname} 上传失败: ${error.message}`);
      }
    }));

    // 发送邮件
    try {
      const data = await resend.emails.send({
        from: `${prefix} <${from}>`,
        to: [to],
        subject,
        html: content,
        attachments: attachments.length > 0 ? attachments : undefined
      });

      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Resend API错误:', error);
      // 删除已上传的S3文件
      await cleanupS3Files(uploadedFiles);
      throw new Error(`邮件发送失败: ${error.message}`);
    }
  } catch (error) {
    console.error('操作失败:', error);
    
    // 确保清理S3文件
    if (uploadedFiles.length > 0) {
      await cleanupS3Files(uploadedFiles);
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message || '发送过程中出错'
    });
  }
});

// 清理S3文件的辅助函数
async function cleanupS3Files(files) {
  try {
    await Promise.all(files.map(key => 
      s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key
      }))
    ));
  } catch (error) {
    console.error('清理S3文件失败:', error);
  }
}

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
}); 