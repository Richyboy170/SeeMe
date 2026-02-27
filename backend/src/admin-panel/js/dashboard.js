/**
 * Dashboard page logic — rich insights per chart
 */
let chartInstances = {};
let currentDays = 30;

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  initSidebar('dashboard');

  setupPeriodSelector();
  await loadAll();
});

async function loadAll() {
  await Promise.all([loadStats(), loadGrowth(currentDays)]);
}

// ===== PERIOD SELECTOR =====
function setupPeriodSelector() {
  const btns = document.querySelectorAll('#period-selector .btn');
  btns.forEach(btn => {
    btn.addEventListener('click', async () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentDays = parseInt(btn.dataset.days);
      await loadGrowth(currentDays);
    });
  });
}

// ===== STATS =====
async function loadStats() {
  try {
    const statsData = await AdminAPI.get('/dashboard/stats');
    renderStats(statsData.stats);
    renderRecentActivity(statsData.stats);
    if (statsData.stats.generatedAt) {
      document.getElementById('last-updated').textContent =
        'Updated: ' + formatDate(statsData.stats.generatedAt);
    }
  } catch (err) {
    document.getElementById('stats-grid').innerHTML =
      `<div class="alert alert-error">Failed to load stats: ${escapeHtml(err.message)}</div>`;
  }
}

// ===== GROWTH CHARTS =====
async function loadGrowth(days) {
  // Destroy existing charts
  Object.values(chartInstances).forEach(c => { try { c.destroy(); } catch {} });
  chartInstances = {};

  try {
    const growthData = await AdminAPI.get(`/dashboard/growth?days=${days}`);
    const d = growthData.data;
    const s = d.summaries;

    renderInsightPills('users-insights', s.users, 'users');
    renderInsightPills('posts-insights', s.posts, 'posts');
    renderInsightPills('comments-insights', s.comments, 'comments');
    renderInsightPills('likes-insights', s.likes, 'likes');
    renderInsightPills('follows-insights', s.follows, 'follows');
    renderInsightPills('coins-insights', s.coins, 'coins');

    chartInstances['users'] = renderBarChart('users-chart', d.users, '#6c5ce7', 'New Users', s.users);
    chartInstances['posts'] = renderBarChart('posts-chart', d.posts, '#74b9ff', 'New Posts', s.posts);
    chartInstances['comments'] = renderBarChart('comments-chart', d.comments, '#00cec9', 'Comments', s.comments);
    chartInstances['likes'] = renderBarChart('likes-chart', d.likes, '#e17055', 'Likes', s.likes);
    chartInstances['follows'] = renderBarChart('follows-chart', d.follows, '#a29bfe', 'New Follows', s.follows);
    chartInstances['coins'] = renderBarChart('coins-chart', d.coins, '#fdcb6e', 'Coins', s.coins);

    renderCoinBreakdown(d.coinBreakdown);
    renderTopPosts(d.topPosts);
    renderTopUsers(d.topUsers);
  } catch (err) {
    const el = document.getElementById('users-panel');
    if (el) el.innerHTML = `<div class="alert alert-error">Failed to load charts: ${escapeHtml(err.message)}</div>`;
  }
}

// ===== INSIGHT PILLS =====
function renderInsightPills(containerId, summary, dataKey) {
  const el = document.getElementById(containerId);
  if (!el || !summary) return;

  const last7 = Number(summary.last7) || 0;
  const prior7 = Number(summary.prior7) || 0;
  const diff = last7 - prior7;

  // Calculate percentage: real math, no caps
  let pctText, trendClass, trendIcon;
  if (prior7 > 0) {
    const pct = ((diff / prior7) * 100).toFixed(1);
    pctText = diff >= 0 ? `+${pct}%` : `${pct}%`;
  } else if (last7 > 0) {
    // Prior week was 0, so percentage is meaningless — show raw increase
    pctText = `+${last7.toLocaleString()}`;
  } else {
    pctText = '0';
  }
  trendClass = diff > 0 ? 'trend-up' : diff < 0 ? 'trend-down' : 'trend-flat';
  trendIcon = diff > 0 ? '&#9650;' : diff < 0 ? '&#9660;' : '&#8212;';

  // Advancement: raw difference
  const advSign = diff > 0 ? '+' : '';
  const advText = `${advSign}${diff.toLocaleString()}`;

  el.innerHTML = `
    <div class="insight-pill">
      <span class="insight-label">Total</span>
      <span class="insight-value">${Number(summary.total).toLocaleString()}</span>
    </div>
    <div class="insight-pill">
      <span class="insight-label">Avg/day</span>
      <span class="insight-value">${summary.average}</span>
    </div>
    <div class="insight-pill">
      <span class="insight-label">Peak</span>
      <span class="insight-value">${Number(summary.peak.count).toLocaleString()}</span>
    </div>
    <div class="insight-pill wide">
      <span class="insight-label">7d Change</span>
      <span class="insight-value ${trendClass}">${trendIcon} ${pctText}</span>
      <span class="insight-sub">${last7.toLocaleString()} vs ${prior7.toLocaleString()} (${advText})</span>
    </div>
  `;
}

// ===== BAR CHART =====
function renderBarChart(canvasId, data, color, label, summary) {
  const ctx = document.getElementById(canvasId);
  if (!ctx || !data || data.length === 0) return null;

  const labels = data.map(d => {
    const date = new Date(d.date + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const fullDates = data.map(d => d.date);
  const counts = data.map(d => d.count);
  const maxCount = Math.max(...counts, 1);
  const avg = summary ? summary.average : 0;

  const rgbMatch = hexToRgb(color);
  const isLargeRange = data.length > 60;
  const bgColor = rgbMatch
    ? counts.map(c => c === maxCount ? `rgba(${rgbMatch},0.9)` : `rgba(${rgbMatch},${isLargeRange ? 0.6 : 0.45})`)
    : color;

  // Average line dataset
  const datasets = [
    {
      label,
      data: counts,
      backgroundColor: bgColor,
      borderColor: isLargeRange ? 'transparent' : color,
      borderWidth: isLargeRange ? 0 : 1,
      borderRadius: isLargeRange ? 1 : 3,
      barPercentage: isLargeRange ? 0.95 : 0.7,
      categoryPercentage: isLargeRange ? 0.95 : 0.8,
      order: 1,
    },
  ];

  if (avg > 0) {
    datasets.push({
      label: 'Average',
      data: new Array(counts.length).fill(avg),
      type: 'line',
      borderColor: rgbMatch ? `rgba(${rgbMatch},0.4)` : color,
      borderWidth: 1,
      borderDash: [4, 4],
      pointRadius: 0,
      fill: false,
      order: 0,
    });
  }

  return new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#222639',
          titleColor: '#e8eaf0',
          bodyColor: '#9ca3b8',
          borderColor: '#2d3250',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            title: (items) => {
              const idx = items[0].dataIndex;
              const dateStr = fullDates[idx];
              const date = new Date(dateStr + 'T00:00:00');
              return date.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
            },
            label: (ctx) => {
              if (ctx.datasetIndex > 0) return null; // skip average line in tooltip
              const val = ctx.parsed.y;
              const lines = [`${val.toLocaleString()} ${label.toLowerCase()}`];
              if (summary && summary.total > 0) {
                const pct = ((val / summary.total) * 100).toFixed(1);
                lines.push(`${pct}% of period total`);
              }
              if (avg > 0) {
                const diff = val - avg;
                const sign = diff >= 0 ? '+' : '';
                lines.push(`${sign}${diff.toFixed(1)} vs avg (${avg}/day)`);
              }
              return lines;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#6b7394',
            font: { size: 10 },
            maxRotation: isLargeRange ? 60 : 45,
            autoSkip: true,
            maxTicksLimit: isLargeRange ? 12 : 10,
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(45,50,80,0.4)' },
          ticks: {
            color: '#6b7394',
            font: { size: 10 },
            precision: 0,
            stepSize: maxCount <= 5 ? 1 : undefined,
          },
          suggestedMax: maxCount <= 3 ? 5 : undefined,
        },
      },
    },
  });
}

// ===== COIN BREAKDOWN DOUGHNUT =====
function renderCoinBreakdown(breakdown) {
  const ctx = document.getElementById('coin-breakdown-chart');
  const legendEl = document.getElementById('coin-breakdown-legend');
  if (!ctx || !breakdown || breakdown.length === 0) {
    if (legendEl) legendEl.innerHTML = '<div class="empty-state" style="padding:20px"><p>No transaction data</p></div>';
    return;
  }

  // Sort by amount desc and take top 8, group the rest
  const sorted = [...breakdown].sort((a, b) => b.amount - a.amount);
  const top = sorted.slice(0, 8);
  const rest = sorted.slice(8);
  if (rest.length > 0) {
    top.push({
      type: 'other',
      count: rest.reduce((a, r) => a + r.count, 0),
      amount: rest.reduce((a, r) => a + r.amount, 0),
    });
  }

  const palette = ['#6c5ce7', '#74b9ff', '#00cec9', '#fdcb6e', '#e17055', '#a29bfe', '#55efc4', '#fab1a0', '#dfe6e9'];
  const totalAmount = top.reduce((a, t) => a + t.amount, 0);

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: top.map(t => formatTxType(t.type)),
      datasets: [{
        data: top.map(t => t.amount),
        backgroundColor: palette.slice(0, top.length),
        borderColor: '#222639',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#222639',
          titleColor: '#e8eaf0',
          bodyColor: '#9ca3b8',
          borderColor: '#2d3250',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (ctx) => {
              const val = ctx.parsed;
              const pct = totalAmount > 0 ? ((val / totalAmount) * 100).toFixed(1) : 0;
              const item = top[ctx.dataIndex];
              return [`${val.toLocaleString()} coins (${pct}%)`, `${item.count.toLocaleString()} transactions`];
            },
          },
        },
      },
    },
  });
  chartInstances['coinBreakdown'] = chart;

  // Custom legend
  legendEl.innerHTML = '<div class="breakdown-legend">' + top.map((t, i) => {
    const pct = totalAmount > 0 ? ((t.amount / totalAmount) * 100).toFixed(0) : 0;
    return `<div class="legend-item">
      <span class="legend-dot" style="background:${palette[i]}"></span>
      <span class="legend-label">${formatTxType(t.type)}</span>
      <span class="legend-value">${pct}%</span>
    </div>`;
  }).join('') + '</div>';
}

// ===== TOP POSTS =====
function renderTopPosts(posts) {
  const el = document.getElementById('top-posts-list');
  if (!el) return;
  if (!posts || posts.length === 0) {
    el.innerHTML = '<div class="empty-state" style="padding:20px"><p>No posts in this period</p></div>';
    return;
  }

  el.innerHTML = posts.map((p, i) => {
    const author = p.user ? p.user.username : 'Unknown';
    const caption = p.caption || '(no caption)';
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    const engagement = (p.likesCount || 0) + (p.commentsCount || 0) + (p.repostCount || 0);
    return `
      <div class="top-item">
        <div class="top-rank ${rankClass}">${i + 1}</div>
        <div class="top-item-info">
          <div class="top-item-name">${escapeHtml(caption).substring(0, 50)}</div>
          <div class="top-item-sub">by ${escapeHtml(author)} &middot; ${timeAgo(p.createdAt)}</div>
        </div>
        <div style="text-align:right">
          <div class="top-item-stat" style="color:var(--danger)">${p.likesCount || 0}</div>
          <div style="font-size:10px;color:var(--text-muted)">${p.commentsCount || 0} comments &middot; ${p.repostCount || 0} reposts</div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== TOP USERS =====
function renderTopUsers(users) {
  const el = document.getElementById('top-users-list');
  if (!el) return;
  if (!users || users.length === 0) {
    el.innerHTML = '<div class="empty-state" style="padding:20px"><p>No data</p></div>';
    return;
  }

  el.innerHTML = users.map((u, i) => {
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    return `
      <div class="top-item">
        <div class="top-rank ${rankClass}">${i + 1}</div>
        <div class="top-item-info">
          <div class="top-item-name">
            <a href="/admin/user-detail.html?id=${u.userId}">${escapeHtml(u.username)}</a>
          </div>
        </div>
        <div style="text-align:right">
          <div class="top-item-stat" style="color:var(--info)">${u.postCount}</div>
          <div style="font-size:10px;color:var(--text-muted)">posts</div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== STATS CARDS =====
function renderStats(stats) {
  const grid = document.getElementById('stats-grid');
  const userCoins = Number(stats.coins.totalCoinsInCirculation || 0);
  const lifetimeEarned = Number(stats.coins.totalLifetimeEarned || 0);
  const lifetimeGiven = Number(stats.coins.totalLifetimeGiven || 0);
  const skyCoins = Number(stats.coins.totalSkyCoins || 0);
  const botCoins = Number(stats.botCoinsRemaining || 0);

  grid.innerHTML = `
    <div class="stat-card accent">
      <div class="stat-label">Total Users</div>
      <div class="stat-value">${stats.totalUsers.toLocaleString()}</div>
      <div class="stat-sub">+${stats.newUsersToday} today</div>
    </div>
    <div class="stat-card success">
      <div class="stat-label">Active Users</div>
      <div class="stat-value">${stats.activeUsers.toLocaleString()}</div>
    </div>
    <div class="stat-card warning">
      <div class="stat-label">Suspended</div>
      <div class="stat-value">${stats.suspendedUsers}</div>
    </div>
    <div class="stat-card danger">
      <div class="stat-label">Banned</div>
      <div class="stat-value">${stats.bannedUsers}</div>
    </div>
    <div class="stat-card info">
      <div class="stat-label">Total Posts</div>
      <div class="stat-value">${stats.totalPosts.toLocaleString()}</div>
      <div class="stat-sub">+${stats.newPostsToday} today</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Comments</div>
      <div class="stat-value">${stats.totalComments.toLocaleString()}</div>
    </div>
    <div class="stat-card success">
      <div class="stat-label">User Coins in Circulation</div>
      <div class="stat-value">${userCoins.toLocaleString()}</div>
      <div class="stat-sub">Earned: ${lifetimeEarned.toLocaleString()} &middot; Given: ${lifetimeGiven.toLocaleString()}</div>
    </div>
    <div class="stat-card info">
      <div class="stat-label">Sky Coins (Users)</div>
      <div class="stat-value">${skyCoins.toLocaleString()}</div>
      <div class="stat-sub">Bot budget remaining: ${botCoins.toLocaleString()}</div>
    </div>
  `;
}

// ===== RECENT ACTIVITY =====
function renderRecentActivity(stats) {
  // Recent signups
  const signupsEl = document.getElementById('recent-signups');
  if (stats.recentSignups && stats.recentSignups.length > 0) {
    signupsEl.innerHTML = stats.recentSignups.map(u => `
      <div class="detail-row">
        <span class="label">
          <a href="/admin/user-detail.html?id=${u.id}" style="font-weight:500">${escapeHtml(u.username)}</a>
          <span style="color:var(--text-muted);font-size:11px;margin-left:4px">${escapeHtml(u.email)}</span>
        </span>
        <span class="value" style="font-size:11px;color:var(--text-muted)">${timeAgo(u.createdAt)}</span>
      </div>
    `).join('');
  } else {
    signupsEl.innerHTML = '<div class="empty-state" style="padding:20px"><p>No recent signups</p></div>';
  }

  // Recent posts
  const postsEl = document.getElementById('recent-posts');
  const activityPanel = document.getElementById('recent-activity');
  if (stats.recentPosts && stats.recentPosts.length > 0) {
    activityPanel.style.display = '';
    postsEl.innerHTML = stats.recentPosts.map(p => {
      const author = p.user ? p.user.username : 'Unknown';
      const caption = p.caption || '(no caption)';
      return `
        <div class="detail-row">
          <span class="label">
            <span style="font-weight:500">${escapeHtml(author)}</span>
            <span style="color:var(--text-secondary);font-size:11px;margin-left:4px">${escapeHtml(caption).substring(0, 40)}</span>
          </span>
          <span class="value" style="font-size:11px;color:var(--text-muted)">${timeAgo(p.createdAt)}</span>
        </div>
      `;
    }).join('');
  }

  // Recent transactions
  const txSection = document.getElementById('transactions-section');
  const txBody = document.getElementById('recent-transactions');
  if (stats.recentTransactions && stats.recentTransactions.length > 0) {
    txSection.style.display = '';
    txBody.innerHTML = stats.recentTransactions.map(tx => {
      const from = tx.fromUser
        ? (tx.fromUser.isBot ? `${escapeHtml(tx.fromUser.username)} <span class="badge badge-admin" style="font-size:9px">BOT</span>` : escapeHtml(tx.fromUser.username))
        : 'System';
      const to = tx.toUser ? escapeHtml(tx.toUser.username) : 'Unknown';
      const type = (tx.transactionType || '').replace(/_/g, ' ');
      return `
        <tr>
          <td>${from}</td>
          <td>${to}</td>
          <td style="font-weight:600;color:var(--success)">${tx.amount}</td>
          <td><span class="badge badge-user" style="font-size:10px">${escapeHtml(type)}</span></td>
          <td style="color:var(--text-muted);font-size:12px">${formatDate(tx.createdAt)}</td>
        </tr>
      `;
    }).join('');
  }
}

// ===== HELPERS =====
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1],16)},${parseInt(result[2],16)},${parseInt(result[3],16)}`
    : null;
}

function formatTxType(type) {
  if (!type) return 'Unknown';
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
