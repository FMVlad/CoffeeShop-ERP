@echo off
setlocal enableextensions
cd /d %~dp0
git add -A
git commit -m "FE: arrivals cancel postings, API method, UX tweaks"
git push
endlocal

