// 图书管理系统主脚本
const API_BASE = '/api';

// 全局状态
let currentUser = null;
let currentTab = 'dashboard';

// 初始化
async function init() {
  // 检查登录状态
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');

  if (!token || !user) {
    window.location.href = '/';
    return;
  }

  currentUser = JSON.parse(user);

  // 设置用户角色样式
  if (currentUser.role === 'admin') {
    document.body.classList.add('admin');
  }

  // 更新用户信息显示
  document.getElementById('currentUserName').textContent = currentUser.username;
  document.getElementById('currentUserRole').textContent = currentUser.role === 'admin' ? '管理员' : '普通用户';

  // 加载初始数据
  await loadDashboard();

  // 绑定事件
  bindEvents();
}

// 绑定事件
function bindEvents() {
  // 导航切换
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = item.dataset.tab;
      switchTab(tab);
    });
  });

  // 退出登录
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // 搜索图书
  document.getElementById('searchBookBtn')?.addEventListener('click', loadBooks);
  document.getElementById('bookSearch')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loadBooks();
  });
  document.getElementById('bookCategoryFilter')?.addEventListener('change', loadBooks);
  document.getElementById('bookStatusFilter')?.addEventListener('change', loadBooks);

  // 借阅状态筛选
  document.getElementById('borrowStatusFilter')?.addEventListener('change', loadBorrows);

  // 添加图书
  document.getElementById('addBookBtn')?.addEventListener('click', showAddBookModal);

  // 添加用户
  document.getElementById('addUserBtn')?.addEventListener('click', showAddUserModal);

  // 模态框关闭
  document.querySelector('.modal-close').addEventListener('click', closeModal);
  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
}

// 切换标签页
async function switchTab(tab) {
  currentTab = tab;

  // 更新导航状态
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tab);
  });

  // 更新内容区域
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tab}`);
  });

  // 加载对应数据
  switch (tab) {
    case 'dashboard':
      await loadDashboard();
      break;
    case 'books':
      await loadBooks();
      break;
    case 'borrows':
      await loadBorrows();
      break;
    case 'users':
      await loadUsers();
      break;
  }
}

// API请求封装
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...defaultOptions,
    ...options,
    headers: { ...defaultOptions.headers, ...options.headers }
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || '请求失败');
  }

  return response.json();
}

// 显示提示
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

// 退出登录
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

// 加载概览数据
async function loadDashboard() {
  try {
    // 加载我的借阅
    const myBorrows = await apiRequest('/borrows/my-borrows');
    renderMyBorrows(myBorrows);

    // 如果是管理员，加载统计数据
    if (currentUser.role === 'admin') {
      const books = await apiRequest('/books');
      const borrowStats = await apiRequest('/borrows/stats');
      const userStats = await apiRequest('/users/stats');

      document.getElementById('totalBooks').textContent = books.reduce((sum, b) => sum + b.total_quantity, 0);
      document.getElementById('availableBooks').textContent = books.reduce((sum, b) => sum + b.available_quantity, 0);
      document.getElementById('borrowingBooks').textContent = borrowStats.find(s => s.status === 'borrowed')?.count || 0;
      document.getElementById('totalUsers').textContent = userStats.reduce((sum, s) => sum + s.count, 0);
    } else {
      // 普通用户只显示自己的借阅统计
      document.getElementById('borrowingBooks').textContent = myBorrows.filter(b => b.status === 'borrowed' || b.status === 'overdue').length;
    }
  } catch (error) {
    console.error('加载概览失败:', error);
  }
}

// 渲染我的借阅
function renderMyBorrows(borrows) {
  const container = document.getElementById('myBorrowsList');

  if (borrows.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📖</div><p>暂无借阅记录</p></div>';
    return;
  }

  container.innerHTML = borrows.map(borrow => `
    <div class="borrow-item">
      <div class="borrow-info">
        <h4>${borrow.book_title}</h4>
        <div class="borrow-meta">
          借阅日期: ${new Date(borrow.borrow_date).toLocaleDateString('zh-CN')} |
          应还日期: ${new Date(borrow.due_date).toLocaleDateString('zh-CN')}
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:0.75rem;">
        <span class="borrow-status ${borrow.status}">${getStatusText(borrow.status)}</span>
        ${borrow.status !== 'returned' ? `<button class="btn btn-success btn-sm" onclick="returnBook(${borrow.id})">归还</button>` : ''}
      </div>
    </div>
  `).join('');
}

// 加载图书列表
async function loadBooks() {
  try {
    const search = document.getElementById('bookSearch')?.value;
    const category = document.getElementById('bookCategoryFilter')?.value;
    const status = document.getElementById('bookStatusFilter')?.value;

    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (status) params.append('status', status);

    const books = await apiRequest(`/books?${params.toString()}`);
    renderBooks(books);
  } catch (error) {
    console.error('加载图书失败:', error);
    showToast('加载图书失败', 'error');
  }
}

// 渲染图书列表
function renderBooks(books) {
  const container = document.getElementById('booksList');

  if (books.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📚</div><p>暂无图书</p></div>';
    return;
  }

  container.innerHTML = books.map(book => `
    <div class="book-card">
      <div class="book-cover">📚</div>
      <div class="book-info">
        <div class="book-title" title="${book.title}">${book.title}</div>
        <div class="book-meta">作者: ${book.author}</div>
        <div class="book-meta">ISBN: ${book.isbn}</div>
        ${book.category ? `<div class="book-meta">分类: ${book.category}</div>` : ''}
        <div class="book-meta">可借: ${book.available_quantity}/${book.total_quantity}</div>
        <span class="book-status ${book.available_quantity > 0 ? 'available' : 'borrowed'}">
          ${book.available_quantity > 0 ? '可借阅' : '已借完'}
        </span>
        <div class="book-actions">
          ${book.available_quantity > 0 ? `
            <button class="btn btn-primary btn-sm" onclick="borrowBook(${book.id})">借阅</button>
          ` : ''}
          ${currentUser.role === 'admin' ? `
            <button class="btn btn-secondary btn-sm" onclick="showEditBookModal(${book.id})">编辑</button>
            <button class="btn btn-danger btn-sm" onclick="deleteBook(${book.id})">删除</button>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

// 借阅图书
async function borrowBook(bookId) {
  try {
    await apiRequest('/borrows', {
      method: 'POST',
      body: JSON.stringify({ book_id: bookId })
    });
    showToast('借阅成功', 'success');
    loadBooks();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 归还图书
async function returnBook(borrowId) {
  try {
    await apiRequest(`/borrows/${borrowId}/return`, {
      method: 'PUT'
    });
    showToast('归还成功', 'success');
    if (currentTab === 'dashboard') loadDashboard();
    else loadBorrows();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 加载借阅记录
async function loadBorrows() {
  try {
    const status = document.getElementById('borrowStatusFilter')?.value;

    let endpoint = currentUser.role === 'admin' ? '/borrows' : '/borrows/my-borrows';
    if (status && currentUser.role === 'admin') {
      endpoint += `?status=${status}`;
    }

    const borrows = await apiRequest(endpoint);
    renderBorrows(borrows);
  } catch (error) {
    console.error('加载借阅记录失败:', error);
    showToast('加载失败', 'error');
  }
}

// 渲染借阅记录
function renderBorrows(borrows) {
  const container = document.getElementById('borrowsList');

  if (borrows.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📖</div><p>暂无借阅记录</p></div>';
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>图书</th>
          <th>借阅人</th>
          <th>借阅日期</th>
          <th>应还日期</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${borrows.map(borrow => `
          <tr>
            <td>${borrow.book_title}</td>
            <td>${currentUser.role === 'admin' ? borrow.user_name : currentUser.username}</td>
            <td>${new Date(borrow.borrow_date).toLocaleDateString('zh-CN')}</td>
            <td>${new Date(borrow.due_date).toLocaleDateString('zh-CN')}</td>
            <td><span class="borrow-status ${borrow.status}">${getStatusText(borrow.status)}</span></td>
            <td>
              <div class="table-actions">
                ${borrow.status !== 'returned' ? `
                  <button class="btn btn-success btn-sm" onclick="returnBook(${borrow.id})">归还</button>
                ` : ''}
                ${currentUser.role === 'admin' ? `
                  <button class="btn btn-danger btn-sm" onclick="deleteBorrow(${borrow.id})">删除</button>
                ` : ''}
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// 加载用户列表
async function loadUsers() {
  try {
    const users = await apiRequest('/users');
    renderUsers(users);
  } catch (error) {
    console.error('加载用户失败:', error);
    showToast('加载失败', 'error');
  }
}

// 渲染用户列表
function renderUsers(users) {
  const container = document.getElementById('usersList');

  if (users.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">👥</div><p>暂无用户</p></div>';
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>用户名</th>
          <th>邮箱</th>
          <th>角色</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        ${users.map(user => `
          <tr>
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.email || '-'}</td>
            <td><span class="badge badge-${user.role}">${user.role === 'admin' ? '管理员' : '普通用户'}</span></td>
            <td>${new Date(user.created_at).toLocaleDateString('zh-CN')}</td>
            <td>
              <div class="table-actions">
                ${user.id !== currentUser.id ? `
                  <button class="btn btn-danger btn-sm" onclick="deleteUser(${user.id})">删除</button>
                ` : '<span class="text-secondary">当前用户</span>'}
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    'borrowed': '借阅中',
    'returned': '已归还',
    'overdue': '已逾期'
  };
  return statusMap[status] || status;
}

// 模态框操作
function showModal(html) {
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modal').classList.add('show');
}

function closeModal() {
  document.getElementById('modal').classList.remove('show');
}

// 显示添加图书模态框
function showAddBookModal() {
  showModal(`
    <div class="modal-header">
      <h2>添加图书</h2>
    </div>
    <form id="bookForm">
      <div class="form-group">
        <label for="bookIsbn">ISBN *</label>
        <input type="text" id="bookIsbn" name="isbn" required>
      </div>
      <div class="form-group">
        <label for="bookTitle">书名 *</label>
        <input type="text" id="bookTitle" name="title" required>
      </div>
      <div class="form-group">
        <label for="bookAuthor">作者 *</label>
        <input type="text" id="bookAuthor" name="author" required>
      </div>
      <div class="form-group">
        <label for="bookPublisher">出版社</label>
        <input type="text" id="bookPublisher" name="publisher">
      </div>
      <div class="form-group">
        <label for="bookPublishDate">出版日期</label>
        <input type="date" id="bookPublishDate" name="publish_date">
      </div>
      <div class="form-group">
        <label for="bookCategory">分类</label>
        <select id="bookCategory" name="category">
          <option value="">请选择</option>
          <option value="文学">文学</option>
          <option value="科技">科技</option>
          <option value="艺术">艺术</option>
          <option value="历史">历史</option>
          <option value="哲学">哲学</option>
          <option value="其他">其他</option>
        </select>
      </div>
      <div class="form-group">
        <label for="bookQuantity">数量 *</label>
        <input type="number" id="bookQuantity" name="total_quantity" min="1" value="1" required>
      </div>
      <div class="form-group">
        <label for="bookDescription">简介</label>
        <textarea id="bookDescription" name="description"></textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
        <button type="submit" class="btn btn-primary">保存</button>
      </div>
    </form>
  `);

  document.getElementById('bookForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveBook();
  });
}

// 保存图书
async function saveBook() {
  const bookId = document.getElementById('bookForm').dataset.id;
  const formData = {
    isbn: document.getElementById('bookIsbn').value,
    title: document.getElementById('bookTitle').value,
    author: document.getElementById('bookAuthor').value,
    publisher: document.getElementById('bookPublisher').value,
    publish_date: document.getElementById('bookPublishDate').value || null,
    category: document.getElementById('bookCategory').value || null,
    total_quantity: parseInt(document.getElementById('bookQuantity').value),
    description: document.getElementById('bookDescription').value || null
  };

  try {
    if (bookId) {
      await apiRequest(`/books/${bookId}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      showToast('更新成功', 'success');
    } else {
      await apiRequest('/books', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      showToast('添加成功', 'success');
    }
    closeModal();
    loadBooks();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 显示编辑图书模态框
async function showEditBookModal(bookId) {
  try {
    const book = await apiRequest(`/books/${bookId}`);
    showAddBookModal();
    document.getElementById('bookForm').dataset.id = bookId;
    document.getElementById('bookIsbn').value = book.isbn;
    document.getElementById('bookTitle').value = book.title;
    document.getElementById('bookAuthor').value = book.author;
    document.getElementById('bookPublisher').value = book.publisher || '';
    document.getElementById('bookPublishDate').value = book.publish_date || '';
    document.getElementById('bookCategory').value = book.category || '';
    document.getElementById('bookQuantity').value = book.total_quantity;
    document.getElementById('bookDescription').value = book.description || '';
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 删除图书
async function deleteBook(bookId) {
  if (!confirm('确定要删除这本图书吗？')) return;
  try {
    await apiRequest(`/books/${bookId}`, { method: 'DELETE' });
    showToast('删除成功', 'success');
    loadBooks();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 删除借阅记录
async function deleteBorrow(borrowId) {
  if (!confirm('确定要删除这条借阅记录吗？')) return;
  try {
    await apiRequest(`/borrows/${borrowId}`, { method: 'DELETE' });
    showToast('删除成功', 'success');
    loadBorrows();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 显示添加用户模态框
function showAddUserModal() {
  showModal(`
    <div class="modal-header">
      <h2>添加用户</h2>
    </div>
    <form id="userForm">
      <div class="form-group">
        <label for="newUsername">用户名 *</label>
        <input type="text" id="newUsername" name="username" required>
      </div>
      <div class="form-group">
        <label for="newEmail">邮箱</label>
        <input type="email" id="newEmail" name="email">
      </div>
      <div class="form-group">
        <label for="newPassword">密码 *</label>
        <input type="password" id="newPassword" name="password" required>
      </div>
      <div class="form-group">
        <label for="newRole">角色</label>
        <select id="newRole" name="role">
          <option value="user">普通用户</option>
          <option value="admin">管理员</option>
        </select>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="closeModal()">取消</button>
        <button type="submit" class="btn btn-primary">创建</button>
      </div>
    </form>
  `);

  document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: document.getElementById('newUsername').value,
          email: document.getElementById('newEmail').value || null,
          password: document.getElementById('newPassword').value,
          role: document.getElementById('newRole').value
        })
      });
      showToast('用户创建成功', 'success');
      closeModal();
      loadUsers();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

// 删除用户
async function deleteUser(userId) {
  if (!confirm('确定要删除该用户吗？')) return;
  try {
    await apiRequest(`/users/${userId}`, { method: 'DELETE' });
    showToast('删除成功', 'success');
    loadUsers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// 页面加载完成后初始化
window.addEventListener('load', init);
