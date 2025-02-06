package db

import (
	"time"

	"github.com/google/uuid"
)

type Problem struct {
	ID        uuid.UUID `json:"id"`
	BoardID   uuid.UUID `json:"boardID"`
	Name      string    `json:"name"`
	SetterID  uuid.UUID `json:"setterID"`
	Grade     string    `json:"grade,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

type ProblemHold struct {
	ID        uuid.UUID `json:"id"`
	ProblemID uuid.UUID `json:"problemID"`
	HoldID    uuid.UUID `json:"holdID"`
	Type      string    `json:"type"`
}
