import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import expect from 'expect';
import { Page, Browser, launch } from 'puppeteer';

// Set default timeout for all steps
setDefaultTimeout(30 * 1000); // 30 seconds

const baseUrl = 'http://localhost:3004';

// Helper function to wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let browser: Browser;
let page: Page;
let examTitleGlobal: string;

Before({ tags: '@gui or @ai-correction' }, async function () {
    browser = await launch({
        headless: false, // Set to true for CI/CD
        slowMo: 50 // Slow down actions for visibility
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Set up request interception for AI correction API
    await page.setRequestInterception(true);
    
    page.on('request', async (request) => {
        const url = request.url();
        
        // Mock successful AI correction trigger (unless network failure is expected)
        // The API is called to localhost:3005, so we need to intercept that
        if (url.includes('/api/trigger-ai-correction') && request.method() === 'POST') {
            try {
                // Mock successful response - match the expected API response format
                await request.respond({
                    status: 200,
                    contentType: 'application/json',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        totalResponses: 5,
                        totalOpenQuestions: 3,
                        queuedMessages: 5,
                        estimatedTime: '2 minutos'
                    })
                });
                return; // Important: return after responding
            } catch (e) {
                // If there's an error responding, continue with the request
                console.error('Error in mock response:', e);
                request.continue();
                return;
            }
        }
        
        // For all other requests, continue normally
        request.continue();
    });
});

After({ tags: '@gui or @ai-correction' }, async function () {
    if (browser) {
        await browser.close();
    }
});

/* ------------------------------------------------------------
   GIVEN
-------------------------------------------------------------*/

Given('teacher {string} is viewing the exam {string}', async function (teacherName: string, examTitle: string) {
    examTitleGlobal = examTitle;
    
    // Navigate to the exam page
    await page.goto(baseUrl);
    
    await page.waitForSelector('h1');
    const title = await page.$eval('h1', el => el.textContent);
    expect(title || '').toContain('Teaching Assistant React');
    
    // Click on Classes tab
    await page.waitForSelector('[data-testid="classes-tab"]');
    await page.click('[data-testid="classes-tab"]');
    
    await page.waitForSelector('[data-testid="classes-container"]');
    await page.waitForSelector('[data-testid^="exams-btn-"]');
    
    // Get the first class button
    const firstClassButton = await page.$('[data-testid^="exams-btn-"]');
    expect(firstClassButton).toBeTruthy();
    
    const classId = await page.evaluate(
        el => el!.getAttribute('data-testid')!.replace('exams-btn-', ''),
        firstClassButton
    );
    
    // Click on the exams button for the class
    await page.click(`[data-testid="exams-btn-${classId}"]`);
    
    // Wait for navigation to complete - wait for URL to change or page to load
    await page.waitForFunction(
        () => window.location.pathname.includes('/exam/'),
        { timeout: 10000 }
    ).catch(() => {
        // If URL doesn't change, just wait for the page elements
    });
    
    // Wait for the exam page to load - wait for any element that indicates the page loaded
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Wait a bit for React to render the dropdown
    await wait(1000);
    
    // Wait for the exam dropdown to be visible and ready
    await page.waitForSelector('[data-testid="exam-dropdown"]', { 
        timeout: 15000,
        visible: true 
    });
    
    // Select the specific exam from dropdown
    await page.click('[data-testid="exam-dropdown"]');
    await page.waitForSelector(`[data-testid="dropdown-item-${examTitle}"]`, { timeout: 10000 });
    await page.click(`[data-testid="dropdown-item-${examTitle}"]`);
    
    // Wait for the exam to be selected (buttons should appear)
    await page.waitForSelector('[data-testid="correct-open-questions-button"]', { timeout: 10000 });
});

Given('teacher {string} is viewing {string}', async function (teacherName: string, viewMode: string) {
    // Navigate to the exam page
    await page.goto(baseUrl);
    
    await page.waitForSelector('h1');
    
    // Click on Classes tab
    await page.waitForSelector('[data-testid="classes-tab"]');
    await page.click('[data-testid="classes-tab"]');
    
    await page.waitForSelector('[data-testid="classes-container"]');
    await page.waitForSelector('[data-testid^="exams-btn-"]');
    
    // Get the first class button
    const firstClassButton = await page.$('[data-testid^="exams-btn-"]');
    expect(firstClassButton).toBeTruthy();
    
    const classId = await page.evaluate(
        el => el!.getAttribute('data-testid')!.replace('exams-btn-', ''),
        firstClassButton
    );
    
    // Click on the exams button for the class
    await page.click(`[data-testid="exams-btn-${classId}"]`);
    
    // Wait for navigation to complete
    await page.waitForFunction(
        () => window.location.pathname.includes('/exam/'),
        { timeout: 10000 }
    ).catch(() => {
        // If URL doesn't change, just wait for the page elements
    });
    
    // Wait for the exam page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Wait a bit for React to render
    await wait(1000);
    
    // Wait for the exam dropdown to be visible
    await page.waitForSelector('[data-testid="exam-dropdown"]', { 
        timeout: 15000,
        visible: true 
    });
    
    if (viewMode === 'Todas as provas') {
        // Ensure "Todas as provas" is selected (it's the default)
        // The "Corrigir Abertas" button should not be visible
        await wait(1000);
    }
});

Given('teacher {string} is viewing an exam that no longer exists', async function (teacherName: string) {
    // Navigate to the exam page
    await page.goto(baseUrl);
    
    await page.waitForSelector('h1');
    
    // Click on Classes tab
    await page.waitForSelector('[data-testid="classes-tab"]');
    await page.click('[data-testid="classes-tab"]');
    
    await page.waitForSelector('[data-testid="classes-container"]');
    await page.waitForSelector('[data-testid^="exams-btn-"]');
    
    // Get the first class button
    const firstClassButton = await page.$('[data-testid^="exams-btn-"]');
    expect(firstClassButton).toBeTruthy();
    
    const classId = await page.evaluate(
        el => el!.getAttribute('data-testid')!.replace('exams-btn-', ''),
        firstClassButton
    );
    
    // Click on the exams button for the class
    await page.click(`[data-testid="exams-btn-${classId}"]`);
    
    // Wait for navigation to complete
    await page.waitForFunction(
        () => window.location.pathname.includes('/exam/'),
        { timeout: 10000 }
    ).catch(() => {
        // If URL doesn't change, just wait for the page elements
    });
    
    // Wait for the exam page to load
    await page.waitForSelector('h1', { timeout: 10000 });
    
    // Wait a bit for React to render
    await wait(1000);
    
    // Wait for the exam dropdown to be visible
    await page.waitForSelector('[data-testid="exam-dropdown"]', { 
        timeout: 15000,
        visible: true 
    });
    
    // Mock: Try to select a non-existent exam
    // This will trigger the "Prova não encontrada" error
    // We'll simulate this by selecting an exam and then deleting it, or by using a non-existent exam name
    // For testing purposes, we'll just ensure the page is loaded
    await wait(1000);
});

Given('the exam {string} has only closed questions', async function (examTitle: string) {
    // This is a setup step - the exam should already exist with only closed questions
    // The actual setup would be done in the test data, but we can verify the state
    await wait(500);
});

Given('the exam {string} has open questions', async function (examTitle: string) {
    // This is a setup step - the exam should already exist with open questions
    await wait(500);
});

Given('no students have answered the open questions', async function () {
    // This is a setup step - no responses exist for open questions
    await wait(500);
});

Given('the network request fails', async function () {
    // Override the default mock to make the request fail
    page.removeAllListeners('request');
    page.on('request', (request) => {
        if (request.url().includes('/api/trigger-ai-correction') && request.method() === 'POST') {
            request.abort();
        } else {
            request.continue();
        }
    });
});

/* ------------------------------------------------------------
   WHEN
-------------------------------------------------------------*/

When('the teacher asks the system to grade the open questions in the exam {string}', async function (examTitle: string) {
    // Click on "Corrigir Abertas" button
    await page.waitForSelector('[data-testid="correct-open-questions-button"]', { timeout: 5000 });
    await page.click('[data-testid="correct-open-questions-button"]');
    
    // Wait for the model selection modal to appear
    await page.waitForSelector('[data-testid="modal-container"]', { timeout: 5000 });
    
    // Verify the modal title contains "Selecionar Modelo de IA"
    await page.waitForFunction(
        () => {
            const titleElement = document.querySelector('[data-testid="modal-title"]');
            return titleElement && titleElement.textContent?.toLowerCase().includes('selecionar modelo de ia');
        },
        { timeout: 5000 }
    );
});

When('the teacher asks the system to grade the open questions in the exam {string} without selecting any model', async function (examTitle: string) {
    // Click on "Corrigir Abertas" button
    await page.waitForSelector('[data-testid="correct-open-questions-button"]', { timeout: 5000 });
    await page.click('[data-testid="correct-open-questions-button"]');
    
    // Wait for the model selection modal to appear
    await page.waitForSelector('[data-testid="modal-container"]', { timeout: 5000 });
    
    // Verify the modal title contains "Selecionar Modelo de IA"
    await page.waitForFunction(
        () => {
            const titleElement = document.querySelector('[data-testid="modal-title"]');
            return titleElement && titleElement.textContent?.toLowerCase().includes('selecionar modelo de ia');
        },
        { timeout: 5000 }
    );
    
    // Try to confirm without selecting a model
    await page.waitForSelector('[data-testid="model-selection-confirm-button"]', { timeout: 5000 });
    await page.click('[data-testid="model-selection-confirm-button"]');
});

When('the teacher clicks the button {string}', async function (buttonText: string) {
    if (buttonText === 'Corrigir Abertas') {
        // Try to find the button by data-testid first
        try {
            await page.waitForSelector('[data-testid="correct-open-questions-button"]', { timeout: 2000 });
            await page.click('[data-testid="correct-open-questions-button"]');
        } catch (e) {
            // If button doesn't exist, try to find by text
            try {
                const buttons = await page.$$('button');
                for (const button of buttons) {
                    const text = await page.evaluate(el => el.textContent, button);
                    if (text && text.includes('Corrigir Abertas')) {
                        await button.click();
                        return;
                    }
                }
            } catch (e2) {
                // Button doesn't exist - this triggers the error scenario
                await wait(500);
            }
        }
    }
});

When('the teacher selects the model {string}', async function (modelName: string) {
    // Check if modal is already open, if not, open it by clicking "Corrigir Abertas"
    const modalExists = await page.$('[data-testid="modal-container"]');
    if (!modalExists) {
        // Open the modal by clicking "Corrigir Abertas"
        await page.waitForSelector('[data-testid="correct-open-questions-button"]', { timeout: 5000 });
        await page.click('[data-testid="correct-open-questions-button"]');
    }
    
    // Wait for the model selection modal to appear
    await page.waitForSelector('[data-testid="modal-container"]', { timeout: 5000 });
    
    // Verify the modal title contains "Selecionar Modelo de IA"
    await page.waitForFunction(
        () => {
            const titleElement = document.querySelector('[data-testid="modal-title"]');
            return titleElement && titleElement.textContent?.toLowerCase().includes('selecionar modelo de ia');
        },
        { timeout: 5000 }
    );
    
    // Click on the dropdown to open it - the data-testid is on the button
    await page.waitForSelector('[data-testid="model-selection-dropdown"]', { timeout: 5000 });
    await page.click('[data-testid="model-selection-dropdown"]');
    await wait(500);
    
    // Wait for the dropdown item to appear and click it
    await page.waitForSelector(`[data-testid="dropdown-item-${modelName}"]`, { timeout: 5000 });
    await page.click(`[data-testid="dropdown-item-${modelName}"]`);
    await wait(500);
});

When('the teacher confirms the selection', async function () {
    // Click the confirm button
    await page.waitForSelector('[data-testid="model-selection-confirm-button"]', { timeout: 5000 });
    await page.click('[data-testid="model-selection-confirm-button"]');
    
    // Wait for the model selection modal to close
    await page.waitForFunction(
        () => {
            const modal = document.querySelector('[data-testid="modal-container"]');
            if (!modal) return true; // Modal closed
            const title = document.querySelector('[data-testid="modal-title"]');
            if (!title) return true;
            const titleText = title.textContent?.toLowerCase() || '';
            return !titleText.includes('selecionar modelo de ia');
        },
        { timeout: 5000 }
    );
    
    // Wait a bit for the API call to be made
    await wait(2000);
});

When('the system fails to initiate the correction process', async function () {
    // This is handled by the network interception or mock setup
    // The actual failure is simulated in the Given step or by network conditions
    await wait(1000);
});

/* ------------------------------------------------------------
   THEN
-------------------------------------------------------------*/

Then('the system initiates the exam correction process', async function () {
    // Wait for the API call to be made
    // This is verified by checking if the success modal appears
    await wait(2000);
});

Then('a feedback message appears informing that the process was started with {string}', async function (modelName: string) {
    // Wait a bit for the API call to complete and React to update
    await wait(2000);
    
    // First check if there's an error - if so, fail the test
    const hasError = await page.evaluate(() => {
        const errorDiv = document.querySelector('[data-testid="error-message"]');
        const alertError = document.querySelector('[data-testid="alert-error"]');
        return !!(errorDiv || alertError);
    });
    
    if (hasError) {
        const errorText = await page.evaluate(() => {
            const errorDiv = document.querySelector('[data-testid="error-message"]');
            if (errorDiv) return errorDiv.textContent;
            const alertError = document.querySelector('[data-testid="alert-error"]');
            if (alertError) return alertError.textContent;
            return 'Unknown error';
        });
        throw new Error(`Expected success modal but found error: ${errorText}`);
    }
    
    // Wait for the modal container to appear first
    await page.waitForSelector('[data-testid="modal-container"]', { timeout: 20000 });
    
    // Then wait for the success modal content specifically
    await page.waitForSelector('[data-testid="success-modal-content"]', { timeout: 10000 });
    
    // Verify the modal title contains "Correção Iniciada com Sucesso"
    await page.waitForFunction(
        () => {
            const title = document.querySelector('[data-testid="modal-title"]');
            if (!title) return false;
            const titleText = title.textContent?.toLowerCase() || '';
            return titleText.includes('correção iniciada com sucesso');
        },
        { timeout: 5000 }
    );
    
    // Verify the modal contains the model name
    await page.waitForFunction(
        (model: string) => {
            const successContent = document.querySelector('[data-testid="success-modal-content"]');
            if (!successContent) return false;
            const text = successContent.textContent?.toLowerCase() || '';
            return text.includes(model.toLowerCase());
        },
        { timeout: 5000 },
        modelName
    );
});

Then('the feedback message includes the estimated correction completion time.', async function () {
    // Check for estimated time in the success modal
    await page.waitForFunction(
        () => {
            const modal = document.querySelector('[data-testid="modal-container"]');
            if (!modal) return false;
            const text = modal.textContent?.toLowerCase() || '';
            return text.includes('tempo estimado');
        },
        { timeout: 5000 }
    );
});

Then('the system displays a validation error message {string}', async function (expectedMessage: string) {
    // Wait for the error message to appear
    await page.waitForFunction(
        (text: string) => {
            const errorDivs = Array.from(document.querySelectorAll('div'));
            return errorDivs.some(div => div.textContent?.includes(text));
        },
        { timeout: 5000 },
        expectedMessage
    );
});

Then('the correction process is not initiated', async function () {
    // Verify that the success modal does NOT appear
    await wait(1000);
    const successModal = await page.evaluate(() => {
        const modal = document.querySelector('[data-testid="modal-container"]');
        if (!modal) return false;
        const text = modal.textContent?.toLowerCase() || '';
        return text.includes('correção iniciada com sucesso');
    });
    expect(successModal).toBeFalsy();
});

Then('the system displays a failure alert {string}', async function (expectedAlert: string) {
    // Wait for the alert to appear (using Alert component with data-testid)
    await page.waitForFunction(
        (text: string) => {
            // Check alert by data-testid first
            const alertError = document.querySelector('[data-testid="alert-error"]');
            if (alertError) {
                const alertText = alertError.textContent?.toLowerCase() || '';
                if (alertText.includes(text.toLowerCase())) return true;
            }
            
            // Check MUI alerts
            const alerts = Array.from(document.querySelectorAll('.MuiAlert-root'));
            return alerts.some(alert => {
                const alertText = alert.textContent?.toLowerCase() || '';
                return alertText.includes(text.toLowerCase());
            });
        },
        { timeout: 10000 },
        expectedAlert
    );
});

Then('the system displays an error message {string}', async function (expectedMessage: string) {
    // Wait for the error message to appear (could be in alert, error div, or errorMessage span)
    await page.waitForFunction(
        (text: string) => {
            // Check error message div by data-testid
            const errorDiv = document.querySelector('[data-testid="error-message"]');
            if (errorDiv) {
                const errorText = errorDiv.textContent?.toLowerCase() || '';
                if (errorText.includes(text.toLowerCase())) return true;
            }
            
            // Check alerts by data-testid
            const alertError = document.querySelector('[data-testid="alert-error"]');
            if (alertError) {
                const alertText = alertError.textContent?.toLowerCase() || '';
                if (alertText.includes(text.toLowerCase())) return true;
            }
            
            // Check MUI alerts
            const alerts = Array.from(document.querySelectorAll('.MuiAlert-root'));
            const alertMatch = alerts.some(alert => {
                const alertText = alert.textContent?.toLowerCase() || '';
                return alertText.includes(text.toLowerCase());
            });
            if (alertMatch) return true;
            
            // Check error divs and spans
            const errorElements = Array.from(document.querySelectorAll('div, span, p'));
            const elementMatch = errorElements.some(el => {
                const elementText = el.textContent?.toLowerCase() || '';
                return elementText.includes(text.toLowerCase());
            });
            
            return elementMatch;
        },
        { timeout: 10000 },
        expectedMessage
    );
});

Then('the model selection modal is not opened', async function () {
    // Verify that the model selection modal does NOT appear
    await wait(1000);
    const modalExists = await page.evaluate(() => {
        const modal = document.querySelector('[data-testid="modal-container"]');
        if (!modal) return false;
        const title = document.querySelector('[data-testid="modal-title"]');
        if (!title) return false;
        const text = title.textContent?.toLowerCase() || '';
        return text.includes('selecionar modelo de ia');
    });
    expect(modalExists).toBeFalsy();
});

Then('the system displays a network error message', async function () {
    // Wait for any error message related to network failure
    await page.waitForFunction(
        () => {
            const alerts = Array.from(document.querySelectorAll('.MuiAlert-root'));
            const errorDivs = Array.from(document.querySelectorAll('div'));
            const allElements = [...alerts, ...errorDivs];
            return allElements.some(el => {
                const text = el.textContent?.toLowerCase() || '';
                return text.includes('erro') || text.includes('network') || text.includes('falhou');
            });
        },
        { timeout: 10000 }
    );
});

