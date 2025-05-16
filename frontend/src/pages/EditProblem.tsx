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
import { getBoard, getHolds, getProblem, updateProblem, type Board, type Hold, type Problem, type ProblemStatus } from '../api/client'
import BoardImage, { type BoardHold } from '../components/BoardImage'

type HoldType = 'start' | 'hand' | 'foot' | 'finish'

interface UpdateProblemInput {
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

const EditProblem = () => {
  const { boardId, problemId } = useParams<{ boardId: string; problemId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [board, setBoard] = useState<Board | null>(null)
  const [problem, setProblem] = useState<Problem | null>(null)
  const [holds, setHolds] = useState<BoardHold[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!boardId || !problemId) return

    const loadData = async () => {
      try {
        const [boardData, holdsData, problemData] = await Promise.all([
          getBoard(boardId),
          getHolds(boardId),
          getProblem(boardId, problemId)
        ])

        if (problemData.status !== 'DRAFT') {
          const errorMsg = 'Can only edit problems in draft status'
          setError(errorMsg)
          toast({
            title: 'Error',
            description: errorMsg,
            status: 'error',
            duration: 5000,
            isClosable: true,
          })
          navigate(`/board/${boardId}/problem/${problemId}`)
          return
        }

        setBoard(boardData)
        setProblem(problemData)
        setName(problemData.name)

        console.log('Problem Data:', problemData)
        console.log('All Holds:', holdsData)

        const allHolds = holdsData.map(hold => {
          // Find if this hold is used in the problem
          const problemHold = problemData.holds.find(ph => ph.holdID === hold.id || ph.id === hold.id)
          console.log('Checking hold:', hold.id, 'Problem hold found:', problemHold)
          if (problemHold) {
            const updatedHold = { ...hold, type: problemHold.type as HoldType }
            console.log('Updated hold:', updatedHold)
            return updatedHold
          }
          return hold
        })
        console.log('Final mapped holds:', allHolds)
        setHolds(allHolds)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load problem data'
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

    loadData()
  }, [boardId, problemId, toast, navigate])

  const handleHoldClick = (hold: BoardHold) => {
    const startHolds = holds.filter(h => h.type === 'start')
    const updatedHolds = holds.map(h => {
      if (h.id === hold.id) {
        // If hold is already selected, remove its type
        if (h.type) {
          return { ...h, type: undefined }
        }
        // If no type yet, determine the next type
        if (startHolds.length < 2) {
          return { ...h, type: 'start' as const }
        }
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
    if (!boardId || !problemId || !name) {
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
      const problemInput: UpdateProblemInput = {
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

      await updateProblem(boardId, problemId, problemInput)

      toast({
        title: 'Success',
        description: `Problem ${publish ? 'published' : 'saved as draft'}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      })

      navigate(`/board/${boardId}/problem/${problemId}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update problem'
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

  if (error) {
    return <Text color="red.500">{error}</Text>
  }

  if (!board || !problem) {
    return <Text>Loading...</Text>
  }

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        <HStack justify="space-between">
          <Heading size="lg">Edit Problem</Heading>
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
          Click holds to select them. The first two holds will be marked as start holds (green).
          Additional holds will be marked as hand holds (blue). You can click a hold again to
          deselect it.
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

export default EditProblem 