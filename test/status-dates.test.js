import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"
import vm from "node:vm"
import moment from "moment"

const source = fs.readFileSync(new URL("../plugins/system/status.js", import.meta.url), "utf8")
const body = source.replace(/^import .*$/gm, "").replace("export class status", "class status")
const dates = /:msg:user:1:(.+)$/

for (const [today, expected] of [
  ["2026-11-24T12:00:00", ["2026:11:24", "2026:11:23", "2026:11:22"]],
  ["2026-01-02T12:00:00", ["2026:01:02", "2026:01:01", "2025:12:31"]],
]) {
  test(`default statistics use three different dates from ${today}`, async () => {
    const Status = vm.runInNewContext(`${body}\nstatus`, { plugin: class {}, moment: () => moment(today) })
    const status = new Status()
    const calls = []
    status.redis = async (_, key) => {
      calls.push(key.match(dates)[1])
      return { receive: 0, send: 0 }
    }
    await status.getCount({ 用户: 1 })
    assert.deepEqual(calls.slice(0, 3), expected)
    assert.equal(calls.at(-1), "total")
    calls.length = 0
    await status.getCount({ 用户: 1, 日期: "2025-12-31" })
    assert.deepEqual(calls, ["2025:12:31"])
  })
}
