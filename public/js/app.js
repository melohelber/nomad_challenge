const socket = io();

const TOP_COUNT = 5;

// HTML escape function to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

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
  liveRankingHead: document.querySelector('#liveSection .ranking-table thead tr'),
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
let currentHasTeams = false;

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

  // Disable buttons while waiting for validation, but don't show processing UI yet
  elements.processBtn.disabled = true;
  elements.clearBtn.disabled = true;
  elements.logContent.disabled = true;

  socket.emit('processLog', { content, delay });
});

socket.on('validationPassed', (data) => {
  // Only show processing UI after validation passes
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
  currentHasTeams = false;
});

socket.on('rankingUpdate', (data) => {
  updateProgress(data.eventNumber, data.totalEvents);

  const teamsBadge = data.hasTeams ? ' <span class="teams-badge">TEAMS</span>' : '';
  elements.currentMatchId.innerHTML = `Match #${escapeHtml(data.matchId)}${teamsBadge}`;

  currentHasTeams = data.hasTeams;

  if (data.lastEvent.type === 'match_start') {
    previousRanking = [];
    elements.lastEvent.classList.add('hidden');
    elements.lastEvent.innerHTML = '';
    updateLiveTableHeader(data.hasTeams);
    return;
  }

  if (data.lastEvent.type === 'kill') {
    showLastEvent(data.lastEvent);
  }

  animateLiveRanking(data.ranking, data.hasTeams);
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

function updateLiveTableHeader(hasTeams) {
  if (hasTeams) {
    elements.liveRankingHead.innerHTML = `
      <th>#</th>
      <th>Team</th>
      <th>Player</th>
      <th>Score</th>
      <th>Kills</th>
      <th>FF</th>
      <th>Deaths</th>
    `;
  } else {
    elements.liveRankingHead.innerHTML = `
      <th>#</th>
      <th>Player</th>
      <th>Score (Frags)</th>
      <th>Deaths</th>
      <th>K/D</th>
    `;
  }
}

function showLastEvent(event) {
  elements.lastEvent.classList.remove('hidden');

  if (event.isWorldKill) {
    elements.lastEvent.innerHTML = `
      <span class="event-world">☠ WORLD</span>
      <span class="event-action">killed</span>
      <span class="event-victim">${escapeHtml(event.victim)}</span>
      <span class="event-weapon">by ${escapeHtml(event.weapon)}</span>
    `;
  } else if (event.isFriendlyFire) {
    elements.lastEvent.innerHTML = `
      <span class="event-ff">⚠ FRIENDLY FIRE</span>
      <span class="event-killer">${escapeHtml(event.killer)}</span>
      <span class="event-action">killed teammate</span>
      <span class="event-victim">${escapeHtml(event.victim)}</span>
      <span class="event-weapon">with ${escapeHtml(event.weapon)}</span>
    `;
    elements.lastEvent.classList.add('friendly-fire');
    setTimeout(() => elements.lastEvent.classList.remove('friendly-fire'), 500);
  } else {
    elements.lastEvent.innerHTML = `
      <span class="event-killer">${escapeHtml(event.killer)}</span>
      <span class="event-action">fragged</span>
      <span class="event-victim">${escapeHtml(event.victim)}</span>
      <span class="event-weapon">with ${escapeHtml(event.weapon)}</span>
    `;
  }
}

function animateLiveRanking(ranking, hasTeams) {
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

    if (hasTeams) {
      const teamClass = player.team === 'TR' ? 'team-tr' : 'team-ct';
      const score = player.score !== undefined ? player.score : player.frags;
      const ff = player.friendlyKills || 0;

      html += `
        <tr class="${rowClass}">
          <td class="position">${player.position}</td>
          <td class="team-cell"><span class="team-badge ${teamClass}">${escapeHtml(player.team || '?')}</span></td>
          <td class="player-name">${escapeHtml(player.name)}</td>
          <td class="score">${score}</td>
          <td class="frags">${player.frags}</td>
          <td class="ff ${ff > 0 ? 'has-ff' : ''}">${ff > 0 ? `-${ff}` : '0'}</td>
          <td class="deaths">${player.deaths}</td>
        </tr>
      `;
    } else {
      html += `
        <tr class="${rowClass}">
          <td class="position">${player.position}</td>
          <td class="player-name">${escapeHtml(player.name)}</td>
          <td class="score">${player.frags}</td>
          <td class="deaths">${player.deaths}</td>
          <td class="kd">${player.kd.toFixed(2)}</td>
        </tr>
      `;
    }
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
        <td class="player-name">${escapeHtml(player.name)}</td>
        <td class="score">${player.score}</td>
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
            <th>Score</th>
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
  const hasTeams = match.hasTeams || match.ranking.hasTeams;

  let tableHeader = '';
  let rankingRows = '';

  if (hasTeams) {
    tableHeader = `
      <tr>
        <th>#</th>
        <th>Team</th>
        <th>Player</th>
        <th>Score</th>
        <th>Kills</th>
        <th>FF</th>
        <th>Deaths</th>
      </tr>
    `;

    ranking.forEach((player) => {
      const teamClass = player.team === 'TR' ? 'team-tr' : 'team-ct';
      const score = player.score !== undefined ? player.score : player.frags;
      const ff = player.friendlyKills || 0;

      rankingRows += `
        <tr class="${player.isWinner ? 'winner' : ''}">
          <td class="position">${player.position}</td>
          <td class="team-cell"><span class="team-badge ${teamClass}">${escapeHtml(player.team || '?')}</span></td>
          <td class="player-name">${escapeHtml(player.name)}</td>
          <td class="score">${score}</td>
          <td class="frags">${player.frags}</td>
          <td class="ff ${ff > 0 ? 'has-ff' : ''}">${ff > 0 ? `-${ff}` : '0'}</td>
          <td class="deaths">${player.deaths}</td>
        </tr>
      `;
    });
  } else {
    tableHeader = `
      <tr>
        <th>#</th>
        <th>Player</th>
        <th>Score (Frags)</th>
        <th>Deaths</th>
        <th>K/D</th>
      </tr>
    `;

    ranking.forEach((player) => {
      rankingRows += `
        <tr class="${player.isWinner ? 'winner' : ''}">
          <td class="position">${player.position}</td>
          <td class="player-name">${escapeHtml(player.name)}</td>
          <td class="score">${player.frags}</td>
          <td class="deaths">${player.deaths}</td>
          <td class="kd">${player.kd.toFixed(2)}</td>
        </tr>
      `;
    });
  }

  let highlightsHtml = '';
  if (highlights && highlights.length > 0) {
    const items = highlights.map(h => {
      return `<li class="highlight-item"><strong>${escapeHtml(h.title)}:</strong> ${escapeHtml(h.description)}</li>`;
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

  const teamsBadge = hasTeams ? '<span class="teams-mode-badge">TEAMS MODE</span>' : '';

  return `
    <div class="result-card match-card ${hasTeams ? 'has-teams' : ''}">
      <div class="card-header">
        <div class="card-title">
          <span class="card-icon">🎯</span>
          <span>Match ${matchNumber}</span>
          ${teamsBadge}
        </div>
        <span class="card-badge match-id">#${escapeHtml(match.matchId)}</span>
      </div>

      <table class="ranking-table">
        <thead>
          ${tableHeader}
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
    const hasTeams = match.hasTeams || match.ranking.hasTeams;

    ranking.forEach((player) => {
      totalKills += player.frags;
      totalDeaths += player.deaths;

      if (!playerStats.has(player.name)) {
        playerStats.set(player.name, {
          frags: 0,
          deaths: 0,
          friendlyKills: 0,
          matches: 0,
          wins: 0
        });
      }

      const stats = playerStats.get(player.name);
      stats.frags += player.frags;
      stats.deaths += player.deaths;
      stats.friendlyKills += (player.friendlyKills || 0);
      stats.matches += 1;
      if (player.isWinner) {
        stats.wins += 1;
      }
    });
  });

  const ranking = [];
  playerStats.forEach((stats, name) => {
    const score = stats.frags - stats.friendlyKills;
    const kd = stats.deaths > 0 ? stats.frags / stats.deaths : stats.frags;
    ranking.push({
      name,
      frags: stats.frags,
      friendlyKills: stats.friendlyKills,
      score,
      deaths: stats.deaths,
      kd,
      matches: stats.matches,
      wins: stats.wins,
    });
  });

  // Sort by score (frags - friendly kills)
  ranking.sort((a, b) => b.score - a.score);

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
  const hasTeamsMatch = entry.matches.some(m => m.hasTeams || m.ranking?.hasTeams);

  const hintEl = document.querySelector('.history-hint');
  if (hintEl) hintEl.classList.add('hidden');

  const entryItem = document.createElement('div');
  entryItem.className = 'history-item';
  entryItem.dataset.entryId = entry.id;

  const teamsIndicator = hasTeamsMatch ? '<span class="history-teams-badge">T</span>' : '';

  entryItem.innerHTML = `
    <div class="history-item-icon">📄</div>
    <div class="history-item-info">
      <span class="history-item-name">${entry.name} ${teamsIndicator}</span>
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
