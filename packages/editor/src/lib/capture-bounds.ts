/**
 * Capture-only sizing for a standalone canvas.
 *
 * A document with only position:absolute frames has a zero-height wrapper.
 * Browser rendering is correct, but rasterizers cannot screenshot a zero-height
 * target. Temporarily give the off-screen wrapper the union extent of rendered
 * descendants without touching the authored nodes, stylesheets, or stored design.
 */
export function sizeCaptureRootToVisibleNodes(root: HTMLElement): void {
  const base = root.getBoundingClientRect()
  let farRight = base.width
  let farBottom = base.height
  for (const node of root.querySelectorAll<HTMLElement>('[data-sheet-node]')) {
    const bounds = node.getBoundingClientRect()
    if (bounds.width < 1 || bounds.height < 1) continue
    if (!Number.isFinite(bounds.right) || !Number.isFinite(bounds.bottom)) continue
    farRight = Math.max(farRight, bounds.right - base.left)
    farBottom = Math.max(farBottom, bounds.bottom - base.top)
  }
  if (farRight > base.width) root.style.minWidth = `${Math.ceil(farRight)}px`
  if (farBottom > base.height) root.style.minHeight = `${Math.ceil(farBottom)}px`
}
