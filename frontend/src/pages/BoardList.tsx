import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Box,
  SimpleGrid,
  Heading,
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Image,
  Text,
  VStack,
  useToast,
  HStack,
} from '@chakra-ui/react'
import { getAllBoards, type Board } from '../api/client'

const BoardList = () => {
  const [boards, setBoards] = useState<Board[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  useEffect(() => {
    const fetchBoards = async () => {
      try {
        setIsLoading(true)
        const boards = await getAllBoards()
        setBoards(boards || [])
      } catch (error) {
        console.error('Error fetching boards:', error)
        setError(error instanceof Error ? error.message : 'Failed to load boards')
        toast({
          title: 'Error',
          description: 'Failed to load boards',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchBoards()
  }, [toast])

  if (isLoading) {
    return (
      <Box>
        <Heading mb={6}>Climbing Boards</Heading>
        <Text>Loading...</Text>
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Heading mb={6}>Climbing Boards</Heading>
        <Text color="red.500" mb={4}>Error: {error}</Text>
        <Link to="/board/create">
          <Button colorScheme="blue">Create New Board</Button>
        </Link>
      </Box>
    )
  }

  if (boards.length === 0) {
    return (
      <Box>
        <HStack justify="space-between" mb={6}>
          <Heading>Climbing Boards</Heading>
          <Link to="/board/create">
            <Button colorScheme="blue">Create New Board</Button>
          </Link>
        </HStack>
        <VStack spacing={4} align="center" p={8} borderRadius="md" borderWidth="1px">
          <Text>No climbing boards yet.</Text>
          <Text>Create your first board to get started!</Text>
        </VStack>
      </Box>
    )
  }

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Heading>Climbing Boards</Heading>
        <Link to="/board/create">
          <Button colorScheme="blue">Create New Board</Button>
        </Link>
      </HStack>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
        {boards.map((board) => (
          <Card key={board.id}>
            <CardHeader>
              <Heading size="md">{board.name}</Heading>
            </CardHeader>
            <CardBody>
              {board.image && (
                <Image
                  src={`data:image/jpeg;base64,${board.image}`}
                  alt={board.name}
                  borderRadius="md"
                  width="100%"
                  height="200px"
                  objectFit="cover"
                />
              )}
            </CardBody>
            <CardFooter>
              <Link to={`/board/${board.id}`}>
                <Button colorScheme="blue">View Board</Button>
              </Link>
            </CardFooter>
          </Card>
        ))}
      </SimpleGrid>
    </Box>
  )
}

export default BoardList 