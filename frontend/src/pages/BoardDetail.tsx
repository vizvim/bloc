import { useEffect, useState } from 'react'
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
import { getBoard, getHolds, getProblems, type Board, type Hold, type Problem } from '../api/client'
import ProblemList from '../components/ProblemList'
import BoardImage from '../components/BoardImage'

const BoardDetail = () => {
  const { boardId } = useParams<{ boardId: string }>()
  const toast = useToast()
  const [board, setBoard] = useState<Board | null>(null)
  const [holds, setHolds] = useState<Hold[]>([])
  const [problems, setProblems] = useState<Problem[]>([])
  const [error, setError] = useState<string | null>(null)

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
            <Link to={`/board/${boardId}/problem/new`}>
              <Button colorScheme="blue">Create Problem</Button>
          </Link>
          </HStack>
        </HStack>

        <BoardImage
          imageData={board.image}
          holds={holds}
          getHoldColor={() => 'rgba(0, 143, 0, 0.73)'}
        />

        <Box>
          <Heading size="md" mb={4}>Classics
          </Heading>
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