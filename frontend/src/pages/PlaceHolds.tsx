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
import type { Board, Hold, Point } from '../api/client'

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
  const lastPointerPosition = useRef<Point | null>(null)

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

  // Add keyboard event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' && selectedShapeIndex !== null) {
        // Remove the selected shape
        const newShapes = shapes.filter((_, index) => index !== selectedShapeIndex);
        setShapes(newShapes);
        setSelectedShapeIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shapes, selectedShapeIndex]);

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

  const handleShapeClick = (index: number, e: any) => {
    // Stop event from bubbling up to stage
    e.cancelBubble = true;
    setSelectedShapeIndex(index);
  }

  const handleVertexDragStart = (e: any) => {
    // Stop event from bubbling up to the shape group
    e.cancelBubble = true;
  }

  const handleVertexDragMove = (shapeIndex: number, vertexIndex: number, e: any) => {
    // Stop event from bubbling up to the shape group
    e.cancelBubble = true;

    // Get absolute position from the event
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    // Convert to relative coordinates
    const newPosition = {
      x: pos.x / stageSize.width,
      y: pos.y / stageSize.height,
    }

    const newShapes = [...shapes];
    const shape = { ...newShapes[shapeIndex] };
    const newPoints = [...shape.points];
    newPoints[vertexIndex] = newPosition;

    // If this is the first or last point (which should be the same for closed shapes)
    // update both to maintain the closed shape
    if (shape.isClosed && (vertexIndex === 0 || vertexIndex === newPoints.length - 1)) {
      newPoints[0] = newPosition;
      newPoints[newPoints.length - 1] = newPosition;
    }

    shape.points = newPoints;
    newShapes[shapeIndex] = shape;
    setShapes(newShapes);
  }

  const handleVertexDragEnd = (e: any) => {
    // Stop event from bubbling up to the shape group
    e.cancelBubble = true;
  }

  const handleVertexClick = (e: any) => {
    // Stop event from bubbling up to the shape group
    e.cancelBubble = true;
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

    // Calculate the actual movement delta
    const dx = currentPos.x - lastPointerPosition.current.x
    const dy = currentPos.y - lastPointerPosition.current.y
    
    const newShapes = [...shapes]
    const shape = { ...newShapes[shapeIndex] }
    
    // Move all points by the drag delta
    const newPoints = shape.points.map(point => ({
      x: point.x + dx,
      y: point.y + dy
    }))
    
    shape.points = newPoints
    newShapes[shapeIndex] = shape
    setShapes(newShapes)
    
    // Update the last position
    lastPointerPosition.current = currentPos

    // Keep the group at origin
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

  const handleSave = async () => {
    if (!boardId || shapes.length === 0) return

    try {
      // Convert shapes to holds with vertices
      const holds = shapes.map(shape => ({
        vertices: shape.points
      }))
      
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

  const handleDeleteShape = () => {
    if (selectedShapeIndex !== null) {
      const newShapes = shapes.filter((_, index) => index !== selectedShapeIndex);
      setShapes(newShapes);
      setSelectedShapeIndex(null);
    }
  };

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="lg" mb={2}>Place Holds</Heading>
          <Text color="theme.gray">
            Click to place points for each hold outline. To complete a shape, click back on its first point.
            Click a shape to select it, then drag vertices to adjust or drag the shape to move it.
            Press Backspace or use the Delete button to remove a selected shape. Click the background to deselect.
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
                  {/* Show vertices only for selected shape */}
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