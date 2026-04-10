/**
 * Runs Vitest (JSON) + generates HTML; runs pytest with pytest-html.
 * Outputs under test-reports/: index.html, vitest-report.html, pytest-report.html
 */
import { execSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'test-reports')

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function vitestJsonToHtml(data) {
  const files = data.testResults || []
  const rows = []
  for (const file of files) {
    const fname = esc(file.name || '')
    rows.push(`<tr><td colspan="4" class="file">${fname}</td></tr>`)
    for (const t of file.assertionResults || []) {
      const st = t.status
      const cls = st === 'passed' ? 'pass' : st === 'failed' ? 'fail' : 'pend'
      rows.push(
        `<tr class="${cls}"><td>${esc(st)}</td><td>${esc((t.ancestorTitles || []).join(' › '))}</td><td>${esc(t.title)}</td><td class="num">${t.duration != null ? `${Math.round(t.duration)}ms` : '—'}</td></tr>`,
      )
      if (t.failureMessages?.length) {
        rows.push(
          `<tr class="fail"><td colspan="4"><pre>${esc(t.failureMessages.join('\n'))}</pre></td></tr>`,
        )
      }
    }
  }

  const summary = {
    passed: data.numPassedTests ?? 0,
    failed: data.numFailedTests ?? 0,
    pending: data.numPendingTests ?? 0,
    total: data.numTotalTests ?? 0,
    ok: data.success === true,
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Vitest report — Logistics CRM</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; color: #0f172a; background: #f8fafc; }
    h1 { font-size: 1.25rem; }
    .meta { color: #64748b; font-size: 0.875rem; margin-bottom: 16px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: 600; font-size: 0.8rem; }
    .badge.ok { background: #d1fae5; color: #065f46; }
    .badge.bad { background: #fee2e2; color: #991b1b; }
    table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 0.875rem; }
    th { background: #f1f5f9; font-weight: 600; }
    tr.pass td:first-child { color: #059669; font-weight: 600; }
    tr.fail td:first-child { color: #dc2626; font-weight: 600; }
    tr.pend td:first-child { color: #d97706; font-weight: 600; }
    td.file { background: #eff6ff; font-weight: 600; color: #1e40af; }
    td.num { white-space: nowrap; color: #64748b; }
    pre { white-space: pre-wrap; margin: 0; font-size: 0.75rem; }
  </style>
</head>
<body>
  <h1>Frontend unit tests (Vitest)</h1>
  <p class="meta">Generated ${esc(new Date().toISOString())}</p>
  <p>
    <span class="badge ${summary.ok ? 'ok' : 'bad'}">${summary.ok ? 'SUCCESS' : 'FAILED'}</span>
    &nbsp; Passed: <strong>${summary.passed}</strong> · Failed: <strong>${summary.failed}</strong> · Skipped/Pending: <strong>${summary.pending}</strong> · Total: <strong>${summary.total}</strong>
  </p>
  <table>
    <thead><tr><th>Status</th><th>Suite</th><th>Test</th><th>Duration</th></tr></thead>
    <tbody>${rows.join('\n')}</tbody>
  </table>
  <p class="meta"><a href="index.html">← Report index</a> · Raw JSON: <a href="vitest-results.json">vitest-results.json</a></p>
</body>
</html>`
}

function writeIndex() {
  const hasPy = existsSync(join(outDir, 'pytest-report.html'))
  const hasVt = existsSync(join(outDir, 'vitest-report.html'))
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Test reports — Logistics CRM</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 560px; margin: 48px auto; padding: 0 20px; color: #0f172a; }
    h1 { font-size: 1.5rem; }
    ul { line-height: 2; padding-left: 1.2rem; }
    a { color: #2563eb; font-weight: 600; }
    p { color: #64748b; font-size: 0.9rem; }
  </style>
</head>
<body>
  <h1>Test reports</h1>
  <p>Generated ${esc(new Date().toISOString())}</p>
  <ul>
    <li>${hasVt ? '<a href="vitest-report.html">Frontend (Vitest)</a>' : '<span>Vitest report missing</span>'}</li>
    <li>${hasPy ? '<a href="pytest-report.html">Backend (pytest)</a>' : '<span>pytest report missing</span>'}</li>
  </ul>
  <p>Open <code>test-reports/index.html</code> in your browser (double-click or drag into Chrome).</p>
</body>
</html>`
  writeFileSync(join(outDir, 'index.html'), html, 'utf8')
}

mkdirSync(outDir, { recursive: true })

console.log('→ Vitest (JSON)…')
execSync('npx vitest run --reporter=json --outputFile=test-reports/vitest-results.json', {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env },
})

const jsonPath = join(outDir, 'vitest-results.json')
const vitestData = JSON.parse(readFileSync(jsonPath, 'utf8'))
writeFileSync(join(outDir, 'vitest-report.html'), vitestJsonToHtml(vitestData), 'utf8')
console.log('→ Wrote test-reports/vitest-report.html')

console.log('→ pytest + pytest-html…')
try {
  execSync('python -m pip install "pytest-html>=4.1" -q', { cwd: join(root, 'backend'), stdio: 'inherit' })
  execSync(
    'python -m pytest --html=../test-reports/pytest-report.html --self-contained-html -v --tb=short',
    {
      cwd: join(root, 'backend'),
      stdio: 'inherit',
      env: {
        ...process.env,
        TESTING: 'true',
      },
    },
  )
  console.log('→ Wrote test-reports/pytest-report.html')
} catch {
  console.warn('⚠ pytest exited non-zero (e.g. failures or no PostgreSQL). HTML may still exist if pytest-html ran.')
}

writeIndex()
console.log('→ Done. Open test-reports/index.html')
