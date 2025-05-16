package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type ProblemStatus string

const (
	ProblemStatusDraft     ProblemStatus = "DRAFT"
	ProblemStatusPublished ProblemStatus = "PUBLISHED"
)

type HoldType string

const (
	HoldTypeStart  HoldType = "start"
	HoldTypeHand   HoldType = "hand"
	HoldTypeFoot   HoldType = "foot"
	HoldTypeFinish HoldType = "finish"
)

type Problem struct {
	ID        uuid.UUID     `json:"id"`
	BoardID   uuid.UUID     `json:"board_id"`
	Name      string        `json:"name"`
	SetterID  uuid.UUID     `json:"setter_id"`
	Status    ProblemStatus `json:"status"`
	CreatedAt time.Time     `json:"created_at"`
}

type ProblemHold struct {
	ID        uuid.UUID `json:"id"`
	ProblemID uuid.UUID `json:"problemID"`
	HoldID    uuid.UUID `json:"holdID"`
	Type      HoldType  `json:"type"`
	Vertices  []Point   `json:"vertices"`
}

func (d *DB) CreateProblem(boardID uuid.UUID, problem *Problem, holds []ProblemHold) error {
	tx, err := d.Begin()
	if err != nil {
		return fmt.Errorf("error beginning transaction: %v", err)
	}

	defer tx.Rollback() //nolint:errcheck

	// Insert problem
	err = tx.QueryRow(`
		INSERT INTO problems (id, board_id, name, setter_id, status, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		RETURNING created_at
	`, problem.ID, boardID, problem.Name, problem.SetterID, problem.Status).Scan(&problem.CreatedAt)
	if err != nil {
		return fmt.Errorf("error creating problem: %v", err)
	}

	// Insert problem holds
	stmt, err := tx.Prepare(`
		INSERT INTO problem_holds (id, problem_id, hold_id, type)
		VALUES ($1, $2, $3, $4)
	`)
	if err != nil {
		return fmt.Errorf("error preparing statement: %v", err)
	}
	defer stmt.Close()

	for _, hold := range holds {
		_, err = stmt.Exec(hold.ID, problem.ID, hold.HoldID, hold.Type)
		if err != nil {
			return fmt.Errorf("error creating problem hold: %v", err)
		}
	}

	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("error committing transaction: %v", err)
	}

	return nil
}

func (d *DB) GetProblems(boardID uuid.UUID) ([]Problem, error) {
	rows, err := d.Query(`
		SELECT id, board_id, name, status, created_at
		FROM problems
		WHERE board_id = $1
		ORDER BY created_at DESC
	`, boardID)
	if err != nil {
		return nil, fmt.Errorf("error querying problems: %v", err)
	}
	defer rows.Close()

	var problems []Problem

	for rows.Next() {
		var p Problem

		err := rows.Scan(&p.ID, &p.BoardID, &p.Name, &p.Status, &p.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("error scanning problem: %v", err)
		}

		problems = append(problems, p)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating problems: %v", err)
	}

	return problems, nil
}

func (d *DB) GetProblem(boardID, problemID uuid.UUID) (*Problem, error) {
	var p Problem
	err := d.QueryRow(`
		SELECT id, board_id, name, status, created_at
		FROM problems
		WHERE id = $1 AND board_id = $2
	`, problemID, boardID).Scan(&p.ID, &p.BoardID, &p.Name, &p.Status, &p.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, ErrProblemNotFound
	}

	if err != nil {
		return nil, fmt.Errorf("error querying problem: %v", err)
	}

	return &p, nil
}

func (d *DB) GetProblemHolds(problemID uuid.UUID) ([]ProblemHold, error) {
	rows, err := d.Query(`
		SELECT 
			ph.id, 
			ph.problem_id, 
			ph.hold_id, 
			ph.type,
			h.vertices
		FROM problem_holds ph
		JOIN holds h ON h.id = ph.hold_id
		WHERE ph.problem_id = $1
	`, problemID)
	if err != nil {
		return nil, fmt.Errorf("error querying problem holds: %v", err)
	}
	defer rows.Close()

	var holds []ProblemHold

	for rows.Next() {
		var h ProblemHold

		var verticesJSON []byte

		err := rows.Scan(&h.ID, &h.ProblemID, &h.HoldID, &h.Type, &verticesJSON)
		if err != nil {
			return nil, fmt.Errorf("error scanning problem hold: %v", err)
		}

		var vertices []Point

		err = json.Unmarshal(verticesJSON, &vertices)
		if err != nil {
			return nil, fmt.Errorf("error unmarshaling vertices: %v", err)
		}

		h.Vertices = vertices

		holds = append(holds, h)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating problem holds: %v", err)
	}

	return holds, nil
}

func (d *DB) UpdateProblem(boardID uuid.UUID, problem *Problem, holds []ProblemHold) error {
	// Check if problem exists and is in draft status
	var status ProblemStatus
	err := d.QueryRow(`
		SELECT status
		FROM problems
		WHERE id = $1 AND board_id = $2
	`, problem.ID, boardID).Scan(&status)

	if err == sql.ErrNoRows {
		return ErrProblemNotFound
	}

	if err != nil {
		return fmt.Errorf("error querying problem: %v", err)
	}

	if status != ProblemStatusDraft {
		return fmt.Errorf("cannot edit published problem")
	}

	tx, err := d.Begin()
	if err != nil {
		return fmt.Errorf("error beginning transaction: %v", err)
	}

	defer tx.Rollback() //nolint:errcheck

	// Update problem
	_, err = tx.Exec(`
		UPDATE problems
		SET name = $1, status = $2
		WHERE id = $3 AND board_id = $4
	`, problem.Name, problem.Status, problem.ID, boardID)
	if err != nil {
		return fmt.Errorf("error updating problem: %v", err)
	}

	// Delete existing holds
	_, err = tx.Exec(`
		DELETE FROM problem_holds
		WHERE problem_id = $1
	`, problem.ID)
	if err != nil {
		return fmt.Errorf("error deleting existing holds: %v", err)
	}

	// Insert new holds
	stmt, err := tx.Prepare(`
		INSERT INTO problem_holds (id, problem_id, hold_id, type)
		VALUES ($1, $2, $3, $4)
	`)
	if err != nil {
		return fmt.Errorf("error preparing statement: %v", err)
	}
	defer stmt.Close()

	for _, hold := range holds {
		_, err = stmt.Exec(uuid.New(), problem.ID, hold.HoldID, hold.Type)
		if err != nil {
			return fmt.Errorf("error creating problem hold: %v", err)
		}
	}

	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("error committing transaction: %v", err)
	}

	return nil
}
