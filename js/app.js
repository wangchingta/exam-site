let questions = [];
let current = null;

async function loadQuestions() {
  const res = await fetch('data/merged_questions.json');
  questions = await res.json();
  showNext();
}

function showNext() {
  // 清除
  document.getElementById('answer-display').classList.add('hidden');
  document.getElementById('next-btn').classList.add('hidden');
  document.getElementById('submit-btn').disabled = false;

  // 隨機取一題（也可以依序 questions.shift()）
  current = questions[Math.floor(Math.random() * questions.length)];

  // 顯示題目
  document.getElementById('question-text').textContent = `${current.id}. ${current.question}`;

  // 產生選項
  const form = document.getElementById('options-form');
  form.innerHTML = '';
  for (const key of Object.keys(current.options)) {
    const label = document.createElement('label');
    label.innerHTML = `<input type="radio" name="opt" value="${key}" /> ${key}. ${current.options[key]}`;
    form.appendChild(label);
  }
}

document.getElementById('submit-btn').addEventListener('click', (e) => {
  e.preventDefault();
  const sel = document.querySelector('input[name="opt"]:checked');
  if (!sel) return alert('請先選一個答案');
  // 顯示正確答案
  const disp = document.getElementById('answer-display');
  disp.textContent = `正確答案：${current.answer}．${current.options[current.answer]}`;
  disp.classList.remove('hidden');
  // 切換按鈕
  document.getElementById('submit-btn').disabled = true;
  document.getElementById('next-btn').classList.remove('hidden');
});

document.getElementById('next-btn').addEventListener('click', (e) => {
  e.preventDefault();
  showNext();
});

// 初始化
loadQuestions();

