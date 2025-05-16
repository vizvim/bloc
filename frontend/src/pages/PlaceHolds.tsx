import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  VStack,
  HStack,
  Text,
  useToast,
  Heading,
} from '@chakra-ui/react'
import { Stage, Layer, Image as KonvaImage, Circle, Line, Group } from 'react-konva'
import { getBoard, createHolds } from '../api/client'
import type { Board, Hold } from '../api/client'

interface Point {
  x: number
  y: number
}

interface Shape {
  points: Point[]
  isClosed: boolean
}

const PlaceHolds = () => {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [board, setBoard] = useState<Board | null>(null)
  const [shapes, setShapes] = useState<Shape[]>([])
  const [currentShape, setCurrentShape] = useState<Point[]>([])
  const [selectedShapeIndex, setSelectedShapeIndex] = useState<number | null>(null)
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(null)
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!boardId) return

    const loadBoard = async () => {
      try {
        const boardData = await getBoard(boardId)
        setBoard(boardData)

        // Load the image
        const img = new Image()
        img.src = `data:image/jpeg;base64,${boardData.image}`
        img.onload = () => {
          setImageElement(img)
          if (containerRef.current) {
            const containerWidth = containerRef.current.offsetWidth
            const scale = containerWidth / img.width
            setStageSize({
              width: containerWidth,
              height: img.height * scale,
            })
          }
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load board data',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
    }

    loadBoard()
  }, [boardId, toast])

  const handleStageClick = (e: any) => {
    // Allow clicks only on the stage background or image
    const targetName = e.target.getClassName();
    if (targetName !== 'Stage' && targetName !== 'Image') {
      return;
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

  const handleShapeClick = (index: number) => {
    setSelectedShapeIndex(index)
    setSelectedVertexIndex(null)
  }

  const handleVertexDragMove = (shapeIndex: number, vertexIndex: number, e: any) => {
    const stage = e.target.getStage()
    const position = {
      x: e.target.x() / stageSize.width,
      y: e.target.y() / stageSize.height,
    }

    const newShapes = [...shapes]
    const shape = { ...newShapes[shapeIndex] }
    const newPoints = [...shape.points]
    newPoints[vertexIndex] = position

    // If this is the first or last point (which should be the same for closed shapes)
    // update both to maintain the closed shape
    if (shape.isClosed && (vertexIndex === 0 || vertexIndex === newPoints.length - 1)) {
      newPoints[0] = position
      newPoints[newPoints.length - 1] = position
    }

    shape.points = newPoints
    newShapes[shapeIndex] = shape
    setShapes(newShapes)
  }

  const handleShapeDragMove = (shapeIndex: number, e: any) => {
    const stage = e.target.getStage()
    const group = e.target
    
    const newShapes = [...shapes]
    const shape = { ...newShapes[shapeIndex] }
    
    // Calculate the relative movement
    const newPoints = shape.points.map(point => ({
      x: point.x + group.x() / stageSize.width,
      y: point.y + group.y() / stageSize.height
    }))
    
    shape.points = newPoints
    newShapes[shapeIndex] = shape
    setShapes(newShapes)
    
    // Reset group position to prevent accumulation
    group.position({ x: 0, y: 0 })
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

  const handleSave = async () => {
    if (!boardId || shapes.length === 0) return

    try {
      // Convert shapes to individual hold positions
      const holds = shapes.flatMap(shape => 
        // For each shape, use its vertices as hold positions
        shape.points.map(point => ({
          x: point.x,
          y: point.y,
          type: 'standard'
        }))
      )
      
      await createHolds(boardId, holds)
      toast({
        title: 'Success',
        description: 'Holds saved successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      navigate(`/board/${boardId}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save holds',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="lg" mb={2}>Place Holds</Heading>
          <Text color="theme.gray">
            Click to place points for each hold outline. To complete a shape, click back on its first point.
            Click a shape to select it, then drag vertices to adjust or drag the shape to move it.
            Use Undo to remove points or Reset to start over.
          </Text>
        </Box>

        <Box ref={containerRef} borderRadius="md" overflow="hidden" border="1px" borderColor="theme.gray">
          <Stage
            width={stageSize.width}
            height={stageSize.height}
            onClick={handleStageClick}
          >
            <Layer>
              {imageElement && (
                <KonvaImage
                  image={imageElement}
                  width={stageSize.width}
                  height={stageSize.height}
                />
              )}
              
              {/* Draw completed shapes */}
              {shapes.map((shape, i) => (
                <Group
                  key={`shape-${i}`}
                  draggable={selectedShapeIndex === i}
                  onDragMove={(e) => handleShapeDragMove(i, e)}
                  onClick={() => handleShapeClick(i)}
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
                      key={`vertex-${i}-${j}`}
                      x={point.x * stageSize.width}
                      y={point.y * stageSize.height}
                      radius={6}
                      fill="white"
                      stroke="blue"
                      strokeWidth={2}
                      draggable
                      onDragMove={(e) => handleVertexDragMove(i, j, e)}
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
          </HStack>
          <Button
            onClick={handleSave}
            isDisabled={shapes.length === 0}
            colorScheme="blue"
          >
            Save Holds
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}

export default PlaceHolds 