const express = require('express');
const cors = require('cors');
const { SessionsClient } = require('@google-cloud/dialogflow');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Dialogflow configuration
const projectId = process.env.GOOGLE_PROJECT_ID;
const sessionClient = new SessionsClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Therapy Chatbot Backend is running!',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default-session' } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!projectId) {
      return res.status(500).json({ error: 'Dialogflow project ID not configured' });
    }

    // Create session path
    const sessionPath = sessionClient.projectAgentSessionPath(projectId, sessionId);

    // Create request
    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: message,
          languageCode: 'en-US',
        },
      },
    };

    // Send request to Dialogflow
    console.log('Sending to Dialogflow:', message);
    const [response] = await sessionClient.detectIntent(request);
    
    console.log('Dialogflow response:', {
      intent: response.queryResult.intent?.displayName || 'No intent',
      fulfillmentText: response.queryResult.fulfillmentText
    });

    // Extract response data
    const result = {
      text: response.queryResult.fulfillmentText || 'I apologize, but I didn\'t understand that. Could you rephrase?',
      intent: response.queryResult.intent?.displayName || 'unknown',
      confidence: response.queryResult.intentDetectionConfidence || 0,
      sessionId: sessionId
    };

    res.json(result);

  } catch (error) {
    console.error('Error processing request:', error);
    
    // Return a helpful error response
    res.status(500).json({ 
      error: 'Failed to process message',
      text: 'I\'m having trouble connecting right now. Please try again in a moment.',
      intent: 'error'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    text: 'Something went wrong. Please try again.'
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}`);
  console.log(`Chat endpoint: http://localhost:${port}/chat`);
  
  // Log configuration status
  console.log('\nConfiguration:');
  console.log('- Project ID:', projectId ? '✓ Set' : '✗ Missing');
  console.log('- Credentials:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? '✓ Set' : '✗ Missing');
});