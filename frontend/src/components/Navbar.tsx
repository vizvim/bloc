import { Box, Flex, Button } from '@chakra-ui/react'
import { Link } from 'react-router-dom'

const Navbar = () => {
  return (
    <Box bg="tokyoNight.bgDarker" px={4} py={3} borderBottom="1px" borderColor="tokyoNight.gray">
      <Flex maxW="container.xl" mx="auto" align="center" justify="space-between">
        <Link to="/">
          <Button variant="ghost" color="tokyoNight.fg" _hover={{ bg: 'tokyoNight.bgLighter' }}>
            Bloc 
          </Button>
        </Link>
        <Link to="/board/new">
          <Button colorScheme="blue" bg="tokyoNight.accent" _hover={{ bg: 'tokyoNight.accentDarker' }}>
            Create New Board
          </Button>
        </Link>
      </Flex>
    </Box>
  )
}

export default Navbar 