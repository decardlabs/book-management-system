// 登录脚本
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// 显示提示
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

// 登录处理
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(data.error || '登录失败', 'error');
      return;
    }

    // 保存token和用户信息
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    showToast('登录成功', 'success');

    // 跳转到管理面板
    setTimeout(() => {
      window.location.href = '/dashboard';
    }, 500);
  } catch (error) {
    console.error('登录错误:', error);
    showToast('网络错误，请重试', 'error');
  }
});

// 检查是否已登录
window.addEventListener('load', () => {
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = '/dashboard';
  }
});
