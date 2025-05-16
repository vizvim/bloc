import axios, { AxiosError } from 'axios'

const API_BASE_URL = 'http://localhost:8080/v1'

export interface Board {
  id: string
  name: string
  image: string
  createdAt: string
  updatedAt: string
  version: number
}

export interface Point {
  x: number
  y: number
}

export interface Hold {
  id: string
  boardID: string
  vertices: Point[]
  createdAt?: string
  updatedAt?: string
}

export interface Problem {
  id: string
  board_id: string
  name: string
  grade: string
  holds: Hold[]
  created_at: string
}

export interface Attempt {
  id: string
  problem_id: string
  completed: boolean
  attempts: number
  created_at: string
}

interface BoardsResponse {
  boards: Board[]
}

interface BoardResponse {
  board: Board
}

interface HoldsResponse {
  holds: Hold[]
}

interface ProblemResponse {
  problem: Problem
}

interface AttemptsResponse {
  attempts: Attempt[]
}

interface AttemptResponse {
  attempt: Attempt
}

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data,
    })
    return response
  },
  (error: AxiosError) => {
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
    })
    return Promise.reject(error)
  }
)

export const createBoard = async (data: { name: string; image: string }) => {
  const response = await api.post<BoardResponse>('/board', data)
  return response.data.board
}

export const getBoard = async (boardId: string) => {
  try {
    const response = await api.get<BoardResponse>(`/board/${boardId}`)
    if (!response.data.board) {
      throw new Error('Board data is missing from response')
    }
    return response.data.board
  } catch (error) {
    console.error('Error fetching board:', error)
    throw error
  }
}

export const createHolds = async (boardId: string, holds: Omit<Hold, 'id' | 'boardID'>[]) => {
  const response = await api.post<HoldsResponse>(`/board/${boardId}/holds`, { holds })
  return response.data.holds
}

export const getHolds = async (boardId: string) => {
  const response = await api.get<HoldsResponse>(`/board/${boardId}/holds`)
  return response.data.holds || []
}

export const createProblem = async (boardId: string, data: Omit<Problem, 'id' | 'created_at'>) => {
  const response = await api.post<ProblemResponse>(`/board/${boardId}/problem`, data)
  return response.data.problem
}

export const getProblem = async (boardId: string, problemId: string) => {
  const response = await api.get<ProblemResponse>(`/board/${boardId}/problem/${problemId}`)
  return response.data.problem
}

export const createAttempt = async (boardId: string, problemId: string, data: Omit<Attempt, 'id' | 'created_at'>) => {
  const response = await api.post<AttemptResponse>(`/board/${boardId}/problem/${problemId}/attempt`, data)
  return response.data.attempt
}

export const getAttempts = async (boardId: string, problemId: string) => {
  const response = await api.get<AttemptsResponse>(`/board/${boardId}/problem/${problemId}/attempt`)
  return response.data.attempts
}

export const getAllBoards = async () => {
  const response = await api.get<BoardsResponse>('/boards')
  return response.data.boards
}
