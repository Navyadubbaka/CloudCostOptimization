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

1. Open the Lambda function code editor
2. Paste your Lambda function code
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

### 3.1 Update `script.js`

Update the frontend integration to use your API Gateway URL and ensure the fetch logic points to the Lambda endpoint.

### 3.2 Frontend Behavior

Configure the frontend controls so that refresh and delete actions call the API Gateway endpoint, handle responses, and display results on the dashboard.

### 3.3 Button Listeners

Ensure your refresh and delete buttons are wired to the frontend logic and that user actions trigger the correct API requests.

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

---

## Deployment Notes

This project does not rely on CloudWatch or GitHub workflow automation. Deploy the Lambda function manually using the AWS Console and connect the API Gateway from the setup steps above.

---

## Troubleshooting

| Issue            | Solution                                       |
| ---------------- | ---------------------------------------------- |
| CORS Error       | Enable CORS on API Gateway method              |
| 403 Forbidden    | Check IAM role permissions on Lambda           |
| 500 Error        | Review Lambda execution details in AWS Console |
| No data returned | Verify EC2 describe permissions in IAM role    |
| Timeout          | Increase Lambda timeout to 60 seconds          |

---

## File Structure

```
CloudCostOptimization/
├── code.txt (Lambda function code)
├── script.js (Frontend JavaScript)
├── index.html (Frontend HTML)
├── style.css (Frontend styling)
└── SETUP_GUIDE.md (This file)
```

---

Done! Your system is now ready to optimize AWS costs! 🚀
