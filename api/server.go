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
			MaxHeaderBytes:    1 << 20, // 1MB for headers
		},
		shutdownTimeout: 5 * time.Second,
	}

	for _, opt := range opts {
		opt(s)
	}

	router := httprouter.New()

	// Enable OPTIONS handling for CORS preflight requests
	router.GlobalOPTIONS = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Access-Control-Request-Method") != "" {
			// Set CORS headers for preflight requests
			header := w.Header()
			header.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			header.Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, Authorization, X-Requested-With")
			header.Set("Access-Control-Allow-Origin", "*")
			header.Set("Access-Control-Max-Age", "3600")
			header.Set("Access-Control-Allow-Credentials", "true")
		}
		w.WriteHeader(http.StatusNoContent)
	})

	router.HandlerFunc(http.MethodPost, "/v1/board", createBoardHandler(l, db))
	router.HandlerFunc(http.MethodGet, "/v1/boards", getAllBoardsHandler(l, db))
	router.HandlerFunc(http.MethodGet, "/v1/board/:board_id", getBoardHandler(l, db))
	router.HandlerFunc(http.MethodPost, "/v1/board/:board_id/holds", createHoldsOnBoardHandler(l, db))
	router.HandlerFunc(http.MethodGet, "/v1/board/:board_id/holds", getHoldsOnBoardHandler(l, db))
	router.HandlerFunc(http.MethodPatch, "/v1/board/:board_id/holds", updateHoldsOnBoardHandler(l, db))
	router.HandlerFunc(http.MethodPost, "/v1/board/:board_id/problem", createProblemHandler(l, db))
	router.HandlerFunc(http.MethodGet, "/v1/board/:board_id/problems", getProblemsHandler(l, db))
	router.HandlerFunc(http.MethodGet, "/v1/board/:board_id/problem/:problem_id", getProblemHandler(l, db))
	router.HandlerFunc(http.MethodPatch, "/v1/board/:board_id/problem/:problem_id", updateProblemHandler(l, db))
	router.HandlerFunc(http.MethodPost, "/v1/board/:board_id/problem/:problem_id/attempt", createAttemptHandler(l, db))
	router.HandlerFunc(http.MethodGet, "/v1/board/:board_id/problem/:problem_id/attempt", getAttemptHandler(l, db))

	// Wrap the router with CORS middleware and max body size middleware
	handler := enableCORS(maxBodySize(router, 25<<20)) // 25MB limit
	s.httpServer.Handler = handler

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
