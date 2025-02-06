package db

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/vizvim/board/validator"
)

type Hold struct {
	ID        uuid.UUID `json:"id"`
	BoardID   uuid.UUID `json:"boardID"`
	X         float64   `json:"x"`
	Y         float64   `json:"y"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (h Hold) Validate() map[string]string {
	v := validator.New()

	v.Check(h.BoardID != uuid.Nil, "BoardID", "boardID must be provided")
	v.Check(h.X != 0, "X", "X must be provided")
	v.Check(h.Y != 0, "Y", "Y must be provided")

	if v.Valid() {
		return nil
	}

	return v.Errors
}

func (d *DB) CreateHolds(boardID uuid.UUID, holds []*Hold) error {
	var exists bool

	err := d.QueryRow(`SELECT EXISTS(SELECT 1 FROM boards WHERE id = $1)`, boardID).Scan(&exists)
	if err != nil {
		return fmt.Errorf("error checking if board exists: %v", err)
	}

	if !exists {
		return ErrBoardNotFound
	}

	tx, err := d.Begin()
	if err != nil {
		return fmt.Errorf("error beginning transaction: %v", err)
	}

	query := `INSERT INTO holds (board_id, x, y)
		VALUES ($1, $2, $3)
		RETURNING id, created_at, updated_at`

	stmt, err := tx.Prepare(query)
	if err != nil {
		rollbackErr := tx.Rollback()
		if rollbackErr != nil {
			return fmt.Errorf("error rolling back transaction: %v", rollbackErr)
		}

		return fmt.Errorf("error preparing statement: %v", err)
	}

	defer stmt.Close()

	for _, hold := range holds {
		err := stmt.QueryRow(boardID, hold.X, hold.Y).Scan(&hold.ID, &hold.CreatedAt, &hold.UpdatedAt)
		if err != nil {
			rollbackErr := tx.Rollback()
			if rollbackErr != nil {
				return fmt.Errorf("error rolling back transaction: %v", rollbackErr)
			}

			return fmt.Errorf("error executing statement: %v", err)
		}
	}

	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("error committing transaction: %v", err)
	}

	return nil
}

func (d *DB) GetHolds(boardID uuid.UUID) ([]Hold, error) {
	query := `SELECT id, board_id, x, y, created_at, updated_at FROM holds WHERE board_id = $1`

	rows, err := d.Query(query, boardID)
	if err != nil {
		return nil, fmt.Errorf("error querying holds: %v", err)
	}
	defer rows.Close()

	var holds []Hold

	for rows.Next() {
		var hold Hold

		err := rows.Scan(&hold.ID, &hold.BoardID, &hold.X, &hold.Y, &hold.CreatedAt, &hold.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("error scanning hold: %v", err)
		}

		holds = append(holds, hold)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %v", err)
	}

	return holds, nil
}
