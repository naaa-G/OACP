export const PLAYGROUND_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OACP Playground</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0b0f14;
      --panel: #141b26;
      --panel-2: #1a2332;
      --border: #2a364a;
      --text: #e8edf5;
      --muted: #8b9cb3;
      --accent: #5b9cf5;
      --accent-dim: rgba(91, 156, 245, 0.15);
      --success: #3dd68c;
      --warning: #f5a623;
      --error: #f07178;
      --node-idle: #3a4a63;
      --node-active: #5b9cf5;
      --edge: #4a5f7a;
      --pulse: #7ec8ff;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.45;
      min-height: 100vh;
    }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      padding: 0.875rem 1.25rem;
      border-bottom: 1px solid var(--border);
      background: var(--panel);
    }
    header h1 { margin: 0; font-size: 1.125rem; font-weight: 700; }
    header p { margin: 0.125rem 0 0; color: var(--muted); font-size: 0.8125rem; }
    .header-actions { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
    .badge {
      font-size: 0.6875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0.2rem 0.5rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      color: var(--muted);
    }
    .badge.live { color: var(--success); border-color: rgba(61, 214, 140, 0.4); background: rgba(61, 214, 140, 0.08); }
    button, select, input {
      font: inherit;
      padding: 0.45rem 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--panel-2);
      color: var(--text);
    }
    button {
      cursor: pointer;
      font-weight: 600;
    }
    button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
    button.ghost { background: transparent; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .toggle { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.875rem; color: var(--muted); }
    main {
      display: grid;
      grid-template-columns: 260px 1fr 320px;
      grid-template-rows: minmax(320px, 1fr) auto;
      gap: 0.75rem;
      padding: 0.75rem;
      height: calc(100vh - 72px);
    }
    @media (max-width: 1100px) {
      main { grid-template-columns: 1fr; grid-template-rows: auto auto auto auto; height: auto; }
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .panel h2 {
      margin: 0;
      padding: 0.65rem 0.875rem;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--muted);
      border-bottom: 1px solid var(--border);
      background: rgba(255,255,255,0.02);
    }
    .panel-body { padding: 0.75rem; overflow: auto; flex: 1; min-height: 0; }
    .stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;
      padding: 0.75rem;
      border-bottom: 1px solid var(--border);
    }
    .stat { background: rgba(255,255,255,0.03); border-radius: 6px; padding: 0.5rem 0.625rem; }
    .stat-label { font-size: 0.6875rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .stat-value { font-size: 1.125rem; font-weight: 700; margin-top: 0.125rem; }
    .agent-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; }
    .agent-card {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.625rem 0.75rem;
      background: rgba(255,255,255,0.02);
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .agent-card.active {
      border-color: var(--accent);
      box-shadow: 0 0 0 1px rgba(91, 156, 245, 0.25);
      background: var(--accent-dim);
    }
    .agent-id { font-family: ui-monospace, monospace; font-size: 0.75rem; word-break: break-all; }
    .agent-name { font-weight: 600; font-size: 0.875rem; margin-bottom: 0.25rem; }
    .caps { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.375rem; }
    .cap {
      font-size: 0.6875rem;
      padding: 0.125rem 0.375rem;
      border-radius: 999px;
      background: rgba(91, 156, 245, 0.12);
      color: #a8c9f5;
      border: 1px solid rgba(91, 156, 245, 0.25);
    }
    #graphPanel { grid-column: 2; grid-row: 1; }
    #feedPanel { grid-column: 3; grid-row: 1; }
    #tracePanel { grid-column: 1 / -1; grid-row: 2; max-height: 180px; }
    @media (max-width: 1100px) {
      #graphPanel, #feedPanel, #tracePanel { grid-column: 1; grid-row: auto; max-height: none; }
    }
    #graphCanvas {
      width: 100%;
      height: 100%;
      min-height: 280px;
      display: block;
      background:
        radial-gradient(circle at 50% 50%, rgba(91,156,245,0.04) 0%, transparent 55%),
        repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(255,255,255,0.02) 24px),
        repeating-linear-gradient(90deg, transparent, transparent 23px, rgba(255,255,255,0.02) 24px);
    }
    .graph-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 240px;
      color: var(--muted);
      text-align: center;
      padding: 1rem;
      font-size: 0.875rem;
    }
    .feed { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.375rem; }
    .feed-item {
      border-left: 3px solid var(--border);
      padding: 0.5rem 0.625rem;
      background: rgba(255,255,255,0.02);
      border-radius: 0 6px 6px 0;
      font-size: 0.8125rem;
      animation: fadeIn 0.35s ease;
    }
    .feed-item.new { border-left-color: var(--pulse); background: rgba(126, 200, 255, 0.08); }
    .feed-item.success { border-left-color: var(--success); }
    .feed-item.error { border-left-color: var(--error); }
    .feed-summary { font-weight: 600; }
    .feed-meta { color: var(--muted); font-size: 0.75rem; font-family: ui-monospace, monospace; margin-top: 0.125rem; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
    @keyframes pulseEdge {
      0% { stroke: var(--pulse); stroke-width: 3; }
      100% { stroke: var(--edge); stroke-width: 1.5; }
    }
    .edge-pulse { animation: pulseEdge 1.2s ease; }
    .trace-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--border);
      cursor: pointer;
      font-size: 0.8125rem;
    }
    .trace-row:hover, .trace-row.active { background: var(--accent-dim); }
    .trace-row:last-child { border-bottom: none; }
    .trace-id { font-family: ui-monospace, monospace; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .error-banner {
      margin: 0.75rem;
      padding: 0.625rem 0.875rem;
      background: rgba(240, 113, 120, 0.12);
      border: 1px solid var(--error);
      border-radius: 6px;
      color: #ffb4b9;
      font-size: 0.875rem;
      display: none;
    }
    .legend { display: flex; gap: 0.75rem; flex-wrap: wrap; padding: 0.5rem 0.875rem; border-top: 1px solid var(--border); font-size: 0.75rem; color: var(--muted); }
    .legend span::before { content: ''; display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 0.35rem; vertical-align: middle; }
    .legend .idle::before { background: var(--node-idle); }
    .legend .active::before { background: var(--node-active); }
    .legend .subtask::before { background: var(--accent); border-radius: 0; width: 14px; height: 2px; }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>OACP Playground</h1>
      <p>Live agent graph, message flow, and delegation topology</p>
    </div>
    <div class="header-actions">
      <span id="liveBadge" class="badge">Paused</span>
      <label class="toggle"><input id="liveToggle" type="checkbox" checked /> Live</label>
      <select id="pollInterval" aria-label="Poll interval">
        <option value="1000">1s</option>
        <option value="1500" selected>1.5s</option>
        <option value="3000">3s</option>
      </select>
      <button id="refreshBtn" type="button" class="ghost">Refresh</button>
    </div>
  </header>
  <div id="error" class="error-banner"></div>
  <main>
    <section class="panel" id="agentsPanel">
      <h2>Registered agents</h2>
      <div class="stats">
        <div class="stat"><div class="stat-label">Agents</div><div class="stat-value" id="statAgents">0</div></div>
        <div class="stat"><div class="stat-label">Traces</div><div class="stat-value" id="statTraces">0</div></div>
        <div class="stat"><div class="stat-label">Messages</div><div class="stat-value" id="statMessages">0</div></div>
      </div>
      <div class="panel-body"><ul id="agentList" class="agent-list"></ul></div>
    </section>

    <section class="panel" id="graphPanel">
      <h2>Delegation graph</h2>
      <div class="panel-body" style="padding:0;position:relative;">
        <svg id="graphCanvas" role="img" aria-label="Agent delegation graph"></svg>
        <div id="graphEmpty" class="graph-empty">Select a trace or run a demo to visualize agent collaboration.</div>
      </div>
      <div class="legend">
        <span class="idle">Idle agent</span>
        <span class="active">Active in trace</span>
        <span class="subtask">Delegation / subtask edge</span>
      </div>
    </section>

    <section class="panel" id="feedPanel">
      <h2>Message flow</h2>
      <div class="panel-body"><ul id="messageFeed" class="feed"></ul></div>
    </section>

    <section class="panel" id="tracePanel">
      <h2>Recent traces</h2>
      <div class="panel-body" style="padding:0;" id="traceList"></div>
    </section>
  </main>
  <script>
    const liveToggle = document.getElementById('liveToggle');
    const pollInterval = document.getElementById('pollInterval');
    const refreshBtn = document.getElementById('refreshBtn');
    const liveBadge = document.getElementById('liveBadge');
    const errorBanner = document.getElementById('error');
    const agentList = document.getElementById('agentList');
    const messageFeed = document.getElementById('messageFeed');
    const traceList = document.getElementById('traceList');
    const graphCanvas = document.getElementById('graphCanvas');
    const graphEmpty = document.getElementById('graphEmpty');
    const statAgents = document.getElementById('statAgents');
    const statTraces = document.getElementById('statTraces');
    const statMessages = document.getElementById('statMessages');

    let activeTraceId = '';
    let pollTimer = null;
    let lastMessageCount = 0;
    let lastFeedIds = new Set();

    function showError(message) {
      errorBanner.textContent = message;
      errorBanner.style.display = message ? 'block' : 'none';
    }

    function shortAgentId(id) {
      return id.replace(/^agent:\\/\\//, '');
    }

    async function fetchSnapshot() {
      const params = new URLSearchParams({ limit: '25' });
      if (activeTraceId) params.set('trace_id', activeTraceId);
      const response = await fetch('/playground/snapshot?' + params.toString());
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error?.message || ('HTTP ' + response.status));
      }
      return body.snapshot;
    }

    function renderAgents(agents, activeAgents) {
      agentList.innerHTML = '';
      if (!agents.length) {
        agentList.innerHTML = '<li style="color:var(--muted);font-size:0.875rem;">No agents registered. POST /agents or run a demo.</li>';
        return;
      }
      for (const agent of agents) {
        const li = document.createElement('li');
        li.className = 'agent-card' + (activeAgents.has(agent.id) ? ' active' : '');
        const caps = (agent.capabilities || []).map(function (cap) {
          return '<span class="cap">' + cap + '</span>';
        }).join('');
        li.innerHTML =
          '<div class="agent-name">' + (agent.name || shortAgentId(agent.id)) + '</div>' +
          '<div class="agent-id">' + agent.id + '</div>' +
          (caps ? '<div class="caps">' + caps + '</div>' : '');
        agentList.appendChild(li);
      }
    }

    function renderTraces(traces) {
      traceList.innerHTML = '';
      if (!traces.length) {
        traceList.innerHTML = '<div style="padding:0.75rem;color:var(--muted);font-size:0.875rem;">No traces yet.</div>';
        return;
      }
      for (const trace of traces) {
        const row = document.createElement('div');
        row.className = 'trace-row' + (trace.traceId === activeTraceId ? ' active' : '');
        row.innerHTML =
          '<span class="trace-id">' + trace.traceId + '</span>' +
          '<span class="meta">' + trace.messageCount + ' msgs · ' + trace.agents.length + ' agents</span>';
        row.addEventListener('click', function () {
          activeTraceId = trace.traceId;
          lastMessageCount = 0;
          lastFeedIds = new Set();
          refresh();
        });
        traceList.appendChild(row);
      }
    }

    function renderFeed(timeline) {
      const events = timeline || [];
      messageFeed.innerHTML = '';
      const recent = events.slice(-40);
      for (const event of recent) {
        const li = document.createElement('li');
        const isNew = !lastFeedIds.has(event.message_id) && lastFeedIds.size > 0;
        let statusClass = '';
        if (event.status === 'success') statusClass = 'success';
        if (event.status === 'error') statusClass = 'error';
        li.className = 'feed-item' + (isNew ? ' new' : '') + (statusClass ? ' ' + statusClass : '');
        li.innerHTML =
          '<div class="feed-summary">' + event.summary + '</div>' +
          '<div class="feed-meta">' + event.from +
            (event.to ? ' → ' + event.to : '') +
            (event.capability ? ' · ' + event.capability : '') +
          '</div>';
        messageFeed.appendChild(li);
      }
      messageFeed.scrollTop = messageFeed.scrollHeight;
      lastFeedIds = new Set(events.map(function (e) { return e.message_id; }));
    }

    function layoutNodes(agentIds, width, height) {
      const positions = new Map();
      const count = agentIds.length;
      if (count === 0) return positions;
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.34;
      agentIds.forEach(function (id, index) {
        const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
        positions.set(id, {
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
        });
      });
      return positions;
    }

    function renderGraph(agents, agentLinks, activeAgents) {
      const container = graphCanvas.parentElement;
      const width = Math.max(container.clientWidth, 400);
      const height = Math.max(container.clientHeight, 280);
      graphCanvas.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      graphCanvas.innerHTML = '';

      const agentIds = agents.map(function (a) { return a.id; });
      const hasTrace = agentLinks.length > 0 || activeAgents.size > 0;

      if (!hasTrace && agentIds.length === 0) {
        graphEmpty.style.display = 'flex';
        return;
      }
      graphEmpty.style.display = 'none';

      const positions = layoutNodes(agentIds.length ? agentIds : [...activeAgents], width, height);
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', 'arrow');
      marker.setAttribute('viewBox', '0 0 10 10');
      marker.setAttribute('refX', '9');
      marker.setAttribute('refY', '5');
      marker.setAttribute('markerWidth', '6');
      marker.setAttribute('markerHeight', '6');
      marker.setAttribute('orient', 'auto-start-reverse');
      const arrowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      arrowPath.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
      arrowPath.setAttribute('fill', 'var(--edge)');
      marker.appendChild(arrowPath);
      defs.appendChild(marker);
      graphCanvas.appendChild(defs);

      for (const link of agentLinks) {
        const from = positions.get(link.from_agent);
        const to = positions.get(link.to_agent);
        if (!from || !to) continue;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(from.x));
        line.setAttribute('y1', String(from.y));
        line.setAttribute('x2', String(to.x));
        line.setAttribute('y2', String(to.y));
        line.setAttribute('stroke', 'var(--edge)');
        line.setAttribute('stroke-width', '1.5');
        line.setAttribute('marker-end', 'url(#arrow)');
        line.classList.add('edge-pulse');
        graphCanvas.appendChild(line);
      }

      for (const [id, pos] of positions) {
        const isActive = activeAgents.has(id);
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', String(pos.x));
        circle.setAttribute('cy', String(pos.y));
        circle.setAttribute('r', isActive ? '28' : '22');
        circle.setAttribute('fill', isActive ? 'var(--node-active)' : 'var(--node-idle)');
        circle.setAttribute('stroke', isActive ? '#9ec5ff' : '#556680');
        circle.setAttribute('stroke-width', '2');
        graphCanvas.appendChild(circle);

        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', String(pos.x));
        label.setAttribute('y', String(pos.y + 44));
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('fill', 'var(--text)');
        label.setAttribute('font-size', '11');
        label.setAttribute('font-family', 'ui-monospace, monospace');
        label.textContent = shortAgentId(id);
        graphCanvas.appendChild(label);
      }
    }

    function activeAgentsFromTrace(trace) {
      const set = new Set();
      if (!trace) return set;
      for (const agent of trace.agents || []) set.add(agent);
      if (trace.timeline) {
        for (const event of trace.timeline) {
          if (event.from) set.add(event.from);
          if (event.to) set.add(event.to);
        }
      }
      return set;
    }

    async function refresh() {
      try {
        showError('');
        const snapshot = await fetchSnapshot();
        statAgents.textContent = String(snapshot.server.registered_agents);
        statTraces.textContent = String(snapshot.trace_count);
        const trace = snapshot.active_trace;
        const msgCount = trace ? trace.message_count : 0;
        statMessages.textContent = String(msgCount);

        const activeAgents = activeAgentsFromTrace(trace);
        renderAgents(snapshot.agents, activeAgents);
        renderTraces(snapshot.traces);
        renderGraph(snapshot.agents, snapshot.agent_links || [], activeAgents);

        if (trace && trace.timeline) {
          renderFeed(trace.timeline);
          if (msgCount > lastMessageCount && lastMessageCount > 0) {
            liveBadge.textContent = 'Updated';
            setTimeout(function () {
              if (liveToggle.checked) liveBadge.textContent = 'Live';
            }, 800);
          }
          lastMessageCount = msgCount;
        } else if (!activeTraceId && snapshot.traces.length > 0) {
          activeTraceId = snapshot.traces[0].traceId;
          return refresh();
        } else {
          messageFeed.innerHTML = '<li style="color:var(--muted);">Waiting for messages…</li>';
        }

        liveBadge.textContent = liveToggle.checked ? 'Live' : 'Paused';
        liveBadge.className = 'badge' + (liveToggle.checked ? ' live' : '');
      } catch (error) {
        showError(error.message || String(error));
      }
    }

    function schedulePoll() {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
      if (liveToggle.checked) {
        const ms = Number.parseInt(pollInterval.value, 10) || 1500;
        pollTimer = setInterval(refresh, ms);
      }
    }

    liveToggle.addEventListener('change', function () {
      schedulePoll();
      refresh();
    });
    pollInterval.addEventListener('change', schedulePoll);
    refreshBtn.addEventListener('click', refresh);
    window.addEventListener('resize', function () { refresh(); });

    const params = new URLSearchParams(window.location.search);
    const initialTrace = params.get('trace_id');
    if (initialTrace) activeTraceId = initialTrace;

    refresh();
    schedulePoll();
  </script>
</body>
</html>`;
