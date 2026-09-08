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
    console.warn(
      "Africa's Talking SMS skipped: set AFRICASTALKING_USERNAME and AFRICASTALKING_API_KEY.",
    );
    return null;
  }

  smsClient ??= AfricasTalking({ username, apiKey });
  return smsClient;
}

function toInternationalPhoneNumber(phoneNumber: string) {
  const normalized = phoneNumber.replace(/[\s()-]/g, "");

  if (/^07\d{8}$/.test(normalized)) {
    return `+254${normalized.slice(1)}`;
  }

  if (/^7\d{8}$/.test(normalized)) {
    return `+254${normalized}`;
  }

  if (/^2547\d{8}$/.test(normalized)) {
    return `+${normalized}`;
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
    console.log("Sending farmer SMS via Africa's Talking:", {
      recipient,
      username: process.env.AFRICASTALKING_USERNAME,
    });

    const response = await client.SMS.send({
      to: recipient,
      message,
      ...(process.env.AFRICASTALKING_SENDER_ID
        ? { senderId: process.env.AFRICASTALKING_SENDER_ID }
        : {}),
    });

    const recipientStatus = response.SMSMessageData.Recipients[0];
    if (recipientStatus?.status === "Success") {
      console.log("Africa's Talking accepted farmer SMS:", {
        number: recipient,
        messageId: recipientStatus.messageId,
      });
    } else {
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