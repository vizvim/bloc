import { useEffect, useState } from 'react'
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
import { getBoard, getProblem, type Board, type Problem } from '../api/client'
import BoardImage, { type BoardHold } from '../components/BoardImage'

const ProblemDetail = () => {
  const { boardId, problemId } = useParams<{ boardId: string; problemId: string }>()
  const toast = useToast()
  const [board, setBoard] = useState<Board | null>(null)
  const [problem, setProblem] = useState<Problem | null>(null)

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

  const getHoldColor = (hold: BoardHold) => {
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

  if (!board || !problem) {
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

        <BoardImage
          imageData={board.image}
          holds={problem.holds as BoardHold[]}
          getHoldColor={getHoldColor}
        />
      </VStack>
    </Box>
  )
}

export default ProblemDetail 