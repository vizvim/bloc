import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Box,
  Heading,
  Text,
  useToast,
  VStack,
  HStack,
  Button,
} from '@chakra-ui/react'
import { Stage, Layer, Image as KonvaImage, Line } from 'react-konva'
import { getBoard, getHolds, getProblems, type Board, type Hold, type Problem } from '../api/client'
import ProblemList from '../components/ProblemList'

const BoardDetail = () => {
  const { boardId } = useParams<{ boardId: string }>()
  const toast = useToast()
  const [board, setBoard] = useState<Board | null>(null)
  const [holds, setHolds] = useState<Hold[]>([])
  const [problems, setProblems] = useState<Problem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!boardId) return
      try {
        console.log('Fetching board data for ID:', boardId)
        const [boardData, holdsData, problemsData] = await Promise.all([
          getBoard(boardId),
          getHolds(boardId),
          getProblems(boardId)
        ])
        console.log('Received board data:', boardData)
        console.log('Received holds data:', holdsData)
        setBoard(boardData)
        setHolds(holdsData)
        setProblems(problemsData)

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
        console.error('Error fetching data:', error)
        setError(error instanceof Error ? error.message : 'Unknown error')
        toast({
          title: 'Error',
          description: 'Failed to load board data',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
    }
    fetchData()
  }, [boardId, toast])

  if (error) {
    return <Text color="red.500">Error: {error}</Text>
  }

  if (!board) {
    return <Text>Loading...</Text>
  }

  return (
    <Box>
      <VStack align="stretch" spacing={6}>
        <HStack justify="space-between">
          <Box>
            <Heading mb={4}>{board.name}</Heading>
            <Text color="theme.gray" fontSize="sm">
              Created: {new Date(board.createdAt).toLocaleDateString()}
            </Text>
          </Box>
          <HStack>
            <Link to={`/board/${boardId}/edit`}>
              <Button colorScheme="blue" variant="outline">Edit Holds</Button>
            </Link>
          </HStack>
          <HStack>
            <Link to={`/board/${boardId}/problems`}>
              <Button colorScheme="blue" variant="outline">View Problems</Button>
            </Link>
          </HStack>
        </HStack>
        

        <Box ref={containerRef} borderRadius="md" overflow="hidden" border="1px" borderColor="theme.gray">
          <Stage
            width={stageSize.width}
            height={stageSize.height}
          >
            <Layer>
              {imageElement && (
                <KonvaImage
                  image={imageElement}
                  width={stageSize.width}
                  height={stageSize.height}
                />
              )}
              
              {/* Draw all holds */}
              {holds.map((hold, i) => (
                <Line
                  key={`hold-${i}`}
                  points={hold.vertices.flatMap(p => [
                    p.x * stageSize.width,
                    p.y * stageSize.height
                  ])}
                  closed={true}
                  fill="rgba(0, 255, 0, 0.2)"
                  stroke="green"
                  strokeWidth={2}
                />
              ))}
            </Layer>
          </Stage>
        </Box>

        <Box>
          <Heading size="md" mb={4}>Problems</Heading>
          <ProblemList
            boardId={boardId!}
            problems={problems}
            showCreateButton={false}
          />
        </Box>
      </VStack>
    </Box>
  )
}

export default BoardDetail 