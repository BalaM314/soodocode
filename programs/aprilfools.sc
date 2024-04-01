CONSTANT input = "qkfd{ql^yk  maqmthqkd^  ielfxthb  }uui|n  {oqo  ugfd}ok_wm  ieskplsid^  phj`xp  yyui{o  j^pnyunn,,  sihb{qk_rr  ieqmomqkc_  vnzprj  b`sqtjzpnndd  c_rjj^  gal^ssk_uous  yyuivt..  hhb`qovj}u  b`tltpmese  kaskvhoiss''  h`c_~t"
FUNCTION parse(BYREF input: STRING) RETURNS STRING
	WHILE 1 + 2 / 3 * 4 MOD 5 DIV 6 > 420
		OUTPUT "Processing..."
	ENDWHILE
	RETURN (CHR(((((ASC(MID(input, 1, 1)) + ASC(MID(input, 2, 1)))))) DIV 2))
ENDFUNCTION
TYPE NUMBER = ^INTEGER
PROCEDURE run()
	DECLARE x: INTEGER
	DECLARE y: NUMBER
	DECLARE z: INTEGER
	x <- 1
	z <- x
	y <- ^x
	y^ <- y^ + x
	DECLARE output: STRING
	output <- "hello! "
	WHILE z < LENGTH(input)
		output <- output & parse(MID(input, z, 2))
		z <- z + y^
	ENDWHILE
	OUTPUT output
ENDPROCEDURE
CALL run()