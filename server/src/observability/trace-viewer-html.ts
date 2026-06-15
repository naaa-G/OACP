export const TRACE_VIEWER_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OACP Trace Viewer</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #0f1419;
      --panel: #1a2332;
      --border: #2d3a4f;
      --text: #e7ecf3;
      --muted: #8b9cb3;
      --accent: #5b9cf5;
      --success: #3dd68c;
      --error: #f07178;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--border);
      background: var(--panel);
    }
    header h1 { margin: 0; font-size: 1.25rem; }
    header p { margin: 0.25rem 0 0; color: var(--muted); font-size: 0.875rem; }
    main { padding: 1.5rem; max-width: 1200px; margin: 0 auto; }
    .controls {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-bottom: 1.5rem;
    }
    input, button, select {
      font: inherit;
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--panel);
      color: var(--text);
    }
    button {
      cursor: pointer;
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
      font-weight: 600;
    }
    button.secondary { background: transparent; color: var(--text); }
    .grid { display: grid; gap: 1rem; grid-template-columns: 280px 1fr; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    .panel {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    .panel h2 {
      margin: 0;
      padding: 0.75rem 1rem;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--muted);
      border-bottom: 1px solid var(--border);
    }
    .trace-list { list-style: none; margin: 0; padding: 0; max-height: 70vh; overflow: auto; }
    .trace-list li button {
      width: 100%;
      text-align: left;
      border: none;
      border-radius: 0;
      background: transparent;
      color: var(--text);
      font-weight: 400;
      border-bottom: 1px solid var(--border);
    }
    .trace-list li button:hover, .trace-list li button.active {
      background: rgba(91, 156, 245, 0.12);
    }
    .trace-id { font-family: ui-monospace, monospace; font-size: 0.75rem; }
    .meta { font-size: 0.75rem; color: var(--muted); }
    .timeline { padding: 1rem; }
    .event {
      display: grid;
      grid-template-columns: 2rem 1fr;
      gap: 0.75rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid var(--border);
    }
    .event:last-child { border-bottom: none; }
    .event-index { color: var(--muted); font-variant-numeric: tabular-nums; }
    .event-title { font-weight: 600; }
    .event-detail { color: var(--muted); font-size: 0.875rem; font-family: ui-monospace, monospace; }
    .status-success { color: var(--success); }
    .status-error { color: var(--error); }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 0.75rem;
      padding: 1rem;
      border-bottom: 1px solid var(--border);
    }
    .card { background: rgba(255,255,255,0.03); border-radius: 6px; padding: 0.75rem; }
    .card-label { font-size: 0.75rem; color: var(--muted); }
    .card-value { font-size: 1.125rem; font-weight: 700; }
    .error-banner {
      padding: 0.75rem 1rem;
      background: rgba(240, 113, 120, 0.15);
      border: 1px solid var(--error);
      border-radius: 6px;
      margin-bottom: 1rem;
      display: none;
    }
  </style>
</head>
<body>
  <header>
    <h1>OACP Trace Viewer</h1>
    <p>Live message timeline and delegation graph summary for a running reference server.</p>
  </header>
  <main>
    <div id="error" class="error-banner"></div>
    <div class="controls">
      <input id="traceInput" type="text" placeholder="trace_id (UUID)" style="flex:1; min-width: 240px;" />
      <button id="loadBtn" type="button">Load trace</button>
      <button id="refreshBtn" type="button" class="secondary">Refresh list</button>
    </div>
    <div class="grid">
      <section class="panel">
        <h2>Recent traces</h2>
        <ul id="traceList" class="trace-list"></ul>
      </section>
      <section class="panel">
        <h2>Trace detail</h2>
        <div id="detail">
          <p style="padding:1rem;color:var(--muted);">Select a trace or enter a trace_id.</p>
        </div>
      </section>
    </div>
  </main>
  <script>
    const traceInput = document.getElementById('traceInput');
    const loadBtn = document.getElementById('loadBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const traceList = document.getElementById('traceList');
    const detail = document.getElementById('detail');
    const errorBanner = document.getElementById('error');
    let activeTraceId = '';

    function showError(message) {
      errorBanner.textContent = message;
      errorBanner.style.display = message ? 'block' : 'none';
    }

    async function fetchJson(url) {
      const response = await fetch(url);
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error?.message || ('HTTP ' + response.status));
      }
      return body;
    }

    function renderTraceList(traces) {
      traceList.innerHTML = '';
      if (!traces.length) {
        traceList.innerHTML = '<li style="padding:1rem;color:var(--muted);">No traces yet.</li>';
        return;
      }
      for (const trace of traces) {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.className = trace.traceId === activeTraceId ? 'active' : '';
        btn.innerHTML =
          '<div class="trace-id">' + trace.traceId + '</div>' +
          '<div class="meta">' + trace.messageCount + ' msgs · ' + trace.agents.length + ' agents</div>';
        btn.addEventListener('click', () => loadTrace(trace.traceId));
        li.appendChild(btn);
        traceList.appendChild(li);
      }
    }

    function renderDetail(trace) {
      const graph = trace.graph;
      detail.innerHTML =
        '<div class="summary-cards">' +
          '<div class="card"><div class="card-label">Messages</div><div class="card-value">' + trace.message_count + '</div></div>' +
          '<div class="card"><div class="card-label">Agents</div><div class="card-value">' + trace.agents.length + '</div></div>' +
          '<div class="card"><div class="card-label">Types</div><div class="card-value">' + trace.message_types.join(', ') + '</div></div>' +
          (graph ? '<div class="card"><div class="card-label">Graph depth</div><div class="card-value">' + graph.depth + '</div></div>' : '') +
        '</div>' +
        '<div class="timeline">' +
          trace.timeline.map(function (event) {
            const statusClass = event.status === 'success' ? 'status-success' : (event.status === 'error' ? 'status-error' : '');
            return '<article class="event">' +
              '<div class="event-index">' + String(event.index + 1).padStart(2, '0') + '</div>' +
              '<div>' +
                '<div class="event-title ' + statusClass + '">' + event.summary + '</div>' +
                '<div class="event-detail">' + event.timestamp + ' · ' + event.from +
                  (event.to ? ' → ' + event.to : '') +
                  (event.capability ? ' · ' + event.capability : '') +
                '</div>' +
              '</div>' +
            '</article>';
          }).join('') +
        '</div>';
    }

    async function loadTrace(traceId) {
      showError('');
      activeTraceId = traceId;
      traceInput.value = traceId;
      try {
        const body = await fetchJson('/traces/' + encodeURIComponent(traceId));
        renderDetail(body.trace);
        await refreshList();
      } catch (error) {
        showError(error.message || String(error));
      }
    }

    async function refreshList() {
      try {
        const body = await fetchJson('/traces?limit=25');
        renderTraceList(body.traces);
      } catch (error) {
        showError(error.message || String(error));
      }
    }

    loadBtn.addEventListener('click', () => {
      const value = traceInput.value.trim();
      if (value) loadTrace(value);
    });
    refreshBtn.addEventListener('click', refreshList);
    traceInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') loadBtn.click();
    });

    refreshList();
    const params = new URLSearchParams(window.location.search);
    const initial = params.get('trace_id');
    if (initial) loadTrace(initial);
  </script>
</body>
</html>`;
