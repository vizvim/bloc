CREATE TYPE hold_type AS ENUM ('start', 'hand', 'foot', 'finish');

CREATE TABLE problem_holds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    hold_id UUID NOT NULL REFERENCES holds(id) ON DELETE CASCADE,
    type hold_type NOT NULL
);

CREATE INDEX idx_problem_holds_problem_id ON problem_holds(problem_id);
CREATE INDEX idx_problem_holds_hold_id ON problem_holds(hold_id);