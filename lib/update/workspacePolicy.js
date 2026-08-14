import fs from "node:fs/promises"
import YAML from "yaml"

/**
 * Build permissions required by local runtime plugins.
 *
 * TRSS-Yunzai's updater intentionally restores pnpm-workspace.yaml before a
 * pull. Re-applying this policy after the pull keeps native dependencies
 * buildable without preventing normal upstream updates.
 */
export const persistentWorkspaceBuildPolicy = Object.freeze({
  allowBuilds: Object.freeze({
    "skia-canvas": true,
    protobufjs: false,
  }),
  onlyBuiltDependencies: Object.freeze(["skia-canvas"]),
})

export async function ensurePersistentWorkspaceBuildPolicy(
  workspacePath = "pnpm-workspace.yaml",
) {
  const source = await fs.readFile(workspacePath, "utf8")
  const document = YAML.parseDocument(source)

  if (document.errors.length) throw document.errors[0]
  if (document.contents == null) document.contents = document.createNode({})

  let changed = false
  for (const [dependency, allowed] of Object.entries(
    persistentWorkspaceBuildPolicy.allowBuilds,
  )) {
    if (document.getIn(["allowBuilds", dependency]) !== allowed) {
      document.setIn(["allowBuilds", dependency], allowed)
      changed = true
    }
  }

  const workspace = document.toJS() ?? {}
  const builtDependencies = Array.isArray(workspace.onlyBuiltDependencies)
    ? [...workspace.onlyBuiltDependencies]
    : []
  for (const dependency of persistentWorkspaceBuildPolicy.onlyBuiltDependencies) {
    if (!builtDependencies.includes(dependency)) {
      builtDependencies.push(dependency)
      changed = true
    }
  }
  if (changed) document.set("onlyBuiltDependencies", builtDependencies)

  if (!changed) return false
  await fs.writeFile(workspacePath, String(document), "utf8")
  return true
}
