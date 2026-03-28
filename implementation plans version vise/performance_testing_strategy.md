# Production Performance & Stress Testing Strategy

This document outlines the end-to-end strategy for validating the scalability and reliability of the hyperlocal delivery application under production-grade loads (up to 100,000 concurrent users).

## 1. Testing Scenarios & User Flows

We simulate six primary real-world scenarios to ensure all critical paths are performant.

| Scenario | Flow Description | Critical Metrics |
| :--- | :--- | :--- |
| **App Open** | Fetch Categories + Product List | TTFB, Payload Size |
| **Browsing** | Search + Product Details | DB Query Time, Cache Hit Rate |
| **Shopping** | Add/Update/Remove Cart Items | Concurrent Write Performance |
| **Checkout** | Place Order (COD) | Transaction Integrity, Lock Contention |
| **Tracking** | Repeated Status Polls | WebSocket/Poll Efficiency |
| **Cancel** | State Transition (Status Guard) | Logic Validation under Load |

## 2. Load Stages & Tiered Testing

| Stage | Target Loading | Goal |
| :--- | :--- | :--- |
| **Stage 1** | 100 Users | Baseline performance & sanity check |
| **Stage 2** | 1,000 Users | Moderate traffic; identify early bottlenecks |
| **Stage 3** | 5,000 Users | Typical peak load for a growing metro |
| **Stage 4** | 10,000 Users | High-concurrency stress check |
| **Stage 5** | 100,000 Users | **Stress Test**: Identify breaking points & failover |

## 3. Performance Monitoring Architecture

We recommend a three-tiered monitoring stack:

### Prometheus & Grafana (Infrastructure & Metrics)
- **Node Exporter**: Track CPU, RAM, and Disk I/O.
- **PostgreSQL Exporter**: Monitor connection pools, slow queries, and table bloat.
- **Custom NestJS Metrics**: Expose `/metrics` using `@willsoto/nestjs-prometheus`.
- **Grafana Dashboards**: Visualize API Latency (p95/p99), Request Volume, and Error Rates.

### Sentry (Error Tracking & Performance Monitoring)
- **APM**: Enable Sentry Tracing to identify slow middleware or external service calls.
- **Error Grouping**: Automatically group and alert on unhandled exceptions during tests.

## 4. Optimization Recommendations

### Backend (Node.js/NestJS)
- **Cluster Mode**: Utilize the Node.js `cluster` module or PM2 to leverage multi-core CPUs.
- **Async Efficiency**: Audit for accidental serial processing (e.g., `await` in loops); use `Promise.all`.
- **Throttling**: Implement `nest-throttler` to prevent brute-force on sensitive endpoints (OTP/Checkout).

### Database (PostgreSQL)
- **Indexing**: 
  - Ensure B-Tree indexes on `userId`, `productId`, and `martId` in the `orders` table.
  - Gin/Gist indexes for product name search.
- **Connection Pooling**: Use **PgBouncer** to manage thousands of concurrent connections efficiently.
- **Read/Write Splitting**: Implement a replica for heavy read operations (listing products/categories).

### Infrastructure Scaling
- **Load Balancer**: Use Nginx or HAProxy with "Least Connections" algorithm.
- **Auto-scaling**: Configure Kubernetes HPA (Horizontal Pod Autoscaler) based on CPU/Memory usage.
- **CDN**: Serve product images/assets via Cloudfront or Cloudflare to reduce backend load.
- **Caching**: Implement **Redis** for `categories` and trending `products`. Use a "Cache-Aside" pattern.

## 5. Failure Scenario Testing (Chaos Engineering)
During Stage 5, we will simulate:
- **Database Latency**: Artificially inject 500ms delay to PostgreSQL.
- **Worker Crashes**: Kill one NestJS instance during high traffic.
- **Network Congestion**: Throttling bandwidth to simulate mobile edge conditions.

---

## 6. How to Execute Tests

These tools are **CLI-based** and should be installed on the machine performing the tests (e.g., your local computer or a CI/CD server), rather than as a dependency inside the `backend-api` or `mobile-app` folders.

### A. Using k6 (Recommended for Detailed Scenarios)
1. **Install k6**: 
   - Windows: `choco install k6`
   - Mac: `brew install k6`
2. **Run the test**:
   ```bash
   k6 run -e API_URL=https://your-api.com/api/v1 ./performance-tests/k6_load_test.js
   ```

### B. Using Artillery (Fast Arrival Rate Testing)
1. **Install Artillery**:
   ```bash
   npm install -g artillery
   ```
2. **Run the test**:
   ```bash
### C. Using Apache JMeter (Comprehensive UI/UX Simulation & Stress Testing)
JMeter is the industry standard for production-grade load testing. The provided `.jmx` file fully simulates the mobile app's user behavior, handling dynamic tokens, randomized think times, and data parameterization.

1. **Install JMeter**:
   - Download the latest binary from [Apache JMeter](https://jmeter.apache.org/download_jmeter.cgi) and extract it.
   - Run `bin/jmeter.bat` (Windows) or `bin/jmeter` (Mac/Linux).

2. **Run in GUI Mode (For debugging & viewing results)**:
   - Open JMeter.
   - File -> Open -> `./performance-tests/baldia_mart_load_test.jmx`
   - You can view the structure: Thread Groups, HTTP Requests, JSON Extractors, and Assertions.
   - Click the Green "Start" button to run. View results in "View Results Tree" or "Summary Report".

3. **Run in Non-GUI Mode (For actual Load/Stress Testing)**:
   *Never run high-load tests in GUI mode as it consumes too much memory.*
   ```bash
   jmeter -n -t ./performance-tests/baldia_mart_load_test.jmx -l ./performance-tests/results.jtl -Jusers=1000 -Jrampup=60 -Jduration=300 -Jhost=api.yourdomain.com
   ```
   *Parameters:*
   - `-Jusers`: Target concurrent users (e.g., 100, 1000, 10000)
   - `-Jrampup`: Seconds to reach target users (e.g., 60 seconds)
   - `-Jduration`: Total test duration in seconds (e.g., 300)
   - `-Jhost`: Target API host. Defaults to `localhost`.

#### JMeter Test Plan Architecture
- **Thread Group**: Controls concurrency. Configured to accept CLI properties (`${__P(users,100)}`) so you don't have to edit the file to scale up to 100k users.
- **CSV Data Set Config**: Reads from [phone_numbers.csv](file:///d:/mart/baldia-mart/performance-tests/phone_numbers.csv) to dynamically assign a different phone number to each user thread, simulating realistic diverse logins.
- **Transaction Controllers**: Groups requests into logical user flows (App Launch, Browsing, Authentication, Cart, Checkout, Tracking, Cancel).
- **JSON Extractors**: Captures dynamic data (e.g., `accessToken`, `productId`, `cartItemId`, `orderId`) from responses to pass in subsequent requests (Correlation).
- **Uniform Random Timers**: Simulates realistic "Think Time" (1-4 seconds) between user actions.
- **Assertions**: Validates HTTP 200/201 responses to ensure the server isn't just rapidly returning 500 errors under load.

## Testing Scripts
- **k6 Script**: [k6_load_test.js](file:///d:/mart/baldia-mart/performance-tests/k6_load_test.js)
- **Artillery Config**: [artillery_config.yml](file:///d:/mart/baldia-mart/performance-tests/artillery_config.yml)
- **JMeter Test Plan**: [baldia_mart_load_test.jmx](file:///d:/mart/baldia-mart/performance-tests/baldia_mart_load_test.jmx)
- **JMeter CSV Data**: [phone_numbers.csv](file:///d:/mart/baldia-mart/performance-tests/phone_numbers.csv)
