import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Box,
  VStack,
  Text,
  Heading,
  useToast,
} from '@chakra-ui/react'
import { getBoard, getProblems, type Board, type Problem } from '../api/client'
import ProblemList from '../components/ProblemList'

const ProblemListPage = () => {
  const { boardId } = useParams<{ boardId: string }>()
  const toast = useToast()
  const [board, setBoard] = useState<Board | null>(null)
  const [problems, setProblems] = useState<Problem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadBoardAndProblems = async () => {
      if (!boardId) return

      try {
        setIsLoading(true)
        const [boardData, problemsData] = await Promise.all([
          getBoard(boardId),
          getProblems(boardId)
        ])
        setBoard(boardData)
        setProblems(problemsData)
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to load problems',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadBoardAndProblems()
  }, [boardId, toast])

  if (isLoading) {
    return <Text>Loading...</Text>
  }

  if (!board) {
    return <Text>Board not found</Text>
  }

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        <Box>
          <Heading size="lg">{board.name}</Heading>
          <Text color="gray.500">Problems</Text>
        </Box>

        <ProblemList
          boardId={boardId!}
          problems={problems}
        />
      </VStack>
    </Box>
  )
}

export default ProblemListPage 