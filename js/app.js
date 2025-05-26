let questions = [];
let currentQ = null;

// 讀取題庫 JSON
async function loadQuestions() {
  try {
    const res = await fetch('data/merged_questions.json');
    if (!res.ok) throw new Error(`載入失敗：${res.status}`);
    questions = await res.json();
    showNextQuestion();
  } catch (e) {
    console.error(e);
    alert('題庫載入失敗，請確認路徑是否正確！');
  }
}

// 顯示下一題
function showNextQuestion() {
  // 重置 UI
  document.getElementById('answer-display').classList.add('hidden');
  document.getElementById('next-btn').classList.add('hidden');
  document.getElementById('submit-btn').disabled = false;

  // 隨機選一題（也可以改成依序 questions.shift()）
  currentQ = questions[Math.floor(Math.random() * questions.length)];

  // 顯示題目
  document.getElementById('question-text').textContent =
    `${currentQ.id}. ${currentQ.question}`;

  // 產生選項
  const form = document.getElementById('options-form');
  form.innerHTML = '';
  for (const key of Object.keys(currentQ.options)) {
    const label = document.createElement('label');
    label.innerHTML = `
      <input type="radio" name="opt" value="${key}">
      ${key}. ${currentQ.options[key]}
    `;
    form.appendChild(label);
  }
}

// 監聽「送出」按鈕
document.getElementById('submit-btn').addEventListener('click', (e) => {
  e.preventDefault();
  const sel = document.querySelector('input[name="opt"]:checked');
  if (!sel) {
    alert('請先選擇一個答案');
    return;
  }
  // 顯示正確答案
  const disp = document.getElementById('answer-display');
  const correct = currentQ.answer;
  disp.textContent =
    `正確答案：${correct}．${currentQ.options[correct]}`;
  disp.classList.remove('hidden');

  // 切換按鈕狀態
  document.getElementById('submit-btn').disabled = true;
  document.getElementById('next-btn').classList.remove('hidden');
});

// 監聽「下一題」按鈕
document.getElementById('next-btn').addEventListener('click', (e) => {
  e.preventDefault();
  showNextQuestion();
});

// 初始化
window.addEventListener('DOMContentLoaded', loadQuestions);

