const { CAPTCHA_API_KEY } = process.env;

const solveCaptcha = async (page) => {
    try {
        const siteKey = await page.$eval('.g-recaptcha', (el) => el.getAttribute('data-sitekey'));
        const url = page.url();

        console.log('Надсилаємо reCAPTCHA на розпізнавання...');
        const captchaResponse = await axios.post(
            `http://2captcha.com/in.php?key=${CAPTCHA_API_KEY}&method=userrecaptcha&googlekey=${siteKey}&pageurl=${url}`
        );

        const captchaId = captchaResponse.data.split('|')[1];
        console.log(`Captcha ID: ${captchaId}`);

        let solution;
        for (let i = 0; i < 10; i++) {
            await new Promise((resolve) => setTimeout(resolve, 5000)); 
            const resultResponse = await axios.get(
                `http://2captcha.com/res.php?key=${CAPTCHA_API_KEY}&action=get&id=${captchaId}`
            );

            if (resultResponse.data === 'CAPCHA_NOT_READY') {
                console.log('Очікуємо вирішення...');
            } else {
                solution = resultResponse.data.split('|')[1];
                break;
            }
        }
        return solution;
    } catch (error) {
        console.error('Помилка при обробці reCAPTCHA:', error.message);
        return null;
    }
}

module.exports = solveCaptcha;