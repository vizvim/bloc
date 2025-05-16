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
} from '@chakra-ui/react'
import { getAllBoards, type Board } from '../api/client'

const BoardList = () => {
  const [boards, setBoards] = useState<Board[]>([])

  useEffect(() => {
    const fetchBoards = async () => {
      const boards = await getAllBoards()
      setBoards(boards)
    }

    fetchBoards()
  }, [])

  return (
    <Box>
      <Heading mb={6}>Climbing Boards</Heading>
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
                  width="50%"
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