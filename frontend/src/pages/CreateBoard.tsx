import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Image,
  useToast,
  Text,
} from '@chakra-ui/react'
import { createBoard } from '../api/client'

const CreateBoard = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      setImagePreview(base64String)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imagePreview) {
      toast({
        title: 'Image required',
        description: 'Please upload an image of your climbing board',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    setIsLoading(true)
    try {
      // Remove the data:image/jpeg;base64, prefix from the base64 string
      const base64Image = imagePreview.split(',')[1]
      const board = await createBoard({ 
        name,
        image: base64Image
      })
      toast({
        title: 'Board created.',
        description: 'Your climbing board has been created successfully.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      })
      navigate(`/board/${board.id}/holds`)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create the board. Please try again.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box maxW="container.sm" mx="auto">
      <form onSubmit={handleSubmit}>
        <VStack spacing={6}>
          <FormControl isRequired>
            <FormLabel>Board Name</FormLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter board name"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel>Board Image</FormLabel>
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              ref={fileInputRef}
              display="none"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              width="full"
              colorScheme={imagePreview ? "green" : "gray"}
            >
              {imagePreview ? "Change Image" : "Upload Image"}
            </Button>
            {imagePreview && (
              <Box mt={4} position="relative">
                <Image
                  src={imagePreview}
                  alt="Board preview"
                  maxH="300px"
                  width="100%"
                  objectFit="contain"
                  borderRadius="md"
                />
              </Box>
            )}
          </FormControl>

          <Button
            type="submit"
            colorScheme="blue"
            width="full"
            isLoading={isLoading}
            isDisabled={!name || !imagePreview}
          >
            Create Board
          </Button>
        </VStack>
      </form>
    </Box>
  )
}

export default CreateBoard 