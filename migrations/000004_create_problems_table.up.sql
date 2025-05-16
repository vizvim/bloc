-- Create the problem status enum type
CREATE TYPE problem_status AS ENUM ('DRAFT', 'PUBLISHED');

CREATE TABLE problems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    setter_id UUID NOT NULL,
    status problem_status NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_problem_board_id ON problems(board_id);
