import { CoopLeaderboard, TeamScoreEntry } from './CoopLeaderboard';

/**
 * CoopLeaderboardUI
 * UI Components for displaying Team Scores and Player Names Input
 */

/**
 * Create Team Leaderboard Overlay
 * Displays Top 10 Teams with scores breakdown
 */
export async function createTeamLeaderboardOverlay(): Promise<void> {
    // Remove existing overlay if any
    const existingOverlay = document.querySelector('.team-leaderboard-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'team-leaderboard-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
        backdrop-filter: blur(5px);
    `;

    // Create content container
    const content = document.createElement('div');
    content.className = 'leaderboard-content';
    content.style.cssText = `
        background: linear-gradient(145deg, #1e3a5f, #2a5298);
        padding: 2rem;
        border-radius: 16px;
        max-width: 800px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    `;

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Team Leaderboard';
    title.style.cssText = `
        color: #ffffff;
        text-align: center;
        margin: 0 0 1.5rem 0;
        font-size: 2rem;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    `;
    content.appendChild(title);

    // Score Container
    const scoreList = document.createElement('div');
    scoreList.style.minHeight = '200px';
    content.appendChild(scoreList);

    // Initial Loading State
    scoreList.innerHTML = `
        <div style="text-align: center; color: #a0aec0; padding: 2rem;">
            <div class="spinner" style="margin-bottom: 1rem; font-size: 2rem;">🔄</div>
            <p>Loading global scores...</p>
        </div>
    `;

    // Load Logic
    const leaderboard = new CoopLeaderboard();

    // Start loading process
    (async () => {
        try {
            console.log('[CoopLeaderboardUI] Fetching online scores...');
            const onlineScores = await leaderboard.getOnlineTeamScores();
            console.log('[CoopLeaderboardUI] Online scores:', onlineScores);

            let displayScores = onlineScores;
            let source = 'Global';

            if (displayScores.length === 0) {
                console.log('[CoopLeaderboardUI] No online scores, falling back to local');
                displayScores = leaderboard.getTopTeamScores();
                source = 'Local';
            }

            renderScores(scoreList, displayScores, source);

        } catch (e) {
            console.error('[CoopLeaderboardUI] Failed to load scores:', e);
            // Fallback to local on error
            renderScores(scoreList, leaderboard.getTopTeamScores(), 'Local (Offline)');
        }
    })();

    // Close button
    const closeButton = document.createElement('button');
    closeButton.className = 'close-btn';
    closeButton.textContent = 'Close';
    closeButton.style.cssText = `
        display: block;
        margin: 1.5rem auto 0;
        padding: 0.75rem 2rem;
        background: linear-gradient(145deg, #e53e3e, #c53030);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 0 4px 12px rgba(229, 62, 62, 0.3);
    `;
    closeButton.addEventListener('mouseenter', () => {
        closeButton.style.transform = 'scale(1.05)';
        closeButton.style.boxShadow = '0 6px 16px rgba(229, 62, 62, 0.4)';
    });
    closeButton.addEventListener('mouseleave', () => {
        closeButton.style.transform = 'scale(1)';
        closeButton.style.boxShadow = '0 4px 12px rgba(229, 62, 62, 0.3)';
    });
    closeButton.addEventListener('click', () => {
        overlay.remove();
    });
    content.appendChild(closeButton);

    overlay.appendChild(content);
    document.body.appendChild(overlay);
}

/**
 * Render Scores Helper
 */
function renderScores(container: HTMLElement, scores: TeamScoreEntry[], source: string) {
    container.innerHTML = '';

    // Add source badge
    const badge = document.createElement('div');
    badge.style.cssText = `
        display: inline-block;
        padding: 4px 12px;
        background: ${source === 'Global' ? '#48bb78' : '#ed8936'};
        color: white;
        border-radius: 12px;
        font-size: 0.8rem;
        margin-bottom: 1rem;
        font-weight: bold;
    `;
    badge.textContent = `${source} Leaderboard`;
    container.appendChild(badge);

    if (scores.length === 0) {
        // Empty message
        const emptyMessage = document.createElement('p');
        emptyMessage.className = 'empty-message';
        emptyMessage.textContent = '🎮 No scores found yet. Play Coop Mode to compete!';
        emptyMessage.style.cssText = `
            color: #a0aec0;
            text-align: center;
            font-size: 1.2rem;
            padding: 2rem 0;
        `;
        container.appendChild(emptyMessage);
    } else {
        // Render scores
        scores.forEach((score, index) => {
            const row = createTeamScoreRow(score, index + 1);
            container.appendChild(row);
        });
    }
}

/**
 * Create a single team score row
 */
function createTeamScoreRow(score: TeamScoreEntry, rank: number): HTMLElement {
    const row = document.createElement('div');
    row.className = 'leaderboard-row';
    row.style.cssText = `
        background: rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 1rem;
        margin-bottom: 0.75rem;
        display: grid;
        grid-template-columns: 50px 1fr 1fr 100px;
        gap: 1rem;
        align-items: center;
        transition: background 0.2s;
        border-left: 4px solid ${getRankColor(rank)};
    `;
    row.addEventListener('mouseenter', () => {
        row.style.background = 'rgba(255, 255, 255, 0.15)';
    });
    row.addEventListener('mouseleave', () => {
        row.style.background = 'rgba(255, 255, 255, 0.1)';
    });

    // Rank
    const rankEl = document.createElement('div');
    rankEl.textContent = `#${rank}`;
    rankEl.style.cssText = `
        color: ${getRankColor(rank)};
        font-size: 1.5rem;
        font-weight: bold;
        text-align: center;
    `;
    row.appendChild(rankEl);

    // Player 1 Info
    const p1Info = document.createElement('div');
    p1Info.innerHTML = `
        <div style="color: #63b3ed; font-weight: 600; margin-bottom: 0.25rem;">
            👤 ${score.player1Name}
        </div>
        <div style="color: #a0aec0; font-size: 0.9rem;">
            ${score.scoreP1} pts • ${score.linesP1} lines
        </div>
    `;
    row.appendChild(p1Info);

    // Player 2 Info
    const p2Info = document.createElement('div');
    p2Info.innerHTML = `
        <div style="color: #fc8181; font-weight: 600; margin-bottom: 0.25rem;">
            👤 ${score.player2Name}
        </div>
        <div style="color: #a0aec0; font-size: 0.9rem;">
            ${score.scoreP2} pts • ${score.linesP2} lines
        </div>
    `;
    row.appendChild(p2Info);

    // Total Score
    const totalScore = document.createElement('div');
    totalScore.textContent = score.totalScore.toString();
    totalScore.style.cssText = `
        color: #ffd700;
        font-size: 1.5rem;
        font-weight: bold;
        text-align: center;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    `;
    row.appendChild(totalScore);

    return row;
}

/**
 * Get color based on rank
 */
function getRankColor(rank: number): string {
    switch (rank) {
        case 1: return '#ffd700'; // Gold
        case 2: return '#c0c0c0'; // Silver
        case 3: return '#cd7f32'; // Bronze
        default: return '#718096'; // Gray
    }
}

/**
 * Create Player Names Input Modal
 * Allows players to set their names before starting Coop Mode
 */
export function createPlayerNamesModal(
    container: HTMLElement,
    onStart?: (player1Name: string, player2Name: string) => void
): void {
    console.log('[PlayerNamesModal] Creating modal...');
    // Remove existing modal if any
    const existingModal = container.querySelector('.player-names-modal');
    if (existingModal) {
        console.log('[PlayerNamesModal] Removing existing modal');
        existingModal.remove();
    }

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'player-names-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
    `;

    // Create content
    const content = document.createElement('div');
    content.style.cssText = `
        background: linear-gradient(145deg, #1e3a5f, #2a5298);
        padding: 2rem;
        border-radius: 16px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
    `;

    // Title
    const title = document.createElement('h2');
    title.textContent = 'Team Names';
    title.style.cssText = `
        color: #ffffff;
        text-align: center;
        margin: 0 0 1.5rem 0;
        font-size: 1.8rem;
    `;
    content.appendChild(title);

    // Player 1 Input
    const p1Label = document.createElement('label');
    p1Label.textContent = 'Player 1 Name:';
    p1Label.style.cssText = `
        display: block;
        color: #63b3ed;
        margin-bottom: 0.5rem;
        font-weight: 600;
    `;
    content.appendChild(p1Label);

    const p1Input = document.createElement('input');
    p1Input.id = 'player1-name';
    p1Input.type = 'text';
    p1Input.value = 'Player 1';
    p1Input.placeholder = 'Enter Player 1 name';
    p1Input.style.cssText = `
        width: 100%;
        padding: 0.75rem;
        margin-bottom: 1rem;
        border: 2px solid #63b3ed;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        font-size: 1rem;
        box-sizing: border-box;
    `;
    content.appendChild(p1Input);

    // Player 2 Input
    const p2Label = document.createElement('label');
    p2Label.textContent = 'Player 2 Name:';
    p2Label.style.cssText = `
        display: block;
        color: #fc8181;
        margin-bottom: 0.5rem;
        font-weight: 600;
    `;
    content.appendChild(p2Label);

    const p2Input = document.createElement('input');
    p2Input.id = 'player2-name';
    p2Input.type = 'text';
    p2Input.value = 'Player 2';
    p2Input.placeholder = 'Enter Player 2 name';
    p2Input.style.cssText = `
        width: 100%;
        padding: 0.75rem;
        margin-bottom: 1.5rem;
        border: 2px solid #fc8181;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        font-size: 1rem;
        box-sizing: border-box;
    `;
    content.appendChild(p2Input);

    // Buttons container
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = `
        display: flex;
        gap: 1rem;
        justify-content: center;
    `;

    // Start button
    const startBtn = document.createElement('button');
    startBtn.className = 'start-btn';
    startBtn.textContent = 'Start Game';
    startBtn.style.cssText = `
        padding: 0.75rem 2rem;
        background: linear-gradient(145deg, #48bb78, #38a169);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 0 4px 12px rgba(72, 187, 120, 0.3);
    `;
    startBtn.addEventListener('mouseenter', () => {
        startBtn.style.transform = 'scale(1.05)';
    });
    startBtn.addEventListener('mouseleave', () => {
        startBtn.style.transform = 'scale(1)';
    });
    startBtn.addEventListener('click', () => {
        const player1Name = p1Input.value.trim() || 'Player 1';
        const player2Name = p2Input.value.trim() || 'Player 2';

        if (onStart) {
            onStart(player1Name, player2Name);
        }

        modal.remove();
    });
    buttonsDiv.appendChild(startBtn);

    // Cancel button
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'cancel-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
        padding: 0.75rem 2rem;
        background: linear-gradient(145deg, #718096, #4a5568);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
    `;
    cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.transform = 'scale(1.05)';
    });
    cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.transform = 'scale(1)';
    });
    cancelBtn.addEventListener('click', () => {
        modal.remove();
    });
    buttonsDiv.appendChild(cancelBtn);

    content.appendChild(buttonsDiv);
    modal.appendChild(content);
    container.appendChild(modal);
    console.log('[PlayerNamesModal] Modal appended to container:', container.id || container.className);
}
