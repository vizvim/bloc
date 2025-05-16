import { useEffect, useState, useRef } from 'react'
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
import { Stage, Layer, Image as KonvaImage, Line } from 'react-konva'
import { getBoard, getHolds, getProblem, updateProblem, type Board, type Hold, type Problem, type ProblemStatus } from '../api/client'

type HoldType = 'start' | 'hand' | 'foot' | 'finish'

interface ProblemHold extends Hold {
  type?: HoldType
}

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
  const [holds, setHolds] = useState<ProblemHold[]>([])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

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
          toast({
            title: 'Error',
            description: 'Can only edit problems in draft status',
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

        // Load board image
        const img = new Image()
        img.src = `data:image/jpeg;base64,${boardData.image}`
        img.onload = () => {
          setImageElement(img)
          // Update stage size when image loads
          if (containerRef.current) {
            const containerWidth = containerRef.current.offsetWidth
            const scale = containerWidth / img.width
            setStageSize({
              width: containerWidth,
              height: img.height * scale
            })
          }
        }
      } catch (err) {
        setError('Failed to load problem data')
        toast({
          title: 'Error',
          description: 'Failed to load problem data',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
    }

    loadData()
  }, [boardId, problemId, toast, navigate])

  // Add resize observer to handle window resizing
  useEffect(() => {
    if (!imageElement || !containerRef.current) return

    const updateDimensions = () => {
      const containerWidth = containerRef.current?.offsetWidth || 0
      const scale = containerWidth / imageElement.width
      setStageSize({
        width: containerWidth,
        height: imageElement.height * scale
      })
    }

    const resizeObserver = new ResizeObserver(updateDimensions)
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [imageElement])

  const handleHoldClick = (hold: ProblemHold) => {
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

  const getHoldColor = (hold: ProblemHold) => {
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
      toast({
        title: 'Error',
        description: 'Failed to save problem',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  if (error) {
    return <Text color="red.500">{error}</Text>
  }

  if (!board || !problem || !imageElement) {
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

        <Box ref={containerRef} width="100%" maxW="100%" borderRadius="md" overflow="hidden" border="1px" borderColor="gray.200">
          <Stage width={stageSize.width} height={stageSize.height}>
            <Layer>
              <KonvaImage
                image={imageElement}
                width={stageSize.width}
                height={stageSize.height}
              />
              {holds.map((hold) => (
                <Line
                  key={hold.id}
                  points={hold.vertices.flatMap(v => [
                    v.x * stageSize.width,
                    v.y * stageSize.height
                  ])}
                  closed
                  fill={getHoldColor(hold)}
                  onClick={() => handleHoldClick(hold)}
                  onTap={() => handleHoldClick(hold)}
                />
              ))}
            </Layer>
          </Stage>
        </Box>
      </VStack>
    </Box>
  )
}

export default EditProblem 