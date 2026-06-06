# Cloud Cost Optimizer

Automated AWS cost optimization dashboard that identifies and removes orphaned EBS snapshots.

## Tech Stack

- **Backend:** Python, AWS Lambda, EC2, API Gateway
- **Frontend:** HTML, CSS, JavaScript, Chart.js

## Quick Start

1. Deploy `code.txt` to AWS Lambda (Python 3.11)
2. Create API Gateway trigger
3. Update `script.js` with your API URL
4. Open `index.html` in browser

## Features

- 🔍 Detect orphaned EBS snapshots
- 📊 Calculate monthly/yearly savings
- 🚀 Automated cleanup
- 💻 Real-time dashboard
- 🔐 Dry-run mode for testing

## File Structure

```
├── code.txt              (Lambda function)
├── index.html            (Frontend)
├── script.js             (API integration)
├── style.css             (Styling)
└── SETUP_GUIDE.md        (Detailed setup)
```

## Setup

See [SETUP_GUIDE.md](SETUP_GUIDE.md) for complete deployment instructions.
