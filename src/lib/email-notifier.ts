interface JobEmailParams {
  email: string;
  subject: string;
  message: string;
}

// Lightweight notifier. If no webhook configured, we just log.
export async function sendJobEmail(params: JobEmailParams): Promise<void> {
  const webhook = process.env.JOB_NOTIFY_WEBHOOK_URL;
  if (!webhook) {
    console.log('[job-email] webhook not configured, skip send', {
      email: params.email,
      subject: params.subject,
    });
    return;
  }

  const response = await fetch(webhook, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Email webhook failed: ${response.status} ${text}`);
  }
}
