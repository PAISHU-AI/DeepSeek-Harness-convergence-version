import { useEffect, useRef, useState } from 'react'
import css from './ArtifactDetailsPanel.module.css'

export interface ImageCanvasEditorProps {
  mimeType: string
  data: string
  saving: boolean
  onSave: (data: string) => Promise<void>
}

type Tool = 'brush' | 'text'

/** Browser canvas editor that keeps image manipulation local until explicit save. */
export function ImageCanvasEditor({ mimeType, data, saving, onSave }: ImageCanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const [tool, setTool] = useState<Tool>('brush')
  const [color, setColor] = useState('#ef4444')
  const [lineWidth, setLineWidth] = useState(5)
  const [text, setText] = useState('')
  const [ready, setReady] = useState(false)

  const restore = (): void => {
    const canvas = canvasRef.current
    if (canvas === null) return
    const image = new Image()
    image.onload = () => {
      const max = 2200
      const ratio = Math.min(1, max / Math.max(image.naturalWidth, image.naturalHeight))
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio))
      const context = canvas.getContext('2d')
      if (context === null) return
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      setReady(true)
    }
    image.src = `data:${mimeType};base64,${data}`
  }

  useEffect(() => { restore() }, [data, mimeType])

  const point = (event: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return {
      x: (event.clientX - bounds.left) * event.currentTarget.width / bounds.width,
      y: (event.clientY - bounds.top) * event.currentTarget.height / bounds.height,
    }
  }

  const begin = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (canvas === null || context == null || !ready) return
    const at = point(event)
    if (tool === 'text') {
      if (text.trim() !== '') {
        context.fillStyle = color
        context.font = `${Math.max(16, lineWidth * 4)}px sans-serif`
        context.fillText(text, at.x, at.y)
      }
      return
    }
    drawing.current = true
    canvas.setPointerCapture(event.pointerId)
    context.beginPath()
    context.moveTo(at.x, at.y)
    context.strokeStyle = color
    context.lineWidth = lineWidth
    context.lineCap = 'round'
    context.lineJoin = 'round'
  }

  const move = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!drawing.current) return
    const context = canvasRef.current?.getContext('2d')
    if (context === null || context === undefined) return
    const at = point(event)
    context.lineTo(at.x, at.y)
    context.stroke()
  }

  const finish = (): void => { drawing.current = false }
  const save = async (): Promise<void> => {
    const canvas = canvasRef.current
    if (canvas === null) return
    const uri = canvas.toDataURL(mimeType)
    await onSave(uri.slice(uri.indexOf(',') + 1))
  }

  return (
    <section className={css.canvasEditor}>
      <div className={css.canvasToolbar}>
        <button type="button" className={tool === 'brush' ? css.active : undefined} onClick={() => { setTool('brush') }}>画笔</button>
        <button type="button" className={tool === 'text' ? css.active : undefined} onClick={() => { setTool('text') }}>文字</button>
        <label>颜色 <input aria-label="画笔颜色" type="color" value={color} onChange={(event) => { setColor(event.currentTarget.value) }} /></label>
        <label>粗细 <input aria-label="画笔粗细" type="range" min="1" max="32" value={lineWidth} onChange={(event) => { setLineWidth(Number(event.currentTarget.value)) }} /></label>
        {tool === 'text' && <input className={css.canvasText} aria-label="标注文字" value={text} placeholder="输入文字后点击画布" onChange={(event) => { setText(event.currentTarget.value) }} />}
        <button type="button" onClick={restore}>还原</button>
        <button type="button" className={css.save} disabled={!ready || saving} onClick={() => { void save() }}>{saving ? '正在保存…' : '保存图片'}</button>
      </div>
      <canvas
        ref={canvasRef}
        className={css.canvas}
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
    </section>
  )
}
