const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const puppeteer = require('puppeteer');

const app = express();
const port = process.env.PORT || 5888;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// 检测页面白屏和错误的主要函数
async function checkWebPage(url) {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // 注入检测辅助函数
        await page.evaluateOnNewDocument(() => {
            window.__webviewCheck = {
                // 检查本地存储
                checkStorage: () => {
                    try {
                        const testKey = '__test__';
                        localStorage.setItem(testKey, '1');
                        localStorage.removeItem(testKey);
                        return { ok: true };
                    } catch (e) {
                        return { ok: false, error: e.message };
                    }
                },
                
                // 检查离线资源
                checkResources: () => {
                    const results = {
                        scripts: [],
                        styles: [],
                        images: []
                    };
                    
                    // 检查脚本
                    document.querySelectorAll('script[src]').forEach(script => {
                        results.scripts.push({
                            src: script.src,
                            loaded: script.readyState === 'complete' || script.readyState === undefined
                        });
                    });
                    
                    // 检查样式表
                    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                        results.styles.push({
                            href: link.href,
                            loaded: !!link.sheet
                        });
                    });
                    
                    // 检查图片
                    document.querySelectorAll('img').forEach(img => {
                        results.images.push({
                            src: img.src,
                            loaded: img.complete && img.naturalHeight !== 0
                        });
                    });
                    
                    return results;
                }
            };
        });

        // 收集错误
        const errors = {
            console: [],
            page: [],
            network: []
        };

        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.console.push(msg.text());
            }
        });

        page.on('pageerror', error => {
            errors.page.push(error.message);
        });

        page.on('requestfailed', request => {
            errors.network.push({
                url: request.url(),
                errorText: request.failure().errorText
            });
        });

        await page.setDefaultNavigationTimeout(30000);

        const response = await page.goto(url, {
            waitUntil: ['networkidle0', 'domcontentloaded']
        });

        // 等待可能的动态内容加载
        await page.waitForTimeout(2000);

        // 执行页面检查
        const check = await page.evaluate(() => {
            const body = document.body;
            const html = document.documentElement;
            
            // 基础检查
            const basic = {
                hasBody: !!body,
                hasContent: body?.innerText.trim().length > 0,
                height: Math.max(
                    body?.scrollHeight || 0,
                    body?.offsetHeight || 0,
                    html?.clientHeight || 0,
                    html?.scrollHeight || 0,
                    html?.offsetHeight || 0
                ),
                title: document.title
            };

            // WebView特定检查
            const webview = {
                hasRoot: !!document.getElementById('root') || !!document.getElementById('app'),
                readyState: document.readyState,
                storage: window.__webviewCheck.checkStorage(),
                resources: window.__webviewCheck.checkResources(),
                // 检查关键容器
                containers: {
                    hasViewport: !!document.querySelector('meta[name="viewport"]'),
                    hasMainContent: !!document.querySelector('main, #main, .main, [role="main"]'),
                }
            };

            // 首屏检查
            const viewport = {
                width: window.innerWidth,
                height: window.innerHeight,
                hasContent: !!document.elementFromPoint(
                    Math.floor(window.innerWidth / 2),
                    Math.floor(window.innerHeight / 2)
                )
            };

            return { basic, webview, viewport };
        });

        const result = {
            url,
            status: response.status(),
            ok: response.ok(),
            timestamp: new Date().toISOString(),
            check,
            errors,
            isWhiteScreen: !check.basic.hasContent || 
                          check.basic.height === 0 || 
                          !check.viewport.hasContent ||
                          !check.webview.hasRoot ||
                          (check.webview.readyState !== 'complete' && !check.webview.containers.hasMainContent),
            offlineStatus: {
                storageAvailable: check.webview.storage.ok,
                resourcesLoaded: !Object.values(check.webview.resources).some(
                    list => list.some(item => !item.loaded)
                ),
                missingResources: Object.entries(check.webview.resources)
                    .reduce((acc, [type, items]) => {
                        const failed = items.filter(item => !item.loaded);
                        if (failed.length > 0) {
                            acc[type] = failed;
                        }
                        return acc;
                    }, {})
            }
        };

        await browser.close();
        return result;

    } catch (error) {
        await browser.close();
        throw error;
    }
}

app.post('/api/check', async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        const result = await checkWebPage(url);
        res.json(result);
    } catch (error) {
        res.status(500).json({
            error: error.message,
            isWhiteScreen: true
        });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 