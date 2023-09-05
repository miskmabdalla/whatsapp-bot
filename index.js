require('dotenv').config();
const qrcode = require('qrcode-terminal');
const dialogflow = require('@google-cloud/dialogflow');
const { Client, LocalAuth } = require('whatsapp-web.js');

// Object to hold user states
// const userStates = {};

// Your credentials
const CREDENTIALS = JSON.parse(process.env.CREDENTIALS);

// Your google dialogflow project-id
const PROJECID = CREDENTIALS.project_id;

// Configuration for the client
const CONFIGURATION = {
    credentials: {
        private_key: CREDENTIALS['private_key'],
        client_email: CREDENTIALS['client_email']
    }
}

// Create a new session
const sessionClient = new dialogflow.SessionsClient(CONFIGURATION);

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
		args: ['--no-sandbox'],
	}
});
client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('ready', () => {
    console.log('Client is ready!');

});

client.on('message', async (message) => {
    console.log('message received');
    const SESSIONID = message.from;
    const dialogflowResponse = await processDialogflow(SESSIONID, message.body);
    message.reply(dialogflowResponse);
    
});



// Method to process message through Dialogflow
async function processDialogflow(SESSIONID, message) {
    const sessionPath = sessionClient.projectAgentSessionPath(PROJECID, SESSIONID);
    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: message,
                languageCode: 'en-US',
            },
        },
    };

    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;
    return result.fulfillmentText;
}



const handleUserState = (userId, messageBody) => {
    if (!userStates[userId]) {
        userStates[userId] = 'INIT';
    }

    if (messageBody.toLowerCase() === 'back') {
        userStates[userId] = 'INIT';
    }

    let responseMessage;
    switch (userStates[userId]) {
        case 'INIT':
            responseMessage = 'Hi, how can I assist you today? You can verify your product or check your points';
            userStates[userId] = 'ASKED_SERVICE';
            break;
        case 'ASKED_SERVICE':
            responseMessage = handleAskedService(messageBody, userId);
            break;
        case 'VERIFY_PRODUCT':
            responseMessage = handleVerifyProduct(messageBody, userId);
            break;
        case 'CHECK_POINTS':
            responseMessage = handleCheckPoints(messageBody, userId);
            break;
        default:
            responseMessage = 'I don\'t understand';
    }
    return responseMessage;
};

const handleAskedService = (messageBody, userId) => {
    let responseMessage;
    if (messageBody.toLowerCase().includes('verify')) {
        responseMessage = 'You chose to verify your product, please enter your product ID';
        userStates[userId] = 'VERIFY_PRODUCT';
    } else if (messageBody.toLowerCase().includes('points')) {
        responseMessage = 'You chose to check your points, please enter your ID';
        userStates[userId] = 'CHECK_POINTS';
    } else {
        responseMessage = 'I don\'t understand, type \'back\' to return to the start';
    }
    return responseMessage;
};

const handleVerifyProduct = (messageBody, userId) => {
    let responseMessage;
    if (messageBody === 'valid_number') {
        responseMessage = 'Your product is valid';
    } else {
        responseMessage = 'Your product is not valid, you are returning to the start';
    }
    userStates[userId] = 'INIT';
    return responseMessage;
};

const handleCheckPoints = (messageBody, userId) => {
    let responseMessage;
    if (messageBody === 'valid_id') {
        responseMessage = 'You have 100 points';
    } else {
        responseMessage = 'Invalid ID, you are returning to the start';
    }
    userStates[userId] = 'INIT';
    return responseMessage;
};



client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
});

client.on('error', error => {
    console.error('Error:', error);
});

client.initialize();
 
 


