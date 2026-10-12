function checkAndRegisterHighScore(score, rating) {

  const coefficient = ratingCoefficients[rating] || 1.0;
  const newPower = score * coefficient;

  // ⚠️ 前回の newHighScore が残っていたらクリア（念のため）
  if (gameStarted && gameOver && !enteringName && window.newHighScore) {
      window.newHighScore = null;
  }

  if (enteringName || window.newHighScore) {
      return;
  }
  if (gameStarted === false || gameOver === false) {
      return;
  }

  if (score < 250000 || !ratingCoefficients[rating]) {
      return;
  }

  // 現在のハイスコアをパワー順にソート
  highScores.sort((a, b) => {
    const aPower = a.score * (ratingCoefficients[a.rating] || 1.0);
    const bPower = b.score * (ratingCoefficients[b.rating] || 1.0);
    return bPower - aPower;
  });

  const lowestPower = highScores.length < 5 ? 0 :
    highScores[4].score * (ratingCoefficients[highScores[4].rating] || 1.0);


  if (newPower > lowestPower) {

    enteringName = true;
    namePos = 0;
    // ✅ 前回の名前を初期値に反映（localStorage）
    const lastName = readLastName();
    nameChars = lastName.split("").slice(0, 4);
    while (nameChars.length < 4) nameChars.push("A");

    updateNameEntryDisplay();

    const entryScreen = document.getElementById("nameEntryScreen");
    if (entryScreen) {
      entryScreen.style.display = "flex";
      entryScreen.style.zIndex = "9999"; // 念のため
    } else {
        }

    window.newHighScore = { score, rating };
  } else {
    }
}

function updateNameEntryDisplay() {
  const str = nameChars.map((c, i) => (i === namePos ? `[${c}]` : c)).join(" ");
  document.getElementById("nameEntry").textContent = str;

  // 「次へ」または「決定」の切り替え
  const confirmBtn = document.getElementById("confirmButton");
  if (confirmBtn) {
    confirmBtn.textContent = (namePos === nameChars.length - 1) ? "決定" : "次へ";
  }

  // 「前へ」ボタンの有効/無効制御
  const backBtn = document.getElementById("backButton");
  if (backBtn) {
    backBtn.disabled = (namePos === 0); // 最初の文字では無効化
    backBtn.style.opacity = (namePos === 0) ? 0.3 : 1;
  }
}

function nextChar() {
  if (!enteringName) return;
  const idx = availableChars.indexOf(nameChars[namePos]);
  const nextIdx = (idx + 1) % availableChars.length;
  nameChars[namePos] = availableChars[nextIdx];
  updateNameEntryDisplay();
}

function prevChar() {
  if (!enteringName) return;
  const idx = availableChars.indexOf(nameChars[namePos]);
  const prevIdx = (idx - 1 + availableChars.length) % availableChars.length;
  nameChars[namePos] = availableChars[prevIdx];
  updateNameEntryDisplay();
}

function goBackChar() {
  if (namePos > 0) {
    namePos--;
    updateNameEntryDisplay();
  }
}

function displayTopHighScore() {
  const top = highScores[0];
  if (!top) return;
  const coeff = ratingCoefficients[top.rating] || 1.0;
  const power = Math.floor(top.score * coeff);
  const display = `${top.name}　${top.score.toLocaleString()}　RANK：${top.rating}`;
  document.getElementById("topHighScore").textContent = display;
}


  // ✅ 名前決定
function confirmNameEntry() {
  if (!enteringName) return;

  // 次の文字へ移動
  namePos++;

  if (namePos < nameChars.length) {
    updateNameEntryDisplay();
    return; // まだ未確定の文字があるので確定しない
  }

  // 4文字すべて確定済み
  const name = nameChars.join("");
  highScores.push({
    name,
    score: window.newHighScore.score,
    rating: window.newHighScore.rating
  });

  // 再度ソート＆5件に絞る
  highScores.sort((a, b) => {
    const aPower = a.score * (ratingCoefficients[a.rating] || 1.0);
    const bPower = b.score * (ratingCoefficients[b.rating] || 1.0);
    return bPower - aPower;
  });
  highScores = highScores.slice(0, 5);
  saveHighScores(highScores);

  // UI処理
  document.getElementById("nameEntryScreen").style.display = "none";
  enteringName = false;

  // 🎯 入力直後に即反映！
  displayHighScores();

    // ✅ 入力した名前を保存
  try { localStorage.setItem('lastEnteredName', name); }
  catch (error) { console.warn('名前を保存できません。', error); }

  // 念のため newHighScore をリセット
  window.newHighScore = null;

  // ゲームクリア画面を表示（再表示）
  gameClear.style.display = "flex";
}

/* =======================================================
   ▼ ハイスコア表
   ======================================================= */
function displayHighScores() {
  const scoreListEl = document.getElementById("scoreList");
  if (!scoreListEl) return;

  const ranks = highScores.map((entry, index) => {
    return `${index + 1}. ${entry.name}：${entry.score}（${entry.rating}）`;
  });

  scoreListEl.replaceChildren();
  const heading = document.createElement('p');
  heading.textContent = '🏆 High Scores';
  scoreListEl.appendChild(heading);
  ranks.forEach(rank => {
    const row = document.createElement('div');
    row.textContent = rank;
    scoreListEl.appendChild(row);
  });
}

function readLastName() {
  try {
    const name = localStorage.getItem('lastEnteredName') || 'AAAA';
    return name.split('').filter(char => availableChars.includes(char)).join('').slice(0, 4);
  } catch { return 'AAAA'; }
}
