import { Link } from 'react-router-dom'
import {
  VStack,
  HStack,
  Text,
  Badge,
  Card,
  CardBody,
  Button,
} from '@chakra-ui/react'
import { type Problem } from '../api/client'

interface ProblemListProps {
  boardId: string
  problems: Problem[]
  showCreateButton?: boolean
}

const ProblemList = ({ boardId, problems, showCreateButton = true }: ProblemListProps) => {
  return (
    <VStack spacing={4} align="stretch">
      {showCreateButton && (
        <HStack justify="flex-end">
          <Link to={`/board/${boardId}/problem/new`}>
            <Button colorScheme="blue">Create Problem</Button>
          </Link>
        </HStack>
      )}

      {problems.length === 0 ? (
        <Card>
          <CardBody>
            <Text>No problems created yet.</Text>
          </CardBody>
        </Card>
      ) : (
        problems.map((problem) => (
          <Link key={problem.id} to={`/board/${boardId}/problem/${problem.id}`}>
            <Card
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: 'md',
              }}
              transition="all 0.2s"
            >
              <CardBody>
                <HStack justify="space-between">
                  <VStack align="start" spacing={1}>
                    <Text fontSize="lg" fontWeight="semibold">
                      {problem.name}
                    </Text>
                    <Text color="gray.500" fontSize="sm">
                      Created: {new Date(problem.created_at).toLocaleDateString()}
                    </Text>
                  </VStack>
                  <Badge
                    colorScheme={problem.status === 'PUBLISHED' ? 'green' : 'blue'}
                  >
                    {problem.status}
                  </Badge>
                </HStack>
              </CardBody>
            </Card>
          </Link>
        ))
      )}
    </VStack>
  )
}

export default ProblemList 