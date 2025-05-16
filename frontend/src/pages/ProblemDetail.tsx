import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  Badge,
  useToast,
} from '@chakra-ui/react'
import { Stage, Layer, Image as KonvaImage, Line } from 'react-konva'
import { getBoard, getProblem, type Board, type Problem, type Hold } from '../api/client'

interface ProblemHold extends Hold {
  type: 'start' | 'hand' | 'foot' | 'finish'
}

const ProblemDetail = () => {
  const { boardId, problemId } = useParams<{ boardId: string; problemId: string }>()
  const toast = useToast()
  const [board, setBoard] = useState<Board | null>(null)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!boardId || !problemId) return

    const loadData = async () => {
      try {
        const [boardData, problemData] = await Promise.all([
          getBoard(boardId),
          getProblem(boardId, problemId)
        ])
        setBoard(boardData)
        setProblem(problemData)

        // Load board image
        const img = new Image()
        img.src = `data:image/jpeg;base64,${boardData.image}`
        img.onload = () => {
          setImageElement(img)
          if (containerRef.current) {
            const containerWidth = containerRef.current.offsetWidth
            const scale = containerWidth / img.width
            setStageSize({
              width: containerWidth,
              height: img.height * scale
            })
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load problem data'
        toast({
          title: 'Error',
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
    }

    loadData()
  }, [boardId, problemId, toast])

  const getHoldColor = (hold: ProblemHold) => {
    switch (hold.type) {
      case 'start':
        return 'rgba(0, 255, 0, 0.5)' // Green
      case 'hand':
        return 'rgba(0, 0, 255, 0.5)' // Blue
      case 'foot':
        return 'rgba(255, 255, 0, 0.5)' // Yellow
      case 'finish':
        return 'rgba(255, 0, 0, 0.5)' // Red
      default:
        return 'rgba(200, 200, 200, 0.5)'
    }
  }

  if (!board || !problem || !imageElement) {
    return <Text>Loading...</Text>
  }

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between">
          <Box>
            <Heading size="lg">{problem.name}</Heading>
            <HStack spacing={4} mt={2}>
              <Text color="gray.500">
                Created: {new Date(problem.created_at).toLocaleDateString()}
              </Text>
              <Badge colorScheme={problem.status === 'PUBLISHED' ? 'green' : 'blue'}>
                {problem.status}
              </Badge>
            </HStack>
          </Box>
          <HStack>
            {problem.status === 'DRAFT' && (
              <Link to={`/board/${boardId}/problem/${problemId}/edit`}>
                <Button colorScheme="blue">Edit Problem</Button>
              </Link>
            )}
            <Link to={`/board/${boardId}/problems`}>
              <Button variant="outline">Back to Problems</Button>
            </Link>
          </HStack>
        </HStack>

        <Box ref={containerRef} borderRadius="md" overflow="hidden" border="1px" borderColor="gray.200">
          <Stage width={stageSize.width} height={stageSize.height}>
            <Layer>
              <KonvaImage
                image={imageElement}
                width={stageSize.width}
                height={stageSize.height}
              />
              {problem.holds.map((hold) => (
                <Line
                  key={hold.id}
                  points={hold.vertices.flatMap(v => [
                    v.x * stageSize.width,
                    v.y * stageSize.height
                  ])}
                  closed
                  fill={getHoldColor(hold as ProblemHold)}
                  stroke="rgba(0, 0, 0, 0.3)"
                  strokeWidth={1}
                />
              ))}
            </Layer>
          </Stage>
        </Box>
      </VStack>
    </Box>
  )
}

export default ProblemDetail 