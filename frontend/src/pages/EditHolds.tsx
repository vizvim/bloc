import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Heading,
  Text,
  useToast,
} from '@chakra-ui/react'
import { getBoard, getHolds, updateHolds } from '../api/client'
import type { Board, Hold, Point } from '../api/client'
import HoldEditor from '../components/HoldEditor'

interface ShapeWithId {
  id?: string
  points: Point[]
  isClosed: boolean
}

const EditHolds = () => {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [board, setBoard] = useState<Board | null>(null)
  const [holds, setHolds] = useState<Hold[]>([])

  useEffect(() => {
    if (!boardId) return

    const loadData = async () => {
      try {
        console.log('Loading board and holds data for boardId:', boardId)
        // Load board and holds data
        const [boardData, holdsData] = await Promise.all([
          getBoard(boardId),
          getHolds(boardId)
        ])
        console.log('Received board data:', boardData)
        console.log('Received holds data:', holdsData)
        setBoard(boardData)
        setHolds(holdsData)
      } catch (error) {
        console.error('Error in loadData:', error)
        toast({
          title: 'Error',
          description: 'Failed to load board data',
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
    }

    loadData()
  }, [boardId, toast])

  const handleSave = async (shapes: ShapeWithId[]) => {
    if (!boardId) return

    try {
      // Map shapes to hold updates, preserving IDs for existing holds
      const holdUpdates = shapes.map((shape, index) => ({
        id: holds[index]?.id, // Preserve ID if it's an existing hold
        vertices: shape.points
      }))
      
      await updateHolds(boardId, holdUpdates)
      toast({
        title: 'Success',
        description: 'Holds saved successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      navigate(`/board/${boardId}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save holds',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  if (!board) {
    return <Text>Loading...</Text>
  }

  return (
    <Box>
      <Heading size="lg" mb={6}>Edit Holds - {board.name}</Heading>
      <Text color="theme.gray" mb={4}>
        Click to place points for each hold outline. To complete a shape, click back on its first point.
        Click a shape to select it, then drag vertices to adjust or drag the shape to move it.
        Press Backspace or use the Delete button to remove a selected shape. Click the background to deselect.
        Use Undo to remove points or Reset to start over.
      </Text>

      <HoldEditor
        imageData={board.image}
        initialShapes={holds.map(hold => ({
          id: hold.id,
          points: hold.vertices,
          isClosed: true
        }))}
        onSave={handleSave}
        onCancel={() => navigate(`/board/${boardId}`)}
      />
    </Box>
  )
}

export default EditHolds 