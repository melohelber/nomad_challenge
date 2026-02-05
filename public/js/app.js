const socket = io();

const elements = {
  logContent: document.getElementById('logContent'),
  processBtn: document.getElementById('processBtn'),
  clearBtn: document.getElementById('clearBtn'),
  skipBtn: document.getElementById('skipBtn'),
  animationDelay: document.getElementById('animationDelay'),
  delayValue: document.getElementById('delayValue'),
  progressBar: document.getElementById('progressBar'),
  progressFill: document.querySelector('.progress-fill'),
  progressText: document.querySelector('.progress-text'),
  errorMessage: document.getElementById('errorMessage'),
  liveSection: document.getElementById('liveSection'),
  liveRankingBody: document.getElementById('liveRankingBody'),
  currentMatchId: document.getElementById('currentMatchId'),
  lastEvent: document.getElementById('lastEvent'),
  resultsSection: document.getElementById('resultsSection'),
  matchResultsList: document.getElementById('matchResultsList'),
  matchHistory: document.getElementById('matchHistory'),
};

let previousRanking = [];
let completedMatches = [];
let logEntries = [];
let entryCounter = 1;

elements.animationDelay.addEventListener('input', (e) => {
  elements.delayValue.textContent = `${e.target.value}ms`;
});

elements.clearBtn.addEventListener('click', () => {
  elements.logContent.value = '';
  elements.errorMessage.classList.add('hidden');
  elements.logContent.focus();
});

function showError(message) {
  elements.errorMessage.textContent = message;
  elements.errorMessage.classList.remove('hidden');
}

elements.skipBtn.addEventListener('click', () => {
  elements.skipBtn.disabled = true;
  elements.skipBtn.textContent = 'Skipping...';
  elements.progressText.textContent = 'Skipping...';
  socket.emit('skipToResults');
});

elements.processBtn.addEventListener('click', () => {
  elements.errorMessage.classList.add('hidden');

  const content = elements.logContent.value.trim();
  if (!content) {
    showError('Please paste log content first');
    return;
  }

  const delay = parseInt(elements.animationDelay.value);

  elements.processBtn.disabled = true;
  elements.clearBtn.disabled = true;
  elements.logContent.disabled = true;
  elements.skipBtn.classList.remove('hidden');
  elements.skipBtn.disabled = false;
  elements.skipBtn.textContent = 'Skip to Results';
  elements.progressBar.classList.remove('hidden');
  elements.liveSection.classList.remove('hidden');
  elements.resultsSection.classList.add('hidden');
  elements.matchResultsList.innerHTML = '';
  elements.liveRankingBody.innerHTML = '';
  previousRanking = [];
  completedMatches = [];

  socket.emit('processLog', { content, delay });
});

socket.on('rankingUpdate', (data) => {
  updateProgress(data.eventNumber, data.totalEvents);
  elements.currentMatchId.textContent = `Match ${data.matchId}`;

  if (data.lastEvent.type === 'match_start') {
    previousRanking = [];
    elements.lastEvent.classList.add('hidden');
    return;
  }

  updateLastEvent(data.lastEvent);
  animateLiveRanking(data.ranking);
});

socket.on('matchComplete', (data) => {
  completedMatches.push(data);
});

socket.on('processingError', (data) => {
  elements.processBtn.disabled = false;
  elements.clearBtn.disabled = false;
  elements.logContent.disabled = false;
  elements.skipBtn.classList.add('hidden');
  elements.progressBar.classList.add('hidden');
  elements.liveSection.classList.add('hidden');
  elements.progressFill.style.width = '0%';
  showError(data.message || 'Invalid log format. Please check your input.');
});

socket.on('processingComplete', (data) => {
  elements.processBtn.disabled = false;
  elements.clearBtn.disabled = false;
  elements.logContent.disabled = false;
  elements.skipBtn.classList.add('hidden');
  elements.skipBtn.disabled = true;
  elements.skipBtn.textContent = 'Skip to Results';
  elements.progressFill.style.width = '100%';
  elements.progressText.textContent = 'Done!';

  setTimeout(() => {
    elements.progressBar.classList.add('hidden');
    elements.progressFill.style.width = '0%';
    elements.liveSection.classList.add('hidden');

    if (completedMatches.length > 0) {
      const entry = {
        id: Date.now(),
        name: `Log Entry #${entryCounter++}`,
        matches: [...completedMatches],
        timestamp: new Date().toLocaleString(),
      };
      logEntries.unshift(entry);
      addLogEntryToHistory(entry);
    }

    displayAllMatchResults();
  }, 1000);
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
      <strong>WORLD</strong> killed <strong>${event.victim}</strong>
    `;
  } else {
    elements.lastEvent.classList.remove('world-kill');
    elements.lastEvent.innerHTML = `
      <strong>${event.killer}</strong> killed <strong>${event.victim}</strong> using <strong>${event.weapon}</strong>
    `;
  }
}

function animateLiveRanking(ranking) {
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

  elements.liveRankingBody.innerHTML = html;
  previousRanking = [...ranking];
}

function displayAllMatchResults() {
  if (completedMatches.length === 0) return;

  elements.resultsSection.classList.remove('hidden');

  const globalRanking = calculateGlobalRanking();
  let html = createGlobalRankingCard(globalRanking);

  completedMatches.forEach((match, index) => {
    html += createMatchResultCard(match, index + 1);
  });

  elements.matchResultsList.innerHTML = html;
}

function calculateGlobalRanking() {
  const playerStats = new Map();
  let totalKills = 0;
  let totalDeaths = 0;

  completedMatches.forEach((match) => {
    const ranking = match.ranking.ranking;

    ranking.forEach((player) => {
      totalKills += player.frags;
      totalDeaths += player.deaths;

      if (!playerStats.has(player.name)) {
        playerStats.set(player.name, { frags: 0, deaths: 0, matches: 0, wins: 0 });
      }

      const stats = playerStats.get(player.name);
      stats.frags += player.frags;
      stats.deaths += player.deaths;
      stats.matches += 1;
      if (player.isWinner) {
        stats.wins += 1;
      }
    });
  });

  const ranking = [];
  playerStats.forEach((stats, name) => {
    const kd = stats.deaths > 0 ? stats.frags / stats.deaths : stats.frags;
    ranking.push({
      name,
      frags: stats.frags,
      deaths: stats.deaths,
      kd,
      matches: stats.matches,
      wins: stats.wins,
    });
  });

  ranking.sort((a, b) => b.frags - a.frags);

  return {
    totalMatches: completedMatches.length,
    totalKills,
    totalDeaths,
    totalPlayers: playerStats.size,
    ranking,
  };
}

function createGlobalRankingCard(data) {
  const TOP_COUNT = 5;
  const hasMore = data.ranking.length > TOP_COUNT;

  let topRows = '';
  let extraRows = '';

  data.ranking.forEach((player, index) => {
    const isWinner = index === 0;
    const row = `
      <tr class="${isWinner ? 'winner' : ''}">
        <td class="position">${index + 1}</td>
        <td class="player-name">${player.name}</td>
        <td class="frags">${player.frags}</td>
        <td class="deaths">${player.deaths}</td>
        <td class="kd">${player.kd.toFixed(2)}</td>
        <td class="wins">${player.wins}</td>
      </tr>
    `;

    if (index < TOP_COUNT) {
      topRows += row;
    } else {
      extraRows += row;
    }
  });

  return `
    <div class="global-ranking-card">
      <div class="card-header">
        <h2>Global Ranking</h2>
        <span class="match-badge">${data.totalMatches} match${data.totalMatches > 1 ? 'es' : ''}</span>
      </div>

      <div class="global-stats">
        <div class="stat-item">
          <span class="stat-value">${data.totalKills}</span>
          <span class="stat-label">Total Kills</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${data.totalPlayers}</span>
          <span class="stat-label">Players</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${data.totalMatches}</span>
          <span class="stat-label">Matches</span>
        </div>
      </div>

      <table class="ranking-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Frags</th>
            <th>Deaths</th>
            <th>K/D</th>
            <th>Wins</th>
          </tr>
        </thead>
        <tbody id="globalRankingTop">
          ${topRows}
        </tbody>
        ${hasMore ? `
          <tbody id="globalRankingExtra" class="hidden">
            ${extraRows}
          </tbody>
        ` : ''}
      </table>

      ${hasMore ? `
        <button class="btn-accordion" onclick="toggleGlobalRanking()">
          <span id="accordionText">Show all ${data.ranking.length} players</span>
          <span id="accordionIcon">▼</span>
        </button>
      ` : ''}
    </div>
  `;
}

function toggleGlobalRanking() {
  const extra = document.getElementById('globalRankingExtra');
  const text = document.getElementById('accordionText');
  const icon = document.getElementById('accordionIcon');

  if (extra.classList.contains('hidden')) {
    extra.classList.remove('hidden');
    text.textContent = 'Show less';
    icon.textContent = '▲';
  } else {
    extra.classList.add('hidden');
    const totalPlayers = document.querySelectorAll('#globalRankingTop tr, #globalRankingExtra tr').length;
    text.textContent = `Show all ${totalPlayers} players`;
    icon.textContent = '▼';
  }
}

function createMatchResultCard(match, matchNumber) {
  const ranking = match.ranking.ranking;
  const highlights = match.highlights;

  let rankingRows = '';
  ranking.forEach((player) => {
    rankingRows += `
      <tr class="${player.isWinner ? 'winner' : ''}">
        <td class="position">${player.position}</td>
        <td class="player-name">${player.name}</td>
        <td class="frags">${player.frags}</td>
        <td class="deaths">${player.deaths}</td>
        <td class="kd">${player.kd.toFixed(2)}</td>
      </tr>
    `;
  });

  let highlightsHtml = '';
  if (highlights && highlights.length > 0) {
    highlights.forEach((h) => {
      highlightsHtml += `
        <div class="highlight-item-small">
          <span class="highlight-icon">${h.icon}</span>
          <span class="highlight-text"><strong>${h.title}:</strong> ${h.description}</span>
        </div>
      `;
    });
  } else {
    highlightsHtml = '<p class="no-highlights">No highlights</p>';
  }

  return `
    <div class="match-result-card">
      <div class="match-card-header">
        <h3>Match ${match.matchId}</h3>
        <span class="match-number">#${matchNumber}</span>
      </div>

      <div class="match-card-content">
        <div class="ranking-section-small">
          <h4>Ranking</h4>
          <table class="ranking-table-small">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Frags</th>
                <th>Deaths</th>
                <th>K/D</th>
              </tr>
            </thead>
            <tbody>
              ${rankingRows}
            </tbody>
          </table>
        </div>

        <div class="highlights-section-small">
          <h4>Highlights</h4>
          ${highlightsHtml}
        </div>
      </div>
    </div>
  `;
}

function addLogEntryToHistory(entry) {
  const matchCount = entry.matches.length;
  const entryItem = document.createElement('div');
  entryItem.className = 'match-item';
  entryItem.dataset.entryId = entry.id;
  entryItem.innerHTML = `
    <span class="match-id">${entry.name}</span>
    <span class="match-winner">${matchCount} match${matchCount > 1 ? 'es' : ''}</span>
  `;
  entryItem.addEventListener('click', () => loadLogEntry(entry.id));
  elements.matchHistory.insertBefore(entryItem, elements.matchHistory.firstChild);
}

function loadLogEntry(entryId) {
  const entry = logEntries.find(e => e.id === entryId);
  if (entry) {
    completedMatches = [...entry.matches];
    displayAllMatchResults();
  }
}
