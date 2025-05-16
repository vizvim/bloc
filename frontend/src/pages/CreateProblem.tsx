import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Heading,
  Text,
  useToast,
  VStack,
  HStack,
  Button,
  Input,
  FormControl,
  FormLabel,
} from '@chakra-ui/react'
import { getBoard, getHolds, createProblem, type Board, type Hold, type ProblemStatus } from '../api/client'
import BoardImage, { type BoardHold } from '../components/BoardImage'

type HoldType = 'start' | 'hand' | 'foot' | 'finish'

interface CreateProblemInput {
  name: string
  board_id: string
  holds: {
    id: string
    type: HoldType
    boardID: string
    vertices: { x: number; y: number }[]
  }[]
  status: ProblemStatus
}

const CreateProblem = () => {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [board, setBoard] = useState<Board | null>(null)
  const [holds, setHolds] = useState<BoardHold[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!boardId) return

    const loadBoardAndHolds = async () => {
      try {
        const [boardData, holdsData] = await Promise.all([
          getBoard(boardId),
          getHolds(boardId)
        ])
        setBoard(boardData)
        setHolds(holdsData.map(hold => ({ ...hold })))
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load board data'
        setError(errorMessage)
        toast({
          title: 'Error',
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
    }

    loadBoardAndHolds()
  }, [boardId, toast])

  const handleHoldClick = (hold: BoardHold) => {
    const selectedHolds = holds.filter(h => h.type)
    const startHolds = selectedHolds.filter(h => h.type === 'start')

    const updatedHolds = holds.map(h => {
      if (h.id === hold.id) {
        // If this hold is already selected, cycle through types
        if (h.type) {
          switch (h.type) {
            case 'start':
              return { ...h, type: 'hand' as const }
            case 'hand':
              return { ...h, type: 'foot' as const }
            case 'foot':
              return { ...h, type: 'finish' as const }
            case 'finish':
              // If we don't have 2 start holds yet, cycle back to start
              if (startHolds.length < 2) {
                return { ...h, type: 'start' as const }
              }
              // Otherwise, unselect the hold
              return { ...h, type: undefined }
            default:
              return { ...h, type: undefined }
          }
        }
        
        // For unselected holds:
        // If we don't have 2 start holds yet, make it a start hold
        if (startHolds.length < 2) {
          return { ...h, type: 'start' as const }
        }
        // Otherwise, make it a hand hold
        return { ...h, type: 'hand' as const }
      }
      return h
    })
    setHolds(updatedHolds)
  }

  const getHoldColor = (hold: BoardHold) => {
    if (!hold.type) return 'rgba(200, 200, 200, 0.5)' // Light grey for unselected
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

  const handleSave = async (publish: boolean) => {
    if (!boardId || !name) {
      toast({
        title: 'Error',
        description: 'Please provide a name for the problem',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    const selectedHolds = holds.filter(h => h.type)
    if (selectedHolds.length < 3) {
      toast({
        title: 'Error',
        description: 'Please select at least 3 holds (including start holds)',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    const startHolds = selectedHolds.filter(h => h.type === 'start')
    if (startHolds.length !== 2) {
      toast({
        title: 'Error',
        description: 'Please select exactly 2 start holds',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    try {
      const problemInput: CreateProblemInput = {
        name,
        board_id: boardId,
        holds: selectedHolds.map(h => ({
          id: h.id,
          type: h.type!,
          boardID: h.boardID,
          vertices: h.vertices
        })),
        status: publish ? 'PUBLISHED' : 'DRAFT'
      }

      const problem = await createProblem(boardId, problemInput)

      toast({
        title: 'Success',
        description: `Problem ${publish ? 'published' : 'saved as draft'}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      navigate(`/board/${boardId}/problem/${problem.id}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save problem'
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  if (error) {
    return <Text color="red.500">{error}</Text>
  }

  if (!board) {
    return <Text>Loading...</Text>
  }

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between">
          <Heading size="lg">Create New Problem</Heading>
          <HStack>
            <Button
              colorScheme="blue"
              variant="outline"
              onClick={() => handleSave(false)}
            >
              Save as Draft
            </Button>
            <Button
              colorScheme="green"
              onClick={() => handleSave(true)}
            >
              Publish
            </Button>
          </HStack>
        </HStack>

        <FormControl>
          <FormLabel>Problem Name</FormLabel>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter problem name"
          />
        </FormControl>

        <Text>
          Click holds to select them. You can select up to two start holds (green) at any time.
          Click a hold multiple times to cycle through: start (green) → hand (blue) → foot (yellow) → finish (red) → start (if less than 2 start holds) or unselected.
        </Text>

        <BoardImage
          imageData={board.image}
          holds={holds.map(hold => ({
            ...hold,
            onClick: () => handleHoldClick(hold)
          }))}
          getHoldColor={getHoldColor}
          uiOffset={300}
        />
      </VStack>
    </Box>
  )
}

export default CreateProblem 