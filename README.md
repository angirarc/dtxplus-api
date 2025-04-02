# Medical Reminder API

```bash
I chose bun for this project because of the native support for TypeScript and the speed of execution but yarn and npm can also be used.
```

## Setup
1. Clone repository
2. Install dependencies:
```bash
bun install
```
3. Create `.env` file using `.env.example` template
4. Set required environment variables:

## Environment Configuration
```
MONGODB_URI=mongodb://****
JWT_SECRET=your_jwt_secret_key
PORT=3000
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
SERVER_URL=public_url_for_twilio_callbacks
DEEPGRAM_API_KEY=your_deepgram_api_key
```

## API Endpoints

### Authentication
- **POST /auth/register** - Register new user
- **POST /auth/login** - Login with credentials

### Patients
- **GET /patients** - List all patients
- **POST /patients** - Create new patient
- **GET /patients/:id** - Get patient by ID
- **PUT /patients/:id** - Update patient
- **DELETE /patients/:id** - Delete patient

### Prescriptions
- **GET /prescriptions** - List all prescriptions
- **POST /prescriptions** - Create new prescription
- **POST /prescriptions/:id/call** - Initiate reminder call
- **POST /prescriptions/:id/text** - Send SMS reminder
- **PUT /prescriptions/:id** - Update prescription
- **DELETE /prescriptions/:id** - Delete prescription

### Call Logs
- **GET /call-logs** - List all call records
- **POST /call-logs/:id/transcribe** - Transcribe call recording
- **POST /call-logs/:id/generate** - Generate audio from text

## Using Postman Collection
1. Import `DTxPlus API.postman_collection.json`
2. Set environment variables:
  - `base_url`: http://localhost:3000
  - `auth_token`: JWT from login
3. Follow collection structure for all API operations

## Running the Server
```bash
bun start
```