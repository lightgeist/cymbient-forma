import { describe, expect, it } from 'vitest'
import { sizeCaptureRootToVisibleNodes } from './capture-bounds'

const bounds = (left: number, top: number, width: number, height: number) =>
  ({ left, top, right: left + width, bottom: top + height, width, height } as DOMRect)

describe('capture root sizing', () => {
  it('includes out-of-flow absolute frames in image export bounds', () => {
    const root = document.createElement('div')
    const frame = document.createElement('div')
    frame.setAttribute('data-sheet-node', 'frame-a')
    root.append(frame)
    root.getBoundingClientRect = () => bounds(0, 0, 1440, 0)
    frame.getBoundingClientRect = () => bounds(80, 80, 1440, 1024)
    sizeCaptureRootToVisibleNodes(root)
    expect(root.style.minWidth).toBe('1520px')
    expect(root.style.minHeight).toBe('1104px')
  })
  it('preserves naturally sized document bounds', () => {
    const root = document.createElement('div')
    const node = document.createElement('div')
    node.setAttribute('data-sheet-node', 'label')
    root.append(node)
    root.getBoundingClientRect = () => bounds(0, 0, 1440, 900)
    node.getBoundingClientRect = () => bounds(30, 45, 220, 60)
    sizeCaptureRootToVisibleNodes(root)
    expect(root.style.minWidth).toBe('')
    expect(root.style.minHeight).toBe('')
  })
  it('ignores hidden or non-finite elements', () => {
    const root = document.createElement('div')
    const node = document.createElement('div')
    node.setAttribute('data-sheet-node', 'hidden')
    root.append(node)
    root.getBoundingClientRect = () => bounds(0, 0, 800, 500)
    node.getBoundingClientRect = () => bounds(0, 0, 0, 5000)
    sizeCaptureRootToVisibleNodes(root)
    expect(root.style.minHeight).toBe('')
  })
})
