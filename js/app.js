/**
 * 完整範例：在 localStorage 中同時管理：
 *  1. history + currentIndex（使用者曾看過的題目序列、目前位置），
 *  2. showCounts（記錄每題已經被顯示過的次數），
 * 並在「取新題」時，優先從「出現次數最少」的題目裡隨機選。
 */

let questions = [];       // 從 merged_questions.json 載入的所有題目
let history = [];         // 使用者本次 session 已經看過的題目物件陣列
let currentIndex = -1;    // history 裡目前的索引
let showCounts = {};      // { [qid]: 次數 }，記錄每題已出現的次數

const STORAGE_KEY = 'quizState';   // localStorage key for history + currentIndex
const COUNTS_KEY  = 'quizCounts';  // localStorage key for showCounts

// -----------------------------------------------------------------------------
// 1. loadQuestions：
//    • 載入 questions.json
//    • 載入 showCounts（若 localStorage 裡沒有，就初始化所有 id 為 0）
//    • 嘗試從 localStorage 恢復 history 與 currentIndex；
//      如果成功，就直接顯示該題，不再「遞增次數」
//    • 否則從第一題開始 showNext()
// -----------------------------------------------------------------------------
async function loadQuestions() {
  try {
    // 1.1 取得題庫
    const res = await fetch('data/merged_questions.json');
    if (!res.ok) throw new Error(`載入失敗：${res.status}`);
    questions = await res.json();

    // 1.2 讀取 showCounts
    loadCounts();

    // 1.3 嘗試從 localStorage 讀回上一次的 history / currentIndex
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw);
      const savedIds   = state.historyIds || [];
      const savedIndex = state.currentIndex;

      // 用 savedIds 建立正確的 history（array of question objects）
      history = savedIds
        .map(id => questions.find(q => q.id === id))
        .filter(q => q !== undefined); // 只保留找到的

      // 如果 savedIndex 是合法值，就把 currentIndex 設回來，並顯示該題
      if (
        typeof savedIndex === 'number' &&
        savedIndex >= 0 &&
        savedIndex < history.length
      ) {
        currentIndex = savedIndex;
        displayQuestion(history[currentIndex]);
        return; // 不要再走 showNext()，因為這題已經算過一次次數
      }
    }

    // 如果 localStorage 沒資料或 index 不合法，就用 showNext() 從頭開始
    showNext();

  } catch (e) {
    console.error(e);
    alert('題庫載入失敗，請確認路徑是否正確！');
  }
}

// -----------------------------------------------------------------------------
// 2. loadCounts & saveCounts：
//    • loadCounts：從 localStorage 拿到 quizCounts，如果沒有就把所有 qid 初始化為 0
//    • saveCounts：把 showCounts 存回 localStorage
// -----------------------------------------------------------------------------
function loadCounts() {
  const raw = localStorage.getItem(COUNTS_KEY);
  if (raw) {
    // 如果 localStorage 有，就直接 parse
    showCounts = JSON.parse(raw);
  } else {
    // 否則第一次載入，把每個題目的 id 都設成 0
    showCounts = {};
    questions.forEach(q => {
      showCounts[q.id] = 0;
    });
    localStorage.setItem(COUNTS_KEY, JSON.stringify(showCounts));
  }
}
function saveCounts() {
  localStorage.setItem(COUNTS_KEY, JSON.stringify(showCounts));
}

// -----------------------------------------------------------------------------
// 3. showNext：
//    如果 currentIndex < history.length - 1，代表使用者在「瀏覽歷史題目」，
//    這時直接把 currentIndex++，從 history 取出舊題，不要修改 showCounts。
//    否則就真的「取新題」，並且：
//      (1) 算出所有 showCounts 中最小的次數 minCount
//      (2) 從 questions 裡挑出所有 count === minCount 的題目做為 candidates
//      (3) 隨機 pick 一個、push 到 history，並對 showCounts[id]++、saveCounts()
// -----------------------------------------------------------------------------
function showNext() {
  if (currentIndex < history.length - 1) {
    // 已存在下一筆歷史題目
    currentIndex++;
  } else {
    // 真正取「新題」：先找出 showCounts 裡最小的次數
    const countsArr = Object.values(showCounts);
    const minCount = Math.min(...countsArr);

    // 篩出所有次數等於 minCount 的題目
    const candidates = questions.filter(q => showCounts[q.id] === minCount);

    // 從 candidates 隨機選一個
    const q = candidates[Math.floor(Math.random() * candidates.length)];

    // 推到 history，更新 currentIndex
    history.push(q);
    currentIndex = history.length - 1;

    // 將該題出現次數加 1，並存回 localStorage
    showCounts[q.id]++;
    saveCounts();
  }

  // 顯示挑到的題目
  displayQuestion(history[currentIndex]);

  // 把 historyIds + currentIndex 存到 localStorage
  saveState();
}

// -----------------------------------------------------------------------------
// 4. showPrev：
//    如果 currentIndex > 0，就 currentIndex--，從 history 拿舊題；
//    切換題目後記得 saveState()。
// -----------------------------------------------------------------------------
function showPrev() {
  if (currentIndex > 0) {
    currentIndex--;
    displayQuestion(history[currentIndex]);
    saveState();
  }
}

// -----------------------------------------------------------------------------
// 5. displayQuestion：
//    • 將 history[currentIndex] 那一題 q 的內容渲染到 HTML
//    • 重置「答案顯示區」與按鈕狀態
//    • 顯示／隱藏「上一題」按鈕：只有當 currentIndex > 0 時才顯示
// -----------------------------------------------------------------------------
function displayQuestion(q) {
  // (1) 顯示題目文字
  document.getElementById('question-text').textContent =
    `${q.id}. ${q.question}`;

  // (2) 產生選項的 radio button
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

  // (3) 重置「答案顯示區」與按鈕
  const disp = document.getElementById('answer-display');
  disp.classList.add('hidden');
  document.getElementById('submit-btn').disabled = false;
  document.getElementById('next-btn').classList.add('hidden');

  // (4) 更新「上一題」按鈕
  const prevBtn = document.getElementById('prev-btn');
  if (currentIndex > 0) {
    prevBtn.classList.remove('hidden');
  } else {
    prevBtn.classList.add('hidden');
  }
}

// -----------------------------------------------------------------------------
// 6. saveState：
//    將 history 裡所有題目的 id（historyIds），以及 currentIndex 存到 localStorage
// -----------------------------------------------------------------------------
function saveState() {
  const historyIds = history.map(q => q.id);
  const state = {
    historyIds,
    currentIndex
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// -----------------------------------------------------------------------------
// 7. 事件綁定：
//    • 「送出」按鈕：檢查使用者有沒有選 radio，若有就顯示「正確答案」，並開放「下一題」
//    • 「下一題」按鈕：呼叫 showNext()
//    • 「上一題」按鈕：呼叫 showPrev()
// -----------------------------------------------------------------------------
document.getElementById('submit-btn').addEventListener('click', e => {
  e.preventDefault();
  const sel = document.querySelector('input[name="opt"]:checked');
  if (!sel) {
    return alert('請先選擇一個答案');
  }
  const q = history[currentIndex];
  const correct = q.answer;
  const disp = document.getElementById('answer-display');
  disp.textContent = `正確答案：${correct}．${q.options[correct]}`;
  disp.classList.remove('hidden');

  document.getElementById('submit-btn').disabled = true;
  document.getElementById('next-btn').classList.remove('hidden');

  // 答案顯示後也儲存一次 state
  saveState();
});

document.getElementById('next-btn').addEventListener('click', e => {
  e.preventDefault();
  showNext();
});

document.getElementById('prev-btn').addEventListener('click', e => {
  e.preventDefault();
  showPrev();
});

// -----------------------------------------------------------------------------
// 8. 啟動：在 DOMContentLoaded 後執行 loadQuestions()
// -----------------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', loadQuestions);

