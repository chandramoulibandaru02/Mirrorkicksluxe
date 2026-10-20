export interface PageDef {
  title: string;
  description: string;
  defaultBody: string;
}

/**
 * Default legal copy describes only what this application actually does today.
 * Anything business-specific is marked [CONFIRM: ...] and must be completed by the owner
 * (or edited in Admin > Pages) before launch.
 */
export const EDITABLE_PAGES: Record<string, PageDef> = {
  "privacy-policy": {
    title: "Privacy Policy",
    description: "How we collect, use and protect your personal information.",
    defaultBody: `[CONFIRM: legal business name, registered address and effective date. Have this text reviewed by a legal professional before launch.]

## Who we are
This website is operated by [CONFIRM: legal business name]. You can contact us using the details on our Contact page.

## Information we collect
- Account details: your name, email address and password. Passwords are handled by Firebase Authentication; we never see or store your password.
- Contact and delivery details: phone number and delivery addresses you enter in your account or at checkout.
- Order information: the items, prices, delivery address, payment method and status of each order.
- Basket contents: stored on your device, and on our servers if you are signed in.

## How we use it
- To create and manage your account.
- To process, deliver and support your orders.
- To send operational notifications about your orders to our staff.

## Cookies and local storage
- A secure session cookie keeps you signed in.
- Your device's local storage holds your basket.
- [CONFIRM: add details here if you enable analytics or advertising tools. None are enabled in the application by default.]

## Service providers
- Google Firebase (authentication and database).
- Cloudinary (product image hosting; no customer data).
- Telegram (internal order alerts to our staff containing order number, total, status, customer name and city).
- Vercel (website hosting).
- [CONFIRM: payment provider(s) and courier partners, if any. Orders are currently paid by cash on delivery.]

## Retention and your rights
[CONFIRM: how long order records are kept and how customers can request access, correction or deletion of their data.]

## Contact
Questions about this policy can be sent to the address on our Contact page.`,
  },
  "terms-and-conditions": {
    title: "Terms and Conditions",
    description: "The terms that apply when you use this website and place orders.",
    defaultBody: `[CONFIRM: legal business name and effective date. Have this text reviewed by a legal professional before launch.]

## Using this website
By placing an order you agree to these terms. You must provide accurate account and delivery information.

## Products and prices
Prices are shown in Indian rupees. Product availability is shown from our live stock records. We may cancel an order if an item cannot be supplied; if you have already paid, we will refund you.

## Ordering and payment
- Orders are confirmed once they appear in your order history.
- Payment is currently by cash on delivery, where offered.
- Delivery charges, where applicable, are shown before you place your order.

## Cancellations
You can cancel an order online until it has been packed. After that, please contact us.

## Delivery
[CONFIRM: delivery areas, delivery time estimates and courier partners.]

## Returns and refunds
[CONFIRM: return window, conditions (for example unworn, with original packaging), who pays return shipping, and refund timelines.]

## Accounts
You are responsible for keeping your login details secure. We may suspend accounts that are misused.

## Governing law
[CONFIRM: governing law and jurisdiction.]

## Contact
Questions about these terms can be sent to the address on our Contact page.`,
  },
};
