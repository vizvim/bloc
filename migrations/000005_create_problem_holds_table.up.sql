CREATE TABLE problem_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    hold_id UUID NOT NULL REFERENCES holds(id) ON DELETE CASCADE,
    type VARCHAR(10) CHECK (type IN ('start', 'hand', 'foot', 'finish')) NOT NULL
);

CREATE INDEX idx_problem_holds_problem_id ON problem_holds(problem_id);
CREATE INDEX idx_problem_holds_hold_id ON problem_holds(hold_id);