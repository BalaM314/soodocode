OUTPUT "Soodocode Runtime"
OUTPUT "by BalaM314"

TYPE pSTRING = ^STRING
TYPE StudentData
	DECLARE name: STRING
	DECLARE grade: CHAR
	DECLARE teacher: pSTRING
ENDTYPE
TYPE StudentList
	DECLARE students: ARRAY[1:100] OF StudentData
ENDTYPE

DECLARE teacher: STRING
teacher <- "Person"
DECLARE studentList: StudentList
studentList.students[2].name <- "Bob"
studentList.students[2].grade <- 'A'
studentList.students[2].teacher <- ^teacher

PROCEDURE PrintGrades(list:StudentList)
	OUTPUT list.students[2].name, " scored ", list.students[2].grade
	list.students[2].teacher^ <- "Mr. " & list.students[2].teacher^
ENDPROCEDURE

OUTPUT "Teacher: ", teacher
CALL PrintGrades(studentList)
OUTPUT "Teacher: ", teacher
