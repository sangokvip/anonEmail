document.addEventListener('DOMContentLoaded', () => {
  const emailForm = document.getElementById('emailForm');
  const fileInput = document.getElementById('attachments');
  const fileList = document.getElementById('fileList');
  const resultContainer = document.getElementById('resultContainer');
  const result = document.getElementById('result');
  const closeResultBtn = document.getElementById('closeResultBtn');
  const sendButton = document.getElementById('sendButton');

  // 随机生成功能
  const randomPrefix = document.getElementById('randomPrefix');
  const randomSubject = document.getElementById('randomSubject');
  const randomContent = document.getElementById('randomContent');

  // 生成随机字符串的函数
  function generateRandomString(length, type = 'mixed') {
    const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let chars = '';
    
    switch(type) {
      case 'letters':
        chars = letters;
        break;
      case 'numbers':
        chars = numbers;
        break;
      default:
        chars = letters + numbers;
    }

    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 生成随机单词的函数
  function generateRandomWords(count) {
    const words = [
      '你好', '世界', '快乐', '阳光', '生活', '美好', '希望', '梦想', '未来', '成功',
      '幸福', '健康', '平安', '喜悦', '温暖', '友谊', '爱心', '真诚', '勇气', '智慧',
      '力量', '自由', '和平', '创新', '进步', '发展', '团结', '奋斗', '成长', '成就'
    ];
    
    let result = [];
    for (let i = 0; i < count; i++) {
      result.push(words[Math.floor(Math.random() * words.length)]);
    }
    return result.join('');
  }

  // 随机生成邮箱前缀
  randomPrefix.addEventListener('click', () => {
    const length = Math.floor(Math.random() * 4) + 3; // 3-6位
    document.getElementById('prefix').value = generateRandomString(length);
  });

  // 随机生成邮件主题
  randomSubject.addEventListener('click', () => {
    document.getElementById('subject').value = generateRandomWords(4); // 生成4个词组成主题
  });

  // 随机生成邮件内容
  randomContent.addEventListener('click', () => {
    document.getElementById('content').value = generateRandomWords(10); // 生成10个词组成内容
  });

  // 处理文件选择
  fileInput.addEventListener('change', () => {
    fileList.innerHTML = '';
    const files = Array.from(fileInput.files);

    if (files.length > 0) {
      files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        const fileName = document.createElement('span');
        fileName.textContent = `${file.name} (${formatFileSize(file.size)})`;
        
        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '&times;';
        removeBtn.title = '移除附件';
        
        removeBtn.addEventListener('click', () => {
          fileItem.remove();
          if (fileList.children.length === 0) {
            alert('附件已全部移除，您需要重新选择文件。');
            fileInput.value = '';
          }
        });
        
        fileItem.appendChild(fileName);
        fileItem.appendChild(removeBtn);
        fileList.appendChild(fileItem);
      });
    }
  });

  // 提交表单
  emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
      sendButton.disabled = true;
      sendButton.textContent = '发送中...';
      
      const formData = new FormData(emailForm);
      
      const response = await fetch('/send-email', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        result.className = 'result success';
        result.innerHTML = `
          <h3>邮件发送成功！</h3>
          <p>邮件已从 ${formData.get('prefix')}@${formData.get('domain')} 发送至 ${formData.get('to')}</p>
        `;
        // 清空表单
        emailForm.reset();
        fileList.innerHTML = '';
      } else {
        result.className = 'result error';
        result.innerHTML = `
          <h3>邮件发送失败</h3>
          <p>错误信息: ${data.error}</p>
        `;
      }
    } catch (error) {
      console.error('发送错误:', error);
      result.className = 'result error';
      let errorMessage = '发送过程中出错';
      
      try {
        const errorData = await error.response?.json();
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        errorMessage = error.message || '发送过程中出错';
      }
      
      result.innerHTML = `
        <h3>发送失败</h3>
        <p>错误信息: ${errorMessage}</p>
      `;
    } finally {
      resultContainer.classList.remove('hidden');
      sendButton.disabled = false;
      sendButton.textContent = '发送邮件';
    }
  });

  // 关闭结果提示
  closeResultBtn.addEventListener('click', () => {
    resultContainer.classList.add('hidden');
  });

  // 文件大小格式化
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}); 