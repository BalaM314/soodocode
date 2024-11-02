
OPENFILE "quine.sc" FOR READ
DECLARE buf: STRING
READFILE "nonexistent.txt", buf
OUTPUT buf
CLOSEFILE "quine.sc"

