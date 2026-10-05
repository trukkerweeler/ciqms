# Child Jobs with Closed Parents

The `/closed-parent-child-jobs.html` report finds child jobs whose parent job
has the same `JOB` number and suffix `000`, with the parent marked closed.

The report uses a self-join of `JOB_HEADER`:

- Child: `JOB_HEADER` with `SUFFIX <> '000'` and no populated `DATE_CLOSED`
- Parent: `JOB_HEADER` with the same `JOB` and `SUFFIX = '000'`
- Parent status: `DATE_CLOSED` is populated and is not a zero-date placeholder

The report displays child and parent identifiers, parts, closure dates, and
child quantity information so jobs with remaining demand can be investigated.
