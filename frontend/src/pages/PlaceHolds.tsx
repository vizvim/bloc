import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Heading,
  Text,
  useToast,
} from '@chakra-ui/react'
import { getBoard, updateHolds } from '../api/client'
import type { Board, Point } from '../api/client'
import HoldEditor from '../components/HoldEditor'

interface Shape {
  id?: string
  points: Point[]
  isClosed: boolean
}

const PlaceHolds = () => {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const [board, setBoard] = useState<Board | null>(null)

  useEffect(() => {
    if (!boardId) return

    const loadBoard = async () => {
      try {
        const boardData = await getBoard(boardId)
        setBoard(boardData)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load board data'
        toast({
          title: 'Error',
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
    }

    loadBoard()
  }, [boardId, toast])

  const handleSave = async (shapes: Shape[]) => {
    if (!boardId) return

    try {
      // For new holds, we don't need to pass IDs
      const holds = shapes.map(shape => ({
        vertices: shape.points
      }))
      
      await updateHolds(boardId, holds)
      toast({
        title: 'Success',
        description: 'Holds saved successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      navigate(`/board/${boardId}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save holds'
      toast({
        title: 'Error',
        description: errorMessage,
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
      <Heading size="lg" mb={6}>Place Holds - {board.name}</Heading>
      <Text color="theme.gray" mb={4}>
        Click to place points for each hold outline. To complete a shape, click back on its first point.
        Click a shape to select it, then drag vertices to adjust or drag the shape to move it.
        Press Backspace or use the Delete button to remove a selected shape. Click the background to deselect.
        Use Undo to remove points or Reset to start over.
      </Text>

      <HoldEditor
        imageData={board.image}
        onSave={handleSave}
        onCancel={() => navigate(`/board/${boardId}`)}
      />
    </Box>
  )
}

export default PlaceHolds 