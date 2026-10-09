export interface SmsAdapter {
  sendSms(to: string, message: string): Promise<boolean>;
}

export class MockSmsAdapter implements SmsAdapter {
  public sentMessages: { to: string; message: string; timestamp: Date }[] = [];

  async sendSms(to: string, message: string): Promise<boolean> {
    this.sentMessages.push({
      to,
      message,
      timestamp: new Date(),
    });
    return true;
  }

  getLastMessageForPhone(phone: string) {
    const messages = this.sentMessages.filter((m) => m.to === phone);
    return messages[messages.length - 1];
  }

  clear() {
    this.sentMessages = [];
  }
}
