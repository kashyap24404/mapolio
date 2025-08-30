// utils/captchaManager.js
export class CaptchaManager {
  constructor() {
    this.isCaptchaBeingHandled = false;
    this.captchaPromise = null;
    this.resolveCaptcha = null;
    this.rejectCaptcha = null;
  }

  /**
   * Called by a worker before creating a new page.
   * It will pause if another worker is already handling a CAPTCHA.
   */
  async waitForGreenLight() {
    if (this.isCaptchaBeingHandled && this.captchaPromise) {
      console.log('CAPTCHA is being handled elsewhere, this worker is pausing...');
      await this.captchaPromise;
      console.log('CAPTCHA resolved, this worker is resuming.');
    }
  }

  /**
   * Called by a worker when it detects a CAPTCHA to claim handling rights.
   * @returns {boolean} - True if this worker is now the handler, false if another worker beat it.
   */
  claimHandling() {
    if (this.isCaptchaBeingHandled) {
      return false; // Another worker is already on it.
    }
    this.isCaptchaBeingHandled = true;
    this.captchaPromise = new Promise((resolve, reject) => {
      this.resolveCaptcha = resolve;
      this.rejectCaptcha = reject;
    });
    console.log('A worker has claimed CAPTCHA handling. Pausing new page creation.');
    return true; // This worker is now responsible.
  }

  /**
   * Called by the handling worker after it has finished its attempt.
   * @param {boolean} isSuccess - Whether the CAPTCHA was solved successfully.
   */
  resolveHandling(isSuccess) {
    if (isSuccess) {
      console.log('CAPTCHA solved successfully. Resuming all paused workers.');
      this.resolveCaptcha();
    } else {
      console.error('CAPTCHA handling failed. Failing all paused workers.');
      this.rejectCaptcha(new Error("A shared CAPTCHA challenge could not be solved."));
    }
    // Reset state for the next time
    this.isCaptchaBeingHandled = false;
    this.captchaPromise = null;
    this.resolveCaptcha = null;
    this.rejectCaptcha = null;
  }
}