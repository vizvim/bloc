package db

import (
	"time"

	"github.com/google/uuid"
)

type Problem struct {
	ID        uuid.UUID `json:"id"`
	BoardID   uuid.UUID `json:"board_id"`
	Name      string    `json:"name"`
	SetterID  uuid.UUID `json:"setter_id"`
	Grade     string    `json:"grade,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type ProblemHold struct {
	ID        uuid.UUID `json:"id"`
	ProblemID uuid.UUID `json:"problem_id"`
	HoldID    uuid.UUID `json:"hold_id"`
	Type      string    `json:"type"`
}
