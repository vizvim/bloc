package main

import (
	"log"
	"os"
	"time"

	"github.com/rs/zerolog"
	"github.com/vizvim/bloc/backend/api"
	"github.com/vizvim/bloc/backend/db"
)

func main() {
	logger := initializeLogger()

	db, err := db.Connect("user", "password", "localhost")
	if err != nil {
		log.Fatalf("error connecting to database: %v", err)
	}

	server := api.NewServer(
		&logger,
		db,
		api.WithPort("8080"),
		api.WithReadTimeout(6*time.Second),
		api.WithWriteTimeout(12*time.Second),
		api.WithIdleTimeout(100*time.Second),
		api.WithHeaderTimeout(3*time.Second),
		api.WithShutdownTimeout(6*time.Second),
	)

	server.Start()
}

func initializeLogger() zerolog.Logger {
	logger := zerolog.New(os.Stderr).
		With().
		Timestamp().
		Logger()

		// if os.Getenv("ENVIRONMENT") == "local" {
	logger = logger.Output(zerolog.ConsoleWriter{
		Out:        os.Stdout,
		TimeFormat: time.RFC3339,
	})
	// }

	return logger
}
