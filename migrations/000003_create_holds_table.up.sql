CREATE TABLE holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    vertices JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_vertices_is_array CHECK (jsonb_typeof(vertices) = 'array')
);

CREATE INDEX idx_board_id ON holds(board_id);
