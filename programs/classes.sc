CLASS Amogus
	PUBLIC name: STRING
	PRIVATE susLevel: INTEGER
	PUBLIC PROCEDURE NEW(Name: STRING, SusLevel: INTEGER)
		name <- Name
		susLevel <- SusLevel
	ENDPROCEDURE
	PUBLIC PROCEDURE eject(requiredSusLevel: INTEGER)
		IF susLevel >= requiredSusLevel THEN
			OUTPUT name, " was ejected."
		ELSE
			OUTPUT "Nobody was ejected. (skipped)"
		ENDIF
	ENDPROCEDURE
ENDCLASS
DECLARE amogus: Amogus
amogus <- NEW Amogus("mogus", 42)
CALL amogus.eject(50)
//OUTPUT amogus.susLevel
