import { Box } from '@chakra-ui/react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChakraProvider } from '@chakra-ui/react'
import theme from './theme'
import Navbar from './components/Navbar'
import BoardList from './pages/BoardList'
import BoardDetail from './pages/BoardDetail'
import CreateBoard from './pages/CreateBoard'
import PlaceHolds from './pages/PlaceHolds'
import ProblemDetail from './pages/ProblemDetail'
import EditHolds from './pages/EditHolds'
import CreateProblem from './pages/CreateProblem'
import ProblemList from './pages/ProblemList'
import EditProblem from './pages/EditProblem'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={theme}>
        <Router>
          <Box minH="100vh">
            <Navbar />
            <Box p={4} maxW="container.xl" mx="auto">
              <Routes>
                <Route path="/" element={<BoardList />} />
                <Route path="/board/new" element={<CreateBoard />} />
                <Route path="/board/:boardId" element={<BoardDetail />} />
                <Route path="/board/:boardId/holds" element={<PlaceHolds />} />
                <Route path="/board/:boardId/edit" element={<EditHolds />} />
                <Route path="/board/:boardId/problems" element={<ProblemList />} />
                <Route path="/board/:boardId/problem/new" element={<CreateProblem />} />
                <Route path="/board/:boardId/problem/:problemId" element={<ProblemDetail />} />
                <Route path="/board/:boardId/problem/:problemId/edit" element={<EditProblem />} />
              </Routes>
            </Box>
          </Box>
        </Router>
      </ChakraProvider>
    </QueryClientProvider>
  )
}

export default App
