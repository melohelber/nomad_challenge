const socket = io();

const elements = {
  logFile: document.getElementById('logFile'),
  fileLabel: document.getElementById('fileLabel'),
  selectedFile: document.getElementById('selectedFile'),
  processBtn: document.getElementById('processBtn'),
  animationDelay: document.getElementById('animationDelay'),
  delayValue: document.getElementById('delayValue'),
  progressBar: document.getElementById('progressBar'),
  progressFill: document.querySelector('.progress-fill'),
  progressText: document.querySelector('.progress-text'),
  liveSection: document.getElementById('liveSection'),
  liveRankingBody: document.getElementById('liveRankingBody'),
  currentMatchId: document.getElementById('currentMatchId'),
  lastEvent: document.getElementById('lastEvent'),
  resultsSection: document.getElementById('resultsSection'),
  matchResultsList: document.getElementById('matchResultsList'),
  matchCount: document.getElementById('matchCount'),
  matchHistory: document.getElementById('matchHistory'),
};

let previousRanking = [];
let completedMatches = [];
let currentFileName = '';
let logEntries = []; // Store all log file entries with their matches

// Show selected file name
elements.logFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    currentFileName = file.name;
    elements.selectedFile.textContent = file.name;
    elements.fileLabel.textContent = 'Change file';
  } else {
    currentFileName = '';
    elements.selectedFile.textContent = '';
    elements.fileLabel.textContent = 'Select log file';
  }
});

elements.animationDelay.addEventListener('input', (e) => {
  elements.delayValue.textContent = `${e.target.value}ms`;
});

elements.processBtn.addEventListener('click', () => {
  const file = elements.logFile.files[0];
  if (!file) {
    alert('Please select a log file');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target.result;
    const delay = parseInt(elements.animationDelay.value);

    elements.processBtn.disabled = true;
    elements.progressBar.classList.remove('hidden');
    elements.liveSection.classList.remove('hidden');
    elements.resultsSection.classList.add('hidden');
    elements.matchResultsList.innerHTML = '';
    elements.liveRankingBody.innerHTML = '';
    previousRanking = [];
    completedMatches = [];

    socket.emit('processLog', { content, delay });
  };
  reader.readAsText(file);
});

socket.on('rankingUpdate', (data) => {
  updateProgress(data.eventNumber, data.totalEvents);
  elements.currentMatchId.textContent = `Match ${data.matchId}`;

  updateLastEvent(data.lastEvent);
  animateLiveRanking(data.ranking);
});

socket.on('matchComplete', (data) => {
  completedMatches.push(data);
  // Don't add individual matches to history - we'll add the whole log entry when processing completes
  previousRanking = [];
  elements.liveRankingBody.innerHTML = '';
});

socket.on('processingComplete', (data) => {
  elements.processBtn.disabled = false;
  elements.progressFill.style.width = '100%';
  elements.progressText.textContent = 'Done!';

  setTimeout(() => {
    elements.progressBar.classList.add('hidden');
    elements.progressFill.style.width = '0%';
    elements.liveSection.classList.add('hidden');

    // Save this log entry to history
    if (completedMatches.length > 0) {
      const entry = {
        id: Date.now(),
        fileName: currentFileName,
        matches: [...completedMatches],
        timestamp: new Date().toLocaleString(),
      };
      logEntries.unshift(entry);
      addLogEntryToHistory(entry);
    }

    // Show all matches results
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
  elements.matchCount.textContent = `${completedMatches.length} match${completedMatches.length > 1 ? 'es' : ''}`;

  let html = '';
  completedMatches.forEach((match, index) => {
    html += createMatchResultCard(match, index + 1);
  });

  elements.matchResultsList.innerHTML = html;
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
    <span class="match-id">${entry.fileName}</span>
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

// Note: loadLogEntry is used for history items from current session
// For server-rendered history items (from database), we'll need a separate handler
