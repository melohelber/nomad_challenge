const socket = io();

const TOP_COUNT = 5;

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
  elements.skipBtn.innerHTML = '<span>⏳</span> Skipping...';
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
  elements.skipBtn.innerHTML = '<span>⏭</span> Skip to Results';
  elements.progressBar.classList.remove('hidden');
  elements.liveSection.classList.remove('hidden');
  elements.resultsSection.classList.add('hidden');
  elements.matchResultsList.innerHTML = '';
  elements.liveRankingBody.innerHTML = '';
  elements.lastEvent.classList.add('hidden');
  elements.lastEvent.innerHTML = '';
  previousRanking = [];
  completedMatches = [];

  socket.emit('processLog', { content, delay });
});

socket.on('rankingUpdate', (data) => {
  updateProgress(data.eventNumber, data.totalEvents);
  elements.currentMatchId.textContent = `Match #${data.matchId}`;

  if (data.lastEvent.type === 'match_start') {
    previousRanking = [];
    elements.lastEvent.classList.add('hidden');
    elements.lastEvent.innerHTML = '';
    return;
  }

  if (data.lastEvent.type === 'kill') {
    showLastEvent(data.lastEvent);
  }

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
  if (elements.progressText) elements.progressText.textContent = '0%';
  showError(data.message || 'Invalid log format. Please check your input.');
});

socket.on('processingComplete', () => {
  elements.processBtn.disabled = false;
  elements.clearBtn.disabled = false;
  elements.logContent.disabled = false;
  elements.skipBtn.classList.add('hidden');
  elements.skipBtn.disabled = true;
  elements.skipBtn.innerHTML = '<span>⏭</span> Skip to Results';
  elements.progressFill.style.width = '100%';
  if (elements.progressText) elements.progressText.textContent = '100%';

  setTimeout(() => {
    elements.progressBar.classList.add('hidden');
    elements.progressFill.style.width = '0%';
    if (elements.progressText) elements.progressText.textContent = '0%';
    elements.liveSection.classList.add('hidden');

    if (completedMatches.length > 0) {
      const entry = {
        id: Date.now(),
        name: `Entry #${entryCounter++}`,
        matches: [...completedMatches],
        timestamp: new Date().toLocaleString(),
      };
      logEntries.unshift(entry);
      addLogEntryToHistory(entry);
    }

    displayAllMatchResults();
  }, 800);
});

function updateProgress(current, total) {
  const percent = Math.round((current / total) * 100);
  elements.progressFill.style.width = `${percent}%`;
  if (elements.progressText) elements.progressText.textContent = `${percent}%`;
}

function showLastEvent(event) {
  elements.lastEvent.classList.remove('hidden');

  if (event.isWorldKill) {
    elements.lastEvent.innerHTML = `
      <span class="event-world">☠ WORLD</span>
      <span class="event-action">killed</span>
      <span class="event-victim">${event.victim}</span>
      <span class="event-weapon">by ${event.weapon}</span>
    `;
  } else {
    elements.lastEvent.innerHTML = `
      <span class="event-killer">${event.killer}</span>
      <span class="event-action">fragged</span>
      <span class="event-victim">${event.victim}</span>
      <span class="event-weapon">with ${event.weapon}</span>
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

  let html = '';

  // Global Ranking Card at the top
  html += createGlobalRankingCard();

  // Individual Match Cards below
  completedMatches.forEach((match, index) => {
    html += createMatchResultCard(match, index + 1);
  });

  elements.matchResultsList.innerHTML = html;

  // Setup accordion toggle listeners
  setupAccordionListeners();
}

function createGlobalRankingCard() {
  const globalRanking = calculateGlobalRanking();
  const ranking = globalRanking.ranking;
  const hasMorePlayers = ranking.length > TOP_COUNT;

  let topRows = '';
  let hiddenRows = '';

  ranking.forEach((player, index) => {
    const row = `
      <tr class="${index === 0 ? 'winner' : ''}">
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
      hiddenRows += row;
    }
  });

  const accordionContent = hasMorePlayers ? `
    <tbody class="accordion-hidden" id="globalAccordionHidden">
      ${hiddenRows}
    </tbody>
  ` : '';

  const accordionButton = hasMorePlayers ? `
    <button class="accordion-toggle" data-target="globalAccordionHidden">
      <span class="accordion-icon">▼</span>
      <span class="accordion-text">Show ${ranking.length - TOP_COUNT} more players</span>
    </button>
  ` : '';

  return `
    <div class="result-card global-ranking-card">
      <div class="card-header">
        <div class="card-title">
          <span class="card-icon">🏆</span>
          <span>Global Ranking</span>
        </div>
        <span class="card-badge">${globalRanking.totalMatches} match${globalRanking.totalMatches > 1 ? 'es' : ''}</span>
      </div>

      <div class="stats-row">
        <div class="stat-box">
          <span class="stat-value">${globalRanking.totalKills}</span>
          <span class="stat-label">Total Kills</span>
        </div>
        <div class="stat-box">
          <span class="stat-value">${globalRanking.totalPlayers}</span>
          <span class="stat-label">Players</span>
        </div>
        <div class="stat-box">
          <span class="stat-value">${globalRanking.totalMatches}</span>
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
        <tbody>
          ${topRows}
        </tbody>
        ${accordionContent}
      </table>

      ${accordionButton}
    </div>
  `;
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
    const items = highlights.map(h => {
      return `<li class="highlight-item"><strong>${h.title}:</strong> ${h.description}</li>`;
    }).join('');
    highlightsHtml = `
      <div class="highlights-section">
        <div class="highlights-title">
          <span class="highlights-icon">⭐</span>
          Notable Events
        </div>
        <ul class="highlights-list">${items}</ul>
      </div>
    `;
  }

  return `
    <div class="result-card match-card">
      <div class="card-header">
        <div class="card-title">
          <span class="card-icon">🎯</span>
          <span>Match ${matchNumber}</span>
        </div>
        <span class="card-badge match-id">#${match.matchId}</span>
      </div>

      <table class="ranking-table">
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

      ${highlightsHtml}
    </div>
  `;
}

function setupAccordionListeners() {
  document.querySelectorAll('.accordion-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const target = document.getElementById(targetId);

      if (target) {
        const isExpanded = target.classList.contains('expanded');
        target.classList.toggle('expanded');
        btn.classList.toggle('expanded');

        const textSpan = btn.querySelector('.accordion-text');
        const iconSpan = btn.querySelector('.accordion-icon');

        if (isExpanded) {
          const count = target.querySelectorAll('tr').length;
          textSpan.textContent = `Show ${count} more players`;
          iconSpan.textContent = '▼';
        } else {
          textSpan.textContent = 'Show less';
          iconSpan.textContent = '▲';
        }
      }
    });
  });
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

function addLogEntryToHistory(entry) {
  const matchCount = entry.matches.length;

  const hintEl = document.querySelector('.history-hint');
  if (hintEl) hintEl.classList.add('hidden');

  const entryItem = document.createElement('div');
  entryItem.className = 'history-item';
  entryItem.dataset.entryId = entry.id;
  entryItem.innerHTML = `
    <div class="history-item-icon">📄</div>
    <div class="history-item-info">
      <span class="history-item-name">${entry.name}</span>
      <span class="history-item-meta">${matchCount} match${matchCount > 1 ? 'es' : ''}</span>
    </div>
  `;
  entryItem.addEventListener('click', () => {
    loadLogEntry(entry.id);
    // Highlight active entry
    document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
    entryItem.classList.add('active');
  });
  elements.matchHistory.insertBefore(entryItem, elements.matchHistory.firstChild);
}

function loadLogEntry(entryId) {
  const entry = logEntries.find(e => e.id === entryId);
  if (entry) {
    completedMatches = [...entry.matches];
    displayAllMatchResults();
  }
}
