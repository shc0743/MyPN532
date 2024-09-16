@echo off
:a
timeout /t 1 >nul
del /f /s /q %1
if exist %1 goto a
del /f /s /q %0