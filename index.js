const puppeteer = require('puppeteer');
const axios = require('axios');
require('dotenv').config();
const fs = require('fs');
const solveCaptcha = require('./solveCaptcha');

const { FACEBOOK_EMAIL, FACEBOOK_PASSWORD } = process.env;

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();

    try {
        const log = (message) => {
            fs.appendFileSync('out.log', `${new Date().toISOString()} - ${message}\n`);
        };

        log('Відкриваємо Facebook...');
        await page.goto('https://www.facebook.com/login', { waitUntil: 'load' });

        log('Виконуємо вхід...');
        await page.type('#email', FACEBOOK_EMAIL);
        await page.type('#pass', FACEBOOK_PASSWORD);
        await new Promise(resolve => setTimeout(resolve, 1000)); 
        await page.click('[name="login"]');
        await new Promise(resolve => setTimeout(resolve, 5000)); 

        if (await page.$('.recaptcha')) {
            log('Виявлено reCAPTCHA. Виконуємо обхід...');
            const captchaSolution = await solveCaptcha(page);

            if (captchaSolution) {
                await page.evaluate(
                    (solution) => (document.querySelector('.g-recaptcha-response').value = solution),
                    captchaSolution
                );
                await page.click('#recaptcha-verify-button');
                await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
                log('Не вдалося обійти reCAPTCHA.');
                throw new Error('Не вдалося обійти reCAPTCHA.');
            }
        }

        log('Переходимо до профілю...');
        await page.goto('https://www.facebook.com/me', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 5000));

        log('Отримуємо фотографію профілю...');
        await page.waitForSelector('image[xlink\\:href]', { timeout: 5000 }); 

        const profilePicUrl = await page.$eval(
            'image[xlink\\:href]',
            (image) => image.getAttribute('xlink:href')
        );

        log(`URL фотографії профілю: ${profilePicUrl}`);

        log('Завантажуємо фотографію профілю...');
        const response = await axios.get(profilePicUrl, { responseType: 'arraybuffer' });
        fs.writeFileSync('profile_picture.jpg', response.data);
        log('Фотографію профілю збережено як profile_picture.jpg');
    } catch (error) {
        const errorMessage = `Помилка: ${error.message}`;
        fs.appendFileSync('out.log', `${errorMessage}\n`);
        console.error(errorMessage);
    } finally {
        await browser.close();
        fs.appendFileSync('out.log', 'Браузер закрито.\n');
    }
})();

