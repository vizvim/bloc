package db

import (
	"time"

	"github.com/google/uuid"
)

type Attempt struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	ProblemID   uuid.UUID `json:"problem_id"`
	Status      string    `json:"status"`
	AttemptedAt time.Time `json:"attempted_at"`
}
