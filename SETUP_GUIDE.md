# Cloud Cost Optimizer - Full Setup Guide

## Architecture Overview

```
Frontend (HTML/JS) → API Gateway → Lambda Function → AWS EC2
        ↓                ↓                ↓
    Displays        Triggers          Fetches &
     Data           Lambda            Deletes
```

## Step 1: Deploy Lambda Function

### 1.1 Create Lambda Function in AWS Console

1. Go to **AWS Lambda** → **Create Function**
2. Name: `CloudCostOptimizer`
3. Runtime: **Python 3.11**
4. IAM Role: Create a role with these permissions:
   - `ec2:DescribeSnapshots`
   - `ec2:DescribeVolumes`
   - `ec2:DeleteSnapshot`

### 1.2 Upload Code

1. Copy the content from `code.txt`
2. Paste into Lambda function code editor
3. Click **Deploy**

### 1.3 Set Environment Variables (Optional)

1. In Lambda, go to **Configuration** → **Environment Variables**
2. Add:
   - `AWS_REGION` = `us-east-1`
   - `DRY_RUN` = `false`

---

## Step 2: Create API Gateway

### 2.1 Create REST API

1. Go to **API Gateway** → **Create API**
2. Choose **REST API** → **Build**
3. Name: `CloudCostOptimizer-API`

### 2.2 Create Resource & Method

1. Click **Resources** → **Create Resource**
2. Resource name: `snapshots`
3. Select resource → **Create Method** → **GET**
4. Integration type: **Lambda Function**
5. Lambda function: `CloudCostOptimizer`

### 2.3 Enable CORS

1. Select the GET method
2. Click **Actions** → **Enable CORS**
3. Click **Deploy CORS**

### 2.4 Deploy API

1. Click **Actions** → **Deploy API**
2. Deployment stage: **prod**
3. Copy the **Invoke URL** (Example: `https://abc123.execute-api.us-east-1.amazonaws.com/prod`)

---

## Step 3: Update Frontend

### 3.1 Update script.js

Replace the API_URL with your actual API Gateway URL:

```javascript
const API_URL =
  "https://abc123.execute-api.us-east-1.amazonaws.com/prod/snapshots";
```

### 3.2 Add Fetch Function

Add this function to call the Lambda via API Gateway:

```javascript
async function fetchOptimizationData(dryRun = true) {
  try {
    loadingOverlay.style.display = "flex";
    errorCard.style.display = "none";

    const url = dryRun ? `${API_URL}?dryRun=true` : API_URL;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = JSON.parse(await response.text());

    if (data.body) {
      const parsedData = JSON.parse(data.body);
      updateDashboard(parsedData);
    } else {
      updateDashboard(data);
    }

    loadingOverlay.style.display = "none";
  } catch (error) {
    console.error("Error:", error);
    showError(`Failed to fetch data: ${error.message}`);
  }
}

function updateDashboard(data) {
  const { summary, purgedItemsDetails } = data;

  // Update summary cards
  totalSnapshotsEl.textContent = summary.totalSnapshotsAnalyzed;
  deletedWasteEl.textContent = summary.deletedWasteCount;
  activeSnapshotsEl.textContent = summary.remainingActiveCount;
  monthlySavingsEl.textContent = `$${summary.estimatedMonthlySavingsUsd}`;
  yearlySavingsEl.textContent = `$${summary.estimatedYearlySavingsUsd}`;

  // Update table
  tableBody.innerHTML = "";
  if (purgedItemsDetails.length === 0) {
    tableEmpty.style.display = "block";
  } else {
    tableEmpty.style.display = "none";
    purgedItemsDetails.forEach((item) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.snapshotId}</td>
        <td>${item.sizeGb} GB</td>
        <td>$${item.monthlyWasteCost}</td>
        <td><span class="badge">${item.status}</span></td>
      `;
      tableBody.appendChild(row);
    });
  }

  lastUpdatedEl.textContent = new Date().toLocaleTimeString();
}

function showError(message) {
  errorMessage.textContent = message;
  errorCard.style.display = "block";
  loadingOverlay.style.display = "none";
}
```

### 3.3 Add Button Listeners

```javascript
refreshBtn.addEventListener("click", () => {
  fetchOptimizationData(true); // Dry-run mode
});

// Or for actual deletion:
deleteBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to delete orphaned snapshots?")) {
    fetchOptimizationData(false); // Actual deletion
  }
});
```

---

## Step 4: Test the Connection

### 4.1 Test with curl (Terminal)

```bash
curl https://abc123.execute-api.us-east-1.amazonaws.com/prod/snapshots?dryRun=true
```

### 4.2 Test from Frontend

1. Open `index.html` in browser
2. Click the Refresh button
3. Check if data loads

### 4.3 Check CloudWatch Logs

1. Go to **CloudWatch** → **Log Groups** → `/aws/lambda/CloudCostOptimizer`
2. View logs to troubleshoot

---

## Environment Variables for GitHub Actions

Add these to GitHub Settings → Secrets and variables → Actions:

```
AWS_ACCESS_KEY_ID = your-access-key
AWS_SECRET_ACCESS_KEY = your-secret-key
AWS_REGION = us-east-1
LAMBDA_FUNCTION_NAME = CloudCostOptimizer
API_GATEWAY_ID = abc123 (from your API URL)
```

---

## Troubleshooting

| Issue            | Solution                                    |
| ---------------- | ------------------------------------------- |
| CORS Error       | Enable CORS on API Gateway method           |
| 403 Forbidden    | Check IAM role permissions on Lambda        |
| 500 Error        | Check CloudWatch logs for Lambda errors     |
| No data returned | Verify EC2 describe permissions in IAM role |
| Timeout          | Increase Lambda timeout to 60 seconds       |

---

## File Structure

```
CloudCostOptimization/
├── code.txt                    (Lambda function code)
├── script.js                   (Frontend JavaScript)
├── index.html                  (Frontend HTML)
├── style.css                   (Frontend styling)
├── .github/workflows/
│   └── awspipeline.yaml       (GitHub Actions CI/CD)
└── SETUP_GUIDE.md             (This file)
```

---

Done! Your system is now ready to optimize AWS costs! 🚀
