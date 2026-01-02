# Code Archaeologist CLI - Complete Guide

## Overview
The Code Archaeologist CLI provides automated repository analysis through the command line.

## Installation
No installation required - the script is ready to use.

## Commands

### analyze
Analyze a repository for archaeological insights.

```bash
./scripts/cline-automation/excavate analyze <path> [maxFiles]
Arguments:

path - Repository path (default: current directory)
maxFiles - Maximum files to analyze (default: 5)
Examples:

Bash

# Analyze current directory
./scripts/cline-automation/excavate analyze .

# Analyze specific repo with 10 files
./scripts/cline-automation/excavate analyze ~/projects/myrepo 10
help
Show help information.

Bash

./scripts/cline-automation/excavate help
Environment Variables
Variable	Default	Description
API_URL	http://localhost:3001	Backend API URL
Requirements
Backend server running on port 3001
Valid repository path
curl installed
Troubleshooting
"Failed" error
Ensure backend is running: cd backend && pnpm run start
Check API health: curl http://localhost:3001/health
Connection refused
Start the backend server first
Check if port 3001 is available
Integration with CI/CD
YAML

# GitHub Actions example
- name: Run Code Archaeology
  run: |
    ./scripts/cline-automation/excavate analyze . 5
