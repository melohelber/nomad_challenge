const socket = io();

const elements = {
  logFile: document.getElementById('logFile'),
  processBtn: document.getElementById('processBtn'),
  animationDelay: document.getElementById('animationDelay'),
  delayValue: document.getElementById('delayValue'),
  progressBar: document.getElementById('progressBar'),
  progressFill: document.querySelector('.progress-fill'),
  progressText: document.querySelector('.progress-text'),
  rankingSection: document.getElementById('rankingSection'),
  rankingBody: document.getElementById('rankingBody'),
  currentMatchId: document.getElementById('currentMatchId'),
  lastEvent: document.getElementById('lastEvent'),
  highlightsSection: document.getElementById('highlightsSection'),
  highlightsList: document.getElementById('highlightsList'),
  matchHistory: document.getElementById('matchHistory'),
};

let previousRanking = [];

elements.animationDelay.addEventListener('input', (e) => {
  elements.delayValue.textContent = `${e.target.value}ms`;
});

elements.processBtn.addEventListener('click', () => {
  const file = elements.logFile.files[0];
  if (!file) {
    alert('Por favor, selecione um arquivo de log');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    const delay = parseInt(elements.animationDelay.value);

    elements.processBtn.disabled = true;
    elements.progressBar.classList.remove('hidden');
    elements.rankingSection.classList.remove('hidden');
    elements.highlightsSection.classList.add('hidden');
    elements.highlightsList.innerHTML = '';
    elements.rankingBody.innerHTML = '';
    previousRanking = [];

    socket.emit('processLog', { content, delay });
  };
  reader.readAsText(file);
});

socket.on('rankingUpdate', (data) => {
  updateProgress(data.eventNumber, data.totalEvents);
  elements.currentMatchId.textContent = `Match ${data.matchId}`;

  updateLastEvent(data.lastEvent);
  animateRanking(data.ranking);
});

socket.on('matchComplete', (data) => {
  elements.highlightsSection.classList.remove('hidden');
  displayHighlights(data.highlights);
  addToHistory(data.matchId, data.ranking);
  previousRanking = [];
});

socket.on('processingComplete', (data) => {
  elements.processBtn.disabled = false;
  elements.progressFill.style.width = '100%';
  elements.progressText.textContent = 'Concluido!';

  setTimeout(() => {
    elements.progressBar.classList.add('hidden');
    elements.progressFill.style.width = '0%';
  }, 2000);
});

function updateProgress(current, total) {
  const percent = Math.round((current / total) * 100);
  elements.progressFill.style.width = `${percent}%`;
  elements.progressText.textContent = `${percent}%`;
}

function updateLastEvent(event) {
  if (event.type === 'match_start') {
    elements.lastEvent.classList.add('hidden');
    return;
  }

  elements.lastEvent.classList.remove('hidden');

  if (event.isWorldKill) {
    elements.lastEvent.classList.add('world-kill');
    elements.lastEvent.innerHTML = `
      <strong>&lt;WORLD&gt;</strong> matou <strong>${event.victim}</strong> por ${event.weapon}
    `;
  } else {
    elements.lastEvent.classList.remove('world-kill');
    elements.lastEvent.innerHTML = `
      <strong>${event.killer}</strong> matou <strong>${event.victim}</strong> usando <strong>${event.weapon}</strong>
    `;
  }
}

function animateRanking(ranking) {
  const previousMap = new Map(previousRanking.map((p, i) => [p.name, i]));

  let html = '';
  ranking.forEach((player, index) => {
    const prevIndex = previousMap.get(player.name);
    let rowClass = '';

    if (prevIndex === undefined) {
      rowClass = 'new-entry';
    } else if (prevIndex > index) {
      rowClass = 'moving-up';
    } else if (prevIndex < index) {
      rowClass = 'moving-down';
    }

    if (index === 0) {
      rowClass += ' winner';
    }

    html += `
      <tr class="${rowClass}">
        <td class="position">${player.position}</td>
        <td class="player-name">${player.name}</td>
        <td class="frags">${player.frags}</td>
        <td class="deaths">${player.deaths}</td>
        <td class="kd">${player.kd.toFixed(2)}</td>
      </tr>
    `;
  });

  elements.rankingBody.innerHTML = html;
  previousRanking = [...ranking];
}

function displayHighlights(highlights) {
  let html = '';
  highlights.forEach((h, index) => {
    html += `
      <div class="highlight-item" style="animation-delay: ${index * 0.1}s">
        <span class="highlight-icon">${h.icon}</span>
        <div class="highlight-content">
          <div class="highlight-title">${h.title}</div>
          <div class="highlight-description">${h.description}</div>
        </div>
      </div>
    `;
  });
  elements.highlightsList.innerHTML = html;
}

function addToHistory(matchId, ranking) {
  const winner = ranking.ranking[0];
  const matchItem = document.createElement('div');
  matchItem.className = 'match-item';
  matchItem.dataset.matchId = matchId;
  matchItem.innerHTML = `
    <span class="match-id">Match ${matchId}</span>
    <span class="match-winner">${winner ? winner.name : 'N/A'}</span>
  `;
  matchItem.addEventListener('click', () => loadMatch(matchId));
  elements.matchHistory.insertBefore(matchItem, elements.matchHistory.firstChild);
}

async function loadMatch(matchId) {
  try {
    const response = await fetch(`/api/matches/${matchId}`);
    const data = await response.json();

    if (data.match) {
      displaySavedMatch(data.match);
    }
  } catch (error) {
    console.error('Error loading match:', error);
  }
}

function displaySavedMatch(match) {
  elements.rankingSection.classList.remove('hidden');
  elements.highlightsSection.classList.remove('hidden');
  elements.currentMatchId.textContent = `Match ${match.id}`;
  elements.lastEvent.classList.add('hidden');

  const sortedPlayers = [...match.players].sort((a, b) => b.frags - a.frags);

  let rankingHtml = '';
  sortedPlayers.forEach((player, index) => {
    const kd = player.deaths > 0 ? (player.frags / player.deaths).toFixed(2) : player.frags.toFixed(2);
    rankingHtml += `
      <tr class="${index === 0 ? 'winner' : ''}">
        <td class="position">${index + 1}</td>
        <td class="player-name">${player.playerName}</td>
        <td class="frags">${player.frags}</td>
        <td class="deaths">${player.deaths}</td>
        <td class="kd">${kd}</td>
      </tr>
    `;
  });
  elements.rankingBody.innerHTML = rankingHtml;

  let highlightsHtml = '';

  if (match.winnerWeapon) {
    highlightsHtml += `
      <div class="highlight-item">
        <span class="highlight-icon">🔫</span>
        <div class="highlight-content">
          <div class="highlight-title">Arma favorita do vencedor</div>
          <div class="highlight-description">${match.winnerWeapon}</div>
        </div>
      </div>
    `;
  }

  sortedPlayers.forEach((player) => {
    if (player.maxStreak > 1) {
      highlightsHtml += `
        <div class="highlight-item">
          <span class="highlight-icon">🔥</span>
          <div class="highlight-content">
            <div class="highlight-title">Maior streak</div>
            <div class="highlight-description">${player.playerName} - ${player.maxStreak} kills sem morrer</div>
          </div>
        </div>
      `;
    }

    if (player.hasFlawlessAward) {
      highlightsHtml += `
        <div class="highlight-item">
          <span class="highlight-icon">🏅</span>
          <div class="highlight-content">
            <div class="highlight-title">Award FLAWLESS</div>
            <div class="highlight-description">${player.playerName} (venceu sem morrer)</div>
          </div>
        </div>
      `;
    }

    if (player.hasFrenzyAward) {
      highlightsHtml += `
        <div class="highlight-item">
          <span class="highlight-icon">⚡</span>
          <div class="highlight-content">
            <div class="highlight-title">Award FRENZY</div>
            <div class="highlight-description">${player.playerName} (5 kills em 1 min)</div>
          </div>
        </div>
      `;
    }
  });

  elements.highlightsList.innerHTML = highlightsHtml || '<p style="color: var(--text-secondary)">Nenhum highlight nesta partida</p>';
}

document.querySelectorAll('.match-item').forEach((item) => {
  item.addEventListener('click', () => {
    const matchId = item.dataset.matchId;
    loadMatch(matchId);
  });
});
