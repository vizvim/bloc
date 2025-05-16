import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
  useToast,
} from '@chakra-ui/react'
import { getProblem, getAttempts, createAttempt, type Problem, type Attempt } from '../api/client'

const ProblemDetail = () => {
  const { boardId, problemId } = useParams<{ boardId: string; problemId: string }>()
  const toast = useToast()
  const [problem, setProblem] = useState<Problem | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])

  useEffect(() => {
    const fetchData = async () => {
      if (!boardId || !problemId) return
      try {
        const [problemData, attemptsData] = await Promise.all([
          getProblem(boardId, problemId),
          getAttempts(boardId, problemId)
        ])
        setProblem(problemData)
        setAttempts(attemptsData)
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load problem data',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
    }
    fetchData()
  }, [boardId, problemId, toast])

  const handleNewAttempt = async (completed: boolean) => {
    if (!boardId || !problemId) return
    try {
      const newAttempt = await createAttempt(boardId, problemId, {
        completed,
        attempts: 1,
        problem_id: problemId
      })
      setAttempts([...attempts, newAttempt])
      toast({
        title: completed ? 'Success!' : 'Keep trying!',
        description: completed ? 'Problem completed!' : 'Attempt recorded',
        status: completed ? 'success' : 'info',
        duration: 3000,
        isClosable: true,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to record attempt',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  if (!problem) {
    return <Text>Loading...</Text>
  }

  return (
    <Box>
      <VStack align="stretch" spacing={6}>
        <Box>
          <Heading size="lg">{problem.name}</Heading>
          <Text>Grade: {problem.grade}</Text>
        </Box>

        <Box>
          <Heading size="md" mb={4}>Record Attempt</Heading>
          <HStack spacing={4}>
            <Button
              colorScheme="green"
              onClick={() => handleNewAttempt(true)}
            >
              Mark as Complete
            </Button>
            <Button
              colorScheme="yellow"
              onClick={() => handleNewAttempt(false)}
            >
              Record Attempt
            </Button>
          </HStack>
        </Box>

        <Box>
          <Heading size="md" mb={4}>Attempt History</Heading>
          <VStack align="stretch" spacing={2}>
            {attempts.map((attempt, index) => (
              <Box
                key={attempt.id}
                p={4}
                borderWidth={1}
                borderRadius="md"
                borderColor={attempt.completed ? "green.200" : "yellow.200"}
                bg={attempt.completed ? "green.50" : "yellow.50"}
              >
                <Text>
                  Attempt #{attempts.length - index}: {attempt.completed ? "Completed" : "Attempted"}
                </Text>
                <Text fontSize="sm" color="gray.600">
                  {new Date(attempt.created_at).toLocaleDateString()}
                </Text>
              </Box>
            ))}
          </VStack>
        </Box>
      </VStack>
    </Box>
  )
}

export default ProblemDetail 