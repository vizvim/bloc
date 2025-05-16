package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
	"github.com/rs/zerolog"
	"github.com/vizvim/board/db"
)

type createProblemDatastore interface {
	CreateProblem(boardID uuid.UUID, problem *db.Problem, holds []db.ProblemHold) error
	GetBoard(id uuid.UUID) (*db.Board, error)
}

type getProblemsDatastore interface {
	GetProblems(boardID uuid.UUID) ([]db.Problem, error)
	GetBoard(id uuid.UUID) (*db.Board, error)
}

type getProblemDatastore interface {
	GetProblem(boardID, problemID uuid.UUID) (*db.Problem, error)
	GetProblemHolds(problemID uuid.UUID) ([]db.ProblemHold, error)
	GetBoard(id uuid.UUID) (*db.Board, error)
}

type updateProblemDatastore interface {
	UpdateProblem(boardID uuid.UUID, problem *db.Problem, holds []db.ProblemHold) error
	GetBoard(id uuid.UUID) (*db.Board, error)
}

func createProblemHandler(l *zerolog.Logger, datastore createProblemDatastore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger := l.With().Str("handler", "createProblem").Logger()

		params := httprouter.ParamsFromContext(r.Context())
		boardID, err := uuid.Parse(params.ByName("board_id"))
		if err != nil {
			logger.Error().Err(err).Str("board_id", params.ByName("board_id")).Msg("invalid board ID")
			errorResponse(w, http.StatusBadRequest, "invalid board ID")
			return
		}

		// Check if board exists
		_, err = datastore.GetBoard(boardID)
		if err != nil {
			if errors.Is(err, db.ErrBoardNotFound) {
				logger.Error().Err(err).Msg("board not found")
				errorResponse(w, http.StatusNotFound, "board not found")
				return
			}
			logger.Error().Err(err).Msg("failed to get board")
			errorResponse(w, http.StatusInternalServerError, "internal server error")
			return
		}

		var input struct {
			Name   string `json:"name"`
			Status string `json:"status"`
			Holds  []struct {
				ID   uuid.UUID `json:"id"`
				Type string    `json:"type"`
			} `json:"holds"`
		}

		err = json.NewDecoder(r.Body).Decode(&input)
		if err != nil {
			logger.Error().Err(err).Msg("failed to decode request body")
			errorResponse(w, http.StatusBadRequest, "invalid request body")
			return
		}

		// Validate input
		if input.Name == "" {
			errorResponse(w, http.StatusBadRequest, "name is required")
			return
		}

		if input.Status != "DRAFT" && input.Status != "PUBLISHED" {
			errorResponse(w, http.StatusBadRequest, "status must be either DRAFT or PUBLISHED")
			return
		}

		if len(input.Holds) < 3 {
			errorResponse(w, http.StatusBadRequest, "problem must have at least 3 holds")
			return
		}

		// Count start holds
		startHolds := 0
		for _, h := range input.Holds {
			if h.Type == "start" {
				startHolds++
			}
		}
		if startHolds != 2 {
			errorResponse(w, http.StatusBadRequest, "problem must have exactly 2 start holds")
			return
		}

		problem := &db.Problem{
			ID:       uuid.New(),
			BoardID:  boardID,
			Name:     input.Name,
			Status:   db.ProblemStatus(input.Status),
			SetterID: uuid.MustParse("10000000-0000-0000-0000-000000000001"), // TODO: make users eventually
		}

		var problemHolds []db.ProblemHold
		for _, h := range input.Holds {
			problemHold := db.ProblemHold{
				ID:        uuid.New(),
				ProblemID: problem.ID,
				HoldID:    h.ID,
				Type:      db.HoldType(h.Type),
			}
			problemHolds = append(problemHolds, problemHold)
		}

		err = datastore.CreateProblem(boardID, problem, problemHolds)
		if err != nil {
			logger.Error().Err(err).Msg("failed to create problem")
			errorResponse(w, http.StatusInternalServerError, "failed to create problem")
			return
		}

		err = writeJSON(w, http.StatusCreated, envelope{"problem": problem}, nil)
		if err != nil {
			logger.Error().Err(err).Msg("failed to write response")
			return
		}
	}
}

func getProblemsHandler(l *zerolog.Logger, datastore getProblemsDatastore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger := l.With().Str("handler", "getProblems").Logger()

		params := httprouter.ParamsFromContext(r.Context())
		boardID, err := uuid.Parse(params.ByName("board_id"))
		if err != nil {
			logger.Error().Err(err).Str("board_id", params.ByName("board_id")).Msg("invalid board ID")
			errorResponse(w, http.StatusBadRequest, "invalid board ID")
			return
		}

		// Check if board exists
		_, err = datastore.GetBoard(boardID)
		if err != nil {
			if errors.Is(err, db.ErrBoardNotFound) {
				logger.Error().Err(err).Msg("board not found")
				errorResponse(w, http.StatusNotFound, "board not found")
				return
			}
			logger.Error().Err(err).Msg("failed to get board")
			errorResponse(w, http.StatusInternalServerError, "internal server error")
			return
		}

		problems, err := datastore.GetProblems(boardID)
		if err != nil {
			logger.Error().Err(err).Msg("failed to get problems")
			errorResponse(w, http.StatusInternalServerError, "failed to get problems")
			return
		}

		err = writeJSON(w, http.StatusOK, envelope{"problems": problems}, nil)
		if err != nil {
			logger.Error().Err(err).Msg("failed to write response")
			return
		}
	}
}

func getProblemHandler(l *zerolog.Logger, datastore getProblemDatastore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger := l.With().Str("handler", "getProblem").Logger()

		params := httprouter.ParamsFromContext(r.Context())
		boardID, err := uuid.Parse(params.ByName("board_id"))
		if err != nil {
			logger.Error().Err(err).Str("board_id", params.ByName("board_id")).Msg("invalid board ID")
			errorResponse(w, http.StatusBadRequest, "invalid board ID")
			return
		}

		problemID, err := uuid.Parse(params.ByName("problem_id"))
		if err != nil {
			logger.Error().Err(err).Str("problem_id", params.ByName("problem_id")).Msg("invalid problem ID")
			errorResponse(w, http.StatusBadRequest, "invalid problem ID")
			return
		}

		// Check if board exists
		_, err = datastore.GetBoard(boardID)
		if err != nil {
			if errors.Is(err, db.ErrBoardNotFound) {
				logger.Error().Err(err).Msg("board not found")
				errorResponse(w, http.StatusNotFound, "board not found")
				return
			}
			logger.Error().Err(err).Msg("failed to get board")
			errorResponse(w, http.StatusInternalServerError, "internal server error")
			return
		}

		problem, err := datastore.GetProblem(boardID, problemID)
		if err != nil {
			if errors.Is(err, db.ErrProblemNotFound) {
				logger.Error().Err(err).Msg("problem not found")
				errorResponse(w, http.StatusNotFound, "problem not found")
				return
			}
			logger.Error().Err(err).Msg("failed to get problem")
			errorResponse(w, http.StatusInternalServerError, "failed to get problem")
			return
		}

		// Get the holds for this problem
		holds, err := datastore.GetProblemHolds(problemID)
		if err != nil {
			logger.Error().Err(err).Msg("failed to get problem holds")
			errorResponse(w, http.StatusInternalServerError, "failed to get problem holds")
			return
		}

		// Create response with problem and its holds
		response := struct {
			*db.Problem
			Holds []db.ProblemHold `json:"holds"`
		}{
			Problem: problem,
			Holds:   holds,
		}

		err = writeJSON(w, http.StatusOK, envelope{"problem": response}, nil)
		if err != nil {
			logger.Error().Err(err).Msg("failed to write response")
			return
		}
	}
}

func updateProblemHandler(l *zerolog.Logger, datastore updateProblemDatastore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger := l.With().Str("handler", "updateProblem").Logger()

		params := httprouter.ParamsFromContext(r.Context())
		boardID, err := uuid.Parse(params.ByName("board_id"))
		if err != nil {
			logger.Error().Err(err).Str("board_id", params.ByName("board_id")).Msg("invalid board ID")
			errorResponse(w, http.StatusBadRequest, "invalid board ID")
			return
		}

		problemID, err := uuid.Parse(params.ByName("problem_id"))
		if err != nil {
			logger.Error().Err(err).Str("problem_id", params.ByName("problem_id")).Msg("invalid problem ID")
			errorResponse(w, http.StatusBadRequest, "invalid problem ID")
			return
		}

		// Check if board exists
		_, err = datastore.GetBoard(boardID)
		if err != nil {
			if errors.Is(err, db.ErrBoardNotFound) {
				logger.Error().Err(err).Msg("board not found")
				errorResponse(w, http.StatusNotFound, "board not found")
				return
			}
			logger.Error().Err(err).Msg("failed to get board")
			errorResponse(w, http.StatusInternalServerError, "internal server error")
			return
		}

		var input struct {
			Name   string `json:"name"`
			Status string `json:"status"`
			Holds  []struct {
				ID   uuid.UUID `json:"id"`
				Type string    `json:"type"`
			} `json:"holds"`
		}

		err = json.NewDecoder(r.Body).Decode(&input)
		if err != nil {
			logger.Error().Err(err).Msg("failed to decode request body")
			errorResponse(w, http.StatusBadRequest, "invalid request body")
			return
		}

		// Validate input
		if input.Name == "" {
			errorResponse(w, http.StatusBadRequest, "name is required")
			return
		}

		if input.Status != "DRAFT" && input.Status != "PUBLISHED" {
			errorResponse(w, http.StatusBadRequest, "status must be either DRAFT or PUBLISHED")
			return
		}

		if len(input.Holds) < 3 {
			errorResponse(w, http.StatusBadRequest, "problem must have at least 3 holds")
			return
		}

		// Count start holds
		startHolds := 0
		for _, h := range input.Holds {
			if h.Type == "start" {
				startHolds++
			}
		}
		if startHolds != 2 {
			errorResponse(w, http.StatusBadRequest, "problem must have exactly 2 start holds")
			return
		}

		problem := &db.Problem{
			ID:      problemID,
			BoardID: boardID,
			Name:    input.Name,
			Status:  db.ProblemStatus(input.Status),
		}

		var problemHolds []db.ProblemHold
		for _, h := range input.Holds {
			problemHold := db.ProblemHold{
				HoldID: h.ID,
				Type:   db.HoldType(h.Type),
			}
			problemHolds = append(problemHolds, problemHold)
		}

		err = datastore.UpdateProblem(boardID, problem, problemHolds)
		if err != nil {
			if err.Error() == "cannot edit published problem" {
				logger.Error().Err(err).Msg("cannot edit published problem")
				errorResponse(w, http.StatusBadRequest, "cannot edit published problem")
				return
			}
			if errors.Is(err, db.ErrProblemNotFound) {
				logger.Error().Err(err).Msg("problem not found")
				errorResponse(w, http.StatusNotFound, "problem not found")
				return
			}
			logger.Error().Err(err).Msg("failed to update problem")
			errorResponse(w, http.StatusInternalServerError, "failed to update problem")
			return
		}

		err = writeJSON(w, http.StatusOK, envelope{"problem": problem}, nil)
		if err != nil {
			logger.Error().Err(err).Msg("failed to write response")
			return
		}
	}
}
