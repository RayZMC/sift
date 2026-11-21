import assert from 'node:assert/strict'
import test from 'node:test'
import { getImportInterval, runImportLoop } from '../services/import-scheduler.js'

test('import interval defaults to 15 minutes and rejects invalid configuration', () => {
  assert.equal(getImportInterval(), 900000)
  assert.equal(getImportInterval('1'), 60000)
  assert.equal(getImportInterval('1440'), 86400000)
  for (const value of ['', '0', '-1', '1.5', 'abc', '1441', 'Infinity']) {
    assert.throws(() => getImportInterval(value), /must be an integer/)
  }
})

test('imports immediately, waits for completion, then waits the configured interval', async () => {
  const controller = new AbortController()
  const events = []
  let finishFirst
  const firstDownload = new Promise(resolve => { finishFirst = resolve })
  let calls = 0
  const running = runImportLoop({
    signal: controller.signal, intervalMs: 900000,
    onError: assert.fail,
    importNews: async () => {
      calls += 1
      events.push(`start ${calls}`)
      if (calls === 1) await firstDownload
      else controller.abort()
      events.push(`finish ${calls}`)
    },
    wait: async (milliseconds) => {
      assert.equal(milliseconds, 900000)
      events.push('wait')
    },
  })
  assert.deepEqual(events, ['start 1'])
  await Promise.resolve()
  assert.equal(calls, 1)
  finishFirst()
  await running
  assert.deepEqual(events, ['start 1', 'finish 1', 'wait', 'start 2', 'finish 2'])
})

test('failed imports are reported and retried after the interval', async () => {
  const controller = new AbortController()
  const errors = []
  let calls = 0
  let waits = 0
  await runImportLoop({
    signal: controller.signal, intervalMs: 60000,
    importNews: async () => {
      calls += 1
      if (calls === 1) throw new Error('Publisher unavailable')
      controller.abort()
    },
    onError: error => errors.push(error.message),
    wait: async () => { waits += 1 },
  })
  assert.equal(calls, 2)
  assert.equal(waits, 1)
  assert.deepEqual(errors, ['Publisher unavailable'])
})

test('stop cancels a pending wait without starting another import', async () => {
  const controller = new AbortController()
  let calls = 0
  await runImportLoop({
    signal: controller.signal, intervalMs: 900000,
    importNews: async () => { calls += 1 },
    onError: assert.fail,
    wait: async (_milliseconds, _value, { signal }) => {
      controller.abort()
      assert.equal(signal.aborted, true)
      throw new DOMException('Stopped', 'AbortError')
    },
  })
  assert.equal(calls, 1)
})

test('stop during an import lets it finish without scheduling another run', async () => {
  const controller = new AbortController()
  let finishImport
  let completed = false
  const running = runImportLoop({
    signal: controller.signal, intervalMs: 900000,
    importNews: async () => {
      await new Promise(resolve => { finishImport = resolve })
      completed = true
    },
    onError: assert.fail,
    wait: async () => assert.fail('Should not schedule another import'),
  })
  controller.abort()
  assert.equal(completed, false)
  finishImport()
  await running
  assert.equal(completed, true)
})
