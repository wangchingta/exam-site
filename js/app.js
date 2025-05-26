let questions = [];
let history = [];
let currentIndex = -1;

// 讀 JSON 並開啟第一題
async function loadQuestions() {
  try {
    const res = await fetch('data/merged_questions.json');
    if (!res.ok) throw new Error(`載入失敗：${res.status}`);
    questions = await res.json();
    showNext();  // 顯示第一題
  } catch (e) {
    console.error(e);
    alert('題庫載入失敗，請確認路徑是否正確！');
  }
}

// 顯示下一題
function showNext() {
  if (currentIndex < history.length - 1) {
    // 已經有下一題在歷史中，直接往前
    currentIndex++;
  } else {
    // 隨機取一題，推入歷史
    const q = questions[Math.floor(Math.random() * questions.length)];
    history.push(q);
    currentIndex++;
  }
  displayQuestion(history[currentIndex]);
}

// 顯示上一題
function showPrev() {
  if (currentIndex > 0) {
    currentIndex--;
    displayQuestion(history[currentIndex]);
  }
}

// 依 index 將題目渲染到畫面
function displayQuestion(q) {
  // 題目
  document.getElementById('question-text').textContent =
    `${q.id}. ${q.question}`;

  // 選項
  const form = document.getElementById('options-form');
  form.innerHTML = '';
  for (const key of Object.keys(q.options)) {
    const label = document.createElement('label');
    label.innerHTML = `
      <input type="radio" name="opt" value="${key}">
      ${key}. ${q.options[key]}
    `;
    form.appendChild(label);
  }

  // 重置答案顯示與按鈕
  const disp = document.getElementById('answer-display');
  disp.classList.add('hidden');
  document.getElementById('submit-btn').disabled = false;
  document.getElementById('next-btn').classList.add('hidden');

  // 更新「上一題」按鈕顯示
  document.getElementById('prev-btn')
    .classList.toggle('hidden', currentIndex <= 0);
}

// 送出答案
document.getElementById('submit-btn').addEventListener('click', e => {
  e.preventDefault();
  const sel = document.querySelector('input[name="opt"]:checked');
  if (!sel) return alert('請先選擇一個答案');
  const q = history[currentIndex];
  const correct = q.answer;
  const disp = document.getElementById('answer-display');
  disp.textContent = `正確答案：${correct}．${q.options[correct]}`;
  disp.classList.remove('hidden');

  // 切換按鈕
  document.getElementById('submit-btn').disabled = true;
  document.getElementById('next-btn').classList.remove('hidden');
});

// 下一題
document.getElementById('next-btn').addEventListener('click', e => {
  e.preventDefault();
  showNext();
});

// 上一題
document.getElementById('prev-btn').addEventListener('click', e => {
  e.preventDefault();
  showPrev();
});

// 啟動
window.addEventListener('DOMContentLoaded', loadQuestions);

