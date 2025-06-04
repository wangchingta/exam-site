/**
 * js/app.js
 *  － 同時追蹤 showCounts（出題次數）與 wrongCounts（答錯次數），
 *    用 weight = (wrongCount+1)/(showCount+1) 來決定下一題優先順序。
 *  － localStorage keys:
 *      • quizState    : { historyIds: [qid, ...], currentIndex: Number }
 *      • showCounts   : { [qid]: Number, ... }
 *      • wrongCounts  : { [qid]: Number, ... }
 */

let questions = [];     // 從 data/merged_questions.json 載入的所有題目
let history = [];       // 使用者本次 session 已看過的題目物件列表
let currentIndex = -1;  // history 中目前所在的索引

// localStorage 的 key
const STATE_KEY     = 'quizState';
const SHOWCOUNTS_KEY = 'showCounts';
const WRONGCOUNTS_KEY = 'wrongCounts';

// 以下變數會在 loadQuestions() 中被初始化
let showCounts = {};   // { [qid]: 已出題次數 }
let wrongCounts = {};  // { [qid]: 已答錯次數 }

////////////////////////////////////////////////////////////////////////////////
// 1. loadQuestions：
//    • 載入題庫 questions
//    • 初始化 showCounts、wrongCounts（若 localStorage 無值就把所有 qid 設成 0）
//    • 嘗試從 localStorage['quizState'] 還原 history + currentIndex，
//      如果成功就直接顯示那題並 return；否則呼叫 showNext() 從頭開始。
////////////////////////////////////////////////////////////////////////////////
async function loadQuestions() {
  try {
    // 1.1 讀題庫
    const res = await fetch('data/merged_questions.json');
    if (!res.ok) throw new Error(`載入題庫失敗：${res.status}`);
    questions = await res.json();

    // 1.2 初始化 showCounts
    const rawShow = localStorage.getItem(SHOWCOUNTS_KEY);
    if (rawShow) {
      showCounts = JSON.parse(rawShow);
      // 若 localStorage 裡有，但可能有新增題庫導致缺少新題的 qid，先把缺少的補成 0
      questions.forEach(q => {
        if (showCounts[q.id] == null) {
          showCounts[q.id] = 0;
        }
      });
    } else {
      // 不存在就把所有題目設 0
      showCounts = {};
      questions.forEach(q => {
        showCounts[q.id] = 0;
      });
      localStorage.setItem(SHOWCOUNTS_KEY, JSON.stringify(showCounts));
    }

    // 1.3 初始化 wrongCounts
    const rawWrong = localStorage.getItem(WRONGCOUNTS_KEY);
    if (rawWrong) {
      wrongCounts = JSON.parse(rawWrong);
      // 同樣補齊新的題目
      questions.forEach(q => {
        if (wrongCounts[q.id] == null) {
          wrongCounts[q.id] = 0;
        }
      });
    } else {
      wrongCounts = {};
      questions.forEach(q => {
        wrongCounts[q.id] = 0;
      });
      localStorage.setItem(WRONGCOUNTS_KEY, JSON.stringify(wrongCounts));
    }

    // 1.4 嘗試從 localStorage 還原歷史狀態
    const rawState = localStorage.getItem(STATE_KEY);
    if (rawState) {
      const state = JSON.parse(rawState);
      const savedIds = state.historyIds || [];
      const savedIndex = state.currentIndex;
      // 把 savedIds 轉回題目物件陣列
      history = savedIds
        .map(id => questions.find(q => q.id === id))
        .filter(q => q !== undefined);

      if (
        typeof savedIndex === 'number' &&
        savedIndex >= 0 &&
        savedIndex < history.length
      ) {
        currentIndex = savedIndex;
        displayQuestion(history[currentIndex]);
        return; // 還原成功，直接 return
      }
    }

    // 1.5 localStorage 裡沒有可用的 state，就從頭 showNext()
    showNext();

  } catch (e) {
    console.error(e);
    alert('題庫載入或狀態還原失敗，請確認 data/merged_questions.json 路徑是否正確');
  }
}

////////////////////////////////////////////////////////////////////////////////
// 2. showNext：
//    • 如果 currentIndex < history.length-1，代表已經有「下一題歷史」存在，
//      只把 currentIndex++，不改 showCounts。
//    • 否則要「取一題新題」，此時計算 weight = (wrong+1)/(show+1)。
//      找出所有 weight 最大的題作 candidates[]，隨機挑一題。
//      把該題的 showCounts[qid]++、儲存到 localStorage。
//    最後一律 displayQuestion(...) 並 saveState()。
////////////////////////////////////////////////////////////////////////////////
function showNext() {
  if (currentIndex < history.length - 1) {
    // 已有歷史題庫，直接往後
    currentIndex++;
  } else {
    // 真正要從所有題庫挑出「下一題」
    // 2.1 計算每個題目的 weight = (wrongCounts[qid]+1) / (showCounts[qid]+1)
    let maxWeight = -Infinity;
    const weights = {}; // { [qid]: weight }
    questions.forEach(q => {
      const w = wrongCounts[q.id] + 1;
      const s = showCounts[q.id] + 1;
      const weight = w / s;
      weights[q.id] = weight;
      if (weight > maxWeight) {
        maxWeight = weight;
      }
    });

    // 2.2 Collect all qid whose weight === maxWeight
    const candidates = questions.filter(q => weights[q.id] === maxWeight);

    // 2.3 隨機從 candidates 挑一題
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];

    // 2.4 把 chosen 推進 history，並 currentIndex 指到最後
    history.push(chosen);
    currentIndex = history.length - 1;

    // 2.5 showCounts++，存回 localStorage
    showCounts[chosen.id]++;
    localStorage.setItem(SHOWCOUNTS_KEY, JSON.stringify(showCounts));
  }

  // 2.6 顯示該題 & 存儲歷史狀態
  displayQuestion(history[currentIndex]);
  saveState();
}

////////////////////////////////////////////////////////////////////////////////
// 3. showPrev：
//    若 currentIndex > 0，currentIndex--、displayQuestion 然後 saveState()。
////////////////////////////////////////////////////////////////////////////////
function showPrev() {
  if (currentIndex > 0) {
    currentIndex--;
    displayQuestion(history[currentIndex]);
    saveState();
  }
}

////////////////////////////////////////////////////////////////////////////////
// 4. displayQuestion(q)：
//    • 將 history[currentIndex] 指向的題目物件渲染到畫面
//    • 隱藏 answer、reset 按鈕狀態
//    • 只有當 currentIndex > 0 才顯示「上一題」按鈕，否則隱藏
////////////////////////////////////////////////////////////////////////////////
function displayQuestion(q) {
  // (1) 題目文字
  document.getElementById('question-text').textContent =
    `${q.id}. ${q.question}`;

  // (2) 產生四個選項 radio
  const form = document.getElementById('options-form');
  form.innerHTML = '';
  Object.keys(q.options).forEach(key => {
    const label = document.createElement('label');
    label.innerHTML = `
      <input type="radio" name="opt" value="${key}">
      ${key}. ${q.options[key]}
    `;
    form.appendChild(label);
  });

  // (3) 重置「答案顯示」& 按鈕狀態
  const disp = document.getElementById('answer-display');
  disp.classList.add('hidden');
  document.getElementById('submit-btn').disabled = false;
  document.getElementById('next-btn').classList.add('hidden');

  // (4) 上一題 按鈕顯示/隱藏
  const prevBtn = document.getElementById('prev-btn');
  if (currentIndex > 0) {
    prevBtn.classList.remove('hidden');
  } else {
    prevBtn.classList.add('hidden');
  }
}

////////////////////////////////////////////////////////////////////////////////
// 5. saveState：
//    把 history 裡所有題目的 id（historyIds[]）與 currentIndex 儲存到 localStorage
////////////////////////////////////////////////////////////////////////////////
function saveState() {
  const historyIds = history.map(q => q.id);
  const state = { historyIds, currentIndex };
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

////////////////////////////////////////////////////////////////////////////////
// 6. 「送出」按鈕事件：
//    • 如果沒選答案，就 alert；
//    • 選對則顯示「答對提示」；
//    • 選錯則顯示「正確答案提示」並呼叫 incrementWrongCount() +1，存回 localStorage。
//    最後顯示「下一題」按鈕並 lock 住「送出」按鈕。
////////////////////////////////////////////////////////////////////////////////
document.getElementById('submit-btn').addEventListener('click', e => {
  e.preventDefault();
  const selected = document.querySelector('input[name="opt"]:checked');
  if (!selected) {
    alert('請先選擇一個答案');
    return;
  }

  const q = history[currentIndex];
  const userAns = selected.value;
  const correct = q.answer;
  const disp = document.getElementById('answer-display');

  if (userAns === correct) {
    disp.textContent = '太棒了！答對囉～';
  } else {
    disp.textContent = `答錯了！正確答案：${correct}．${q.options[correct]}`;
    incrementWrongCount(q.id);
  }

  disp.classList.remove('hidden');
  document.getElementById('submit-btn').disabled = true;
  document.getElementById('next-btn').classList.remove('hidden');

  // 再把最新 state 存一次
  saveState();
});

////////////////////////////////////////////////////////////////////////////////
// 7. 「下一題」按鈕
////////////////////////////////////////////////////////////////////////////////
document.getElementById('next-btn').addEventListener('click', e => {
  e.preventDefault();
  showNext();
});

////////////////////////////////////////////////////////////////////////////////
// 8. 「上一題」按鈕
////////////////////////////////////////////////////////////////////////////////
document.getElementById('prev-btn').addEventListener('click', e => {
  e.preventDefault();
  showPrev();
});

////////////////////////////////////////////////////////////////////////////////
// 9. incrementWrongCount(qid)：將該題的 wrongCounts[qid] +1，並存回 localStorage
////////////////////////////////////////////////////////////////////////////////
function incrementWrongCount(qid) {
  if (wrongCounts[qid] == null) {
    wrongCounts[qid] = 1;
  } else {
    wrongCounts[qid]++;
  }
  localStorage.setItem(WRONGCOUNTS_KEY, JSON.stringify(wrongCounts));
}

////////////////////////////////////////////////////////////////////////////////
// 10. 啟動：DOM 內容載入完成後呼叫 loadQuestions()
////////////////////////////////////////////////////////////////////////////////
window.addEventListener('DOMContentLoaded', loadQuestions);

