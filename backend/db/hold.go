package db

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/vizvim/bloc/backend/validator"
)

type Point struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type Hold struct {
	ID        uuid.UUID `json:"id"`
	BoardID   uuid.UUID `json:"boardID"`
	Vertices  []Point   `json:"vertices"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (h Hold) Validate() map[string]string {
	v := validator.New()

	v.Check(h.BoardID != uuid.Nil, "BoardID", "boardID must be provided")
	v.Check(len(h.Vertices) >= 3, "Vertices", "hold must have at least 3 vertices")

	// Validate all vertices coordinates
	for i, vertex := range h.Vertices {
		v.Check(vertex.X >= 0 && vertex.X <= 1, fmt.Sprintf("Vertices[%d].X", i), "vertex X must be between 0 and 1")
		v.Check(vertex.Y >= 0 && vertex.Y <= 1, fmt.Sprintf("Vertices[%d].Y", i), "vertex Y must be between 0 and 1")
	}

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

	stmt, err := tx.Prepare(`
		INSERT INTO holds (board_id, vertices)
		VALUES ($1, $2)
		RETURNING id, created_at, updated_at
	`)
	if err != nil {
		rollbackErr := tx.Rollback()
		if rollbackErr != nil {
			return fmt.Errorf("error rolling back transaction: %v", rollbackErr)
		}

		return fmt.Errorf("error preparing statement: %v", err)
	}

	defer stmt.Close()

	for _, hold := range holds {
		// Convert vertices to JSON before storing
		verticesJSON, err := json.Marshal(hold.Vertices)
		if err != nil {
			rollbackErr := tx.Rollback()
			if rollbackErr != nil {
				return fmt.Errorf("error rolling back transaction: %v", rollbackErr)
			}

			return fmt.Errorf("error marshaling vertices: %v", err)
		}

		err = stmt.QueryRow(
			boardID,
			verticesJSON,
		).Scan(&hold.ID, &hold.CreatedAt, &hold.UpdatedAt)
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
	query := `SELECT id, board_id, vertices, created_at, updated_at FROM holds WHERE board_id = $1 ORDER BY created_at`

	rows, err := d.Query(query, boardID)
	if err != nil {
		return nil, fmt.Errorf("error querying holds: %v", err)
	}
	defer rows.Close()

	var holds []Hold

	for rows.Next() {
		var hold Hold

		var verticesJSON []byte

		err := rows.Scan(&hold.ID, &hold.BoardID, &verticesJSON, &hold.CreatedAt, &hold.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("error scanning hold: %v", err)
		}

		// Parse vertices from JSON
		err = json.Unmarshal(verticesJSON, &hold.Vertices)
		if err != nil {
			return nil, fmt.Errorf("error unmarshaling vertices: %v", err)
		}

		holds = append(holds, hold)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating rows: %v", err)
	}

	return holds, nil
}

func (d *DB) DeleteHold(holdID uuid.UUID) error {
	_, err := d.Exec(`DELETE FROM holds WHERE id = $1`, holdID)
	return fmt.Errorf("error deleting hold: %v", err)
}

func (d *DB) UpdateHolds(boardID uuid.UUID, holds []*Hold) error {
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

	// Prepare statements for both update and insert operations
	updateStmt, err := tx.Prepare(`
		UPDATE holds 
		SET vertices = $1, updated_at = NOW()
		WHERE id = $2 AND board_id = $3
		RETURNING id, created_at, updated_at
	`)
	if err != nil {
		rollbackErr := tx.Rollback()
		if rollbackErr != nil {
			return fmt.Errorf("error rolling back transaction: %v", rollbackErr)
		}

		return fmt.Errorf("error preparing update statement: %v", err)
	}
	defer updateStmt.Close()

	insertStmt, err := tx.Prepare(`
		INSERT INTO holds (board_id, vertices)
		VALUES ($1, $2)
		RETURNING id, created_at, updated_at
	`)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			return fmt.Errorf("error rolling back transaction: %v", rollbackErr)
		}

		return fmt.Errorf("error preparing insert statement: %v", err)
	}
	defer insertStmt.Close()

	for _, hold := range holds {
		// Convert vertices to JSON before storing
		verticesJSON, err := json.Marshal(hold.Vertices)
		if err != nil {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				return fmt.Errorf("error rolling back transaction: %v: %v", rollbackErr, err)
			}

			return fmt.Errorf("error marshaling vertices: %v", err)
		}

		if hold.ID != uuid.Nil {
			// Update existing hold
			err = updateStmt.QueryRow(
				verticesJSON,
				hold.ID,
				boardID,
			).Scan(&hold.ID, &hold.CreatedAt, &hold.UpdatedAt)
			if err != nil {
				if rollbackErr := tx.Rollback(); rollbackErr != nil {
					return fmt.Errorf("error rolling back transaction: %v: %v", rollbackErr, err)
				}

				return fmt.Errorf("error updating hold: %v", err)
			}
		} else {
			// Create new hold
			err = insertStmt.QueryRow(
				boardID,
				verticesJSON,
			).Scan(&hold.ID, &hold.CreatedAt, &hold.UpdatedAt)
			if err != nil {
				if rollbackErr := tx.Rollback(); rollbackErr != nil {
					return fmt.Errorf("error rolling back transaction: %v: %v", rollbackErr, err)
				}

				return fmt.Errorf("error creating hold: %v", err)
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("error committing transaction: %v", err)
	}

	return nil
}
