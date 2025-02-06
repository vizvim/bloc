package db

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq" // postgres driver
)

type DB struct {
	*sql.DB
}

func Connect(user string, password string, host string) (*DB, error) {
	db, err := sql.Open("postgres", fmt.Sprintf("postgres://%s:%s@%s/bloc?sslmode=disable", user, password, host))
	// db, err := sql.Open("postgres", "postgres://user:password@localhost/bloc?sslmode=disable")
	if err != nil {
		return nil, fmt.Errorf("error opening database connection: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = db.PingContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("error pinging database: %v", err)
	}

	return &DB{db}, nil
}
