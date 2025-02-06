package api

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/rs/zerolog"
	"github.com/vizvim/board/db"
)

type Server struct {
	httpServer      *http.Server
	shutdownTimeout time.Duration
	logger          *zerolog.Logger
}

type ServerOption func(*Server)

func WithPort(port string) ServerOption {
	return func(s *Server) {
		s.httpServer.Addr = ":" + port
	}
}

func WithReadTimeout(d time.Duration) ServerOption {
	return func(s *Server) {
		s.httpServer.ReadTimeout = d
	}
}

func WithWriteTimeout(d time.Duration) ServerOption {
	return func(s *Server) {
		s.httpServer.WriteTimeout = d
	}
}

func WithIdleTimeout(d time.Duration) ServerOption {
	return func(s *Server) {
		s.httpServer.IdleTimeout = d
	}
}

func WithHeaderTimeout(d time.Duration) ServerOption {
	return func(s *Server) {
		s.httpServer.ReadHeaderTimeout = d
	}
}

func WithShutdownTimeout(d time.Duration) ServerOption {
	return func(s *Server) {
		s.shutdownTimeout = d
	}
}

func NewServer(l *zerolog.Logger, db *db.DB, opts ...ServerOption) *Server {
	s := &Server{
		logger: l,
		httpServer: &http.Server{
			Addr:              ":8080",
			ReadTimeout:       5 * time.Second,
			WriteTimeout:      10 * time.Second,
			IdleTimeout:       120 * time.Second,
			ReadHeaderTimeout: 2 * time.Second,
		},
		shutdownTimeout: 5 * time.Second,
	}

	for _, opt := range opts {
		opt(s)
	}

	router := httprouter.New()

	router.HandlerFunc(http.MethodPost, "/v1/board", createBoardHandler(l, db))
	router.HandlerFunc(http.MethodGet, "/v1/board/:board_id", getBoardHandler(l, db))
	router.HandlerFunc(http.MethodPost, "/v1/board/:board_id/holds", createHoldsOnBoardHandler(l, db))
	router.HandlerFunc(http.MethodGet, "/v1/board/:board_id/holds", getHoldsOnBoardHandler(l, db))
	router.HandlerFunc(http.MethodPost, "/v1/board/:board_id/problem", createProblemHandler(l, db))
	router.HandlerFunc(http.MethodGet, "/v1/board/:board_id/problem/:problem_id", getProblemHandler(l, db))
	router.HandlerFunc(http.MethodPost, "/v1/board/:board_id/problem/:problem_id/attempt", createAttemptHandler(l, db))
	router.HandlerFunc(http.MethodGet, "/v1/board/:board_id/problem/:problem_id/attempt", getAttemptHandler(l, db))

	s.httpServer.Handler = router

	return s
}

func (s *Server) Start() {
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt)

	go func() {
		s.logger.Info().Str("address", s.httpServer.Addr).Msg("server listening")

		err := s.httpServer.ListenAndServe()
		if err != nil {
			s.logger.Error().Err(err).Msg("server error")
		}
	}()

	<-stop

	s.logger.Info().Msg("shutdown signal received")

	ctx, cancel := context.WithTimeout(context.Background(), s.shutdownTimeout)
	defer cancel()

	err := s.httpServer.Shutdown(ctx)
	if err != nil {
		s.logger.Error().Err(err).Msg("server shutdown error")
	}
}
