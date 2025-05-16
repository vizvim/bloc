-- Remove constraint and indexes
ALTER TABLE holds DROP CONSTRAINT IF EXISTS unique_shape_point_order;
DROP INDEX IF EXISTS idx_holds_shape_id;

-- Remove shape columns from holds
ALTER TABLE holds 
    DROP COLUMN IF EXISTS shape_id,
    DROP COLUMN IF EXISTS shape_order;

-- Remove shapes table and its index
DROP INDEX IF EXISTS idx_shapes_board_id;
DROP TABLE IF EXISTS shapes; 