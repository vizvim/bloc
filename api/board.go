package api

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/google/uuid"
	"github.com/julienschmidt/httprouter"
	"github.com/rs/zerolog"
	"github.com/vizvim/board/db"
)

type createBoardDatastore interface {
	CreateBoard(ctx context.Context, b *db.Board) error
}

func createBoardHandler(l *zerolog.Logger, datastore createBoardDatastore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger := l.With().Str("requestMethod", r.Method).Str("url", r.URL.String()).Logger()

		var input struct {
			Name  string `json:"name"`
			Image string `json:"image"`
		}

		err := readJSON(w, r, &input)
		if err != nil {
			logger.Error().Err(err).Msg("failed to read JSON")
			errorResponse(w, http.StatusBadRequest, "invalid JSON")

			return
		}

		imageData, err := base64.StdEncoding.DecodeString(input.Image)
		if err != nil {
			logger.Error().Err(err).Msg("failed to decode base64 image data")
			errorResponse(w, http.StatusBadRequest, "invalid base64 image data")

			return
		}

		board := &db.Board{
			Name:  input.Name,
			Image: imageData,
		}

		errs := board.Validate()
		if errs != nil {
			logger.Error().Any("validationErrors", errs).Msg("failed to validate board")
			errorResponse(w, http.StatusBadRequest, "invalid board")

			return
		}

		err = datastore.CreateBoard(r.Context(), board)
		if err != nil {
			logger.Error().Err(err).Msg("failed to create board")
			errorResponse(w, http.StatusInternalServerError, "unable to create board")

			return
		}

		headers := make(http.Header)
		headers.Set("Location", fmt.Sprintf("/v1/board/%d", board.ID))

		err = writeJSON(w, http.StatusCreated, envelope{"board": board}, headers)
		if err != nil {
			logger.Error().Err(err).Msg("failed to write JSON response")
			errorResponse(w, http.StatusInternalServerError, "the server encountered an error while processing your request")

			return
		}
	}
}

type getBoardDatastore interface {
	GetBoard(id uuid.UUID) (db.Board, error)
}

func getBoardHandler(l *zerolog.Logger, datastore getBoardDatastore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger := l.With().Str("requestMethod", r.Method).Str("url", r.URL.String()).Logger()
		params := httprouter.ParamsFromContext(r.Context())
		idStr := params.ByName("board_id")

		id, err := uuid.Parse(idStr)
		if err != nil {
			logger.Error().Err(err).Str("board_id", idStr).Msg("invalid board ID")
			errorResponse(w, http.StatusBadRequest, "invalid board ID")

			return
		}

		board, err := datastore.GetBoard(id)
		if err != nil {
			switch {
			case errors.Is(err, db.ErrBoardNotFound):
				logger.Error().Err(err).Msg("board not found")
				notFoundResponse(w)

				return
			default:
				logger.Error().Err(err).Msg("failed to get board")
				errorResponse(w, http.StatusInternalServerError, "the server encountered an error while processing your request")

				return
			}
		}

		err = writeJSON(w, http.StatusOK, envelope{"board": board}, nil)
		if err != nil {
			logger.Error().Err(err).Msg("failed to write JSON response")
			errorResponse(w, http.StatusInternalServerError, "the server encountered an error while processing your request")

			return
		}
	}
}

type getAllBoardsDatastore interface {
	GetAllBoards(ctx context.Context) ([]db.Board, error)
}

func getAllBoardsHandler(l *zerolog.Logger, datastore getAllBoardsDatastore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger := l.With().Str("requestMethod", r.Method).Str("url", r.URL.String()).Logger()

		boards, err := datastore.GetAllBoards(r.Context())
		if err != nil {
			logger.Error().Err(err).Msg("failed to get all boards")
			errorResponse(w, http.StatusInternalServerError, "the server encountered an error while processing your request")

			return
		}

		err = writeJSON(w, http.StatusOK, envelope{"boards": boards}, nil)
		if err != nil {
			logger.Error().Err(err).Msg("failed to write JSON response")
			errorResponse(w, http.StatusInternalServerError, "the server encountered an error while processing your request")

			return
		}
	}
}

type createHoldsOnBoardDatastore interface {
	CreateHolds(boardID uuid.UUID, holds []*db.Hold) error
}

func createHoldsOnBoardHandler(l *zerolog.Logger, datastore createHoldsOnBoardDatastore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger := l.With().Str("requestMethod", r.Method).Str("url", r.URL.String()).Logger()

		params := httprouter.ParamsFromContext(r.Context())
		idStr := params.ByName("board_id")

		id, err := uuid.Parse(idStr)
		if err != nil {
			logger.Error().Err(err).Str("board_id", idStr).Msg("invalid board ID")
			errorResponse(w, http.StatusBadRequest, "invalid board ID")
			return
		}

		var input struct {
			Holds []struct {
				Vertices []db.Point `json:"vertices"`
			} `json:"holds"`
		}

		err = json.NewDecoder(r.Body).Decode(&input)
		if err != nil {
			logger.Error().Err(err).Msg("failed to read JSON")
			errorResponse(w, http.StatusBadRequest, "invalid JSON")
			return
		}

		var holds []*db.Hold
		for _, h := range input.Holds {
			hold := &db.Hold{
				BoardID:  id,
				Vertices: h.Vertices,
			}

			// Validate the hold
			if errs := hold.Validate(); errs != nil {
				logger.Error().Any("validationErrors", errs).Msg("failed to validate hold")
				errorResponse(w, http.StatusBadRequest, fmt.Sprintf("invalid hold: %v", errs))
				return
			}

			holds = append(holds, hold)
		}

		err = datastore.CreateHolds(id, holds)
		if err != nil {
			switch {
			case errors.Is(err, db.ErrBoardNotFound):
				logger.Error().Err(err).Msg("board not found")
				errorResponse(w, http.StatusNotFound, "board not found")
				return
			default:
				logger.Error().Err(err).Msg("failed to create holds")
				errorResponse(w, http.StatusInternalServerError, "unable to create holds")
				return
			}
		}

		err = writeJSON(w, http.StatusCreated, envelope{"holds": holds}, nil)
		if err != nil {
			logger.Error().Err(err).Msg("failed to write JSON response")
			errorResponse(w, http.StatusInternalServerError, "the server encountered an error while processing your request")
			return
		}
	}
}

type getHoldsOnBoardDatastore interface {
	GetHolds(boardID uuid.UUID) ([]db.Hold, error)
}

func getHoldsOnBoardHandler(l *zerolog.Logger, datastore getHoldsOnBoardDatastore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		logger := l.With().Str("requestMethod", r.Method).Str("url", r.URL.String()).Logger()

		params := httprouter.ParamsFromContext(r.Context())
		idStr := params.ByName("board_id")

		id, err := uuid.Parse(idStr)
		if err != nil {
			logger.Error().Err(err).Str("board_id", idStr).Msg("invalid board ID")
			errorResponse(w, http.StatusBadRequest, "invalid board ID")
			return
		}

		holds, err := datastore.GetHolds(id)
		if err != nil {
			logger.Error().Err(err).Msg("failed to get holds")
			errorResponse(w, http.StatusInternalServerError, "unable to get holds")
			return
		}

		err = writeJSON(w, http.StatusOK, envelope{"holds": holds, "boardID": id}, nil)
		if err != nil {
			logger.Error().Err(err).Msg("failed to write JSON response")
			errorResponse(w, http.StatusInternalServerError, "the server encountered an error while processing your request")
			return
		}
	}
}
