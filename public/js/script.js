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

  // 文件上传处理
  fileInput.addEventListener('change', function(e) {
    fileList.innerHTML = '';
    const files = Array.from(e.target.files);
    const maxFiles = 5;
    
    if (files.length > maxFiles) {
      alert(`最多只能上传 ${maxFiles} 个文件`);
      fileInput.value = '';
      return;
    }
    
    files.forEach(file => {
      const fileSize = (file.size / 1024 / 1024).toFixed(2);
      if (fileSize > 10) {
        alert(`文件 ${file.name} 超过10MB限制`);
        return;
      }
      
      const fileItem = document.createElement('div');
      fileItem.className = 'file-item';
      fileItem.innerHTML = `
        <span>${file.name} (${fileSize}MB)</span>
        <button type="button" class="btn btn-ghost btn-sm btn-with-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      `;
      
      const removeButton = fileItem.querySelector('button');
      removeButton.onclick = function() {
        fileItem.remove();
        // 由于无法直接修改 FileList，我们需要清空 input
        fileInput.value = '';
      };
      
      fileList.appendChild(fileItem);
    });
  });

  // 处理表单提交
  emailForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    sendButton.disabled = true;
    sendButton.classList.add('btn-loading');

    const formData = new FormData(emailForm);

    try {
      const response = await fetch('/send-email', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        result.textContent = '邮件发送成功！';
        result.className = 'result success';
        emailForm.reset();
        fileList.innerHTML = '';
      } else {
        throw new Error(data.error || '发送失败');
      }
    } catch (error) {
      console.error('发送错误详情:', error);
      result.textContent = `发送失败: ${error.message}`;
      if (error.response) {
        result.textContent += `\n详细信息: ${JSON.stringify(error.response)}`;
      }
      result.className = 'result error';
    } finally {
      sendButton.disabled = false;
      sendButton.classList.remove('btn-loading');
      resultContainer.classList.remove('hidden');
    }
  });

  // 关闭结果提示
  closeResultBtn.addEventListener('click', function() {
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