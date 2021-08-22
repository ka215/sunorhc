@echo off
rem UTC-12:00 => Dateline Standard Time
:Set
tzutil /s "Dateline Standard Time"
exit /b
