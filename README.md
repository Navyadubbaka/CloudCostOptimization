#AWS Cloud Cost Optimization Dashboard

The AWS Cloud Cost Optimization Dashboard is a real-time cloud monitoring and automation project designed to identify and optimize unused AWS resources, particularly orphaned EBS snapshots associated with terminated EC2 instances. The project uses AWS Lambda with Python and boto3 to analyze snapshots, detect stale resources, estimate potential cost savings, and automate cleanup operations. API Gateway is integrated with Lambda to expose live JSON-based cloud analytics through a REST API.

The frontend dashboard is built using HTML, CSS, JavaScript, and Chart.js to visualize cloud infrastructure metrics such as total snapshots, deleted waste resources, active snapshots, and estimated monthly/yearly savings. The dashboard dynamically fetches real-time AWS data through API Gateway and presents it with interactive charts, status indicators, and resource tables, providing a production-inspired cloud cost monitoring solution.
