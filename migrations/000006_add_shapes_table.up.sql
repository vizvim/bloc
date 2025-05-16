-- Create shapes table
CREATE TABLE shapes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    is_closed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add index for board_id
CREATE INDEX idx_shapes_board_id ON shapes(board_id);

-- Add shape_id and shape_order to holds table
ALTER TABLE holds
    ADD COLUMN shape_id UUID REFERENCES shapes(id) ON DELETE CASCADE,
    ADD COLUMN shape_order INTEGER;

-- Add index for shape lookups
CREATE INDEX idx_holds_shape_id ON holds(shape_id);

-- Add constraint to ensure points in a shape have unique ordering
ALTER TABLE holds
    ADD CONSTRAINT unique_shape_point_order UNIQUE (shape_id, shape_order); 