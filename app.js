const express = require('express');
const multer = require('multer');
const path = require('path');
const { Resend } = require('resend');
const fs = require('fs');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 初始化Express应用
const app = express();
const port = process.env.PORT || 3000;

// 初始化Supabase客户端
const supabaseUrl = 'https://caijezjlnraciswancet.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhaWplempsbnJhY2lzd2FuY2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU2NDIzMTAsImV4cCI6MjA2MTIxODMxMH0.JOqsVp_Ueg9_YXNrr2kPSDSJ5LqA42qg4-AlxgEG_xk';
const supabase = createClient(supabaseUrl, supabaseKey);

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
const resendFuckme = new Resend('re_RZToPZts_4P62dHLWbvNmtWLc5fQMBvsm');

// 路由
app.get('/', (req, res) => {
  res.render('index', {
    title: '自定义邮件发送',
    domains: ['soeasy.mom', 'fuckme.store']
  });
});

// 管理员后台路由
app.get('/admin', async (req, res) => {
  try {
    const { data: emails, error } = await supabase
      .from('email_records')
      .select('*')
      .order('sent_at', { ascending: false });

    if (error) throw error;

    res.render('admin', {
      title: '邮件管理后台',
      emails: emails
    });
  } catch (error) {
    console.error('获取邮件记录失败:', error);
    res.status(500).json({ error: '获取邮件记录失败' });
  }
});

// API: 获取单个邮件详情
app.get('/api/emails/:id', async (req, res) => {
  try {
    const emailId = req.params.id;
    const { data: email, error } = await supabase
      .from('email_records')
      .select('*')
      .eq('id', emailId)
      .single();
    
    if (error) {
      console.error('Supabase查询错误:', error);
      throw error;
    }
    
    if (!email) {
      return res.status(404).json({ error: '未找到邮件' });
    }
    
    // 格式化发送时间
    const formattedEmail = {
      ...email,
      sent_at: email.sent_at ? new Date(email.sent_at).toLocaleString('zh-CN') : '未知时间'
    };
    
    res.json(formattedEmail);
  } catch (error) {
    console.error('获取邮件详情失败:', error);
    res.status(500).json({ 
      error: '获取邮件详情失败',
      message: error.message 
    });
  }
});

app.post('/send-email', upload.array('attachments', 5), async (req, res) => {
  const uploadedFiles = [];
  try {
    const { subject, content, to, senders } = req.body;
    const sendersArray = JSON.parse(senders);
    
    if (!Array.isArray(sendersArray) || sendersArray.length === 0 || sendersArray.length > 5) {
      throw new Error('发件人数量必须在1-5个之间');
    }
    
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

    // 处理多个收件人
    const toEmails = to.split(',').map(email => email.trim()).filter(email => email.length > 0);
    if (toEmails.length > 10) {
      throw new Error('收件人数量不能超过10个');
    }
    
    // 为每个发件人发送邮件
    for (const sender of sendersArray) {
      const from = `${sender.prefix}@${sender.domain}`;
      const selectedResend = sender.domain === 'fuckme.store' ? resendFuckme : resend;
      
      try {
        console.log('准备发送邮件:', {
          from: `${sender.prefix} <${from}>`,
          to: toEmails,
          subject,
          domain: sender.domain,
          usingFuckmeAPI: sender.domain === 'fuckme.store'
        });

        const data = await selectedResend.emails.send({
          from: `${sender.prefix} <${from}>`,
          to: toEmails,
          subject,
          html: content,
          attachments: attachments.length > 0 ? attachments : undefined
        });
        
        console.log('邮件发送成功:', data);
        
        // 记录到数据库
        const { error: dbError } = await supabase
          .from('email_records')
          .insert([
            {
              from_email: from,
              to_email: toEmails.join(', '),
              subject,
              content,
              attachments: attachments.length > 0 ? attachments.map(a => a.filename) : null,
              status: 'success',
              error_message: null
            }
          ]);

        if (dbError) {
          console.error('数据库记录失败:', dbError);
        }
      } catch (error) {
        console.error('发送邮件失败:', error);
        
        // 记录失败到数据库
        const { error: dbError } = await supabase
          .from('email_records')
          .insert([
            {
              from_email: from,
              to_email: toEmails.join(', '),
              subject,
              content,
              attachments: null,
              status: 'failed',
              error_message: error.message
            }
          ]);

        if (dbError) {
          console.error('数据库记录失败:', dbError);
        }
      }
    }
    
    res.status(200).json({ success: true, message: '所有邮件发送完成' });

      console.log('Resend API 响应:', data);

      // 记录到数据库
      const { error: dbError } = await supabase
        .from('email_records')
        .insert([
          {
            from_email: from,
            to_email: toEmails.join(', '), // 存储为逗号分隔的字符串
            subject,
            content,
            attachments: attachments.length > 0 ? attachments.map(a => a.filename) : null,
            status: 'success',
            error_message: null
          }
        ]);

      if (dbError) {
        console.error('数据库记录失败:', dbError);
      }

      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Resend API详细错误:', {
        error: error.message,
        code: error.statusCode,
        details: error.response?.body,
        domain,
        from,
        to
      });
      // 删除已上传的S3文件
      await cleanupS3Files(uploadedFiles);

      // 记录失败到数据库
      const { error: dbError } = await supabase
        .from('email_records')
        .insert([
          {
            from_email: from,
            to_email: toEmails.join(', '), // 存储为逗号分隔的字符串
            subject,
            content,
            attachments: null,
            status: 'failed',
            error_message: error.message
          }
        ]);

      if (dbError) {
        console.error('数据库记录失败:', dbError);
      }

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

// 添加定时任务保持数据库活跃
setInterval(async () => {
  try {
    const { data, error } = await supabase
      .from('email_records')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('保持数据库活跃失败:', error);
    } else {
      console.log('数据库活跃保持成功');
    }
  } catch (error) {
    console.error('保持数据库活跃异常:', error);
  }
}, 24 * 60 * 60 * 1000); // 每24小时执行一次

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
}); 