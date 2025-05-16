import { useEffect, useState, useRef } from 'react'
import { Box } from '@chakra-ui/react'
import { Stage, Layer, Image as KonvaImage, Line } from 'react-konva'
import type { Hold } from '../api/client'

export interface BoardHold extends Hold {
  type?: 'start' | 'hand' | 'foot' | 'finish'
  onClick?: () => void
}

interface BoardImageProps {
  imageData: string
  holds: BoardHold[]
  getHoldColor?: (hold: BoardHold) => string
  uiOffset?: number
}

const BoardImage = ({ 
  imageData, 
  holds, 
  getHoldColor = () => 'rgba(0, 255, 0, 0.2)',
  uiOffset = 200 
}: BoardImageProps) => {
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const img = new Image()
    img.src = `data:image/jpeg;base64,${imageData}`
    img.onload = () => {
      setImageElement(img)
      updateDimensions(img)
    }
  }, [imageData])

  useEffect(() => {
    if (!imageElement || !containerRef.current) return

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions(imageElement)
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [imageElement])

  const updateDimensions = (img: HTMLImageElement) => {
    if (!containerRef.current) return

    const containerWidth = containerRef.current.offsetWidth
    const viewportHeight = window.innerHeight - uiOffset

    const scaleByWidth = containerWidth / img.width
    const scaleByHeight = viewportHeight / img.height
    
    const scale = Math.min(scaleByWidth, scaleByHeight)
    
    setStageSize({
      width: img.width * scale,
      height: img.height * scale
    })
  }

  return (
    <Box 
      ref={containerRef}
      display="flex"
      justifyContent="center"
      alignItems="center"
    >
      <Stage width={stageSize.width} height={stageSize.height}>
        <Layer>
          {imageElement && (
            <KonvaImage
              image={imageElement}
              width={stageSize.width}
              height={stageSize.height}
            />
          )}
          {holds.map((hold) => (
            <Line
              key={hold.id}
              points={hold.vertices.flatMap(p => [
                p.x * stageSize.width,
                p.y * stageSize.height
              ])}
              closed
              fill={getHoldColor(hold)}
              stroke="rgba(0, 0, 0, 0.3)"
              strokeWidth={1}
              onClick={hold.onClick}
              onTap={hold.onClick}
            />
          ))}
        </Layer>
      </Stage>
    </Box>
  )
}

export default BoardImage 