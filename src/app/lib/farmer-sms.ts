import AfricasTalking from "africastalking";

const activeBookingStatuses = [
  "PENDING",
  "SLOT_BOOKED",
  "ARRIVED",
  "GROSS_WEIGHED",
  "QUALITY_CHECKED",
  "TARE_WEIGHED",
] as const;

let smsClient: ReturnType<typeof AfricasTalking> | null = null;

function getSmsClient() {
  const username = process.env.AFRICASTALKING_USERNAME;
  const apiKey = process.env.AFRICASTALKING_API_KEY;

  if (!username || !apiKey) {
    console.warn("Africa's Talking SMS is not configured.");
    return null;
  }

  smsClient ??= AfricasTalking({ username, apiKey });
  return smsClient;
}

function toInternationalPhoneNumber(phoneNumber: string) {
  const normalized = phoneNumber.replace(/[\s()-]/g, "");
  
  // For sandbox testing, use a mock Kenyan number format
  if (/^\d{9,10}$/.test(normalized)) {
    // If it's a 9-10 digit test number, prepend +254 for Africa's Talking Sandbox
    return `+254${normalized.slice(-9)}`; 
  }
  
  if (/^\+\d{10,15}$/.test(normalized)) {
    return normalized;
  }
  return null;
}


export async function sendFarmerSms(
  phoneNumber: string,
  message: string,
) {
  const client = getSmsClient();
  if (!client) return;

  const recipient = toInternationalPhoneNumber(phoneNumber);
  if (!recipient) {
    console.error("Cannot send Africa's Talking SMS: invalid farmer phone number.", {
      phoneNumber,
    });
    return;
  }

  try {
    const response = await client.SMS.send({
      to: recipient,
      message,
      senderId: process.env.AFRICASTALKING_SENDER_ID || undefined,
    });

    const recipientStatus = response.SMSMessageData.Recipients[0];
    if (recipientStatus?.status !== "Success") {
      console.error("Africa's Talking SMS was not accepted for delivery.", {
        number: recipient,
        status: recipientStatus?.status || "No recipient status returned",
        messageId: recipientStatus?.messageId,
      });
    }
  } catch (error) {
    console.error("Africa's Talking SMS error:", error);
  }
}

export { activeBookingStatuses };