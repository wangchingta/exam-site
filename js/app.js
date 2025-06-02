/**
 * 目標：利用 localStorage 將 history（由 question id 組成的陣列）和 currentIndex
 * 存下來，重新開啟時讀回，停留在上一次作答的題目。
 */

let questions = [];     // 全部題庫（從 merged_questions.json 載入）
let history = [];       // 使用者在本次 session 已經看過的題目（item 只包含 question 物件）
let currentIndex = -1;  // history 裡面目前指到第幾筆

// localStorage 的 key
const STORAGE_KEY = 'quizState';

// 讀取題庫 JSON，並嘗試從 localStorage 恢復上一次狀態
async function loadQuestions() {
  try {
    const res = await fetch('data/merged_questions.json');
    if (!res.ok) throw new Error(`載入失敗：${res.status}`);
    questions = await res.json();

    // 嘗試從 localStorage 讀回上一次 state
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      const savedIds = state.historyIds || [];
      const savedIndex = state.currentIndex;

      // 用 savedIds 將 history 重新組成正確的 question 物件陣列
      history = savedIds
        .map(id => questions.find(q => q.id === id))
        .filter(q => q !== undefined); // 只保留找得到的

      // 如果 savedIndex 合法，就直接把 currentIndex 設回去
      if (
        typeof savedIndex === 'number' &&
        savedIndex >= 0 &&
        savedIndex < history.length
      ) {
        currentIndex = savedIndex;
        // 先把題目渲染出來
        displayQuestion(history[currentIndex]);
        return;
      }
    }

    // 如果 localStorage 沒有，或狀態不合法，就從第一題開始
    showNext();
  } catch (e) {
    console.error(e);
    alert('題庫載入失敗，請確認路徑是否正確！');
  }
}

// 顯示下一題：若已有 history 裡面對應的下一筆，就直接往前；否則隨機 pick 新題，push 進 history
function showNext() {
  if (currentIndex < history.length - 1) {
    // 已在 history 裡面存在下一筆題目，直接跳到那一筆
    currentIndex++;
  } else {
    // 隨機取一題，加入 history
    const q = questions[Math.floor(Math.random() * questions.length)];
    history.push(q);
    currentIndex = history.length - 1;
  }
  displayQuestion(history[currentIndex]);
  saveState();
}

// 顯示上一題：若 currentIndex > 0，則先減 1，再顯示
function showPrev() {
  if (currentIndex > 0) {
    currentIndex--;
    displayQuestion(history[currentIndex]);
    saveState();
  }
}

/**
 * 將第 index 筆題目（q）渲染到畫面
 */
function displayQuestion(q) {
  // 題目文字
  document.getElementById('question-text').textContent =
    `${q.id}. ${q.question}`;

  // 選項列表
  const form = document.getElementById('options-form');
  form.innerHTML = ''; // 清空原本內容
  for (const key of Object.keys(q.options)) {
    const label = document.createElement('label');
    label.innerHTML = `
      <input type="radio" name="opt" value="${key}">
      ${key}. ${q.options[key]}
    `;
    form.appendChild(label);
  }

  // 重置「答案顯示區」與按鈕狀態
  const disp = document.getElementById('answer-display');
  disp.classList.add('hidden');
  document.getElementById('submit-btn').disabled = false;
  document.getElementById('next-btn').classList.add('hidden');

  // 只要切換題目就更新「上一題按鈕」的顯示/隱藏
  document.getElementById('prev-btn')
    .classList.toggle('hidden', currentIndex <= 0);
}

// 監聽「送出」按鈕：跑出答案，並讓「下一題」按鈕顯示
document.getElementById('submit-btn').addEventListener('click', e => {
  e.preventDefault();
  const selected = document.querySelector('input[name="opt"]:checked');
  if (!selected) {
    return alert('請先選擇一個答案');
  }
  const q = history[currentIndex];
  const correct = q.answer;
  const disp = document.getElementById('answer-display');
  disp.textContent = `正確答案：${correct}．${q.options[correct]}`;
  disp.classList.remove('hidden');

  document.getElementById('submit-btn').disabled = true;
  document.getElementById('next-btn').classList.remove('hidden');

  // 使用者送出後，我們也可以再一次將 state 存到 localStorage
  saveState();
});

// 監聽「下一題」按鈕
document.getElementById('next-btn').addEventListener('click', e => {
  e.preventDefault();
  showNext();
});

// 監聽「上一題」按鈕
document.getElementById('prev-btn').addEventListener('click', e => {
  e.preventDefault();
  showPrev();
});

// 把目前 history 與 currentIndex 存到 localStorage
function saveState() {
  // 只儲存「history 裡面各題目的 id」和「currentIndex」
  const historyIds = history.map(q => q.id);
  const state = {
    historyIds,
    currentIndex
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// 啟動：DOM 載入完成後呼叫 loadQuestions()
window.addEventListener('DOMContentLoaded', loadQuestions);

