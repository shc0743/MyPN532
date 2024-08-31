@set /p v=<version.txt
@set /a v=%v%+1
@echo %v% >version.txt
