// Bangladeshi mobile numbers: 01[3-9]XXXXXXXX (11 digits), optionally with +880 / 880 prefix
const BD_PHONE_REGEX = /^(?:\+?880|0)1[3-9]\d{8}$/;

const VALID_SIZES = ["S", "M", "L", "XL", "XXL"];
const VALID_PAYMENT_METHODS = ["cod", "bkash", "nagad"];

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateOrderPayload(body) {
  const errors = [];

  if (!isNonEmptyString(body.customerName)) {
    errors.push("Customer name is required.");
  }

  if (!isNonEmptyString(body.phone)) {
    errors.push("Phone number is required.");
  } else if (!BD_PHONE_REGEX.test(body.phone.trim())) {
    errors.push("Please enter a valid Bangladeshi phone number (e.g. 017XXXXXXXX).");
  }

  if (!isNonEmptyString(body.address)) {
    errors.push("Delivery address is required.");
  }

  if (!isNonEmptyString(body.productId)) {
    errors.push("Product is required.");
  }

  if (!VALID_SIZES.includes(body.size)) {
    errors.push("Please select a valid size.");
  }

  const quantity = Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
    errors.push("Quantity must be a whole number between 1 and 20.");
  }

  if (!VALID_PAYMENT_METHODS.includes(body.paymentMethod)) {
    errors.push("Please select a valid payment method.");
  }


    if (!isNonEmptyString(body.transactionId)) {
      errors.push("Transaction ID is required for bKash/Nagad payments.");
    } else if (body.transactionId.trim().length < 6) {
      errors.push("Transaction ID looks too short — please double-check it.");
    }
  }

  return errors;
}

module.exports = { validateOrderPayload, BD_PHONE_REGEX, VALID_SIZES, VALID_PAYMENT_METHODS };
