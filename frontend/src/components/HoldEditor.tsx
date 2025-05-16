import { useEffect, useState, useRef } from 'react'
import {
  Box,
  VStack,
  HStack,
  Button,
  Text,
} from '@chakra-ui/react'
import { Stage, Layer, Image as KonvaImage, Circle, Line, Group } from 'react-konva'
import type { Point } from '../api/client'

interface Shape {
  points: Point[]
  isClosed: boolean
}

interface HoldEditorProps {
  imageData: string
  initialShapes?: Shape[]
  onSave: (shapes: Shape[]) => void
  onCancel: () => void
}

const HoldEditor = ({ imageData, initialShapes = [], onSave, onCancel }: HoldEditorProps) => {
  const [shapes, setShapes] = useState<Shape[]>(initialShapes)
  const [currentShape, setCurrentShape] = useState<Point[]>([])
  const [selectedShapeIndex, setSelectedShapeIndex] = useState<number | null>(null)
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(null)
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const lastPointerPosition = useRef<Point | null>(null)

  // Add resize observer to handle container width changes
  useEffect(() => {
    if (!containerRef.current || !imageElement) return

    const updateDimensions = () => {
      const containerWidth = containerRef.current?.offsetWidth || 0
      if (containerWidth > 0 && imageElement) {
        const scale = containerWidth / imageElement.width
        setStageSize({
          width: containerWidth,
          height: imageElement.height * scale,
        })
      }
    }

    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(containerRef.current)

    // Initial update
    updateDimensions()

    return () => {
      resizeObserver.disconnect()
    }
  }, [imageElement])

  // Load image
  useEffect(() => {
    const img = new Image()
    img.src = `data:image/jpeg;base64,${imageData}`
    img.onload = () => {
      setImageElement(img)
    }
  }, [imageData])

  // Add keyboard event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' && selectedShapeIndex !== null) {
        // Remove the selected shape
        const newShapes = shapes.filter((_, index) => index !== selectedShapeIndex)
        setShapes(newShapes)
        setSelectedShapeIndex(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shapes, selectedShapeIndex])

  const handleStageClick = (e: any) => {
    // Allow clicks only on the stage background or image
    const targetName = e.target.getClassName()
    if (targetName !== 'Stage' && targetName !== 'Image') {
      return
    }

    const stage = e.target.getStage()
    const position = stage.getPointerPosition()
    if (!position) return

    // Deselect any selected shape when clicking on the stage
    setSelectedShapeIndex(null)
    setSelectedVertexIndex(null)

    // Convert to relative coordinates (0-1)
    const relativePosition = {
      x: position.x / stageSize.width,
      y: position.y / stageSize.height,
    }

    // If we have points in the current shape, check if we're clicking near the first point
    if (currentShape.length > 0) {
      const firstPoint = currentShape[0]
      const distanceToFirst = Math.sqrt(
        Math.pow((firstPoint.x - relativePosition.x) * stageSize.width, 2) +
        Math.pow((firstPoint.y - relativePosition.y) * stageSize.height, 2)
      )

      // If clicking within 10 pixels of the first point and we have at least 2 other points,
      // close the shape
      if (distanceToFirst < 10 && currentShape.length >= 2) {
        setShapes([...shapes, { points: [...currentShape, firstPoint], isClosed: true }])
        setCurrentShape([])
        return
      }
    }

    setCurrentShape([...currentShape, relativePosition])
  }

  const handleShapeClick = (index: number, e: any) => {
    e.cancelBubble = true
    setSelectedShapeIndex(index)
  }

  const handleVertexDragStart = (e: any) => {
    e.cancelBubble = true
  }

  const handleVertexDragMove = (shapeIndex: number, vertexIndex: number, e: any) => {
    e.cancelBubble = true

    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    
    const newPosition = {
      x: pos.x / stageSize.width,
      y: pos.y / stageSize.height,
    }

    const newShapes = [...shapes]
    const shape = { ...newShapes[shapeIndex] }
    const newPoints = [...shape.points]
    newPoints[vertexIndex] = newPosition

    if (shape.isClosed && (vertexIndex === 0 || vertexIndex === newPoints.length - 1)) {
      newPoints[0] = newPosition
      newPoints[newPoints.length - 1] = newPosition
    }

    shape.points = newPoints
    newShapes[shapeIndex] = shape
    setShapes(newShapes)
  }

  const handleVertexDragEnd = (e: any) => {
    e.cancelBubble = true
  }

  const handleVertexClick = (e: any) => {
    e.cancelBubble = true
  }

  const handleShapeDragStart = (e: any) => {
    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    lastPointerPosition.current = {
      x: pos.x / stageSize.width,
      y: pos.y / stageSize.height
    }
  }

  const handleShapeDragMove = (shapeIndex: number, e: any) => {
    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    
    if (!lastPointerPosition.current) return

    const currentPos = {
      x: pos.x / stageSize.width,
      y: pos.y / stageSize.height
    }

    const dx = currentPos.x - lastPointerPosition.current.x
    const dy = currentPos.y - lastPointerPosition.current.y
    
    const newShapes = [...shapes]
    const shape = { ...newShapes[shapeIndex] }
    
    const newPoints = shape.points.map(point => ({
      x: point.x + dx,
      y: point.y + dy
    }))
    
    shape.points = newPoints
    newShapes[shapeIndex] = shape
    setShapes(newShapes)
    
    lastPointerPosition.current = currentPos
    e.target.position({ x: 0, y: 0 })
  }

  const handleShapeDragEnd = () => {
    lastPointerPosition.current = null
  }

  const handleUndo = () => {
    if (currentShape.length > 0) {
      setCurrentShape(currentShape.slice(0, -1))
    } else if (shapes.length > 0) {
      setShapes(shapes.slice(0, -1))
    }
  }

  const handleReset = () => {
    setShapes([])
    setCurrentShape([])
    setSelectedShapeIndex(null)
    setSelectedVertexIndex(null)
  }

  const handleDeleteShape = () => {
    if (selectedShapeIndex !== null) {
      const newShapes = shapes.filter((_, index) => index !== selectedShapeIndex)
      setShapes(newShapes)
      setSelectedShapeIndex(null)
    }
  }

  if (!imageElement) {
    return <Text>Loading...</Text>
  }

  return (
    <VStack spacing={6} align="stretch">
      <Box 
        ref={containerRef} 
        borderRadius="md" 
        overflow="hidden" 
        border="1px" 
        borderColor="theme.gray"
        w="100%"
      >
        <Stage
          width={stageSize.width}
          height={stageSize.height}
          onClick={handleStageClick}
        >
          <Layer>
            <KonvaImage
              image={imageElement}
              width={stageSize.width}
              height={stageSize.height}
            />
            
            {/* Draw completed shapes */}
            {shapes.map((shape, i) => (
              <Group
                key={`shape-${i}`}
                draggable={selectedShapeIndex === i}
                onDragStart={handleShapeDragStart}
                onDragMove={(e) => handleShapeDragMove(i, e)}
                onDragEnd={handleShapeDragEnd}
                onClick={(e) => handleShapeClick(i, e)}
              >
                <Line
                  points={shape.points.flatMap(p => [
                    p.x * stageSize.width,
                    p.y * stageSize.height
                  ])}
                  closed={true}
                  fill={selectedShapeIndex === i ? "rgba(0, 255, 0, 0.3)" : "rgba(0, 255, 0, 0.2)"}
                  stroke={selectedShapeIndex === i ? "blue" : "green"}
                  strokeWidth={selectedShapeIndex === i ? 3 : 2}
                />
                {selectedShapeIndex === i && shape.points.map((point, j) => (
                  <Circle
                    key={`vertex-${j}`}
                    x={point.x * stageSize.width}
                    y={point.y * stageSize.height}
                    radius={6}
                    fill="white"
                    stroke="blue"
                    strokeWidth={2}
                    draggable
                    onDragStart={handleVertexDragStart}
                    onDragMove={(e) => handleVertexDragMove(i, j, e)}
                    onDragEnd={handleVertexDragEnd}
                    onClick={handleVertexClick}
                  />
                ))}
              </Group>
            ))}

            {/* Draw current shape being created */}
            {currentShape.length > 0 && (
              <Line
                points={currentShape.flatMap(p => [
                  p.x * stageSize.width,
                  p.y * stageSize.height
                ])}
                stroke="blue"
                strokeWidth={2}
              />
            )}

            {/* Draw vertices of current shape */}
            {currentShape.map((point, i) => (
              <Circle
                key={`current-${i}`}
                x={point.x * stageSize.width}
                y={point.y * stageSize.height}
                radius={4}
                fill="blue"
              />
            ))}
          </Layer>
        </Stage>
      </Box>

      <HStack spacing={4} justify="space-between">
        <HStack>
          <Button
            onClick={handleUndo}
            isDisabled={currentShape.length === 0 && shapes.length === 0}
            variant="outline"
          >
            Undo
          </Button>
          <Button
            onClick={handleReset}
            isDisabled={currentShape.length === 0 && shapes.length === 0}
            variant="outline"
            colorScheme="red"
          >
            Reset
          </Button>
          <Button
            onClick={handleDeleteShape}
            isDisabled={selectedShapeIndex === null}
            variant="outline"
            colorScheme="red"
          >
            Delete Hold
          </Button>
        </HStack>
        <HStack>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => onSave(shapes)}
            isDisabled={shapes.length === 0}
            colorScheme="blue"
          >
            Save Changes
          </Button>
        </HStack>
      </HStack>
    </VStack>
  )
}

export default HoldEditor 