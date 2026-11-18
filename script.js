const API = "https://script.google.com/macros/s/AKfycbyIQkj9DnHJ9c6dpsHxAg3Uy7nlKMBJvqNgZ-UK-M8h_ATkZVHlgUpj-GZxPdjuTA5O/exec";

let currentCount = 0;
let alreadyLiked = false;
let isProcessing = false;

// Lấy hoặc tạo Device ID
let deviceId = localStorage.getItem('like_device_id');
if (!deviceId) {
  deviceId = 'dev_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 12);
  localStorage.setItem('like_device_id', deviceId);
}

// Kiểm tra nhanh từ localStorage
if (localStorage.getItem('has_liked') === '1') {
  alreadyLiked = true;
  document.getElementById('likeBtn').classList.add('liked');
  document.getElementById('likeBtn').disabled = true;
}

function animateCount(from, to) {
  const el = document.getElementById('count');
  const duration = 700;
  const start = performance.now();

  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 4);
    const value = Math.floor(from + (to - from) * ease);
    el.textContent = value.toLocaleString('vi-VN');
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

function createParticles(btn) {
  const rect = btn.getBoundingClientRect();
  for (let i = 0; i < 14; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const angle = (i / 14) * Math.PI * 2;
    const distance = 50 + Math.random() * 50;
    p.style.setProperty('--tx', Math.cos(angle) * distance + 'px');
    p.style.setProperty('--ty', Math.sin(angle) * distance + 'px');
    p.style.left = (rect.left + rect.width / 2) + 'px';
    p.style.top = (rect.top + rect.height / 2) + 'px';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 650);
  }
}

async function callAPI(action) {
  const url = `\( {API}?action= \){action}&deviceId=${encodeURIComponent(deviceId)}`;
  const res = await fetch(url);
  return await res.json();
}

async function handleLike() {
  if (isProcessing || alreadyLiked) return;

  isProcessing = true;
  const btn = document.getElementById('likeBtn');

  // Hiện liked ngay (optimistic)
  alreadyLiked = true;
  btn.classList.add('liked');
  btn.disabled = true;
  localStorage.setItem('has_liked', '1');
  createParticles(btn);

  try {
    const data = await callAPI('like');
    
    if (data.count !== undefined && data.count !== currentCount) {
      animateCount(currentCount, data.count);
      currentCount = data.count;
    }

    if (!data.success && !data.alreadyLiked) {
      // Trường hợp hiếm: server từ chối
      alreadyLiked = false;
      btn.classList.remove('liked');
      btn.disabled = false;
      localStorage.removeItem('has_liked');
    }
  } catch (err) {
    console.error(err);
  } finally {
    isProcessing = false;
  }
}

async function fetchStatus() {
  try {
    const data = await callAPI('status');
    
    if (data.count !== undefined && data.count !== currentCount) {
      animateCount(currentCount, data.count);
      currentCount = data.count;
    }

    if (data.alreadyLiked) {
      alreadyLiked = true;
      const btn = document.getElementById('likeBtn');
      btn.classList.add('liked');
      btn.disabled = true;
      localStorage.setItem('has_liked', '1');
    }
  } catch (err) {
    console.error(err);
  }
}

// Sự kiện click
document.getElementById('likeBtn').addEventListener('click', handleLike);

// Lấy dữ liệu ngay khi vào trang
fetchStatus();

// Tự cập nhật mỗi 6 giây
setInterval(fetchStatus, 6000);
