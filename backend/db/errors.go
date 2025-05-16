package db

import "errors"

var (
	ErrBoardNotFound   = errors.New("board not found")
	ErrProblemNotFound = errors.New("problem not found")
)
