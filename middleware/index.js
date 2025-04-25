const puppeteer = require('puppeteer');

class WhiteScreenDetector {
    constructor(options = {}) {
        this.options = {
            timeout: options.timeout || 30000,
            waitTime: options.waitTime || 2000,
            path: options.path || '/api/check-white-screen',
            viewport: options.viewport || { width: 375, height: 667 }
        };
        this.browser = null;
    }

    async initialize() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    async checkPage(url) {
        const page = await this.browser.newPage();
        const result = {
            url,
            timestamp: Date.now(),
            ok: true,
            status: 200,
            checks: {
                basic: { passed: true, details: {} },
                webview: { passed: true, details: {} },
                viewport: { passed: true, details: {} }
            },
            errors: []
        };

        try {
            // Set viewport
            await page.setViewport(this.options.viewport);

            // Collect console messages
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    result.errors.push({
                        type: 'console',
                        message: msg.text()
                    });
                }
            });

            // Collect page errors
            page.on('pageerror', error => {
                result.errors.push({
                    type: 'page',
                    message: error.message
                });
            });

            // Collect failed requests
            page.on('requestfailed', request => {
                result.errors.push({
                    type: 'network',
                    url: request.url(),
                    message: request.failure().errorText
                });
            });

            // Navigate to the page
            const response = await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: this.options.timeout
            });

            result.status = response.status();
            
            // Wait for dynamic content
            await page.waitForTimeout(this.options.waitTime);

            // Basic checks
            const basicChecks = await page.evaluate(() => {
                const html = document.documentElement;
                const body = document.body;
                
                return {
                    hasHtml: !!html,
                    hasBody: !!body,
                    hasContent: body ? body.children.length > 0 : false,
                    dimensions: {
                        htmlWidth: html ? html.offsetWidth : 0,
                        htmlHeight: html ? html.offsetHeight : 0,
                        bodyWidth: body ? body.offsetWidth : 0,
                        bodyHeight: body ? body.offsetHeight : 0
                    }
                };
            });

            result.checks.basic.details = basicChecks;
            result.checks.basic.passed = basicChecks.hasHtml && 
                                        basicChecks.hasBody && 
                                        basicChecks.hasContent;

            // WebView specific checks
            const webviewChecks = await page.evaluate(() => {
                return {
                    hasLocalStorage: !!window.localStorage,
                    hasSessionStorage: !!window.sessionStorage,
                    userAgent: window.navigator.userAgent,
                    screenSize: {
                        width: window.screen.width,
                        height: window.screen.height
                    }
                };
            });

            result.checks.webview.details = webviewChecks;
            result.checks.webview.passed = webviewChecks.hasLocalStorage && 
                                          webviewChecks.hasSessionStorage;

            // Viewport checks
            const viewportChecks = await page.evaluate(() => {
                return {
                    innerWidth: window.innerWidth,
                    innerHeight: window.innerHeight,
                    devicePixelRatio: window.devicePixelRatio
                };
            });

            result.checks.viewport.details = viewportChecks;
            result.checks.viewport.passed = viewportChecks.innerWidth > 0 && 
                                          viewportChecks.innerHeight > 0;

            // Overall status
            result.ok = result.checks.basic.passed && 
                       result.checks.webview.passed && 
                       result.checks.viewport.passed && 
                       result.errors.length === 0;

        } catch (error) {
            result.ok = false;
            result.errors.push({
                type: 'system',
                message: error.message
            });
        } finally {
            await page.close();
        }

        return result;
    }

    middleware() {
        return async (req, res, next) => {
            if (req.path !== this.options.path) {
                return next();
            }

            const url = req.query.url;
            if (!url) {
                return res.status(400).json({
                    error: 'URL parameter is required'
                });
            }

            try {
                await this.initialize();
                const result = await this.checkPage(url);
                res.json(result);
            } catch (error) {
                next(error);
            }
        };
    }
}

function createMiddleware(options = {}) {
    const detector = new WhiteScreenDetector(options);

    // Cleanup on process exit
    process.on('SIGINT', async () => {
        await detector.close();
        process.exit();
    });

    return detector.middleware();
}

module.exports = createMiddleware; 