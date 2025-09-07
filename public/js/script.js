document.addEventListener('DOMContentLoaded', () => {
  const emailForm = document.getElementById('emailForm');
  const fileInput = document.getElementById('attachments');
  const fileList = document.getElementById('fileList');
  const resultContainer = document.getElementById('resultContainer');
  const result = document.getElementById('result');
  const closeResultBtn = document.getElementById('closeResultBtn');
  const sendButton = document.getElementById('sendButton');
  const addSenderBtn = document.getElementById('addSender');
  const sendersContainer = document.getElementById('senders-container');
  const sendersDataInput = document.getElementById('sendersData');

  // 随机生成功能
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

  // 添加发件人
  function addSender() {
    if (sendersContainer.children.length >= 5) {
      alert('最多只能添加5个发件人');
      return;
    }
    
    const domains = <%= JSON.stringify(domains) %>;
    const senderItem = document.createElement('div');
    senderItem.className = 'sender-item';
    senderItem.style.marginTop = '0.5rem';
    
    let domainOptions = '';
    domains.forEach(domain => {
      domainOptions += `<option value="${domain}">${domain}</option>`;
    });
    
    senderItem.innerHTML = `
      <input type="text" class="sender-prefix" placeholder="前缀" required>
      <span class="at-symbol">@</span>
      <select class="sender-domain" required>
        ${domainOptions}
      </select>
      <button type="button" class="btn btn-secondary btn-sm random-sender-prefix">随机生成</button>
      <button type="button" class="btn btn-ghost btn-sm remove-sender">移除</button>
    `;
    
    sendersContainer.appendChild(senderItem);
    
    // 为新添加的随机生成按钮添加事件
    const randomBtn = senderItem.querySelector('.random-sender-prefix');
    randomBtn.addEventListener('click', function() {
      const length = Math.floor(Math.random() * 4) + 3;
      this.previousElementSibling.previousElementSibling.value = generateRandomString(length);
    });
    
    // 为移除按钮添加事件
    const removeBtn = senderItem.querySelector('.remove-sender');
    removeBtn.addEventListener('click', function() {
      if (sendersContainer.children.length > 1) {
        this.parentElement.remove();
      } else {
        alert('至少需要保留一个发件人');
      }
    });
  }

  // 初始化第一个发件人
  const firstRandomBtn = sendersContainer.querySelector('.random-sender-prefix');
  firstRandomBtn.addEventListener('click', function() {
    const length = Math.floor(Math.random() * 4) + 3;
    this.previousElementSibling.previousElementSibling.value = generateRandomString(length);
  });

  // 添加发件人按钮事件
  addSenderBtn.addEventListener('click', addSender);

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
        <div class="file-header">
          <span>${file.name} (${fileSize}MB)</span>
          <button type="button" class="btn btn-ghost btn-sm btn-with-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="progress-container" style="display: none;">
          <div class="progress-bar" style="width: 0%"></div>
          <span class="progress-text">0%</span>
        </div>
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

  // 在表单提交前收集发件人数据
  emailForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // 收集发件人数据
    const senderItems = sendersContainer.querySelectorAll('.sender-item');
    const senders = [];
    
    for (let item of senderItems) {
      const prefix = item.querySelector('.sender-prefix').value;
      const domain = item.querySelector('.sender-domain').value;
      if (!prefix || !domain) {
        alert('请填写所有发件人信息');
        return;
      }
      senders.push({ prefix, domain });
    }
    
    sendersDataInput.value = JSON.stringify(senders);
    
    sendButton.disabled = true;
    sendButton.classList.add('btn-loading');

    const formData = new FormData(emailForm);
    const files = Array.from(fileInput.files || []);
    
    // 如果有文件，显示进度条
    if (files.length > 0) {
      const fileItems = fileList.querySelectorAll('.file-item');
      fileItems.forEach(item => {
        const progressContainer = item.querySelector('.progress-container');
        if (progressContainer) {
          progressContainer.style.display = 'flex';
        }
      });
    }

    // 使用XMLHttpRequest来监听上传进度
    const xhr = new XMLHttpRequest();
    
    // 监听上传进度
    xhr.upload.addEventListener('progress', function(event) {
      if (event.lengthComputable && files.length > 0) {
        const percentComplete = (event.loaded / event.total) * 100;
        const fileItems = fileList.querySelectorAll('.file-item');
        
        // 更新所有文件的进度条
        fileItems.forEach(item => {
          const progressBar = item.querySelector('.progress-bar');
          const progressText = item.querySelector('.progress-text');
          
          if (progressBar && progressText) {
            progressBar.style.width = `${percentComplete}%`;
            progressText.textContent = `${Math.round(percentComplete)}%`;
          }
        });
      }
    });
    
    // 请求完成
    xhr.addEventListener('load', function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          
          if (data.success) {
            result.textContent = '邮件发送成功！';
            result.className = 'result success';
            emailForm.reset();
            fileList.innerHTML = '';
          } else {
            throw new Error(data.error || '发送失败');
          }
        } catch (error) {
          console.error('解析响应失败:', error);
          result.textContent = `发送失败: ${error.message}`;
          result.className = 'result error';
        }
      } else {
        result.textContent = `发送失败: HTTP错误 ${xhr.status}`;
        result.className = 'result error';
      }
      
      sendButton.disabled = false;
      sendButton.classList.remove('btn-loading');
      resultContainer.classList.remove('hidden');
    });
    
    // 请求错误
    xhr.addEventListener('error', function() {
      result.textContent = '网络错误，请稍后重试';
      result.className = 'result error';
      
      sendButton.disabled = false;
      sendButton.classList.remove('btn-loading');
      resultContainer.classList.remove('hidden');
    });
    
    // 发送请求
    xhr.open('POST', '/send-email', true);
    xhr.send(formData);
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