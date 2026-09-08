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

export async function sendFarmerSms(
  phoneNumber: string,
  message: string,
) {
  const client = getSmsClient();
  if (!client) return;

  try {
    await client.SMS.send({
      to: phoneNumber,
      message,
      senderId: process.env.AFRICASTALKING_SENDER_ID || undefined,
    });
  } catch (error) {
    console.error("Africa's Talking SMS error:", error);
  }
}

export { activeBookingStatuses };