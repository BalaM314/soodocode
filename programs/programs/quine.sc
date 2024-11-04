
OPENFILE "quine.sc" FOR READ
WHILE NOT EOF("quine.sc")
  DECLARE buf: STRING
  READFILE "quine.sc", buf
  OUTPUT buf
ENDWHILE
CLOSEFILE "quine.sc"

