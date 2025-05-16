import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Box,
  Grid,
  Heading,
  Text,
  Button,
  useToast,
  Image,
  VStack,
} from '@chakra-ui/react'
import { getBoard, getHolds, type Board, type Hold } from '../api/client'

const BoardDetail = () => {
  const { boardId } = useParams<{ boardId: string }>()
  const toast = useToast()
  const [board, setBoard] = useState<Board | null>(null)
  const [holds, setHolds] = useState<Hold[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      if (!boardId) return
      try {
        console.log('Fetching board data for ID:', boardId)
        const [boardData, holdsData] = await Promise.all([
          getBoard(boardId),
          getHolds(boardId)
        ])
        console.log('Received board data:', boardData)
        console.log('Received holds data:', holdsData)
        setBoard(boardData)
        setHolds(holdsData)
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
        <Box>
          <Heading mb={4}>{board.name}</Heading>
          <Text color="theme.gray" fontSize="sm">
            Created: {new Date(board.createdAt).toLocaleDateString()}
          </Text>
        </Box>

        {board.image && (
          <Box>
            <Image
              src={`data:image/jpeg;base64,${board.image}`}
              alt={board.name}
              borderRadius="md"
              width="100%"
              maxH="600px"
              objectFit="contain"
            />
          </Box>
        )}

        <Box border="1px" borderColor="theme.gray" p={4} borderRadius="md">
          <Text mb={4} fontWeight="bold">Hold Placements</Text>
          <Grid
            templateColumns="repeat(auto-fit, minmax(40px, 1fr))"
            gap={2}
            width="100%"
          >
            {holds.map((hold, index) => (
              <Button
                key={index}
                size="sm"
                variant="solid"
                colorScheme="blue"
                aspectRatio={1}
                position="relative"
                top={`${hold.y * 100}%`}
                left={`${hold.x * 100}%`}
              />
            ))}
          </Grid>
        </Box>
      </VStack>
    </Box>
  )
}

export default BoardDetail 