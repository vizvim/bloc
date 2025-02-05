package db

import (
	"time"

	"github.com/google/uuid"
)

type Hold struct {
	ID        uuid.UUID `json:"id"`
	BoardID   uuid.UUID `json:"board_id"`
	X         float64   `json:"x"`
	Y         float64   `json:"y"`
	Angle     int       `json:"angle,omitempty"`
	Color     string    `json:"color,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}
