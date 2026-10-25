import { EMAIL_TEMPLATES } from "#/utils/constants.js";
import { sendEmail } from "#/utils/email.js";
import { interpolate, renderEmailTemplate } from "#/utils/emailTemplate.js";
import User from "#/features/users/user.model.js";
import Payment from "./payment.model.js";

const formatAmount = (amount, currency) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

/**
 * Emails the receipt for a completed payment and stores receiptRef. A failed
 * email must never undo a confirmed payment, so errors are logged, not thrown.
 * TODO(receipts): retry payments that are completed but have no receiptRef.
 */
export const sendPaymentReceipt = async (payment) => {
  try {
    const user = await User.findById(payment.userId).select("firstName email").lean();
    if (!user?.email) return;

    const template = EMAIL_TEMPLATES.PAYMENT_RECEIPT;
    const vars = {
      firstName: user.firstName,
      description: payment.description ?? payment.purpose,
      amount: formatAmount(payment.amount, payment.currency),
      paymentDate: payment.paymentDate.toUTCString(),
      transactionRef: payment.providerTransactionRef,
      preheader: template.PREHEADER,
    };

    const result = await sendEmail({
      to: user.email,
      subject: template.SUBJECT,
      text: interpolate(template.TEXT, vars),
      html: renderEmailTemplate(template.FILE, vars),
    });

    // Provider message id when available, else our own stable reference.
    const receiptRef = result?.messageId ?? `receipt-${payment._id}`;
    await Payment.updateOne({ _id: payment._id }, { $set: { receiptRef } });
  } catch (error) {
    console.error(`Receipt email failed for payment ${payment._id}:`, error.message);
  }
};
