# APIdog Setup Guide for Wasel API

## Quick Start

### Step 1: Download and Install APIdog

1. Visit [APIdog Download Page](https://apidog.com/download)
2. Choose your operating system:
   - **Windows**: Download `.exe` installer
   - **Mac**: Download `.dmg` installer
   - **Linux**: Download `.AppImage` or package for your distro
3. Run the installer and follow on-screen instructions

### Step 2: Import Wasel API

#### Option A: Import OpenAPI Specification (Recommended)

1. **Launch APIdog**
2. Click **"Import"** in the dashboard
3. Select **"Import from File"** → Choose **`openapi.yaml`**
4. APIdog automatically:
   - Creates all endpoint folders
   - Populates request schemas
   - Generates response examples
   - Sets up authentication flows

#### Option B: Import Postman Collection

1. **Launch APIdog**
2. Click **"Import"** in the dashboard
3. Select **"Postman"** → Choose **`apidog-collection.json`**
4. Select environment and click **"Import"**

### Step 3: Configure Environment

1. Click **"Environment"** in the top menu
2. Select **"Development"** (or create new)
3. Set **Base URL**: `http://localhost:3000`
4. Add any additional **Headers** if needed:
   - `Content-Type: application/json`
   - `Accept: application/json`

### Step 4: Run First Request

1. Navigate to **Auth** → **Register**
2. Verify request body is populated
3. Click **"Send"** button
4. View response in the right panel

---

## Configuration Details

### Environment Variables

Add these to your APIdog environment:

```
base_url: http://localhost:3000  (Development)
          http://api.wasel.local  (Staging)
          https://api.wasel.ps    (Production)

token: [Captured from login response]
incident_id: [Captured from create incident response]
subscription_id: [Captured from subscription response]
```

### Authentication Setup

1. Go to **Auth** tab in request editor
2. Select **Type**: **"Bearer Token"**
3. Set **Token**: Click {{token}} to use variable
4. APIdog will automatically:
   - Extract token from login response
   - Apply to all protected endpoints

### Variable Management

#### Automatic Variable Capture

APIdog automatically captures variables using Tests section:

```javascript
// After Login response:
pm.collectionVariables.set("token", jsonData.token);

// After Create Incident response:
pm.collectionVariables.set("incident_id", jsonData.data.id);
```

#### Manual Variable Setting

1. Click **"Variables"** tab
2. Add variable name and default value
3. Use {{variable_name}} in requests

---

## Testing in APIdog

### Running Individual Requests

1. Select endpoint
2. Fill in required parameters
3. Click **"Send"**
4. View response, headers, cookies

### Running Test Collections

1. Right-click on collection folder (e.g., "Incidents")
2. Select **"Run Tests"**
3. Choose environment
4. Click **"Run"**
5. View results:
   - ✅ Passed tests (green)
   - ❌ Failed tests (red)
   - ⏭️ Skipped tests (gray)

### Creating New Tests

1. Select request
2. Go to **"Tests"** tab
3. Add test assertion:

   ```javascript
   // Example: Check response code
   pm.test("Status code is 200", function () {
     pm.response.to.have.status(200);
   });
   ```

4. Common assertions:
   - `pm.response.to.have.status(200)`
   - `pm.response.to.have.jsonBody('data')`
   - `pm.response.json().data.id > 0`

---

## Test Execution Workflow

### Scenario 1: Complete User Journey

1. **Register**
   - Request: POST /auth/register
   - Capture: Nothing (or user.id)

2. **Login**
   - Request: POST /auth/login
   - Capture: token variable
   - Test: Token not empty

3. **Get Profile**
   - Request: GET /auth/profile
   - Headers: Authorization: Bearer {{token}}
   - Test: Response includes email

4. **Create Incident**
   - Request: POST /incidents
   - Headers: Authorization: Bearer {{token}}
   - Body: Incident data
   - Capture: incident_id

5. **Get Incident**
   - Request: GET /incidents/{{incident_id}}
   - Test: Returned incident matches created

### Scenario 2: Alert Management

1. **Create Subscription**
   - POST /alerts/subscriptions
   - Capture: subscription_id
   - Test: Returns subscription with ID

2. **List Subscriptions**
   - GET /alerts/subscriptions
   - Test: Array includes new subscription

3. **Update Subscription**
   - PUT /alerts/subscriptions/{{subscription_id}}
   - Test: Changes reflected in response

4. **Delete Subscription**
   - DELETE /alerts/subscriptions/{{subscription_id}}
   - Test: Message says "deleted"

### Scenario 3: Admin Operations

1. **Get Duplicate Groups** (Admin only)
   - Headers: Include admin token
   - Test: Returns array of groups

2. **Bulk Moderate Reports** (Admin only)
   - POST /reports/admin/bulk-moderate
   - Body: reportIds array, action
   - Test: Success response

---

## Generating Reports

### Test Report

1. Click **"Run Tests"** → **"View Report"**
2. Download in formats:
   - **HTML** - Shareable report
   - **JSON** - Machine readable
   - **PDF** - Print-friendly

### API Documentation

1. Right-click collection
2. Select **"Export Documentation"**
3. Choose format:
   - **HTML** - Web viewable
   - **Markdown** - Git-friendly
   - **PDF** - Distribution ready

### Performance Report

1. Run **Load Testing** (if available)
2. View metrics:
   - Response time distribution
   - Throughput
   - Error rate
   - P95/P99 latencies

---

## Integration with CI/CD

### GitHub Actions Example

Create `.github/workflows/api-tests.yml`:

```yaml
name: API Tests with APIdog

on: [push, pull_request]

jobs:
  api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Run API Tests
        uses: apidog/action@v1
        with:
          apidog-key: ${{ secrets.APIDOG_KEY }}
          collection-id: your-collection-id
          environment: staging
```

### Jenkins Integration

1. Install APIdog CLI
2. Add build step:
   ```bash
   apidog run --collection=apidog-collection.json \
     --environment=staging \
     --reporters=junit,html
   ```

### Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
echo "Running API tests..."
apidog run --collection=apidog-collection.json --quick-test
```

---

## Troubleshooting

### Issue: "Base URL not found"

**Solution**:

1. Check environment is selected
2. Verify base_url variable is set
3. Ensure server is running

### Issue: "401 Unauthorized"

**Solution**:

1. Run login request first
2. Verify token variable is captured
3. Check token hasn't expired
4. Ensure {{token}} is in Authorization header

### Issue: "Variable not found"

**Solution**:

1. Run dependency requests first
2. Check variable name spelling
3. Use {{variable}} syntax (with braces)
4. Verify request has Tests section that sets variable

### Issue: "CORS Error"

**Solution**:

1. This is expected for cross-origin requests
2. Server should handle CORS headers
3. For testing, use server same-origin
4. For production, configure CORS properly

### Issue: "Request timeout"

**Solution**:

1. Increase timeout in environment settings
2. Check if server is running
3. Check internet connection
4. Try simpler endpoint first

---

## Advanced Features

### Mock Server

1. Right-click collection
2. Select **"Start Mock Server"**
3. APIdog generates fake responses
4. Useful for frontend development

### Monitoring

1. Set up **Monitor** from collection
2. Schedule periodic API health checks
3. Get alerts if endpoints are down
4. Track response time trends

### Documentation as Code

1. Use **Markdown** descriptions
2. APIdog renders rich documentation
3. Embedded request examples
4. Auto-generated from responses

### API Versioning

1. Create separate collections for v1, v2
2. Maintain backward compatibility docs
3. Mark deprecated endpoints
4. Show migration guides

---

## Tips & Tricks

### ✅ Best Practices

1. **Organize by Resource**
   - Auth/
   - Incidents/
   - Alerts/
   - Reports/

2. **Use Descriptive Names**
   - ❌ "Get 1"
   - ✅ "Get Incident by ID"

3. **Add Pre-request Scripts**
   - Set timestamps
   - Generate random IDs
   - Calculate signatures

4. **Leverage Variables**
   - Reuse across requests
   - Environment-specific values
   - Data-driven testing

5. **Document Endpoints**
   - Add examples
   - Note rate limits
   - Document edge cases

### ⚡ Shortcuts

- `Cmd+Enter` / `Ctrl+Enter` - Send request
- `Cmd+S` / `Ctrl+S` - Save
- `Cmd+/` / `Ctrl+/` - Command palette
- `Cmd+L` / `Ctrl+L` - Focus URL bar

---

## Support Resources

### Documentation Links

- **APIdog Docs**: https://apidog.com/docs
- **API Reference**: See `API_DOCUMENTATION.md`
- **OpenAPI Spec**: See `openapi.yaml`
- **Collection**: See `apidog-collection.json`

### Getting Help

- **Discord Community**: https://discord.gg/apidog
- **Email Support**: support@apidog.com
- **GitHub Issues**: Report bugs
- **Feature Requests**: https://apidog.canny.io

### Related Files

- `openapi.yaml` - Complete API specification
- `apidog-collection.json` - Postman collection
- `environments.json` - Environment configurations
- `API_DOCUMENTATION.md` - Full API reference

---

## Next Steps

1. ✅ Install APIdog
2. ✅ Import `openapi.yaml` or `apidog-collection.json`
3. ✅ Configure environment variables
4. ✅ Test all endpoints manually
5. ✅ Create automated test suites
6. ✅ Generate documentation
7. ✅ Share with team
8. ✅ Set up CI/CD integration
9. ✅ Monitor API performance
10. ✅ Keep documentation updated

---

## Version Information

- **APIdog Version**: 1.2+
- **OpenAPI Version**: 3.0.0
- **Collection Version**: 2.1.0
- **Last Updated**: January 15, 2024

---

**Happy Testing! 🚀**

For more help, see the complete [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
